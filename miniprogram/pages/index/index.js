// pages/index/index.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings')
const { store } = require('../../store/index')
const { api } = require('../../utils/request')
const { showToast, checkNetwork, getGradeColor } = require('../../utils/util')

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: {
    store,
    fields: ['userInfo', 'currentFarm', 'pendingSyncCount', 'isLoggedIn'],
    actions: ['setCurrentFarm', 'updatePendingSyncCount']
  },

  data: {
    loading: false,
    offlineScores: [],  // 离线评分列表
    showOfflineList: false,  // 是否展开显示离线列表
    isSuperAdmin: false,  // 是否为超级管理员
    pendingCertCount: 0  // 待审批证书数量
  },

  onLoad() {
    if (!this.data.isLoggedIn) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }

    // 加载牧场信息
    this.loadCurrentFarm()

    // 加载离线评分列表
    this.loadOfflineScores()

    // 更新待同步数量
    this.updatePendingSyncCount()
  },

  onShow() {
    // 每次显示时更新同步状态和离线列表
    this.loadOfflineScores()
    this.updatePendingSyncCount()

    // 检查待审批证书
    this.checkPendingCertificates()
  },

  // 加载当前牧场
  loadCurrentFarm() {
    const savedFarm = wx.getStorageSync('currentFarm')
    if (savedFarm) {
      this.setCurrentFarm(savedFarm)
    }
  },

  // 加载离线评分列表
  loadOfflineScores() {
    let offlineScores = wx.getStorageSync('offlineScores')

    // 确保是数组
    if (!Array.isArray(offlineScores)) {
      offlineScores = []
    }

    // 格式化时间并添加显示信息
    const formattedScores = offlineScores.map(score => {
      const date = new Date(score.createdAt)
      const timeStr = `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

      return {
        ...score,
        timeStr,
        gradeColor: getGradeColor(score.grade)
      }
    })

    this.setData({
      offlineScores: formattedScores,
      showOfflineList: formattedScores.length > 0 && formattedScores.length <= 3  // 3条以内默认展开
    })
  },

  // 切换离线列表展开/收起
  toggleOfflineList() {
    this.setData({ showOfflineList: !this.data.showOfflineList })
  },

  // 选择牧场
  onSelectFarm() {
    wx.navigateTo({ url: '/pages/farm-select/farm-select' })
  },

  // 进入设置页面
  onSettings() {
    wx.switchTab({ url: '/pages/settings/settings' })
  },

  // 开始评分
  onStartScoring() {
    if (!this.data.currentFarm) {
      showToast('请先选择牧场')
      return
    }
    wx.navigateTo({ url: '/pages/scoring/info/info' })
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
      this.loadOfflineScores()  // 重新加载离线列表
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
    this.loadOfflineScores()
    this.updatePendingSyncCount()
    wx.stopPullDownRefresh()
  },

  // 查看评分记录
  onViewRecords() {
    wx.switchTab({ url: '/pages/records/list/list' })
  },

  // 显示联系方式
  onShowContact() {
    wx.showModal({
      title: '反馈联系方式',
      content: '联系人：杨超群\n电话：17367077554\n邮箱：yangchaoqun1@yili.com',
      confirmText: '拨打电话',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '17367077554',
            fail: () => {
              wx.setClipboardData({
                data: '17367077554',
                success: () => {
                  showToast('电话号码已复制')
                }
              })
            }
          })
        }
      }
    })
  },

  // 检查待审批证书
  async checkPendingCertificates() {
    const userInfo = store.userInfo
    const isSuperAdmin = userInfo && userInfo.role === 'super_admin'
    if (!isSuperAdmin) {
      this.setData({ isSuperAdmin: false })
      return
    }

    this.setData({ isSuperAdmin: true })

    try {
      const res = await api.getPendingCertificates()
      this.setData({ pendingCertCount: res.total || 0 })
    } catch (err) {
      console.error('检查待审批证书失败:', err)
    }
  },

  // 跳转到证书审批页面
  onGoToCertReview() {
    wx.navigateTo({
      url: '/pages/admin-panel/admin-panel?tab=certReview'
    })
  }
})
