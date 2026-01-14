// store/index.js - MobX 状态管理
const { observable, action } = require('mobx-miniprogram')

// 各性状的最优值配置
const OPTIMAL_SCORES = {
  tg: 8,       // 体高
  xk: 9,       // 胸宽
  ts: 7,       // 体深
  yqd: 9,      // 腰强度
  kjd: 5,      // 尻角度
  kk: 9,       // 尻宽
  tjd: 7,      // 蹄角度
  tgsd: 9,     // 蹄踵深度
  gzd: 9,      // 骨质地
  hzcs: 5,     // 后肢侧视
  hzhs: 9,     // 后肢后视
  rfsd: 5,     // 乳房深度
  zyxrd: 9,    // 中央悬韧带
  qrffz: 9,    // 前乳房附着
  qrtwz: 6,    // 前乳头位置
  qrtcd: 5,    // 前乳头长度
  hrffzgd: 9,  // 后乳房附着高度
  hrffzkd: 9,  // 后乳房附着宽度
  hrtwz: 6,    // 后乳头位置
  ljx: 9       // 棱角性
}

// 评分性状配置 (根据 GB/T 35568-2017 附录F)
const TRAITS = {
  // 体躯容量 (18%)
  body: {
    name: '体躯容量',
    weight: 0.18,
    traits: [
      { key: 'tg', name: '体高', low: '矮小', high: '高大', weight: 0.25 },
      { key: 'xk', name: '胸宽', low: '窄', high: '宽', weight: 0.35 },
      { key: 'ts', name: '体深', low: '浅', high: '深', weight: 0.25 },
      { key: 'yqd', name: '腰强度', low: '弱', high: '强', weight: 0.15 }
    ]
  },
  // 尻部 (10%)
  rump: {
    name: '尻部',
    weight: 0.10,
    traits: [
      { key: 'kjd', name: '尻角度', low: '高尻', high: '低尻', weight: 0.40 },
      { key: 'kk', name: '尻宽', low: '窄', high: '宽', weight: 0.45 },
      { key: 'yqd', name: '腰强度', low: '弱', high: '强', weight: 0.15 }  // 复用
    ]
  },
  // 肢蹄 (20%)
  feet_legs: {
    name: '肢蹄',
    weight: 0.20,
    traits: [
      { key: 'tjd', name: '蹄角度', low: '低', high: '高', weight: 0.25 },
      { key: 'tgsd', name: '蹄踵深度', low: '浅', high: '深', weight: 0.15 },
      { key: 'gzd', name: '骨质地', low: '粗糙', high: '平滑', weight: 0.15 },
      { key: 'hzcs', name: '后肢侧视', low: '直', high: '弯曲', weight: 0.25 },
      { key: 'hzhs', name: '后肢后视', low: '外八', high: '内八', weight: 0.20 }
    ]
  },
  // 泌乳系统 (42%) - 三层结构
  udder: {
    name: '泌乳系统',
    weight: 0.42,
    subCategories: {
      // 乳房形态 (20%)
      udder_shape: {
        name: '乳房形态',
        weight: 0.20,
        traits: [
          { key: 'rfsd', name: '乳房深度', low: '深垂', high: '高悬', weight: 0.55 },
          { key: 'zyxrd', name: '中央悬韧带', low: '弱', high: '强', weight: 0.45 }
        ]
      },
      // 前乳房 (35%)
      front_udder: {
        name: '前乳房',
        weight: 0.35,
        traits: [
          { key: 'qrffz', name: '前乳房附着', low: '松弛', high: '紧密', weight: 0.45 },
          { key: 'qrtwz', name: '前乳头位置', low: '外侧', high: '内侧', weight: 0.25 },
          { key: 'qrtcd', name: '前乳头长度', low: '短', high: '长', weight: 0.18 },
          { key: 'rfsd', name: '乳房深度', low: '深垂', high: '高悬', weight: 0.12 }  // 复用
        ]
      },
      // 后乳房 (45%)
      rear_udder: {
        name: '后乳房',
        weight: 0.45,
        traits: [
          { key: 'hrffzgd', name: '后乳房附着高度', low: '低', high: '高', weight: 0.30 },
          { key: 'hrffzkd', name: '后乳房附着宽度', low: '窄', high: '宽', weight: 0.30 },
          { key: 'hrtwz', name: '后乳头位置', low: '外侧', high: '内侧', weight: 0.14 },
          { key: 'rfsd', name: '乳房深度', low: '深垂', high: '高悬', weight: 0.12 },  // 复用
          { key: 'zyxrd', name: '中央悬韧带', low: '弱', high: '强', weight: 0.14 }  // 复用
        ]
      }
    }
  },
  // 乳用特征 (10%)
  dairy: {
    name: '乳用特征',
    weight: 0.10,
    traits: [
      { key: 'ljx', name: '棱角性', low: '粗糙', high: '棱角分明', weight: 0.80 },
      { key: 'gzd', name: '骨质地', low: '粗糙', high: '平滑', weight: 0.20 }  // 复用
    ]
  }
}

