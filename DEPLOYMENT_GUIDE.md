# 奶牛线性评定系统 - 部署指南

## 目录

1. [系统架构](#系统架构)
2. [前置条件](#前置条件)
3. [快速部署](#快速部署)
4. [详细部署步骤](#详细部署步骤)
5. [Nginx配置](#nginx配置)
6. [数据库初始化](#数据库初始化)
7. [微信小程序配置](#微信小程序配置)
8. [验证部署](#验证部署)
9. [常见问题](#常见问题)
10. [运维管理](#运维管理)

---

## 系统架构

```
微信小程序前端
     ↓ HTTPS
api.genepop.com (Nginx:443)
     ↓ HTTP
Node.js应用 (PM2:3000)
     ↓
阿里云PolarDB (MySQL)
     ↓
阿里云OSS (图片存储)
```

### 云服务资源

**已配置资源：**
- **ECS服务器**: 39.96.189.27 (华北2-北京)
- **PolarDB数据库**: pc-2zexsvvhgttj6i669.mysql.polardb.rds.aliyuncs.com
- **OSS存储桶**: dairy-scoring-photos (oss-cn-beijing)
- **域名**: api.genepop.com, admin.genepop.com
- **SSL证书**: api.genepop.com (Let's Encrypt)

---

## 前置条件

### 本地开发环境

- [x] macOS/Linux/Windows with Git Bash
- [x] SSH密钥文件: `linear-scoring.pem` (已提供)
- [x] rsync命令 (macOS/Linux自带)

### 服务器环境（部署脚本会自动安装）

- [ ] Node.js 20.x
- [ ] npm
- [ ] PM2进程管理器
- [x] Nginx 1.24.0 (已安装)

### ⚠️ 重要提示：ECS安全隔离

**服务器上运行有其他项目，部署时请务必注意：**

1. ✅ **项目目录隔离**：本项目部署在 `/home/ecs-user/dairy-scoring`，不会影响其他目录
2. ✅ **Nginx配置独立**：使用独立配置文件 `/etc/nginx/sites-available/dairy-scoring-api`
3. ✅ **PM2进程独立**：进程名为 `dairy-scoring-api`，不会与其他项目冲突
4. ✅ **端口独立**：使用端口 3000，如有冲突请在 `.env` 中修改 `PORT` 配置
5. ⚠️ **不要修改**：
   - 全局 Nginx 配置 (`/etc/nginx/nginx.conf`)
   - 其他项目的 sites-enabled 配置
   - 系统级服务和配置

### 阿里云资源

- [x] PolarDB数据库实例
- [x] OSS存储桶
- [x] ECS云服务器
- [x] 域名备案和解析

---

## 快速部署

### 一键部署（推荐）

```bash
# 1. 进入项目目录
cd dairy-linear-scoring

# 2. 确保SSH密钥在项目根目录
ls -l linear-scoring.pem

# 3. 运行部署脚本
./deploy.sh
```

部署脚本会自动完成：
1. ✅ 检查本地文件
2. ✅ 测试SSH连接
3. ✅ 安装Node.js和PM2
4. ✅ 创建远程目录
5. ✅ 同步代码到服务器
6. ✅ 安装npm依赖
7. ⚠️ 初始化数据库（需要确认）
8. ✅ 启动PM2进程

---

## 详细部署步骤

### 步骤1: 准备配置文件

#### 1.1 环境变量配置

生产环境配置已就绪：`server/.env`

```bash
# 查看配置（敏感信息已遮蔽）
cat server/.env
```

**关键配置说明：**
- `DB_HOST`: 使用内网地址（同VPC，免费且快速）
- `JWT_SECRET`: 已生成64位随机密钥
- `OSS_*`: 阿里云OSS配置
- `WECHAT_*`: 微信小程序AppID和Secret

#### 1.2 PM2配置

配置文件：`server/pm2.config.js`

- **进程模式**: cluster (2个实例)
- **内存限制**: 500MB自动重启
- **日志路径**: `logs/error.log` 和 `logs/out.log`

#### 1.3 Nginx配置

配置文件：`server/nginx.conf`

- **HTTP→HTTPS重定向**
- **SSL证书**: Let's Encrypt
- **反向代理**: 3000端口
- **上传限制**: 5MB

### 步骤2: 执行部署

```bash
# 运行一键部署脚本
./deploy.sh
```

**脚本执行过程：**

```
[1/8] 检查本地文件...
  ✓ SSH密钥权限设置为400
  ✓ .env配置文件存在

[2/8] 测试SSH连接...
  ✓ SSH连接正常

[3/8] 安装Node.js和PM2...
  → 安装Node.js 20.x (如果未安装)
  → 安装PM2 (如果未安装)
  ✓ Node.js v20.x.x
  ✓ PM2 v5.x.x

[4/8] 创建远程目录...
  ✓ /home/ecs-user/dairy-scoring
  ✓ /home/ecs-user/dairy-scoring/logs

[5/8] 同步代码到服务器...
  → 排除: node_modules, .git, logs
  ✓ 代码同步完成

[6/8] 安装npm依赖...
  → npm install --production
  ✓ 依赖安装完成

[7/8] 初始化数据库...
  ? 是否需要初始化数据库？(y/n)
  ✓ 数据库初始化完成

[8/8] 启动应用...
  ✓ PM2进程启动
  ✓ 开机自启动配置
```

### 步骤3: 配置Nginx

#### 3.1 部署Nginx配置

```bash
# SSH到服务器
ssh -i linear-scoring.pem ecs-user@39.96.189.27

# 复制配置文件
sudo cp ~/dairy-scoring/nginx.conf /etc/nginx/sites-available/dairy-scoring-api

# 创建软链接
sudo ln -s /etc/nginx/sites-available/dairy-scoring-api /etc/nginx/sites-enabled/

# 删除默认配置（如果存在）
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

#### 3.2 验证Nginx状态

```bash
# 检查Nginx状态
sudo systemctl status nginx

# 查看错误日志（如果有问题）
sudo tail -f /var/log/nginx/dairy-scoring-api.error.log
```

### 步骤4: 验证部署

#### 4.1 检查PM2进程

```bash
ssh -i linear-scoring.pem ecs-user@39.96.189.27 'pm2 status'
```

期望输出：
```
┌─────┬──────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                 │ mode    │ status  │ cpu      │
├─────┼──────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ dairy-scoring-api    │ cluster │ online  │ 0%       │
│ 1   │ dairy-scoring-api    │ cluster │ online  │ 0%       │
└─────┴──────────────────────┴─────────┴─────────┴──────────┘
```

#### 4.2 测试健康检查端点

```bash
# 本地测试（服务器内部）
curl http://localhost:3000/health

# 公网测试（HTTPS）
curl https://api.genepop.com/health
```

期望返回：
```json
{"status":"ok","timestamp":"2025-12-30T..."}
```

#### 4.3 查看应用日志

```bash
# 实时日志
ssh -i linear-scoring.pem ecs-user@39.96.189.27 'pm2 logs dairy-scoring-api'

# 最近20条日志
ssh -i linear-scoring.pem ecs-user@39.96.189.27 'pm2 logs dairy-scoring-api --lines 20 --nostream'
```

---

## 数据库初始化

### 首次部署（创建表结构）

数据库初始化脚本会创建以下表：
- `farms` - 牧场信息
- `appraisers` - 鉴定员信息
- `appraiser_farms` - 鉴定员-牧场关联
- `users` - 微信用户
- `cattle` - 牛只信息
- `scores` - 评分记录（含20个性状字段）
- `photos` - 照片记录

### 手动初始化

```bash
# SSH到服务器
ssh -i linear-scoring.pem ecs-user@39.96.189.27

# 进入项目目录
cd ~/dairy-scoring

# 运行初始化脚本
node src/scripts/init-db.js
```

**注意事项：**
- ✅ 脚本会先删除旧表（DROP TABLE IF EXISTS）
- ✅ 会创建4个测试牧场（YQN001-YQN004）
- ✅ 会创建4个测试鉴定员
- ⚠️ 生产环境慎用（会清空数据）

### 仅创建表结构（不插入测试数据）

编辑 `src/scripts/init-db.js`，注释掉插入测试数据的部分：

```javascript
// 注释掉以下行
// await insertTestData()
```

---

## 微信小程序配置

### 1. 配置服务器域名

登录微信公众平台：
1. 进入 "开发" → "开发管理" → "开发设置"
2. 在 "服务器域名" 中添加：
   - **request合法域名**: `https://api.genepop.com`
   - **uploadFile合法域名**: `https://api.genepop.com`
   - **downloadFile合法域名**: `https://api.genepop.com`

### 2. 配置业务域名

在 "开发设置" → "业务域名" 中添加：
- `https://api.genepop.com`

### 3. 上传小程序代码

```bash
# 1. 打开微信开发者工具
# 2. 导入项目: dairy-linear-scoring/miniprogram
# 3. AppID: wx909884d604221d6a
# 4. 点击"上传"
# 5. 填写版本号和项目备注
```

### 4. 提交审核

1. 登录微信公众平台
2. 进入 "版本管理" → "开发版本"
3. 点击 "提交审核"
4. 填写审核信息
5. 等待审核通过（通常1-7天）

---

## 验证部署

### 完整测试清单

#### 后端API测试

```bash
# 1. 健康检查
curl https://api.genepop.com/health

# 2. 获取牧场列表（需要token）
curl -X POST https://api.genepop.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"code":"微信登录code"}'

# 3. 测试图片上传（需要token）
curl -X POST https://api.genepop.com/api/photos/upload \
  -H "Authorization: Bearer <token>" \
  -F "photo=@test.jpg"
```

#### 数据库连接测试

```bash
ssh -i linear-scoring.pem ecs-user@39.96.189.27

cd ~/dairy-scoring

# 测试数据库连接
node -e "
const db = require('./src/config/database');
db.query('SELECT 1+1 AS result')
  .then(([rows]) => console.log('数据库连接成功:', rows))
  .catch(err => console.error('数据库连接失败:', err))
  .finally(() => process.exit());
"
```

#### OSS上传测试

```bash
node -e "
const OSS = require('ali-oss');
const client = require('./src/config/oss');
client.list({ 'max-keys': 1 })
  .then(result => console.log('OSS连接成功:', result))
  .catch(err => console.error('OSS连接失败:', err))
  .finally(() => process.exit());
"
```

---

## 常见问题

### 1. SSH连接失败

**问题**: `Permission denied (publickey)`

**解决方案**:
```bash
# 检查密钥权限
chmod 400 linear-scoring.pem

# 使用正确的用户名
ssh -i linear-scoring.pem ecs-user@39.96.189.27  # ✓ 正确
ssh -i linear-scoring.pem root@39.96.189.27      # ✗ 错误
```

### 2. 数据库连接失败

**问题**: `ECONNREFUSED` 或 `ETIMEDOUT`

**可能原因**:
- PolarDB白名单未添加ECS内网IP
- 使用了公网地址而非内网地址

**解决方案**:
```bash
# 1. 检查ECS内网IP
ssh -i linear-scoring.pem ecs-user@39.96.189.27 'ip addr show eth0'

# 2. 在阿里云控制台添加白名单
# PolarDB → 数据安全性 → 白名单设置 → 添加ECS内网IP

# 3. 确认使用内网地址
# server/.env 中 DB_HOST 应为:
# DB_HOST=pc-2zexsvvhgttj6i669.mysql.polardb.rds.aliyuncs.com
```

### 3. PM2进程异常退出

**问题**: PM2显示 `errored` 或 `stopped`

**诊断步骤**:
```bash
# 查看错误日志
ssh -i linear-scoring.pem ecs-user@39.96.189.27 'pm2 logs dairy-scoring-api --err --lines 50'

# 查看详细信息
ssh -i linear-scoring.pem ecs-user@39.96.189.27 'pm2 show dairy-scoring-api'

# 重启进程
ssh -i linear-scoring.pem ecs-user@39.96.189.27 'pm2 restart dairy-scoring-api'
```

### 4. Nginx 502 Bad Gateway

**问题**: 访问 `https://api.genepop.com` 返回502

**可能原因**:
- Node.js应用未启动
- 端口3000被占用
- 防火墙阻止

**解决方案**:
```bash
# 1. 检查PM2状态
ssh -i linear-scoring.pem ecs-user@39.96.189.27 'pm2 status'

# 2. 检查端口占用
ssh -i linear-scoring.pem ecs-user@39.96.189.27 'sudo netstat -tulpn | grep 3000'

# 3. 检查防火墙（如果启用）
ssh -i linear-scoring.pem ecs-user@39.96.189.27 'sudo ufw status'

# 4. 查看Nginx错误日志
ssh -i linear-scoring.pem ecs-user@39.96.189.27 'sudo tail -f /var/log/nginx/dairy-scoring-api.error.log'
```

### 5. OSS上传失败

**问题**: 图片上传返回403或超时

**可能原因**:
- AccessKey权限不足
- Bucket不存在或地域错误
- 网络问题

**解决方案**:
```bash
# 检查OSS配置
ssh -i linear-scoring.pem ecs-user@39.96.189.27

cd ~/dairy-scoring

# 测试OSS连接
node -e "
const client = require('./src/config/oss');
console.log('OSS配置:', {
  region: client.options.region,
  bucket: client.options.bucket
});
client.list({ 'max-keys': 1 })
  .then(() => console.log('✓ OSS连接成功'))
  .catch(err => console.error('✗ OSS连接失败:', err.message));
"
```

### 6. 微信小程序请求失败

**问题**: 小程序调用API返回 `request:fail`

**检查清单**:
- [ ] 域名已添加到服务器域名白名单
- [ ] 使用HTTPS协议（不能是HTTP）
- [ ] SSL证书有效期未过期
- [ ] 后端CORS配置正确

**验证HTTPS**:
```bash
# 检查SSL证书
curl -vI https://api.genepop.com/health 2>&1 | grep -i ssl

# 检查证书有效期
ssh -i linear-scoring.pem ecs-user@39.96.189.27 \
  'sudo openssl x509 -in /etc/letsencrypt/live/api.genepop.com/cert.pem -noout -dates'
```

---

## 运维管理

### 日常运维命令

#### PM2进程管理

```bash
# 查看进程状态
pm2 status

# 查看实时日志
pm2 logs dairy-scoring-api

# 重启应用
pm2 restart dairy-scoring-api

# 停止应用
pm2 stop dairy-scoring-api

# 删除进程
pm2 delete dairy-scoring-api

# 查看进程详情
pm2 show dairy-scoring-api

# 监控CPU和内存
pm2 monit
```

#### 日志管理

```bash
# 查看PM2日志
pm2 logs dairy-scoring-api --lines 100

# 查看Nginx访问日志
sudo tail -f /var/log/nginx/dairy-scoring-api.access.log

# 查看Nginx错误日志
sudo tail -f /var/log/nginx/dairy-scoring-api.error.log

# 清理旧日志（PM2）
pm2 flush
```

#### 数据库维护

```bash
# 备份数据库
ssh -i linear-scoring.pem ecs-user@39.96.189.27 << 'EOF'
mysqldump -h pc-2zexsvvhgttj6i669.mysql.polardb.rds.aliyuncs.com \
  -u linear_scoring -p'Barton_0411' dairy_scoring \
  > ~/backup_$(date +%Y%m%d_%H%M%S).sql
EOF

# 下载备份到本地
scp -i linear-scoring.pem \
  ecs-user@39.96.189.27:~/backup_*.sql \
  ./backups/
```

### 更新部署

#### 更新代码（不重启数据库）

```bash
# 方式1: 重新运行部署脚本（跳过数据库初始化）
./deploy.sh
# 提示时选择 'n' 不初始化数据库

# 方式2: 手动更新
rsync -avz --progress \
  -e "ssh -i linear-scoring.pem -o StrictHostKeyChecking=no" \
  --exclude 'node_modules' --exclude '.env' \
  ./server/ ecs-user@39.96.189.27:~/dairy-scoring/

ssh -i linear-scoring.pem ecs-user@39.96.189.27 \
  'cd ~/dairy-scoring && npm install --production && pm2 restart dairy-scoring-api'
```

#### 更新环境变量

```bash
# 1. 修改本地 server/.env
nano server/.env

# 2. 同步到服务器
scp -i linear-scoring.pem server/.env ecs-user@39.96.189.27:~/dairy-scoring/.env

# 3. 重启应用
ssh -i linear-scoring.pem ecs-user@39.96.189.27 'pm2 restart dairy-scoring-api'
```

### 性能监控

#### 系统资源监控

```bash
# CPU和内存使用
ssh -i linear-scoring.pem ecs-user@39.96.189.27 'top -bn1 | head -20'

# 磁盘使用
ssh -i linear-scoring.pem ecs-user@39.96.189.27 'df -h'

# PM2监控
ssh -i linear-scoring.pem ecs-user@39.96.189.27 'pm2 monit'
```

#### API性能测试

```bash
# 并发测试（需要安装ab工具）
ab -n 1000 -c 10 https://api.genepop.com/health

# 响应时间测试
time curl https://api.genepop.com/health
```

### SSL证书续期

```bash
# Let's Encrypt证书自动续期（certbot）
ssh -i linear-scoring.pem ecs-user@39.96.189.27

# 测试续期
sudo certbot renew --dry-run

# 手动续期
sudo certbot renew

# 续期后重启Nginx
sudo systemctl reload nginx
```

---

## 安全建议

### 1. 服务器安全

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 配置防火墙（仅允许22, 80, 443）
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 禁用root SSH登录
sudo nano /etc/ssh/sshd_config
# 设置: PermitRootLogin no
sudo systemctl restart sshd
```

### 2. 数据库安全

- ✅ 使用内网连接（已配置）
- ✅ 白名单限制访问
- ⚠️ 定期备份数据库
- ⚠️ 定期更新密码

### 3. API安全

- ✅ HTTPS加密传输
- ✅ JWT token认证
- ⚠️ 实施请求限流
- ⚠️ 添加API日志审计

---

## 总结

### 部署检查清单

- [x] 阿里云资源准备完成
- [x] 环境变量配置完成
- [x] SSH密钥配置完成
- [ ] 运行部署脚本
- [ ] Nginx配置完成
- [ ] 数据库初始化完成
- [ ] API健康检查通过
- [ ] 微信小程序域名配置
- [ ] 小程序代码上传

### 关键文件清单

```
dairy-linear-scoring/
├── deploy.sh                    # 一键部署脚本
├── linear-scoring.pem          # SSH密钥
├── server/
│   ├── .env                    # 生产环境配置
│   ├── .env.example            # 配置模板
│   ├── pm2.config.js           # PM2配置
│   ├── nginx.conf              # Nginx配置
│   └── src/
│       ├── app.js              # 应用入口
│       └── scripts/init-db.js  # 数据库初始化
└── DEPLOYMENT_GUIDE.md         # 本文档
```

### 支持与反馈

如有问题，请检查：
1. [常见问题](#常见问题) 章节
2. 应用日志：`pm2 logs dairy-scoring-api`
3. Nginx日志：`/var/log/nginx/dairy-scoring-api.error.log`

---

**文档版本**: 1.0
**最后更新**: 2025-12-30
**适用版本**: dairy-linear-scoring v1.0
