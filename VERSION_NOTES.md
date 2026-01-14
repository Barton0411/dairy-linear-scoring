# 版本更新说明

## v1.1.0 - 权限系统修复与微信审核合规 (2026-01-06)

### 🔒 权限系统修复（高优先级安全更新）

#### 移除硬编码，统一RBAC权限控制
- **移除所有硬编码工号检查**：清除了后端和前端所有对特定工号（`'10075345'`）的硬编码检查
- **统一使用角色字段**：所有权限判断改为基于 `role` 字段（`appraiser` / `admin` / `super_admin`）
- **修复权限中间件应用**：
  - `GET /api/farms` - 拆分为普通用户接口和管理员接口 `/api/farms/admin/all`
  - `GET /api/appraisers` - 添加 `adminOnly` 保护
  - `GET /api/appraiser-farms` - 添加 `adminOnly` 保护
  - `POST /api/certificates/review` - 使用 `superAdminOnly` 中间件替代硬编码
  - `GET /api/certificates/pending` - 使用 `superAdminOnly` 中间件替代硬编码

#### 修复严重安全漏洞
- **移除 query 参数权限绕过**：修复了 `GET /api/farms?admin=true` 可被任意用户使用的漏洞
- **添加评分记录权限保护**：
  - `GET /api/scores/:id` - 只能查看自己的记录或管理员查看所有
  - `GET /api/farms/:code/scores` - 只能查看被分配牧场的记录或管理员查看所有
  - `POST /api/export` - 只能导出被分配牧场的记录或管理员导出所有

#### 权限分级调整
- **牧场匹配权限降级**：`POST/DELETE /api/appraiser-farms` 从 `superAdminOnly` 降级为 `adminOnly`
- **角色管理保持不变**：添加/修改/删除鉴定员仍需要 `super_admin` 权限

### 🔄 用户体验改进

#### 角色更新实时同步
- **问题**：在管理后台修改鉴定员角色后，设置页面不会立即显示新角色
- **修复**：
  - 后端 `/api/user/info` 接口返回最新的 `role` 字段（JOIN appraisers 表）
  - 前端 settings 页面 `onShow()` 时自动调用 API 刷新用户信息
  - 更新本地存储和 MobX store 中的 role 字段

#### 退出登录逻辑增强
- **问题**：退出后再次登录可能自动认证，不需要重新验证工号和姓名
- **修复**：
  - 增强 `/api/auth/unbind` 接口日志，便于排查问题
  - 确保 `employee_id` 和 `appraiser_name` 正确清空
  - 下次登录必须重新进行工号和姓名验证

### ✅ 微信小程序审核合规改造

#### 实现游客模式（Browser-before-login）
- **审核要求**：不能在用户未浏览功能前就要求授权登录
- **解决方案**：
  - 登录页新增"游客模式"按钮，允许用户未登录直接进入首页
  - 首页支持游客浏览，显示"未登录"状态和功能介绍
  - 点击用户信息区域（未登录时）可跳转到登录页
  - 尝试使用功能时（开始评分、查看记录、牧场选择）弹窗提示登录
  - 记录页面支持游客访问，显示登录提示

#### 登录界面优化
- **按钮文字优化**：
  - "微信一键登录" → "登录认证"
  - "先看看功能介绍" → "游客模式"
- **按钮样式修复**：
  - 修复登录按钮和游客模式按钮文字未垂直居中的问题
  - 统一使用 `display: flex` + `align-items: center` 实现居中
  - 调整按钮高度和内边距，确保视觉平衡

### 📦 其他改进

- **导出功能完善**：服务器端生成真正的 .xlsx 文件，添加 `xlsx` 依赖
- **数据库初始化**：完善 `init-db.js` 脚本，支持快速部署

---

## 部署清单

### 后端文件修改
- `server/src/routes/certificate.js` - 使用 middleware 替代硬编码
- `server/src/routes/appraiser.js` - 移除硬编码，添加权限保护
- `server/src/routes/farm.js` - 拆分接口，修复权限漏洞
- `server/src/routes/appraiser-farm.js` - 降级权限，添加保护
- `server/src/routes/score.js` - 添加评分记录权限检查
- `server/src/routes/export.js` - 添加导出权限检查
- `server/src/routes/user.js` - 返回最新 role 字段
- `server/src/routes/auth.js` - 增强 unbind 日志

### 前端文件修改
- `miniprogram/utils/request.js` - 更新 getAllFarms() 调用新接口
- `miniprogram/pages/login/` - 添加游客模式按钮，优化样式
- `miniprogram/pages/index/` - 支持游客模式，移除强制登录
- `miniprogram/pages/records/list/` - 支持游客访问
- `miniprogram/pages/settings/` - 添加用户信息自动刷新
- `miniprogram/pages/farm-create/` - 统一使用 role 字段
- `miniprogram/pages/farm-select/` - 统一使用 role 字段
- `miniprogram/pages/admin-panel/` - 移除硬编码检查

---

## 安全性提升

✅ 移除所有硬编码工号检查，符合 RBAC 最佳实践
✅ 修复读取接口权限漏洞，防止越权访问
✅ 修复评分记录权限漏洞，确保数据隔离
✅ 统一前后端权限判断逻辑
✅ 增强日志记录，便于安全审计

---

## 合规性提升

✅ 符合微信小程序审核要求（允许游客浏览后自主选择登录）
✅ 改善用户体验（无需强制登录即可了解功能）
✅ 保持功能完整性（登录后使用完整功能）

---

## 测试建议

### 权限测试
1. 测试普通鉴定员无法访问管理接口
2. 测试鉴定员只能查看被分配牧场的评分记录
3. 测试管理员可以查看所有牧场和评分记录
4. 测试超级管理员可以管理鉴定员和审批证书

### 游客模式测试
1. 未登录状态下进入小程序，检查首页是否正常显示
2. 点击"开始评分"/"查看记录"/"牧场选择"，检查是否弹出登录提示
3. 点击用户信息区域，检查是否跳转到登录页
4. 使用"游客模式"按钮进入，检查体验流程

### 角色更新测试
1. 在管理后台修改鉴定员角色
2. 鉴定员进入设置页面，检查角色是否立即更新
3. 退出登录，检查是否需要重新验证工号和姓名

---

**重要提示**：此版本包含重要安全修复，建议尽快部署到生产环境。
