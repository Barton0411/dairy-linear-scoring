// pages/records/detail/detail.js
const { ALL_TRAITS } = require('../../../store/index')
const { formatDate, showToast, getGradeColor } = require('../../../utils/util')

Page({
  data: {
    record: null,
    traitScores: []
  },

  onLoad() {
    const record = wx.getStorageSync('tempRecord')

    if (!record) {
      showToast('暂无记录详情')
      wx.navigateBack()
      return
    }

    // 将扁平化的性状字段转换为scores对象
    // 后端返回的是 tg, xk, ts 等扁平字段，需要转换成 scores: { tg: 7, xk: 6, ... }
    const scores = {}
    ALL_TRAITS.forEach(trait => {
      // 优先使用已有的scores对象，否则从扁平字段中读取
      scores[trait.key] = record.scores?.[trait.key] ?? record[trait.key] ?? null
    })

    const createdAtFormatted = record.createdAtFormatted || formatDate(record.createdAt)
    const traitScores = ALL_TRAITS.map(trait => ({
      key: trait.key,
      name: trait.name,
      score: scores[trait.key] ?? '-'
    }))

    this.setData({
      record: {
        ...record,
        scores, // 添加转换后的scores对象
        createdAtFormatted,
        gradeColor: getGradeColor(record.grade)
      },
      traitScores
    })
  },

  onBackToList() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: '/pages/records/list/list' })
  }
})
