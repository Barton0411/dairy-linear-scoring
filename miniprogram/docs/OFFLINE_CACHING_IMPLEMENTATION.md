# 离线缓存与返回修改功能实现文档

## 实施日期
2025-12-28

## 功能概述

根据用户需求，本次更新实现了两个核心功能：

1. **返回修改评分按钮** - 允许用户从结果页返回评分页修改分数，无需重新提交
2. **离线缓存与自动上传** - 当提交失败时自动缓存数据，联网后自动上传

## 实施详情

### 1. 返回修改评分按钮

#### 修改的文件
- `pages/scoring/result/result.wxml`
- `pages/scoring/result/result.js`
- `pages/scoring/result/result.wxss`

#### 实现逻辑

**WXML 变更 (result.wxml:80-84)**
```xml
<view class="secondary-actions">
  <text class="link-btn" bindtap="onBackToModify">返回修改评分</text>
  <text class="link-btn" bindtap="onBackHome">返回首页</text>
  <text class="link-btn" bindtap="onViewRecords">查看记录</text>
</view>
```

**JS 变更 (result.js:120-129)**
```javascript
// 返回修改评分（不提交，保留数据）
onBackToModify() {
  const page = this.data.currentScoring.mode === 'defect' ? 'defect' : 'normal'
  wx.navigateBack({
    fail: () => {
      // 如果navigateBack失败（页面栈中没有上一页），则重新进入评分页
      wx.redirectTo({ url: `/pages/scoring/${page}/${page}` })
    }
  })
}
```

**关键特性：**
- 不调用 `resetScoring()`，保留 MobX store 中的 `currentScoring` 数据
- 优先使用 `wx.navigateBack()` 返回上一页（保持页面栈）
- 如果页面栈中没有上一页，则使用 `wx.redirectTo()` 重新进入评分页
- 根据 `mode` 字段自动跳转到对应的评分页（normal 或 defect）

### 2. 离线缓存与自动上传

#### 修改的文件
- `pages/scoring/result/result.js`
- `app.js`

#### 实现逻辑

**提交逻辑优化 (result.js:53-118)**
```javascript
async submitScore() {
  // 验证分数完整性
  if (!this.validateScores()) {
    return false
  }

  const scoreData = { /* 构建评分数据 */ }

  try {
    const network = await checkNetwork()

    if (network.isConnected) {
      // 在线提交
      await api.submitScore(scoreData)

      // 上传照片
      for (const photo of currentScoring.photos) {
        try {
          await api.uploadPhoto(photo.localPath, scoreData.localId)
        } catch (err) {
          console.error('Photo upload failed:', err)
          this.saveOfflinePhoto(photo, scoreData.localId)
        }
      }

      showSuccess('提交成功')
    } else {
      // 离线保存
      this.saveOfflineScore(scoreData)
      showToast('已离线保存，联网后自动上传')
    }

    this.updatePendingSyncCount()
    return true

  } catch (err) {
    console.error('Submit error:', err)
    // 所有提交失败都保存到离线（包括502、timeout等）
    this.saveOfflineScore(scoreData)
    this.updatePendingSyncCount()
    showToast('提交失败，已离线保存')
    return true
  }
}
```

**关键改进：**
1. **捕获所有错误类型** - 不仅是网络错误，包括 502、timeout、服务器错误等
2. **明确的用户反馈** - 根据不同场景显示不同提示信息：
   - 在线成功：`提交成功`
   - 离线保存：`已离线保存，联网后自动上传`
   - 提交失败：`提交失败，已离线保存`
3. **自动更新待同步计数** - 调用 `updatePendingSyncCount()` 更新首页显示

**自动上传增强 (app.js:83-131)**
```javascript
async syncOfflineData() {
  const offlineScores = wx.getStorageSync('offlineScores') || []
  const offlinePhotos = wx.getStorageSync('offlinePhotos') || []

  if (offlineScores.length === 0 && offlinePhotos.length === 0) {
    store.updatePendingSyncCount()
    return
  }

  console.log(`Syncing ${offlineScores.length} scores, ${offlinePhotos.length} photos`)

  let syncedScores = 0
  let syncedPhotos = 0

  // 同步评分数据
  for (const score of offlineScores) {
    try {
      await this.syncScore(score)
      this.removeOfflineScore(score.localId)
      syncedScores++
    } catch (err) {
      console.error('Sync score failed:', err)
    }
  }

  // 同步照片
  for (const photo of offlinePhotos) {
    try {
      await this.syncPhoto(photo)
      this.removeOfflinePhoto(photo.localId)
      syncedPhotos++
    } catch (err) {
      console.error('Sync photo failed:', err)
    }
  }

  // 更新同步计数
  store.updatePendingSyncCount()

  // 显示同步结果
  if (syncedScores > 0 || syncedPhotos > 0) {
    wx.showToast({
      title: `已同步 ${syncedScores} 条评分`,
      icon: 'success',
      duration: 2000
    })
  }
}
```

