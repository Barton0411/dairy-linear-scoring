// utils/request.js - 网络请求封装

const app = getApp()

// 将对象转换为 query string
function buildQueryString(params) {
  if (!params || Object.keys(params).length === 0) {
    return ''
  }

  const parts = []
  for (const key in params) {
    if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    }
  }
  return parts.join('&')
}

// 请求拦截器
function request(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token')

    const defaultOptions = {
      url: `${app.globalData.baseUrl}${options.url}`,
      method: options.method || 'GET',
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.header
      },
      data: options.data,
      timeout: options.timeout || 30000
    }

    wx.request({
      ...defaultOptions,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          // Token过期
          app.handleTokenExpired()
          reject(new Error('登录已过期，请重新登录'))
        } else {
          // 尝试获取错误消息，支持 error 和 message 两种字段
          const errorMsg = res.data?.error || res.data?.message || `请求失败: ${res.statusCode}`
          reject(new Error(errorMsg))
        }
      },
      fail: (err) => {
        // 网络错误
        reject(new Error(err.errMsg || '网络连接失败'))
      }
    })
  })
}

// 上传文件
function uploadFile(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token')

    wx.uploadFile({
      url: `${app.globalData.baseUrl}${options.url}`,
      filePath: options.filePath,
      name: options.name || 'file',
      header: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.header
      },
      formData: options.formData,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(res.data))
          } catch {
            resolve(res.data)
          }
        } else {
          reject(new Error(`上传失败: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '上传失败'))
      }
    })
  })
}

// API方法
const api = {
  // 用户相关
  login(code) {
    return request({
      url: '/api/auth/login',
      method: 'POST',
      data: { code }
    })
  },

  // 鉴定员身份认证
  verifyAppraiser(data) {
    return request({
      url: '/api/auth/verify',
      method: 'POST',
      data
    })
  },

  // 解绑账号
  unbindAccount(openId) {
    return request({
      url: '/api/auth/unbind',
      method: 'POST',
      data: { openId }
    })
  },

  getUserInfo() {
    return request({ url: '/api/user/info' })
  },

  updateUserInfo(data) {
    return request({
      url: '/api/user/info',
      method: 'PUT',
      data
    })
  },

  // 牧场相关
  getFarms() {
    return request({ url: '/api/farms' })
  },

  joinFarm(farmCode) {
    return request({
      url: '/api/farms/join',
      method: 'POST',
      data: { farmCode }
    })
  },

  leaveFarm(farmId) {
    return request({
      url: `/api/farms/${farmId}/leave`,
      method: 'POST'
    })
  },

  // 牛只相关
  getCattle(farmId, params = {}) {
    const query = buildQueryString(params)
    return request({
      url: `/api/farms/${farmId}/cattle${query ? '?' + query : ''}`
    })
  },

  createCattle(farmId, earTag) {
    return request({
      url: `/api/farms/${farmId}/cattle`,
      method: 'POST',
      data: { earTag }
    })
  },

  // 评分相关
  getScores(farmId, params = {}) {
    const query = buildQueryString(params)
    return request({
      url: `/api/farms/${farmId}/scores${query ? '?' + query : ''}`
    })
  },

  getScoreDetail(scoreId) {
    return request({ url: `/api/scores/${scoreId}` })
  },

  submitScore(data) {
    return request({
      url: '/api/scores',
      method: 'POST',
      data
    })
  },

  updateScore(scoreId, data) {
    return request({
      url: `/api/scores/${scoreId}`,
      method: 'PUT',
      data
    })
  },

  deleteScore(scoreId) {
    return request({
      url: `/api/scores/${scoreId}`,
      method: 'DELETE'
    })
  },

  // 照片相关
  uploadPhoto(filePath, scoreId) {
    return uploadFile({
      url: '/api/photos/upload',
      filePath,
      name: 'file',
      formData: { scoreId }
    })
  },

  // 同步相关
  syncData(data) {
    return request({
      url: '/api/sync',
      method: 'POST',
      data
    })
  },

  // 导出
  exportScores(farmId, params = {}) {
    return request({
      url: `/api/farms/${farmId}/export`,
      method: 'POST',
      data: params
    })
  },

  // 检查当天是否已有评分
  checkTodayScore(farmCode, earTag) {
    return request({
      url: `/api/scores/check-today/${farmCode}/${earTag}`
    })
  },

  // 鉴定员管理
  getAppraisers() {
    return request({ url: '/api/appraisers' })
  },

  createAppraiser(data) {
    return request({
      url: '/api/appraisers',
      method: 'POST',
      data
    })
  },

  updateAppraiser(employeeId, data) {
    return request({
      url: `/api/appraisers/${employeeId}`,
      method: 'PUT',
      data
    })
  },

  deleteAppraiser(employeeId, params = {}) {
    // 构建query参数
    let url = `/api/appraisers/${employeeId}`
    const queryParams = []

    if (params.transferTo) {
      queryParams.push(`transferTo=${params.transferTo}`)
    }

    if (params.keepRecords) {
      queryParams.push('keepRecords=true')
    }

    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&')
    }

    return request({
      url: url,
      method: 'DELETE'
    })
  },

  // 牧场管理（管理员）
  getAllFarms() {
    return request({ url: '/api/farms/admin/all' })
  },

  createFarm(data) {
    return request({
      url: '/api/farms/admin/create',
      method: 'POST',
      data
    })
  },

  updateFarm(farmCode, data) {
    return request({
      url: `/api/farms/admin/${farmCode}`,
      method: 'PUT',
      data
    })
  },

  deleteFarm(farmCode) {
    return request({
      url: `/api/farms/admin/${farmCode}`,
      method: 'DELETE'
    })
  },

  // 鉴定员-牧场关联
  getAppraiserFarmLinks() {
    return request({ url: '/api/appraiser-farms' })
  },

  getAppraiserFarms(employeeId) {
    return request({ url: `/api/appraiser-farms/appraiser/${employeeId}` })
  },

  linkAppraiserFarm(employeeId, farmCode) {
    return request({
      url: '/api/appraiser-farms',
      method: 'POST',
      data: { employeeId, farmCode }
    })
  },

  unlinkAppraiserFarm(employeeId, farmCode) {
    return request({
      url: '/api/appraiser-farms',
      method: 'DELETE',
      data: { employeeId, farmCode }
    })
  },

  // 用户设置
  getSettings() {
    return request({ url: '/api/settings' })
  },

  updateSettings(data) {
    return request({
      url: '/api/settings',
      method: 'PUT',
      data
    })
  },

  resetSettings() {
    return request({
      url: '/api/settings/reset',
      method: 'POST'
    })
  },

  // 证书管理
  getCertificateStatus() {
    return request({ url: '/api/appraisers/certificate/status' })
  },

  uploadCertificate(filePath) {
    return uploadFile({
      url: '/api/appraisers/certificate/upload',
      filePath,
      name: 'file'
    })
  },

  getPendingCertificates() {
    return request({ url: '/api/appraisers/certificate/pending' })
  },

  reviewCertificate(applicationId, action, rejectReason = '') {
    return request({
      url: '/api/appraisers/certificate/review',
      method: 'POST',
      data: { applicationId, action, rejectReason }
    })
  },

  getAppraiserCertificate(employeeId) {
    return request({ url: `/api/appraisers/certificate/${employeeId}` })
  }
}

module.exports = { request, uploadFile, api }
