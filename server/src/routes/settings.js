// src/routes/settings.js - 用户设置路由
const express = require('express')
const db = require('../config/database')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// 获取用户设置
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [settings] = await db.query(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [req.user.userId]
    )

    if (settings.length === 0) {
      // 返回默认设置
      return res.json({
        defaultScores: {
          tg: 5, xk: 5, ts: 5, yqd: 5,
          kjd: 5, kk: 5,
          tjd: 5, tgsd: 5, gzd: 5, hzcs: 5, hzhs: 5,
          rfsd: 5, zyxrd: 5, qrffz: 5, qrtwz: 5, qrtcd: 5, hrffzgd: 5, hrffzkd: 5, hrtwz: 5,
          ljx: 5
        },
        defaultImpressionScore: 85,
        defaultUdderFullness: '空',
        photoMode: 'always',
        photoPromptExcellent: false,
        photoPromptPoor: true,
        photoThresholdExcellent: 85,
        photoThresholdPoor: 65,
        maxPhotos: 5
      })
    }

    const s = settings[0]

    res.json({
      defaultScores: {
        tg: s.default_tg,
        xk: s.default_xk,
        ts: s.default_ts,
        yqd: s.default_yqd,
        kjd: s.default_kjd,
        kk: s.default_kk,
        tjd: s.default_tjd,
        tgsd: s.default_tgsd,
        gzd: s.default_gzd,
        hzcs: s.default_hzcs,
        hzhs: s.default_hzhs,
        rfsd: s.default_rfsd,
        zyxrd: s.default_zyxrd,
        qrffz: s.default_qrffz,
        qrtwz: s.default_qrtwz,
        qrtcd: s.default_qrtcd,
        hrffzgd: s.default_hrffzgd,
        hrffzkd: s.default_hrffzkd,
        hrtwz: s.default_hrtwz,
        ljx: s.default_ljx
      },
      defaultImpressionScore: s.default_impression_score,
      defaultUdderFullness: s.default_udder_fullness || '空',
      photoMode: s.photo_mode,
      photoPromptExcellent: s.photo_prompt_excellent === 1,
      photoPromptPoor: s.photo_prompt_poor === 1,
      photoThresholdExcellent: s.photo_threshold_excellent,
      photoThresholdPoor: s.photo_threshold_poor,
      maxPhotos: s.max_photos
    })

  } catch (err) {
    console.error('Get settings error:', err)
    res.status(500).json({ error: '获取设置失败' })
  }
})

// 更新用户设置
router.put('/', authMiddleware, async (req, res) => {
  try {
    const {
      defaultScores,
      defaultImpressionScore,
      defaultUdderFullness,
      photoMode,
      photoPromptExcellent,
      photoPromptPoor,
      photoThresholdExcellent,
      photoThresholdPoor,
      maxPhotos
    } = req.body

    // 检查是否已有设置
    const [existing] = await db.query(
      'SELECT id FROM user_settings WHERE user_id = ?',
      [req.user.userId]
    )

    if (existing.length === 0) {
      // 插入新设置
      await db.query(
        `INSERT INTO user_settings (
          user_id,
          default_tg, default_xk, default_ts, default_yqd,
          default_kjd, default_kk,
          default_tjd, default_tgsd, default_gzd, default_hzcs, default_hzhs,
          default_rfsd, default_zyxrd, default_qrffz, default_qrtwz, default_qrtcd,
          default_hrffzgd, default_hrffzkd, default_hrtwz, default_ljx,
          default_impression_score, default_udder_fullness,
          photo_mode, photo_prompt_excellent, photo_prompt_poor,
          photo_threshold_excellent, photo_threshold_poor, max_photos
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.userId,
          defaultScores?.tg ?? 5,
          defaultScores?.xk ?? 5,
          defaultScores?.ts ?? 5,
          defaultScores?.yqd ?? 5,
          defaultScores?.kjd ?? 5,
          defaultScores?.kk ?? 5,
          defaultScores?.tjd ?? 5,
          defaultScores?.tgsd ?? 5,
          defaultScores?.gzd ?? 5,
          defaultScores?.hzcs ?? 5,
          defaultScores?.hzhs ?? 5,
          defaultScores?.rfsd ?? 5,
          defaultScores?.zyxrd ?? 5,
          defaultScores?.qrffz ?? 5,
          defaultScores?.qrtwz ?? 5,
          defaultScores?.qrtcd ?? 5,
          defaultScores?.hrffzgd ?? 5,
          defaultScores?.hrffzkd ?? 5,
          defaultScores?.hrtwz ?? 5,
          defaultScores?.ljx ?? 5,
          defaultImpressionScore ?? 85,
          defaultUdderFullness || '空',
          photoMode || 'always',
          photoPromptExcellent ? 1 : 0,
          photoPromptPoor ? 1 : 0,
          photoThresholdExcellent ?? 85,
          photoThresholdPoor ?? 65,
          maxPhotos ?? 5
        ]
      )
    } else {
      // 更新现有设置
      const updates = []
      const values = []

      if (defaultScores) {
        Object.entries(defaultScores).forEach(([key, value]) => {
          updates.push(`default_${key} = ?`)
          values.push(value)
        })
      }

      if (defaultImpressionScore !== undefined) {
        updates.push('default_impression_score = ?')
        values.push(defaultImpressionScore)
      }

      if (defaultUdderFullness !== undefined) {
        updates.push('default_udder_fullness = ?')
        values.push(defaultUdderFullness || '空')
      }

      if (photoMode !== undefined) {
        updates.push('photo_mode = ?')
        values.push(photoMode)
      }

      if (photoPromptExcellent !== undefined) {
        updates.push('photo_prompt_excellent = ?')
        values.push(photoPromptExcellent ? 1 : 0)
      }

      if (photoPromptPoor !== undefined) {
        updates.push('photo_prompt_poor = ?')
        values.push(photoPromptPoor ? 1 : 0)
      }

      if (photoThresholdExcellent !== undefined) {
        updates.push('photo_threshold_excellent = ?')
        values.push(photoThresholdExcellent)
      }

      if (photoThresholdPoor !== undefined) {
        updates.push('photo_threshold_poor = ?')
        values.push(photoThresholdPoor)
      }

      if (maxPhotos !== undefined) {
        updates.push('max_photos = ?')
        values.push(maxPhotos)
      }

      if (updates.length > 0) {
        values.push(req.user.userId)
        await db.query(
          `UPDATE user_settings SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
          values
        )
      }
    }

    res.json({
      success: true,
      message: '设置更新成功'
    })

  } catch (err) {
    console.error('Update settings error:', err)
    res.status(500).json({ error: '更新设置失败' })
  }
})

// 重置用户设置为默认值
router.post('/reset', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM user_settings WHERE user_id = ?', [req.user.userId])

    res.json({
      success: true,
      message: '设置已重置为默认值'
    })

  } catch (err) {
    console.error('Reset settings error:', err)
    res.status(500).json({ error: '重置设置失败' })
  }
})

module.exports = router
