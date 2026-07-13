#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
LD看世界杯 - 刷新机制修复 + 重新部署
修复:
1. nginx 缓存头配置冲突(.json 扩展名被静态 location 抢先匹配)
2. root crontab 没有添加定时任务
3. refresh 脚本是空操作(只有 echo)
"""
import paramiko
import os
import sys
import time
from pathlib import Path

SSH_KEY = r'C:\Users\Administrator\.ssh\tencent_cloud.pem'
SSH_HOST = '101.34.62.149'
SSH_USER = 'ubuntu'
REMOTE_DIR = '/var/www/ld-worldcup'
LOCAL_DIR = Path(__file__).parent.parent
NGINX_PORT = 8888


def ssh_exec(ssh, cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out, err


def upload_dir(sftp, local_dir, remote_dir):
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f'{remote_dir}/{item}'
        if item in ('__pycache__', '.git', '.DS_Store'):
            continue
        if os.path.isfile(local_path):
            print(f'  ↑ {os.path.basename(local_path)}')
            sftp.put(local_path, remote_path)
        elif os.path.isdir(local_path):
            try:
                sftp.stat(remote_path)
            except FileNotFoundError:
                sftp.mkdir(remote_path)
            upload_dir(sftp, local_path, remote_path)


def main():
    print('=' * 60)
    print('  LD看世界杯 - 刷新机制修复')
    print('=' * 60)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(SSH_HOST, 22, SSH_USER, key_filename=SSH_KEY, timeout=15)
        print('✅ SSH 连接成功\n')
    except Exception as e:
        print(f'❌ SSH 连接失败: {e}')
        return 1

    try:
        sftp = ssh.open_sftp()

        # 1. 上传新版本数据 + JS + HTML + refresh 脚本
        print('[1/6] 上传更新的文件...')

        remote_staging = '/home/ubuntu/ld-worldcup-staging'
        ssh_exec(ssh, f'rm -rf {remote_staging} && mkdir -p {remote_staging}')
        upload_dir(sftp, str(LOCAL_DIR), remote_staging)

        # 部署到目标
        ssh_exec_streaming(ssh, f'''
sudo rm -rf {REMOTE_DIR}/*
sudo cp -r {remote_staging}/* {REMOTE_DIR}/
sudo chown -R www-data:www-data {REMOTE_DIR}
sudo chmod -R 755 {REMOTE_DIR}
echo "--- 部署完成 ---"
ls -la {REMOTE_DIR}/ | head -8
''')

        # 2. 修复 nginx 配置(关键修复:JSON 文件不应被静态资源 location 缓存)
        print('\n[2/6] 修复 nginx 缓存配置(关键!)...')

        nginx_config = f'''server {{
    listen {NGINX_PORT};
    listen [::]:{NGINX_PORT};
    server_name _;

    root {REMOTE_DIR};
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # HTML 不缓存(避免 SPA 缓存问题)
    location = / {{
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        expires 0;
    }}

    location = /index.html {{
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        expires 0;
    }}

    # 数据文件 — 强制不缓存(关键!)
    location /data/ {{
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header X-LD-Cache "bypass";
        expires 0;
    }}

    # CSS/JS — 短缓存(1小时)
    location ~* \\.(css|js)$ {{
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }}

    # 图片/字体 — 长缓存
    location ~* \\.(png|jpg|jpeg|gif|svg|ico|woff2?)$ {{
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }}

    location / {{
        try_files $uri $uri/ /index.html;
    }}

    access_log /var/log/nginx/ld-worldcup-access.log;
    error_log /var/log/nginx/ld-worldcup-error.log;
}}
'''

        with sftp.file('/home/ubuntu/ld-worldcup-nginx.conf', 'w') as f:
            f.write(nginx_config)

        ssh_exec_streaming(ssh, '''
sudo mv /home/ubuntu/ld-worldcup-nginx.conf /etc/nginx/sites-available/ld-worldcup
sudo ln -sf /etc/nginx/sites-available/ld-worldcup /etc/nginx/sites-enabled/ld-worldcup
sudo nginx -t
sudo systemctl reload nginx
sleep 1
''')

        # 3. 上传并配置真实的 refresh 脚本
        print('\n[3/6] 安装 refresh.py 真实刷新脚本...')

        ssh_exec_streaming(ssh, '''
sudo mkdir -p /var/lib/ld-worldcup/backups
sudo mkdir -p /var/log

# 复制 refresh 脚本
sudo cp /var/www/ld-worldcup/deploy/refresh.py /usr/local/bin/ld-worldcup-refresh.py
sudo chmod +x /usr/local/bin/ld-worldcup-refresh.py

# 创建 /usr/local/bin/refresh-ld-worldcup.sh 包装器(供 crontab 调用)
sudo tee /usr/local/bin/refresh-ld-worldcup.sh > /dev/null << 'SHELL_EOF'
#!/bin/bash
exec /usr/bin/python3 /usr/local/bin/ld-worldcup-refresh.py
SHELL_EOF
sudo chmod +x /usr/local/bin/refresh-ld-worldcup.sh

# 确保日志文件可写
sudo touch /var/log/ld-worldcup-refresh.log
sudo chown www-data:www-data /var/log/ld-worldcup-refresh.log

echo "✅ refresh 脚本安装完成"
ls -la /usr/local/bin/ld-worldcup-refresh.py /usr/local/bin/refresh-ld-worldcup.sh
''')

        # 4. 配置 root crontab 定时任务(每日凌晨 3 点)
        print('\n[4/6] 配置 root crontab 定时任务...')

        ssh_exec_streaming(ssh, '''
# 备份现有 crontab
sudo crontab -l -u root > /tmp/root-cron.bak 2>/dev/null

# 添加新的定时任务(每日凌晨 3 点 + 每 30 分钟检查)
sudo crontab -u root -l 2>/dev/null | grep -v "ld-worldcup" > /tmp/new-root-cron
cat >> /tmp/new-root-cron << 'CRON_EOF'

# LD看世界杯 数据刷新任务
0 3 * * * /usr/local/bin/refresh-ld-worldcup.sh >> /var/log/ld-worldcup-cron.log 2>&1
*/30 * * * * /usr/local/bin/refresh-ld-worldcup.sh >> /var/log/ld-worldcup-cron.log 2>&1
CRON_EOF

sudo crontab -u root /tmp/new-root-cron

echo "--- root crontab 内容 ---"
sudo crontab -u root -l
''')

        # 5. 验证 cron 服务 + 手动触发一次
        print('\n[5/6] 验证 cron 并手动测试 refresh 脚本...')

        ssh_exec_streaming(ssh, '''
echo "--- cron 服务状态 ---"
systemctl status cron --no-pager 2>&1 | head -5

echo ""
echo "--- 手动执行 refresh 脚本 ---"
sudo /usr/local/bin/refresh-ld-worldcup.sh

echo ""
echo "--- 刷新日志 ---"
sudo cat /var/log/ld-worldcup-refresh.log 2>&1 | tail -10
''')

        # 6. 验证 nginx 缓存头修复
        print('\n[6/6] 验证 nginx 缓存配置已修复...')

        ssh_exec_streaming(ssh, '''
echo "--- 测试数据文件响应头(必须包含 no-cache) ---"
curl -sI http://127.0.0.1:8888/data/matches.json 2>&1 | head -15

echo ""
echo "--- 测试 HTML 响应头 ---"
curl -sI http://127.0.0.1:8888/ 2>&1 | head -10

echo ""
echo "--- 测试 CSS 响应头(应有 max-age=3600) ---"
curl -sI http://127.0.0.1:8888/css/style.css 2>&1 | head -10
''')

        # 7. 公网连通性
        print('\n[7/7] 公网访问验证...')

        import urllib.request
        try:
            req = urllib.request.Request(
                f'http://{SSH_HOST}:{NGINX_PORT}/data/matches.json',
                headers={'Connection': 'close'}
            )
            resp = urllib.request.urlopen(req, timeout=15)
            data = json.loads(resp.read())
            print(f'✅ HTTP {resp.status} | {len(resp.read())} bytes')
            print(f'   版本: {data["meta"]["version"]}')
            print(f'   最后更新: {data["meta"]["lastUpdate"]}')
            print(f'   当前阶段: {data["meta"]["stage"]}')
            print(f'   总准确率: {data["meta"]["modelAccuracy"]["overall"]["rate"]}')
            print(f'   1/8 准确率: {data["meta"]["modelAccuracy"]["roundOf16"]["rate"]}')
        except Exception as e:
            print(f'❌ 公网测试失败: {e}')

        print('\n' + '=' * 60)
        print('  ✅ 刷新机制修复完成!')
        print(f'  🌐 访问: http://{SSH_HOST}:{NGINX_PORT}')
        print(f'  📊 数据 API: http://{SSH_HOST}:{NGINX_PORT}/data/matches.json')
        print('=' * 60)
        return 0

    except Exception as e:
        print(f'\n❌ 修复失败: {e}')
        import traceback
        traceback.print_exc()
        return 1
    finally:
        ssh.close()


def ssh_exec_streaming(ssh, cmd, timeout=120):
    print(f'\n>>> {cmd[:200]}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    while True:
        line = stdout.readline()
        if not line:
            break
        print('  |', line.rstrip())
    err = stderr.read().decode('utf-8', errors='replace')
    if err:
        print('  ERR:', err[:500])


if __name__ == '__main__':
    sys.exit(main())