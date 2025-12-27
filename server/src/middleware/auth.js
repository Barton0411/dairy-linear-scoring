// src/middleware/auth.js - JWT认证中间件
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'dairy-scoring-secret-key'

// 生成Token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })
}

// 验证Token
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

// 认证中间件
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' })
  }

  const token = authHeader.substring(7)

  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '令牌已过期' })
    }
    return res.status(401).json({ error: '无效的令牌' })
  }
}

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware
}
