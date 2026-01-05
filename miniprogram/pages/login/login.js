// pages/login/login.js
const { store } = require('../../store/index')
const { api } = require('../../utils/request')
const { showLoading, hideLoading, showToast } = require('../../utils/util')
const { getAppraiserRole } = require('../../utils/mockData')

Page({
  data: {
    loading: false,
    agreed: false,
    avatarUrl: ''
  },

  onLoad() {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.employeeId) {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  // 同意协议
  onAgreeChange(e) {
    this.setData({ agreed: e.detail.value.length > 0 })
  },

  // 选择头像后自动登录
  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.setData({ avatarUrl })
    // 选择头像后自动执行登录
    await this.onWxLogin()
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
      const code = await new Promise((resolve, reject) => {
        wx.login({
          success: (res) => resolve(res.code),
          fail: (err) => reject(err)
        })
      })

      const loginRes = await api.login(code)

      if (loginRes?.verified) {
        const userInfo = {
          employeeId: loginRes.user?.employeeId,
          appraiserName: loginRes.user?.name,
          isCertified: loginRes.user?.isCertified,
          role: loginRes.user?.role || 'appraiser',
          avatarUrl: this.data.avatarUrl || '',
          nickName: loginRes.user?.name || '',
          openId: loginRes.openId
        }

        const farms = (loginRes.farms || []).map(farm => ({
          farmCode: farm.farmCode || farm.code,
          farmName: farm.farmName || farm.name,
          dhiCode: farm.dhiCode || ''
        }))

        wx.setStorageSync('token', loginRes.token)
        wx.setStorageSync('userInfo', userInfo)
        wx.setStorageSync('farms', farms)
        wx.removeStorageSync('tempWxUserInfo')

        store.setUserInfo(userInfo)
        store.setFarms(farms)

        hideLoading()
        showToast('登录成功')

        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' })
        }, 300)
        return
      }

      if (!loginRes?.openId) {
        throw new Error('未获取到用户信息')
      }

      // 保存临时信息，跳转到身份认证页
      wx.setStorageSync('tempWxUserInfo', {
        openId: loginRes.openId,
        avatarUrl: this.data.avatarUrl || '',
        nickName: ''
      })

      hideLoading()

      // 跳转到鉴定员验证页面
      wx.navigateTo({ url: '/pages/login/verify/verify' })

    } catch (err) {
      hideLoading()
      console.error('登录失败:', err)
      showToast(err.message || '登录失败，请重试')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 查看用户协议
  onViewAgreement() {
    wx.navigateTo({
      url: '/pages/legal/agreement/agreement'
    })
  },

  // 查看隐私政策
  onViewPrivacy() {
    wx.navigateTo({
      url: '/pages/legal/privacy/privacy'
    })
  }
})
