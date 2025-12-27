// src/scripts/init-db.js - 数据库初始化脚本
require('dotenv').config({ path: '../../.env' })

const mysql = require('mysql2/promise')

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  })

  console.log('Connected to database')

  const sql = `
    -- 鉴定员-牧场关联表
    CREATE TABLE IF NOT EXISTS appraiser_farms (
      id INT PRIMARY KEY AUTO_INCREMENT,
      employee_id VARCHAR(32) NOT NULL COMMENT '鉴定员工号',
      appraiser_name VARCHAR(64) NOT NULL COMMENT '鉴定员姓名',
      is_certified TINYINT DEFAULT 0 COMMENT '是否认证 (1=已认证, 0=未认证)',
      farm_code VARCHAR(32) NOT NULL COMMENT '牧场编号',
      farm_name VARCHAR(100) NOT NULL COMMENT '牧场名称',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_employee (employee_id),
      INDEX idx_farm (farm_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='鉴定员牧场关联表';

    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      openid VARCHAR(64) UNIQUE NOT NULL COMMENT '微信openid',
      employee_id VARCHAR(32) COMMENT '关联鉴定员工号',
      appraiser_name VARCHAR(64) COMMENT '鉴定员姓名',
      is_certified TINYINT DEFAULT 0 COMMENT '是否认证',
      avatar_url VARCHAR(255) COMMENT '头像URL',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_employee (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

    -- 牛只表
    CREATE TABLE IF NOT EXISTS cattle (
      id INT PRIMARY KEY AUTO_INCREMENT,
      ear_tag VARCHAR(32) NOT NULL COMMENT '牛号/耳号',
      farm_code VARCHAR(32) NOT NULL COMMENT '牧场编号',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_farm_eartag (ear_tag, farm_code),
      INDEX idx_farm (farm_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='牛只表';

    -- 评分记录表
    CREATE TABLE IF NOT EXISTS scores (
      id INT PRIMARY KEY AUTO_INCREMENT,
      local_id VARCHAR(64) COMMENT '客户端本地ID',
      ear_tag VARCHAR(32) NOT NULL COMMENT '牛号',
      farm_code VARCHAR(32) NOT NULL COMMENT '牧场编号',
      farm_name VARCHAR(100) COMMENT '牧场名称',
      user_id INT NOT NULL COMMENT '评分用户ID',
      employee_id VARCHAR(32) COMMENT '鉴定员工号',
      appraiser_name VARCHAR(64) COMMENT '鉴定员姓名',
      is_certified TINYINT DEFAULT 0 COMMENT '鉴定员是否认证',
      score_mode ENUM('normal', 'defect') DEFAULT 'normal' COMMENT '评分模式',

      -- 体躯容量 (18%)
      tg TINYINT NOT NULL COMMENT '体高',
      xk TINYINT NOT NULL COMMENT '胸宽',
      ts TINYINT NOT NULL COMMENT '体深',
      yqd TINYINT NOT NULL COMMENT '腰强度',

      -- 尻部 (10%)
      kjd TINYINT NOT NULL COMMENT '尻角度',
      kk TINYINT NOT NULL COMMENT '尻宽',

      -- 肢蹄 (26%)
      tjd TINYINT NOT NULL COMMENT '蹄角度',
      tgsd TINYINT NOT NULL COMMENT '蹄踵深度',
      gzd TINYINT NOT NULL COMMENT '骨质地',
      hzcs TINYINT NOT NULL COMMENT '后肢侧视',
      hzhs TINYINT NOT NULL COMMENT '后肢后视',

      -- 泌乳系统 (32%)
      rfsd TINYINT NOT NULL COMMENT '乳房深度',
      zyxrd TINYINT NOT NULL COMMENT '中央悬韧带',
      qrffz TINYINT NOT NULL COMMENT '前乳房附着',
      qrtwz TINYINT NOT NULL COMMENT '前乳头位置',
      qrtcd TINYINT NOT NULL COMMENT '前乳头长度',
      hrffzgd TINYINT NOT NULL COMMENT '后乳房附着高度',
      hrffzkd TINYINT NOT NULL COMMENT '后乳房附着宽度',
      hrtwz TINYINT NOT NULL COMMENT '后乳头位置',

      -- 乳用特征 (14%)
      ljx TINYINT NOT NULL COMMENT '棱角性',

      -- 计算结果
      total_score DECIMAL(5,2) NOT NULL COMMENT '总分',
      grade ENUM('Ex', 'VG', 'GP', 'G', 'F', 'P') NOT NULL COMMENT '等级',

      -- 元数据
      sync_status ENUM('pending', 'synced') DEFAULT 'synced' COMMENT '同步状态',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      FOREIGN KEY (user_id) REFERENCES users(id),
      INDEX idx_farm_created (farm_code, created_at),
      INDEX idx_local_id (local_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评分记录表';

    -- 照片表
    CREATE TABLE IF NOT EXISTS photos (
      id INT PRIMARY KEY AUTO_INCREMENT,
      score_id INT NOT NULL COMMENT '关联评分ID',
      user_id INT NOT NULL COMMENT '上传用户ID',
      oss_key VARCHAR(255) NOT NULL COMMENT 'OSS对象键',
      oss_url VARCHAR(500) COMMENT 'OSS访问URL',
      sync_status ENUM('pending', 'synced') DEFAULT 'synced' COMMENT '同步状态',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (score_id) REFERENCES scores(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='照片表';
  `

  try {
    await connection.query(sql)
    console.log('Tables created successfully')

    // 插入测试数据
    const testData = `
      -- 测试鉴定员数据
      INSERT IGNORE INTO appraiser_farms (employee_id, appraiser_name, is_certified, farm_code, farm_name) VALUES
        ('A001', '张三', 1, 'FM001', '大明牧场'),
        ('A001', '张三', 1, 'FM002', '光明牧场'),
        ('A002', '李四', 1, 'FM001', '大明牧场'),
        ('A003', '王五', 0, 'FM003', '新希望牧场');
    `

    await connection.query(testData)
    console.log('Test data inserted')

  } catch (err) {
    console.error('Error:', err.message)
  }

  await connection.end()
  console.log('Database initialization completed')
}

initDatabase().catch(console.error)
