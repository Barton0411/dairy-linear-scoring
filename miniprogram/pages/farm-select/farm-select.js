const { storeBindingsBehavior } = require('mobx-miniprogram-bindings')
const { store } = require('../../store/index')
const { api } = require('../../utils/request')
const { showToast } = require('../../utils/util')
const { updateFarmDhiCode, isAdmin } = require('../../utils/mockData')

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: {
    store,
    fields: ['currentFarm'],
    actions: ['setCurrentFarm']
  },

  data: {
    farms: [],
    filteredFarms: [],
    searchKeyword: '',
    showDhiModal: false,
    selectedFarm: null,
    dhiCodeInput: '',
    isAdmin: false,
    loading: false
  },

  onLoad(options) {
    this.loadFarms()
  },

  onShow() {
    // 每次显示时从服务器刷新牧场列表
    this.setData({ loading: true })
    this.loadFarms().finally(() => {
      this.setData({ loading: false })
    })
  },

  // 加载牧场列表 - 从API刷新
  async loadFarms() {
    const userInfo = wx.getStorageSync('userInfo')
    const adminStatus = userInfo && (userInfo.role === 'admin' || userInfo.role === 'super_admin')

    try {
      // 调用API获取最新牧场列表
      const farms = await api.getFarms()

      // 更新本地缓存和状态
      wx.setStorageSync('farms', farms)

      this.setData({
        farms,
        filteredFarms: farms,
        isAdmin: adminStatus
      })

      // 重新应用搜索过滤
      if (this.data.searchKeyword) {
        this.filterFarms(this.data.searchKeyword)
      }

      if (farms.length === 0) {
        showToast('暂无可用牧场')
      }
    } catch (err) {
      console.error('[farm-select] Load farms error:', err)

      // API失败时降级到缓存数据
      const cachedFarms = wx.getStorageSync('farms') || []
      this.setData({
        farms: cachedFarms,
        filteredFarms: cachedFarms,
        isAdmin: adminStatus
      })

      if (this.data.searchKeyword) {
        this.filterFarms(this.data.searchKeyword)
      }

      showToast(err.message || '刷新牧场列表失败，显示缓存数据')
    }
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ searchKeyword: keyword })
    this.filterFarms(keyword)
  },

  // 搜索确认
  onSearchConfirm() {
    // 键盘确认时，如果只有一个结果，直接选择
    const { filteredFarms } = this.data
    if (filteredFarms.length === 1) {
      this.onSelectFarm({ currentTarget: { dataset: { farm: filteredFarms[0] } } })
    }
  },

  // 清除搜索
  onClearSearch() {
    this.setData({
      searchKeyword: '',
      filteredFarms: this.data.farms
    })
  },

  // 过滤牧场
  filterFarms(keyword) {
    const { farms } = this.data

    if (!keyword || keyword.trim() === '') {
      this.setData({ filteredFarms: farms })
      return
    }

    const searchKey = keyword.toLowerCase().trim()
    const filtered = farms.filter(farm => {
      // 兼容新旧字段名
      const farmName = (farm.farmName || farm.name || '').toLowerCase()
      const farmCode = (farm.farmCode || farm.code || '').toLowerCase()
      const dhiCode = (farm.dhiCode || '').toLowerCase()

      return farmName.includes(searchKey) ||
             farmCode.includes(searchKey) ||
             dhiCode.includes(searchKey)
    })

    this.setData({ filteredFarms: filtered })
  },

  // 选择牧场
  onSelectFarm(e) {
    const farm = e.currentTarget.dataset.farm

    // 检查DHI编号
    if (!farm.dhiCode) {
      // 显示DHI编号输入弹窗
      this.setData({
        showDhiModal: true,
        selectedFarm: farm,
        dhiCodeInput: ''
      })
    } else {
      // 直接选择牧场
      this.confirmSelectFarm(farm)
    }
  },

  // 输入DHI编号
  onDhiCodeInput(e) {
    this.setData({ dhiCodeInput: e.detail.value.trim() })
  },

  // 确认DHI编号
  onConfirmDhiCode() {
    const { selectedFarm, dhiCodeInput } = this.data

    if (!dhiCodeInput) {
      showToast('请输入DHI编号或点击"暂不设置"')
      return
    }

    // 兼容新旧字段名
    const farmCode = selectedFarm.farmCode || selectedFarm.code

    // 更新牧场DHI编号
    const result = updateFarmDhiCode(farmCode, dhiCodeInput)

    if (result.success) {
      // 更新本地牧场列表
      const farms = this.data.farms.map(f => {
        const fCode = f.farmCode || f.code
        if (fCode === farmCode) {
          return { ...f, dhiCode: dhiCodeInput }
        }
        return f
      })

      this.setData({ farms })
      wx.setStorageSync('farms', farms)

      // 重新过滤（如果有搜索关键词）
      if (this.data.searchKeyword) {
        this.filterFarms(this.data.searchKeyword)
      } else {
        this.setData({ filteredFarms: farms })
      }

      showToast('DHI编号已保存')

      // 关闭弹窗并选择牧场
      this.setData({ showDhiModal: false })
      this.confirmSelectFarm({ ...selectedFarm, dhiCode: dhiCodeInput })

    } else {
      showToast(result.message)
    }
  },

  // 跳过DHI编号设置
  onSkipDhiCode() {
    const { selectedFarm } = this.data
    this.setData({ showDhiModal: false })
    this.confirmSelectFarm(selectedFarm)
  },

  // 关闭DHI弹窗
  onCloseDhiModal() {
    this.setData({
      showDhiModal: false,
      selectedFarm: null,
      dhiCodeInput: ''
    })
  },

  // 阻止事件冒泡（空函数）
  onStopPropagation() {
    // 仅用于阻止事件冒泡，不执行任何操作
  },

  // 确认选择牧场
  confirmSelectFarm(farm) {
    // 兼容新旧字段名
    const normalizedFarm = {
      farmCode: farm.farmCode || farm.code,
      farmName: farm.farmName || farm.name,
      dhiCode: farm.dhiCode || ''
    }

    this.setCurrentFarm(normalizedFarm)
    showToast('已选择：' + normalizedFarm.farmName)

    // 返回上一页
    setTimeout(() => {
      wx.navigateBack()
    }, 500)
  },

  // 新建牧场（仅管理员）
  onCreateFarm() {
    if (!this.data.isAdmin) {
      showToast('只有管理员可以新建牧场')
      return
    }
    wx.navigateTo({ url: '/pages/farm-create/farm-create' })
  }
})
