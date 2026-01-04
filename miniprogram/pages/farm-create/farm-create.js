// pages/farm-create/farm-create.js
const { showToast, showLoading, hideLoading, showConfirm } = require('../../utils/util')
const { isAdmin } = require('../../utils/mockData')
const { api } = require('../../utils/request')

Page({
  data: {
    farmName: '',
    farmCode: '',
    dhiCode: '',
    loading: false
  },

  onLoad(options) {
    // 验证管理员权限
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !isAdmin(userInfo.employeeId)) {
      showToast('只有管理员可以访问此页面')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  onFarmNameInput(e) {
    this.setData({ farmName: e.detail.value.trim() })
  },

  onFarmCodeInput(e) {
    this.setData({ farmCode: e.detail.value.trim().toUpperCase() })
  },

  onDhiCodeInput(e) {
    this.setData({ dhiCode: e.detail.value.trim().toUpperCase() })
  },

  async onSubmit() {
    const { farmName, farmCode, dhiCode } = this.data

    if (!farmName) {
      showToast('请输入牧场名称')
      return
    }

    if (!farmCode) {
      showToast('请输入站号')
      return
    }

    // 验证站号格式
    if (!/^[A-Z0-9]+$/.test(farmCode)) {
      showToast('站号只能包含大写字母和数字')
      return
    }

    this.setData({ loading: true })
    showLoading('创建中...')

    try {
      // 使用真实API创建牧场
      await api.createFarm({
        farmCode: farmCode.trim(),
        farmName: farmName.trim(),
        dhiCode: dhiCode.trim() || null
      })

      hideLoading()
      showToast('创建成功')

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      hideLoading()
      showToast(err.message || '创建失败')
      this.setData({ loading: false })
    }
  }
})
