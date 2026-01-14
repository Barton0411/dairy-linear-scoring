// utils/mockData.js - 前端 Mock 数据（用于独立开发测试）

// 牧场数据
const MOCK_FARMS = [
  {
    farmCode: 'YQN001',
    farmName: '大明牧场',
    dhiCode: 'DHI001'
  },
  {
    farmCode: 'YQN002',
    farmName: '光明牧场',
    dhiCode: 'DHI002'
  },
  {
    farmCode: 'YQN003',
    farmName: '新希望牧场',
    dhiCode: null  // DHI编号为空的情况
  },
  {
    farmCode: 'YQN004',
    farmName: '测试牧场',
    dhiCode: 'DHI004'
  }
]

// 鉴定员数据
const MOCK_APPRAISERS = [
  {
    employeeId: 'A001',
    appraiserName: '张三',
    isCertified: 1,
    role: 'appraiser' // appraiser | admin | super_admin
  },
  {
    employeeId: 'A002',
    appraiserName: '李四',
    isCertified: 1,
    role: 'appraiser'
  },
  {
    employeeId: 'A003',
    appraiserName: '王五',
    isCertified: 0,
    role: 'appraiser'
  },
  {
    employeeId: '10075345',
    appraiserName: '管理员',
    isCertified: 1,
    role: 'super_admin' // 超级管理员
  }
]

// 鉴定员-牧场关联关系
const MOCK_APPRAISER_FARMS = [
  { employeeId: 'A001', farmCode: 'YQN001' },
  { employeeId: 'A001', farmCode: 'YQN002' },
  { employeeId: 'A002', farmCode: 'YQN001' },
  { employeeId: 'A003', farmCode: 'YQN003' },
  { employeeId: '10075345', farmCode: 'YQN001' },
  { employeeId: '10075345', farmCode: 'YQN002' },
  { employeeId: '10075345', farmCode: 'YQN003' },
  { employeeId: '10075345', farmCode: 'YQN004' }
]

/**
 * 验证鉴定员登录（工号+姓名匹配）
 */
function validateAppraiser(employeeId, appraiserName) {
  const appraiser = MOCK_APPRAISERS.find(
    a => a.employeeId === employeeId && a.appraiserName === appraiserName
  )
  return appraiser || null
}

/**
 * 获取鉴定员可访问的牧场列表
 */
function getAppraiserFarms(employeeId) {
  const farmCodes = MOCK_APPRAISER_FARMS
    .filter(af => af.employeeId === employeeId)
    .map(af => af.farmCode)

  return MOCK_FARMS.filter(f => farmCodes.includes(f.farmCode))
}

/**
 * 根据farm_code获取牧场详情
 */
function getFarmByCode(farmCode) {
  return MOCK_FARMS.find(f => f.farmCode === farmCode) || null
}

/**
 * 获取鉴定员角色
 */
function getAppraiserRole(employeeId) {
  const appraiser = MOCK_APPRAISERS.find(a => a.employeeId === employeeId)
  return appraiser ? appraiser.role : 'appraiser'
}

/**
 * 检查是否为管理员（包括普通管理员和超级管理员）
 */
function isAdmin(employeeId) {
  const role = getAppraiserRole(employeeId)
  return role === 'admin' || role === 'super_admin'
}

/**
 * 检查是否为超级管理员
 */
function isSuperAdmin(employeeId) {
  return getAppraiserRole(employeeId) === 'super_admin'
}

/**
 * 设置鉴定员角色（仅超级管理员可用）
 */
function setAppraiserRole(employeeId, role) {
  const appraiser = MOCK_APPRAISERS.find(a => a.employeeId === employeeId)
  if (!appraiser) {
    return { success: false, message: '鉴定员不存在' }
  }

  // 不能修改超级管理员的角色
  if (appraiser.role === 'super_admin') {
    return { success: false, message: '不能修改超级管理员的权限' }
  }

  appraiser.role = role
  return { success: true, data: appraiser }
}

/**
 * 获取所有牧场（仅管理员）
 */
function getAllFarms() {
  return MOCK_FARMS
}

/**
 * 获取所有鉴定员（仅管理员）
 */
function getAllAppraisers() {
  return MOCK_APPRAISERS
}

/**
 * 添加牧场（管理员功能）
 */
function addFarm(farm) {
  // 检查farm_code是否已存在
  if (MOCK_FARMS.find(f => f.farmCode === farm.farmCode)) {
    return { success: false, message: '牧场站号已存在' }
  }
  // 检查dhi_code是否已存在
  if (farm.dhiCode && MOCK_FARMS.find(f => f.dhiCode === farm.dhiCode)) {
    return { success: false, message: 'DHI编号已存在' }
  }

  MOCK_FARMS.push(farm)
  return { success: true, data: farm }
}

/**
 * 更新牧场DHI编号
 */
