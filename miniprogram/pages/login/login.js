// pages/login/login.js
const { store } = require('../../store/index')
const { api } = require('../../utils/request')
const { showLoading, hideLoading, showError, showToast } = require('../../utils/util')

Page({
  data: {
    loading: false,
    agreed: false
  },

  onLoad() {
    // 检查是否已登录
    const token = wx.getStorageSync('token')
    if (token) {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  // 同意协议
  onAgreeChange(e) {
    this.setData({ agreed: e.detail.value.length > 0 })
  },

  // 微信登录
  async onWxLogin() {
    if (!this.data.agreed) {
      showToast('请先阅读并同意用户协议')
      return
    }

    if (this.data.loading) return

    this.setData({ loading: true })
    showLoading('登录中...')

    try {
      // 获取微信登录code
      const loginRes = await this.wxLogin()

      // 调用后端登录接口
      const result = await api.login(loginRes.code)

      // 保存token和用户信息
      wx.setStorageSync('token', result.token)
      wx.setStorageSync('userInfo', result.user)

      // 更新store
      store.setUserInfo(result.user)

      hideLoading()

      // 跳转到首页
      wx.switchTab({ url: '/pages/index/index' })

    } catch (err) {
      hideLoading()
      showError(err.message || '登录失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 微信登录Promise封装
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject
      })
    })
  },

  // 查看用户协议
  onViewAgreement() {
    wx.navigateTo({
      url: '/pages/webview/webview?url=' + encodeURIComponent('https://api.genepop.com/agreement')
    })
  },

  // 查看隐私政策
  onViewPrivacy() {
    wx.navigateTo({
      url: '/pages/webview/webview?url=' + encodeURIComponent('https://api.genepop.com/privacy')
    })
  }
})
