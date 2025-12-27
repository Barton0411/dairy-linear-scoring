// store/index.js - MobX 状态管理
const { observable, action } = require('mobx-miniprogram')

// 评分性状配置
const TRAITS = {
  // 体躯容量 (18%)
  body: {
    name: '体躯容量',
    weight: 0.18,
    traits: [
      { key: 'tg', name: '体高', low: '矮小', high: '高大' },
      { key: 'xk', name: '胸宽', low: '窄', high: '宽' },
      { key: 'ts', name: '体深', low: '浅', high: '深' },
      { key: 'yqd', name: '腰强度', low: '弱', high: '强' }
    ]
  },
  // 尻部 (10%)
  rump: {
    name: '尻部',
    weight: 0.10,
    traits: [
      { key: 'kjd', name: '尻角度', low: '高尻', high: '低尻' },
      { key: 'kk', name: '尻宽', low: '窄', high: '宽' }
    ]
  },
  // 肢蹄 (26%)
  feet_legs: {
    name: '肢蹄',
    weight: 0.26,
    traits: [
      { key: 'tjd', name: '蹄角度', low: '低', high: '高' },
      { key: 'tgsd', name: '蹄踵深度', low: '浅', high: '深' },
      { key: 'gzd', name: '骨质地', low: '粗糙', high: '平滑' },
      { key: 'hzcs', name: '后肢侧视', low: '直', high: '弯曲' },
      { key: 'hzhs', name: '后肢后视', low: '外八', high: '内八' }
    ]
  },
  // 泌乳系统 (32%)
  udder: {
    name: '泌乳系统',
    weight: 0.32,
    traits: [
      { key: 'rfsd', name: '乳房深度', low: '深垂', high: '高悬' },
      { key: 'zyxrd', name: '中央悬韧带', low: '弱', high: '强' },
      { key: 'qrffz', name: '前乳房附着', low: '松弛', high: '紧密' },
      { key: 'qrtwz', name: '前乳头位置', low: '外侧', high: '内侧' },
      { key: 'qrtcd', name: '前乳头长度', low: '短', high: '长' },
      { key: 'hrffzgd', name: '后乳房附着高度', low: '低', high: '高' },
      { key: 'hrffzkd', name: '后乳房附着宽度', low: '窄', high: '宽' },
      { key: 'hrtwz', name: '后乳头位置', low: '外侧', high: '内侧' }
    ]
  },
  // 乳用特征 (14%)
  dairy: {
    name: '乳用特征',
    weight: 0.14,
    traits: [
      { key: 'ljx', name: '棱角性', low: '粗糙', high: '棱角分明' }
    ]
  }
}

// 所有性状的扁平列表
const ALL_TRAITS = Object.values(TRAITS).flatMap(cat => cat.traits)

// 获取默认分数对象
function getDefaultScores(defaultValue = 5) {
  const scores = {}
  ALL_TRAITS.forEach(t => {
    scores[t.key] = defaultValue
  })
  return scores
}

// 计算功能分（线性分转功能分）
function linearToFunctional(linearScore) {
  // 根据 GB/T 35568-2017 附录F的转换关系
  // 线性分1-9对应功能分50-100的非线性映射
  const mapping = {
    1: 50, 2: 57, 3: 64, 4: 71, 5: 78,
    6: 85, 7: 89, 8: 93, 9: 100
  }
  return mapping[Math.round(linearScore)] || 78
}

// 计算总分和等级
function calculateTotalScore(scores) {
  let totalWeightedScore = 0
  let totalWeight = 0

  Object.entries(TRAITS).forEach(([, category]) => {
    let categorySum = 0
    category.traits.forEach(trait => {
      const linearScore = scores[trait.key] || 5
      const functionalScore = linearToFunctional(linearScore)
      categorySum += functionalScore
    })
    const categoryAvg = categorySum / category.traits.length
    totalWeightedScore += categoryAvg * category.weight
    totalWeight += category.weight
  })

  const finalScore = Math.round(totalWeightedScore / totalWeight)

  // 确定等级
  let grade = 'F'
  if (finalScore >= 90) grade = 'Ex'
  else if (finalScore >= 85) grade = 'VG'
  else if (finalScore >= 80) grade = 'GP'
  else if (finalScore >= 75) grade = 'G'
  else if (finalScore >= 65) grade = 'F'
  else grade = 'P'

  return { score: finalScore, grade }
}

