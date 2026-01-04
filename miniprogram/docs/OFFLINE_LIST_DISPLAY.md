# 离线评分列表显示功能

## 实施日期
2025-12-28

## 功能概述

在主页显示详细的离线评分列表，让用户清楚知道哪些评分还没有上传成功。

## 核心特性

### 1. 自动展开/收起
- **3条以内**：默认展开显示
- **超过3条**：默认收起，可点击展开

### 2. 显示信息
每条离线记录显示：
- 🐄 **牛号** (earTag)
- 📍 **牧场名称** (farmName)
- 🕐 **评分时间** (格式：12月28日 10:30)
- 📊 **总分和等级** (带颜色标识)
- 🐮 **胎次** (如果有)

### 3. 颜色标识
根据等级自动显示不同颜色：
- **Ex (优秀)**：金色 #FFD700
- **VG (很好)**：红色 #FF6B6B
- **GP/G (良好)**：绿色 #07C160
- **F/P (及格/差)**：灰色 #999

## 实现文件

### 1. index.js (pages/index/index.js)

**新增数据字段：**
```javascript
data: {
  loading: false,
  offlineScores: [],        // 离线评分列表
  showOfflineList: false    // 是否展开显示离线列表
}
```

**核心方法：**

#### loadOfflineScores()
```javascript
// 加载离线评分列表
loadOfflineScores() {
  const offlineScores = wx.getStorageSync('offlineScores') || []

  // 格式化时间并添加显示信息
  const formattedScores = offlineScores.map(score => {
    const date = new Date(score.createdAt)
    const timeStr = `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

    return {
      ...score,
      timeStr,
      gradeColor: this.getGradeColor(score.grade)
    }
  })

  this.setData({
    offlineScores: formattedScores,
    showOfflineList: formattedScores.length > 0 && formattedScores.length <= 3
  })
}
```

**功能说明：**
- 从本地存储读取离线评分
- 格式化时间为中文友好格式
- 根据等级添加颜色标识
- 3条以内自动展开

#### getGradeColor(grade)
```javascript
// 获取等级颜色
getGradeColor(grade) {
  const colors = {
    'Ex': '#FFD700',  // 金色
    'VG': '#FF6B6B',  // 红色
    'GP': '#07C160',  // 绿色
    'G': '#07C160',
    'F': '#999',
    'P': '#999'
  }
  return colors[grade] || '#999'
}
```

#### toggleOfflineList()
```javascript
// 切换离线列表展开/收起
toggleOfflineList() {
  this.setData({ showOfflineList: !this.data.showOfflineList })
}
```

**生命周期调用：**
```javascript
onLoad() {
  this.loadOfflineScores()    // 加载离线列表
  this.updatePendingSyncCount() // 更新计数
}

onShow() {
  this.loadOfflineScores()    // 每次显示时刷新
  this.updatePendingSyncCount()
}

onManualSync() {
  await app.syncOfflineData()
  this.loadOfflineScores()    // 同步后重新加载
  this.updatePendingSyncCount()
}
```

### 2. index.wxml (pages/index/index.wxml)

**同步状态卡片结构：**
```xml
<!-- 同步状态 -->
<view class="sync-card card" wx:if="{{pendingSyncCount > 0}}">
  <!-- 头部：显示计数和展开/收起 -->
  <view class="sync-header" bindtap="toggleOfflineList">
    <view class="sync-info">
      <text class="sync-icon">⚠️</text>
      <text class="sync-text">待上传: {{pendingSyncCount}} 条评分</text>
    </view>
    <text class="sync-toggle">{{showOfflineList ? '收起 ▲' : '展开 ▼'}}</text>
  </view>

  <!-- 离线评分列表 -->
  <view class="offline-list" wx:if="{{showOfflineList}}">
    <view class="offline-item" wx:for="{{offlineScores}}" wx:key="localId">
      <!-- 头部：牛号 + 分数等级 -->
      <view class="offline-item-header">
        <text class="offline-ear-tag">🐄 {{item.earTag}}</text>
        <view class="offline-score-badge">
          <text class="score-number" style="color: {{item.gradeColor}}">{{item.totalScore}}</text>
          <text class="score-grade" style="color: {{item.gradeColor}}">{{item.grade}}</text>
        </view>
      </view>

      <!-- 信息：牧场 + 时间 -->
      <view class="offline-item-info">
        <text class="offline-farm">📍 {{item.farmName}}</text>
        <text class="offline-time">🕐 {{item.timeStr}}</text>
      </view>

      <!-- 元数据：模式 + 胎次 -->
      <view class="offline-item-meta">
        <text class="offline-parity" wx:if="{{item.parity}}">胎次{{item.parity}}</text>
      </view>
    </view>
  </view>

  <!-- 同步按钮 -->
  <view class="sync-action-btn" bindtap="onManualSync">
    <text>{{loading ? '同步中...' : '立即同步'}}</text>
  </view>
