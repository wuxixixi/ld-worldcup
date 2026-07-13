# 📐 数据 API 参考

> LD看世界杯 · 数据接口详细文档

## 概述

所有数据通过单一 JSON 端点暴露: **`/data/matches.json`**。
前端 `js/app.js` 通过 `fetch()` 获取并驱动 6 张 ECharts 可视化。

## 端点列表

| 端点 | 方法 | Content-Type | Cache-Control |
| --- | --- | --- | --- |
| `/data/matches.json` | GET | `application/json` | `max-age=600` (10 分钟) |

## Schema

### 顶层结构

```typescript
interface MatchesData {
  meta: MetaInfo;
  teamStats: TeamStat[];
  roundOf32: Match[];        // 1/16 决赛 (16 场)
  roundOf16: Match[];        // 1/8 决赛 (8 场)
  quarterFinals: Match[];    // 1/4 决赛 (4 场)
  semiFinals: Match[];       // 半决赛 (2 场)
  finals: Match[];           // 决赛 (1 场)
}
```

### MetaInfo

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `title` | string | ✅ | 项目名 | `"LD看世界杯"` |
| `subtitle` | string | ✅ | 副标题 | `"AI 数据驱动的世界杯预测平台"` |
| `version` | string | ✅ | 数据 schema 版本 | `"1.4.0"` |
| `lastUpdate` | string | ✅ | ISO 8601 时间戳 | `"2026-07-13 14:08 GMT+8"` |
| `worldcup` | string | ✅ | 赛事名 | `"2026 美加墨世界杯"` |
| `stage` | string | ✅ | 当前阶段描述 | `"1/4 决赛全部结束..."` |
| `modelAccuracy` | ModelAccuracy | ✅ | 模型准确率分桶 | (见下) |
| `accuracyTrend` | AccuracyTrendPoint[] | ✅ | 阶段趋势 | (见下) |
| `confidenceDistribution` | ConfidenceBucket | ✅ | 置信度分布 | (见下) |
| `modelNotes` | string | ✅ | 模型备注 | (描述性文字) |

### ModelAccuracy

```typescript
interface ModelAccuracy {
  roundOf32: AccuracyBucket;
  roundOf16: AccuracyBucket;
  quarterFinals_played: AccuracyBucket;
  overall: AccuracyBucket;
}

interface AccuracyBucket {
  correct: number;          // 命中场数
  total: number;            // 总场数
  rate: string;             // "92.86%"
  avgConfidence: string;    // "79%"
}
```

### AccuracyTrendPoint

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `stage` | string | `"1/16 决赛"` / `"1/8 决赛"` / `"1/4 决赛"` / `"半决赛"` / `"决赛"` |
| `rate` | number | 该阶段准确率(0-100) |
| `matches` | number | 该阶段比赛场数 |
| `cumulativeCorrect` | number | 累计命中 |
| `cumulativeTotal` | number | 累计总场数 |
| `isPending` | boolean? | 是否未开始 |

### ConfidenceBucket

```typescript
interface ConfidenceBucket {
  high_80_100: {
    matches: number;
    correct: number;
    rate: string;     // "87.5%"
    color: string;    // "#1B5E20"
  };
  medium_60_80: {
    matches: number;
    correct: number;
    rate: string;
    color: string;
  };
  low_below_60: {
    matches: number;
    correct: number;
    rate: string;
    color: string;
  };
}
```

### TeamStat

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `team` | string | ✅ | 球队中文名 |
| `flag` | string | ✅ | 国旗 emoji |
| `matches` | number | ✅ | 出战场数 |
| `wins` | number | ✅ | 胜场数 |
| `draws` | number | ✅ | 平局数(淘汰赛通常为 0) |
| `losses` | number | ✅ | 负场数 |
| `goalsFor` | number | ✅ | 进球数 |
| `goalsAgainst` | number | ✅ | 失球数 |
| `winRate` | number(0-100) | ✅ | 胜率(%) |
| `stage` | string | ✅ | 当前阶段 `"SF"` / `"QF"` / `"淘汰"` |

### Match

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `date` | string | ✅ | 比赛日期 `"MM-DD"` |
| `home` | string | ✅ | 主队名 |
| `away` | string | ✅ | 客队名 |
| `homeFlag` | string | ✅ | 主队国旗 emoji |
| `awayFlag` | string | ✅ | 客队国旗 emoji |
| `score` | string | ✅ | 比分 `"0-0"` / `"1-2"` |
| `winner` | string | ❌ | 胜者(已结束) |
| `winnerNote` | string | ❌ | 备注,如 `"点球 3-4"` |
| `stage` | string | ✅ | `"1/16"` / `"1/8"` / `"1/4"` / `"半决赛"` / `"决赛"` |
| `venue` | string | ✅ | 比赛场馆 |
| `predCorrect` | boolean | ❌ | 预测是否命中 |
| `predConfidence` | string | ❌ | `"high"` / `"medium"` / `"low"` |

## 错误处理

### 数据缺失字段

若 `data/matches.json` 缺失必要字段,前端 `js/app.js` 会:
1. 控制台输出 `console.warn(...)` 并继续渲染
2. 受影响图表显示空状态文案

### HTTP 失败

| 状态码 | 行为 |
| --- | --- |
| 200 | 正常加载 |
| 304 | 使用本地缓存 |
| 404 | 显示「数据加载失败」+ 重试按钮 |
| 500 | 同上,触发告警 |

## 版本兼容

| 数据版本 | Schema 变更 |
| --- | --- |
| 1.4.x | 当前 |
| 1.3.x → 1.4.x | `confidenceDistribution` 新增字段 |
| 1.2.x → 1.3.x | `quarterFinals_played` 重命名 |
| 1.0.x → 1.2.x | `meta.accuracyTrend` 改为数组 |

## 完整示例

```json
{
  "meta": {
    "title": "LD看世界杯",
    "subtitle": "AI 数据驱动的世界杯预测平台",
    "version": "1.4.0",
    "lastUpdate": "2026-07-13 14:08 GMT+8",
    "worldcup": "2026 美加墨世界杯",
    "stage": "1/4 决赛全部结束",
    "modelAccuracy": {
      "overall": {
        "correct": 26,
        "total": 28,
        "rate": "92.86%",
        "avgConfidence": "79%"
      }
    }
  },
  "teamStats": [
    {
      "team": "法国",
      "flag": "🇫🇷",
      "matches": 5,
      "wins": 5,
      "draws": 0,
      "losses": 0,
      "goalsFor": 8,
      "goalsAgainst": 1,
      "winRate": 100,
      "stage": "SF"
    }
  ],
  "roundOf32": [],
  "roundOf16": [],
  "quarterFinals": [],
  "semiFinals": [],
  "finals": []
}
```