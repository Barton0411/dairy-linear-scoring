// 测试离线数据脚本
// 在微信开发者工具控制台中运行此代码来模拟离线评分数据

// 1. 清空现有离线数据
wx.removeStorageSync('offlineScores')

// 2. 创建测试数据
const testOfflineScores = [
  {
    localId: '1703822400000_test1',
    farmCode: 'YQN001',
    farmName: '大明牧场',
    dhiCode: 'DHI001',
    earTag: 'TEST001',
    parity: 2,
    mode: 'normal',
    scores: {
      tg: 6, xk: 7, ts: 6, yqd: 7,
      kjd: 6, kk: 7,
      tjd: 6, tgsd: 7, gzd: 6, hzcs: 6, hzhs: 6,
      rfsd: 7, zyxrd: 7, qrffz: 7, qrtwz: 6, qrtcd: 6, hrffzgd: 7, hrffzkd: 7, hrtwz: 6,
      ljx: 7
    },
    impressionScore: null,
    udderFullness: '',
    totalScore: 82,
    grade: 'GP',
    photos: [],
    createdAt: '2025-12-28T10:30:00.000Z',
    employeeId: 'A001',
    appraiserName: '张三',
    isCertified: true
  },
  {
    localId: '1703826000000_test2',
    farmCode: 'YQN002',
    farmName: '光明牧场',
    dhiCode: 'DHI002',
    earTag: 'TEST002',
    parity: 3,
    mode: 'defect',
    scores: {
      tg: 5, xk: 5, ts: 5, yqd: 5,
      kjd: 5, kk: 5,
      tjd: 5, tgsd: 5, gzd: 5, hzcs: 5, hzhs: 5,
      rfsd: 5, zyxrd: 5, qrffz: 5, qrtwz: 5, qrtcd: 5, hrffzgd: 5, hrffzkd: 5, hrtwz: 5,
      ljx: 5
    },
    impressionScore: null,
    udderFullness: '',
    totalScore: 75,
    grade: 'G',
    photos: [],
    createdAt: '2025-12-28T11:15:00.000Z',
    employeeId: 'A001',
    appraiserName: '张三',
    isCertified: true
  },
  {
    localId: '1703829600000_test3',
    farmCode: 'YQN001',
    farmName: '大明牧场',
    dhiCode: 'DHI001',
    earTag: 'TEST003',
    parity: 1,
    mode: 'normal',
    scores: {
      tg: 8, xk: 9, ts: 8, yqd: 8,
      kjd: 8, kk: 8,
      tjd: 8, tgsd: 8, gzd: 8, hzcs: 8, hzhs: 8,
      rfsd: 8, zyxrd: 9, qrffz: 9, qrtwz: 8, qrtcd: 8, hrffzgd: 9, hrffzkd: 9, hrtwz: 8,
      ljx: 8
    },
    impressionScore: null,
    udderFullness: '',
    totalScore: 90,
    grade: 'Ex',
    photos: [],
    createdAt: '2025-12-28T12:00:00.000Z',
    employeeId: 'A001',
    appraiserName: '张三',
    isCertified: true
  }
]

// 3. 保存测试数据到本地存储
wx.setStorageSync('offlineScores', testOfflineScores)

// 4. 验证数据已保存
const saved = wx.getStorageSync('offlineScores')
console.log('已保存的离线评分数据：', saved)
console.log('数据类型检查：', Array.isArray(saved) ? '✅ 是数组' : '❌ 不是数组')
console.log('数据数量：', saved.length)

// 5. 输出使用说明
console.log('\n✅ 测试数据已创建！')
console.log('现在应该可以看到主页显示：')
console.log('  - 待上传: 3 条评分')
console.log('  - TEST001 (82分, GP等级)')
console.log('  - TEST002 (75分, G等级)')
console.log('  - TEST003 (90分, Ex等级)')
console.log('\n刷新页面查看效果！')
