// src/routes/appraiser.js - 鉴定员管理路由
const express = require('express')
const db = require('../config/database')
const { authMiddleware, adminOnly, superAdminOnly } = require('../middleware/auth')

const router = express.Router()

// 获取所有鉴定员列表
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [appraisers] = await db.query(
      `SELECT
        employee_id,
        appraiser_name,
        role,
        is_certified,
        created_at,
        updated_at
       FROM appraisers
       ORDER BY created_at DESC`
    )

    res.json(appraisers.map(a => ({
      employeeId: a.employee_id,
      appraiserName: a.appraiser_name,
      role: a.role || 'appraiser',
      isCertified: a.is_certified === 1,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    })))

  } catch (err) {
    console.error('Get appraisers error:', err)
    res.status(500).json({ error: '获取鉴定员列表失败' })
  }
})

// 添加新鉴定员
router.post('/', authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const { employeeId, appraiserName, isCertified, role } = req.body

    if (!employeeId || !appraiserName) {
      return res.status(400).json({ error: '缺少必要参数：工号和姓名' })
    }

    // 验证角色值
    const validRoles = ['appraiser', 'admin', 'super_admin']
    const appraiserRole = role && validRoles.includes(role) ? role : 'appraiser'

    // 检查工号是否已存在
    const [existing] = await db.query(
      'SELECT employee_id FROM appraisers WHERE employee_id = ?',
      [employeeId]
    )

    if (existing.length > 0) {
      return res.status(400).json({ error: '该工号已存在' })
    }

    // 插入新鉴定员
    await db.query(
      'INSERT INTO appraisers (employee_id, appraiser_name, role, is_certified) VALUES (?, ?, ?, ?)',
      [employeeId, appraiserName, appraiserRole, isCertified ? 1 : 0]
    )

    res.json({
      success: true,
      message: '鉴定员添加成功',
      data: {
        employeeId,
        appraiserName,
        role: appraiserRole,
        isCertified: isCertified === true
      }
    })

  } catch (err) {
    console.error('Create appraiser error:', err)
    res.status(500).json({ error: '添加鉴定员失败' })
  }
})

// 更新鉴定员信息
router.put('/:employeeId', authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const { employeeId } = req.params
    const { appraiserName, isCertified, role } = req.body

    // 检查鉴定员是否存在
    const [existing] = await db.query(
      'SELECT employee_id, role FROM appraisers WHERE employee_id = ?',
      [employeeId]
    )

    if (existing.length === 0) {
      return res.status(404).json({ error: '鉴定员不存在' })
    }

    // 更新信息
    const updates = []
    const values = []

    if (appraiserName !== undefined) {
      updates.push('appraiser_name = ?')
      values.push(appraiserName)
    }

    if (isCertified !== undefined) {
      updates.push('is_certified = ?')
      values.push(isCertified ? 1 : 0)
    }

    if (role !== undefined) {
      // 验证角色值
      const validRoles = ['appraiser', 'admin', 'super_admin']
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: '无效的角色值' })
      }
      updates.push('role = ?')
      values.push(role)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有需要更新的字段' })
    }

    values.push(employeeId)

    await db.query(
      `UPDATE appraisers SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?`,
      values
    )

    // 同步更新users表中的相关信息
    if (appraiserName !== undefined) {
      await db.query(
        'UPDATE users SET appraiser_name = ? WHERE employee_id = ?',
        [appraiserName, employeeId]
      )
    }

    if (isCertified !== undefined) {
      await db.query(
        'UPDATE users SET is_certified = ? WHERE employee_id = ?',
        [isCertified ? 1 : 0, employeeId]
      )
    }

    // 同步role到users表
    if (role !== undefined) {
      await db.query(
        'UPDATE users SET role = ? WHERE employee_id = ?',
        [role, employeeId]
      )
    }

    res.json({
      success: true,
      message: '鉴定员信息更新成功'
    })

  } catch (err) {
    console.error('Update appraiser error:', err)
    res.status(500).json({ error: '更新鉴定员信息失败' })
  }
})

// 删除鉴定员
router.delete('/:employeeId', authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const { employeeId } = req.params
    const { transferTo, keepRecords } = req.query  // 从query参数获取删除选项

    // 检查鉴定员是否存在
    const [existing] = await db.query(
      'SELECT employee_id, appraiser_name FROM appraisers WHERE employee_id = ?',
      [employeeId]
    )

    if (existing.length === 0) {
      return res.status(404).json({ error: '鉴定员不存在' })
    }

    // 检查是否有关联的评分记录
    const [scores] = await db.query(
      'SELECT COUNT(*) as count FROM scores WHERE employee_id = ?',
      [employeeId]
    )

    const scoreCount = scores[0].count

    // 如果有评分记录，需要指定处理方式
    if (scoreCount > 0 && !transferTo && !keepRecords) {
      return res.status(400).json({
        error: '该鉴定员有关联的评分记录',
        scoreCount: scoreCount,
        needAction: true  // 标记需要用户选择操作
      })
    }

    // 处理数据转移
    if (transferTo) {
      // 检查目标鉴定员是否存在
      const [targetAppraiser] = await db.query(
        'SELECT employee_id, appraiser_name FROM appraisers WHERE employee_id = ?',
        [transferTo]
      )

      if (targetAppraiser.length === 0) {
        return res.status(400).json({ error: '目标鉴定员不存在' })
      }

      // 转移评分记录到目标鉴定员
      await db.query(
        `UPDATE scores SET
          employee_id = ?,
          appraiser_name = ?
         WHERE employee_id = ?`,
        [transferTo, targetAppraiser[0].appraiser_name, employeeId]
      )
    }

    // keepRecords为true时，不需要额外操作，直接删除鉴定员账号
    // 评分记录中的employee_id和appraiser_name会保留

    // 删除鉴定员（级联删除会自动删除appraiser_farms关联）
    await db.query('DELETE FROM appraisers WHERE employee_id = ?', [employeeId])

    // 清除相关用户的认证信息
    await db.query(
      `UPDATE users SET
        employee_id = NULL,
        appraiser_name = NULL,
        is_certified = 0
       WHERE employee_id = ?`,
      [employeeId]
    )

    res.json({
      success: true,
      message: transferTo
        ? `鉴定员删除成功，${scoreCount}条评分记录已转移`
        : keepRecords
          ? `鉴定员删除成功，${scoreCount}条历史评分记录已保留`
          : '鉴定员删除成功',
      scoreCount: scoreCount,
      transferTo: transferTo || null
    })

  } catch (err) {
    console.error('Delete appraiser error:', err)
    res.status(500).json({ error: '删除鉴定员失败' })
  }
})

module.exports = router
