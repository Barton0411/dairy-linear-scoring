// src/routes/auth.js - 认证路由
const express = require('express')
const axios = require('axios')
const db = require('../config/database')
const { generateToken } = require('../middleware/auth')

const router = express.Router()

const WECHAT_APP_ID = process.env.WECHAT_APP_ID
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET

// 微信登录
router.post('/login', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ error: '缺少code参数' })
    }

    // 调用微信接口获取openid
    const wxRes = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: WECHAT_APP_ID,
        secret: WECHAT_APP_SECRET,
        js_code: code,
        grant_type: 'authorization_code'
      }
    })

    if (wxRes.data.errcode) {
      return res.status(400).json({ error: '微信登录失败: ' + wxRes.data.errmsg })
    }

    const { openid, session_key } = wxRes.data

    // 查询用户是否存在
    const [users] = await db.query(
      'SELECT * FROM users WHERE openid = ?',
      [openid]
    )

    if (users.length === 0) {
      // 新用户，创建记录
      await db.query(
        'INSERT INTO users (openid) VALUES (?)',
        [openid]
      )

      return res.json({
        isNewUser: true,
        verified: false,
        openId: openid,
        sessionKey: session_key
      })
    }

    const user = users[0]

    // 已认证用户，直接返回token
    if (user.employee_id) {
      // 获取鉴定员信息（包括role）
      const [appraisers] = await db.query(
        'SELECT role FROM appraisers WHERE employee_id = ?',
        [user.employee_id]
      )

      const appraiserRole = appraisers.length > 0 ? appraisers[0].role : 'appraiser'

      // 获取关联牧场
      const [farms] = await db.query(
        `SELECT DISTINCT f.farm_code, f.farm_name, f.dhi_code
         FROM appraiser_farms af
         JOIN farms f ON f.farm_code = af.farm_code
         WHERE af.employee_id = ?`,
        [user.employee_id]
      )

      const token = generateToken({
        userId: user.id,
        employeeId: user.employee_id,
        appraiserName: user.appraiser_name,
        isCertified: user.is_certified,
        role: appraiserRole
      })

      return res.json({
        isNewUser: false,
        verified: true,
        openId: openid,
        token,
        user: {
          id: user.id,
          employeeId: user.employee_id,
          name: user.appraiser_name,
          isCertified: user.is_certified === 1,
          role: appraiserRole
        },
        farms: farms.map(f => ({
          code: f.farm_code,
          name: f.farm_name,
          dhiCode: f.dhi_code || ''
        }))
      })
    }

    // 用户存在但未认证
    return res.json({
      isNewUser: false,
      verified: false,
      openId: openid,
      sessionKey: session_key
    })

  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: '登录失败' })
  }
})

// 鉴定员身份认证
router.post('/verify', async (req, res) => {
  try {
    const { openId, name, employeeId } = req.body

    if (!openId || !name || !employeeId) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    // 查询appraisers表验证身份
    const [appraisers] = await db.query(
      'SELECT * FROM appraisers WHERE employee_id = ? AND appraiser_name = ?',
      [employeeId, name]
    )

    if (appraisers.length === 0) {
      return res.json({ verified: false, message: '姓名或工号不匹配' })
    }

    const appraiser = appraisers[0]

    // 更新用户信息（包含role）
    await db.query(
      `UPDATE users SET
        employee_id = ?,
        appraiser_name = ?,
        is_certified = ?,
        role = ?
      WHERE openid = ?`,
      [employeeId, name, appraiser.is_certified, appraiser.role || 'appraiser', openId]
    )

    // 获取用户ID
    const [users] = await db.query(
      'SELECT id FROM users WHERE openid = ?',
      [openId]
    )

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // 获取关联牧场
    const [farms] = await db.query(
      `SELECT DISTINCT f.farm_code, f.farm_name, f.dhi_code
       FROM appraiser_farms af
       JOIN farms f ON f.farm_code = af.farm_code
       WHERE af.employee_id = ?`,
      [employeeId]
    )

    const token = generateToken({
      userId: users[0].id,
      employeeId: employeeId,
      appraiserName: name,
      isCertified: appraiser.is_certified,
      role: appraiser.role || 'appraiser'
    })

    res.json({
      verified: true,
      token,
      user: {
        id: users[0].id,
        employeeId: employeeId,
        name: name,
        isCertified: appraiser.is_certified === 1,
        role: appraiser.role || 'appraiser'
      },
      farms: farms.map(f => ({
        code: f.farm_code,
        name: f.farm_name,
        dhiCode: f.dhi_code || ''
      }))
    })

  } catch (err) {
    console.error('Verify error:', err)
    res.status(500).json({ error: '认证失败' })
  }
})

// 解绑账号（退出登录时调用）
router.post('/unbind', async (req, res) => {
  try {
    const { openId } = req.body

    if (!openId) {
      return res.status(400).json({ error: '缺少openId参数' })
    }

    // 清除用户的绑定关系，但保留用户记录
    await db.query(
      `UPDATE users SET
        employee_id = NULL,
        appraiser_name = NULL,
        is_certified = 0,
        role = 'appraiser'
      WHERE openid = ?`,
      [openId]
    )

    res.json({
      success: true,
      message: '账号已解绑'
    })

  } catch (err) {
    console.error('Unbind error:', err)
    res.status(500).json({ error: '解绑失败' })
  }
})

module.exports = router
