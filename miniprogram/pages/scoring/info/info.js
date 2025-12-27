// pages/scoring/info/info.js
const { storeBindingsBehavior } = require('mobx-miniprogram-binding')
const { store } = require('../../../store/index')
const { api } = require('../../../utils/request')
const { showToast, showLoading, hideLoading } = require('../../../utils/util')

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: {
    store,
    fields: ['currentFarm'],
    actions: ['startNewScoring']
  },

  data: {
    mode: 'normal',
    earTag: '',
    loading: false
  },

  onLoad(options) {
    this.setData({ mode: options.mode || 'normal' })

    if (!this.data.currentFarm) {
      showToast('请先选择牧场')
      wx.navigateBack()
    }
  },

  // 输入牛号
  onEarTagInput(e) {
    this.setData({ earTag: e.detail.value.trim() })
  },

  // 开始评分
  async onStartScoring() {
    const { earTag, mode } = this.data

    if (!earTag) {
      showToast('请输入牛号')
      return
    }

    this.setData({ loading: true })
    showLoading('检查中...')

    try {
      // 检查牛号是否存在，不存在则创建
      await this.ensureCattle(earTag)

      // 初始化评分数据
      this.startNewScoring(earTag, mode)

      hideLoading()

      // 跳转到评分页面
      const page = mode === 'defect' ? 'defect' : 'normal'
      wx.navigateTo({ url: `/pages/scoring/${page}/${page}` })

    } catch (err) {
      hideLoading()
      showToast(err.message || '操作失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 确保牛只存在
  async ensureCattle(earTag) {
    const farmId = this.data.currentFarm.id

    try {
      // 尝试获取牛只信息
      const cattle = await api.getCattle(farmId, { earTag })

      if (!cattle || cattle.length === 0) {
        // 创建新牛只
        await api.createCattle(farmId, earTag)
      }
    } catch (err) {
      // 离线模式下，记录本地
      if (err.message.includes('网络')) {
        console.log('Offline mode, skip cattle check')
        return
      }
      throw err
    }
  },

  // 扫描牛号
  onScanEarTag() {
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['barCode', 'qrCode'],
      success: (res) => {
        this.setData({ earTag: res.result })
      },
      fail: () => {
        showToast('扫描取消')
      }
    })
  }
})
