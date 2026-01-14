// src/routes/score.js - 评分路由
const express = require('express')
const db = require('../config/database')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// 检查当天是否已有同一牧场+牛号的评分记录
router.get('/check-today/:farmCode/:earTag', authMiddleware, async (req, res) => {
  try {
    const { farmCode, earTag } = req.params

    // 查询当天该用户对该牧场+牛号的评分记录
    const [scores] = await db.query(
      `SELECT id, ear_tag, total_score, grade, created_at
       FROM scores
       WHERE farm_code = ?
       AND ear_tag = ?
       AND user_id = ?
       AND DATE(created_at) = CURDATE()
       ORDER BY created_at DESC
       LIMIT 1`,
      [farmCode, earTag, req.user.userId]
    )

    if (scores.length > 0) {
      res.json({
        exists: true,
        record: {
          id: scores[0].id,
          earTag: scores[0].ear_tag,
          totalScore: scores[0].total_score,
          grade: scores[0].grade,
          createdAt: scores[0].created_at
        }
      })
    } else {
      res.json({ exists: false })
    }

  } catch (err) {
    console.error('Check today score error:', err)
    res.status(500).json({ error: '检查记录失败' })
  }
})

// 提交评分
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      localId,
      earTag,
      parity,
      farmCode,
      farmName,
      dhiCode,
      mode,
      scores,
      impressionScore,
      udderFullness,
      totalScore,
      grade
    } = req.body

    // 验证必填字段
    if (!earTag || !farmCode || !scores || !totalScore || !grade) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    // 检查是否已同步过（防止重复提交）
    if (localId) {
      const [existing] = await db.query(
        'SELECT id FROM scores WHERE local_id = ?',
        [localId]
      )
      if (existing.length > 0) {
        return res.json({ id: existing[0].id, message: '已同步' })
      }
    }

    // 插入评分记录
    const [result] = await db.query(
      `INSERT INTO scores (
        local_id, ear_tag, parity, farm_code, farm_name, dhi_code, user_id,
        employee_id, appraiser_name, is_certified, score_mode,
        tg, xk, ts, yqd, kjd, kk, tjd, tgsd, gzd, hzcs, hzhs,
        rfsd, zyxrd, qrffz, qrtwz, qrtcd, hrffzgd, hrffzkd, hrtwz, ljx,
        impression_score, udder_fullness,
        total_score, grade
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        localId,
        earTag,
        parity || null,
        farmCode,
        farmName,
        dhiCode || null,
        req.user.userId,
        req.user.employeeId,
        req.user.appraiserName,
        req.user.isCertified ? 1 : 0,
        mode || 'normal',
        scores.tg, scores.xk, scores.ts, scores.yqd,
        scores.kjd, scores.kk,
        scores.tjd, scores.tgsd, scores.gzd, scores.hzcs, scores.hzhs,
        scores.rfsd, scores.zyxrd, scores.qrffz, scores.qrtwz, scores.qrtcd,
        scores.hrffzgd, scores.hrffzkd, scores.hrtwz,
        scores.ljx,
        impressionScore || null,
        udderFullness || null,
        totalScore,
        grade
      ]
    )

    res.json({
      id: result.insertId,
      localId,
      message: '提交成功'
    })

  } catch (err) {
    console.error('Submit score error:', err)
    res.status(500).json({ error: '提交评分失败' })
  }
})

// 获取评分详情
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params

    const [scores] = await db.query(
      'SELECT * FROM scores WHERE id = ?',
      [id]
    )

    if (scores.length === 0) {
      return res.status(404).json({ error: '评分记录不存在' })
    }

    const score = scores[0]

    // 权限检查
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin'
    const isOwner = score.user_id === req.user.userId

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: '无权查看此评分记录' })
    }

    // 获取照片
    const [photos] = await db.query(
      'SELECT id, oss_url FROM photos WHERE score_id = ?',
      [id]
    )

    res.json({
      ...score,
      isMine: score.user_id === req.user.userId,
      photos: photos.map(p => ({ id: p.id, url: p.oss_url }))
    })

  } catch (err) {
    console.error('Get score detail error:', err)
    res.status(500).json({ error: '获取评分详情失败' })
  }
})

// 修改评分（仅创建者）
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { scores, impressionScore, udderFullness, totalScore, grade } = req.body

    // 检查权限
    const [existing] = await db.query(
      'SELECT user_id FROM scores WHERE id = ?',
      [id]
    )

    if (existing.length === 0) {
      return res.status(404).json({ error: '评分记录不存在' })
    }

    if (existing[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: '无权修改此记录' })
    }

    // 更新
    await db.query(
      `UPDATE scores SET
        tg = ?, xk = ?, ts = ?, yqd = ?,
        kjd = ?, kk = ?,
        tjd = ?, tgsd = ?, gzd = ?, hzcs = ?, hzhs = ?,
        rfsd = ?, zyxrd = ?, qrffz = ?, qrtwz = ?, qrtcd = ?,
        hrffzgd = ?, hrffzkd = ?, hrtwz = ?,
        ljx = ?,
        impression_score = ?, udder_fullness = ?,
        total_score = ?, grade = ?
      WHERE id = ?`,
      [
        scores.tg, scores.xk, scores.ts, scores.yqd,
        scores.kjd, scores.kk,
        scores.tjd, scores.tgsd, scores.gzd, scores.hzcs, scores.hzhs,
        scores.rfsd, scores.zyxrd, scores.qrffz, scores.qrtwz, scores.qrtcd,
        scores.hrffzgd, scores.hrffzkd, scores.hrtwz,
        scores.ljx,
        impressionScore || null,
        udderFullness || null,
        totalScore, grade,
        id
      ]
    )

    res.json({ success: true })

  } catch (err) {
    console.error('Update score error:', err)
    res.status(500).json({ error: '修改评分失败' })
  }
})

// 删除评分（仅创建者）
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params

    // 检查权限
    const [existing] = await db.query(
      'SELECT user_id FROM scores WHERE id = ?',
      [id]
    )

    if (existing.length === 0) {
      return res.status(404).json({ error: '评分记录不存在' })
    }

    if (existing[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: '无权删除此记录' })
    }

    // 删除（照片会级联删除）
    await db.query('DELETE FROM scores WHERE id = ?', [id])

    res.json({ success: true })

  } catch (err) {
    console.error('Delete score error:', err)
    res.status(500).json({ error: '删除评分失败' })
  }
})

module.exports = router
