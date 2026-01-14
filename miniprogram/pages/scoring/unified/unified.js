// pages/scoring/unified/unified.js
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings')
const { store, TRAITS, OPTIMAL_SCORES } = require('../../../store/index')
const { showConfirm, showToast, getGradeColor } = require('../../../utils/util')

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: {
    store,
    fields: {
      currentScoring: 'currentScoring',
      totalScore: 'totalScore',
      scores: () => store.currentScoring.scores,
      settings: 'settings'
    },
    actions: {
      updateScore: 'updateScore',
      updateImpressionScore: 'updateImpressionScore',
      updateUdderFullness: 'updateUdderFullness'
    }
  },

  data: {
    categories: (() => {
      // UI 侧去重：同一 traitKey 只在一个类别中展示一次（避免 yqd/gzd 等重复出现）
      const globalKeys = new Set()

      return Object.entries(TRAITS).map(([key, val]) => {
        let traits = []

        if (val.subCategories) {
          const localKeys = new Set()
          Object.values(val.subCategories).forEach(subCat => {
            subCat.traits.forEach(trait => {
              if (localKeys.has(trait.key)) return
              localKeys.add(trait.key)
              if (globalKeys.has(trait.key)) return
              globalKeys.add(trait.key)
              traits.push(trait)
            })
          })
        } else {
          (val.traits || []).forEach(trait => {
            if (globalKeys.has(trait.key)) return
            globalKeys.add(trait.key)
            traits.push(trait)
          })
        }

        return {
          key,
          name: val.name,
          weight: val.weight,
          weightPercent: Math.round(val.weight * 100),
          traits
        }
      })
    })(),
    modifiedCounts: {},
    modifiedMap: {},
    extraModified: {
      impressionScore: false,
      udderFullness: false
    },
    gradeColor: '#0087cd',
    showDiagram: false,
    currentTraitKey: '',
    optimalScores: OPTIMAL_SCORES  // 最优值配置
  },

  onLoad() {
    if (!store.currentScoring.earTag) {
      wx.redirectTo({ url: '/pages/scoring/info/info' })
      return
    }
    this.updateModifiedCounts()
  },

  onShow() {
    this.updateModifiedCounts()
  },

  updateModifiedCounts() {
    if (!this.data.currentScoring || !this.data.currentScoring.scores || !this.data.settings) {
      return
    }

    const counts = {}
    const modifiedMap = {}
    this.data.categories.forEach(category => {
      let count = 0
      category.traits.forEach(trait => {
        const modified = this.isModified(trait.key)
        modifiedMap[trait.key] = modified
        if (modified) {
          count++
        }
      })
      counts[category.key] = count
    })

    const impressionScore = this.data.currentScoring.impressionScore
    const defaultImpressionScore = this.data.settings.defaultImpressionScore
    const currentUdderFullness = this.data.currentScoring.udderFullness || ''
    const defaultUdderFullness = this.data.settings.defaultUdderFullness || ''

    const extraModified = {
      impressionScore: impressionScore !== defaultImpressionScore,
      udderFullness: currentUdderFullness !== defaultUdderFullness
    }

    const gradeColor = getGradeColor(this.data.totalScore?.grade)
    this.setData({ modifiedCounts: counts, modifiedMap, extraModified, gradeColor })
  },

  isModified(traitKey) {
    const currentScore = this.data.currentScoring.scores[traitKey]
    const defaultScore = this.data.settings.defaultScores[traitKey]
    return currentScore !== defaultScore
  },


  onScoreButtonTap(e) {
    const { key, value } = e.currentTarget.dataset
    this.updateScore(key, parseInt(value))

    setTimeout(() => {
      this.updateModifiedCounts()
    }, 100)
  },

  onResetScore(e) {
    const { key } = e.currentTarget.dataset
    const defaultScore = this.data.settings.defaultScores[key]
    this.updateScore(key, defaultScore)

    setTimeout(() => {
      this.updateModifiedCounts()
    }, 100)

    showToast('已恢复默认分')
  },

  async onResetAll() {
    const confirm = await showConfirm('确定将所有性状重置为默认分吗？')
    if (!confirm) return

    Object.keys(this.data.settings.defaultScores).forEach(key => {
      this.updateScore(key, this.data.settings.defaultScores[key])
    })

    this.updateImpressionScore(this.data.settings.defaultImpressionScore)
    this.updateUdderFullness(this.data.settings.defaultUdderFullness || '')

    setTimeout(() => {
      this.updateModifiedCounts()
    }, 100)

    showToast('已全部恢复默认分')
  },

  onImpressionMinus() {
    const current = parseInt(this.data.currentScoring.impressionScore)
    const base = Number.isFinite(current) ? current : Number(this.data.settings.defaultImpressionScore) || 85
    const next = Math.max(50, Math.min(100, base - 1))
    this.updateImpressionScore(next)
    this.updateModifiedCounts()
  },

  onImpressionPlus() {
    const current = parseInt(this.data.currentScoring.impressionScore)
    const base = Number.isFinite(current) ? current : Number(this.data.settings.defaultImpressionScore) || 85
    const next = Math.max(50, Math.min(100, base + 1))
    this.updateImpressionScore(next)
    this.updateModifiedCounts()
  },

  onImpressionInput(e) {
    const raw = parseInt(e.detail.value)
    if (!Number.isFinite(raw)) {
      this.updateImpressionScore('')
      this.updateModifiedCounts()
      return
    }
    this.updateImpressionScore(raw)
    this.updateModifiedCounts()
  },

  onImpressionBlur(e) {
    const fallback = Number(this.data.settings.defaultImpressionScore) || 85
    let value = parseInt(e.detail.value)
    value = Number.isFinite(value) ? value : fallback
    value = Math.max(50, Math.min(100, value))
    this.updateImpressionScore(value)
    this.updateModifiedCounts()
  },

  onResetImpression() {
    this.updateImpressionScore(this.data.settings.defaultImpressionScore)
    this.updateModifiedCounts()
    showToast('已恢复默认印象分')
  },

  onUdderFullnessSelect(e) {
    const { value } = e.currentTarget.dataset
    this.updateUdderFullness(value)
    this.updateModifiedCounts()
  },

  onResetUdderFullness() {
    this.updateUdderFullness(this.data.settings.defaultUdderFullness || '')
    this.updateModifiedCounts()
    showToast('已恢复默认乳房空满')
  },

  onSelectUdderFullness() {
    const defaultValue = this.data.settings.defaultUdderFullness
    const options = defaultValue ? ['空', '满', '恢复默认'] : ['空', '满']

    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        const value = options[res.tapIndex]
        if (value === '恢复默认') {
          this.onResetUdderFullness()
          return
        }
        this.updateUdderFullness(value)
        this.updateModifiedCounts()
      }
    })
  },

  onShowDiagram(e) {
    const { traitKey } = e.currentTarget.dataset
    this.setData({
      showDiagram: true,
      currentTraitKey: traitKey
    })
  },

  onCloseDiagram() {
    this.setData({
      showDiagram: false,
      currentTraitKey: ''
    })
  },

  onNextStep() {
    const { totalScore, settings } = this.data
    const score = totalScore.score
    const photoMode = settings.photoMode || 'always'

    if (photoMode === 'always') {
      wx.navigateTo({ url: '/pages/scoring/photo/photo' })
      return
    }

    if (photoMode === 'never') {
      wx.navigateTo({ url: '/pages/scoring/result/result' })
      return
    }

    if (photoMode === 'threshold') {
      const highThreshold = Number(settings.photoThresholdExcellent) || 85
      const lowThreshold = Number(settings.photoThresholdPoor) || 65
      const needPhoto = (settings.photoPromptExcellent && score >= highThreshold) ||
                        (settings.photoPromptPoor && score <= lowThreshold)

      wx.navigateTo({ url: needPhoto ? '/pages/scoring/photo/photo' : '/pages/scoring/result/result' })
      return
    }

    wx.navigateTo({ url: '/pages/scoring/photo/photo' })
  }
})
