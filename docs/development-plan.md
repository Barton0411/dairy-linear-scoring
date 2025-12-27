# 奶牛线性评定系统 - 开发计划

## 一、产品需求文档 (PRD)

### 1.1 产品概述

| 项目 | 内容 |
|------|------|
| 产品名称 | 奶牛线性评定系统 |
| 产品形态 | 微信小程序 |
| 目标用户 | 专业奶牛鉴定员 |
| 使用场景 | 牧场现场评分 |
| 核心价值 | 标准化评分、数据数字化、提高效率 |

### 1.2 用户角色

| 角色 | 描述 | 权限 |
|------|------|------|
| 鉴定员 | 现场评分人员 | 评分、拍照、查看历史 |
| 管理员 | 牧场/机构管理人员 | 数据导出、统计分析、用户管理 |

### 1.3 功能需求

#### P0 - 核心功能（MVP必须）

| 功能 | 描述 | 验收标准 |
|------|------|----------|
| 用户登录 | 微信授权登录 | 获取用户信息，生成唯一ID |
| 牛只信息录入 | 耳号、胎次、泌乳天数 | 必填校验，耳号唯一性检查 |
| 正常模式评分 | 20个性状1-9分评分 | 滑块/按钮选择，默认值5分 |
| 评分计算 | 按权重计算总分 | 实时显示总分和等级 |
| 拍照功能 | 拍照并关联评分记录 | 支持多张，压缩存储 |
| 本地存储 | 离线保存评分数据 | 断网可用，联网自动同步 |
| 评分列表 | 查看已评分记录 | 按日期/牧场筛选 |

#### P1 - 重要功能（MVP可选）

| 功能 | 描述 | 验收标准 |
|------|------|----------|
| 缺陷模式评分 | 仅评异常性状 | 其他性状默认5分 |
| 数据导出 | 导出Excel/PDF | 支持选择导出范围 |
| 拍照提醒 | 高分/低分自动提示 | ≥85或≤65分时弹窗 |

#### P2 - 增强功能（后续迭代）

| 功能 | 描述 |
|------|------|
| 云端同步 | 数据实时同步到云端 |
| 统计分析 | 牧场/时间维度数据统计 |
| 历史对比 | 同一头牛多次评分对比 |
| 多鉴定员 | 支持多人协作评分 |
| 牧场管理 | 牧场信息维护 |

### 1.4 评分性状详细定义

#### 体躯容量（权重18%）
| 性状 | 代码 | 1分描述 | 9分描述 |
|------|------|---------|---------|
| 体高 | TG | 矮小 | 高大 |
| 胸宽 | XK | 窄 | 宽 |
| 体深 | TS | 浅 | 深 |
| 腰强度 | YQD | 弱 | 强 |

#### 尻部（权重10%）
| 性状 | 代码 | 1分描述 | 9分描述 |
|------|------|---------|---------|
| 尻角度 | KJD | 高尻 | 低尻 |
| 尻宽 | KK | 窄 | 宽 |

#### 肢蹄（权重20%）
| 性状 | 代码 | 1分描述 | 9分描述 |
|------|------|---------|---------|
| 蹄角度 | TJD | 低蹄角 | 高蹄角 |
| 蹄踵深度 | TZS | 浅 | 深 |
| 骨质地 | GZD | 粗糙 | 细致 |
| 后肢侧视 | HZCS | 直 | 弯曲 |
| 后肢后视 | HZHS | 外弧 | 内弧 |

#### 泌乳系统（权重42%）
| 性状 | 代码 | 1分描述 | 9分描述 |
|------|------|---------|---------|
| 乳房深度 | RFSD | 深（低于飞节） | 浅（高于飞节） |
| 中央悬韧带 | ZXRD | 弱 | 强 |
| 前乳房附着 | QRFFZ | 弱/松 | 强/紧 |
| 前乳头位置 | QRTWZ | 外侧 | 内侧 |
| 前乳头长度 | QRTCD | 短 | 长 |
| 后乳房附着高度 | HRFGD | 低 | 高 |
| 后乳房附着宽度 | HRFKD | 窄 | 宽 |
| 后乳头位置 | HRTWZ | 外侧 | 内侧 |

#### 乳用特征（权重10%）
| 性状 | 代码 | 1分描述 | 9分描述 |
|------|------|---------|---------|
| 棱角性 | LJX | 粗糙/肉用 | 细致/乳用 |

