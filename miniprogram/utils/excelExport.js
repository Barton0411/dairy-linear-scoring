// utils/excelExport.js - Excel 导出工具
const { formatDate } = require('./util')
const { request } = require('./request')

/**
 * 性状key到中文名称的映射
 */
const TRAIT_NAMES = {
  tg: '体高',
  xk: '胸宽',
  ts: '体深',
  yqd: '腰强度',
  kjd: '尻角度',
  kk: '尻宽',
  tjd: '蹄角度',
  tgsd: '蹄踵深度',
  gzd: '骨质地',
  hzcs: '后肢侧视',
  hzhs: '后肢后视',
  rfsd: '乳房深度',
  zyxrd: '中央悬韧带',
  qrffz: '前乳房附着',
  qrtwz: '前乳头位置',
  qrtcd: '前乳头长度',
  hrffzgd: '后乳房附着高度',
  hrffzkd: '后乳房附着宽度',
  hrtwz: '后乳头位置',
  ljx: '棱角性'
}

/**
 * 荷斯坦协会版本 Excel 导出（27列）
 * 列顺序：牛场编号, 管理号, 胎次, 鉴定日期, 鉴定员, 20个性状, 印象分, 乳房空满
 */
function exportHolsteinVersion(records) {
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
  const rows = records.map(record => {
    const scores = record.scores || {}
    return [
      record.dhiCode || '',                  // 牛场编号（DHI编号）
      record.earTag || '',                   // 管理号（耳号）
      record.parity || '',                   // 胎次
      formatDate(record.createdAt, 'YYYY-MM-DD'), // 鉴定日期
      record.appraiserName || '',            // 鉴定员
      scores.tg || '',  scores.xk || '',  scores.ts || '',  scores.yqd || '',
      scores.kjd || '', scores.kk || '',
      scores.tjd || '', scores.tgsd || '', scores.gzd || '', scores.hzcs || '', scores.hzhs || '',
      scores.rfsd || '', scores.zyxrd || '', scores.qrffz || '', scores.qrtwz || '', scores.qrtcd || '',
      scores.hrtwz || '', scores.hrffzgd || '', scores.hrffzkd || '',
      scores.ljx || '',
      record.impressionScore || '',         // 印象分
      record.udderFullness || ''            // 乳房空满
    ]
  })

  return { headers, rows }
}

/**
 * 常规版本 Excel 导出（30列）
 * 列顺序：伊起牛牧场站号, 牧场名, 牛场编号（DHI编号）, 管理号, 胎次, 鉴定日期, 鉴定员工号, 鉴定员, 20个性状, 印象分, 乳房空满
 */
function exportRegularVersion(records) {
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
  const rows = records.map(record => {
    const scores = record.scores || {}
    return [
      record.farmCode || '',                 // 伊起牛牧场站号
      record.farmName || '',                 // 牧场名
      record.dhiCode || '',                  // 牛场编号（DHI编号）
      record.earTag || '',                   // 管理号（耳号）
      record.parity || '',                   // 胎次
      formatDate(record.createdAt, 'YYYY-MM-DD'), // 鉴定日期
      record.employeeId || '',               // 鉴定员工号
      record.appraiserName || '',            // 鉴定员
      scores.tg || '',  scores.xk || '',  scores.ts || '',  scores.yqd || '',
      scores.kjd || '', scores.kk || '',
      scores.tjd || '', scores.tgsd || '', scores.gzd || '', scores.hzcs || '', scores.hzhs || '',
      scores.rfsd || '', scores.zyxrd || '', scores.qrffz || '', scores.qrtwz || '', scores.qrtcd || '',
      scores.hrtwz || '', scores.hrffzgd || '', scores.hrffzkd || '',
      scores.ljx || '',
      record.impressionScore || '',         // 印象分
      record.udderFullness || ''            // 乳房空满
    ]
  })

  return { headers, rows }
}

/**
 * 生成 Excel 2003 XML 格式内容（SpreadsheetML）
 */
