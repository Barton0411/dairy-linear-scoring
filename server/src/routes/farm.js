// src/routes/farm.js - 牧场路由
const express = require('express')
const db = require('../config/database')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// 获取用户关联的牧场列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [farms] = await db.query(
      'SELECT DISTINCT farm_code, farm_name FROM appraiser_farms WHERE employee_id = ?',
      [req.user.employeeId]
    )

    res.json(farms.map(f => ({
      code: f.farm_code,
      name: f.farm_name
    })))

  } catch (err) {
    console.error('Get farms error:', err)
    res.status(500).json({ error: '获取牧场列表失败' })
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
    const { startDate, endDate } = req.body

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

    sql += ' ORDER BY created_at DESC'

    const [scores] = await db.query(sql, params)

    // 这里可以使用exceljs生成Excel文件
    // 简化版本直接返回JSON
    res.json({
      total: scores.length,
      data: scores
    })

  } catch (err) {
    console.error('Export error:', err)
    res.status(500).json({ error: '导出失败' })
  }
})

module.exports = router