const store = observable({
  // 用户信息
  userInfo: null,

  // 当前牧场
  currentFarm: null,

  // 用户关联的牧场列表
  farms: [],

  // 当前评分数据
  currentScoring: {
    earTag: '',
    mode: 'normal', // normal | defect
    scores: getDefaultScores(5),
    photos: [],
    startTime: null
  },

  // 设置 - 各性状单独设置默认分
  settings: {
    defaultScores: {
      tg: 5, xk: 5, ts: 5, yqd: 5,           // 体躯容量
      kjd: 5, kk: 5,                          // 尻部
      tjd: 5, tgsd: 5, gzd: 5, hzcs: 5, hzhs: 5, // 肢蹄
      rfsd: 5, zyxrd: 5, qrffz: 5, qrtwz: 5, qrtcd: 5, hrffzgd: 5, hrffzkd: 5, hrtwz: 5, // 泌乳系统
      ljx: 5                                   // 乳用特征
    },
    photoPromptExcellent: false,
    photoPromptPoor: true,
    maxPhotos: 5
  },

  // 离线待同步数据数量
  pendingSyncCount: 0,

  // 计算属性
  get isLoggedIn() {
    return !!this.userInfo
  },

  get totalScore() {
    return calculateTotalScore(this.currentScoring.scores)
  },

  // Actions
  setUserInfo: action(function(userInfo) {
    this.userInfo = userInfo
  }),

  setCurrentFarm: action(function(farm) {
    this.currentFarm = farm
    wx.setStorageSync('currentFarm', farm)
  }),

  setFarms: action(function(farms) {
    this.farms = farms
  }),

  logout: action(function() {
    this.userInfo = null
    this.currentFarm = null
    this.farms = []
  }),

  // 评分相关
  startNewScoring: action(function(earTag, mode = 'normal') {
    // 使用各性状的独立默认分
    const scores = { ...this.settings.defaultScores }
    this.currentScoring = {
      earTag,
      mode,
      scores,
      photos: [],
      startTime: Date.now()
    }
  }),

  updateScore: action(function(key, value) {
    this.currentScoring.scores[key] = value
  }),

  addPhoto: action(function(photoPath) {
    if (this.currentScoring.photos.length < this.settings.maxPhotos) {
      this.currentScoring.photos.push({
        localPath: photoPath,
        uploaded: false,
        localId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })
    }
  }),

  removePhoto: action(function(index) {
    this.currentScoring.photos.splice(index, 1)
  }),

  resetScoring: action(function() {
    this.currentScoring = {
      earTag: '',
      mode: 'normal',
      scores: getDefaultScores(5),
      photos: [],
      startTime: null
    }
  }),

  // 设置相关
  updateSettings: action(function(newSettings) {
    Object.assign(this.settings, newSettings)
    wx.setStorageSync('settings', this.settings)
  }),

  loadSettings: action(function() {
    const saved = wx.getStorageSync('settings')
    if (saved) {
      Object.assign(this.settings, saved)
    }
  }),

  // 同步状态
  updatePendingSyncCount: action(function() {
    const offlineScores = wx.getStorageSync('offlineScores') || []
    const offlinePhotos = wx.getStorageSync('offlinePhotos') || []
    this.pendingSyncCount = offlineScores.length + offlinePhotos.length
  })
})

module.exports = {
  store,
  TRAITS,
  ALL_TRAITS,
  getDefaultScores,
  calculateTotalScore
}
