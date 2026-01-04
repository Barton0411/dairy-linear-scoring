// src/app.js - 主入口文件
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const express = require('express')
const cors = require('cors')
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/user')
const farmRoutes = require('./routes/farm')
const scoreRoutes = require('./routes/score')
const photoRoutes = require('./routes/photo')
const syncRoutes = require('./routes/sync')
const appraiserRoutes = require('./routes/appraiser')
const appraiserFarmRoutes = require('./routes/appraiser-farm')
const settingsRoutes = require('./routes/settings')
const certificateRoutes = require('./routes/certificate')
const exportRoutes = require('./routes/export')

const app = express()

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
  next()
})

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/farms', farmRoutes)
app.use('/api/scores', scoreRoutes)
app.use('/api/photos', photoRoutes)
app.use('/api/sync', syncRoutes)
app.use('/api/appraisers', appraiserRoutes)
app.use('/api/appraiser-farms', appraiserFarmRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/appraisers/certificate', certificateRoutes)
app.use('/api/export', exportRoutes)

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' })
})

// 错误处理中间件
app.use((err, req, res, next) => {
  // 记录详细错误信息
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString()
  })

  // 确定状态码
  const statusCode = err.statusCode || err.status || 500

  // 根据环境返回不同的错误信息
  const isDevelopment = process.env.NODE_ENV !== 'production'

  res.status(statusCode).json({
    error: err.message || '服务器内部错误',
    ...(isDevelopment && { stack: err.stack }), // 开发环境返回堆栈信息
    timestamp: new Date().toISOString()
  })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

module.exports = app
