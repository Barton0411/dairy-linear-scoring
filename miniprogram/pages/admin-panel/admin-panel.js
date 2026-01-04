// pages/admin-panel/admin-panel.js
const { showToast, showLoading, hideLoading, showConfirm } = require('../../utils/util')
const { api } = require('../../utils/request')

Page({
  data: {
    activeTab: 'appraiser',
    isSuperAdmin: false,
    appraisers: [],
    farms: [],
    allFarms: [],
    selectedAppraiser: null,
    selectedAppraiserIndex: 0,
    roleOptions: [
      { value: 'appraiser', label: '普通鉴定员' },
      { value: 'admin', label: '管理员' }
    ],
    showEditModal: false,
    editFormData: {
      farmCode: '',
      farmName: '',
      dhiCode: ''
    },
    originalFarmCode: '', // 用于保存原始站号
    showAppraiserModal: false,
    appraiserFormData: {
      employeeId: '',
      appraiserName: '',
      role: 'appraiser',
      roleIndex: 0,
      roleLabel: '鉴定员',
      isCertified: false,
      isEdit: false
    },
    roleOptions: [
      { value: 'appraiser', label: '鉴定员' },
      { value: 'admin', label: '管理员' },
      { value: 'super_admin', label: '超级管理员' }
    ],
    certOptions: [
      { value: true, label: '奶协认证鉴定员' },
      { value: false, label: '未认证鉴定员' }
    ],
    // 证书审批相关
    pendingApplications: [],
    pendingCertCount: 0,
    showRejectModal: false,
    rejectReason: '',
    rejectingApplicationId: null
  },

  onLoad(options) {
    // 支持通过URL参数切换tab
    if (options.tab) {
      this.setData({ activeTab: options.tab })
    }

    // 验证管理员权限
    const userInfo = wx.getStorageSync('userInfo')
    const role = userInfo?.role
    const hasAdminAccess = role && (role === 'admin' || role === 'super_admin')
    this.hasAdminAccess = hasAdminAccess
    if (!hasAdminAccess) {
      showToast('只有管理员可以访问此页面')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    const isSuperAdminStatus = role === 'super_admin'
    this.setData({ isSuperAdmin: isSuperAdminStatus })
  },

  async onShow() {
    if (!this.hasAdminAccess) {
      return
    }
    this.loadData(() => {
      this.refreshSelectedAppraiser()
    })

    // 加载待审批证书（仅超级管理员）
    if (this.data.isSuperAdmin) {
      await this.loadPendingCertificates()

      // 显示待审批提醒
      if (this.data.pendingCertCount > 0) {
        wx.showToast({
          title: `有 ${this.data.pendingCertCount} 个证书待审批`,
          icon: 'none',
          duration: 2000
        })
      }
    }
  },

  // 加载数据
  async loadData(callback) {
    try {
      showLoading('加载中...')

      // 并行获取鉴定员、牧场、关联关系
      const [appraisers, farms, links] = await Promise.all([
        api.getAppraisers(),
        api.getAllFarms(),
        api.getAppraiserFarmLinks()
      ])

      // 构建鉴定员-牧场关联映射
      this.appraiserFarmLinks = links || []

      // 处理鉴定员数据
      const processedAppraisers = this.processAppraisersData(appraisers, farms, links)

      this.setData({
        appraisers: processedAppraisers,
        farms: farms || [],
        allFarms: farms || []
      }, () => {
        hideLoading()
        if (typeof callback === 'function') {
          callback()
        }
      })

    } catch (err) {
      hideLoading()
      showToast(err.message || '加载数据失败')
      console.error('Load data error:', err)
    }
  },

  // 处理鉴定员数据，添加牧场关联信息
  processAppraisersData(appraisers, farms, links) {
    const farmMap = {}
    farms.forEach(farm => {
      farmMap[farm.farmCode] = farm
    })

    return appraisers.map(appraiser => {
      const farmSummary = this.buildAppraiserFarmSummary(appraiser, farmMap, links)

      return {
        ...appraiser,
        ...farmSummary
      }
    })
  },

  buildAppraiserFarmSummary(appraiser, farmMap, links) {
    const farmCodes = links
      .filter(link => link.employeeId === appraiser.employeeId)
      .map(link => link.farmCode)

    const farmNames = farmCodes
      .map(code => farmMap[code])
      .filter(Boolean)
      .map(farm => farm.farmName)

    const farmsText = farmNames.length > 0
      ? (farmNames.length > 3 ? `${farmNames.slice(0, 3).join(' / ')} / ...` : farmNames.join(' / '))
      : '未分配'

    return {
      farmsText,
      farmsCount: farmNames.length
    }
  },

  refreshSelectedAppraiser() {
    const { selectedAppraiser, appraisers, farms } = this.data
    if (!selectedAppraiser) {
      return
    }

    const index = appraisers.findIndex(appraiser => appraiser.employeeId === selectedAppraiser.employeeId)
    if (index === -1) {
      this.setData({
        selectedAppraiser: null,
        selectedAppraiserIndex: 0
      })
      return
    }

    const linkedFarmCodes = this.appraiserFarmLinks
      .filter(link => link.employeeId === appraisers[index].employeeId)
      .map(link => link.farmCode)

    const nextFarms = farms.map(farm => ({
      ...farm,
      isLinked: linkedFarmCodes.includes(farm.farmCode)
    }))

    this.setData({
      selectedAppraiser: appraisers[index],
      selectedAppraiserIndex: index,
      farms: nextFarms
    })
  },

  // 切换 Tab
  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  // 新建牧场（管理员）
  onCreateFarm() {
    if (!this.hasAdminAccess) {
      showToast('只有管理员可以新建牧场')
      return
    }

    wx.navigateTo({ url: '/pages/farm-create/farm-create' })
  },

  // 牧场管理操作（仅超级管理员）：用 ActionSheet 代替并排按钮，避免拥挤
  onOpenFarmActions(e) {
    if (!this.data.isSuperAdmin) {
      showToast('只有超级管理员可以操作牧场')
      return
    }

    const { farmCode, farmName, dhiCode } = e.currentTarget.dataset
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: async (res) => {
        if (res.tapIndex === 0) {
          this.onEditFarm({ currentTarget: { dataset: { farmCode, farmName, dhiCode } } })
          return
        }
        if (res.tapIndex === 1) {
          await this.onDeleteFarm({ currentTarget: { dataset: { farmCode, farmName } } })
        }
      }
    })
  },

  // 修改鉴定员认证状态（仅超级管理员）
  async onCertChange(e) {
    if (!this.data.isSuperAdmin) {
      showToast('只有超级管理员可以修改认证状态')
      return
    }

    const { employeeId } = e.currentTarget.dataset
    const index = e.detail.value
    const isCertified = this.data.certOptions[index].value

    try {
      showLoading('修改中...')
      await api.updateAppraiser(employeeId, { isCertified })
      hideLoading()
      showToast('认证状态已更新')
      this.loadData()
    } catch (err) {
      hideLoading()
      showToast(err.message || '修改失败')
    }
  },

  // 选择鉴定员（牧场匹配Tab）
  onAppraiserSelect(e) {
    const index = parseInt(e.detail.value)
    const appraiser = this.data.appraisers[index]

    // 获取该鉴定员已关联的牧场
    const linkedFarmCodes = this.appraiserFarmLinks
      .filter(link => link.employeeId === appraiser.employeeId)
      .map(link => link.farmCode)

    // 更新牧场列表的关联状态
    const farms = this.data.farms.map(farm => ({
      ...farm,
      isLinked: linkedFarmCodes.includes(farm.farmCode)
    }))

    this.setData({
      selectedAppraiser: appraiser,
      selectedAppraiserIndex: index,
      farms
    })
  },

  // 切换牧场关联状态
  async onToggleFarmLink(e) {
    const farmCode = e.currentTarget.dataset.farmCode
    const isLinked = e.detail.value
    const { selectedAppraiser } = this.data

    if (!selectedAppraiser) {
      showToast('请先选择鉴定员')
      return
    }

    try {
      showLoading(isLinked ? '关联中...' : '取消关联中...')

      if (isLinked) {
        // 建立关联
        await api.linkAppraiserFarm(selectedAppraiser.employeeId, farmCode)
      } else {
        // 取消关联
        await api.unlinkAppraiserFarm(selectedAppraiser.employeeId, farmCode)
      }

      hideLoading()
      showToast(isLinked ? '已关联' : '已取消关联')

      // 重新加载数据
      this.loadData(() => {
        this.refreshSelectedAppraiser()
      })

    } catch (err) {
      hideLoading()
      showToast(err.message || (isLinked ? '关联失败' : '取消关联失败'))

      // 恢复开关状态
      const farms = this.data.farms.map(farm => {
        if (farm.farmCode === farmCode) {
          return { ...farm, isLinked: !isLinked }
        }
        return farm
      })
      this.setData({ farms })
    }
  },

  // 编辑牧场（仅超级管理员）
  onEditFarm(e) {
    const { farmCode, farmName, dhiCode } = e.currentTarget.dataset

    if (!this.data.isSuperAdmin) {
      showToast('只有超级管理员可以编辑牧场')
      return
    }

    this.setData({
      showEditModal: true,
      editFormData: {
        farmCode: farmCode,
        farmName: farmName,
        dhiCode: dhiCode || ''
      },
      originalFarmCode: farmCode
    })
  },

  // 关闭编辑弹窗
  onCloseEditModal() {
    this.setData({
      showEditModal: false,
      editFormData: {
        farmCode: '',
        farmName: '',
        dhiCode: ''
      },
      originalFarmCode: ''
    })
  },

  // 点击弹窗内容区域时阻止冒泡，防止关闭
  onModalContentTap(e) {
    // 阻止事件冒泡
  },

  // 编辑表单输入变化
  onEditInputChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value

    this.setData({
      [`editFormData.${field}`]: value
    })
  },

  // 确认保存编辑
  async onConfirmEdit() {
    const { farmName, dhiCode } = this.data.editFormData
    const { originalFarmCode } = this.data

    // 验证牧场名称
    if (!farmName || farmName.trim() === '') {
      showToast('请输入牧场名称')
      return
    }

    try {
      showLoading('保存中...')

      await api.updateFarm(originalFarmCode, {
        farmName: farmName.trim(),
        dhiCode: dhiCode.trim() || null
      })

      hideLoading()
      showToast('保存成功')

      // 关闭弹窗
      this.onCloseEditModal()

      // 重新加载数据
      this.loadData()

    } catch (err) {
      hideLoading()
      showToast(err.message || '保存失败')
    }
  },

  // 删除牧场（仅超级管理员）
  async onDeleteFarm(e) {
    const { farmCode, farmName } = e.currentTarget.dataset

    if (!this.data.isSuperAdmin) {
      showToast('只有超级管理员可以删除牧场')
      return
    }

    const confirm = await showConfirm(`确定删除牧场"${farmName}"吗？\n\n删除后将同时移除所有鉴定员对该牧场的访问权限。`)
    if (!confirm) return

    try {
      showLoading('删除中...')

      await api.deleteFarm(farmCode)

      hideLoading()
      showToast('删除成功')

      // 重新加载数据
      this.loadData()

    } catch (err) {
      hideLoading()
      showToast(err.message || '删除失败')
    }
  },

  // === 鉴定员管理功能 ===

  // 鉴定员操作菜单（仅超级管理员）
  onOpenAppraiserActions(e) {
    if (!this.data.isSuperAdmin) {
      showToast('只有超级管理员可以操作鉴定员')
      return
    }

    const { employeeId } = e.currentTarget.dataset
    const appraiser = this.data.appraisers.find(a => a.employeeId === employeeId)

    if (!appraiser) return

    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: async (res) => {
        if (res.tapIndex === 0) {
          this.onEditAppraiser({ currentTarget: { dataset: { employeeId } } })
          return
        }
        if (res.tapIndex === 1) {
          await this.onDeleteAppraiser({ currentTarget: { dataset: { employeeId } } })
        }
      }
    })
  },

  // 添加鉴定员
  // 根据role值获取roleIndex和roleLabel
  getRoleInfo(roleValue) {
    const role = roleValue || 'appraiser'
    const roleIndex = this.data.roleOptions.findIndex(opt => opt.value === role)
    const roleLabel = this.data.roleOptions[roleIndex >= 0 ? roleIndex : 0].label
    return { roleIndex: roleIndex >= 0 ? roleIndex : 0, roleLabel, role }
  },

  onAddAppraiser() {
    if (!this.data.isSuperAdmin) {
      showToast('只有超级管理员可以添加鉴定员')
      return
    }

    const roleInfo = this.getRoleInfo('appraiser')

    this.setData({
      showAppraiserModal: true,
      appraiserFormData: {
        employeeId: '',
        appraiserName: '',
        role: roleInfo.role,
        roleIndex: roleInfo.roleIndex,
        roleLabel: roleInfo.roleLabel,
        isCertified: false,
        isEdit: false
      }
    })
  },

  // 编辑鉴定员
  onEditAppraiser(e) {
    if (!this.data.isSuperAdmin) {
      showToast('只有超级管理员可以编辑鉴定员')
      return
    }

    const { employeeId } = e.currentTarget.dataset
    const appraiser = this.data.appraisers.find(a => a.employeeId === employeeId)

    if (!appraiser) return

    const roleInfo = this.getRoleInfo(appraiser.role)

    this.setData({
      showAppraiserModal: true,
      appraiserFormData: {
        employeeId: appraiser.employeeId,
        appraiserName: appraiser.appraiserName,
        role: roleInfo.role,
        roleIndex: roleInfo.roleIndex,
        roleLabel: roleInfo.roleLabel,
        isCertified: appraiser.isCertified,
        isEdit: true
      }
    })
  },

  // 删除鉴定员
  async onDeleteAppraiser(e) {
    if (!this.data.isSuperAdmin) {
      showToast('只有超级管理员可以删除鉴定员')
      return
    }

    const { employeeId } = e.currentTarget.dataset

    if (employeeId === '10075345') {
      showToast('不能删除超级管理员')
      return
    }

    // 直接提示删除账号，保留数据
    const confirmed = await showConfirm(
      '确认删除',
      '将删除该鉴定员账号，但保留其历史评分记录，是否继续？'
    )

    if (!confirmed) return

    try {
      showLoading('删除中...')
      await api.deleteAppraiser(employeeId, { keepRecords: true })
      hideLoading()
      showToast('鉴定员已删除，历史记录已保留')
      this.loadData()
    } catch (err) {
      hideLoading()
      showToast(err.message || '删除失败')
    }
  },

  // 鉴定员表单输入
  onAppraiserInputChange(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail

    this.setData({
      [`appraiserFormData.${field}`]: value
    })
  },

  // 角色变更
  onRoleChange(e) {
    const index = e.detail.value
    const roleOption = this.data.roleOptions[index]

    this.setData({
      'appraiserFormData.role': roleOption.value,
      'appraiserFormData.roleIndex': index,
      'appraiserFormData.roleLabel': roleOption.label
    })
  },

  // 认证状态变更
  onCertChange(e) {
    const index = e.detail.value
    const isCertified = this.data.certOptions[index].value

    this.setData({
      'appraiserFormData.isCertified': isCertified
    })
  },

  // 关闭鉴定员弹窗
  onCloseAppraiserModal() {
    this.setData({ showAppraiserModal: false })
  },

  // 阻止冒泡
  stopPropagation() {},

  // 确认保存鉴定员
  async onConfirmAppraiser() {
    const { employeeId, appraiserName, role, isCertified, isEdit } = this.data.appraiserFormData

    // 验证
    if (!employeeId || !employeeId.trim()) {
      showToast('请输入工号')
      return
    }

    if (!appraiserName || !appraiserName.trim()) {
      showToast('请输入姓名')
      return
    }

    try {
      showLoading(isEdit ? '保存中...' : '添加中...')

      if (isEdit) {
        // 编辑
        await api.updateAppraiser(employeeId, {
          appraiserName: appraiserName.trim(),
          role,
          isCertified
        })
      } else {
        // 添加
        await api.createAppraiser({
          employeeId: employeeId.trim(),
          appraiserName: appraiserName.trim(),
          role,
          isCertified
        })
      }

      hideLoading()
      showToast(isEdit ? '保存成功' : '添加成功')
      this.setData({ showAppraiserModal: false })
      this.loadData()

    } catch (err) {
      hideLoading()
      showToast(err.message || (isEdit ? '保存失败' : '添加失败'))
    }
  },

  // 证书审批相关方法

  // 加载待审批证书列表
  async loadPendingCertificates() {
    if (!this.data.isSuperAdmin) return

    try {
      const res = await api.getPendingCertificates()
      this.setData({
        pendingApplications: res.applications || [],
        pendingCertCount: res.total || 0
      })
    } catch (err) {
      console.error('加载待审批证书失败:', err)
    }
  },

  // 预览证书
  onPreviewCert(e) {
    const { url } = e.currentTarget.dataset
    wx.previewImage({ urls: [url], current: url })
  },

  // 通过审批
  async onApproveCert(e) {
    const { applicationId } = e.currentTarget.dataset

    const confirm = await showConfirm('确认通过该证书吗？')
    if (!confirm) return

    try {
      showLoading('审批中...')
      await api.reviewCertificate(applicationId, 'approve')
      hideLoading()
      showToast('审批通过')

      this.loadPendingCertificates()
      this.loadData()  // 刷新鉴定员列表
    } catch (err) {
      hideLoading()
      showToast(err.message || '审批失败')
    }
  },

  // 拒绝审批
  onRejectCert(e) {
    const { applicationId } = e.currentTarget.dataset
    this.setData({
      showRejectModal: true,
      rejectingApplicationId: applicationId,
      rejectReason: ''
    })
  },

  // 拒绝原因输入
  onRejectReasonInput(e) {
    this.setData({ rejectReason: e.detail.value })
  },

  // 关闭拒绝弹窗
  onCloseRejectModal() {
    this.setData({
      showRejectModal: false,
      rejectingApplicationId: null,
      rejectReason: ''
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，仅用于阻止事件冒泡
  },

  // 确认拒绝
  async onConfirmReject() {
    if (!this.data.rejectReason.trim()) {
      showToast('请输入拒绝原因')
      return
    }

    try {
      showLoading('审批中...')
      await api.reviewCertificate(
        this.data.rejectingApplicationId,
        'reject',
        this.data.rejectReason
      )
      hideLoading()
      showToast('已拒绝')

      this.onCloseRejectModal()
      this.loadPendingCertificates()
    } catch (err) {
      hideLoading()
      showToast(err.message || '拒绝失败')
    }
  },

  // 查看鉴定员证书（点击认证徽章）
  async onViewAppraiserCert(e) {
    e.stopPropagation()

    const { employeeId, isCertified } = e.currentTarget.dataset

    if (!isCertified) {
      showToast('该鉴定员暂未通过认证')
      return
    }

    try {
      const res = await api.getAppraiserCertificate(employeeId)
      if (res.application?.ossUrl) {
        wx.previewImage({
          urls: [res.application.ossUrl],
          current: res.application.ossUrl
        })
      } else {
        showToast('暂无证书信息')
      }
    } catch (err) {
      showToast('获取证书失败')
    }
  }
})
