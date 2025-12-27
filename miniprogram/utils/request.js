// utils/request.js - 网络请求封装

const app = getApp()

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
          reject(new Error(res.data?.message || `请求失败: ${res.statusCode}`))
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
    const query = new URLSearchParams(params).toString()
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
    const query = new URLSearchParams(params).toString()
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
  }
}

module.exports = { request, uploadFile, api }