// 所有性状的扁平列表（去重）
const ALL_TRAITS = []
const addedKeys = new Set()

Object.values(TRAITS).forEach(cat => {
  if (cat.subCategories) {
    // 处理有子类别的情况（泌乳系统）
    Object.values(cat.subCategories).forEach(subCat => {
      subCat.traits.forEach(trait => {
        if (!addedKeys.has(trait.key)) {
          ALL_TRAITS.push(trait)
          addedKeys.add(trait.key)
        }
      })
    })
  } else {
    // 处理普通类别
    cat.traits.forEach(trait => {
      if (!addedKeys.has(trait.key)) {
        ALL_TRAITS.push(trait)
        addedKeys.add(trait.key)
      }
    })
  }
})

// 获取默认分数对象
function getDefaultScores(defaultValue = 5) {
  const scores = {}
  ALL_TRAITS.forEach(t => {
    scores[t.key] = defaultValue
  })
  return scores
}

// 计算功能分（线性分转功能分）- 根据 GB/T 35568-2017 附录E 表E.1
function linearToFunctional(traitKey, linearScore) {
  const score = Math.round(linearScore)

  // 每个性状的线性分到功能分映射表
  const mappings = {
    // 体躯容量
    tg: { 1: 57, 2: 64, 3: 70, 4: 75, 5: 85, 6: 90, 7: 95, 8: 100, 9: 95 },
    xk: { 1: 55, 2: 60, 3: 65, 4: 70, 5: 75, 6: 80, 7: 85, 8: 90, 9: 95 },
    ts: { 1: 56, 2: 64, 3: 68, 4: 75, 5: 80, 6: 90, 7: 95, 8: 90, 9: 85 },
    yqd: { 1: 55, 2: 60, 3: 65, 4: 70, 5: 75, 6: 80, 7: 85, 8: 90, 9: 95 },
    // 尻部
    kjd: { 1: 55, 2: 62, 3: 70, 4: 80, 5: 90, 6: 80, 7: 75, 8: 70, 9: 65 },
    kk: { 1: 55, 2: 60, 3: 65, 4: 70, 5: 75, 6: 79, 7: 82, 8: 90, 9: 95 },
    // 肢蹄
    tjd: { 1: 56, 2: 64, 3: 70, 4: 76, 5: 81, 6: 90, 7: 100, 8: 95, 9: 85 },
    tgsd: { 1: 57, 2: 64, 3: 69, 4: 75, 5: 80, 6: 85, 7: 90, 8: 95, 9: 100 },
    gzd: { 1: 57, 2: 64, 3: 69, 4: 75, 5: 80, 6: 85, 7: 90, 8: 95, 9: 100 },
    hzcs: { 1: 55, 2: 64, 3: 75, 4: 80, 5: 95, 6: 80, 7: 75, 8: 65, 9: 55 },
    hzhs: { 1: 57, 2: 64, 3: 69, 4: 74, 5: 78, 6: 81, 7: 85, 8: 90, 9: 100 },
    // 泌乳系统
    rfsd: { 1: 55, 2: 65, 3: 75, 4: 85, 5: 95, 6: 85, 7: 75, 8: 65, 9: 55 },
    zyxrd: { 1: 55, 2: 60, 3: 65, 4: 70, 5: 75, 6: 80, 7: 85, 8: 90, 9: 95 },
    qrffz: { 1: 55, 2: 60, 3: 65, 4: 70, 5: 75, 6: 80, 7: 85, 8: 90, 9: 95 },
    qrtwz: { 1: 57, 2: 65, 3: 75, 4: 80, 5: 85, 6: 90, 7: 85, 8: 80, 9: 75 },
    qrtcd: { 1: 50, 2: 60, 3: 70, 4: 80, 5: 90, 6: 80, 7: 70, 8: 60, 9: 50 },
    hrffzgd: { 1: 58, 2: 65, 3: 68, 4: 70, 5: 75, 6: 80, 7: 85, 8: 90, 9: 95 },
    hrffzkd: { 1: 58, 2: 65, 3: 68, 4: 70, 5: 75, 6: 80, 7: 85, 8: 90, 9: 95 },
    hrtwz: { 1: 57, 2: 65, 3: 75, 4: 80, 5: 85, 6: 90, 7: 85, 8: 80, 9: 75 },
    // 乳用特征
    ljx: { 1: 57, 2: 64, 3: 69, 4: 74, 5: 78, 6: 81, 7: 85, 8: 90, 9: 95 }
  }

  return mappings[traitKey]?.[score] || 78
}

