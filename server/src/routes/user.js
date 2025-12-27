// src/routes/user.js - 用户路由
const express = require('express')
const db = require('../config/database')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// 获取当前用户信息
router.get('/info', authMiddleware, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, employee_id, appraiser_name, is_certified, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.userId]
    )

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const user = users[0]

    res.json({
      id: user.id,
      employeeId: user.employee_id,
      name: user.appraiser_name,
      isCertified: user.is_certified === 1,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at
    })

  } catch (err) {
    console.error('Get user info error:', err)
    res.status(500).json({ error: '获取用户信息失败' })
  }
})

// 更新用户信息
router.put('/info', authMiddleware, async (req, res) => {
  try {
    const { avatarUrl } = req.body

    await db.query(
      'UPDATE users SET avatar_url = ? WHERE id = ?',
      [avatarUrl, req.user.userId]
    )

    res.json({ success: true })

  } catch (err) {
    console.error('Update user info error:', err)
    res.status(500).json({ error: '更新用户信息失败' })
  }
})

module.exports = router
