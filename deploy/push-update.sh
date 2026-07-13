#!/bin/bash
# LD看世界杯 - 数据更新工具
# 用法:
#   ./push-update.sh                           # 自动检测本地 matches.json 并推送
#   ./push-update.sh <本地 JSON 路径>          # 推送指定文件
#   ./push-update.sh /tmp/new.json             # 推送临时文件
#
# 流程:
#   本地 JSON → SFTP 上传到 pending-update.json → 服务器 refresh.py 合并 → 自动 reload

set -e

SSH_KEY="$HOME/.ssh/tencent_cloud.pem"
SSH_USER="ubuntu"
SSH_HOST="101.34.62.149"

LOCAL_FILE="${1:-$(dirname "$0")/../data/matches.json}"

echo "========================================"
echo "  LD看世界杯 数据更新"
echo "  本地文件: $LOCAL_FILE"
echo "========================================"

# 0. 校验本地文件存在
if [ ! -f "$LOCAL_FILE" ]; then
  echo "❌ 本地文件不存在: $LOCAL_FILE"
  exit 1
fi

# 1. 验证 JSON 有效(用 python,路径需要 cygpath 转换)
WIN_PATH=$(cygpath -w "$LOCAL_FILE" 2>/dev/null || echo "$LOCAL_FILE")
JSON_CHECK=$(python -c "
import json, sys
try:
    with open(r'$WIN_PATH', encoding='utf-8') as f:
        json.load(f)
    print('OK')
except Exception as e:
    print(f'INVALID: {e}')
" 2>&1)

if [ "$JSON_CHECK" != "OK" ]; then
  echo "❌ JSON 文件格式无效: $JSON_CHECK"
  exit 1
fi

echo "✅ JSON 文件校验通过 ($(wc -c < "$LOCAL_FILE") bytes)"

# 2. SFTP 上传到 ubuntu home(避免 /var/lib 权限问题)
echo ""
echo "→ 上传到服务器 ubuntu home..."
TEMP_FILE="/home/ubuntu/pending-update-$(date +%s).json"
scp -i "$SSH_KEY" -q "$LOCAL_FILE" "$SSH_USER@$SSH_HOST:$TEMP_FILE"
echo "✅ 上传完成"

# 3. sudo mv 到目标位置 + 触发 refresh.py
echo ""
echo "→ 移动并触发 refresh.py..."
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "
  sudo mv $TEMP_FILE /var/lib/ld-worldcup/pending-update.json
  sudo chown www-data:www-data /var/lib/ld-worldcup/pending-update.json
  sudo /usr/local/bin/ld-worldcup-refresh.py
"

echo ""
echo "========================================"
echo "  ✅ 数据已更新!"
echo "  🌐 访问: http://$SSH_HOST:8888"
echo "  ⏰ 浏览器刷新即生效(30 秒内)"
echo "========================================"