# 奶牛线性评定系统 - 完整需求与阿里云部署状态分析

## 一、项目完整需求与业务逻辑

### 1.1 核心业务流程

```
鉴定员登录 → 选择牧场 → 录入牛只信息 → 评分（统一） → 拍照 → 提交结果
     ↓                                                                      ↓
  身份认证                                                            数据存储
  (工号+姓名)                                                    (本地→云端PolarDB)
     ↓                                                                      ↓
查询可访问牧场                                                        照片上传
  (权限控制)                                                        (阿里云OSS)
     ↓                                                                      ↓
进入评分系统                                                         导出数据
 (离线可用)                                                         (Excel/CSV)
```

### 1.2 技术架构全貌

```
┌─────────────────────────────────────────────────────────────┐
│                    微信小程序前端                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 登录认证  │  │ 评分录入  │  │ 照片拍摄  │  │ 数据导出  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│         ↓              ↓              ↓              ↓       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          MobX Store（状态管理）                       │   │
│  │  - 当前评分数据  - 用户信息  - 牧场列表  - 设置      │   │
│  └──────────────────────────────────────────────────────┘   │
│         ↓                                           ↓        │
│  ┌─────────────┐                           ┌─────────────┐  │
│  │  本地存储    │                           │  网络请求    │  │
│  │ (离线评分)  │                           │  (API调用)  │  │
│  └─────────────┘                           └─────────────┘  │
└────────────────────────────────────┬────────────────────────┘
                                     │ HTTPS API
                                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Node.js 后端服务 (阿里云 ECS)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 认证路由  │  │ 评分路由  │  │ 照片路由  │  │ 同步路由  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│         ↓              ↓              ↓              ↓       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              JWT 认证中间件                           │   │
│  └──────────────────────────────────────────────────────┘   │
│         ↓                                           ↓        │
│  ┌─────────────┐                           ┌─────────────┐  │
│  │  PolarDB    │                           │  阿里云OSS   │  │
│  │  连接池     │                           │  客户端      │  │
│  └─────────────┘                           └─────────────┘  │
└────────────────────────────────────┬────────────────────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  ↓                  ↓                  ↓
         ┌─────────────┐    ┌─────────────┐   ┌─────────────┐
         │ 阿里云       │    │ 阿里云       │   │ 阿里云       │
         │ PolarDB     │    │ OSS         │   │ ECS         │
         │ (MySQL)     │    │ (对象存储)   │   │ (计算服务)   │
         └─────────────┘    └─────────────┘   └─────────────┘
```

### 1.3 数据流向详解

#### 场景1：在线评分提交
```
1. 用户评分 → 2. 校验完整性 → 3. 提交到后端API
                                     ↓
4. 后端保存到PolarDB ← 5. 上传照片到OSS ← 6. 返回成功
```

#### 场景2：离线评分存储
```
1. 用户评分 → 2. 检测网络断开 → 3. 保存到本地Storage
                                          ↓
4. 网络恢复 → 5. 自动同步API ← 6. 批量上传 ← 7. 清除本地
```

#### 场景3：照片上传流程
```
1. 拍照/选图 → 2. 压缩(200-500KB) → 3. 生成UUID → 4. 上传到OSS
                                                         ↓
5. 返回OSS URL ← 6. 保存URL到PolarDB ← 7. 关联评分记录
```

---

## 二、阿里云三大服务的具体作用

### 2.1 阿里云 PolarDB（核心数据存储）

**用途**：MySQL兼容的云原生数据库

**存储内容**：
- 7张数据表：farms, appraisers, appraiser_farms, users, cattle, scores, photos
- 所有评分记录（每条包含20个性状分数 + 元数据）
- 用户认证信息和权限关系
- 照片元数据（OSS URL存储在这里）

**代码位置**：
- 配置：`server/src/config/database.js`
- 初始化：`server/src/scripts/init-db.js`
- 使用：所有 `server/src/routes/*.js` 文件

**必需配置项**：
```env
DB_HOST=pc-xxxxx.mysql.polardb.rds.aliyuncs.com
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=dairy_scoring
```

**关键特性**：
- 连接池（10个连接）
- 自动重连（enableKeepAlive）
- 事务支持
- 外键约束（级联删除）

### 2.2 阿里云 OSS（对象存储服务）

**用途**：永久存储牛只照片

**存储结构**：
```
dairy-scoring-photos/
└── photos/
    └── 2025/
        └── 12/
            ├── uuid-1.jpg
            ├── uuid-2.jpg
            └── ...
```

**代码位置**：
- 配置：`server/src/config/oss.js`
- 上传：`server/src/routes/photo.js`
- 客户端压缩：`miniprogram/utils/util.js` (compressImage)

**必需配置项**：
```env
OSS_REGION=oss-cn-beijing
OSS_ACCESS_KEY_ID=LTAI5xxxxxxx
OSS_ACCESS_KEY_SECRET=xxxxxxxxxxxxxxx
OSS_BUCKET=dairy-scoring-photos
```

