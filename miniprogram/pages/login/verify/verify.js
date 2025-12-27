// pages/login/verify/verify.js
// 鉴定员身份认证页面
const { store } = require('../../../store/index')
const { api } = require('../../../utils/request')
const { showLoading, hideLoading, showError, showToast } = require('../../../utils/util')

Page({
  data: {
    name: '',
    employeeId: '',
    loading: false,
    wxUserInfo: null  // 微信登录后的临时信息
  },

  onLoad(options) {
    // 从登录页传来的微信用户信息
    const wxUserInfo = wx.getStorageSync('tempWxUserInfo')
    if (!wxUserInfo) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.setData({ wxUserInfo })
  },

  // 输入姓名
  onNameInput(e) {
    this.setData({ name: e.detail.value.trim() })
  },

  // 输入工号
  onEmployeeIdInput(e) {
    this.setData({ employeeId: e.detail.value.trim() })
  },

  // 提交认证
  async onVerify() {
    const { name, employeeId, wxUserInfo } = this.data

    if (!name) {
      showToast('请输入姓名')
      return
    }

    if (!employeeId) {
      showToast('请输入工号')
      return
    }

    this.setData({ loading: true })
    showLoading('验证中...')

    try {
      // 调用后端验证接口
      const result = await api.verifyAppraiser({
        openId: wxUserInfo.openId,
        name,
        employeeId
      })

      if (result.verified) {
        // 验证成功，保存用户信息
        wx.setStorageSync('token', result.token)
        wx.setStorageSync('userInfo', result.user)
        wx.removeStorageSync('tempWxUserInfo')

        // 更新store
        store.setUserInfo(result.user)
        store.setFarms(result.farms || [])

        hideLoading()

        // 跳转到首页
        wx.switchTab({ url: '/pages/index/index' })
      } else {
        hideLoading()
        showError('姓名或工号不匹配')
      }

    } catch (err) {
      hideLoading()
      showError(err.message || '验证失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 返回登录页
  onBack() {
    wx.removeStorageSync('tempWxUserInfo')
    wx.navigateBack()
  }
})
