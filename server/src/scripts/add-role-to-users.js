// 为已存在的数据库添加role列
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })
const db = require('../config/database')

async function migrateRole() {
  try {
    console.log('开始迁移：添加role字段到users表...')

    // 检查role列是否已存在
    const [columns] = await db.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'role'
    `)

    if (columns.length === 0) {
      // 添加role列
      await db.query(`
        ALTER TABLE users
        ADD COLUMN role ENUM('appraiser', 'admin', 'super_admin')
        DEFAULT 'appraiser'
        COMMENT '管理员级别'
        AFTER is_certified
      `)
      console.log('✅ Role列添加成功')
    } else {
      console.log('⚠️  Role列已存在，跳过创建')
    }

    // 从appraisers表同步role到users表
    const [result] = await db.query(`
      UPDATE users u
      JOIN appraisers a ON u.employee_id = a.employee_id
      SET u.role = a.role
      WHERE u.employee_id IS NOT NULL
    `)

    console.log(`✅ Role字段同步成功，更新了 ${result.affectedRows} 条记录`)
    console.log('迁移完成！')

  } catch (err) {
    console.error('❌ 迁移失败:', err.message)
    console.error(err)
  }

  process.exit(0)
}

migrateRole()
