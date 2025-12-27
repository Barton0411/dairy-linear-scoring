// app.js
const { createStoreBindings } = require('mobx-miniprogram-binding')
const { store } = require('./store/index')

App({
  globalData: {
    userInfo: null,
    currentFarm: null,
    baseUrl: 'https://api.genepop.com'
  },

  onLaunch() {
    // 初始化全局store绑定
    this.storeBindings = createStoreBindings(this, {
      store,
      fields: ['userInfo', 'currentFarm', 'isLoggedIn'],
      actions: ['setUserInfo', 'setCurrentFarm', 'logout']
    })

    // 检查登录状态
    this.checkLoginStatus()

    // 初始化离线数据同步
    this.initOfflineSync()
  },

  onUnlaunch() {
    this.storeBindings.destroyStoreBindings()
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')

    if (token && userInfo) {
      store.setUserInfo(userInfo)
      // 验证token有效性
      this.validateToken(token)
    }
  },

  // 验证token
  async validateToken(token) {
    try {
      const res = await wx.request({
        url: `${this.globalData.baseUrl}/api/user/info`,
        header: { Authorization: `Bearer ${token}` }
      })
      if (res.statusCode !== 200) {
        this.handleTokenExpired()
      }
    } catch (err) {
      console.error('Token validation failed:', err)
    }
  },

  // 处理token过期
  handleTokenExpired() {
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    store.logout()
    wx.reLaunch({ url: '/pages/login/login' })
  },

  // 初始化离线同步
  initOfflineSync() {
    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      if (res.isConnected) {
        this.syncOfflineData()
      }
    })

    // 启动时检查并同步
    wx.getNetworkType({
      success: (res) => {
        if (res.networkType !== 'none') {
          this.syncOfflineData()
        }
      }
    })
  },

  // 同步离线数据
  async syncOfflineData() {
    const offlineScores = wx.getStorageSync('offlineScores') || []
    const offlinePhotos = wx.getStorageSync('offlinePhotos') || []

    if (offlineScores.length === 0 && offlinePhotos.length === 0) {
      return
    }

    console.log(`Syncing ${offlineScores.length} scores, ${offlinePhotos.length} photos`)

    // 同步评分数据
    for (const score of offlineScores) {
      try {
        await this.syncScore(score)
        this.removeOfflineScore(score.localId)
      } catch (err) {
        console.error('Sync score failed:', err)
      }
    }

    // 同步照片
    for (const photo of offlinePhotos) {
      try {
        await this.syncPhoto(photo)
        this.removeOfflinePhoto(photo.localId)
      } catch (err) {
        console.error('Sync photo failed:', err)
      }
    }
  },

  // 同步单条评分
  syncScore(score) {
    const token = wx.getStorageSync('token')
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.baseUrl}/api/sync`,
        method: 'POST',
        header: { Authorization: `Bearer ${token}` },
        data: { scores: [score] },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            reject(new Error(res.data.message))
          }
        },
        fail: reject
      })
    })
  },

  // 同步照片
  syncPhoto(photo) {
    const token = wx.getStorageSync('token')
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${this.globalData.baseUrl}/api/photos/upload`,
        filePath: photo.localPath,
        name: 'file',
        header: { Authorization: `Bearer ${token}` },
        formData: {
          scoreId: photo.scoreId,
          localId: photo.localId
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(res.data))
          } else {
            reject(new Error('Upload failed'))
          }
        },
        fail: reject
      })
    })
  },

  // 移除已同步的离线评分
  removeOfflineScore(localId) {
    const offlineScores = wx.getStorageSync('offlineScores') || []
    const updated = offlineScores.filter(s => s.localId !== localId)
    wx.setStorageSync('offlineScores', updated)
  },

  // 移除已同步的离线照片
  removeOfflinePhoto(localId) {
    const offlinePhotos = wx.getStorageSync('offlinePhotos') || []
    const updated = offlinePhotos.filter(p => p.localId !== localId)
    wx.setStorageSync('offlinePhotos', updated)
  }
})
