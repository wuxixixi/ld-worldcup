#!/bin/bash
# LD看世界杯 - 部署脚本
# 用法: bash deploy.sh

set -e

SSH_KEY="$HOME/.ssh/tencent_cloud.pem"
SSH_USER="ubuntu"
SSH_HOST="101.34.62.149"
REMOTE_DIR="/var/www/ld-worldcup"
NGINX_PORT=8888

echo "========================================"
echo "  LD看世界杯 - 部署到腾讯云"
echo "========================================"

# 1. 上传文件
echo ""
echo "[1/4] 上传项目文件..."
scp -i "$SSH_KEY" -r \
  index.html \
  css \
  js \
  data \
  "$SSH_USER@$SSH_HOST:/tmp/ld-worldcup/"

# 2. 服务器端配置
echo "[2/4] 服务器端配置..."
ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" << EOF
set -e

# 创建部署目录
sudo mkdir -p $REMOTE_DIR

# 移动文件
sudo rm -rf $REMOTE_DIR/*
sudo mv /tmp/ld-worldcup/* $REMOTE_DIR/
sudo chown -R www-data:www-data $REMOTE_DIR
sudo chmod -R 755 $REMOTE_DIR

# 配置 nginx
sudo tee /etc/nginx/sites-available/ld-worldcup << 'NGINX'
server {
    listen $NGINX_PORT;
    listen [::]:$NGINX_PORT;
    server_name _;

    root $REMOTE_DIR;
    index index.html;

    # 启用 gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 静态资源缓存
    location ~* \.(css|js|json)$ {
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # JSON 数据禁用缓存(实时刷新)
    location /data/ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        expires 0;
    }

    access_log /var/log/nginx/ld-worldcup-access.log;
    error_log /var/log/nginx/ld-worldcup-error.log;
}
NGINX

# 启用站点
sudo ln -sf /etc/nginx/sites-available/ld-worldcup /etc/nginx/sites-enabled/ld-worldcup

# 测试配置
sudo nginx -t

# 重载 nginx
sudo systemctl reload nginx

echo "[3/4] 配置定时刷新任务..."

# 创建刷新脚本
sudo tee /usr/local/bin/refresh-ld-worldcup.sh << 'SCRIPT'
#!/bin/bash
# 每日凌晨 3 点刷新 LD看世界杯 数据
echo "[\$(date)] 触发 LD看世界杯 数据刷新..." >> /var/log/ld-worldcup-refresh.log
cd $REMOTE_DIR
# 此处可添加拉取最新比赛结果的 API 调用
# curl -s https://api.example.com/matches > data/matches.json
SCRIPT

sudo chmod +x /usr/local/bin/refresh-ld-worldcup.sh

# 添加 crontab 任务(每日凌晨 3 点)
( crontab -l 2>/dev/null | grep -v "refresh-ld-worldcup"; echo "0 3 * * * /usr/local/bin/refresh-ld-worldcup.sh" ) | crontab -

echo "[4/4] 部署完成!"
echo ""
echo "🌐 访问地址: http://101.34.62.149:$NGINX_PORT"
EOF

echo ""
echo "========================================"
echo "  ✅ 部署成功"
echo "  🌐 访问: http://101.34.62.149:$NGINX_PORT"
echo "========================================"