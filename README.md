# 奶牛线性评定系统 | Dairy Linear Scoring System

## 📋 项目简介 | Project Overview

本项目旨在开发一个移动端奶牛体型外貌线性评定系统，用于专业鉴定人员在牧场现场对奶牛进行标准化评分。

This project aims to develop a mobile dairy cattle conformation linear scoring system for professional classifiers to conduct standardized evaluations at dairy farms.

## 🎯 核心功能 | Core Features

### 1. 双模式评定 | Dual Scoring Modes
- **正常模式**：对20个线性性状逐一评分（1-9分）
- **缺陷模式**：仅对异常性状打分，其他使用默认值

### 2. 评定性状 | Scoring Traits
基于 GB/T 35568-2017 和 T/DACS 002-2021 标准：

**体躯容量（18%）**
- 体高、胸宽、体深、腰强度

**尻部（10%）**
- 尻角度、尻宽、腰强度

**肢蹄（20%）**
- 蹄角度、蹄踵深度、骨质地、后肢侧视、后肢后视

**泌乳系统（42%）**
- 乳房深度、中央悬韧带、前乳房附着、前乳头位置、前乳头长度
- 后乳房附着高度、后乳房附着宽度、后乳头位置

**乳用特征（10%）**
- 棱角性

### 3. 拍照存储 | Photo Storage
- 高分/低分牛只自动提示拍照
- 严重缺陷性状记录
- 图片压缩与云端同步

### 4. 数据管理 | Data Management
- 离线评分存储
- 数据导出（Excel/PDF）
- 云端平台上传

## 📂 项目结构 | Project Structure

```
dairy-linear-scoring/
├── docs/                   # 标准文档
│   ├── 569e46c1...pdf     # GB/T 35568-2017 中国荷斯坦牛体型鉴定技术规程
│   └── da451265...pdf     # T/DACS 002-2021 荷斯坦牛体型鉴定操作技术规范
├── src/                    # 源代码（待开发）
├── README.md              # 项目说明
└── .gitignore            # Git忽略文件
```

## 🛠️ 技术方案 | Technology Stack

### 方案一：微信小程序（推荐）
- 开发框架：uni-app / 原生小程序
- 后端：Node.js / Java
- 数据库：MySQL
- 存储：阿里云OSS

### 方案二：跨平台APP
- 框架：uni-app / Flutter
- 支持：iOS + Android + 小程序

## 📱 功能设计 | Feature Design

### 评分界面
```
[牛只基本信息]
耳号：____________  胎次：___  泌乳天数：___

[评分模式切换]
○ 正常模式   ○ 缺陷模式

[性状评分]
体高：  1  2  3  4  [5]  6  7  8  9
胸宽：  1  2  3  4  [5]  6  7  8  9
...

[拍照]  [保存]  [提交]
```

### 拍照触发规则
- 体型总分 ≥ 85分（优秀）
- 体型总分 ≤ 65分（较差）
- 存在严重缺陷性状

## 📊 评分标准 | Scoring Standards

体型等级划分（GB/T 35568-2017）：
- 优（Ex）：90-100分
- 很好（VG）：85-89分
- 好佳（GP）：80-84分
- 好（G）：75-79分
- 一般（F）：65-74分
- 差（P）：65分以下

## 🚀 开发计划 | Development Plan

### MVP版本（预计3个月）
- [x] 需求分析
- [x] 标准文档整理
- [ ] UI/UX设计
- [ ] 基础评分功能
- [ ] 拍照功能
- [ ] 本地存储
- [ ] 数据导出

### 完整版本（预计6个月）
- [ ] 缺陷评定模式
- [ ] 云端同步
- [ ] 数据统计分析
- [ ] 历史记录查询
- [ ] 多鉴定员管理

## 📖 参考标准 | Reference Standards

1. GB/T 3157 中国荷斯坦牛
2. GB/T 35568-2017 中国荷斯坦牛体型鉴定技术规程
3. T/DACS 002-2021 荷斯坦牛体型鉴定操作技术规范

## 👥 贡献者 | Contributors

- 项目发起：@bozhenwang

## 📄 许可证 | License

MIT License

## 📞 联系方式 | Contact

如有问题或建议，请提交 Issue。

---

**开发状态**：规划阶段 | Planning Phase
**最后更新**：2025-12-27
