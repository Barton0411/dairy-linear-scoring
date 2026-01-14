# 小程序图标和导航栏配置说明

## 已完成的功能

### 1. 全局导航栏（伊利Logo返回主页按钮）

所有页面的左上角已添加伊利Logo，点击可返回首页。

**组件位置**：`/components/nav-header/nav-header`

**已更新的页面**（共17个）：
- ✅ 首页 (index)
- ✅ 评分流程 (scoring/info, unified, photo, result)
- ✅ 记录管理 (records/list, detail)
- ✅ 系统页面 (settings, farm-select, farm-create)
- ✅ 管理后台 (admin-panel)
- ✅ 登录认证 (login, verify)
- ✅ 法律文档 (legal/agreement, privacy)
- ✅ 其他 (team-info, test-diagram, webview)

### 2. 首页团队信息

首页底部已添加完整的团队信息区域，包含：
- ✅ 伊利Logo展示
- ✅ 应用名称：伊利奶牛体型外貌鉴定系统
- ✅ 开发团队：伊利奶科院育种中心
- ✅ 反馈联系方式（点击显示弹窗）：
  - 联系人：杨超群
  - 电话：17367077554（点击可拨打）
  - 邮箱：yangchaoqun1@yili.com

### 3. Logo文件已准备

- 导航栏Logo：`/miniprogram/img/yili-logo.png` （伊利Logo，返回主页）
- 小程序图标：`/miniprogram/img/logo.png` （项目Logo）

---

## 需要手动配置的项目

### 小程序图标设置

**步骤**：

1. 打开微信开发者工具
2. 点击右上角 **详情** 按钮
3. 在 **本地设置** 标签页中
4. 找到 **项目图标** 设置项
5. 点击 **选择图片** 按钮
6. 选择 `/miniprogram/img/logo.png` 文件
7. 确认并保存

**图标规格要求**：
- 格式：PNG
- 尺寸：1024x1024px（推荐），至少256x256px
- 大小：不超过2MB

**提示**：当前的 `logo.png` 文件规格为 1536x1024，已满足要求。

---

## 技术实现说明

### 导航栏组件 (nav-header)

**文件**：
- `components/nav-header/nav-header.wxml`
- `components/nav-header/nav-header.wxss`
- `components/nav-header/nav-header.js`
- `components/nav-header/nav-header.json`

**使用方法**：
```xml
<nav-header title="页面标题" />
```

**功能**：
- 显示伊利Logo（左上角）
- 显示页面标题（居中）
- 点击Logo返回首页（使用 wx.switchTab）

### 首页联系方式弹窗

**实现**：pages/index/index.js 中的 `onShowContact()` 方法

**功能**：
- 显示联系人信息弹窗
- 点击"拨打电话"按钮可直接拨打
- 拨打失败时自动复制电话号码到剪贴板

---

## 备注

- ✅ 已删除旧的 `home-button` 组件引用
- ✅ 所有页面已统一使用 `nav-header` 组件
- ✅ Logo文件已复制到 `miniprogram/img/` 目录

## 设计一致性

所有页面的导航栏保持一致的：
- Logo尺寸：80rpx × 60rpx
- Logo位置：左上角，padding 20rpx 30rpx
- 标题样式：36rpx，600字重，居中显示
- 点击交互：Logo带有淡入淡出效果（opacity: 0.7）
