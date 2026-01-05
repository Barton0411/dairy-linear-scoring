// src/routes/appraiser-farm.js - 鉴定员-牧场关联关系管理
const express = require('express')
const db = require('../config/database')
const { authMiddleware, adminOnly } = require('../middleware/auth')

const router = express.Router()

// 获取所有鉴定员-牧场关联关系
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [links] = await db.query(
      `SELECT af.employee_id, af.farm_code, af.created_at,
              a.appraiser_name, f.farm_name
       FROM appraiser_farms af
       LEFT JOIN appraisers a ON af.employee_id = a.employee_id
       LEFT JOIN farms f ON af.farm_code = f.farm_code
       ORDER BY af.created_at DESC`
    )

    res.json(links.map(link => ({
      employeeId: link.employee_id,
      farmCode: link.farm_code,
      appraiserName: link.appraiser_name,
      farmName: link.farm_name,
      createdAt: link.created_at
    })))

  } catch (err) {
    console.error('Get appraiser-farm links error:', err)
    res.status(500).json({ error: '获取关联关系失败' })
  }
})

// 获取指定鉴定员的牧场列表
router.get('/appraiser/:employeeId', authMiddleware, async (req, res) => {
  try {
    const { employeeId } = req.params

    // 检查权限：只能查看自己的或者是管理员
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin'
    if (!isAdmin && req.user.employeeId !== employeeId) {
      return res.status(403).json({ error: '无权查看其他鉴定员的牧场' })
    }

    const [farms] = await db.query(
      `SELECT f.farm_code, f.farm_name, f.dhi_code
       FROM appraiser_farms af
       JOIN farms f ON af.farm_code = f.farm_code
       WHERE af.employee_id = ?`,
      [employeeId]
    )

    res.json(farms.map(f => ({
      farmCode: f.farm_code,
      farmName: f.farm_name,
      dhiCode: f.dhi_code || ''
    })))

  } catch (err) {
    console.error('Get appraiser farms error:', err)
    res.status(500).json({ error: '获取鉴定员牧场列表失败' })
  }
})

// 添加鉴定员-牧场关联
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { employeeId, farmCode } = req.body

    if (!employeeId || !farmCode) {
      return res.status(400).json({ error: '缺少必要参数：工号和牧场编号' })
    }

    // 检查鉴定员是否存在
    const [appraiser] = await db.query(
      'SELECT employee_id FROM appraisers WHERE employee_id = ?',
      [employeeId]
    )

    if (appraiser.length === 0) {
      return res.status(404).json({ error: '鉴定员不存在' })
    }

    // 检查牧场是否存在
    const [farm] = await db.query(
      'SELECT farm_code FROM farms WHERE farm_code = ?',
      [farmCode]
    )

    if (farm.length === 0) {
      return res.status(404).json({ error: '牧场不存在' })
    }

    // 检查关联是否已存在
    const [existing] = await db.query(
      'SELECT * FROM appraiser_farms WHERE employee_id = ? AND farm_code = ?',
      [employeeId, farmCode]
    )

    if (existing.length > 0) {
      return res.status(400).json({ error: '该关联已存在' })
    }

    // 创建关联
    await db.query(
      'INSERT INTO appraiser_farms (employee_id, farm_code) VALUES (?, ?)',
      [employeeId, farmCode]
    )

    res.json({
      success: true,
      message: '关联创建成功',
      data: { employeeId, farmCode }
    })

  } catch (err) {
    console.error('Create appraiser-farm link error:', err)
    res.status(500).json({ error: '创建关联失败' })
  }
})

// 删除鉴定员-牧场关联
router.delete('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { employeeId, farmCode } = req.body

    if (!employeeId || !farmCode) {
      return res.status(400).json({ error: '缺少必要参数：工号和牧场编号' })
    }

    // 检查关联是否存在
    const [existing] = await db.query(
      'SELECT * FROM appraiser_farms WHERE employee_id = ? AND farm_code = ?',
      [employeeId, farmCode]
    )

    if (existing.length === 0) {
      return res.status(404).json({ error: '关联不存在' })
    }

    // 删除关联
    await db.query(
      'DELETE FROM appraiser_farms WHERE employee_id = ? AND farm_code = ?',
      [employeeId, farmCode]
    )

    res.json({
      success: true,
      message: '关联删除成功'
    })

  } catch (err) {
    console.error('Delete appraiser-farm link error:', err)
    res.status(500).json({ error: '删除关联失败' })
  }
})

module.exports = router
