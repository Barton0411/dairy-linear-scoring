// src/scripts/init-db.js - 数据库初始化脚本
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

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
    -- 牧场信息表
    CREATE TABLE IF NOT EXISTS farms (
      farm_code VARCHAR(32) PRIMARY KEY COMMENT '伊起牛牧场站号（主键）',
      farm_name VARCHAR(100) NOT NULL COMMENT '牧场名称',
      dhi_code VARCHAR(32) UNIQUE COMMENT 'DHI牧场编号（唯一，可空）',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_dhi (dhi_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='牧场信息表';

    -- 鉴定员信息表
    CREATE TABLE IF NOT EXISTS appraisers (
      employee_id VARCHAR(32) PRIMARY KEY COMMENT '鉴定员工号（主键）',
      appraiser_name VARCHAR(64) NOT NULL COMMENT '鉴定员姓名（可重复）',
      role ENUM('appraiser', 'admin', 'super_admin') DEFAULT 'appraiser' COMMENT '管理员级别',
      is_certified TINYINT DEFAULT 0 COMMENT '是否认证 (1=已认证, 0=未认证)',
      certificate_url VARCHAR(255) COMMENT '认证证书URL',
      cert_status ENUM('none', 'pending', 'approved', 'rejected') DEFAULT 'none' COMMENT '证书状态',
      cert_approved_at DATETIME COMMENT '通过审批时间',
      cert_approved_by VARCHAR(32) COMMENT '审批人工号',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='鉴定员信息表';

    -- 证书申请记录表
    CREATE TABLE IF NOT EXISTS certificate_applications (
      id INT PRIMARY KEY AUTO_INCREMENT,
      employee_id VARCHAR(32) NOT NULL COMMENT '鉴定员工号',
      appraiser_name VARCHAR(64) NOT NULL COMMENT '鉴定员姓名',

      -- 证书文件
      oss_key VARCHAR(255) NOT NULL COMMENT 'OSS对象键',
      oss_url VARCHAR(500) NOT NULL COMMENT 'OSS访问URL',
      file_size INT COMMENT '文件大小(字节)',

      -- 状态
      status ENUM('pending', 'approved', 'rejected', 'withdrawn') DEFAULT 'pending' COMMENT '申请状态',
      reject_reason VARCHAR(500) COMMENT '拒绝原因',

      -- 审批信息
      reviewed_by VARCHAR(32) COMMENT '审批人工号',
      reviewed_by_name VARCHAR(64) COMMENT '审批人姓名',
      reviewed_at DATETIME COMMENT '审批时间',

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_employee (employee_id),
      INDEX idx_status (status),
      FOREIGN KEY (employee_id) REFERENCES appraisers(employee_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='证书申请记录表';

    -- 鉴定员-牧场关联表
    CREATE TABLE IF NOT EXISTS appraiser_farms (
      id INT PRIMARY KEY AUTO_INCREMENT,
      employee_id VARCHAR(32) NOT NULL COMMENT '鉴定员工号',
      farm_code VARCHAR(32) NOT NULL COMMENT '牧场编号',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_employee_farm (employee_id, farm_code),
      INDEX idx_employee (employee_id),
      INDEX idx_farm (farm_code),
      FOREIGN KEY (employee_id) REFERENCES appraisers(employee_id) ON DELETE CASCADE,
      FOREIGN KEY (farm_code) REFERENCES farms(farm_code) ON DELETE CASCADE
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
      parity TINYINT COMMENT '胎次',
      farm_code VARCHAR(32) NOT NULL COMMENT '伊起牛牧场站号',
      farm_name VARCHAR(100) COMMENT '牧场名称',
      dhi_code VARCHAR(32) COMMENT 'DHI牧场编号',
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

      -- 肢蹄 (20%)
      tjd TINYINT NOT NULL COMMENT '蹄角度',
      tgsd TINYINT NOT NULL COMMENT '蹄踵深度',
      gzd TINYINT NOT NULL COMMENT '骨质地',
      hzcs TINYINT NOT NULL COMMENT '后肢侧视',
      hzhs TINYINT NOT NULL COMMENT '后肢后视',

      -- 泌乳系统 (42%)
      rfsd TINYINT NOT NULL COMMENT '乳房深度',
      zyxrd TINYINT NOT NULL COMMENT '中央悬韧带',
      qrffz TINYINT NOT NULL COMMENT '前乳房附着',
      qrtwz TINYINT NOT NULL COMMENT '前乳头位置',
      qrtcd TINYINT NOT NULL COMMENT '前乳头长度',
      hrffzgd TINYINT NOT NULL COMMENT '后乳房附着高度',
      hrffzkd TINYINT NOT NULL COMMENT '后乳房附着宽度',
      hrtwz TINYINT NOT NULL COMMENT '后乳头位置',

      -- 乳用特征 (10%)
      ljx TINYINT NOT NULL COMMENT '棱角性',

      -- 额外评分字段
      impression_score TINYINT COMMENT '印象分',
      udder_fullness VARCHAR(10) COMMENT '乳房空满',

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

    -- 用户设置表
    CREATE TABLE IF NOT EXISTS user_settings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT UNIQUE NOT NULL COMMENT '用户ID（唯一）',
      -- 默认分数（20个性状）
      default_tg TINYINT DEFAULT 5 COMMENT '默认体高分',
      default_xk TINYINT DEFAULT 5 COMMENT '默认胸宽分',
      default_ts TINYINT DEFAULT 5 COMMENT '默认体深分',
      default_yqd TINYINT DEFAULT 5 COMMENT '默认腰强度分',
      default_kjd TINYINT DEFAULT 5 COMMENT '默认尻角度分',
      default_kk TINYINT DEFAULT 5 COMMENT '默认尻宽分',
      default_tjd TINYINT DEFAULT 5 COMMENT '默认蹄角度分',
      default_tgsd TINYINT DEFAULT 5 COMMENT '默认蹄踵深度分',
      default_gzd TINYINT DEFAULT 5 COMMENT '默认骨质地分',
      default_hzcs TINYINT DEFAULT 5 COMMENT '默认后肢侧视分',
      default_hzhs TINYINT DEFAULT 5 COMMENT '默认后肢后视分',
      default_rfsd TINYINT DEFAULT 5 COMMENT '默认乳房深度分',
      default_zyxrd TINYINT DEFAULT 5 COMMENT '默认中央悬韧带分',
      default_qrffz TINYINT DEFAULT 5 COMMENT '默认前乳房附着分',
      default_qrtwz TINYINT DEFAULT 5 COMMENT '默认前乳头位置分',
      default_qrtcd TINYINT DEFAULT 5 COMMENT '默认前乳头长度分',
      default_hrffzgd TINYINT DEFAULT 5 COMMENT '默认后乳房附着高度分',
      default_hrffzkd TINYINT DEFAULT 5 COMMENT '默认后乳房附着宽度分',
      default_hrtwz TINYINT DEFAULT 5 COMMENT '默认后乳头位置分',
      default_ljx TINYINT DEFAULT 5 COMMENT '默认棱角性分',
      -- 其他默认值
      default_impression_score TINYINT DEFAULT 85 COMMENT '默认印象分',
      default_udder_fullness ENUM('空', '满', '') DEFAULT '空' COMMENT '默认乳房空满',
      -- 拍照设置
      photo_mode ENUM('always', 'threshold', 'never') DEFAULT 'always' COMMENT '拍照模式',
      photo_prompt_excellent TINYINT DEFAULT 0 COMMENT '高分提醒开关',
      photo_prompt_poor TINYINT DEFAULT 1 COMMENT '低分提醒开关',
      photo_threshold_excellent TINYINT DEFAULT 85 COMMENT '高分阈值',
      photo_threshold_poor TINYINT DEFAULT 65 COMMENT '低分阈值',
      max_photos TINYINT DEFAULT 5 COMMENT '最大照片数',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户设置表';
  `

  try {
    await connection.query(sql)
    console.log('Tables created successfully')

    // 插入测试数据
    const testData = `
      -- 测试牧场数据（farm_code 就是伊起牛站号）
      INSERT IGNORE INTO farms (farm_code, farm_name, dhi_code) VALUES
        ('YQN001', '大明牧场', 'DHI001'),
        ('YQN002', '光明牧场', 'DHI002'),
        ('YQN003', '新希望牧场', NULL),
        ('YQN004', '测试牧场', 'DHI004');

      -- 测试鉴定员数据
      INSERT IGNORE INTO appraisers (employee_id, appraiser_name, is_certified) VALUES
        ('A001', '张三', 1),
        ('A002', '李四', 1),
        ('A003', '王五', 0),
        ('10075345', '王波臻', 1);

      -- 鉴定员-牧场关联
      INSERT IGNORE INTO appraiser_farms (employee_id, farm_code) VALUES
        ('A001', 'YQN001'),
        ('A001', 'YQN002'),
        ('A002', 'YQN001'),
        ('A003', 'YQN003'),
        ('10075345', 'YQN001'),
        ('10075345', 'YQN002'),
        ('10075345', 'YQN003'),
        ('10075345', 'YQN004');

      -- 测试用户（关联鉴定员）
      INSERT IGNORE INTO users (openid, employee_id, appraiser_name, is_certified) VALUES
        ('test_openid_001', '10075345', '王波臻', 1),
        ('test_openid_002', 'A001', '张三', 1),
        ('test_openid_003', 'A002', '李四', 1);

      -- 测试牛只
      INSERT IGNORE INTO cattle (ear_tag, farm_code) VALUES
        ('123123', 'YQN001'),
        ('456456', 'YQN001'),
        ('789789', 'YQN002'),
        ('111222', 'YQN003');

      -- 测试评分记录（包含完整的20个性状分值）
      INSERT IGNORE INTO scores (
        local_id, ear_tag, parity, farm_code, farm_name, user_id,
        employee_id, appraiser_name, is_certified, score_mode,
        tg, xk, ts, yqd, kjd, kk, tjd, tgsd, gzd, hzcs, hzhs,
        rfsd, zyxrd, qrffz, qrtwz, qrtcd, hrffzgd, hrffzkd, hrtwz, ljx,
        total_score, grade, created_at
      ) VALUES
        -- 优秀牛只 (Ex级别, 90+分)
        ('test_001', '123123', 2, 'YQN001', '大明牧场', 1,
         '10075345', '王波臻', 1, 'normal',
         7, 7, 8, 7, 6, 7, 7, 7, 7, 6, 6,
         8, 8, 8, 7, 7, 8, 8, 7, 7,
         82.00, 'GP', '2026-01-04 10:30:00'),

        -- 良好牛只 (VG级别, 85-89分)
        ('test_002', '456456', 3, 'YQN001', '大明牧场', 1,
         '10075345', '王波臻', 1, 'normal',
         6, 6, 7, 6, 6, 6, 6, 6, 6, 5, 5,
         7, 7, 7, 6, 6, 7, 7, 6, 6,
         78.50, 'G', '2026-01-03 14:20:00'),

        -- 一般牛只 (GP级别, 80-84分)
        ('test_003', '789789', 1, 'YQN002', '光明牧场', 2,
         'A001', '张三', 1, 'normal',
         5, 6, 6, 5, 5, 5, 6, 6, 5, 5, 5,
         6, 6, 6, 5, 5, 6, 6, 5, 5,
         72.30, 'F', '2026-01-02 09:15:00'),

        -- 较差牛只 (F级别, 65-74分)
        ('test_004', '111222', 4, 'YQN003', '新希望牧场', 3,
         'A002', '李四', 1, 'normal',
         4, 5, 5, 4, 4, 4, 5, 5, 4, 4, 4,
         5, 5, 5, 4, 4, 5, 5, 4, 4,
         65.80, 'F', '2026-01-01 16:45:00');
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