**上传流程**：
```javascript
// 1. 小程序端压缩图片（目标200-500KB）
compressImage(tempFilePath, maxWidth=1920)

// 2. 上传到后端API
POST /api/photos/upload
- file: 图片二进制
- scoreId: 关联评分ID

// 3. 后端生成UUID文件名
const fileName = `photos/${year}/${month}/${uuid()}.${ext}`

// 4. 上传到OSS
await ossClient.put(fileName, fileBuffer)

// 5. 保存记录到PolarDB
INSERT INTO photos (score_id, oss_key, oss_url, ...)
```

**约束条件**：
- 单张最大5MB
- 仅支持JPG/PNG格式
- 照片永久保存，不可删除

### 2.3 阿里云 ECS（后端服务器）

**用途**：运行Node.js后端API服务

**部署内容**：
- Node.js运行环境
- Express应用（`server/src/app.js`）
- PM2进程管理器（推荐）
- Nginx反向代理（可选）

**端口配置**：
- Node.js: 3000（默认）
- Nginx: 80/443（HTTPS）

**推荐规格**：
- CPU: 2核
- 内存: 4GB
- 带宽: 3Mbps
- 系统: CentOS 7.x / Ubuntu 20.04

---

## 三、当前代码的云服务准备度

### 3.1 代码完成度分析

| 组件 | 完成度 | 说明 |
|------|--------|------|
| **PolarDB连接代码** | ✅ 100% | database.js完整，支持连接池 |
| **OSS上传代码** | ✅ 100% | oss.js完整，photo.js路由完整 |
| **数据库表结构** | ✅ 100% | init-db.js定义7张表，已修正权重注释 |
| **API路由** | ✅ 95% | 11个端点已实现，缺2个（join/leave farm） |
| **认证中间件** | ✅ 100% | JWT验证完整，30天有效期 |
| **错误处理** | ✅ 80% | 基础错误处理完整，缺统一拦截器 |
| **环境变量读取** | ✅ 100% | 使用dotenv，支持.env文件 |

### 3.2 配置文件完成度

| 文件 | 状态 | 说明 |
|------|------|------|
| `.env.example` | ✅ 已创建 | 刚刚创建，包含所有必需变量 |
| `.env`（实际配置） | ❌ 未创建 | 需要您填写真实密钥 |
| `pm2.config.js` | ❌ 缺失 | 生产环境进程管理配置 |
| `nginx.conf` | ❌ 缺失 | Nginx反向代理配置（可选） |

### 3.3 部署文档完成度

| 文档类型 | 状态 | 说明 |
|---------|------|------|
| 阿里云资源创建指南 | ❌ 缺失 | 如何创建PolarDB/OSS/ECS |
| 环境配置说明 | ⚠️ 部分 | .env.example有注释，缺详细说明 |
| 部署步骤文档 | ❌ 缺失 | 代码上传、依赖安装、启动服务 |
| 数据库初始化指南 | ⚠️ 部分 | 有init-db.js，缺运行说明 |
| 故障排查手册 | ❌ 缺失 | 常见错误和解决方案 |

---

## 四、阿里云资源需求清单

### 4.1 必需资源（生产环境）

#### 1. PolarDB MySQL 数据库
- **版本**：PolarDB MySQL 8.0
- **规格**：2核4GB（按量付费）或 1核2GB（包年包月）
- **存储**：20GB起（可扩展）
- **网络**：VPC网络，与ECS在同一区域
- **白名单**：添加ECS内网IP
- **预估费用**：约 ¥200-400/月（按量）

**初始化步骤**：
1. 创建数据库实例
2. 创建数据库 `dairy_scoring`
3. 创建用户并授权
4. 在ECS上运行：`npm run db:init`

#### 2. OSS 对象存储
- **存储类型**：标准存储
- **读写权限**：私有读写
- **跨域规则**：允许小程序域名
- **生命周期**：无（照片永久保存）
- **预估费用**：¥0.12/GB/月 + 流量费

**配置步骤**：
1. 创建Bucket：`dairy-scoring-photos`
2. 设置权限为私有
3. 配置跨域CORS（允许小程序上传）
4. 创建RAM子账号，授予OSS读写权限
5. 获取AccessKey ID和Secret

#### 3. ECS 云服务器
- **实例规格**：ecs.t6-c1m2.large（2核4GB）
- **操作系统**：CentOS 7.9 或 Ubuntu 20.04
- **带宽**：3Mbps（按量）
- **系统盘**：40GB SSD
- **安全组**：开放80, 443, 3000端口
- **预估费用**：¥150-250/月（按量）

**环境准备**：
```bash
# 1. 安装Node.js 16+
curl -fsSL https://rpm.nodesource.com/setup_16.x | bash -
yum install -y nodejs

# 2. 安装PM2
npm install -g pm2

# 3. 安装Git
yum install -y git

# 4. （可选）安装Nginx
yum install -y nginx
```

### 4.2 可选资源（优化）

- **CDN加速**：加速OSS图片访问
- **负载均衡**：多实例部署
- **云监控**：性能监控和告警
- **日志服务**：集中日志管理

---

## 五、从零到部署的完整步骤

### 阶段1：阿里云资源准备（预计2小时）

