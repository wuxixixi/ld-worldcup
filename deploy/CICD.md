# LD看世界杯 - CI/CD 自动化部署

**目标**:代码变更后自动部署到生产环境,无需手动操作。

---

## 一、CI/CD 架构

```
┌─────────────────────────────────────────────────────────────────┐
│  本地开发机(Windows)                                              │
│                                                                  │
│  D:\workspace\codebuddy\2026-07-03-09-45-52\ld-worldcup\        │
│  ├── index.html        ← 你修改这些文件                          │
│  ├── css/style.css                                                │
│  ├── js/app.js                                                    │
│  └── data/matches.json                                            │
│                                                                  │
│  ┌────────────────────────────────────────┐                      │
│  │  WatchDog 守护进程(后台)               │                      │
│  │  deploy\watchdog.py --daemon          │                      │
│  │  - 10 秒检查一次文件变化                │                      │
│  │  - 检测到变化 → 防抖 3 秒 → 自动部署    │                      │
│  └────────────────┬───────────────────────┘                      │
└───────────────────│──────────────────────────────────────────────┘
                    │ SFTP 上传(SSH 密钥认证)
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│  腾讯云 ubuntu@101.34.62.149                                      │
│                                                                  │
│  /home/ubuntu/ld-worldcup-staging/  ← 新版本文件                  │
│                                                                  │
│  ┌────────────────────────────────────────┐                      │
│  │  Cron 每 4 小时(0 */4 * * *)           │                      │
│  │  /etc/cron.d/ld-worldcup-deploy        │                      │
│  │  /usr/local/bin/auto-deploy-from-      │                      │
│  │      staging.sh                        │                      │
│  │  - 计算 staging 哈希                    │                      │
│  │  - 与 last-deploy-hash 对比            │                      │
│  │  - 不一致则部署(备份 + cp + 健康检查)    │                      │
│  └────────────────┬───────────────────────┘                      │
│                   ↓                                              │
│  /var/www/ld-worldcup/   ← 正式部署目录                         │
│  Nginx 8888 端口自动 reload                                      │
│                                                                  │
│  ┌────────────────────────────────────────┐                      │
│  │  数据刷新 Cron(已配置)                  │                      │
│  │  /etc/cron.d/ld-worldcup                │                      │
│  │  - 每 4 小时整点检查(0:00/4:00/8:00/12:00/16:00/20:00)│       │
│  └────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│  公网用户                                                         │
│  http://101.34.62.149:8888  ← 实时访问最新版本                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、三种触发方式

### 方式 1:本地 WatchDog 自动(推荐)

适合日常开发,文件保存即触发部署。

```bash
# 启动 watchdog(前台)
python deploy/watchdog.py

# 后台守护进程
python deploy/watchdog.py --daemon

# 单次手动部署
python deploy/deploy.py
```

**防抖机制**:文件变化后等 3 秒再部署(避免 IDE 多次保存触发重复部署)

### 方式 2:手动触发

```bash
python deploy/deploy.py
```

执行流程:SFTP 上传 → 触发服务器端 auto-deploy → 公网生效(全程 5-10 秒)

### 方式 3:服务器端 cron 兜底

即使本地 WatchDog 关闭,服务器每 4 小时检查 staging 目录:

```bash
# 查看 cron 状态
ssh ubuntu@101.34.62.149 "cat /etc/cron.d/ld-worldcup-deploy"

# 查看部署日志
ssh ubuntu@101.34.62.149 "tail -20 /var/log/ld-worldcup-auto-deploy.log"
```

---

## 三、数据更新(比赛结果)

比赛结果变化时,无需重新部署整个网站,只需更新 `data/matches.json`:

```bash
# 方式 A:推送 JSON 更新(增量合并,不覆盖其他数据)
scp data/matches.json ubuntu@101.34.62.149:/var/lib/ld-worldcup/pending-update.json
ssh ubuntu@101.34.62.149 "sudo /usr/local/bin/ld-worldcup-refresh.py"

