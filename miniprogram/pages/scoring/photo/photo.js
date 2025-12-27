// pages/scoring/photo/photo.js
const { storeBindingsBehavior } = require('mobx-miniprogram-binding')
const { store } = require('../../../store/index')
const { compressImage, showToast, showConfirm } = require('../../../utils/util')

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: {
    store,
    fields: ['currentScoring', 'settings'],
    actions: ['addPhoto', 'removePhoto']
  },

  data: {
    maxPhotos: 5
  },

  onLoad() {
    this.setData({ maxPhotos: this.data.settings.maxPhotos || 5 })
  },

  // 拍照
  async onTakePhoto() {
    if (this.data.currentScoring.photos.length >= this.data.maxPhotos) {
      showToast(`最多只能拍${this.data.maxPhotos}张照片`)
      return
    }

    try {
      const res = await this.chooseImage('camera')
      const compressed = await compressImage(res.tempFilePaths[0])
      this.addPhoto(compressed)
    } catch (err) {
      if (err.errMsg && !err.errMsg.includes('cancel')) {
        showToast('拍照失败')
      }
    }
  },

  // 从相册选择
  async onChooseFromAlbum() {
    const remaining = this.data.maxPhotos - this.data.currentScoring.photos.length
    if (remaining <= 0) {
      showToast(`最多只能选${this.data.maxPhotos}张照片`)
      return
    }

    try {
      const res = await this.chooseImage('album', remaining)
      for (const path of res.tempFilePaths) {
        const compressed = await compressImage(path)
        this.addPhoto(compressed)
      }
    } catch (err) {
      if (err.errMsg && !err.errMsg.includes('cancel')) {
        showToast('选择失败')
      }
    }
  },

  // 选择图片Promise封装
  chooseImage(sourceType, count = 1) {
    return new Promise((resolve, reject) => {
      wx.chooseMedia({
        count,
        mediaType: ['image'],
        sourceType: [sourceType],
        sizeType: ['compressed'],
        success: (res) => {
          resolve({
            tempFilePaths: res.tempFiles.map(f => f.tempFilePath)
          })
        },
        fail: reject
      })
    })
  },

  // 预览照片
  onPreviewPhoto(e) {
    const { index } = e.currentTarget.dataset
    const urls = this.data.currentScoring.photos.map(p => p.localPath)
    wx.previewImage({
      current: urls[index],
      urls
    })
  },

  // 删除照片
  async onDeletePhoto(e) {
    const { index } = e.currentTarget.dataset
    const confirm = await showConfirm('确定删除这张照片吗？')
    if (confirm) {
      this.removePhoto(index)
    }
  },

  // 完成拍照，进入结果页
  onComplete() {
    wx.navigateTo({ url: '/pages/scoring/result/result' })
  },

  // 跳过拍照
  async onSkip() {
    const confirm = await showConfirm('确定不拍照直接提交吗？')
    if (confirm) {
      wx.navigateTo({ url: '/pages/scoring/result/result' })
    }
  }
})
