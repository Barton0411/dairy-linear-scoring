// pages/team-info/team-info.js
const { showToast } = require('../../utils/util')
const {
  getAllAppraisers,
  isAdmin,
  MOCK_APPRAISER_FARMS,
  MOCK_FARMS
} = require('../../utils/mockData')

Page({
  data: {
    appraisers: []
  },

  onLoad(options) {
    const userInfo = wx.getStorageSync('userInfo')
    const role = userInfo?.role
    const hasAdminAccess = role ? (role === 'admin' || role === 'super_admin') : (!!userInfo && isAdmin(userInfo.employeeId))
    this.hasAdminAccess = hasAdminAccess

    if (!hasAdminAccess) {
      showToast('只有管理员可以查看团队信息')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    this.loadTeamInfo()
  },

  onShow() {
    // 每次显示时刷新数据
    if (!this.hasAdminAccess) {
      return
    }
    this.loadTeamInfo()
  },

  // 加载团队信息
  loadTeamInfo() {
    const allAppraisers = getAllAppraisers()

    // 为每个鉴定员添加角色标签和匹配的牧场列表
    const appraisers = allAppraisers.map(appraiser => {
      const roleLabel = appraiser.role || 'appraiser'

      // 获取该鉴定员匹配的牧场
      const farmCodes = MOCK_APPRAISER_FARMS
        .filter(af => af.employeeId === appraiser.employeeId)
        .map(af => af.farmCode)

      const farms = MOCK_FARMS.filter(f => farmCodes.includes(f.farmCode))

      const farmNames = farms.map(farm => farm.farmName)
      let farmsText = '未分配'

      if (farmNames.length > 0) {
        farmsText = farmNames.length > 3
          ? `${farmNames.slice(0, 3).join(' / ')} / ...`
          : farmNames.join(' / ')
      }

      return {
        ...appraiser,
        roleLabel,
        farms,
        farmsText
      }
    })

    // 按角色和姓名排序：超级管理员 > 管理员 > 普通鉴定员
    appraisers.sort((a, b) => {
      const roleOrder = { 'super_admin': 0, 'admin': 1, 'appraiser': 2 }
      const orderA = roleOrder[a.role] || 3
      const orderB = roleOrder[b.role] || 3

      if (orderA !== orderB) {
        return orderA - orderB
      }

      // 同角色按姓名排序
      return a.appraiserName.localeCompare(b.appraiserName, 'zh-CN')
    })

    this.setData({ appraisers })
  }
})
