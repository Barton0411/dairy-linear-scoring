// pages/scoring/normal/normal.js
const { storeBindingsBehavior } = require('mobx-miniprogram-binding')
const { store, TRAITS, calculateTotalScore } = require('../../../store/index')
const { showConfirm, showToast } = require('../../../utils/util')

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: {
    store,
    fields: ['currentScoring', 'totalScore'],
    actions: ['updateScore']
  },

  data: {
    categories: Object.entries(TRAITS).map(([key, val]) => ({
      key,
      ...val
    })),
    currentCategoryIndex: 0,
    showGuide: true
  },

  onLoad(options) {
    // 检查是否有评分数据
    if (!store.currentScoring.earTag) {
      wx.redirectTo({ url: '/pages/scoring/info/info?mode=normal' })
      return
    }

    // 检查是否首次使用
    const hasUsed = wx.getStorageSync('hasUsedNormalMode')
    this.setData({ showGuide: !hasUsed })
  },

  // 关闭引导
  onCloseGuide() {
    wx.setStorageSync('hasUsedNormalMode', true)
    this.setData({ showGuide: false })
  },

  // 切换分类
  onCategoryChange(e) {
    this.setData({ currentCategoryIndex: e.currentTarget.dataset.index })
  },

  // 滑块变化
  onSliderChange(e) {
    const { key } = e.currentTarget.dataset
    const value = e.detail.value
    this.updateScore(key, value)
  },

  // 快捷分数按钮
  onQuickScore(e) {
    const { key, value } = e.currentTarget.dataset
    this.updateScore(key, parseInt(value))
  },

  // 上一个分类
  onPrevCategory() {
    if (this.data.currentCategoryIndex > 0) {
      this.setData({
        currentCategoryIndex: this.data.currentCategoryIndex - 1
      })
    }
  },

  // 下一个分类
  onNextCategory() {
    const maxIndex = this.data.categories.length - 1
    if (this.data.currentCategoryIndex < maxIndex) {
      this.setData({
        currentCategoryIndex: this.data.currentCategoryIndex + 1
      })
    } else {
      // 最后一个分类，跳转到拍照页面
      this.goToPhoto()
    }
  },

  // 跳转到拍照页面
  goToPhoto() {
    wx.navigateTo({ url: '/pages/scoring/photo/photo' })
  },

  // 跳过拍照直接提交
  async onSkipPhoto() {
    const confirm = await showConfirm('确定跳过拍照直接提交评分吗？')
    if (confirm) {
      wx.navigateTo({ url: '/pages/scoring/result/result' })
    }
  },

  // 返回上一页
  async onBack() {
    const confirm = await showConfirm('返回将丢失当前评分数据，确定吗？')
    if (confirm) {
      store.resetScoring()
      wx.navigateBack()
    }
  }
})