1. **创建PolarDB实例**
   - 登录阿里云控制台
   - 选择 PolarDB → 创建实例
   - 配置规格、网络、密码
   - 等待创建完成（约15分钟）
   - 创建数据库 `dairy_scoring`

2. **创建OSS存储桶**
   - 对象存储OSS → 创建Bucket
   - 区域选择与ECS相同
   - 权限设置为私有
   - 跨域配置（允许*.qq.com）

3. **购买ECS服务器**
   - 云服务器ECS → 创建实例
   - 选择规格、系统、带宽
   - 配置安全组规则
   - SSH登录测试

4. **配置RAM权限**
   - 创建RAM子账号
   - 授予OSS和PolarDB权限
   - 获取AccessKey

### 阶段2：ECS环境配置（预计1小时）

```bash
# 1. 安装Node.js
curl -fsSL https://rpm.nodesource.com/setup_16.x | bash -
yum install -y nodejs

# 2. 安装PM2
npm install -g pm2

# 3. 克隆代码
git clone <your-repo-url>
cd dairy-linear-scoring/server

# 4. 安装依赖
npm install

# 5. 创建.env文件
cp .env.example .env
vi .env  # 填写真实配置

# 6. 初始化数据库
npm run db:init

# 7. 启动服务
pm2 start src/app.js --name dairy-api
pm2 save
pm2 startup
```

### 阶段3：域名和HTTPS（预计1小时）

```bash
# 1. 安装Nginx
yum install -y nginx

# 2. 配置反向代理
vi /etc/nginx/conf.d/dairy-api.conf

# 3. 申请SSL证书（Let's Encrypt）
yum install -y certbot python3-certbot-nginx
certbot --nginx -d api.yourdomain.com

# 4. 启动Nginx
systemctl start nginx
systemctl enable nginx
```

### 阶段4：小程序配置（预计30分钟）

```javascript
// miniprogram/utils/request.js
const BASE_URL = 'https://api.yourdomain.com'  // 修改为实际域名

// 微信公众平台
// 1. 配置服务器域名
// 2. 配置业务域名
// 3. 配置上传文件域名（OSS）
```

### 阶段5：测试验证（预计1小时）

1. **后端API测试**
   ```bash
   curl https://api.yourdomain.com/health
   ```

2. **数据库连接测试**
   - 检查PM2日志
   - 验证表已创建

3. **OSS上传测试**
   - 使用Postman测试上传接口
   - 验证文件在OSS中

4. **小程序端到端测试**
   - 登录 → 选牧场 → 评分 → 拍照 → 提交
   - 检查数据库记录
   - 检查OSS照片

---

## 六、当前缺失的内容清单

### 6.1 配置文件
- ✅ `.env.example`（已创建）
- ❌ `pm2.config.js`（进程管理配置）
- ❌ `nginx.conf`（反向代理配置）
- ❌ `.gitignore`（忽略.env文件）

### 6.2 部署文档
- ❌ `DEPLOYMENT.md`（完整部署指南）
- ❌ `ALIYUN_SETUP.md`（阿里云资源创建图文教程）
- ❌ `TROUBLESHOOTING.md`（故障排查手册）
- ❌ `API_DOCS.md`（API接口文档）

### 6.3 运维脚本
- ❌ `deploy.sh`（一键部署脚本）
- ❌ `backup.sh`（数据库备份脚本）
- ❌ `health-check.sh`（健康检查脚本）

### 6.4 监控和日志
- ❌ 日志收集配置
- ❌ 性能监控配置
- ❌ 错误告警配置

---

## 七、总结回答：阿里云平台内容完成了么？

### 答案：**代码层面完成 ✅，资源和文档层面未完成 ❌**

#### ✅ 已完成（代码ready）
1. PolarDB连接代码 100%
2. OSS上传代码 100%
3. 数据库表结构 100%
4. API路由 95%
5. 环境变量配置模板 100%

#### ❌ 未完成（需要您操作）
1. **阿里云资源未创建**（PolarDB/OSS/ECS都还没买）
2. **配置文件未填写**（.env文件中的密钥是空的）
3. **部署文档不完整**（缺少图文教程）
4. **代码未上传到ECS**（还在本地）
5. **小程序未配置域名**（request.js中的BASE_URL需要改）

#### ⚠️ 需要明确的问题
1. **您是否已经购买了阿里云资源？**
2. **如果还没有，您需要我提供购买和配置的详细教程吗？**
3. **您希望我帮您创建部署脚本吗？**
4. **您的技术背景如何？需要多详细的文档？**

---

## 八、下一步建议

### 如果您还没有阿里云资源
👉 **我需要为您创建**：
1. 阿里云资源创建的图文教程（带截图）
2. 完整的部署文档
3. 一键部署脚本

### 如果您已经有阿里云资源
👉 **我需要您提供**：
1. PolarDB连接地址
2. OSS配置信息
3. ECS的IP地址

然后我帮您：
1. 填写.env配置文件
2. 创建PM2和Nginx配置
3. 编写部署脚本

---

**请您告诉我，您目前处于哪个阶段？** 这样我才能提供最精准的帮助！
