// pages/index/index.js
const { storeBindingsBehavior } = require('mobx-miniprogram-binding')
const { store } = require('../../store/index')
const { api } = require('../../utils/request')
const { showToast, checkNetwork } = require('../../utils/util')

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: {
    store,
    fields: ['userInfo', 'currentFarm', 'pendingSyncCount', 'isLoggedIn'],
    actions: ['setCurrentFarm', 'updatePendingSyncCount']
  },

  data: {
    loading: false
  },

  onLoad() {
    if (!this.data.isLoggedIn) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }

    // 加载牧场信息
    this.loadCurrentFarm()

    // 更新待同步数量
    this.updatePendingSyncCount()
  },

  onShow() {
    // 每次显示时更新同步状态
    this.updatePendingSyncCount()
  },

  // 加载当前牧场
  loadCurrentFarm() {
    const savedFarm = wx.getStorageSync('currentFarm')
    if (savedFarm) {
      this.setCurrentFarm(savedFarm)
    }
  },

  // 选择牧场
  onSelectFarm() {
    wx.navigateTo({ url: '/pages/farm-select/farm-select' })
  },

  // 开始正常模式评分
  onStartNormal() {
    if (!this.data.currentFarm) {
      showToast('请先选择牧场')
      return
    }
    wx.navigateTo({ url: '/pages/scoring/info/info?mode=normal' })
  },

  // 开始缺陷模式评分
  onStartDefect() {
    if (!this.data.currentFarm) {
      showToast('请先选择牧场')
      return
    }
    wx.navigateTo({ url: '/pages/scoring/info/info?mode=defect' })
  },

  // 手动同步
  async onManualSync() {
    const network = await checkNetwork()
    if (!network.isConnected) {
      showToast('当前无网络连接')
      return
    }

    this.setData({ loading: true })

    try {
      const app = getApp()
      await app.syncOfflineData()
      this.updatePendingSyncCount()
      showToast('同步完成')
    } catch (err) {
      showToast('同步失败: ' + err.message)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.updatePendingSyncCount()
    wx.stopPullDownRefresh()
  }
})
