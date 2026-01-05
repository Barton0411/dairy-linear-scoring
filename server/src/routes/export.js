// src/routes/export.js - 数据导出路由
const express = require('express')
const xlsx = require('xlsx')
const db = require('../config/database')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

/**
 * 性状字段映射
 */
const TRAIT_FIELDS = [
  'tg', 'xk', 'ts', 'yqd',
  'kjd', 'kk',
  'tjd', 'tgsd', 'gzd', 'hzcs', 'hzhs',
  'rfsd', 'zyxrd', 'qrffz', 'qrtwz', 'qrtcd',
  'hrffzgd', 'hrffzkd', 'hrtwz',
  'ljx'
]

/**
 * 格式化日期
 */
function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 荷斯坦协会版本 Excel 导出（27列）
 */
function generateHolsteinData(records) {
  // 表头
  const headers = [
    '牛场编号',
    '管理号',
    '胎次',
    '鉴定日期',
    '鉴定员',
    '体高', '胸宽', '体深', '腰强度',
    '尻角度', '尻宽',
    '蹄角度', '蹄踵深度', '骨质地', '后肢侧视', '后肢后视',
    '乳房深度', '中央悬韧带', '前乳房附着', '前乳头位置', '前乳头长度',
    '后乳头位置', '后乳房附着高度', '后乳房附着宽度',
    '棱角性',
    '印象分',
    '乳房空满'
  ]

  // 数据行
  const rows = records.map(record => [
    record.dhi_code || '',                  // 牛场编号（DHI编号）
    record.ear_tag || '',                   // 管理号（耳号）
    record.parity || '',                    // 胎次
    formatDate(record.created_at),          // 鉴定日期
    record.appraiser_name || '',            // 鉴定员
    record.tg || '', record.xk || '', record.ts || '', record.yqd || '',
    record.kjd || '', record.kk || '',
    record.tjd || '', record.tgsd || '', record.gzd || '', record.hzcs || '', record.hzhs || '',
    record.rfsd || '', record.zyxrd || '', record.qrffz || '', record.qrtwz || '', record.qrtcd || '',
    record.hrtwz || '', record.hrffzgd || '', record.hrffzkd || '',
    record.ljx || '',
    record.impression_score || '',          // 印象分
    record.udder_fullness || ''             // 乳房空满
  ])

  return [headers, ...rows]
}

/**
 * 常规版本 Excel 导出（30列）
 */
function generateRegularData(records) {
  // 表头
  const headers = [
    '伊起牛牧场站号',
    '牧场名',
    '牛场编号（DHI编号）',
    '管理号',
    '胎次',
    '鉴定日期',
    '鉴定员工号',
    '鉴定员',
    '体高', '胸宽', '体深', '腰强度',
    '尻角度', '尻宽',
    '蹄角度', '蹄踵深度', '骨质地', '后肢侧视', '后肢后视',
    '乳房深度', '中央悬韧带', '前乳房附着', '前乳头位置', '前乳头长度',
    '后乳头位置', '后乳房附着高度', '后乳房附着宽度',
    '棱角性',
    '印象分',
    '乳房空满'
  ]

  // 数据行
  const rows = records.map(record => [
    record.farm_code || '',                 // 伊起牛牧场站号
    record.farm_name || '',                 // 牧场名
    record.dhi_code || '',                  // 牛场编号（DHI编号）
    record.ear_tag || '',                   // 管理号（耳号）
    record.parity || '',                    // 胎次
    formatDate(record.created_at),          // 鉴定日期
    record.employee_id || '',               // 鉴定员工号
    record.appraiser_name || '',            // 鉴定员
    record.tg || '', record.xk || '', record.ts || '', record.yqd || '',
    record.kjd || '', record.kk || '',
    record.tjd || '', record.tgsd || '', record.gzd || '', record.hzcs || '', record.hzhs || '',
    record.rfsd || '', record.zyxrd || '', record.qrffz || '', record.qrtwz || '', record.qrtcd || '',
    record.hrtwz || '', record.hrffzgd || '', record.hrffzkd || '',
    record.ljx || '',
    record.impression_score || '',          // 印象分
    record.udder_fullness || ''             // 乳房空满
  ])

  return [headers, ...rows]
}

/**
 * 导出评分记录（单条或批量）
 * POST /api/export
 * Body: { recordIds: [1,2,3], version: 'holstein'|'regular' }
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { recordIds, version = 'regular' } = req.body

    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return res.status(400).json({ error: '缺少记录ID' })
    }

    // 查询评分记录
    const placeholders = recordIds.map(() => '?').join(',')
    const [records] = await db.query(
      `SELECT * FROM scores WHERE id IN (${placeholders}) ORDER BY created_at DESC`,
      recordIds
    )

    if (records.length === 0) {
      return res.status(404).json({ error: '未找到记录' })
    }

    // 权限检查
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin'

    if (!isAdmin) {
      // 检查是否所有记录都属于用户有权访问的牧场
      const farmCodes = [...new Set(records.map(r => r.farm_code))]

      for (const farmCode of farmCodes) {
        const [farmAccess] = await db.query(
          'SELECT 1 FROM appraiser_farms WHERE employee_id = ? AND farm_code = ?',
          [req.user.employeeId, farmCode]
        )

        if (farmAccess.length === 0) {
          return res.status(403).json({ error: `无权导出牧场 ${farmCode} 的记录` })
        }
      }
    }

    // 检查DHI编号（荷斯坦版本必须）
    if (version === 'holstein') {
      const noDhiRecords = records.filter(r => !r.dhi_code)
      if (noDhiRecords.length > 0) {
        return res.status(400).json({ error: `有 ${noDhiRecords.length} 条记录缺少DHI编号` })
      }
    }

    // 生成数据
    const data = version === 'holstein'
      ? generateHolsteinData(records)
      : generateRegularData(records)

    // 创建工作簿
    const wb = xlsx.utils.book_new()
    const ws = xlsx.utils.aoa_to_sheet(data)

    // 设置列宽
    const colWidths = data[0].map((_, i) => {
      const maxLen = Math.max(
        ...data.map(row => String(row[i] || '').length)
      )
      return { wch: Math.min(Math.max(maxLen + 2, 10), 30) }
    })
    ws['!cols'] = colWidths

    xlsx.utils.book_append_sheet(wb, ws, '评分记录')

    // 生成文件名
    const versionLabel = version === 'holstein' ? '荷斯坦协会版' : '常规版'
    const farmName = records[0].farm_name || ''
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const filename = `奶牛评分记录_${versionLabel}_${farmName}_${date}.xlsx`

    // 生成 buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.setHeader('Content-Length', buffer.length)

    // 发送文件
    res.send(buffer)

  } catch (err) {
    console.error('Export error:', err)
    res.status(500).json({ error: '导出失败' })
  }
})

module.exports = router
