// src/routes/farm.js - 牧场路由
const express = require('express')
const ExcelJS = require('exceljs')
const db = require('../config/database')
const { authMiddleware, adminOnly } = require('../middleware/auth')

const router = express.Router()

// 获取当前用户关联的牧场列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [farms] = await db.query(
      `SELECT DISTINCT f.farm_code, f.farm_name, f.dhi_code
       FROM appraiser_farms af
       JOIN farms f ON f.farm_code = af.farm_code
       WHERE af.employee_id = ?`,
      [req.user.employeeId]
    )

    res.json(farms.map(f => ({
      farmCode: f.farm_code,
      farmName: f.farm_name,
      dhiCode: f.dhi_code || ''
    })))

  } catch (err) {
    console.error('Get farms error:', err)
    res.status(500).json({ error: '获取牧场列表失败' })
  }
})

// 获取所有牧场列表（管理员）
router.get('/admin/all', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [allFarms] = await db.query(
      `SELECT farm_code, farm_name, dhi_code, created_at, updated_at
       FROM farms
       ORDER BY created_at DESC`
    )

    res.json(allFarms.map(f => ({
      farmCode: f.farm_code,
      farmName: f.farm_name,
      dhiCode: f.dhi_code || '',
      createdAt: f.created_at,
      updatedAt: f.updated_at
    })))

  } catch (err) {
    console.error('Get all farms error:', err)
    res.status(500).json({ error: '获取所有牧场失败' })
  }
})

// 获取牧场牛只列表
router.get('/:code/cattle', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params
    const { earTag, page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit

    let sql = 'SELECT * FROM cattle WHERE farm_code = ?'
    const params = [code]

    if (earTag) {
      sql += ' AND ear_tag LIKE ?'
      params.push(`%${earTag}%`)
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), parseInt(offset))

    const [cattle] = await db.query(sql, params)

    res.json(cattle)

  } catch (err) {
    console.error('Get cattle error:', err)
    res.status(500).json({ error: '获取牛只列表失败' })
  }
})

// 新增牛只
router.post('/:code/cattle', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params
    const { earTag } = req.body

    if (!earTag) {
      return res.status(400).json({ error: '缺少牛号' })
    }

    // 检查是否已存在
    const [existing] = await db.query(
      'SELECT id FROM cattle WHERE farm_code = ? AND ear_tag = ?',
      [code, earTag]
    )

    if (existing.length > 0) {
      return res.json({ id: existing[0].id, earTag, farmCode: code })
    }

    // 新增
    const [result] = await db.query(
      'INSERT INTO cattle (farm_code, ear_tag) VALUES (?, ?)',
      [code, earTag]
    )

    res.json({
      id: result.insertId,
      earTag,
      farmCode: code
    })

  } catch (err) {
    console.error('Create cattle error:', err)
    res.status(500).json({ error: '新增牛只失败' })
  }
})

// 获取牧场评分记录
router.get('/:code/scores', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params
    const { page = 1, limit = 20, startDate, endDate } = req.query
    const offset = (page - 1) * limit

    // 权限检查：检查是否被分配到该牧场或是管理员
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin'

    if (!isAdmin) {
      // 检查是否被分配到该牧场
      const [farmAccess] = await db.query(
        'SELECT 1 FROM appraiser_farms WHERE employee_id = ? AND farm_code = ?',
        [req.user.employeeId, code]
      )

      if (farmAccess.length === 0) {
        return res.status(403).json({ error: '无权查看此牧场的评分记录' })
      }
    }

    let sql = 'SELECT * FROM scores WHERE farm_code = ?'
    const params = [code]

    if (startDate) {
      sql += ' AND created_at >= ?'
      params.push(startDate)
    }

    if (endDate) {
      sql += ' AND created_at <= ?'
      params.push(endDate)
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), parseInt(offset))

    const [scores] = await db.query(sql, params)

    // 获取照片
    const scoreIds = scores.map(s => s.id)
    let photos = []
    if (scoreIds.length > 0) {
      const [photoResults] = await db.query(
        'SELECT score_id, oss_url FROM photos WHERE score_id IN (?)',
        [scoreIds]
      )
      photos = photoResults
    }

    // 组装结果
    const result = scores.map(score => ({
      ...score,
      isMine: score.user_id === req.user.userId,
      photos: photos.filter(p => p.score_id === score.id).map(p => p.oss_url)
    }))

    res.json(result)

  } catch (err) {
    console.error('Get scores error:', err)
    res.status(500).json({ error: '获取评分记录失败' })
  }
})

