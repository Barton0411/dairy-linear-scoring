/**
 * 奶牛线性评定系统 - 评分常量配置
 * Dairy Linear Scoring System - Scoring Constants
 *
 * 基于标准：GB/T 35568-2017 和 T/DACS 002-2021
 */

/**
 * 评分范围
 * Scoring Range
 */
export const SCORE_RANGE = {
  MIN: 1,
  MAX: 9,
  DEFAULT: 5
};

/**
 * 性状分类及权重配置
 * Trait Categories and Weight Configuration
 *
 * 基于 GB/T 35568-2017 标准
 */
export const TRAIT_CATEGORIES = {
  BODY_CAPACITY: {
    name: '体躯容量',
    nameEn: 'Body Capacity',
    weight: 0.18,
    traits: [
      { id: 'stature', name: '体高', nameEn: 'Stature' },
      { id: 'chest_width', name: '胸宽', nameEn: 'Chest Width' },
      { id: 'body_depth', name: '体深', nameEn: 'Body Depth' },
      { id: 'loin_strength', name: '腰强度', nameEn: 'Loin Strength' }
    ]
  },
  RUMP: {
    name: '尻部',
    nameEn: 'Rump',
    weight: 0.10,
    traits: [
      { id: 'rump_angle', name: '尻角度', nameEn: 'Rump Angle' },
      { id: 'rump_width', name: '尻宽', nameEn: 'Rump Width' },
      { id: 'rump_loin_strength', name: '腰强度', nameEn: 'Loin Strength' }
    ]
  },
  FEET_LEGS: {
    name: '肢蹄',
    nameEn: 'Feet and Legs',
    weight: 0.20,
    traits: [
      { id: 'foot_angle', name: '蹄角度', nameEn: 'Foot Angle' },
      { id: 'heel_depth', name: '蹄踵深度', nameEn: 'Heel Depth' },
      { id: 'bone_quality', name: '骨质地', nameEn: 'Bone Quality' },
      { id: 'rear_legs_side', name: '后肢侧视', nameEn: 'Rear Legs - Side View' },
      { id: 'rear_legs_rear', name: '后肢后视', nameEn: 'Rear Legs - Rear View' }
    ]
  },
  MAMMARY_SYSTEM: {
    name: '泌乳系统',
    nameEn: 'Mammary System',
    weight: 0.42,
    traits: [
      { id: 'udder_depth', name: '乳房深度', nameEn: 'Udder Depth' },
      { id: 'median_ligament', name: '中央悬韧带', nameEn: 'Median Suspensory Ligament' },
      { id: 'fore_attachment', name: '前乳房附着', nameEn: 'Fore Udder Attachment' },
      { id: 'fore_teat_placement', name: '前乳头位置', nameEn: 'Front Teat Placement' },
      { id: 'fore_teat_length', name: '前乳头长度', nameEn: 'Front Teat Length' },
      { id: 'rear_attachment_height', name: '后乳房附着高度', nameEn: 'Rear Udder Attachment Height' },
      { id: 'rear_attachment_width', name: '后乳房附着宽度', nameEn: 'Rear Udder Attachment Width' },
      { id: 'rear_teat_placement', name: '后乳头位置', nameEn: 'Rear Teat Placement' }
    ]
  },
  DAIRY_CHARACTER: {
    name: '乳用特征',
    nameEn: 'Dairy Character',
    weight: 0.10,
    traits: [
      { id: 'angularity', name: '棱角性', nameEn: 'Angularity' }
    ]
  }
};

/**
 * 所有性状列表（20个）
 * Complete Traits List (20 traits)
 */
export const ALL_TRAITS = Object.values(TRAIT_CATEGORIES)
  .flatMap(category =>
    category.traits.map(trait => ({
      ...trait,
      category: category.name,
      categoryEn: category.nameEn,
      categoryWeight: category.weight
    }))
  );

/**
 * 体型等级划分
 * Conformation Grade Classification
 */
export const GRADE_CLASSIFICATION = {
  EXCELLENT: { code: 'Ex', name: '优', minScore: 90, maxScore: 100 },
  VERY_GOOD: { code: 'VG', name: '很好', minScore: 85, maxScore: 89 },
  GOOD_PLUS: { code: 'GP', name: '好佳', minScore: 80, maxScore: 84 },
  GOOD: { code: 'G', name: '好', minScore: 75, maxScore: 79 },
  FAIR: { code: 'F', name: '一般', minScore: 65, maxScore: 74 },
  POOR: { code: 'P', name: '差', minScore: 0, maxScore: 64 }
};

/**
 * 拍照触发阈值
 * Photo Trigger Thresholds
 */
export const PHOTO_TRIGGERS = {
  HIGH_SCORE: 85,  // 优秀牛只
  LOW_SCORE: 65    // 较差牛只
};

/**
 * 评分模式
 * Scoring Modes
 */
export const SCORING_MODES = {
  NORMAL: 'normal',      // 正常模式：所有性状评分
  DEFECT: 'defect'       // 缺陷模式：仅异常性状评分
};