---

## 二、技术方案设计

### 2.1 技术选型

| 层级 | 技术选择 | 理由 |
|------|---------|------|
| 前端框架 | 原生微信小程序 | 性能好、官方支持、文档完善 |
| UI组件库 | WeUI / Vant Weapp | 官方推荐，体验统一 |
| 状态管理 | MobX-miniprogram | 轻量级，适合小程序 |
| 后端框架 | Node.js + Express | 开发效率高，生态丰富 |
| 数据库 | MySQL | 成熟稳定，适合结构化数据 |
| 云存储 | 腾讯云COS | 与微信生态集成好 |
| 部署 | 腾讯云 | 微信云开发或自建服务器 |

### 2.2 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    微信小程序                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 评分页面  │  │ 列表页面  │  │ 统计页面  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │             │                     │
│  ┌────┴─────────────┴─────────────┴────┐               │
│  │           本地存储层 (Storage)        │               │
│  └────────────────┬────────────────────┘               │
└───────────────────┼─────────────────────────────────────┘
                    │ HTTPS
┌───────────────────┼─────────────────────────────────────┐
│                   ▼                                      │
│  ┌─────────────────────────────────────┐                │
│  │         API Gateway (Node.js)        │                │
│  └────────────────┬────────────────────┘                │
│                   │                                      │
│  ┌────────────────┼────────────────────┐                │
│  │                ▼                    │                │
│  │  ┌──────────┐     ┌──────────┐     │                │
│  │  │  MySQL   │     │ 腾讯云COS │     │                │
│  │  │  数据库   │     │  图片存储  │     │                │
│  │  └──────────┘     └──────────┘     │                │
│  └─────────────────────────────────────┘                │
│                    云服务器                              │
└─────────────────────────────────────────────────────────┘
```

### 2.3 数据库设计

#### 用户表 (users)
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(64) UNIQUE NOT NULL,
  nickname VARCHAR(64),
  avatar_url VARCHAR(255),
  role ENUM('scorer', 'admin') DEFAULT 'scorer',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 牧场表 (farms)
```sql
CREATE TABLE farms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 牛只表 (cattle)
```sql
CREATE TABLE cattle (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ear_tag VARCHAR(32) NOT NULL,
  farm_id INT,
  parity INT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farm_id) REFERENCES farms(id)
);
```