</view>
```

### 3. index.wxss (pages/index/index.wxss)

**关键样式：**

#### 同步卡片容器
```css
.sync-card {
  padding: 0;
  background: #fff3cd;  /* 浅黄色背景 */
  overflow: hidden;
}
```

#### 离线列表
```css
.offline-list {
  padding: 0 30rpx 20rpx;
  max-height: 600rpx;  /* 最大高度，超出可滚动 */
  overflow-y: auto;
}
```

#### 离线项目
```css
.offline-item {
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
  border-left: 4rpx solid #ffc107;  /* 左侧黄色边框 */
}
```

#### 分数徽章
```css
.offline-score-badge {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.offline-score-badge .score-number {
  font-size: 32rpx;
  font-weight: bold;
}

.offline-score-badge .score-grade {
  font-size: 24rpx;
  font-weight: 600;
}
```

## 用户体验流程

### 场景1：离线保存后返回主页
1. 用户在无网络环境下完成评分
2. 提交时自动保存到离线
3. 返回主页
4. 看到黄色卡片："待上传: 1 条评分"
5. 默认展开（≤3条），显示详细信息：
   ```
   🐄 TEST001          82 GP
   📍 测试牧场         🕐 12月28日 14:30
   胎次2
   ```

### 场景2：多条离线记录
1. 用户累计了5条离线评分
2. 返回主页
3. 看到："待上传: 5 条评分  展开 ▼"
4. 点击展开 → 显示所有5条记录列表
5. 再次点击 → 收起列表

### 场景3：同步后
1. 用户点击"立即同步"按钮
2. 显示"同步中..."
3. 同步成功后：
   - 显示"已同步 5 条评分"Toast
   - 离线列表自动清空
   - 黄色卡片消失
   - 主页恢复正常

### 场景4：登录后立即看到
1. 用户重新打开小程序/重新登录
2. onLoad() 自动加载离线列表
3. 立即看到未上传的评分
4. 无需手动刷新

## 视觉设计

### 卡片布局
```
┌─────────────────────────────────┐
│ ⚠️ 待上传: 3 条评分    收起 ▲   │ ← 黄色背景头部
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │🐄 TEST001         82 GP     │ │ ← 白色背景项目
│ │📍 测试牧场  🕐 12月28日 10:30│ │
│ │胎次2                        │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │🐄 TEST002         75 G      │ │
│ │📍 测试牧场  🕐 12月28日 11:15│ │
│ │胎次3                        │ │
│ └─────────────────────────────┘ │
│                                 │
│     [ 立即同步 ]                │ ← 黄色按钮
└─────────────────────────────────┘
```

### 颜色方案
- **卡片背景**：#fff3cd (浅黄色)
- **文字颜色**：#856404 (深黄棕色)
- **按钮背景**：#ffc107 (警告黄)
- **项目背景**：#fff (白色)
- **左侧边框**：#ffc107 (黄色)

## 技术要点

### 1. 时间格式化
```javascript
const date = new Date(score.createdAt)
const timeStr = `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
```
输出示例：`12月28日 14:30`

### 2. 动态颜色绑定
```xml
<text style="color: {{item.gradeColor}}">{{item.totalScore}}</text>
```

### 3. 条件渲染
```xml
wx:if="{{pendingSyncCount > 0}}"       <!-- 有离线数据时显示 -->
wx:if="{{showOfflineList}}"            <!-- 展开时显示列表 -->
wx:if="{{item.parity}}"                <!-- 有胎次时显示 -->
```

### 4. 列表滚动
```css
.offline-list {
  max-height: 600rpx;
  overflow-y: auto;
}
```
超过600rpx高度时自动滚动

## 数据流

```
用户评分 → 提交失败 → 保存到 wx.setStorageSync('offlineScores')
                              ↓
                      返回主页 index onShow()
                              ↓
                      loadOfflineScores()
                              ↓
                      读取 offlineScores
                              ↓
                      格式化时间、颜色
                              ↓
                      setData({ offlineScores })
                              ↓
                      WXML 渲染列表
```

## 测试要点

### 测试1: 单条离线记录
- [ ] 提交失败保存1条离线评分
- [ ] 返回主页
- [ ] 验证显示："待上传: 1 条评分"
- [ ] 验证列表默认展开
- [ ] 验证显示牛号、分数、牧场、时间、模式

### 测试2: 多条离线记录
- [ ] 保存5条离线评分
- [ ] 返回主页
- [ ] 验证显示："待上传: 5 条评分"
- [ ] 验证列表默认收起
- [ ] 点击展开 → 显示所有5条
- [ ] 点击收起 → 隐藏列表

### 测试3: 等级颜色
- [ ] 保存不同等级的评分 (Ex, VG, GP, G, F, P)
- [ ] 验证每个等级显示正确颜色
- [ ] Ex显示金色 #FFD700
- [ ] VG显示红色 #FF6B6B
- [ ] GP/G显示绿色 #07C160

### 测试4: 同步后清空
- [ ] 有离线记录
- [ ] 点击"立即同步"
- [ ] 验证同步成功
- [ ] 验证离线列表清空
- [ ] 验证黄色卡片消失

### 测试5: 时间显示
- [ ] 验证时间格式：12月28日 14:30
- [ ] 验证时间准确性
- [ ] 验证小时数补零（08:05）

### 测试6: 登录后显示
- [ ] 有离线记录的情况下
- [ ] 退出小程序
- [ ] 重新打开
- [ ] 验证主页自动显示离线列表

## 优化建议

### 性能优化
1. **虚拟列表** - 超过20条时使用虚拟滚动
2. **分页加载** - 只显示最近10条，其余折叠
3. **缓存颜色** - 预计算等级颜色避免重复计算

### 功能增强
1. **单条删除** - 长按删除某条离线记录
2. **单条上传** - 点击某条记录单独上传
3. **详情查看** - 点击展开查看完整评分详情
4. **排序选项** - 按时间/分数/牧场排序
5. **筛选功能** - 按牧场/模式筛选

### 视觉优化
1. **动画效果** - 展开/收起添加过渡动画
2. **骨架屏** - 加载时显示骨架屏
3. **空状态** - 无离线记录时显示空状态插画
4. **加载指示** - 同步时显示进度条

## 相关文件清单

- `pages/index/index.js` - 加载和显示离线列表逻辑
- `pages/index/index.wxml` - 离线列表UI结构
- `pages/index/index.wxss` - 离线列表样式
- `app.js` - 自动同步功能（已有）
- `store/index.js` - updatePendingSyncCount（已有）

## 与其他功能的关联

### 1. 结果页 (result.js)
- 提交失败时保存到 `offlineScores`
- 触发主页刷新离线列表

### 2. 自动同步 (app.js)
- 网络恢复时自动同步
- 同步成功后主页自动刷新

### 3. 待同步计数 (store.js)
- `pendingSyncCount` 控制黄色卡片显示/隐藏
- 离线列表显示详细内容

## 总结

此功能让用户对离线评分有完整的掌控：
- ✅ 清楚知道有哪些评分未上传
- ✅ 看到每条记录的详细信息
- ✅ 可手动触发同步
- ✅ 自动更新状态

提升了离线使用场景的用户体验和数据可见性。
