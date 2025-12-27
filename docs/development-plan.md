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

### 1.2 用户角色与权限

#### 角色定义
| 角色 | 描述 |
|------|------|
| 鉴定员 | 现场评分人员，可服务多个牧场 |

#### 权限设计
| 操作 | 范围 | 说明 |
|------|------|------|
| 查看数据 | 所选牧场全部数据 | 可查看该牧场所有鉴定员的评分记录 |
| 导出数据 | 所选牧场全部数据 | 可导出该牧场所有评分数据 |
| 新增数据 | 自己的数据 | 评分记录归属当前鉴定员 |
| 编辑数据 | 仅自己的数据 | 只能修改自己创建的评分记录 |
| 删除数据 | 仅自己的数据 | 只能删除自己创建的评分记录 |
| 删除照片 | 仅自己的照片 | 照片永久存储，用户可自行删除 |

#### 数据归属
- **数据归属牧场**：评分数据按牧场组织和管理
- **操作归属鉴定员**：每条记录标记创建者，用于权限控制

### 1.3 功能需求

#### P0 - 核心功能（MVP必须）

| 功能 | 描述 | 验收标准 |
|------|------|----------|
| 微信登录 | 微信授权登录 | 获取用户信息，生成唯一ID |
| 牧场选择 | 选择当前工作牧场 | 切换牧场后数据范围随之变化 |
| 牛只信息录入 | 耳号、胎次、泌乳天数 | 必填校验，同牧场耳号唯一性检查 |
| 正常模式评分 | 20个性状1-9分评分 | 滑块/按钮选择，默认值5分 |
| 评分计算 | 按权重计算总分 | 实时显示总分和等级 |
| 拍照功能 | 拍照并关联评分记录 | 支持多张，压缩后上传OSS |
| 本地存储 | 离线保存评分数据 | 断网可用，联网自动同步 |
| 评分列表 | 查看当前牧场评分记录 | 显示所有鉴定员数据，标记自己的 |

#### P1 - 重要功能（MVP可选）

| 功能 | 描述 | 验收标准 |
|------|------|----------|
| 缺陷模式评分 | 仅评异常性状 | 其他性状默认5分 |
| 数据导出 | 导出Excel | 包含：各性状得分、评级、时间、鉴定员 |
| 拍照提醒 | 高分/低分自动提示 | ≥85或≤65分时弹窗 |

#### P2 - 增强功能（后续迭代）

| 功能 | 描述 |
|------|------|
| 统计分析 | 牧场/时间维度数据统计 |
| 历史对比 | 同一头牛多次评分对比 |
| PDF报告 | 生成PDF格式报告 |
| 数据平台对接 | 与其他数据平台API对接 |

### 1.4 导出字段定义

Excel导出包含以下字段：

| 字段分类 | 字段列表 |
|----------|----------|
| 基本信息 | 牧场名称、耳号、胎次、泌乳天数 |
| 体躯容量 | 体高、胸宽、体深、腰强度 |
| 尻部 | 尻角度、尻宽 |
| 肢蹄 | 蹄角度、蹄踵深度、骨质地、后肢侧视、后肢后视 |
| 泌乳系统 | 乳房深度、中央悬韧带、前乳房附着、前乳头位置、前乳头长度、后乳房附着高度、后乳房附着宽度、后乳头位置 |
| 乳用特征 | 棱角性 |
| 评定结果 | 总分、等级(Ex/VG/GP/G/F/P) |
| 记录信息 | 评分时间、鉴定员姓名 |

### 1.5 评分性状详细定义

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
| UI组件库 | Vant Weapp | 组件丰富，适合表单场景 |
| 状态管理 | MobX-miniprogram | 轻量级，适合小程序 |
| 后端框架 | Node.js + Express | 开发效率高，生态丰富 |
| 数据库 | **阿里云 PolarDB** | 用户已有资源，便于对接其他平台 |
| 图片存储 | **阿里云 OSS** | 用户已有资源，永久存储，不可删除 |
| 部署 | 阿里云 ECS | 统一阿里云生态 |

### 2.2 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    微信小程序                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 评分页面  │  │ 列表页面  │  │ 导出页面  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │             │                     │
│  ┌────┴─────────────┴─────────────┴────┐               │
│  │           本地存储层 (Storage)        │               │
│  └────────────────┬────────────────────┘               │
└───────────────────┼─────────────────────────────────────┘
                    │ HTTPS
