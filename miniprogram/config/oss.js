// OSS配置 - 云端图片资源
const OSS_BASE_URL = 'https://dairy-scoring-photos.oss-cn-beijing.aliyuncs.com'

// 特征图片基础路径
const TRAIT_IMAGE_BASE = `${OSS_BASE_URL}/trait-images`

// 特征名称映射
const TRAIT_NAME_MAP = {
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

// 获取特征图片URL
function getTraitImageUrl(traitKey) {
  const chineseName = TRAIT_NAME_MAP[traitKey]
  if (!chineseName) return ''
  return `${TRAIT_IMAGE_BASE}/${chineseName}.png`
}

module.exports = {
  OSS_BASE_URL,
  TRAIT_IMAGE_BASE,
  TRAIT_NAME_MAP,
  getTraitImageUrl
}