function updateFarmDhiCode(farmCode, dhiCode) {
  const farm = MOCK_FARMS.find(f => f.farmCode === farmCode)
  if (!farm) {
    return { success: false, message: '牧场不存在' }
  }

  // 检查dhi_code是否被其他牧场使用
  if (dhiCode && MOCK_FARMS.find(f => f.farmCode !== farmCode && f.dhiCode === dhiCode)) {
    return { success: false, message: 'DHI编号已被其他牧场使用' }
  }

  farm.dhiCode = dhiCode
  return { success: true, data: farm }
}

/**
 * 更新牧场信息
 */
function updateFarm(farmCode, updates) {
  const farm = MOCK_FARMS.find(f => f.farmCode === farmCode)
  if (!farm) {
    return { success: false, message: '牧场不存在' }
  }

  // 如果更新了牧场名称，检查是否为空
  if (updates.farmName !== undefined) {
    if (!updates.farmName || updates.farmName.trim() === '') {
      return { success: false, message: '牧场名称不能为空' }
    }
    farm.farmName = updates.farmName.trim()
  }

  // 如果更新了站号，检查是否已存在
  if (updates.farmCode !== undefined && updates.farmCode !== farmCode) {
    if (MOCK_FARMS.find(f => f.farmCode === updates.farmCode)) {
      return { success: false, message: '站号已存在' }
    }
    farm.farmCode = updates.farmCode
  }

  // 如果更新了DHI编号，检查是否被其他牧场使用
  if (updates.dhiCode !== undefined) {
    if (updates.dhiCode && MOCK_FARMS.find(f => f.farmCode !== farmCode && f.dhiCode === updates.dhiCode)) {
      return { success: false, message: 'DHI编号已被其他牧场使用' }
    }
    farm.dhiCode = updates.dhiCode || null
  }

  return { success: true, data: farm }
}

/**
 * 删除牧场（仅超级管理员）
 */
function deleteFarm(farmCode) {
  const index = MOCK_FARMS.findIndex(f => f.farmCode === farmCode)
  if (index === -1) {
    return { success: false, message: '牧场不存在' }
  }

  // 删除牧场
  MOCK_FARMS.splice(index, 1)

  // 同时删除所有相关的鉴定员-牧场关联
  for (let i = MOCK_APPRAISER_FARMS.length - 1; i >= 0; i--) {
    if (MOCK_APPRAISER_FARMS[i].farmCode === farmCode) {
      MOCK_APPRAISER_FARMS.splice(i, 1)
    }
  }

  return { success: true }
}

/**
 * 添加鉴定员（管理员功能）
 */
function addAppraiser(appraiser) {
  if (MOCK_APPRAISERS.find(a => a.employeeId === appraiser.employeeId)) {
    return { success: false, message: '工号已存在' }
  }

  MOCK_APPRAISERS.push(appraiser)
  return { success: true, data: appraiser }
}

/**
 * 关联鉴定员和牧场（管理员功能）
 */
function linkAppraiserFarm(employeeId, farmCode) {
  // 检查是否已关联
  if (MOCK_APPRAISER_FARMS.find(af => af.employeeId === employeeId && af.farmCode === farmCode)) {
    return { success: false, message: '已关联' }
  }

  MOCK_APPRAISER_FARMS.push({ employeeId, farmCode })
  return { success: true }
}

/**
 * 取消关联鉴定员和牧场（管理员功能）
 */
function unlinkAppraiserFarm(employeeId, farmCode) {
  const index = MOCK_APPRAISER_FARMS.findIndex(
    af => af.employeeId === employeeId && af.farmCode === farmCode
  )

  if (index === -1) {
    return { success: false, message: '关联不存在' }
  }

  MOCK_APPRAISER_FARMS.splice(index, 1)
  return { success: true }
}

/**
 * 更新鉴定员认证状态（管理员功能）
 */
function updateAppraiserCertification(employeeId, isCertified, certificateUrl = null) {
  const appraiser = MOCK_APPRAISERS.find(a => a.employeeId === employeeId)
  if (!appraiser) {
    return { success: false, message: '鉴定员不存在' }
  }

  appraiser.isCertified = isCertified
  if (certificateUrl) {
    appraiser.certificateUrl = certificateUrl
  }

  return { success: true, data: appraiser }
}

module.exports = {
  MOCK_FARMS,
  MOCK_APPRAISERS,
  MOCK_APPRAISER_FARMS,
  validateAppraiser,
  getAppraiserFarms,
  getFarmByCode,
  getAppraiserRole,
  isAdmin,
  isSuperAdmin,
  setAppraiserRole,
  getAllFarms,
  getAllAppraisers,
  addFarm,
  updateFarm,
  updateFarmDhiCode,
  deleteFarm,
  addAppraiser,
  linkAppraiserFarm,
  unlinkAppraiserFarm,
  updateAppraiserCertification
}
