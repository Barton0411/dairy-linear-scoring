// src/app.js - 主入口文件
require('dotenv').config({ path: '../.env' })

const express = require('express')
const cors = require('cors')
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/user')
const farmRoutes = require('./routes/farm')
const scoreRoutes = require('./routes/score')
const photoRoutes = require('./routes/photo')
const syncRoutes = require('./routes/sync')

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

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' })
})

// 错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

module.exports = app
