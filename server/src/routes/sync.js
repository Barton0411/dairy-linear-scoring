// src/routes/sync.js - 离线数据同步路由
const express = require('express')
const db = require('../config/database')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// 批量同步评分数据
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { scores } = req.body

    if (!scores || !Array.isArray(scores)) {
      return res.status(400).json({ error: '无效的同步数据' })
    }

    const results = []

    for (const scoreData of scores) {
      try {
        // 检查是否已同步
        const [existing] = await db.query(
          'SELECT id FROM scores WHERE local_id = ?',
          [scoreData.localId]
        )

        if (existing.length > 0) {
          results.push({
            localId: scoreData.localId,
            serverId: existing[0].id,
            status: 'exists'
          })
          continue
        }

        // 插入新记录
        const [result] = await db.query(
          `INSERT INTO scores (
            local_id, ear_tag, farm_code, farm_name, user_id,
            employee_id, appraiser_name, is_certified, score_mode,
            tg, xk, ts, yqd, kjd, kk, tjd, tgsd, gzd, hzcs, hzhs,
            rfsd, zyxrd, qrffz, qrtwz, qrtcd, hrffzgd, hrffzkd, hrtwz, ljx,
            total_score, grade, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            scoreData.localId,
            scoreData.earTag,
            scoreData.farmCode || scoreData.farmId,
            scoreData.farmName,
            req.user.userId,
            req.user.employeeId,
            req.user.appraiserName,
            req.user.isCertified ? 1 : 0,
            scoreData.mode || 'normal',
            scoreData.scores.tg, scoreData.scores.xk, scoreData.scores.ts, scoreData.scores.yqd,
            scoreData.scores.kjd, scoreData.scores.kk,
            scoreData.scores.tjd, scoreData.scores.tgsd, scoreData.scores.gzd, scoreData.scores.hzcs, scoreData.scores.hzhs,
            scoreData.scores.rfsd, scoreData.scores.zyxrd, scoreData.scores.qrffz, scoreData.scores.qrtwz, scoreData.scores.qrtcd,
            scoreData.scores.hrffzgd, scoreData.scores.hrffzkd, scoreData.scores.hrtwz,
            scoreData.scores.ljx,
            scoreData.totalScore,
            scoreData.grade,
            scoreData.createdAt || new Date()
          ]
        )

        results.push({
          localId: scoreData.localId,
          serverId: result.insertId,
          status: 'synced'
        })

      } catch (err) {
        console.error('Sync single score error:', err)
        results.push({
          localId: scoreData.localId,
          status: 'error',
          error: err.message
        })
      }
    }

    res.json({
      total: scores.length,
      synced: results.filter(r => r.status === 'synced').length,
      exists: results.filter(r => r.status === 'exists').length,
      errors: results.filter(r => r.status === 'error').length,
      results
    })

  } catch (err) {
    console.error('Sync error:', err)
    res.status(500).json({ error: '同步失败' })
  }
})

module.exports = router
