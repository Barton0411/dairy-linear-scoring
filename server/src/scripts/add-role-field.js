// 添加role字段到 appraisers 表
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const db = require('../config/database');

(async () => {
  try {
    console.log('开始添加role字段...\n');

    // 添加 role 字段
    try {
      await db.query(`
        ALTER TABLE appraisers
        ADD COLUMN role ENUM('appraiser', 'admin', 'super_admin')
        DEFAULT 'appraiser'
        COMMENT '管理员级别'
        AFTER appraiser_name
      `);
      console.log('✓ role 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('- role 字段已存在');
      } else {
        throw err;
      }
    }

    // 设置超级管理员角色
    try {
      const [result] = await db.query(`
        UPDATE appraisers
        SET role = 'super_admin'
        WHERE employee_id = '10075345'
      `);
      if (result.affectedRows > 0) {
        console.log('✓ 已设置 10075345 为超级管理员');
      } else {
        console.log('- 未找到工号 10075345');
      }
    } catch (err) {
      console.error('设置超级管理员失败:', err.message);
    }

    // 验证字段
    const [columns] = await db.query('SHOW COLUMNS FROM appraisers LIKE "role"');
    if (columns.length > 0) {
      console.log('\n当前role字段信息：');
      console.log(`  - ${columns[0].Field}: ${columns[0].Type}, 默认值: ${columns[0].Default}`);
    }

    console.log('\n✓ role字段添加完成！');
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
