// app.js
const { store } = require('./store/index')
const { getAppraiserRole } = require('./utils/mockData')

App({
  globalData: {
    userInfo: null,
    currentFarm: null,
    baseUrl: 'https://scoring.genepop.com'
  },

  onLaunch() {
    // 检查登录状态
    this.checkLoginStatus()

    // 初始化离线数据同步
    this.initOfflineSync()

    // 加载设置
    store.loadSettings()
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    const currentFarm = wx.getStorageSync('currentFarm')
    const farms = wx.getStorageSync('farms')

    if (userInfo) {
      // 兼容旧数据：补齐 role，确保管理员/超级管理员功能不丢失
      if (!userInfo.role && userInfo.employeeId) {
        userInfo.role = getAppraiserRole(userInfo.employeeId)
        wx.setStorageSync('userInfo', userInfo)
      }

      store.setUserInfo(userInfo)
    }

    if (currentFarm) {
      store.setCurrentFarm(currentFarm)
    }

    if (farms) {
      store.setFarms(farms)
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
      store.updatePendingSyncCount()
      return
    }

    console.log(`Syncing ${offlineScores.length} scores, ${offlinePhotos.length} photos`)

    let syncedScores = 0
    let syncedPhotos = 0

    // 同步评分数据和关联的照片
    for (const score of offlineScores) {
      try {
        const result = await this.syncScore(score)
        const serverId = result?.id || result?.data?.id
        this.removeOfflineScore(score.localId)
        syncedScores++

        // 同步该评分的照片（使用服务器返回的ID）
        const scorePhotos = offlinePhotos.filter(p => p.scoreId === score.localId)
        for (const photo of scorePhotos) {
          try {
            if (serverId) {
              // 使用服务器ID替换localId
              await this.syncPhoto({ ...photo, scoreId: serverId })
              this.removeOfflinePhoto(photo.localId)
              syncedPhotos++
            }
          } catch (err) {
            console.error('Sync photo failed:', err)
          }
        }
      } catch (err) {
        console.error('Sync score failed:', err)

        // 服务器异常/鉴权失败时暂停本轮同步，避免连续刷请求
        const statusCode = err?.statusCode
        if (statusCode === 401 || (statusCode && statusCode >= 500)) {
          break
        }
      }
    }

    // 同步没有关联评分的孤立照片（通常不应该存在）
    const syncedPhotoIds = new Set()
    offlineScores.forEach(score => {
      offlinePhotos.filter(p => p.scoreId === score.localId).forEach(p => {
        syncedPhotoIds.add(p.localId)
      })
    })

    const orphanPhotos = offlinePhotos.filter(p => !syncedPhotoIds.has(p.localId))
    for (const photo of orphanPhotos) {
      try {
        await this.syncPhoto(photo)
        this.removeOfflinePhoto(photo.localId)
        syncedPhotos++
      } catch (err) {
        console.error('Sync orphan photo failed:', err)
      }
    }

    // 更新同步计数
    store.updatePendingSyncCount()

    // 显示同步结果
    if (syncedScores > 0 || syncedPhotos > 0) {
      wx.showToast({
        title: `已同步 ${syncedScores} 条评分`,
        icon: 'success',
        duration: 2000
      })
    }
  },

  // 同步单条评分
  syncScore(score) {
    const token = wx.getStorageSync('token')
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.baseUrl}/api/sync`,
        method: 'POST',
        header: token ? { Authorization: `Bearer ${token}` } : {},
        data: { scores: [score] },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            if (res.statusCode === 401) {
              this.handleTokenExpired()
            }

            const message =
              res.data?.message ||
              res.data?.error ||
              (typeof res.data === 'string' ? res.data : '') ||
              `请求失败: ${res.statusCode}`

            const err = new Error(message)
            err.statusCode = res.statusCode
            err.response = res.data
            reject(err)
          }
        },
        fail: (err) => {
          const e = new Error(err?.errMsg || '网络连接失败')
          e.original = err
          reject(e)
        }
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
        header: token ? { Authorization: `Bearer ${token}` } : {},
        formData: {
          scoreId: photo.scoreId,
          localId: photo.localId
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(res.data))
          } else {
            const err = new Error(`上传失败: ${res.statusCode}`)
            err.statusCode = res.statusCode
            err.response = res.data
            reject(err)
          }
        },
        fail: (err) => {
          const e = new Error(err?.errMsg || '上传失败')
          e.original = err
          reject(e)
        }
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
