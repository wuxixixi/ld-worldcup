# 🏆 LD看世界杯

> AI 数据驱动的 2026 美加墨世界杯预测平台 · 数据自动拉取 · 6 张可视化图表 · 100% 1/4 决赛准确率

[![Repo](https://img.shields.io/badge/repo-wuxixixi%2Fld--worldcup-181717?logo=github)](https://github.com/wuxixixi/ld-worldcup)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.4.0-success)](https://github.com/wuxixixi/ld-worldcup/releases)
[![Last Update](https://img.shields.io/badge/daily%20cron-every%2030min-orange?logo=clock)](deploy/fetch.py)
[![Data Source](https://img.shields.io/badge/data-bracketmundial2026.com-yellow)](https://bracketmundial2026.com)
[![Made With](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)]()
[![Made With](https://img.shields.io/badge/ECharts-AA344D?logo=apacheecharts&logoColor=white)]()
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)]()
[![Status](https://img.shields.io/badge/status-active--development-brightgreen)]()

---

## 🎯 项目简介

**LD看世界杯** 是一个**零依赖前端 + Python 数据管道**的世界杯赛事跟踪与可视化平台。
服务端 `fetch.py` 每 30 分钟从 `bracketmundial2026.com` 拉取最新比赛数据，前端 6 张 ECharts 图表实时驱动展示模型预测准确率、各阶段战绩、球队胜率分布、晋级路径等内容。

**核心价值**：

| 维度 | 指标 |
| --- | --- |
| 🎯 模型准确率 | **26/28 = 92.86%**（截至 1/4 决赛） |
| 🚀 数据更新延迟 | ≤ 30 分钟（cron 自动） |
| 📊 可视化图表 | 6 张数据驱动的 ECharts |
| 🌐 部署形态 | 纯静态前端 + 远端 cron 拉取 |
| 💸 运行时成本 | $0（无服务器函数） |

---

## ✨ 功能特性

### 📊 数据可视化（6 大图表）

- **🎯 模型预测准确率** — 累计准确率 + 各阶段分布柱状图
- **📈 各阶段战绩** — 折线图展示从 1/16 到决赛的准确率走势
- **🎲 置信度分析** — 高/中/低三档置信度对应的命中率
- **⚔️ 比赛战况** — 完整比赛列表（比分、胜负、预测命中）
- **🏆 球队胜率分布** — 16 支球队的饼图 + 排名柱状图
- **🛤️ 晋级路径** — 淘汰赛对阵树状图

### 🔄 自动化

- **服务端定时拉取** — `deploy/fetch.py` + `/etc/cron.d/ld-worldcup-fetch` 每 30 分钟拉取
- **前端智能刷新** — `js/app.js` 检测文件 `lastUpdate` 与 hash 变化，4 小时强制刷新
- **GitHub 自动推送** — `.githooks/post-commit` → `git push origin main`

### 📱 前端特性

- ✅ 纯 HTML + 原生 JS + ECharts（CDN 引入）
- ✅ 响应式布局，移动端可读
- ✅ 数据驱动渲染（无需手动改 HTML）
- ✅ 暗色 / 亮色自适应

---

## 🚀 快速上手

### 方式 1：直接打开（最简单）

```bash
git clone https://github.com/wuxixixi/ld-worldcup.git
cd ld-worldcup
# 用浏览器打开 index.html 即可（需本地 HTTP 服务器）
python -m http.server 8080
# 访问 http://localhost:8080
```

### 方式 2：本地预览（带自动拉取）

```bash
git clone https://github.com/wuxixixi/ld-worldcup.git
cd ld-worldcup
# 1. 手动触发一次数据更新
python deploy/fetch.py
# 2. 起本地服务器
python -m http.server 8080
```

### 方式 3：部署到生产（Tencent Cloud Nginx）

```bash
# 上传到服务器
scp -r . ubuntu@<your-server>:/var/www/ld-worldcup/
# 服务器侧 cron 已自动接管数据更新
crontab -l | grep ld-worldcup-fetch
```

### 方式 4：GitHub Pages（推荐用于 Demo）

```bash
# 推送到 main 分支后,GitHub Actions 自动部署到 gh-pages
git push origin main
# 访问 https://wuxixixi.github.io/ld-worldcup/
```

---

## 📐 项目结构

```
ld-worldcup/
├── index.html              # 主页面（6 个图表容器）
├── css/
│   └── style.css           # 全局样式 + 暗色模式
├── js/
│   └── app.js              # 数据加载 + ECharts 渲染 + 智能刷新
├── data/
│   └── matches.json        # 所有比赛数据（fetch.py 输出）
├── deploy/
│   ├── fetch.py            # 主数据拉取脚本（生产用）
│   ├── deploy.py           # 本地 CI/CD 触发器
│   ├── watchdog.py         # 文件变更看门狗
│   ├── refresh.py          # 数据刷新宿主
│   ├── fix-refresh.py      # 刷新逻辑修复工具
│   ├── install_fetch.py    # 远端 cron 安装脚本
│   ├── push-update.sh      # 手动数据推送
│   ├── auto-deploy-from-staging.sh  # 暂存区自动部署
│   ├── deploy.sh           # 主部署脚本
│   ├── README.md           # 部署文档
│   └── CICD.md             # CI/CD 流程说明
├── docs/
│   ├── API.md              # 数据 API 参考
│   └── CONFIG.md           # 配置选项详解
├── .github/
│   ├── workflows/          # GitHub Actions
│   ├── ISSUE_TEMPLATE/     # Issue 模板
│   └── PULL_REQUEST_TEMPLATE.md
├── .githooks/
│   └── post-commit         # 自动推送到 origin
├── CHANGELOG.md            # 自动生成的变更日志
├── LICENSE                 # MIT 许可证
├── CODEOWNERS              # 代码审查负责人
└── README.md               # 本文件
```

---

## 🔌 数据 API 参考

### `data/matches.json` 结构

```typescript
type MatchesData = {
  meta: {
    title: string;            // "LD看世界杯"
    subtitle: string;         // "AI 数据驱动的世界杯预测平台"
    version: string;          // "1.4.0"
    lastUpdate: string;       // ISO 8601 时间戳
    worldcup: string;         // "2026 美加墨世界杯"
    stage: string;            // 当前阶段描述
    modelAccuracy: {
      roundOf32: AccuracyBucket;
      roundOf16: AccuracyBucket;
      quarterFinals_played: AccuracyBucket;
      overall: AccuracyBucket;
    };
    accuracyTrend: AccuracyTrendPoint[];
    confidenceDistribution: ConfidenceBucket;
    modelNotes: string;
  };
  teamStats: TeamStat[];        // 16 支球队统计
  roundOf32: Match[];           // 1/16 决赛 (16 场)
  roundOf16: Match[];           // 1/8 决赛 (8 场)
  quarterFinals: Match[];       // 1/4 决赛 (4 场)
  semiFinals: Match[];          // 半决赛 (2 场)
  finals: Match[];              // 决赛 (1 场)
};

type AccuracyBucket = {
  correct: number;
  total: number;
  rate: string;        // "92.86%"
  avgConfidence: string; // "79%"
};

type Match = {
  date: string;        // "07-15"
  home: string;
  away: string;
  homeFlag: string;    // emoji
  awayFlag: string;
  score: string;       // "0-0" 或 "1-2"
  winner?: string;
  winnerNote?: string; // "点球 3-4"
  stage: string;       // "1/4"
  venue: string;
  predCorrect?: boolean;
  predConfidence?: 'high' | 'medium' | 'low';
};

type TeamStat = {
  team: string;
  flag: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  winRate: number;     // 0-100
  stage: string;       // "SF" | "QF" | "淘汰"
};
```

### HTTP 端点

| 端点 | 方法 | 说明 |
| --- | --- | --- |
| `/` | GET | 主页面 |
| `/data/matches.json` | GET | 完整比赛数据（带 `Cache-Control: max-age=600`） |
| `/css/style.css` | GET | 样式表 |
| `/js/app.js` | GET | 前端逻辑 |

---

## ⚙️ 配置选项

### 环境变量

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `LD_FETCH_INTERVAL` | `1800` | 数据拉取间隔（秒） |
| `LD_DATA_SOURCE` | `https://bracketmundial2026.com` | 数据源 URL |
| `LD_OUTPUT_PATH` | `data/matches.json` | 输出路径 |
| `LD_LOG_LEVEL` | `INFO` | 日志级别 |
| `LD_DRY_RUN` | `false` | 试运行模式（不写文件） |

### 配置文件

`deploy/fetch.py` 顶部常量：

```python
DATA_SOURCE = "https://bracketmundial2026.com"
OUTPUT_PATH = "data/matches.json"
REQUEST_TIMEOUT = 30
RETRY_TIMES = 3
```

### CLI 参数

```bash
python deploy/fetch.py --help
# 选项:
#   --source URL       数据源 URL（覆盖默认）
#   --output PATH      输出文件路径
#   --dry-run          不写文件,仅打印
#   --verbose          详细日志
#   --interval SECONDS  cron 间隔（用于测试）
```

---

## 🤝 贡献指南

### 分支策略

- **`main`** — 生产分支,受保护,仅允许通过 PR 合并
- **`dev`** — 开发分支,日常集成
- **`feature/<name>`** — 新功能分支(从 dev 切出)
- **`fix/<name>`** — Bug 修复分支(从 dev 切出)
- **`release/<version>`** — 发布准备分支(从 dev 切出)

### Commit 规范（Conventional Commits）

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**：

| Type | 说明 | 示例 |
| --- | --- | --- |
| `feat` | 新功能 | `feat(data): 添加 confidence_distribution 字段` |
| `fix` | Bug 修复 | `fix(refresh): 修复 4h 强制刷新不触发` |
| `docs` | 文档变更 | `docs(readme): 补充 API 文档` |
| `style` | 格式调整 | `style(css): 统一变量命名` |
| `refactor` | 重构 | `refactor(fetch): 拆分 HTML 解析器` |
| `perf` | 性能优化 | `perf(chart): 启用 ECharts 大数据采样` |
| `test` | 测试相关 | `test(fetch): 添加数据 schema 校验` |
| `chore` | 构建/工具 | `chore(ci): 升级 actions/checkout@v4` |

### PR 流程

1. 从 `dev` 切出 `feature/<name>` 分支
2. 提交时遵守 conventional commits
3. 推送到 origin:`git push origin feature/<name>`
4. 在 GitHub 上开 PR → `dev`
5. CI 全绿 + 1 位 reviewer 通过 → 自动合并
6. 发布时从 `dev` 开 PR → `main`,tag 由 maintainer 推送

### PR 模板

见 [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md)

---

## 🧪 本地开发

### 前置依赖

- Python 3.10+
- Git 2.30+
- 浏览器（推荐 Chrome / Edge 最新版）

### 安装 Git Hook

```bash
git config core.hooksPath .githooks
```

### 触发数据更新

```bash
python deploy/fetch.py --verbose
```

### 启动本地预览

```bash
python -m http.server 8080
# 浏览器打开 http://localhost:8080
```

---

## 📜 许可证

本项目基于 **MIT License** 开源 — 详见 [LICENSE](LICENSE) 文件。

```
MIT License

Copyright (c) 2026 wuxixixi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 🙏 致谢

- 数据源：[bracketmundial2026.com](https://bracketmundial2026.com)
- 可视化：[Apache ECharts](https://echarts.apache.org/)
- 部署平台：腾讯云 Ubuntu + Nginx

---

## 📮 联系方式

- GitHub Issues: <https://github.com/wuxixixi/ld-worldcup/issues>
- 邮箱: <wuxixixi@users.noreply.github.com>

---

<p align="center">
  ⚽ 数据驱动 · 🎯 AI 加持 · 📊 全程可视化<br>
  Made with ❤️ by <a href="https://github.com/wuxixixi">wuxixixi</a>
</p>