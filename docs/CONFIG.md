# ⚙️ 配置选项详解

> LD看世界杯 · 部署与运行环境配置参考

## 1. 环境变量

### 服务端 `deploy/fetch.py`

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `LD_FETCH_INTERVAL` | `1800` | 数据拉取间隔（秒） |
| `LD_DATA_SOURCE` | `https://bracketmundial2026.com` | 数据源 URL |
| `LD_OUTPUT_PATH` | `data/matches.json` | 输出路径（相对脚本运行目录） |
| `LD_LOG_LEVEL` | `INFO` | 日志级别 `DEBUG` / `INFO` / `WARNING` / `ERROR` |
| `LD_DRY_RUN` | `false` | `true` 时只打印不写文件 |
| `LD_REQUEST_TIMEOUT` | `30` | HTTP 请求超时（秒） |
| `LD_RETRY_TIMES` | `3` | 失败重试次数 |
| `LD_USER_AGENT` | `ld-worldcup-fetch/1.4.0` | HTTP User-Agent |

### 前端 `js/app.js`

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `LD_REFRESH_INTERVAL` | `14400000` | 自动刷新间隔（毫秒，默认 4 小时） |
| `LD_FORCE_REFRESH_HOURS` | `4` | 强制刷新阈值（小时） |
| `LD_API_ENDPOINT` | `/data/matches.json` | 数据端点 |

## 2. 配置文件

### `deploy/fetch.py` 顶部常量

```python
DATA_SOURCE = "https://bracketmundial2026.com"
OUTPUT_PATH = "data/matches.json"
REQUEST_TIMEOUT = 30
RETRY_TIMES = 3
LOG_LEVEL = "INFO"
```

### Nginx 配置示例

```nginx
server {
    listen 8888;
    server_name _;
    root /var/www/ld-worldcup;
    index index.html;

    # 数据 API - 短缓存
    location /data/ {
        expires 10m;
        add_header Cache-Control "public, max-age=600";
    }

    # 静态资源 - 长缓存
    location ~* \.(css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 安全头
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
```

## 3. CLI 参数

### `deploy/fetch.py`

```bash
python deploy/fetch.py [OPTIONS]
```

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `--source URL` | 数据源 URL | `https://bracketmundial2026.com` |
| `--output PATH` | 输出文件路径 | `data/matches.json` |
| `--dry-run` | 试运行（不写文件） | `false` |
| `--verbose` / `-v` | 详细日志 | `false` |
| `--interval SECONDS` | 测试用间隔 | - |
| `--help` / `-h` | 帮助 | - |

### 示例

```bash
# 基本使用
python deploy/fetch.py

# 试运行
python deploy/fetch.py --dry-run --verbose

# 自定义源
python deploy/fetch.py --source https://my-mirror.com --output /tmp/test.json

# 调试模式
python deploy/fetch.py --verbose 2>&1 | tee fetch.log
```

## 4. Cron 配置

### 服务端 `/etc/cron.d/ld-worldcup-fetch`

```cron
# LD看世界杯 - 数据自动拉取（每 30 分钟）
*/30 * * * * ubuntu /usr/bin/python3 /usr/local/bin/ld-worldcup-fetch.py >> /var/log/ld-worldcup-fetch.log 2>&1
```

### 安装方法

```bash
# 方法 1: 使用项目脚本
python deploy/install_fetch.py

# 方法 2: 手动
sudo cp deploy/fetch.py /usr/local/bin/ld-worldcup-fetch.py
sudo chmod +x /usr/local/bin/ld-worldcup-fetch.py
sudo cp deploy/ld-worldcup-fetch.cron /etc/cron.d/ld-worldcup-fetch
sudo systemctl restart cron
```

## 5. GitHub Actions Secrets

如需启用部署到自有服务器,在仓库 Settings → Secrets 中添加:

| Secret 名 | 用途 |
| --- | --- |
| `DEPLOY_SSH_KEY` | SSH 私钥（用于 rsync 到生产） |
| `DEPLOY_HOST` | 目标服务器地址 |
| `DEPLOY_USER` | SSH 用户名 |
| `SLACK_WEBHOOK` | 部署通知（可选） |

## 6. 性能调优

### 数据拉取频率

| 阶段 | 推荐频率 | 原因 |
| --- | --- | --- |
| 小组赛 | 每 2 小时 | 比赛密集 |
| 淘汰赛 | 每 30 分钟 | 关键比赛 |
| 休赛日 | 每 6 小时 | 无新数据 |

### 前端刷新

```javascript
// js/app.js 内调整
const REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000;  // 4 小时
const FORCE_REFRESH_AFTER_MS = 4 * 60 * 60 * 1000;
```

## 7. 故障排查

### 数据未更新

```bash
# 检查 cron 是否运行
sudo systemctl status cron
grep CRON /var/log/syslog | grep ld-worldcup

# 手动触发一次
python deploy/fetch.py --verbose

# 检查文件权限
ls -la data/matches.json
```

### 前端图表不渲染

```javascript
// 浏览器控制台:
// 1. 检查 fetch 是否成功
fetch('/data/matches.json').then(r => console.log(r.status))

// 2. 检查 ECharts 是否加载
console.log(typeof echarts)

// 3. 检查数据 schema
console.log(data.meta.version)
```

## 8. 监控建议

- **Uptime**: 使用 UptimeRobot / BetterStack 监控 `https://your-domain/data/matches.json`
- **数据新鲜度**: 报警阈值 > 2 小时未更新
- **错误日志**: 部署 `fail2ban` 或 `logwatch` 监控异常 HTTP 状态