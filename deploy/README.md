# LD看世界杯 - 部署与维护指南

## 📋 项目结构

```
ld-worldcup/
├── index.html          # 主页面
├── css/
│   └── style.css       # 主样式表(足球场绿色主题)
├── js/
│   └── app.js          # 主应用脚本(ECharts 可视化)
├── data/
│   └── matches.json    # 比赛数据(战况+预测)
└── deploy/
    ├── deploy.py       # CI/CD 部署触发器(v2.0)
    ├── watchdog.py     # 本地 WatchDog(文件变化自动部署)
    ├── refresh.py      # 数据刷新脚本(支持 API 拉取)
    ├── auto-deploy-from-staging.sh  # 服务器端自动部署
    ├── fix-refresh.py  # 修复脚本
    ├── CICD.md         # CI/CD 完整文档
    └── README.md       # 本文件
```

## 🚀 快速部署

### 方式 1:本地 WatchDog 自动(推荐)

```bash
cd ld-worldcup
python deploy/watchdog.py           # 前台
python deploy/watchdog.py --daemon  # 后台守护
```

文件保存即触发自动部署(防抖 3 秒)。

### 方式 2:手动部署

```bash
cd ld-worldcup
python deploy/deploy.py
```

执行流程:SFTP 上传 → 服务器端 auto-deploy 立即生效(全程 5-10 秒)

### 方式 3:服务器端 cron 兜底

服务器每 4 小时(整点 0:00/4:00/8:00/12:00/16:00/20:00)自动检查 staging 目录,无需本地操作。

> 📚 完整 CI/CD 文档:[deploy/CICD.md](./CICD.md)

## 🌐 访问地址

**http://101.34.62.149:8888**

## 🎨 设计规范

| 元素 | 颜色/规格 |
|------|----------|
| 主色调 | 足球场绿 `#1B5E20` |
| 辅助色 | 草皮色 `#4CAF50` |
| 警示色 | 橙色 `#FFA726` |
| 危险色 | 进球红 `#E53935` |
| 字体 | PingFang SC / Microsoft YaHei |
| 主图表库 | ECharts 5.4.3(CDN) |

## 📊 功能模块

1. **顶部导航**:实时状态、当前阶段、决赛倒计时
2. **概览统计**:预测场次、正确数、准确率、决赛信息
3. **冠军预测**:阿根廷 2-1 法国加时(本届卫冕预测)
4. **准确率仪表盘**:环形进度条 + 阶段准确率
5. **比赛战况**:5 个 Tab(1/16/1/8/1/4/半决赛/决赛)
   - 已完赛显示比分+进球+晋级
   - 未开赛显示预测胜率+预测比分
6. **数据可视化**:4 个 ECharts 图表
7. **模型说明**:7 维加权权重可视化

## 🔄 数据更新流程

每 4 小时(整点)自动执行 `refresh-ld-worldcup.sh`:
1. 调用足球数据 API(Football-Data.org / API-Football)
2. 拉取最新比赛结果
3. 更新 `matches.json`
4. 浏览器刷新即可看到最新数据

## 🛠️ 维护命令

```bash
# 查看 nginx 状态
ssh -i ~/.ssh/tencent_cloud.pem ubuntu@101.34.62.149 \
  "sudo systemctl status nginx"

# 手动刷新数据
ssh -i ~/.ssh/tencent_cloud.pem ubuntu@101.34.62.149 \
  "sudo /usr/local/bin/refresh-ld-worldcup.sh"

# 查看访问日志
ssh -i ~/.ssh/tencent_cloud.pem ubuntu@101.34.62.149 \
  "tail -f /var/log/nginx/ld-worldcup-access.log"

# 查看数据刷新日志
ssh -i ~/.ssh/tencent_cloud.pem ubuntu@101.34.62.149 \
  "tail -f /var/log/ld-worldcup-refresh.log"
```

## 🔐 服务器信息

| 项目 | 值 |
|------|---|
| IP | 101.34.62.149 |
| SSH 用户 | ubuntu |
| SSH 密钥 | `~/.ssh/tencent_cloud.pem` |
| 部署目录 | `/var/www/ld-worldcup` |
| Nginx 配置 | `/etc/nginx/sites-available/ld-worldcup` |
| 监听端口 | 8888 |

## 📱 响应式断点

- 桌面端:≥ 1024px(双列网格)
- 平板:768px - 1023px(单列网格)
- 手机:< 768px(导航栏纵向排列)