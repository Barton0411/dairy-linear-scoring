// src/routes/photo.js - 照片上传路由
const express = require('express')
const multer = require('multer')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const db = require('../config/database')
const ossClient = require('../config/oss')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// 配置multer临时存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('只支持JPG和PNG格式的图片'))
    }
  }
})

// 上传照片
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { scoreId, localId } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ error: '未上传文件' })
    }

    if (!scoreId) {
      return res.status(400).json({ error: '缺少scoreId' })
    }

    // 生成OSS文件名
    const ext = path.extname(file.originalname) || '.jpg'
    const date = new Date()
    const ossKey = `photos/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${uuidv4()}${ext}`

    // 上传到OSS
    const result = await ossClient.put(ossKey, file.buffer)

    // 生成公开HTTPS URL
    const bucket = process.env.OSS_BUCKET
    const region = process.env.OSS_REGION
    const ossUrl = `https://${bucket}.${region}.aliyuncs.com/${ossKey}`

    // 保存到数据库
    const [dbResult] = await db.query(
      'INSERT INTO photos (score_id, user_id, oss_key, oss_url) VALUES (?, ?, ?, ?)',
      [scoreId, req.user.userId, ossKey, ossUrl]
    )

    res.json({
      id: dbResult.insertId,
      localId,
      ossKey,
      url: ossUrl
    })

  } catch (err) {
    console.error('Upload photo error:', err)
    res.status(500).json({ error: '上传照片失败' })
  }
})

module.exports = router
