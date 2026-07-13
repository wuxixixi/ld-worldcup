# 📝 Changelog

本项目的所有重要变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 🚀 即将发布
- GitHub Actions CI/CD 三阶段流水线（质量检查 / 多环境部署 / 自动发布）
- Renovate 自动化依赖更新
- Issue / PR 模板 + CODEOWNERS
- 完善的数据 API 文档

---

## [1.4.0] - 2026-07-13

### ✨ Added（新增）
- **🏆 1/4 决赛数据完整**:4 场全部预测正确(100% 准确率)
- **📊 6 张数据驱动可视化**:模型准确率 / 各阶段战绩 / 置信度分布 / 比赛战况 / 球队胜率 / 晋级路径
- **🔄 服务端自动拉取**:`deploy/fetch.py` + cron 每 30 分钟从 `bracketmundial2026.com` 拉取数据
- **🎯 智能刷新**:`js/app.js` 检测 `lastUpdate` 与 hash 变化,4 小时强制刷新
- **🐙 GitHub 仓库**:`wuxixixi/ld-worldcup` 公开仓库
- **⚙️ 自动推送 hook**:`.githooks/post-commit` → `git push origin main`

### 🔧 Changed（变更）
- 数据文件 `data/matches.json` v1.4.0(累计 26/28 = 92.86% 准确率)
- 前端 JS 重构,改为完全数据驱动渲染

### 🐛 Fixed（修复）
- **数据加载失败**: JS 引用 `roundOf16_played` 但 JSON 实际字段为 `roundOf16`
- **点击刷新不更新**: 增加 3 层检测(timeChanged + contentChanged + force)
- **自动刷新频率**: 从 5 分钟改为 4 小时

---

## [1.3.0] - 2026-07-08

### ✨ Added
- 1/8 决赛数据:7/8 = 87.5% 准确率
- 球队胜率分布饼图(增加队名标注)
- 置信度分析(高/中/低三档)

### 🐛 Fixed
- 修复胜率饼图显示异常
- 修复预测结果排序错乱

---

## [1.2.0] - 2026-07-04

### ✨ Added
- 1/16 决赛数据:15/16 = 93.75% 准确率
- 模型准确率累计统计
- 阶段战绩折线图

---

## [1.1.0] - 2026-07-01

### ✨ Added
- 球队统计(teamStats)
- 比赛列表(roundOf32)
- 基础可视化(柱状图 + 折线图)

---

## [1.0.0] - 2026-06-28

### ✨ Added
- 🎉 首个版本发布
- 基础数据 schema
- 静态前端(index.html + style.css + app.js)
- `deploy/fetch.py` 初始版本

---

## 📊 版本对比

| 版本 | 日期 | 模型准确率 | 阶段 |
| --- | --- | --- | --- |
| 1.4.0 | 2026-07-13 | 92.86% (26/28) | 1/4 → SF |
| 1.3.0 | 2026-07-08 | 89.29% (25/28) | 1/8 → QF |
| 1.2.0 | 2026-07-04 | 93.75% (15/16) | 1/16 → 1/8 |
| 1.1.0 | 2026-07-01 | - | 1/16 进行中 |
| 1.0.0 | 2026-06-28 | - | 初始版本 |

---

## 🔖 版本标签说明

- **Major (X.0.0)**: 不兼容的数据 schema 变更
- **Minor (1.X.0)**: 新增阶段数据、可视化图表、API 端点
- **Patch (1.4.X)**: Bug 修复、文档更新、性能优化

---

[Unreleased]: https://github.com/wuxixixi/ld-worldcup/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/wuxixixi/ld-worldcup/releases/tag/v1.4.0
[1.3.0]: https://github.com/wuxixixi/ld-worldcup/releases/tag/v1.3.0
[1.2.0]: https://github.com/wuxixixi/ld-worldcup/releases/tag/v1.2.0
[1.1.0]: https://github.com/wuxixixi/ld-worldcup/releases/tag/v1.1.0
[1.0.0]: https://github.com/wuxixixi/ld-worldcup/releases/tag/v1.0.0