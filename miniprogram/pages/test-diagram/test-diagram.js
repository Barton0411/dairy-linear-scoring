Page({
  data: {
    showDiagram: false,
    currentTraitKey: '',
    traits: [
      { key: 'tg', name: '体高' },
      { key: 'xk', name: '胸宽' },
      { key: 'ts', name: '体深' },
      { key: 'yqd', name: '腰强度' },
      { key: 'kjd', name: '尻角度' },
      { key: 'kk', name: '尻宽' },
      { key: 'tjd', name: '蹄角度' },
      { key: 'tgsd', name: '蹄踵深度' },
      { key: 'gzd', name: '骨质地' },
      { key: 'hzcs', name: '后肢侧视' },
      { key: 'hzhs', name: '后肢后视' },
      { key: 'rfsd', name: '乳房深度' },
      { key: 'zyxrd', name: '中央悬韧带' },
      { key: 'qrffz', name: '前乳房附着' },
      { key: 'qrtwz', name: '前乳头位置' },
      { key: 'qrtcd', name: '前乳头长度' },
      { key: 'hrffzgd', name: '后乳房附着高度' },
      { key: 'hrffzkd', name: '后乳房附着宽度' },
      { key: 'hrtwz', name: '后乳头位置' },
      { key: 'ljx', name: '棱角性' }
    ]
  },

  onShowDiagram(e) {
    const { traitKey } = e.currentTarget.dataset
    console.log('点击性状:', traitKey)
    this.setData({
      showDiagram: true,
      currentTraitKey: traitKey
    })
  },

  onCloseDiagram() {
    console.log('关闭弹窗')
    this.setData({
      showDiagram: false,
      currentTraitKey: ''
    })
  }
})
