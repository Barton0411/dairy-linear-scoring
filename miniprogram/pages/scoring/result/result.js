// pages/scoring/result/result.js
const { storeBindingsBehavior } = require('mobx-miniprogram-binding')
const { store, TRAITS, ALL_TRAITS, calculateTotalScore } = require('../../../store/index')
const { api } = require('../../../utils/request')
const { showLoading, hideLoading, showSuccess, showError, showToast, checkNetwork, generateLocalId, getGradeName } = require('../../../utils/util')

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: {
    store,
    fields: ['currentScoring', 'currentFarm', 'totalScore', 'userInfo'],
    actions: ['resetScoring', 'updatePendingSyncCount']
  },

  data: {
    categories: Object.entries(TRAITS).map(([key, val]) => ({
      key,
      ...val
    })),
    submitting: false
  },

  onLoad() {
    if (!this.data.currentScoring.earTag) {
      wx.redirectTo({ url: '/pages/index/index' })
    }
  },

  // 获取等级名称
  getGradeName,

  // 验证所有性状都有分数
  validateScores() {
    const { scores } = this.data.currentScoring
    const missingTraits = []

    for (const trait of ALL_TRAITS) {
      const score = scores[trait.key]
      if (score === undefined || score === null || score === '') {
        missingTraits.push(trait.name)
      }
    }

    if (missingTraits.length > 0) {
      showToast(`${missingTraits[0]}未评分`)
      return false
    }

    return true
  },

  // 提交评分（核心方法）
  async submitScore() {
    // 验证分数完整性
    if (!this.validateScores()) {
      return false
    }

    const { currentScoring, currentFarm, userInfo, totalScore } = this.data

    // 构建评分数据
    const scoreData = {
      localId: generateLocalId(),
      farmId: currentFarm.id,
      earTag: currentScoring.earTag,
      mode: currentScoring.mode,
      scores: currentScoring.scores,
      totalScore: totalScore.score,
      grade: totalScore.grade,
      photos: currentScoring.photos.map(p => p.localPath),
      createdAt: new Date().toISOString(),
      userId: userInfo.id,
      userName: userInfo.name
    }

    try {
      const network = await checkNetwork()

      if (network.isConnected) {
        // 在线提交
        await api.submitScore(scoreData)

        // 上传照片
        for (const photo of currentScoring.photos) {
          try {
            await api.uploadPhoto(photo.localPath, scoreData.localId)
          } catch (err) {
            console.error('Photo upload failed:', err)
            this.saveOfflinePhoto(photo, scoreData.localId)
          }
        }
      } else {
        // 离线保存
        this.saveOfflineScore(scoreData)
      }

      this.updatePendingSyncCount()
      return true

    } catch (err) {
      // 网络错误时保存到离线
      if (err.message.includes('网络')) {
        this.saveOfflineScore(scoreData)
        this.updatePendingSyncCount()
        return true
      } else {
        throw err
      }
    }
  },

  // 提交并继续评分
  async onSubmitAndContinue() {
    if (this.data.submitting) return

    this.setData({ submitting: true })
    showLoading('提交中...')

    try {
      const success = await this.submitScore()
      hideLoading()

      if (success) {
        showSuccess('提交成功')
        const currentMode = this.data.currentScoring.mode
        this.resetScoring()
        wx.redirectTo({ url: `/pages/scoring/info/info?mode=${currentMode}` })
      }
    } catch (err) {
      hideLoading()
      showError(err.message || '提交失败')
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 返回首页（先提交）
  async onBackHome() {
    if (this.data.submitting) return

    this.setData({ submitting: true })
    showLoading('提交中...')

    try {
      const success = await this.submitScore()
      hideLoading()

      if (success) {
        showSuccess('提交成功')
        this.resetScoring()
        wx.switchTab({ url: '/pages/index/index' })
      }
    } catch (err) {
      hideLoading()
      showError(err.message || '提交失败')
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 查看记录列表（先提交）
  async onViewRecords() {
    if (this.data.submitting) return

    this.setData({ submitting: true })
    showLoading('提交中...')

    try {
      const success = await this.submitScore()
      hideLoading()

      if (success) {
        showSuccess('提交成功')
        this.resetScoring()
        wx.switchTab({ url: '/pages/records/list/list' })
      }
    } catch (err) {
      hideLoading()
      showError(err.message || '提交失败')
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 保存离线评分
  saveOfflineScore(scoreData) {
    const offlineScores = wx.getStorageSync('offlineScores') || []
    offlineScores.push(scoreData)
    wx.setStorageSync('offlineScores', offlineScores)
  },

  // 保存离线照片
  saveOfflinePhoto(photo, scoreId) {
    const offlinePhotos = wx.getStorageSync('offlinePhotos') || []
    offlinePhotos.push({
      ...photo,
      scoreId
    })
    wx.setStorageSync('offlinePhotos', offlinePhotos)
  }
})
