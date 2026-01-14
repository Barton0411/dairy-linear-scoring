// src/scripts/sync-dhi-codes.js - 同步DHI编号到评分记录
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const db = require('../config/database');

async function syncDhiCodes() {
  console.log('开始同步DHI编号到评分记录...\n');

  try {
    // 1. 获取所有有DHI编号的牧场
    const [farms] = await db.query(
      'SELECT farm_code, dhi_code FROM farms WHERE dhi_code IS NOT NULL AND dhi_code != ""'
    );

    console.log(`找到 ${farms.length} 个有DHI编号的牧场:\n`);
    farms.forEach(f => {
      console.log(`  - ${f.farm_code}: ${f.dhi_code}`);
    });
    console.log('');

    if (farms.length === 0) {
      console.log('没有需要同步的牧场，退出。');
      await db.end();
      return;
    }

    // 2. 对每个牧场，更新其评分记录的DHI编号
    let totalUpdated = 0;

    for (const farm of farms) {
      const [result] = await db.query(
        `UPDATE scores
         SET dhi_code = ?
         WHERE farm_code = ?
         AND (dhi_code IS NULL OR dhi_code != ?)`,
        [farm.dhi_code, farm.farm_code, farm.dhi_code]
      );

      if (result.affectedRows > 0) {
        console.log(`✓ 牧场 ${farm.farm_code} (DHI: ${farm.dhi_code}): 更新了 ${result.affectedRows} 条记录`);
        totalUpdated += result.affectedRows;
      }
    }

    console.log('');
    console.log(`========================================`);
    console.log(`同步完成！共更新 ${totalUpdated} 条评分记录`);
    console.log(`========================================`);

  } catch (err) {
    console.error('同步失败:', err);
    process.exit(1);
  } finally {
    await db.end();
  }
}

syncDhiCodes();
