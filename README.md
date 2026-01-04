# 奶牛线性评定系统 | Dairy Linear Scoring System

## 📋 项目简介 | Project Overview

本项目旨在开发一个移动端奶牛体型外貌线性评定系统，用于专业鉴定人员在牧场现场对奶牛进行标准化评分。

This project aims to develop a mobile dairy cattle conformation linear scoring system for professional classifiers to conduct standardized evaluations at dairy farms.

## 🎯 核心功能 | Core Features

### 1. 统一评分流程 | Unified Scoring Flow
- **默认分预填**：进入评分页时 20 个性状均带默认分（可在设置中调整）
- **只改异常性状**：未修改显示“默认”，支持单项/全部恢复默认分
- **也可全量评分**：需要时可逐一调整所有性状（1-9分）

### 2. 评定性状 | Scoring Traits
基于 GB/T 35568-2017 和 T/DACS 002-2021 标准：

**体躯容量（18%）**
- 体高、胸宽、体深、腰强度

**尻部（10%）**
- 尻角度、尻宽、腰强度

**肢蹄（20%）**
- 蹄角度、蹄踵深度、骨质地、后肢侧视、后肢后视

**泌乳系统（42%）**
- 乳房深度、中央悬韧带、前乳房附着、前乳头位置、前乳头长度
- 后乳房附着高度、后乳房附着宽度、后乳头位置

**乳用特征（10%）**
- 棱角性

### 3. 拍照存储 | Photo Storage
- 高分/低分牛只自动提示拍照
- 严重缺陷性状记录
- 图片压缩与云端同步

### 4. 数据管理 | Data Management
- 离线评分存储
- 数据导出（Excel/PDF）
- 云端平台上传

## 📂 项目结构 | Project Structure

```
dairy-linear-scoring/
├── miniprogram/            # 微信小程序前端
│   ├── pages/             # 页面目录
│   │   ├── login/         # 登录认证
│   │   ├── farm-select/   # 牧场选择
│   │   ├── scoring/       # 评分页面
│   │   │   ├── info/      # 牛只信息录入
│   │   │   ├── unified/   # 统一评分页（默认分 + 快速修改）
│   │   │   ├── photo/     # 拍照功能
│   │   │   └── result/    # 评分结果
│   │   ├── records/       # 评分记录
│   │   ├── settings/      # 设置页面
│   │   └── admin-panel/   # 管理后台
│   ├── store/             # MobX状态管理
│   ├── utils/             # 工具函数
│   └── components/        # 公共组件
├── server/                # Node.js后端
│   ├── src/
│   │   ├── routes/        # API路由
│   │   ├── config/        # 配置文件
│   │   ├── middleware/    # 中间件
│   │   └── scripts/       # 数据库脚本
│   ├── .env               # 生产环境配置
│   ├── pm2.config.js      # PM2进程管理
│   └── nginx.conf         # Nginx配置
├── docs/                  # 标准文档
│   ├── 569e46c1...pdf    # GB/T 35568-2017
│   ├── da451265...pdf    # T/DACS 002-2021
│   └── development-plan.md # 开发计划
├── deploy.sh              # 一键部署脚本
├── DEPLOYMENT_GUIDE.md    # 部署文档
└── README.md              # 项目说明
```

## 🛠️ 技术栈 | Technology Stack

### 前端
- **框架**: 微信小程序原生开发
- **状态管理**: MobX (mobx-miniprogram)
- **UI组件**: 自定义组件 + WeUI
- **离线存储**: wx.storage

### 后端
- **运行环境**: Node.js 20.x
- **Web框架**: Express.js
- **认证方式**: JWT (jsonwebtoken)
- **图片处理**: Multer
- **进程管理**: PM2 (cluster模式)

### 数据库与存储
- **数据库**: 阿里云PolarDB (MySQL兼容)
- **对象存储**: 阿里云OSS (图片存储)
- **服务器**: 阿里云ECS (华北2-北京)

### 部署与运维
- **反向代理**: Nginx 1.24.0
- **HTTPS证书**: Let's Encrypt
- **域名**: api.genepop.com
- **部署方式**: 一键脚本部署

## 📱 功能设计 | Feature Design