**自动上传特性：**
1. **网络状态监听** - 使用 `wx.onNetworkStatusChange()` 监听网络变化
2. **启动时自动同步** - app.js `onLaunch()` 时检查网络并同步
3. **用户反馈** - 同步成功后显示 Toast 提示
4. **失败容错** - 单条数据同步失败不影响其他数据
5. **计数更新** - 同步后自动更新 pendingSyncCount

## 用户体验流程

### 场景1：网络正常
1. 用户完成评分 → 点击"提交并继续评分"
2. 数据成功上传 → 显示"提交成功"
3. 自动跳转到新评分页

### 场景2：网络异常（502/timeout/离线）
1. 用户完成评分 → 点击"提交并继续评分"
2. 提交失败 → 数据自动保存到本地
3. 显示"提交失败，已离线保存"
4. 首页显示"待同步: X 条数据"
5. 网络恢复后 → 自动后台上传 → 显示"已同步 X 条评分"

### 场景3：需要修改评分
1. 用户在结果页发现评分有误
2. 点击"返回修改评分" → 返回评分页
3. 所有分数保持原状，可以修改
4. 修改完成后 → 再次查看结果 → 提交

### 场景4：手动同步
1. 首页看到"待同步: X 条数据"
2. 点击同步卡片 → 手动触发同步
3. 同步完成 → 待同步计数清零

## 数据结构

### 离线评分存储
```javascript
// wx.setStorageSync('offlineScores')
[
  {
    localId: "1703822400000_abc123",
    farmCode: "F001",
    farmName: "测试牧场",
    earTag: "TEST001",
    parity: 2,
    mode: "normal",
    scores: { tg: 5, xk: 6, ... },
    totalScore: 82,
    grade: "GP",
    photos: [...],
    createdAt: "2025-12-28T10:30:00.000Z",
    employeeId: "E001",
    appraiserName: "张三",
    isCertified: true
  }
]
```

### 离线照片存储
```javascript
// wx.setStorageSync('offlinePhotos')
[
  {
    localId: "photo_123",
    localPath: "wxfile://tmp_xxx.jpg",
    scoreId: "1703822400000_abc123",
    uploaded: false
  }
]
```

## 样式改进

**新增样式 (result.wxss:185-196)**
```css
.secondary-actions {
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin-top: 20rpx;
}

.link-btn {
  font-size: 28rpx;
  color: #07C160;
  padding: 10rpx 20rpx;
}
```

## 测试要点

### 测试1: 返回修改功能
- [ ] 完成评分后进入结果页
- [ ] 点击"返回修改评分"按钮
- [ ] 验证所有评分数据保持不变
- [ ] 修改部分评分
- [ ] 再次进入结果页验证新分数
- [ ] 提交成功

### 测试2: 离线缓存
- [ ] 关闭网络或模拟 502 错误
- [ ] 完成评分并提交
- [ ] 验证显示"提交失败，已离线保存"
- [ ] 返回首页查看"待同步"计数
- [ ] 打开网络
- [ ] 验证自动同步提示
- [ ] 验证首页计数清零

### 测试3: 手动同步
- [ ] 有离线数据的情况下
- [ ] 点击首页"待同步"卡片
- [ ] 验证同步进度提示
- [ ] 验证同步成功提示
- [ ] 验证数据已上传到服务器

### 测试4: 照片上传失败
- [ ] 评分包含照片
- [ ] 模拟照片上传失败
- [ ] 验证评分数据提交成功，照片保存到离线
- [ ] 验证后续自动上传照片

## 技术要点

1. **MobX 状态保持** - `currentScoring` 不调用 `resetScoring()` 即可保持数据
2. **错误捕获** - 使用 try-catch 捕获所有类型的提交错误
3. **网络检测** - 使用 `checkNetwork()` 和 `wx.onNetworkStatusChange()`
4. **本地存储** - 使用 `wx.getStorageSync()` / `wx.setStorageSync()` 持久化数据
5. **用户反馈** - 使用 `showToast()` / `showSuccess()` 提供即时反馈

## 已知限制

1. **照片存储** - 微信小程序临时文件有效期限制，长时间离线可能导致照片路径失效
2. **存储容量** - 微信小程序本地存储上限 10MB，大量离线数据可能超限
3. **同步顺序** - 离线数据按顺序同步，单条失败不影响其他数据
4. **网络判断** - 依赖微信 API，某些特殊网络环境可能误判

## 未来优化建议

1. **批量同步** - 改为批量提交多条评分，减少网络请求次数
2. **同步队列** - 实现优先级队列，重要数据优先上传
3. **压缩存储** - 对离线数据进行压缩，节省存储空间
4. **冲突处理** - 处理同一牛号多次评分的数据冲突
5. **照片压缩** - 上传前压缩照片，减少流量消耗
6. **进度显示** - 同步时显示详细进度（X/Y 已完成）

## 相关文件清单

- `pages/scoring/result/result.wxml` - 添加返回修改按钮
- `pages/scoring/result/result.js` - 实现返回逻辑和离线缓存
- `pages/scoring/result/result.wxss` - 按钮样式
- `app.js` - 增强自动同步功能
- `pages/index/index.wxml` - 显示待同步计数（已有）
- `pages/index/index.js` - 手动同步功能（已有）
- `store/index.js` - 状态管理和计数更新（已有）
