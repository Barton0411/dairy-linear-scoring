// 添加证书相关字段到 appraisers 表
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const db = require('../config/database');

(async () => {
  try {
    console.log('开始添加证书相关字段...\n');

    // 1. 添加 cert_status 字段
    try {
      await db.query(`
        ALTER TABLE appraisers
        ADD COLUMN cert_status ENUM('none', 'pending', 'approved', 'rejected')
        DEFAULT 'none'
        COMMENT '证书状态'
        AFTER is_certified
      `);
      console.log('✓ cert_status 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('- cert_status 字段已存在');
      } else {
        throw err;
      }
    }

    // 2. 添加 cert_approved_at 字段
    try {
      await db.query(`
        ALTER TABLE appraisers
        ADD COLUMN cert_approved_at DATETIME
        COMMENT '通过审批时间'
        AFTER cert_status
      `);
      console.log('✓ cert_approved_at 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('- cert_approved_at 字段已存在');
      } else {
        throw err;
      }
    }

    // 3. 添加 cert_approved_by 字段
    try {
      await db.query(`
        ALTER TABLE appraisers
        ADD COLUMN cert_approved_by VARCHAR(32)
        COMMENT '审批人工号'
        AFTER cert_approved_at
      `);
      console.log('✓ cert_approved_by 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('- cert_approved_by 字段已存在');
      } else {
        throw err;
      }
    }

    // 4. 创建 certificate_applications 表
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS certificate_applications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          employee_id VARCHAR(32) NOT NULL COMMENT '鉴定员工号',
          appraiser_name VARCHAR(64) NOT NULL COMMENT '鉴定员姓名',
          oss_key VARCHAR(255) NOT NULL COMMENT 'OSS对象键',
          oss_url VARCHAR(500) NOT NULL COMMENT 'OSS访问URL',
          file_size INT COMMENT '文件大小(字节)',
          status ENUM('pending', 'approved', 'rejected', 'withdrawn') DEFAULT 'pending' COMMENT '申请状态',
          reject_reason VARCHAR(500) COMMENT '拒绝原因',
          reviewed_by VARCHAR(32) COMMENT '审批人工号',
          reviewed_by_name VARCHAR(64) COMMENT '审批人姓名',
          reviewed_at DATETIME COMMENT '审批时间',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_employee (employee_id),
          INDEX idx_status (status),
          FOREIGN KEY (employee_id) REFERENCES appraisers(employee_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='证书申请记录表'
      `);
      console.log('✓ certificate_applications 表已创建');
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('- certificate_applications 表已存在');
      } else {
        throw err;
      }
    }

    // 验证字段
    const [columns] = await db.query('SHOW COLUMNS FROM appraisers LIKE "cert%"');
    console.log('\n当前证书相关字段：');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });

    console.log('\n✓ 所有字段添加完成！');
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
