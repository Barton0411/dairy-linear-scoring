// utils/util.js - 工具函数

/**
 * 格式化日期
 */
function formatDate(date, format = 'YYYY-MM-DD HH:mm') {
  if (!date) return ''
  const d = new Date(date)

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const second = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second)
}

/**
 * 生成本地唯一ID
 */
function generateLocalId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 压缩图片
 * 目标: 200-500KB
 */
function compressImage(filePath, options = {}) {
  return new Promise((resolve, reject) => {
    // 先获取图片信息
    wx.getImageInfo({
      src: filePath,
      success: (info) => {
        const { width, height } = info

        // 默认参数
        const maxSize = options.maxSize || 1920
        const quality = options.quality || 60

        // 计算目标尺寸
        let targetWidth = width
        let targetHeight = height

        if (width > height && width > maxSize) {
          targetWidth = maxSize
          targetHeight = Math.round(height * (maxSize / width))
        } else if (height > maxSize) {
          targetHeight = maxSize
          targetWidth = Math.round(width * (maxSize / height))
        }

        // 压缩图片
        wx.compressImage({
          src: filePath,
          quality: quality, // 压缩质量
          compressedWidth: targetWidth,
          compressedHeight: targetHeight,
          success: (res) => {
            resolve(res.tempFilePath)
          },
          fail: (err) => {
            // 压缩失败时返回原图
            console.warn('Image compression failed:', err)
            resolve(filePath)
          }
        })
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

/**
 * 检查网络状态
 */
function checkNetwork() {
  return new Promise((resolve) => {
    wx.getNetworkType({
      success: (res) => {
        resolve({
          isConnected: res.networkType !== 'none',
          networkType: res.networkType
        })
      },
      fail: () => {
        resolve({ isConnected: false, networkType: 'none' })
      }
    })
  })
}

/**
 * 显示加载提示
 */
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true })
}

/**
 * 隐藏加载提示
 */
function hideLoading() {
  wx.hideLoading()
}

/**
 * 显示成功提示
 */
function showSuccess(title) {
  wx.showToast({ title, icon: 'success', duration: 2000 })
}

/**
 * 显示错误提示
 */
function showError(title) {
  wx.showToast({ title, icon: 'error', duration: 2000 })
}

/**
 * 显示提示信息
 */
function showToast(title) {
  wx.showToast({ title, icon: 'none', duration: 2000 })
}

/**
 * 确认对话框
 */
function showConfirm(content, title = '提示') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm)
      }
    })
  })
}

/**
 * 防抖
 */
function debounce(fn, delay = 300) {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流
 */
function throttle(fn, delay = 300) {
  let lastTime = 0
  return function(...args) {
    const now = Date.now()
    if (now - lastTime >= delay) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

/**
 * 等级对应的颜色
 */
function getGradeColor(grade) {
  const colors = {
    'Ex': '#FFD700', // 金色
    'VG': '#FF6B6B', // 红色
    'GP': '#278546', // 伊利绿（良好）
    'G': '#278546',  // 伊利绿（一般）
    'F': '#5f6464',  // 深灰
    'P': '#5f6464'   // 深灰
  }
  return colors[grade] || '#999999'
}

/**
 * 等级对应的中文名称
 */
function getGradeName(grade) {
  const names = {
    'Ex': '特级',
    'VG': '优秀',
    'GP': '良好',
    'G': '一般',
    'F': '及格',
    'P': '差'
  }
  return names[grade] || grade
}

module.exports = {
  formatDate,
  generateLocalId,
  compressImage,
  checkNetwork,
  showLoading,
  hideLoading,
  showSuccess,
  showError,
  showToast,
  showConfirm,
  debounce,
  throttle,
  getGradeColor,
  getGradeName
}
