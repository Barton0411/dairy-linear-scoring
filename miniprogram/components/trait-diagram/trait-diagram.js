// 导入OSS配置
const { getTraitImageUrl, TRAIT_NAME_MAP } = require('../../config/oss')

Component({
  properties: {
    visible: { type: Boolean, value: false },
    traitKey: { type: String, value: '' }
  },
  data: {
    imagePath: '',
    traitName: '',
    imageError: false
  },

  observers: {
    'traitKey': function(key) {
      this.syncTrait(key)
    },
    'visible': function(visible) {
      console.log(`[trait-diagram] 弹窗状态: ${visible ? '显示' : '隐藏'}`)
      if (visible) {
        this.syncTrait(this.properties.traitKey)
      }
    }
  },
  methods: {
    syncTrait(key) {
      if (!key) {
        this.setData({
          imagePath: '',
          traitName: '',
          imageError: true
        })
        return
      }

      const traitName = TRAIT_NAME_MAP[key] || key
      const imagePath = getTraitImageUrl(key)

      console.log(`[trait-diagram] 性状: ${key} -> ${traitName}, OSS路径: ${imagePath}`)

      this.setData({
        imagePath,
        traitName,
        imageError: !imagePath
      })
    },
    onClose() {
      console.log('[trait-diagram] 关闭弹窗')
      this.triggerEvent('close')
    },
    onContentTap() {
      // 阻止冒泡，点击内容区不关闭
    },
    onImageLoad(e) {
      console.log('[trait-diagram] 图片加载成功:', this.data.imagePath)
      this.setData({ imageError: false })
    },
    onImageError(e) {
      console.error('[trait-diagram] 图片加载失败:', this.data.imagePath, e)
      this.setData({ imageError: true })
    }
  }
})