┌───────────────────┼─────────────────────────────────────┐
│                   ▼            阿里云                    │
│  ┌─────────────────────────────────────┐                │
│  │      API Server (Node.js/ECS)       │                │
│  └────────────────┬────────────────────┘                │
│                   │                                      │
│  ┌────────────────┼────────────────────┐                │
│  │                ▼                    │                │
│  │  ┌──────────┐     ┌──────────┐     │                │
│  │  │ PolarDB  │     │ 阿里云OSS │     │                │
│  │  │  数据库   │     │  图片存储  │     │                │
│  │  └──────────┘     └──────────┘     │                │
│  └─────────────────────────────────────┘                │
│                       ↓                                  │
│              (未来对接其他数据平台)                        │
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
  phone VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 牧场表 (farms)
```sql
CREATE TABLE farms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255),
  contact VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 用户-牧场关联表 (user_farms)
```sql
CREATE TABLE user_farms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  farm_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (user_id, farm_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (farm_id) REFERENCES farms(id)
);
```

#### 牛只表 (cattle)
```sql
CREATE TABLE cattle (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ear_tag VARCHAR(32) NOT NULL,
  farm_id INT NOT NULL,
  parity INT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (ear_tag, farm_id),
  FOREIGN KEY (farm_id) REFERENCES farms(id)
);
```

#### 评分记录表 (scores)
```sql
CREATE TABLE scores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cattle_id INT NOT NULL,
  user_id INT NOT NULL,
  farm_id INT NOT NULL,
  score_mode ENUM('normal', 'defect') DEFAULT 'normal',
  lactation_days INT,

  -- 体躯容量 (18%)
  tg TINYINT DEFAULT 5,   -- 体高
  xk TINYINT DEFAULT 5,   -- 胸宽
  ts TINYINT DEFAULT 5,   -- 体深
  yqd TINYINT DEFAULT 5,  -- 腰强度

  -- 尻部 (10%)
  kjd TINYINT DEFAULT 5,  -- 尻角度
  kk TINYINT DEFAULT 5,   -- 尻宽

  -- 肢蹄 (20%)
  tjd TINYINT DEFAULT 5,  -- 蹄角度
  tzs TINYINT DEFAULT 5,  -- 蹄踵深度
  gzd TINYINT DEFAULT 5,  -- 骨质地
  hzcs TINYINT DEFAULT 5, -- 后肢侧视
  hzhs TINYINT DEFAULT 5, -- 后肢后视

  -- 泌乳系统 (42%)
  rfsd TINYINT DEFAULT 5,  -- 乳房深度
  zxrd TINYINT DEFAULT 5,  -- 中央悬韧带
  qrffz TINYINT DEFAULT 5, -- 前乳房附着
  qrtwz TINYINT DEFAULT 5, -- 前乳头位置
  qrtcd TINYINT DEFAULT 5, -- 前乳头长度
  hrfgd TINYINT DEFAULT 5, -- 后乳房附着高度
  hrfkd TINYINT DEFAULT 5, -- 后乳房附着宽度
  hrtwz TINYINT DEFAULT 5, -- 后乳头位置

  -- 乳用特征 (10%)
  ljx TINYINT DEFAULT 5,   -- 棱角性

  -- 计算结果
  total_score DECIMAL(5,2),
  grade ENUM('Ex', 'VG', 'GP', 'G', 'F', 'P'),

  -- 元数据
  sync_status ENUM('pending', 'synced') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (cattle_id) REFERENCES cattle(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (farm_id) REFERENCES farms(id),
  INDEX idx_farm_created (farm_id, created_at)
);
```

#### 照片表 (photos)
```sql
CREATE TABLE photos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  score_id INT NOT NULL,
  user_id INT NOT NULL,
  oss_key VARCHAR(255) NOT NULL,
  oss_url VARCHAR(500),
  sync_status ENUM('pending', 'synced') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (score_id) REFERENCES scores(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 2.4 API 接口设计

| 接口 | 方法 | 描述 | 权限 |
|------|------|------|------|
| /api/auth/login | POST | 微信登录 | 公开 |
| /api/user/info | GET | 获取用户信息 | 登录 |
| /api/farms | GET | 获取用户关联的牧场列表 | 登录 |
| /api/farms/:id/cattle | GET/POST | 牛只列表/新增 | 登录 |
| /api/farms/:id/scores | GET | 获取牧场所有评分记录 | 登录 |
| /api/scores | POST | 提交评分 | 登录 |
| /api/scores/:id | GET | 评分详情 | 登录 |
| /api/scores/:id | PUT/DELETE | 修改/删除评分 | 仅创建者 |
| /api/photos/upload | POST | 上传照片到OSS | 登录 |
| /api/farms/:id/export | POST | 导出牧场数据 | 登录 |
| /api/sync | POST | 离线数据同步 | 登录 |

### 2.5 照片上传策略

| 项目 | 策略 |
|------|------|
| 压缩大小 | 上传前压缩到 200-500KB |
| 删除权限 | 不允许删除，保证数据完整性 |
| 有网上传 | 每头牛评完后自动上传 |
| 离线处理 | 暂存本地，恢复网络后自动上传 |
| 上传方式 | 后台静默逐张上传，不阻塞用户操作 |
| 失败重试 | 自动重试3次，仍失败则保留待下次 |
| 状态显示 | 显示"待上传 X 张"让用户了解同步状态 |

### 2.6 小程序页面结构

```
pages/
├── index/              # 首页（选择牧场 + 快速开始）
├── login/              # 登录页
├── farm-select/        # 牧场选择页
├── scoring/            # 评分页面
│   ├── info/          # 牛只信息录入
│   ├── normal/        # 正常模式评分
│   └── defect/        # 缺陷模式评分
├── records/           # 评分记录列表（当前牧场）
├── detail/            # 评分详情（区分自己/他人数据）
├── export/            # 数据导出
└── settings/          # 设置（切换牧场、个人信息）
```

---

## 三、开发阶段划分

### 阶段一：项目初始化（第1周）

- [ ] 注册微信小程序账号
- [ ] 创建小程序项目，配置开发环境
- [ ] 引入 Vant Weapp 组件库
- [ ] 搭建 Node.js 后端项目
- [ ] 配置阿里云 PolarDB 数据库
- [ ] 配置阿里云 OSS 存储桶
- [ ] 创建数据库表结构

### 阶段二：登录与牧场选择（第2周）

- [ ] 微信授权登录功能
- [ ] 用户信息获取与存储
- [ ] 牧场列表页面
- [ ] 牧场切换功能
- [ ] 登录态管理

### 阶段三：核心评分功能（第3-5周）

- [ ] 牛只信息录入页面
- [ ] 评分界面 UI 开发（20个性状）
- [ ] 评分滑块/按钮组件
- [ ] 实时评分计算逻辑
- [ ] 等级自动判定
- [ ] 评分数据本地存储
- [ ] 评分提交 API 对接

### 阶段四：拍照功能（第6周）

- [ ] 相机调用与拍照
- [ ] 图片压缩处理
- [ ] 阿里云 OSS 上传
- [ ] 照片预览与删除
- [ ] 拍照触发规则（高分/低分提醒）

### 阶段五：记录管理（第7-8周）

- [ ] 评分记录列表页（显示所有人数据）
- [ ] 区分显示"我的"和"他人"记录
- [ ] 搜索和筛选功能
- [ ] 评分详情页
- [ ] 编辑功能（仅自己的数据）
- [ ] 删除功能（仅自己的数据）

### 阶段六：导出与同步（第9-10周）

- [ ] Excel 导出功能
- [ ] 离线数据缓存
- [ ] 断网检测与提示
- [ ] 联网自动同步
- [ ] 同步冲突处理

### 阶段七：测试与上线（第11-12周）

- [ ] 功能测试
- [ ] 性能优化
- [ ] Bug 修复
- [ ] 小程序审核资料准备
- [ ] 域名备案（如需）
- [ ] 提交微信审核
- [ ] 正式发布上线

---

## 四、里程碑计划

| 里程碑 | 目标 | 交付物 |
|--------|------|--------|
| M1 | 项目启动 | 开发环境、数据库、OSS配置完成 |
| M2 | 登录可用 | 微信登录 + 牧场选择功能 |
| M3 | 评分可用 | 完整评分流程 + 拍照功能 |
| M4 | 功能完整 | 记录管理 + 导出 + 离线同步 |
| M5 | 正式上线 | 通过审核，公开发布 |

---

## 五、已确认决策

| 问题 | 决策 |
|------|------|
| 产品形态 | 微信小程序 |
| 用户体系 | 鉴定员可服务多个牧场，需选择当前牧场 |
| 数据归属 | 数据归属牧场 |
| 权限控制 | 可查看/导出牧场所有数据，仅能编辑/删除自己的数据 |
| 数据库 | 阿里云 PolarDB |
| 图片存储 | 阿里云 OSS，压缩后上传，永久保存，不可删除 |
| 上传策略 | 有网自动上传，离线暂存后批量上传，后台静默处理 |
| 导出字段 | 各性状得分 + 评级 + 时间 + 鉴定员 |
| 上线方式 | 直接公开发布 |
| 扩展性 | 预留 API 对接其他数据平台 |

---

## 六、风险评估

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 微信审核不通过 | 延迟上线 | 提前了解审核规则，准备资质文件 |
| 牧场网络差 | 用户体验差 | 强化离线功能，优化同步策略 |
| 数据丢失 | 严重 | 本地+云端双重存储，PolarDB自动备份 |
| 性状定义歧义 | 评分不准确 | 参考标准文档，提供评分指南 |
| OSS费用超支 | 成本增加 | 图片压缩，设置生命周期规则 |

---

**文档版本**: v1.1
**创建日期**: 2025-12-27
**更新日期**: 2025-12-27
**状态**: 已确认