# 方式 B:直接覆盖(完整替换)
scp data/matches.json ubuntu@101.34.62.149:/var/www/ld-worldcup/data/matches.json
```

`refresh.py` 会自动:
1. 备份当前数据到 `/var/lib/ld-worldcup/backups/`
2. 合并更新(保留其他字段)
3. 记录日志到 `/var/log/ld-worldcup-refresh.log`

---

## 四、Windows 开机自启动(可选)

创建 Windows 计划任务,登录时自动启动 WatchDog:

```powershell
# 在 PowerShell(管理员)中执行
$action = New-ScheduledTaskAction `
  -Execute "C:\Users\Administrator\.workbuddy\binaries\python\versions\3.13.12\python.exe" `
  -Argument "D:\workspace\codebuddy\2026-07-03-09-45-52\ld-worldcup\deploy\watchdog.py --daemon"

$trigger = New-ScheduledTaskTrigger -AtLogOn

Register-ScheduledTask `
  -TaskName "LD-WorldCup-AutoDeploy" `
  -Action $action `
  -Trigger $trigger `
  -RunLevel Highest `
  -Description "LD看世界杯 - 自动部署 WatchDog"
```

---

## 五、监控与日志

| 日志文件 | 位置 | 内容 |
|---------|------|------|
| 本地 WatchDog | `deploy/watchdog.log` | 文件变化检测 + 部署触发 |
| 服务器自动部署 | `/var/log/ld-worldcup-auto-deploy.log` | staging 检测 + 部署执行 |
| 数据刷新 | `/var/log/ld-worldcup-refresh.log` | matches.json 合并记录 |
| Cron 执行 | `/var/log/ld-worldcup-cron.log` | refresh.py 执行输出 |
| Nginx 访问 | `/var/log/nginx/ld-worldcup-access.log` | 公网访问记录 |

### 一键查看所有日志

```bash
ssh ubuntu@101.34.62.149 "
  echo '=== 自动部署日志(最近 10 条) ==='
  tail -10 /var/log/ld-worldcup-auto-deploy.log
  echo ''
  echo '=== 数据刷新日志(最近 10 条) ==='
  tail -10 /var/log/ld-worldcup-refresh.log
  echo ''
  echo '=== Nginx 访问统计 ==='
  tail -20 /var/log/nginx/ld-worldcup-access.log
"
```

---

## 六、回滚机制

每次部署前自动备份到 `/var/lib/ld-worldcup/backups/`:

```bash
# 查看所有备份
ssh ubuntu@101.34.62.149 "ls -la /var/lib/ld-worldcup/backups/"

# 回滚到指定版本
ssh ubuntu@101.34.62.149 "
  LATEST=\$(ls -t /var/lib/ld-worldcup/backups/deploy-backup-*.tar.gz | head -1)
  sudo rm -rf /var/www/ld-worldcup/*
  sudo tar -xzf \$LATEST -C /var/www/ld-worldcup/
  sudo chown -R www-data:www-data /var/www/ld-worldcup
  sudo systemctl reload nginx
"
```

---

## 七、与 Git 仓库集成(可选进阶)

如果需要接入 Git 仓库(GitHub/Gitee/GitLab):

```bash
# 在腾讯云初始化 bare 仓库
ssh ubuntu@101.34.62.149 "
  git init --bare /var/lib/ld-worldcup.git
  
  # 添加 post-receive hook
  cat > /var/lib/ld-worldcup.git/hooks/post-receive << 'EOF'
#!/bin/bash
GIT_WORK_TREE=/home/ubuntu/ld-worldcup-staging git checkout -f
EOF
  chmod +x /var/lib/ld-worldcup.git/hooks/post-receive
"

# 本地添加 remote
git remote add tencent ssh://ubuntu@101.34.62.149/var/lib/ld-worldcup.git

# 推送即部署
git push tencent main
```

---

## 八、CI/CD 健康检查

| 检查项 | 命令 | 期望结果 |
|--------|------|---------|
| 网站可访问 | `curl -I http://101.34.62.149:8888/` | HTTP 200 |
| 数据 API 正常 | `curl http://101.34.62.149:8888/data/matches.json` | JSON 有效 |
| Nginx 缓存头 | `curl -I http://101.34.62.149:8888/data/matches.json` | 含 `no-cache, no-store` |
| Cron 运行中 | `ssh ubuntu@... "systemctl status cron"` | active (running) |
| staging 哈希变化 | `cat /var/lib/ld-worldcup/last-deploy-hash` | 与文件哈希一致 |
| 自动部署日志 | `tail -5 /var/log/ld-worldcup-auto-deploy.log` | 最近 4 小时内有记录 |

---

**维护者**:LD · **最后更新**:2026-07-08