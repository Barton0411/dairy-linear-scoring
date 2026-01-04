// pages/scoring/result/result.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings')
const { store, TRAITS, ALL_TRAITS, calculateTotalScore } = require('../../../store/index')
const { api } = require('../../../utils/request')
const { showLoading, hideLoading, showSuccess, showError, showToast, checkNetwork, generateLocalId, getGradeName } = require('../../../utils/util')

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: {
    store,
    fields: ['currentScoring', 'currentFarm', 'totalScore', 'userInfo', 'settings'],
    actions: ['resetScoring', 'updatePendingSyncCount']
  },

  data: {
    categories: (() => {
      // UI 侧去重：同一 traitKey 只展示一次，并补齐泌乳系统 traits 列表
      const globalKeys = new Set()

      return Object.entries(TRAITS).map(([key, val]) => {
        let traits = []

        if (val.subCategories) {
          const localKeys = new Set()
          Object.values(val.subCategories).forEach(subCat => {
            subCat.traits.forEach(trait => {
              if (localKeys.has(trait.key)) return
              localKeys.add(trait.key)
              if (globalKeys.has(trait.key)) return
              globalKeys.add(trait.key)
              traits.push(trait)
            })
          })
        } else {
          (val.traits || []).forEach(trait => {
            if (globalKeys.has(trait.key)) return
            globalKeys.add(trait.key)
            traits.push(trait)
          })
        }

        return {
          key,
          name: val.name,
          weight: val.weight,
          traits
        }
      })
    })(),
    submitting: false,
    showDetails: false
  },

  onLoad() {
    if (!this.data.currentScoring.earTag) {
      wx.switchTab({ url: '/pages/index/index' })
      return
    }

    // 拍照提醒已在评分页面处理，此处不再提示
  },

  onToggleDetails() {
    this.setData({ showDetails: !this.data.showDetails })
  },

  // 获取等级名称
  getGradeName,

  // 检查是否需要拍照提醒
  checkPhotoPrompt() {
    const { totalScore, settings, currentScoring } = this.data
    const score = totalScore.score
    const highThreshold = Number(settings.photoThresholdExcellent) || 85
    const lowThreshold = Number(settings.photoThresholdPoor) || 65

    // 如果已经有照片，不需要提醒
    if (currentScoring.photos && currentScoring.photos.length > 0) {
      return
    }

    // 检查高分牛只（≥85分）
    if (score >= highThreshold && settings.photoPromptExcellent) {
      wx.showModal({
        title: '拍照提醒',
        content: `该牛只总分${score}分，等级${totalScore.grade}，建议拍照留存记录`,
        confirmText: '去拍照',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/scoring/photo/photo' })
          }
        }
      })
      return
    }

    // 检查低分牛只（≤65分）
    if (score <= lowThreshold && settings.photoPromptPoor) {
      wx.showModal({
        title: '拍照提醒',
        content: `该牛只总分${score}分，等级${totalScore.grade}，建议拍照记录缺陷性状`,
        confirmText: '去拍照',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/scoring/photo/photo' })
          }
        }
      })
    }
  },

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
      return { success: false, isOffline: false }
    }

    const { currentScoring, currentFarm, userInfo, totalScore } = this.data

    // 检查当天是否已有该牛号的评分记录
    try {
      const network = await checkNetwork()
      if (network.isConnected) {
        const checkResult = await api.checkTodayScore(currentFarm.farmCode, currentScoring.earTag)

        if (checkResult.exists) {
          // 弹窗询问用户是否覆盖
          const confirmResult = await new Promise((resolve) => {
            wx.showModal({
              title: '提示',
              content: `今天已对牛号 ${currentScoring.earTag} 评分过\n\n上次评分：${checkResult.record.totalScore}分 (${checkResult.record.grade})\n\n是否覆盖之前的评分？`,
              confirmText: '覆盖',
              cancelText: '新增',
              success: (res) => {
                resolve({ confirmed: res.confirm, cancelled: res.cancel })
              }
            })
          })

          if (confirmResult.confirmed) {
            // 用户选择覆盖，删除旧记录
            try {
              await api.deleteScore(checkResult.record.id)
              console.log('已删除旧评分记录:', checkResult.record.id)
            } catch (err) {
              console.error('删除旧记录失败:', err)
              wx.showToast({ title: '删除旧记录失败', icon: 'none' })
              return { success: false, isOffline: false }
            }
          }
          // 如果用户选择"新增"，则继续正常提交
        }
      }
    } catch (err) {
      console.warn('检查重复记录失败（可能离线）:', err)
      // 检查失败不阻塞提交流程
    }

    // 构建评分数据
    const scoreData = {
      localId: generateLocalId(),
      farmCode: currentFarm.farmCode,
      farmName: currentFarm.farmName,
      dhiCode: currentFarm.dhiCode || '',
      earTag: currentScoring.earTag,
      parity: currentScoring.parity,
      mode: currentScoring.mode,
      scores: currentScoring.scores,
      impressionScore: currentScoring.impressionScore,
      udderFullness: currentScoring.udderFullness,
      totalScore: totalScore.score,
      grade: totalScore.grade,
      photos: currentScoring.photos.map(p => p.localPath),
      createdAt: new Date().toISOString(),
      employeeId: userInfo.employeeId,
      appraiserName: userInfo.appraiserName,
      isCertified: userInfo.isCertified
    }

    try {
      const network = await checkNetwork()

      if (network.isConnected) {
        // 在线提交
        const submitResult = await api.submitScore(scoreData)
        const serverId = submitResult?.id || submitResult?.data?.id

        // 上传照片 - 使用服务器返回的ID
        for (const photo of currentScoring.photos) {
          try {
            if (serverId) {
              await api.uploadPhoto(photo.localPath, serverId)
            } else {
              console.warn('No server ID returned, saving photo offline')
              this.saveOfflinePhoto(photo, scoreData.localId)
            }
          } catch (err) {
            console.error('Photo upload failed:', err)
            this.saveOfflinePhoto(photo, scoreData.localId)
          }
        }

        this.updatePendingSyncCount()
        return { success: true, isOffline: false }

      } else {
        // 离线保存
        this.saveOfflineScore(scoreData)
        this.updatePendingSyncCount()
        return { success: true, isOffline: true }
      }

    } catch (err) {
      console.error('Submit error:', err)
      // 所有提交失败都保存到离线（包括502、timeout等）
      this.saveOfflineScore(scoreData)
      this.updatePendingSyncCount()
      return { success: true, isOffline: true, error: true }
    }
  },

  // 返回修改评分（不提交，保留数据）
  onBackToModify() {
    wx.navigateBack({
      fail: () => {
        // 如果navigateBack失败（页面栈中没有上一页），则重新进入评分页
        wx.redirectTo({ url: '/pages/scoring/unified/unified' })
      }
    })
  },

  // 提交并继续评分
  async onSubmitAndContinue() {
    if (this.data.submitting) return

    this.setData({ submitting: true })
    showLoading('提交中...')

    try {
      const result = await this.submitScore()
      hideLoading()

      if (result.success) {
        // 根据是否离线显示不同提示
        if (result.isOffline) {
          showToast(result.error ? '提交失败，已离线保存' : '已离线保存，联网后自动上传')
        } else {
          showSuccess('提交成功')
        }

        // 延迟后重置数据并跳转
        setTimeout(() => {
          this.resetScoring()
          wx.redirectTo({ url: '/pages/scoring/info/info' })
        }, 500)
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
      const result = await this.submitScore()
      hideLoading()

      if (result.success) {
        // 根据是否离线显示不同提示
        if (result.isOffline) {
          showToast(result.error ? '提交失败，已离线保存' : '已离线保存，联网后自动上传')
        } else {
          showSuccess('提交成功')
        }

        // 延迟后重置数据并跳转
        setTimeout(() => {
          this.resetScoring()
          wx.switchTab({ url: '/pages/index/index' })
        }, 500)
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
      const result = await this.submitScore()
      hideLoading()

      if (result.success) {
        // 根据是否离线显示不同提示
        if (result.isOffline) {
          showToast(result.error ? '提交失败，已离线保存' : '已离线保存，联网后自动上传')
        } else {
          showSuccess('提交成功')
        }

        // 延迟后重置数据并跳转
        setTimeout(() => {
          this.resetScoring()
          wx.switchTab({ url: '/pages/records/list/list' })
        }, 500)
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
