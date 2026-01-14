// src/routes/certificate.js - 证书管理路由
const express = require('express')
const multer = require('multer')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const db = require('../config/database')
const ossClient = require('../config/oss')
const { authMiddleware, superAdminOnly } = require('../middleware/auth')

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

// 1. POST /upload - 上传证书
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const file = req.file
    const userId = req.user.userId

    if (!file) {
      return res.status(400).json({ error: '未上传文件' })
    }

    // 获取鉴定员信息
    const [users] = await db.query(
      'SELECT employee_id, appraiser_name FROM users WHERE id = ?',
      [userId]
    )

    if (!users.length || !users[0].employee_id) {
      return res.status(400).json({ error: '用户未关联鉴定员信息' })
    }

    const employeeId = users[0].employee_id
    const appraiserName = users[0].appraiser_name

    // 生成OSS文件名
    const ext = path.extname(file.originalname) || '.jpg'
    const date = new Date()
    const ossKey = `certificates/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${uuidv4()}${ext}`

    // 上传到OSS
    const result = await ossClient.put(ossKey, file.buffer)

    // 生成公开HTTPS URL
    const bucket = process.env.OSS_BUCKET
    const region = process.env.OSS_REGION
    const ossUrl = `https://${bucket}.${region}.aliyuncs.com/${ossKey}`

    // 开始数据库事务
    const connection = await db.getConnection()
    await connection.beginTransaction()

    try {
      // 将旧的pending申请标记为withdrawn
      await connection.query(
        "UPDATE certificate_applications SET status = 'withdrawn' WHERE employee_id = ? AND status = 'pending'",
        [employeeId]
      )

      // 创建新的证书申请
      const [insertResult] = await connection.query(
        `INSERT INTO certificate_applications
         (employee_id, appraiser_name, oss_key, oss_url, file_size, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [employeeId, appraiserName, ossKey, ossUrl, file.size]
      )

      // 更新appraisers表状态
      await connection.query(
        "UPDATE appraisers SET cert_status = 'pending' WHERE employee_id = ?",
        [employeeId]
      )

      await connection.commit()

      res.json({
        applicationId: insertResult.insertId,
        ossUrl: ossUrl,
        status: 'pending'
      })

    } catch (err) {
      await connection.rollback()
      throw err
    } finally {
      connection.release()
    }

  } catch (err) {
    console.error('Upload certificate error:', err)
    res.status(500).json({ error: err.message || '上传证书失败' })
  }
})

// 2. GET /status - 获取当前用户证书状态
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId

    // 获取鉴定员信息
    const [users] = await db.query(
      'SELECT employee_id, is_certified FROM users WHERE id = ?',
      [userId]
    )

    if (!users.length || !users[0].employee_id) {
      return res.status(400).json({ error: '用户未关联鉴定员信息' })
    }

    const employeeId = users[0].employee_id

    // 获取appraisers表的cert_status
    const [appraisers] = await db.query(
      'SELECT cert_status FROM appraisers WHERE employee_id = ?',
      [employeeId]
    )

    const certStatus = appraisers.length > 0 ? appraisers[0].cert_status : 'none'

    // 获取当前有效的申请记录（pending, approved, rejected）
    const [applications] = await db.query(
      `SELECT id, oss_url, status, reject_reason, reviewed_by_name, reviewed_at, created_at
       FROM certificate_applications
       WHERE employee_id = ? AND status IN ('pending', 'approved', 'rejected')
       ORDER BY created_at DESC
       LIMIT 1`,
      [employeeId]
    )

    const currentApplication = applications.length > 0 ? {
      id: applications[0].id,
      ossUrl: applications[0].oss_url,
      status: applications[0].status,
      rejectReason: applications[0].reject_reason,
      reviewedByName: applications[0].reviewed_by_name,
      reviewedAt: applications[0].reviewed_at,
      uploadedAt: applications[0].created_at
    } : null

    res.json({
      certStatus,
      currentApplication,
      isCertified: users[0].is_certified === 1
    })

  } catch (err) {
    console.error('Get certificate status error:', err)
    res.status(500).json({ error: '获取证书状态失败' })
  }
})

// 3. POST /review - 审批证书（仅超级管理员）
router.post('/review', authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const { applicationId, action, rejectReason } = req.body
    const reviewerId = req.user.userId

    // 获取审批人信息
    const [reviewer] = await db.query(
      'SELECT employee_id, appraiser_name FROM users WHERE id = ?',
      [reviewerId]
    )

    if (!reviewer.length) {
      return res.status(400).json({ error: '审批人信息不存在' })
    }

    if (!applicationId || !action) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: '无效的审批操作' })
    }

    if (action === 'reject' && !rejectReason) {
      return res.status(400).json({ error: '拒绝时必须提供原因' })
    }

    // 获取申请信息
    const [applications] = await db.query(
      'SELECT employee_id, status FROM certificate_applications WHERE id = ?',
      [applicationId]
    )

    if (!applications.length) {
      return res.status(404).json({ error: '申请记录不存在' })
    }

    if (applications[0].status !== 'pending') {
      return res.status(400).json({ error: '该申请已处理' })
    }

    const employeeId = applications[0].employee_id

    // 开始事务
    const connection = await db.getConnection()
    await connection.beginTransaction()

    try {
      const now = new Date()
      const newStatus = action === 'approve' ? 'approved' : 'rejected'

      // 更新certificate_applications
      await connection.query(
        `UPDATE certificate_applications
         SET status = ?, reviewed_by = ?, reviewed_by_name = ?, reviewed_at = ?,
             reject_reason = ?, updated_at = ?
         WHERE id = ?`,
        [newStatus, reviewer[0].employee_id, reviewer[0].appraiser_name, now,
         rejectReason || null, now, applicationId]
      )

      if (action === 'approve') {
        // 通过审批
        // 更新appraisers表
        await connection.query(
          `UPDATE appraisers
           SET cert_status = 'approved', is_certified = 1,
               cert_approved_at = ?, cert_approved_by = ?
           WHERE employee_id = ?`,
          [now, reviewer[0].employee_id, employeeId]
        )

        // 更新users表
        await connection.query(
          'UPDATE users SET is_certified = 1 WHERE employee_id = ?',
          [employeeId]
        )
      } else {
        // 拒绝审批
        await connection.query(
          "UPDATE appraisers SET cert_status = 'rejected' WHERE employee_id = ?",
          [employeeId]
        )
      }

      await connection.commit()

      res.json({
        success: true,
        action,
        applicationId,
        employeeId
      })

    } catch (err) {
      await connection.rollback()
      throw err
    } finally {
      connection.release()
    }

  } catch (err) {
    console.error('Review certificate error:', err)
    res.status(500).json({ error: err.message || '审批失败' })
  }
})

// 4. GET /pending - 获取待审批证书列表（仅超级管理员）
router.get('/pending', authMiddleware, superAdminOnly, async (req, res) => {
  try {
    // 获取所有pending状态的申请
    const [applications] = await db.query(
      `SELECT id, employee_id, appraiser_name, oss_url, file_size, created_at
       FROM certificate_applications
       WHERE status = 'pending'
       ORDER BY created_at ASC`
    )

    const formattedApplications = applications.map(app => ({
      id: app.id,
      employeeId: app.employee_id,
      appraiserName: app.appraiser_name,
      ossUrl: app.oss_url,
      fileSize: app.file_size,
      uploadedAt: app.created_at
    }))

    res.json({
      total: applications.length,
      applications: formattedApplications
    })

  } catch (err) {
    console.error('Get pending certificates error:', err)
    res.status(500).json({ error: '获取待审批列表失败' })
  }
})

// 5. GET /:employeeId - 查看指定鉴定员的证书（超级管理员或本人）
router.get('/:employeeId', authMiddleware, async (req, res) => {
  try {
    const { employeeId } = req.params
    const userId = req.user.userId

    // 检查权限：管理员/超级管理员或本人
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin'
    const isSelf = req.user.employeeId === employeeId

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: '无权查看该鉴定员的证书' })
    }

    // 获取已通过的证书申请
    const [applications] = await db.query(
      `SELECT id, oss_url, status, reviewed_by_name, reviewed_at, created_at
       FROM certificate_applications
       WHERE employee_id = ? AND status = 'approved'
       ORDER BY reviewed_at DESC
       LIMIT 1`,
      [employeeId]
    )

    if (!applications.length) {
      return res.status(404).json({ error: '未找到已通过的证书' })
    }

    res.json({
      application: {
        id: applications[0].id,
        ossUrl: applications[0].oss_url,
        status: applications[0].status,
        reviewedByName: applications[0].reviewed_by_name,
        reviewedAt: applications[0].reviewed_at,
        uploadedAt: applications[0].created_at
      }
    })

  } catch (err) {
    console.error('Get appraiser certificate error:', err)
    res.status(500).json({ error: '获取证书失败' })
  }
})

module.exports = router