#### 评分记录表 (scores)
```sql
CREATE TABLE scores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cattle_id INT NOT NULL,
  user_id INT NOT NULL,
  score_mode ENUM('normal', 'defect') DEFAULT 'normal',
  lactation_days INT,

  -- 体躯容量
  tg TINYINT DEFAULT 5,  -- 体高
  xk TINYINT DEFAULT 5,  -- 胸宽
  ts TINYINT DEFAULT 5,  -- 体深
  yqd TINYINT DEFAULT 5, -- 腰强度

  -- 尻部
  kjd TINYINT DEFAULT 5, -- 尻角度
  kk TINYINT DEFAULT 5,  -- 尻宽

  -- 肢蹄
  tjd TINYINT DEFAULT 5,  -- 蹄角度
  tzs TINYINT DEFAULT 5,  -- 蹄踵深度
  gzd TINYINT DEFAULT 5,  -- 骨质地
  hzcs TINYINT DEFAULT 5, -- 后肢侧视
  hzhs TINYINT DEFAULT 5, -- 后肢后视

  -- 泌乳系统
  rfsd TINYINT DEFAULT 5,  -- 乳房深度
  zxrd TINYINT DEFAULT 5,  -- 中央悬韧带
  qrffz TINYINT DEFAULT 5, -- 前乳房附着
  qrtwz TINYINT DEFAULT 5, -- 前乳头位置
  qrtcd TINYINT DEFAULT 5, -- 前乳头长度
  hrfgd TINYINT DEFAULT 5, -- 后乳房附着高度
  hrfkd TINYINT DEFAULT 5, -- 后乳房附着宽度
  hrtwz TINYINT DEFAULT 5, -- 后乳头位置

  -- 乳用特征
  ljx TINYINT DEFAULT 5,   -- 棱角性

  -- 计算结果
  total_score DECIMAL(5,2),
  grade ENUM('Ex', 'VG', 'GP', 'G', 'F', 'P'),

  -- 元数据
  sync_status ENUM('pending', 'synced') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (cattle_id) REFERENCES cattle(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 照片表 (photos)
```sql
CREATE TABLE photos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  score_id INT NOT NULL,
  url VARCHAR(255),
  local_path VARCHAR(255),
  sync_status ENUM('pending', 'synced') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (score_id) REFERENCES scores(id)
);
```

### 2.4 API 接口设计

| 接口 | 方法 | 描述 |
|------|------|------|
| /api/auth/login | POST | 微信登录 |
| /api/user/info | GET | 获取用户信息 |
| /api/farms | GET/POST | 牧场列表/新增 |
| /api/cattle | GET/POST | 牛只列表/新增 |
| /api/scores | GET/POST | 评分列表/提交 |
| /api/scores/:id | GET/PUT | 评分详情/修改 |
| /api/photos/upload | POST | 上传照片 |
| /api/export | POST | 导出数据 |
| /api/sync | POST | 数据同步 |

### 2.5 小程序页面结构

```
pages/
├── index/              # 首页（快速开始评分）
├── scoring/            # 评分页面
│   ├── normal/        # 正常模式
│   └── defect/        # 缺陷模式
├── records/           # 评分记录列表
├── detail/            # 评分详情
├── stats/             # 统计分析
├── settings/          # 设置
└── login/             # 登录页
```

---

## 三、开发阶段划分

### 阶段一：项目初始化（第1周）

- [ ] 创建微信小程序项目
- [ ] 配置开发环境
- [ ] 搭建项目目录结构
- [ ] 引入UI组件库
- [ ] 配置后端项目框架
- [ ] 创建数据库和表结构

### 阶段二：核心评分功能（第2-4周）

- [ ] 登录页面开发
- [ ] 微信授权登录对接
- [ ] 牛只信息录入页面
- [ ] 评分界面UI开发
- [ ] 20个性状评分组件
- [ ] 评分计算逻辑
- [ ] 本地存储功能

### 阶段三：拍照与存储（第5-6周）

- [ ] 相机调用功能
- [ ] 图片压缩处理
- [ ] 本地图片存储
- [ ] 拍照触发规则
- [ ] 图片预览与删除

### 阶段四：数据管理（第7-8周）

- [ ] 评分记录列表页
- [ ] 搜索和筛选功能
- [ ] 评分详情页
- [ ] 评分修改功能
- [ ] 后端API开发
- [ ] 数据同步功能

### 阶段五：导出与优化（第9-10周）

- [ ] Excel导出功能
- [ ] PDF报告生成
- [ ] 离线模式优化
- [ ] 性能优化
- [ ] Bug修复
- [ ] 用户测试

### 阶段六：上线准备（第11-12周）

- [ ] 小程序审核资料准备
- [ ] 服务器部署
- [ ] 域名备案与配置
- [ ] 提交微信审核
- [ ] 上线发布
- [ ] 运营监控

---

## 四、里程碑计划

| 里程碑 | 目标 | 交付物 |
|--------|------|--------|
| M1 - 项目启动 | 完成技术准备 | 项目框架、开发环境 |
| M2 - 核心功能 | 可评分的原型 | 评分页面、本地存储 |
| M3 - 功能完整 | MVP功能完成 | 拍照、记录、导出 |
| M4 - 上线发布 | 正式上线 | 微信小程序上架 |

---

## 五、待确认问题

### 5.1 产品层面

1. **用户体系**：是否需要区分不同牧场/机构？
2. **数据归属**：评分数据归鉴定员还是牧场？
3. **离线优先**：离线存储多久的数据？自动同步策略？
4. **导出格式**：Excel/PDF具体需要哪些字段？

### 5.2 技术层面

1. **后端选择**：使用微信云开发还是自建服务器？
2. **存储方案**：图片是否需要永久保存？
3. **多端支持**：是否需要后续支持APP/Web？

### 5.3 运营层面

1. **上线范围**：先内测还是直接公开？
2. **数据迁移**：是否有历史数据需要导入？

---

## 六、风险评估

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 微信审核不通过 | 延迟上线 | 提前了解审核规则，准备资质文件 |
| 牧场网络差 | 用户体验差 | 强化离线功能，优化同步策略 |
| 数据丢失 | 严重 | 多级存储，定期备份 |
| 性状定义歧义 | 评分不准确 | 参考标准文档，提供评分指南 |

---

**文档版本**: v1.0
**创建日期**: 2025-12-27
**状态**: 待确认
