// pages/records/list/list.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings')
const { store } = require('../../../store/index')
const { showToast, showLoading, hideLoading, showConfirm, formatDate, getGradeColor } = require('../../../utils/util')
const { exportRecords } = require('../../../utils/excelExport')
const { isAdmin } = require('../../../utils/mockData')
const { api } = require('../../../utils/request')

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: {
    store,
    fields: {
      currentFarm: 'currentFarm',
      userInfo: 'userInfo'
    }
  },

  data: {
    viewMode: 'allFarms', // allFarms | singleFarm
    filterType: 'all', // all | mine
    allRecords: [],
    displayRecords: [],
    groupedRecords: [],  // 按牧场分组的记录
    stats: {
      total: 0,
      mine: 0,
      offline: 0
    },
    // 日期筛选
    startDate: '',
    endDate: '',
    showTools: false,
    page: 1,
    pageSize: 20,
    hasMore: false,
    loading: false,
    refreshing: false
  },

  onLoad() {},

  onShow() {
    // 每次显示时刷新记录
    this.loadRecords()
  },

  // 加载记录
  async loadRecords() {
    this.setData({ loading: true })

    try {
      const effectiveUserInfo = this.data.userInfo || wx.getStorageSync('userInfo')
      if (!effectiveUserInfo || !effectiveUserInfo.employeeId) {
        this.setData({ loading: false })
        showToast('请先登录')
        wx.reLaunch({ url: '/pages/login/login' })
        return
      }

      const role = effectiveUserInfo?.role
      const userIsAdmin = role ? (role === 'admin' || role === 'super_admin') : isAdmin(effectiveUserInfo.employeeId)

      // 1. 从本地存储加载离线记录
      const offlineRecords = wx.getStorageSync('offlineScores') || []

      // 2. 尝试从后端API加载在线记录
      let onlineRecords = []
      try {
        // 检查网络状态
        const networkType = await wx.getNetworkType()
        if (networkType.networkType !== 'none') {
          // 根据查看模式加载不同范围的记录
          if (this.data.viewMode === 'singleFarm' && this.data.currentFarm) {
            // 单牧场模式：只加载当前牧场的记录
            const response = await api.getScores(this.data.currentFarm.farmCode, { limit: 1000 })
            onlineRecords = Array.isArray(response) ? response : []
          } else {
            // 全牧场模式：加载所有关联牧场的记录
            const farms = wx.getStorageSync('farms') || []
            const allPromises = farms.map(farm => {
              const farmCode = farm.farmCode || farm.code
              if (!farmCode) {
                return Promise.resolve([])
              }
              return api.getScores(farmCode, { limit: 1000 }).catch(err => {
                console.warn(`加载牧场 ${farmCode} 记录失败:`, err)
                return []
              })
            })
            const results = await Promise.all(allPromises)
            onlineRecords = results.flat()
          }
        }
      } catch (err) {
        console.warn('加载在线记录失败（可能离线）:', err)
        // 继续使用离线记录
      }

      // 3. 合并离线和在线记录，去重
      const recordsMap = new Map()

      // 先添加在线记录
      onlineRecords.forEach(record => {
        const key = record.localId || record.id
        recordsMap.set(key, {
          ...record,
          isOffline: false,
          createdAt: record.created_at || record.createdAt,
          farmCode: record.farm_code || record.farmCode,
          farmName: record.farm_name || record.farmName,
          dhiCode: record.dhi_code || record.dhiCode,
          earTag: record.ear_tag || record.earTag,
          parity: record.parity,
          totalScore: record.total_score || record.totalScore,
          grade: record.grade,
          employeeId: record.employee_id || record.employeeId,
          appraiserName: record.appraiser_name || record.appraiserName,
          isCertified: record.is_certified !== undefined ? record.is_certified : record.isCertified,
          impressionScore: record.impression_score || record.impressionScore,
          udderFullness: record.udder_fullness || record.udderFullness,
          // 将20个性状字段打包到 scores 对象
          scores: {
            tg: record.tg,
            xk: record.xk,
            ts: record.ts,
            yqd: record.yqd,
            kjd: record.kjd,
            kk: record.kk,
            tjd: record.tjd,
            tgsd: record.tgsd,
            gzd: record.gzd,
            hzcs: record.hzcs,
            hzhs: record.hzhs,
            rfsd: record.rfsd,
            zyxrd: record.zyxrd,
            qrffz: record.qrffz,
            qrtwz: record.qrtwz,
            qrtcd: record.qrtcd,
            hrffzgd: record.hrffzgd,
            hrffzkd: record.hrffzkd,
            hrtwz: record.hrtwz,
            ljx: record.ljx
          }
        })
      })

      // 再添加离线记录（已同步的会被跳过）
      offlineRecords.forEach(record => {
        const key = record.localId || record.id
        if (!recordsMap.has(key)) {
          recordsMap.set(key, {
            ...record,
            isOffline: true
          })
        }
      })

      // 转换为数组
      let allRecords = Array.from(recordsMap.values())

      // 4. 根据查看模式过滤
      if (this.data.viewMode === 'singleFarm' && this.data.currentFarm) {
        allRecords = allRecords.filter(r =>
          r.farmCode === this.data.currentFarm.farmCode
        )
      }

      // 5. 添加权限标识和格式化
      const records = allRecords.map(record => ({
        ...record,
        canEdit: userIsAdmin || record.employeeId === effectiveUserInfo.employeeId,
        canDelete: userIsAdmin || record.employeeId === effectiveUserInfo.employeeId,
        createdAtFormatted: formatDate(new Date(record.createdAt)),
        createdAtTimestamp: new Date(record.createdAt).getTime(),
        gradeColor: getGradeColor(record.grade)
      }))

      // 6. 按时间倒序排列
      records.sort((a, b) => b.createdAtTimestamp - a.createdAtTimestamp)

      this.setData({
        allRecords: records,
        loading: false
      })

      this.updateDisplay(effectiveUserInfo)
      this.updateStats(effectiveUserInfo)

    } catch (err) {
      console.error('加载记录失败:', err)
      this.setData({ loading: false })
      showToast('加载失败')
    }
  },

  // 更新显示列表
  updateDisplay(userInfoOverride) {
    const { allRecords, filterType, viewMode, startDate, endDate } = this.data
    const userInfo = userInfoOverride || this.data.userInfo || {}

    let filtered = allRecords

    // 筛选：全部 vs 我的
    if (filterType === 'mine' && userInfo.employeeId) {
      filtered = allRecords.filter(r => r.employeeId === userInfo.employeeId)
    }

    // 日期筛选
    if (startDate || endDate) {
      filtered = filtered.filter(r => {
        const recordDate = new Date(r.createdAt).getTime()
        const start = startDate ? new Date(startDate).getTime() : 0
        const end = endDate ? new Date(endDate + ' 23:59:59').getTime() : Infinity
        return recordDate >= start && recordDate <= end
      })
    }

    // 根据视图模式设置显示数据
    if (viewMode === 'allFarms') {
      // 按牧场分组
      const grouped = this.groupByFarm(filtered)
      this.setData({
        groupedRecords: grouped,
        displayRecords: []
      })
    } else {
      // 单牧场模式，显示记录列表
      this.setData({
        displayRecords: filtered,
        groupedRecords: []
      })
    }
  },

  // 按牧场分组记录
  groupByFarm(records) {
    const farmMap = {}

    records.forEach(record => {
      const key = record.farmCode || 'unknown'
      if (!farmMap[key]) {
        farmMap[key] = {
          farmCode: record.farmCode,
          farmName: record.farmName || '未知牧场',
          count: 0,
          records: []
        }
      }
      farmMap[key].count++
      farmMap[key].records.push(record)
    })

    // 转换为数组并按记录数排序
    return Object.values(farmMap).sort((a, b) => b.count - a.count)
  },

  // 更新统计信息
  updateStats(userInfoOverride) {
    const { allRecords } = this.data
    const userInfo = userInfoOverride || this.data.userInfo || {}

    const stats = {
      total: allRecords.length,
      mine: userInfo.employeeId ? allRecords.filter(r => r.employeeId === userInfo.employeeId).length : 0,
      offline: allRecords.filter(r => r.isOffline).length
    }

    this.setData({ stats })
  },

  // 切换筛选
  onFilterChange(e) {
    const { type } = e.currentTarget.dataset
    this.setData({ filterType: type })
    this.updateDisplay()
  },

  onToggleTools() {
    this.setData({ showTools: !this.data.showTools })
  },

  onSetViewMode(e) {
    const { mode } = e.currentTarget.dataset
    if (mode === this.data.viewMode) return

    if (mode === 'allFarms') {
      this.onViewAllFarms()
      return
    }

    if (mode === 'singleFarm') {
      this.setData({ viewMode: 'singleFarm' })
      if (this.data.currentFarm && this.data.currentFarm.farmCode) {
        this.loadRecords()
      } else {
        this.onSelectFarm()
      }
    }
  },

  // 切换到所有牧场视图
  onViewAllFarms() {
    this.setData({ viewMode: 'allFarms' })
    this.updateDisplay()
  },

  // 选择牧场查看详情
  onSelectFarmDetail(e) {
    const { farm } = e.currentTarget.dataset
    // 切换到单牧场模式
    this.setData({
      viewMode: 'singleFarm',
      currentFarm: {
        farmCode: farm.farmCode,
        farmName: farm.farmName
      }
    })
    this.loadRecords()
  },

  // 返回所有牧场视图
  onBackToAllFarms() {
    this.setData({
      viewMode: 'allFarms',
      currentFarm: null,
      startDate: '',
      endDate: ''
    })
    this.loadRecords()
  },

  // 开始日期选择
  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value })
    this.updateDisplay()
  },

  // 结束日期选择
  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value })
    this.updateDisplay()
  },

  // 清除日期筛选
  onClearDateFilter() {
    this.setData({
      startDate: '',
      endDate: ''
    })
    this.updateDisplay()
  },

  buildOfflineClearContent() {
    const offlineScores = wx.getStorageSync('offlineScores') || []
    const offlinePhotos = wx.getStorageSync('offlinePhotos') || []

    if (offlineScores.length === 0 && offlinePhotos.length === 0) {
      return null
    }

    const scorePreviewCount = 6
    const scoreLines = offlineScores.slice(0, scorePreviewCount).map(score => {
      const earTag = score.earTag || score.ear_tag || '未知耳号'
      const farmName = score.farmName || score.farm_name || score.farmCode || score.farm_code || '未知牧场'
      const createdAt = score.createdAt || score.createdAtFormatted
      const timeLabel = createdAt ? (formatDate(createdAt) || createdAt) : '未知时间'
      return `${earTag} · ${farmName} · ${timeLabel}`
    })
    const moreScores = offlineScores.length - scoreLines.length

    const orphanPhotos = offlinePhotos.filter(photo => {
      return !offlineScores.some(score => score.localId === photo.scoreId)
    }).length

    const lines = []
    if (offlineScores.length > 0) {
      lines.push(`评分(${offlineScores.length}条)`)
      lines.push(...scoreLines.map(line => `- ${line}`))
      if (moreScores > 0) {
        lines.push(`...还有 ${moreScores} 条`)
      }
    }

    if (offlinePhotos.length > 0) {
      lines.push(`照片(${offlinePhotos.length}张${orphanPhotos > 0 ? `，孤立${orphanPhotos}张` : ''})`)
    }

    return lines.join('\n')
  },

  // 清理本地离线数据
  onClearLocalData() {
    const content = this.buildOfflineClearContent()
    if (!content) {
      showToast('暂无本地数据')
      return
    }

    wx.showModal({
      title: '清除本地数据',
      content: `${content}\n\n确认清除以上本地离线数据吗？`,
      confirmText: '清除',
      confirmColor: '#ff6b6b',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        wx.setStorageSync('offlineScores', [])
        wx.setStorageSync('offlinePhotos', [])
        store.updatePendingSyncCount()
        showToast('已清除本地数据')
        this.loadRecords()
      }
    })
  },

  // 选择牧场(跳转到牧场选择页)
  onSelectFarm() {
    wx.navigateTo({ url: '/pages/farm-select/farm-select' })
  },

  // 下拉刷新
  async onRefresh() {
    this.setData({ refreshing: true })
    await this.loadRecords()
    this.setData({ refreshing: false })
  },

  // 加载更多（预留）
  onLoadMore() {
    // TODO: 实现分页加载
    showToast('已加载全部记录')
  },

  // 查看详情
  onViewDetail(e) {
    const { record } = e.currentTarget.dataset

    // 将记录临时保存到storage，详情页读取
    wx.setStorageSync('tempRecord', record)

    wx.navigateTo({
      url: '/pages/records/detail/detail'
    })
  },

  // 长按记录操作
  onRecordLongPress(e) {
    const { record } = e.currentTarget.dataset
    const actions = ['查看', '导出']

    if (record.canEdit) actions.push('编辑')
    if (record.canDelete) actions.push('删除')

    wx.showActionSheet({
      itemList: actions,
      success: (res) => {
        const action = actions[res.tapIndex]
        if (action === '查看') {
          this.onViewDetail({ currentTarget: { dataset: { record } } })
          return
        }
        if (action === '导出') {
          this.onExportRecord({ currentTarget: { dataset: { record } } })
          return
        }
        if (action === '编辑') {
          this.onEditRecord({ currentTarget: { dataset: { record } } })
          return
        }
        if (action === '删除') {
          this.onDeleteRecord({ currentTarget: { dataset: { record } } })
        }
      }
    })
  },

  // 导出单条记录
  async onExportRecord(e) {
    const { record } = e.currentTarget.dataset

    // 询问导出版本
    const versionRes = await new Promise(resolve => {
      wx.showActionSheet({
        itemList: ['荷斯坦协会版', '常规版'],
        success: (res) => {
          resolve(res.tapIndex === 0 ? 'holstein' : 'regular')
        },
        fail: () => {
          resolve(null)
        }
      })
    })

    if (!versionRes) return

    // 检查DHI编号（荷斯坦版本必须）
    if (versionRes === 'holstein' && !record.dhiCode) {
      showToast('荷斯坦版本需要DHI编号')
      return
    }

    showLoading('导出中...')

    try {
      const result = await exportRecords([record], versionRes, this.data.currentFarm.farmName)
      hideLoading()
      if (result?.opened) {
        showToast('文件已打开')
      } else if (result?.saved) {
        showToast('文件已保存')
      } else {
        showToast('已导出')
      }

      const platform = wx.getSystemInfoSync?.().platform
      if (platform === 'devtools' && result?.filePath) {
        wx.showModal({
          title: '导出完成',
          content: `已生成 CSV 文件（微信内不支持预览）。\n文件路径：\n${result.filePath}`,
          confirmText: '复制路径',
          cancelText: '知道了',
          success: (res) => {
            if (res.confirm) {
              wx.setClipboardData({ data: result.filePath })
            }
          }
        })
      }
    } catch (err) {
      hideLoading()
      showToast(err.message || '导出失败')
      console.error('导出失败:', err)
    }
  },

  // 编辑记录
  onEditRecord(e) {
    const { record } = e.currentTarget.dataset

    if (!record.canEdit) {
      showToast('无权限编辑此记录')
      return
    }

    // TODO: 实现编辑功能
    showToast('编辑功能开发中')
  },

  // 删除记录
  async onDeleteRecord(e) {
    const { record } = e.currentTarget.dataset

    if (!record.canDelete) {
      showToast('无权限删除此记录')
      return
    }

    const confirm = await showConfirm('确定删除这条评分记录吗？')
    if (!confirm) return

    try {
      // 从离线存储中删除
      let offlineRecords = wx.getStorageSync('offlineScores') || []
      offlineRecords = offlineRecords.filter(r => r.localId !== record.localId)
      wx.setStorageSync('offlineScores', offlineRecords)

      showToast('删除成功')

      // 重新加载记录
      this.loadRecords()

    } catch (err) {
      console.error('删除失败:', err)
      showToast('删除失败')
    }
  },

  // 批量导出
  async onBatchExport() {
    const { displayRecords } = this.data

    if (displayRecords.length === 0) {
      showToast('暂无记录可导出')
      return
    }

    // 询问导出版本
    const versionRes = await new Promise(resolve => {
      wx.showActionSheet({
        itemList: ['荷斯坦协会版', '常规版'],
        success: (res) => {
          resolve(res.tapIndex === 0 ? 'holstein' : 'regular')
        },
        fail: () => {
          resolve(null)
        }
      })
    })

    if (!versionRes) return

    // 检查DHI编号（荷斯坦版本必须）
    if (versionRes === 'holstein') {
      const noDhiRecords = displayRecords.filter(r => !r.dhiCode)
      if (noDhiRecords.length > 0) {
        showToast(`有 ${noDhiRecords.length} 条记录缺少DHI编号`)
        return
      }
    }

    showLoading('导出中...')

    try {
      const result = await exportRecords(displayRecords, versionRes, this.data.currentFarm.farmName)
      hideLoading()

      if (result?.canceled) {
        showToast('已取消')
        return
      }

      if (result?.message) {
        showToast(result.message)
        return
      }

      if (result?.opened) {
        wx.showModal({
          title: '导出成功',
          content: `已导出 ${displayRecords.length} 条记录\n\n文件已打开，可通过右上角菜单分享或保存到手机`,
          confirmText: '知道了',
          showCancel: false
        })
        return
      }

      if (result?.saved) {
        wx.showModal({
          title: '导出成功',
          content: `已导出 ${displayRecords.length} 条记录并保存到本地`,
          confirmText: '知道了',
          showCancel: false
        })
        return
      }

      showToast('导出完成')

      // DevTools 无法分享文件时，提示文件路径便于开发调试
      const platform = wx.getSystemInfoSync?.().platform
      if (platform === 'devtools' && result?.filePath) {
        wx.showModal({
          title: '导出完成',
          content: `已生成 CSV 文件（微信内不支持预览）。\n文件路径：\n${result.filePath}`,
          confirmText: '复制路径',
          cancelText: '知道了',
          success: (res) => {
            if (res.confirm) {
              wx.setClipboardData({ data: result.filePath })
            }
          }
        })
      }
    } catch (err) {
      hideLoading()
      showToast(err.message || '导出失败')
      console.error('批量导出失败:', err)
    }
  },

  // 同步离线数据
  async onSyncOffline() {
    const { stats } = this.data

    if (stats.offline === 0) {
      showToast('暂无待同步数据')
      return
    }

    showLoading('同步中...')

    try {
      // TODO: 实现离线数据同步
      // 这里先模拟同步过程
      await new Promise(resolve => setTimeout(resolve, 2000))

      hideLoading()
      showToast(`成功同步 ${stats.offline} 条记录`)

      // 清空离线记录
      wx.setStorageSync('offlineScores', [])

      // 重新加载
      this.loadRecords()

    } catch (err) {
      hideLoading()
      showToast('同步失败')
      console.error('同步失败:', err)
    }
  }
})
