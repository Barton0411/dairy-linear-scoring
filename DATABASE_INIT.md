# 数据库初始化文档 | Database Initialization Guide

## 目录

1. [数据库概览](#数据库概览)
2. [表结构设计](#表结构设计)
3. [初始化脚本](#初始化脚本)
4. [测试数据](#测试数据)
5. [使用指南](#使用指南)
6. [常见问题](#常见问题)

---

## 数据库概览

### 基本信息

- **数据库类型**: MySQL 8.0 (阿里云PolarDB兼容)
- **字符集**: utf8mb4
- **排序规则**: utf8mb4_unicode_ci
- **数据库名**: dairy_scoring
- **连接地址**: pc-2zexsvvhgttj6i669.mysql.polardb.rds.aliyuncs.com:3306
- **用户名**: linear_scoring

### 数据表清单

| 表名 | 说明 | 行数（测试） | 关键字段 |
|------|------|--------------|----------|
| farms | 牧场信息 | 4 | farm_code (唯一) |
| appraisers | 鉴定员信息 | 4 | employee_id (唯一) |
| appraiser_farms | 鉴定员-牧场关联 | 6 | 复合主键 |
| users | 微信用户 | 0 | openid (唯一) |
| cattle | 牛只信息 | 0 | (ear_tag, farm_code) 复合唯一 |
| scores | 评分记录 | 0 | local_id (唯一) |
| photos | 照片记录 | 0 | score_id (外键) |

---

## 表结构设计

### 1. farms - 牧场信息表

**用途**: 存储所有牧场的基本信息

```sql
CREATE TABLE farms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  farm_code VARCHAR(50) UNIQUE NOT NULL,           -- 牧场编号（YQN001格式）
  farm_name VARCHAR(100) NOT NULL,                 -- 牧场名称
  dhi_code VARCHAR(50),                            -- DHI编号（可选）
  region VARCHAR(100),                             -- 所在地区
  contact_person VARCHAR(50),                      -- 联系人
  contact_phone VARCHAR(20),                       -- 联系电话
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_farm_code (farm_code),
  INDEX idx_dhi_code (dhi_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**测试数据**:
- YQN001 - 测试牧场A
- YQN002 - 测试牧场B
- YQN003 - 测试牧场C
- YQN004 - 测试牧场D

---

### 2. appraisers - 鉴定员信息表

**用途**: 存储所有鉴定员的资质信息

```sql
CREATE TABLE appraisers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id VARCHAR(50) UNIQUE NOT NULL,         -- 工号（唯一标识）
  appraiser_name VARCHAR(50) NOT NULL,             -- 鉴定员姓名
  is_certified BOOLEAN DEFAULT FALSE,              -- 是否持证鉴定员
  certification_number VARCHAR(100),               -- 证书编号
  certification_date DATE,                         -- 获证日期
  role ENUM('appraiser', 'admin', 'super_admin') DEFAULT 'appraiser',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**角色权限**:
- `appraiser`: 普通鉴定员（仅评分）
- `admin`: 管理员（可管理鉴定员）
- `super_admin`: 超级管理员（可管理牧场）

**测试数据**:
- EMP001 - 张三 (super_admin, 已认证)
- EMP002 - 李四 (admin, 已认证)
- EMP003 - 王五 (appraiser, 已认证)
- EMP004 - 赵六 (appraiser, 未认证)

---

### 3. appraiser_farms - 鉴定员-牧场关联表

**用途**: 定义哪些鉴定员可以访问哪些牧场

```sql
CREATE TABLE appraiser_farms (
  employee_id VARCHAR(50),
  farm_code VARCHAR(50),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (employee_id, farm_code),
  FOREIGN KEY (employee_id) REFERENCES appraisers(employee_id) ON DELETE CASCADE,
  FOREIGN KEY (farm_code) REFERENCES farms(farm_code) ON DELETE CASCADE,
  INDEX idx_employee_id (employee_id),
  INDEX idx_farm_code (farm_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**关联逻辑**:
- 一个鉴定员可以访问多个牧场
- 一个牧场可以被多个鉴定员访问
- 删除鉴定员或牧场时，自动删除关联（CASCADE）

**测试数据**:
- EMP001 → YQN001, YQN002, YQN003, YQN004 (全部牧场)
- EMP002 → YQN001, YQN002
- EMP003 → YQN001

---

### 4. users - 微信用户表

**用途**: 存储微信登录用户信息，并关联到鉴定员账号

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(100) UNIQUE NOT NULL,             -- 微信openid
  unionid VARCHAR(100),                            -- 微信unionid（可选）
  nickname VARCHAR(100),                           -- 微信昵称
  avatar_url VARCHAR(500),                         -- 头像URL
  employee_id VARCHAR(50),                         -- 关联的鉴定员工号
  appraiser_name VARCHAR(50),                      -- 鉴定员姓名（冗余）
  is_certified BOOLEAN DEFAULT FALSE,              -- 是否认证鉴定员（冗余）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES appraisers(employee_id) ON DELETE SET NULL,
  INDEX idx_openid (openid),
  INDEX idx_employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**认证流程**:
1. 用户微信登录 → 创建 users 记录（employee_id 为空）
2. 用户输入工号+姓名 → 验证 appraiser_farms 表
3. 验证通过 → 更新 users.employee_id
4. 后续登录自动关联

---

### 5. cattle - 牛只信息表

**用途**: 记录所有评定过的牛只基本信息

```sql
CREATE TABLE cattle (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ear_tag VARCHAR(50) NOT NULL,                    -- 耳号
  farm_code VARCHAR(50) NOT NULL,                  -- 所属牧场
  parity INT,                                      -- 胎次
  birth_date DATE,                                 -- 出生日期
  dam_id VARCHAR(50),                              -- 母牛耳号
  sire_id VARCHAR(50),                             -- 父牛编号
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_ear_tag_farm (ear_tag, farm_code),  -- 同一牧场耳号唯一
  FOREIGN KEY (farm_code) REFERENCES farms(farm_code) ON DELETE CASCADE,
  INDEX idx_ear_tag (ear_tag),
  INDEX idx_farm_code (farm_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**业务规则**:
- 耳号在同一牧场内必须唯一
- 不同牧场可以有相同耳号
- 删除牧场时，级联删除牛只

---

### 6. scores - 评分记录表

**用途**: 存储所有线性评分记录（核心业务表）

```sql
CREATE TABLE scores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  local_id VARCHAR(100) UNIQUE NOT NULL,           -- 本地唯一ID（离线同步用）
  farm_code VARCHAR(50) NOT NULL,
  farm_name VARCHAR(100),
  dhi_code VARCHAR(50),
  ear_tag VARCHAR(50) NOT NULL,
  parity INT,
  mode ENUM('normal', 'defect') NOT NULL,          -- 评分模式

  -- 20个线性性状分数 (1-9分)
  -- 体躯容量 (18%) - Body Capacity
  tg INT,                                          -- 体高 (Height)
  xk INT,                                          -- 胸宽 (Chest Width)
  ts INT,                                          -- 体深 (Body Depth)
  yqd INT,                                         -- 腰强度 (Loin Strength)

  -- 尻部 (10%) - Rump
  kjd INT,                                         -- 尻角度 (Rump Angle)
  kk INT,                                          -- 尻宽 (Rump Width)

  -- 肢蹄 (20%) - Feet & Legs
  tjd INT,                                         -- 蹄角度 (Hoof Angle)
  tgsd INT,                                        -- 蹄踵深度 (Heel Depth)
  gzd INT,                                         -- 骨质地 (Bone Quality)
  hzcs INT,                                        -- 后肢侧视 (Rear Legs Side View)
  hzhs INT,                                        -- 后肢后视 (Rear Legs Rear View)

  -- 泌乳系统 (42%) - Mammary System
  rfsd INT,                                        -- 乳房深度 (Udder Depth)
  zyxrd INT,                                       -- 中央悬韧带 (Median Suspensory)
  qrffz INT,                                       -- 前乳房附着 (Fore Udder Attachment)
  qrtwz INT,                                       -- 前乳头位置 (Front Teat Placement)
  qrtcd INT,                                       -- 前乳头长度 (Front Teat Length)
  hrffzgd INT,                                     -- 后乳房附着高度 (Rear Udder Height)
  hrffzkd INT,                                     -- 后乳房附着宽度 (Rear Udder Width)
  hrtwz INT,                                       -- 后乳头位置 (Rear Teat Placement)

  -- 乳用特征 (10%) - Dairy Character
  ljx INT,                                         -- 棱角性 (Angularity)

  -- 综合评分
  impression_score INT,                            -- 印象分 (50-100)
  udder_fullness ENUM('empty', 'quarter', 'half', 'three_quarter', 'full'),
  total_score DECIMAL(5,2),                        -- 总分
  grade VARCHAR(10),                               -- 等级 (Ex/VG/GP/G/F/P)

  -- 元数据
  employee_id VARCHAR(50),
  appraiser_name VARCHAR(50),
  is_certified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (farm_code) REFERENCES farms(farm_code) ON DELETE CASCADE,
  INDEX idx_local_id (local_id),
  INDEX idx_farm_code (farm_code),
  INDEX idx_ear_tag (ear_tag),
  INDEX idx_employee_id (employee_id),
  INDEX idx_created_at (created_at),
  INDEX idx_total_score (total_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**重要说明**:
- 20个性状字段使用拼音缩写（便于代码维护）
- 权重注释：体躯18%、尻部10%、肢蹄20%、泌乳42%、乳用10%
- local_id 用于离线同步去重
- grade 自动计算：Ex(90+), VG(85-89), GP(80-84), G(75-79), F(65-74), P(<65)

---

### 7. photos - 照片记录表

**用途**: 存储评分照片的OSS链接

```sql
CREATE TABLE photos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  score_id INT NOT NULL,                           -- 关联的评分记录
  oss_key VARCHAR(500) NOT NULL,                   -- OSS存储路径
  oss_url VARCHAR(1000) NOT NULL,                  -- OSS访问URL
  file_size INT,                                   -- 文件大小（字节）
  mime_type VARCHAR(50),                           -- MIME类型
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (score_id) REFERENCES scores(id) ON DELETE CASCADE,
  INDEX idx_score_id (score_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**OSS存储路径规则**:
```
scoring-photos/{year}/{month}/{uuid}.jpg
例如: scoring-photos/2025/12/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg
```

---

## 初始化脚本

### 脚本位置

`server/src/scripts/init-db.js`

### 脚本功能

1. **删除旧表**（如果存在）
2. **创建7张新表**（按依赖顺序）
3. **插入测试数据**
   - 4个牧场
   - 4个鉴定员
   - 6条鉴定员-牧场关联

### 执行方式

#### 方式1: 本地执行（开发环境）

```bash
cd server
node src/scripts/init-db.js
```

#### 方式2: 服务器执行（生产环境）

```bash
# SSH到服务器
ssh -i linear-scoring.pem ecs-user@39.96.189.27

# 进入项目目录
cd ~/dairy-scoring

# 运行初始化脚本
node src/scripts/init-db.js
```

#### 方式3: 部署时自动执行

```bash
./deploy.sh
# 提示时选择 'y' 初始化数据库
```

### 执行输出

```
🔧 开始初始化数据库...

📋 连接数据库: dairy_scoring@pc-2zexsvvhgttj6i669...
✓ 数据库连接成功

🗑️  删除旧表...
✓ 旧表删除完成

🔨 创建新表...
✓ 创建 farms 表
✓ 创建 appraisers 表
✓ 创建 appraiser_farms 表
✓ 创建 users 表
✓ 创建 cattle 表
✓ 创建 scores 表
✓ 创建 photos 表

📝 插入测试数据...
✓ 插入 4 个测试牧场
✓ 插入 4 个测试鉴定员
✓ 插入 6 条关联关系

✅ 数据库初始化完成！
```

---

## 测试数据

### 测试牧场

| farm_code | farm_name | region | contact_person | contact_phone |
|-----------|-----------|--------|----------------|---------------|
| YQN001 | 测试牧场A | 北京市 | 张经理 | 13800138001 |
| YQN002 | 测试牧场B | 河北省 | 李经理 | 13800138002 |
| YQN003 | 测试牧场C | 山东省 | 王经理 | 13800138003 |
| YQN004 | 测试牧场D | 内蒙古 | 赵经理 | 13800138004 |

### 测试鉴定员

| employee_id | appraiser_name | role | is_certified | certification_number |
|-------------|----------------|------|--------------|---------------------|
| EMP001 | 张三 | super_admin | ✓ | CERT-2024-001 |
| EMP002 | 李四 | admin | ✓ | CERT-2024-002 |
| EMP003 | 王五 | appraiser | ✓ | CERT-2024-003 |
| EMP004 | 赵六 | appraiser | ✗ | - |

### 测试登录凭据

小程序测试登录（鉴定员认证页面输入）：

```
工号: EMP001
姓名: 张三
→ 可访问全部4个牧场（super_admin）

工号: EMP002
姓名: 李四
→ 可访问YQN001, YQN002（admin）

工号: EMP003
姓名: 王五
→ 可访问YQN001（appraiser）

工号: EMP004
姓名: 赵六
→ 无牧场访问权限（需管理员分配）
```

---

## 使用指南

### 生产环境初始化流程

#### 首次部署

```bash
# 1. 运行部署脚本
./deploy.sh
# 提示时选择 'y' 初始化数据库

# 2. 验证表创建
ssh -i linear-scoring.pem ecs-user@39.96.189.27 << 'EOF'
cd ~/dairy-scoring
node -e "
const db = require('./src/config/database');
db.query('SHOW TABLES')
  .then(([rows]) => {
    console.log('数据库表清单:');
    rows.forEach(row => console.log('✓', Object.values(row)[0]));
  })
  .finally(() => process.exit());
"
EOF

# 3. 验证测试数据
ssh -i linear-scoring.pem ecs-user@39.96.189.27 << 'EOF'
cd ~/dairy-scoring
node -e "
const db = require('./src/config/database');
Promise.all([
  db.query('SELECT COUNT(*) as count FROM farms'),
  db.query('SELECT COUNT(*) as count FROM appraisers'),
  db.query('SELECT COUNT(*) as count FROM appraiser_farms')
]).then(results => {
  console.log('牧场数量:', results[0][0][0].count);
  console.log('鉴定员数量:', results[1][0][0].count);
  console.log('关联数量:', results[2][0][0].count);
}).finally(() => process.exit());
"
EOF
```

#### 清空测试数据（保留表结构）

```sql
-- 仅清空评分数据，保留牧场和鉴定员
TRUNCATE TABLE photos;
TRUNCATE TABLE scores;
TRUNCATE TABLE cattle;
TRUNCATE TABLE users;

-- 清空全部数据（包括牧场和鉴定员）
TRUNCATE TABLE photos;
TRUNCATE TABLE scores;
TRUNCATE TABLE cattle;
TRUNCATE TABLE users;
TRUNCATE TABLE appraiser_farms;
TRUNCATE TABLE appraisers;
TRUNCATE TABLE farms;
```

#### 添加生产牧场

```sql
-- 添加真实牧场
INSERT INTO farms (farm_code, farm_name, dhi_code, region, contact_person, contact_phone)
VALUES
  ('REAL001', '北京奶牛中心', 'DHI-BJ-001', '北京市', '联系人', '13912345678');

-- 添加真实鉴定员
INSERT INTO appraisers (employee_id, appraiser_name, is_certified, certification_number, role)
VALUES
  ('REAL001', '真实姓名', TRUE, 'CERT-2025-XXX', 'appraiser');

-- 关联鉴定员和牧场
INSERT INTO appraiser_farms (employee_id, farm_code)
VALUES
  ('REAL001', 'REAL001');
```

---

## 常见问题

### 1. 初始化脚本执行失败

**错误**: `ER_ACCESS_DENIED_ERROR: Access denied for user`

**原因**: 数据库连接配置错误

**解决**:
```bash
# 检查.env配置
cat server/.env | grep DB_

# 测试数据库连接
node -e "
require('dotenv').config({ path: './server/.env' });
const mysql = require('mysql2/promise');
mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
}).then(() => console.log('✓ 连接成功'))
  .catch(err => console.error('✗ 连接失败:', err.message));
"
```

---

### 2. 表已存在错误

**错误**: `ER_TABLE_EXISTS_ERROR: Table 'farms' already exists`

**原因**: 脚本使用了 `CREATE TABLE` 而非 `CREATE TABLE IF NOT EXISTS`

**解决**:
```bash
# 手动删除旧表
ssh -i linear-scoring.pem ecs-user@39.96.189.27 << 'EOF'
cd ~/dairy-scoring
node -e "
const db = require('./src/config/database');
const tables = ['photos', 'scores', 'cattle', 'users', 'appraiser_farms', 'appraisers', 'farms'];
(async () => {
  for (const table of tables) {
    await db.query(\`DROP TABLE IF EXISTS \${table}\`);
    console.log(\`✓ 删除表: \${table}\`);
  }
})().finally(() => process.exit());
"
EOF

# 重新运行初始化
node src/scripts/init-db.js
```

---

### 3. 外键约束错误

**错误**: `ER_NO_REFERENCED_ROW_2: Cannot add or update a child row`

**原因**: 插入数据时，外键引用的父记录不存在

**解决**: 确保插入顺序正确
```
1. farms（牧场）
2. appraisers（鉴定员）
3. appraiser_farms（关联）
4. users（用户）
5. cattle（牛只）
6. scores（评分）
7. photos（照片）
```

---

### 4. 字符集问题

**错误**: 中文显示为乱码

**原因**: 数据库字符集配置不正确

**解决**:
```sql
-- 检查数据库字符集
SHOW CREATE DATABASE dairy_scoring;

-- 修改数据库字符集
ALTER DATABASE dairy_scoring CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 检查表字符集
SHOW CREATE TABLE farms;

-- 修改表字符集
ALTER TABLE farms CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

### 5. 查看表结构

```bash
# 查看所有表
ssh -i linear-scoring.pem ecs-user@39.96.189.27 << 'EOF'
cd ~/dairy-scoring
node -e "
const db = require('./src/config/database');
db.query('SHOW TABLES')
  .then(([rows]) => rows.forEach(r => console.log(Object.values(r)[0])))
  .finally(() => process.exit());
"
EOF

# 查看特定表结构
ssh -i linear-scoring.pem ecs-user@39.96.189.27 << 'EOF'
cd ~/dairy-scoring
node -e "
const db = require('./src/config/database');
db.query('DESCRIBE scores')
  .then(([rows]) => console.table(rows))
  .finally(() => process.exit());
"
EOF
```

---

## 数据备份与恢复

### 备份数据库

```bash
# 备份整个数据库
ssh -i linear-scoring.pem ecs-user@39.96.189.27 << 'EOF'
mysqldump -h pc-2zexsvvhgttj6i669.mysql.polardb.rds.aliyuncs.com \
  -u linear_scoring -p'Barton_0411' \
  dairy_scoring > ~/backup_$(date +%Y%m%d_%H%M%S).sql
EOF

# 下载备份到本地
scp -i linear-scoring.pem \
  ecs-user@39.96.189.27:~/backup_*.sql \
  ./backups/

# 仅备份表结构（不含数据）
mysqldump --no-data -h ... -u ... -p dairy_scoring > schema.sql

# 仅备份数据（不含表结构）
mysqldump --no-create-info -h ... -u ... -p dairy_scoring > data.sql
```

### 恢复数据库

```bash
# 上传备份到服务器
scp -i linear-scoring.pem \
  ./backups/backup_20251230.sql \
  ecs-user@39.96.189.27:~/

# 恢复数据库
ssh -i linear-scoring.pem ecs-user@39.96.189.27 << 'EOF'
mysql -h pc-2zexsvvhgttj6i669.mysql.polardb.rds.aliyuncs.com \
  -u linear_scoring -p'Barton_0411' \
  dairy_scoring < ~/backup_20251230.sql
EOF
```

---

## 性能优化建议

### 1. 索引优化

已创建的关键索引：
- `farms.farm_code` (UNIQUE)
- `appraisers.employee_id` (UNIQUE)
- `scores.local_id` (UNIQUE)
- `scores.farm_code` + `scores.created_at` (复合索引，用于查询)
- `scores.total_score` (用于排序)

### 2. 查询优化

```sql
-- ✓ 好的查询（使用索引）
SELECT * FROM scores WHERE farm_code = 'YQN001' AND created_at > '2025-01-01';

-- ✗ 差的查询（全表扫描）
SELECT * FROM scores WHERE appraiser_name LIKE '%张%';

-- ✓ 优化后
SELECT * FROM scores WHERE employee_id = 'EMP001';
```

### 3. 定期维护

```sql
-- 分析表
ANALYZE TABLE scores;

-- 优化表
OPTIMIZE TABLE scores;

-- 检查表
CHECK TABLE scores;
```

---

## 总结

### 初始化检查清单

- [ ] 数据库连接配置正确（.env文件）
- [ ] 运行初始化脚本成功
- [ ] 7张表全部创建
- [ ] 测试数据插入成功
- [ ] 外键约束生效
- [ ] 字符集为utf8mb4
- [ ] 索引创建完成

### 文件清单

```
server/
├── .env                      # 数据库连接配置
├── src/
│   ├── config/
│   │   └── database.js       # 数据库连接池
│   └── scripts/
│       └── init-db.js        # 初始化脚本
└── DATABASE_INIT.md          # 本文档
```

---

**文档版本**: 1.0
**最后更新**: 2025-12-30
**数据库版本**: MySQL 8.0 / PolarDB
