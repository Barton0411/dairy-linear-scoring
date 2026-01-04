// components/nav-header/nav-header.js
Component({
  properties: {
    title: {
      type: String,
      value: ''
    }
  },

  methods: {
    onGoHome() {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  }
})