function generateExcelXML(headers, rows) {
  // XML 转义函数
  const escapeXml = (str) => {
    if (str === null || str === undefined) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  // 生成单元格 XML
  const generateCell = (value) => {
    const escapedValue = escapeXml(value)
    // 判断是否为数字
    const isNumber = !isNaN(value) && value !== '' && value !== null && value !== undefined
    const dataType = isNumber ? 'Number' : 'String'
    return `<Cell><Data ss:Type="${dataType}">${escapedValue}</Data></Cell>`
  }

  // 生成行 XML
  const generateRow = (cells) => {
    const cellsXml = cells.map(generateCell).join('')
    return `<Row>${cellsXml}</Row>`
  }

  // 构建完整的 XML
  const xmlParts = [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '<Worksheet ss:Name="评分记录">',
    '<Table>',
    // 表头行
    generateRow(headers),
    // 数据行
    ...rows.map(row => generateRow(row)),
    '</Table>',
    '</Worksheet>',
    '</Workbook>'
  ]

  return xmlParts.join('\n')
}

/**
 * 保存 Excel 文件到本地（微信小程序版本）
 * 文件格式：Excel 2003 XML (SpreadsheetML)
 */
function saveExcelFile(xmlContent, filename) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/${filename}`

    // Excel 2003 XML 需要 UTF-8 BOM
    const BOM = '\uFEFF'
    const content = BOM + xmlContent

    fs.writeFile({
      filePath,
      data: content,
      encoding: 'utf8',
      success: () => {
        // 检测运行环境
        const systemInfo = wx.getSystemInfoSync()
        const isPc = systemInfo.platform === 'devtools' || systemInfo.platform === 'windows' || systemInfo.platform === 'mac'

        if (isPc && typeof wx.saveFileToDisk === 'function') {
          // PC端：直接保存文件到磁盘
          wx.saveFileToDisk({
            filePath,
            fileName: filename,
            success: () => {
              resolve({ filePath, fileName: filename, success: true, saved: true })
            },
            fail: (err) => {
              const errMsg = err?.errMsg || ''
              const canceled = errMsg.includes('cancel')
              if (canceled) {
                resolve({ filePath, fileName: filename, success: false, saved: false, canceled: true })
              } else {
                reject(new Error(`保存文件失败: ${errMsg}`))
              }
            }
          })
        } else {
          // 真机：直接打开文件（降级方案）
          if (typeof wx.openDocument === 'function') {
            wx.openDocument({
              filePath,
              fileType: 'xls',
              showMenu: true,
              success: () => {
                resolve({ filePath, fileName: filename, success: true, opened: true })
              },
              fail: (err) => {
                console.error('[导出] 打开失败:', err)
                resolve({
                  filePath,
                  fileName: filename,
                  success: true,
                  opened: false,
                  message: err?.errMsg || '打开失败'
                })
              }
            })
          } else {
            resolve({ filePath, fileName: filename, success: true, opened: false })
          }
        }
      },
      fail: reject
    })
  })
}

/**
 * 从服务器导出评分记录（新方法 - 生成真正的.xlsx）
 * @param {Array} records - 评分记录数组
 * @param {String} version - 导出版本: 'holstein' | 'regular'
 * @param {String} farmName - 牧场名称（用于文件名）
 */
async function exportRecordsFromServer(records, version = 'regular', farmName = '') {
  if (!records || records.length === 0) {
    throw new Error('没有可导出的记录')
  }

  // 提取记录ID
  const recordIds = records.map(r => r.id).filter(id => id)
  if (recordIds.length === 0) {
    throw new Error('没有有效的记录ID')
  }

  try {
    // 调用后端接口获取Excel文件（直接使用wx.request以支持arraybuffer）
    const token = wx.getStorageSync('token')
    const app = getApp()

    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/api/export`,
        method: 'POST',
        data: {
          recordIds,
          version
        },
        responseType: 'arraybuffer', // 接收二进制数据
        header: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        success: (response) => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(response.data)
          } else {
            reject(new Error(`导出失败: ${response.statusCode}`))
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || '网络请求失败'))
        }
      })
    })

    // 生成文件名
    const date = formatDate(new Date(), 'YYYYMMDD_HHmmss')
    const versionLabel = version === 'holstein' ? '荷斯坦协会版' : '常规版'
    const farmLabel = farmName ? `_${farmName}` : ''
    const filename = `奶牛评分记录_${versionLabel}${farmLabel}_${date}.xlsx`

    // 保存文件到本地
    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/${filename}`

    return new Promise((resolve, reject) => {
      fs.writeFile({
        filePath,
        data: res,
        encoding: 'binary',
        success: () => {
          // 检测运行环境
          const systemInfo = wx.getSystemInfoSync()
          const isPc = systemInfo.platform === 'devtools' || systemInfo.platform === 'windows' || systemInfo.platform === 'mac'

          if (isPc && typeof wx.saveFileToDisk === 'function') {
            // PC端：直接保存文件到磁盘
            wx.saveFileToDisk({
              filePath,
              fileName: filename,
              success: () => {
                resolve({ filePath, fileName: filename, success: true, saved: true })
              },
              fail: (err) => {
                const errMsg = err?.errMsg || ''
                const canceled = errMsg.includes('cancel')
                if (canceled) {
                  resolve({ filePath, fileName: filename, success: false, saved: false, canceled: true })
                } else {
                  reject(new Error(`保存文件失败: ${errMsg}`))
                }
              }
            })
          } else {
            // 真机：直接打开文件
            wx.openDocument({
              filePath,
              fileType: 'xlsx',
              showMenu: true,
              success: () => {
                resolve({ filePath, fileName: filename, success: true, opened: true })
              },
              fail: (err) => {
                console.error('[导出] 打开失败:', err)
                resolve({
                  filePath,
                  fileName: filename,
                  success: true,
                  opened: false,
                  message: err?.errMsg || '打开失败'
                })
              }
            })
          }
        },
        fail: (err) => {
          reject(new Error(`写入文件失败: ${err.errMsg}`))
        }
      })
    })
  } catch (err) {
    console.error('[导出] 调用后端接口失败:', err)
    throw new Error(err.message || '导出失败')
  }
}

/**
 * 导出评分记录（主入口 - 保留旧方法作为降级方案）
 * @param {Array} records - 评分记录数组
 * @param {String} version - 导出版本: 'holstein' | 'regular'
 * @param {String} farmName - 牧场名称（用于文件名）
 */
async function exportRecords(records, version = 'regular', farmName = '') {
  // 优先使用服务器端导出（生成真正的.xlsx）
  try {
    return await exportRecordsFromServer(records, version, farmName)
  } catch (serverErr) {
    console.warn('[导出] 服务器导出失败，使用本地降级方案:', serverErr)
    // 降级到本地XML格式导出
    return await exportRecordsLocal(records, version, farmName)
  }
}

/**
 * 本地导出（降级方案 - Excel 2003 XML格式）
 */
async function exportRecordsLocal(records, version = 'regular', farmName = '') {
  if (!records || records.length === 0) {
    throw new Error('没有可导出的记录')
  }

  // 生成数据
  let data
  if (version === 'holstein') {
    data = exportHolsteinVersion(records)
  } else {
    data = exportRegularVersion(records)
  }

  // 生成 Excel 2003 XML 内容
  const xmlContent = generateExcelXML(data.headers, data.rows)

  // 生成文件名（使用.xls扩展名）
  const date = formatDate(new Date(), 'YYYYMMDD_HHmmss')
  const versionLabel = version === 'holstein' ? '荷斯坦协会版' : '常规版'
  const farmLabel = farmName ? `_${farmName}` : ''
  const filename = `奶牛评分记录_${versionLabel}${farmLabel}_${date}.xls`

  // 保存并打开文件
  return await saveExcelFile(xmlContent, filename)
}

module.exports = {
  exportRecords,
  exportHolsteinVersion,
  exportRegularVersion
}