// 导出牧场数据
router.post('/:code/export', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params
    const { startDate, endDate, version = 'regular' } = req.body

    // 查询评分记录
    let sql = `
      SELECT s.*,
        f.farm_name,
        c.dhi_code
      FROM scores s
      LEFT JOIN farms f ON s.farm_code = f.farm_code
      LEFT JOIN cattle c ON s.ear_tag = c.ear_tag AND s.farm_code = c.farm_code
      WHERE s.farm_code = ?
    `
    const params = [code]

    if (startDate) {
      sql += ' AND s.created_at >= ?'
      params.push(startDate)
    }

    if (endDate) {
      sql += ' AND s.created_at <= ?'
      params.push(endDate)
    }

    sql += ' ORDER BY s.created_at DESC'

    const [scores] = await db.query(sql, params)

    // 创建工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('评分记录')

    // 根据版本设置列
    if (version === 'holstein') {
      // 荷斯坦版本（27列）
      worksheet.columns = [
        { header: 'DHI编号', key: 'dhiCode', width: 15 },
        { header: '耳号', key: 'earTag', width: 15 },
        { header: '胎次', key: 'parity', width: 8 },
        { header: '体高', key: 'tg', width: 8 },
        { header: '胸宽', key: 'xk', width: 8 },
        { header: '体深', key: 'ts', width: 8 },
        { header: '腰强度', key: 'yqd', width: 8 },
        { header: '尻角度', key: 'kjd', width: 8 },
        { header: '尻宽', key: 'kk', width: 8 },
        { header: '蹄角度', key: 'tjd', width: 8 },
        { header: '蹄踵深度', key: 'tgsd', width: 10 },
        { header: '骨质地', key: 'gzd', width: 8 },
        { header: '后肢侧视', key: 'hzcs', width: 10 },
        { header: '后肢后视', key: 'hzhs', width: 10 },
        { header: '乳房深度', key: 'rfsd', width: 10 },
        { header: '中央悬韧带', key: 'zyxrd', width: 12 },
        { header: '前乳房附着', key: 'qrffz', width: 12 },
        { header: '前乳头位置', key: 'qrtwz', width: 12 },
        { header: '前乳头长度', key: 'qrtcd', width: 12 },
        { header: '后乳房附着高度', key: 'hrffzgd', width: 15 },
        { header: '后乳房附着宽度', key: 'hrffzkd', width: 15 },
        { header: '后乳头位置', key: 'hrtwz', width: 12 },
        { header: '棱角性', key: 'ljx', width: 8 },
        { header: '总分', key: 'totalScore', width: 10 },
        { header: '等级', key: 'grade', width: 8 },
        { header: '鉴定员', key: 'appraiserName', width: 12 },
        { header: '鉴定日期', key: 'createdAt', width: 20 }
      ]
    } else {
      // 常规版本（30列）
      worksheet.columns = [
        { header: '牧场编号', key: 'farmCode', width: 15 },
        { header: '牧场名称', key: 'farmName', width: 20 },
        { header: 'DHI编号', key: 'dhiCode', width: 15 },
        { header: '耳号', key: 'earTag', width: 15 },
        { header: '胎次', key: 'parity', width: 8 },
        { header: '体高', key: 'tg', width: 8 },
        { header: '胸宽', key: 'xk', width: 8 },
        { header: '体深', key: 'ts', width: 8 },
        { header: '腰强度', key: 'yqd', width: 8 },
        { header: '尻角度', key: 'kjd', width: 8 },
        { header: '尻宽', key: 'kk', width: 8 },
        { header: '蹄角度', key: 'tjd', width: 8 },
        { header: '蹄踵深度', key: 'tgsd', width: 10 },
        { header: '骨质地', key: 'gzd', width: 8 },
        { header: '后肢侧视', key: 'hzcs', width: 10 },
        { header: '后肢后视', key: 'hzhs', width: 10 },
        { header: '乳房深度', key: 'rfsd', width: 10 },
        { header: '中央悬韧带', key: 'zyxrd', width: 12 },
        { header: '前乳房附着', key: 'qrffz', width: 12 },
        { header: '前乳头位置', key: 'qrtwz', width: 12 },
        { header: '前乳头长度', key: 'qrtcd', width: 12 },
        { header: '后乳房附着高度', key: 'hrffzgd', width: 15 },
        { header: '后乳房附着宽度', key: 'hrffzkd', width: 15 },
        { header: '后乳头位置', key: 'hrtwz', width: 12 },
        { header: '棱角性', key: 'ljx', width: 8 },
        { header: '总分', key: 'totalScore', width: 10 },
        { header: '等级', key: 'grade', width: 8 },
        { header: '鉴定员', key: 'appraiserName', width: 12 },
        { header: '是否认证', key: 'isCertified', width: 10 },
        { header: '鉴定日期', key: 'createdAt', width: 20 }
      ]
    }

    // 填充数据
    scores.forEach(record => {
      const row = {
        farmCode: record.farm_code,
        farmName: record.farm_name,
        dhiCode: record.dhi_code,
        earTag: record.ear_tag,
        parity: record.parity,
        tg: record.tg,
        xk: record.xk,
        ts: record.ts,
        yqd: record.yqd,
        kjd: record.kjd,
        kk: record.kk,
        tjd: record.tjd,
        tgsd: record.tgsd,
        gzd: record.gzd,
        hzcs: record.hzcs,
        hzhs: record.hzhs,
        rfsd: record.rfsd,
        zyxrd: record.zyxrd,
        qrffz: record.qrffz,
        qrtwz: record.qrtwz,
        qrtcd: record.qrtcd,
        hrffzgd: record.hrffzgd,
        hrffzkd: record.hrffzkd,
        hrtwz: record.hrtwz,
        ljx: record.ljx,
        totalScore: record.total_score,
        grade: record.grade,
        appraiserName: record.appraiser_name,
        isCertified: record.is_certified ? '奶协认证鉴定员' : '未认证鉴定员',
        createdAt: new Date(record.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
      }
      worksheet.addRow(row)
    })

    // 设置响应头
    const filename = `评分记录_${code}_${new Date().toISOString().split('T')[0]}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)

    // 写入响应
    await workbook.xlsx.write(res)
    res.end()

  } catch (err) {
    console.error('Export error:', err)
    res.status(500).json({ error: '导出失败' })
  }
})

// 创建牧场（仅管理员）
router.post('/admin/create', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { farmCode, farmName, dhiCode } = req.body

    if (!farmCode || !farmName) {
      return res.status(400).json({ error: '缺少必要参数：牧场编号和牧场名称' })
    }

    // 检查牧场编号是否已存在
    const [existing] = await db.query(
      'SELECT farm_code FROM farms WHERE farm_code = ?',
      [farmCode]
    )

    if (existing.length > 0) {
      return res.status(400).json({ error: '该牧场编号已存在' })
    }

    // 插入新牧场
    await db.query(
      'INSERT INTO farms (farm_code, farm_name, dhi_code) VALUES (?, ?, ?)',
      [farmCode, farmName, dhiCode || null]
    )

    res.json({
      success: true,
      message: '牧场创建成功',
      data: {
        farmCode,
        farmName,
        dhiCode: dhiCode || ''
      }
    })

  } catch (err) {
    console.error('Create farm error:', err)
    res.status(500).json({ error: '创建牧场失败' })
  }
})

// 更新牧场信息（仅管理员）
router.put('/admin/:farmCode', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { farmCode } = req.params
    const { farmName, dhiCode } = req.body

    // 检查牧场是否存在
    const [existing] = await db.query(
      'SELECT farm_code FROM farms WHERE farm_code = ?',
      [farmCode]
    )

    if (existing.length === 0) {
      return res.status(404).json({ error: '牧场不存在' })
    }

    // 更新信息
    const updates = []
    const values = []

    if (farmName !== undefined) {
      updates.push('farm_name = ?')
      values.push(farmName)
    }

    if (dhiCode !== undefined) {
      updates.push('dhi_code = ?')
      values.push(dhiCode || null)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有需要更新的字段' })
    }

    values.push(farmCode)

    // 开始事务
    const connection = await db.getConnection()
    await connection.beginTransaction()

    try {
      // 更新牧场信息
      await connection.query(
        `UPDATE farms SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE farm_code = ?`,
        values
      )

      // 如果DHI编号被修改，同步更新该牧场的所有评分记录
      if (dhiCode !== undefined) {
        const [scoreUpdateResult] = await connection.query(
          'UPDATE scores SET dhi_code = ? WHERE farm_code = ?',
          [dhiCode || null, farmCode]
        )

        console.log(`DHI编号已更新，同步修改了 ${scoreUpdateResult.affectedRows} 条评分记录`)
      }

      await connection.commit()

      res.json({
        success: true,
        message: '牧场信息更新成功',
        syncedScores: dhiCode !== undefined ? true : false
      })

    } catch (err) {
      await connection.rollback()
      throw err
    } finally {
      connection.release()
    }

  } catch (err) {
    console.error('Update farm error:', err)
    res.status(500).json({ error: '更新牧场信息失败' })
  }
})

// 删除牧场（仅管理员）
router.delete('/admin/:farmCode', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { farmCode } = req.params

    // 检查牧场是否存在
    const [existing] = await db.query(
      'SELECT farm_code FROM farms WHERE farm_code = ?',
      [farmCode]
    )

    if (existing.length === 0) {
      return res.status(404).json({ error: '牧场不存在' })
    }

    // 检查是否有关联的评分记录
    const [scores] = await db.query(
      'SELECT COUNT(*) as count FROM scores WHERE farm_code = ?',
      [farmCode]
    )

    if (scores[0].count > 0) {
      return res.status(400).json({
        error: '该牧场有关联的评分记录，不能删除',
        scoreCount: scores[0].count
      })
    }

    // 删除牧场（级联删除会自动删除appraiser_farms关联）
    await db.query('DELETE FROM farms WHERE farm_code = ?', [farmCode])

    res.json({
      success: true,
      message: '牧场删除成功'
    })

  } catch (err) {
    console.error('Delete farm error:', err)
    res.status(500).json({ error: '删除牧场失败' })
  }
})

module.exports = router
