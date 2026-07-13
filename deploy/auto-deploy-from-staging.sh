#!/bin/bash
# LD看世界杯 - 服务器端自动部署脚本
# 作用:检测 /home/ubuntu/ld-worldcup-staging/ 目录是否有新文件,有则自动部署
# 配合本地 WatchDog 使用:本地 → SFTP 到 staging → 服务器 cron 每 5 分钟检查并部署

set -e

STAGING_DIR="/home/ubuntu/ld-worldcup-staging"
DEPLOY_DIR="/var/www/ld-worldcup"
MARKER_FILE="/var/lib/ld-worldcup/last-deploy-hash"
LOG_FILE="/var/log/ld-worldcup-auto-deploy.log"

log() {
  local ts=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$ts] $1" | tee -a "$LOG_FILE"
}

# 0. 检查 staging 目录是否存在
if [ ! -d "$STAGING_DIR" ]; then
  log "staging 目录不存在,跳过($STAGING_DIR)"
  exit 0
fi

# 1. 计算 staging 目录的文件哈希
STAGING_HASH=$(find "$STAGING_DIR" -type f \( -name "*.html" -o -name "*.css" -o -name "*.js" -o -name "*.json" \) \
  -exec md5sum {} \; 2>/dev/null | md5sum | cut -d' ' -f1)

# 2. 读取上次部署哈希(若不存在则视为首次)
if [ -f "$MARKER_FILE" ]; then
  LAST_HASH=$(cat "$MARKER_FILE")
else
  LAST_HASH="none"
fi

# 3. 对比
if [ "$STAGING_HASH" = "$LAST_HASH" ]; then
  log "无变化(staging hash=$STAGING_HASH),跳过"
  exit 0
fi

log "🔔 检测到新文件版本(staging=$STAGING_HASH, last=$LAST_HASH)"
log "开始自动部署..."

# 4. 备份当前部署
if [ -d "$DEPLOY_DIR" ]; then
  BACKUP="/var/lib/ld-worldcup/backups/deploy-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
  tar -czf "$BACKUP" -C "$DEPLOY_DIR" . 2>/dev/null || true
  log "已备份到 $BACKUP"
fi

# 5. 部署
rm -rf "$DEPLOY_DIR"/*
cp -r "$STAGING_DIR"/* "$DEPLOY_DIR/" 2>/dev/null || {
  log "❌ 部署失败:cp 出错"
  exit 1
}
chown -R www-data:www-data "$DEPLOY_DIR"
chmod -R 755 "$DEPLOY_DIR"

# 6. 验证部署
if [ ! -f "$DEPLOY_DIR/index.html" ]; then
  log "❌ 部署失败:index.html 不存在"
  exit 1
fi

# 7. 记录新哈希
echo "$STAGING_HASH" > "$MARKER_FILE"

# 8. 验证 nginx 健康
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://127.0.0.1:8888/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  log "✅ 自动部署成功 | HTTP $HTTP_CODE | hash=$STAGING_HASH"
else
  log "⚠️ 部署完成但健康检查失败(HTTP $HTTP_CODE)"
fi

log "---"