// 计算总分和等级 - 根据 GB/T 35568-2017
function calculateTotalScore(scores) {
  let totalWeightedScore = 0

  Object.entries(TRAITS).forEach(([, category]) => {
    if (category.subCategories) {
      // 处理有子类别的情况（泌乳系统）
      let categoryWeightedScore = 0

      Object.values(category.subCategories).forEach(subCat => {
        let subCatWeightedScore = 0

        subCat.traits.forEach(trait => {
          const linearScore = scores[trait.key] || 5
          const functionalScore = linearToFunctional(trait.key, linearScore)
          // 在子类别内加权
          subCatWeightedScore += functionalScore * trait.weight
        })

        // 子类别分数加权到类别
        categoryWeightedScore += subCatWeightedScore * subCat.weight
      })

      // 类别分数加权到总分
      totalWeightedScore += categoryWeightedScore * category.weight
    } else {
      // 处理普通类别
      let categoryWeightedScore = 0

      category.traits.forEach(trait => {
        const linearScore = scores[trait.key] || 5
        const functionalScore = linearToFunctional(trait.key, linearScore)
        // 在类别内加权
        categoryWeightedScore += functionalScore * trait.weight
      })

      // 类别分数加权到总分
      totalWeightedScore += categoryWeightedScore * category.weight
    }
  })

  const finalScore = Math.round(totalWeightedScore)

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
    parity: null,           // 胎次
    mode: 'unified', // unified (legacy: normal | defect)
    scores: getDefaultScores(5),
    impressionScore: null,  // 印象分
    udderFullness: '',      // 乳房空满
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
    defaultImpressionScore: 85,  // 印象分默认值 (50-100分)
    defaultUdderFullness: '空',   // 乳房空满默认值（仅：空/满）
    photoMode: 'always',         // 拍照模式: 'always'-总是询问, 'threshold'-根据阈值, 'never'-从不拍照
    photoPromptExcellent: false, // 高分提醒（≥自定义阈值）- 仅在photoMode='threshold'时有效
    photoPromptPoor: true,       // 低分提醒（≤自定义阈值）- 仅在photoMode='threshold'时有效
    photoThresholdExcellent: 85, // 高分拍照阈值
    photoThresholdPoor: 65,      // 低分拍照阈值
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
  startNewScoring: action(function(earTag, modeOrParity = null, maybeParity = null) {
    // 兼容旧签名：(earTag, mode, parity) 与新签名：(earTag, parity)
    let parity = maybeParity
    if (typeof modeOrParity === 'number') {
      parity = modeOrParity
    } else if (typeof modeOrParity === 'string') {
      parity = maybeParity
    } else if (modeOrParity === null || modeOrParity === undefined) {
      parity = maybeParity
    }

    // 使用各性状的独立默认分
    const scores = { ...this.settings.defaultScores }
    this.currentScoring = {
      earTag,
      parity,
      mode: 'unified',
      scores,
      impressionScore: this.settings.defaultImpressionScore,
      udderFullness: this.settings.defaultUdderFullness || '空',
      photos: [],
      startTime: Date.now()
    }
  }),

  updateScore: action(function(key, value) {
    // 创建新对象以触发响应式更新
    this.currentScoring.scores = {
      ...this.currentScoring.scores,
      [key]: value
    }
  }),

  updateImpressionScore: action(function(value) {
    this.currentScoring = {
      ...this.currentScoring,
      impressionScore: value
    }
  }),

  updateUdderFullness: action(function(value) {
    this.currentScoring = {
      ...this.currentScoring,
      udderFullness: value
    }
  }),

  addPhoto: action(function(photoPath) {
    if (this.currentScoring.photos.length < this.settings.maxPhotos) {
      const nextPhotos = [
        ...this.currentScoring.photos,
        {
          localPath: photoPath,
          uploaded: false,
          localId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      ]
      this.currentScoring = {
        ...this.currentScoring,
        photos: nextPhotos
      }
    }
  }),

  removePhoto: action(function(index) {
    const nextPhotos = this.currentScoring.photos.filter((_, idx) => idx !== index)
    this.currentScoring = {
      ...this.currentScoring,
      photos: nextPhotos
    }
  }),

  resetScoring: action(function() {
    this.currentScoring = {
      earTag: '',
      parity: null,
      mode: 'unified',
      scores: getDefaultScores(5),
      impressionScore: null,
      udderFullness: '',
      photos: [],
      startTime: null
    }
  }),

  // 设置相关
  updateSettings: action(function(newSettings) {
    const nextSettings = { ...this.settings }

    if (newSettings.defaultScores) {
      nextSettings.defaultScores = {
        ...this.settings.defaultScores,
        ...newSettings.defaultScores
      }
    }

    Object.keys(newSettings).forEach(key => {
      if (key === 'defaultScores') return
      nextSettings[key] = newSettings[key]
    })

    // 替换引用，确保页面绑定能及时刷新
    this.settings = nextSettings
    wx.setStorageSync('settings', nextSettings)
  }),

  loadSettings: action(function() {
    const saved = wx.getStorageSync('settings')
    if (saved) {
      const nextSettings = {
        ...this.settings,
        ...saved
      }
      if (saved.defaultScores) {
        nextSettings.defaultScores = {
          ...this.settings.defaultScores,
          ...saved.defaultScores
        }
      }

      // 兼容旧数据：乳房空满只允许 空/满
      if (nextSettings.defaultUdderFullness !== '空' && nextSettings.defaultUdderFullness !== '满') {
        nextSettings.defaultUdderFullness = '空'
      }

      this.settings = nextSettings
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
  OPTIMAL_SCORES,
  getDefaultScores,
  calculateTotalScore
}
