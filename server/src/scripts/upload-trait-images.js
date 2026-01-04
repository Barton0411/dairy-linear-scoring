// src/scripts/upload-trait-images.js - 上传特征图片到OSS
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const ossClient = require('../config/oss');

// 特征图片列表
const traitImages = [
  '体高.png',
  '胸宽.png',
  '体深.png',
  '腰强度.png',
  '尻角度.png',
  '尻宽.png',
  '蹄角度.png',
  '蹄踵深度.png',
  '骨质地.png',
  '后肢侧视.png',
  '后肢后视.png',
  '乳房深度.png',
  '中央悬韧带.png',
  '前乳房附着.png',
  '前乳头位置.png',
  '前乳头长度.png',
  '后乳房附着高度.png',
  '后乳房附着宽度.png',
  '后乳头位置.png',
  '棱角性.png'
];

async function uploadTraitImages() {
  console.log('开始上传特征图片到OSS...\n');

  // 本地图片目录（根据实际路径调整）
  const localImageDir = path.resolve(__dirname, '../../../miniprogram/img');

  let uploadedCount = 0;
  let failedCount = 0;

  for (const imageName of traitImages) {
    const localPath = path.join(localImageDir, imageName);
    const ossKey = `trait-images/${imageName}`;

    try {
      // 检查文件是否存在
      if (!fs.existsSync(localPath)) {
        console.log(`⚠️  文件不存在: ${imageName}`);
        failedCount++;
        continue;
      }

      // 读取文件
      const fileBuffer = fs.readFileSync(localPath);

      // 上传到OSS
      const result = await ossClient.put(ossKey, fileBuffer);

      // 生成公开URL
      const bucket = process.env.OSS_BUCKET;
      const region = process.env.OSS_REGION;
      const ossUrl = `https://${bucket}.${region}.aliyuncs.com/${ossKey}`;

      console.log(`✓ ${imageName}`);
      console.log(`  URL: ${ossUrl}`);
      uploadedCount++;

    } catch (err) {
      console.error(`✗ 上传失败: ${imageName}`);
      console.error(`  错误: ${err.message}`);
      failedCount++;
    }
  }

  console.log('\n========================================');
  console.log(`上传完成！`);
  console.log(`成功: ${uploadedCount} 个`);
  console.log(`失败: ${failedCount} 个`);
  console.log(`========================================`);
  console.log(`\nOSS 基础URL: https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/trait-images/`);
}

uploadTraitImages().catch(err => {
  console.error('上传过程出错:', err);
  process.exit(1);
});
