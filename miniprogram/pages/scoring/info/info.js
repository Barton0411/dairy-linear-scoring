// pages/scoring/info/info.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings')
const { store } = require('../../../store/index')
const { showToast } = require('../../../utils/util')

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: {
    store,
    fields: ['currentFarm'],
    actions: ['startNewScoring']
  },

  data: {
    earTag: '',
    parity: '',
    loading: false
  },

  onLoad(options) {
    if (!this.data.currentFarm) {
      showToast('请先选择牧场')
      wx.navigateBack()
    }
  },

  // 输入牛号
  onEarTagInput(e) {
    this.setData({ earTag: e.detail.value.trim() })
  },

  // 输入胎次
  onParityInput(e) {
    const value = e.detail.value.trim()
    this.setData({ parity: value })
  },

  // 开始评分
  async onStartScoring() {
    const { earTag, parity } = this.data

    if (!earTag) {
      showToast('请输入牛号')
      return
    }

    if (!parity) {
      showToast('请输入胎次')
      return
    }

    this.setData({ loading: true })

    try {
      // 初始化评分数据，传入胎次
      const parityNum = parseInt(parity)
      this.startNewScoring(earTag, parityNum)

      // 跳转到评分页面
      wx.navigateTo({ url: '/pages/scoring/unified/unified' })

    } catch (err) {
      showToast(err.message || '操作失败')
    } finally {
      this.setData({ loading: false })
    }
  }
})
