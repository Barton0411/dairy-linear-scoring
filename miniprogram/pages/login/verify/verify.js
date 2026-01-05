// pages/login/verify/verify.js
// 鉴定员身份认证页面
const { store } = require('../../../store/index')
const { api } = require('../../../utils/request')
const { showLoading, hideLoading, showError, showToast } = require('../../../utils/util')
const { getAppraiserRole } = require('../../../utils/mockData')

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
      const verifyRes = await api.verifyAppraiser({
        openId: wxUserInfo.openId,
        name,
        employeeId
      })

      if (!verifyRes?.verified) {
        hideLoading()
        showError(verifyRes?.message || '姓名或工号不匹配，请检查后重试')
        return
      }

      const userInfo = {
        openId: wxUserInfo.openId,
        avatarUrl: wxUserInfo.avatarUrl || '',
        nickName: wxUserInfo.nickName || '',
        employeeId: verifyRes.user?.employeeId || employeeId,
        appraiserName: verifyRes.user?.name || name,
        isCertified: verifyRes.user?.isCertified,
        role: verifyRes.user?.role || 'appraiser'
      }

      const farms = (verifyRes.farms || []).map(farm => ({
        farmCode: farm.farmCode || farm.code,
        farmName: farm.farmName || farm.name,
        dhiCode: farm.dhiCode || ''
      }))

      wx.setStorageSync('token', verifyRes.token)
      wx.setStorageSync('userInfo', userInfo)
      wx.setStorageSync('farms', farms)
      wx.removeStorageSync('tempWxUserInfo')

      store.setUserInfo(userInfo)
      store.setFarms(farms)

      // 尝试保存头像
      if (userInfo.avatarUrl) {
        api.updateUserInfo({ avatarUrl: userInfo.avatarUrl }).catch(() => {})
      }

      hideLoading()
      showToast('验证成功')

      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' })
      }, 500)
    } catch (err) {
      hideLoading()
      console.error('验证失败:', err)
      showError(err.message || '验证失败，请重试')
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
