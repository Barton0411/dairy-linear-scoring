// pages/settings/settings.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings')
const { store, TRAITS } = require('../../store/index')
const { showToast, showLoading, hideLoading, compressImage } = require('../../utils/util')
const { isAdmin } = require('../../utils/mockData')
const { api } = require('../../utils/request')

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: {
    store,
    fields: {
      userInfo: 'userInfo',
      settings: 'settings',
      defaultScores: () => store.settings.defaultScores  // 直接绑定defaultScores
    },
    actions: {
      updateSettings: 'updateSettings'
    }
  },

  data: {
    // 性状列表（按类别）
    bodyTraits: [],
    rumpTraits: [],
    legsTraits: [],
    mammaryTraits: [],
    dairyTraits: [],

    // 乳房空满选项
    udderFullnessOptions: ['空', '满'],
    udderFullnessIndex: -1,

    // 拍照模式选项
    photoModeOptions: [
      {
        value: 'always',
        label: '不做限制（推荐）',
        desc: '总是进入拍照页面，由用户决定是否拍照'
      },
      {
        value: 'threshold',
        label: '根据分数阈值',
        desc: '根据自定义高/低分阈值决定是否提示拍照'
      },
      {
        value: 'never',
        label: '从不拍照',
        desc: '评分完成后直接跳过拍照环节'
      }
    ],

    // 管理员状态
    isAdmin: false,

    // 证书管理
    certStatus: 'none',  // none | pending | approved | rejected
    currentApplication: null,

    saving: false
  },

  onLoad(options) {
    // 初始化性状列表（去重：同一性状只展示一次，避免重复出现在多个类别）
    const usedKeys = new Set()

    const bodyTraits = (TRAITS.body?.traits || []).filter(trait => {
      if (usedKeys.has(trait.key)) return false
      usedKeys.add(trait.key)
      return true
    })

    const rumpTraits = (TRAITS.rump?.traits || []).filter(trait => {
      if (usedKeys.has(trait.key)) return false
      usedKeys.add(trait.key)
      return true
    })

    const legsTraits = (TRAITS.feet_legs?.traits || []).filter(trait => {
      if (usedKeys.has(trait.key)) return false
      usedKeys.add(trait.key)
      return true
    })

    // 泌乳系统需要从子类别中收集所有性状（子类别去重 + 跨类别去重）
    const mammaryTraits = []
    const mammaryAdded = new Set()

    if (TRAITS.udder?.subCategories) {
      Object.values(TRAITS.udder.subCategories).forEach(subCat => {
        subCat.traits.forEach(trait => {
          if (mammaryAdded.has(trait.key)) return
          mammaryAdded.add(trait.key)
          if (usedKeys.has(trait.key)) return
          usedKeys.add(trait.key)
          mammaryTraits.push(trait)
        })
      })
    }

    const dairyTraits = (TRAITS.dairy?.traits || []).filter(trait => {
      if (usedKeys.has(trait.key)) return false
      usedKeys.add(trait.key)
      return true
    })

    this.setData({
      bodyTraits,
      rumpTraits,
      legsTraits,
      mammaryTraits,
      dairyTraits
    })

    // 检查管理员权限
    const userInfo = wx.getStorageSync('userInfo')
    const role = userInfo?.role
    const hasAdminAccess = role ? (role === 'admin' || role === 'super_admin') : (userInfo && isAdmin(userInfo.employeeId))
    if (hasAdminAccess) {
      this.setData({ isAdmin: true })
    }

    // 设置乳房空满选项的当前选中索引
    this.updateUdderFullnessIndex()

    // 加载证书状态
    this.loadCertificateStatus()
  },

  onShow() {
    // 每次显示时更新乳房空满索引（可能在其他页面修改了）
    this.updateUdderFullnessIndex()
  },

  // 加载证书状态
  async loadCertificateStatus() {
    try {
      const res = await api.getCertificateStatus()
      this.setData({
        certStatus: res.certStatus || 'none',
        currentApplication: res.currentApplication || null
      })
    } catch (err) {
      console.error('加载证书状态失败:', err)
      // 如果失败，保持默认状态
    }
  },

  // 上传证书
  async onUploadCertificate() {
    try {
      // 选择图片
      const res = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          sizeType: ['compressed'],
          success: resolve,
          fail: reject
        })
      })

      const filePath = res.tempFiles[0].tempFilePath

      // 压缩图片（证书使用更激进的压缩）
      showLoading('压缩中...')
      const compressed = await compressImage(filePath, {
        maxSize: 1200,  // 最大边1200像素（证书不需要太高清）
        quality: 50     // 质量50（可以看清文字即可）
      })

      // 获取压缩后的文件信息
      const fileInfo = await new Promise((resolve, reject) => {
        wx.getFileInfo({
          filePath: compressed,
          success: resolve,
          fail: reject
        })
      })

      const sizeKB = Math.round(fileInfo.size / 1024)
      console.log(`证书压缩完成，大小: ${sizeKB}KB`)

      // 上传
      showLoading('上传中...')
      await api.uploadCertificate(compressed)
      hideLoading()
      showToast('上传成功，等待审批')

      // 刷新证书状态
      this.loadCertificateStatus()
    } catch (err) {
      hideLoading()
      if (err.errMsg && err.errMsg.includes('cancel')) {
        // 用户取消选择
        return
      }
      showToast(err.message || '上传失败')
      console.error('上传证书失败:', err)
    }
  },

  // 预览证书
  onPreviewCertificate() {
    if (!this.data.currentApplication?.ossUrl) return

    wx.previewImage({
      urls: [this.data.currentApplication.ossUrl],
      current: this.data.currentApplication.ossUrl
    })
  },

  // 更新乳房空满选择器索引
  updateUdderFullnessIndex() {
    const currentValue = this.data.settings.defaultUdderFullness
    let index = this.data.udderFullnessOptions.indexOf(currentValue)
    if (index < 0) {
      index = 0
      this.updateSettings({ defaultUdderFullness: this.data.udderFullnessOptions[index] })
    }
    this.setData({ udderFullnessIndex: index })
  },

  // 性状分数输入
  onScoreInput(e) {
    const { key } = e.currentTarget.dataset
    const value = parseInt(e.detail.value) || 0
    // 临时更新，不触发保存
    const newScores = { ...this.data.settings.defaultScores }
    newScores[key] = value
    this.updateSettings({ defaultScores: newScores })
  },

  // 性状分数失焦验证
  onScoreBlur(e) {
    const { key } = e.currentTarget.dataset
    let value = parseInt(e.detail.value) || 5
    // 限制范围 1-9
    value = Math.max(1, Math.min(9, value))
    const newScores = { ...this.data.settings.defaultScores }
    newScores[key] = value
    this.updateSettings({ defaultScores: newScores })
  },

  // 印象分输入
  onImpressionInput(e) {
    const value = parseInt(e.detail.value) || 0
    this.updateSettings({ defaultImpressionScore: value })
  },

  // 印象分失焦验证
  onImpressionBlur(e) {
    let value = parseInt(e.detail.value) || 85
    // 限制范围 50-100
    value = Math.max(50, Math.min(100, value))
    this.updateSettings({ defaultImpressionScore: value })
  },

  // 乳房空满选择变化
  onUdderFullnessChange(e) {
    const index = e.detail.value
    const value = this.data.udderFullnessOptions[index]
    this.setData({ udderFullnessIndex: index })
    this.updateSettings({ defaultUdderFullness: value })
  },

  // 拍照模式变化
  onPhotoModeChange(e) {
    const photoMode = e.detail.value
    this.updateSettings({ photoMode })
  },

  // 拍照阈值输入
  onThresholdInput(e) {
    const { type } = e.currentTarget.dataset
    const raw = parseInt(e.detail.value) || 0
    const field = type === 'excellent' ? 'photoThresholdExcellent' : 'photoThresholdPoor'
    this.updateSettings({ [field]: raw })
  },

  // 拍照阈值失焦校验
  onThresholdBlur(e) {
    const { type } = e.currentTarget.dataset
    const field = type === 'excellent' ? 'photoThresholdExcellent' : 'photoThresholdPoor'
    const fallback = type === 'excellent' ? 85 : 65
    let value = parseInt(e.detail.value)
    value = Number.isFinite(value) ? value : fallback
    // 总分范围 0-120（预留空间）
    value = Math.max(0, Math.min(120, value))
    this.updateSettings({ [field]: value })
  },

  // 优秀牛只拍照提示开关
  onPhotoPromptExcellentChange(e) {
    this.updateSettings({ photoPromptExcellent: e.detail.value })
  },

  // 较差牛只拍照提示开关
  onPhotoPromptPoorChange(e) {
    this.updateSettings({ photoPromptPoor: e.detail.value })
  },

  // 全部设为5分
  onSetAllToFive() {
    wx.showModal({
      title: '确认操作',
      content: '将所有性状默认分设为5分？',
      success: (res) => {
        if (res.confirm) {
          const newScores = {}
          Object.keys(this.data.settings.defaultScores).forEach(key => {
            newScores[key] = 5
          })
          this.updateSettings({
            defaultScores: newScores,
            defaultImpressionScore: 85
          })
          showToast('已全部设为5分')
        }
      }
    })
  },

  // 恢复默认设置
  onResetDefaults() {
    wx.showModal({
      title: '确认操作',
      content: '恢复所有设置为系统默认值？',
      success: (res) => {
        if (res.confirm) {
          const defaultScores = {
            tg: 5, xk: 5, ts: 5, yqd: 5,
            kjd: 5, kk: 5,
            tjd: 5, tgsd: 5, gzd: 5, hzcs: 5, hzhs: 5,
            rfsd: 5, zyxrd: 5, qrffz: 5, qrtwz: 5, qrtcd: 5,
            hrffzgd: 5, hrffzkd: 5, hrtwz: 5,
            ljx: 5
          }
          this.updateSettings({
            defaultScores,
            defaultImpressionScore: 85,
            defaultUdderFullness: '空',
            photoMode: 'always',
            photoPromptExcellent: false,
            photoPromptPoor: true,
            photoThresholdExcellent: 85,
            photoThresholdPoor: 65
          })
          this.updateUdderFullnessIndex()
          showToast('已恢复默认设置')
        }
      }
    })
  },

  // 保存设置
  onSaveSettings() {
    this.setData({ saving: true })
    showLoading('保存中...')

    try {
      // 保存到本地存储
      wx.setStorageSync('settings', this.data.settings)

      setTimeout(() => {
        hideLoading()
        this.setData({ saving: false })
        showToast('设置已保存')
      }, 500)

    } catch (err) {
      hideLoading()
      this.setData({ saving: false })
      showToast('保存失败')
      console.error('保存设置失败:', err)
    }
  },

  // 打开管理后台
  onOpenAdminPanel() {
    wx.navigateTo({
      url: '/pages/admin-panel/admin-panel'
    })
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录信息
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('currentFarm')
          wx.removeStorageSync('farms')

          // 清除 store
          store.logout()

          showToast('已退出登录')

          // 跳转到登录页
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/login/login' })
          }, 500)
        }
      }
    })
  }
})
