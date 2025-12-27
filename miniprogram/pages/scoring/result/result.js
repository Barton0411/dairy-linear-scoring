// pages/scoring/result/result.js
const { storeBindingsBehavior } = require('mobx-miniprogram-binding')
const { store, TRAITS, calculateTotalScore } = require('../../../store/index')
const { api } = require('../../../utils/request')
const { showLoading, hideLoading, showSuccess, showError, checkNetwork, generateLocalId, getGradeName } = require('../../../utils/util')

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
    submitting: false,
    submitted: false
  },

  onLoad() {
    if (!this.data.currentScoring.earTag) {
      wx.redirectTo({ url: '/pages/index/index' })
    }
  },

  // 获取等级名称
  getGradeName,

  // 提交评分
  async onSubmit() {
    if (this.data.submitting) return

    this.setData({ submitting: true })
    showLoading('提交中...')

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
            // 照片上传失败，保存到离线队列
            this.saveOfflinePhoto(photo, scoreData.localId)
          }
        }

        hideLoading()
        showSuccess('提交成功')
      } else {
        // 离线保存
        this.saveOfflineScore(scoreData)
        hideLoading()
        showSuccess('已保存，联网后自动同步')
      }

      this.setData({ submitted: true })
      this.updatePendingSyncCount()

    } catch (err) {
      hideLoading()

      // 网络错误时保存到离线
      if (err.message.includes('网络')) {
        this.saveOfflineScore(scoreData)
        showSuccess('已保存，联网后自动同步')
        this.setData({ submitted: true })
        this.updatePendingSyncCount()
      } else {
        showError(err.message || '提交失败')
      }
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
  },

  // 继续评下一头
  onContinue() {
    this.resetScoring()
    wx.redirectTo({ url: `/pages/scoring/info/info?mode=${this.data.currentScoring.mode}` })
  },

  // 返回首页
  onBackHome() {
    this.resetScoring()
    wx.switchTab({ url: '/pages/index/index' })
  },

  // 查看记录列表
  onViewRecords() {
    this.resetScoring()
    wx.switchTab({ url: '/pages/records/list/list' })
  }
})