### 评分界面
```
[牛只基本信息]
耳号：____________  胎次：___  泌乳天数：___

[性状评分]
体高：  1  2  3  4  [5]  6  7  8  9
胸宽：  1  2  3  4  [5]  6  7  8  9
...

[拍照]  [保存]  [提交]
```

### 拍照触发规则
- 体型总分 ≥ 85分（优秀）
- 体型总分 ≤ 65分（较差）
- 存在严重缺陷性状

## 📊 评分标准 | Scoring Standards

体型等级划分（GB/T 35568-2017）：
- 优（Ex）：90-100分
- 很好（VG）：85-89分
- 好佳（GP）：80-84分
- 好（G）：75-79分
- 一般（F）：65-74分
- 差（P）：65分以下

## ✅ 开发完成度 | Development Status

### 核心功能（100%）
- [x] 微信登录与鉴定员认证
- [x] 牧场选择与管理
- [x] 牛只信息录入
- [x] 评分流程（默认分预填 + 快速修改异常性状）
- [x] 拍照功能（压缩、云端上传）
- [x] 评分结果展示与等级判定
- [x] 离线数据存储
- [x] 在线/离线自动切换

### 数据管理（100%）
- [x] 评分记录列表
- [x] 记录筛选（牧场、个人/全部）
- [x] 数据导出（Excel/CSV）
- [x] 记录删除
- [x] 离线数据同步

### 系统设置（100%）
- [x] 性状默认分设置
- [x] 印象分设置
- [x] 拍照提示开关
- [x] 管理后台（鉴定员管理、牧场管理）

### 后端API（100%）
- [x] 认证接口（登录、验证）
- [x] 牧场管理接口
- [x] 评分CRUD接口
- [x] 图片上传接口（OSS）
- [x] 离线同步接口
- [x] 数据库初始化脚本

### 部署配置（100%）
- [x] 生产环境配置
- [x] PM2进程管理
- [x] Nginx反向代理
- [x] 一键部署脚本
- [x] 完整部署文档

## 🚀 快速开始 | Quick Start

### 环境要求
- Node.js 20.x
- 微信开发者工具
- 阿里云账号（PolarDB + OSS + ECS）

### 本地开发

#### 后端启动
```bash
cd server
npm install
cp .env.example .env  # 配置环境变量
node src/scripts/init-db.js  # 初始化数据库
npm run dev  # 启动开发服务器
```

#### 小程序开发
1. 使用微信开发者工具打开 `miniprogram` 目录
2. 配置 AppID: `wx909884d604221d6a`
3. 修改 `utils/request.js` 中的 API 地址
4. 编译运行

### 生产部署

详见 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

#### 一键部署
```bash
# 确保SSH密钥在项目根目录
./deploy.sh
```

部署脚本会自动完成：
- ✅ 安装Node.js和PM2
- ✅ 同步代码到服务器
- ✅ 安装依赖
- ✅ 初始化数据库（可选）
- ✅ 启动PM2进程

#### 配置Nginx
```bash
ssh -i linear-scoring.pem ecs-user@39.96.189.27
sudo cp ~/dairy-scoring/nginx.conf /etc/nginx/sites-available/dairy-scoring-api
sudo ln -s /etc/nginx/sites-available/dairy-scoring-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 验证部署
```bash
# 健康检查
curl https://api.genepop.com/health

# 查看PM2状态
ssh -i linear-scoring.pem ecs-user@39.96.189.27 'pm2 status'
```

## 📖 参考标准 | Reference Standards

1. GB/T 3157 中国荷斯坦牛
2. GB/T 35568-2017 中国荷斯坦牛体型鉴定技术规程
3. T/DACS 002-2021 荷斯坦牛体型鉴定操作技术规范

## 📚 文档 | Documentation

- [完整部署指南](./DEPLOYMENT_GUIDE.md)
- [开发计划](./docs/development-plan.md)
- [UI设计](./docs/ui-design.md)
- [部署状态分析](./DEPLOYMENT_STATUS.md)

## 👥 贡献者 | Contributors

- 项目发起：@bozhenwang

## 📄 许可证 | License

MIT License

## 📞 联系方式 | Contact

如有问题或建议，请提交 Issue。

---

**开发状态**：✅ 生产就绪 | Production Ready
**版本**: v1.0
**最后更新**：2025-12-30
