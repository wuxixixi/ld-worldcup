#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
LD看世界杯 - CI/CD 部署触发器
v2.0:仅上传到 staging,服务器端 cron 自动检测并部署(零等待)
   + 主动触发立即部署(可选)

工作流:
  本地文件变更
      ↓
  本地 WatchDog(watchdog.py) 或手动运行 deploy.py
      ↓
  SFTP 上传到 /home/ubuntu/ld-worldcup-staging/
      ↓
  服务器端 /usr/local/bin/auto-deploy-from-staging.sh 自动触发
      ↓
  /var/www/ld-worldcup/ 部署完成 + nginx 自动 reload
      ↓
  公网访问 http://101.34.62.149:8888
"""
import paramiko
import os
import sys
import time
from pathlib import Path

# 配置
SSH_KEY = r'C:\Users\Administrator\.ssh\tencent_cloud.pem'
SSH_HOST = '101.34.62.149'
SSH_USER = 'ubuntu'
STAGING_DIR = '/home/ubuntu/ld-worldcup-staging'
REMOTE_DIR = '/var/www/ld-worldcup'
LOCAL_DIR = Path(__file__).parent.parent


def ssh_exec(ssh, cmd, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out, err


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


def upload_dir(sftp, local_dir, remote_dir, exclude=None):
    """递归上传目录,exclude 是要排除的文件名列表"""
    exclude = exclude or ['__pycache__', '.git', '.DS_Store', 'watchdog.log', '.last-hash']

    for item in os.listdir(local_dir):
        if item in exclude:
            continue
        local_path = os.path.join(local_dir, item)
        remote_path = f'{remote_dir}/{item}'

        if os.path.isfile(local_path):
            print(f'  ↑ {item}')
            sftp.put(local_path, remote_path)
        elif os.path.isdir(local_path):
            try:
                sftp.stat(remote_path)
            except FileNotFoundError:
                try:
                    sftp.mkdir(remote_path)
                except Exception:
                    pass
            upload_dir(sftp, local_path, remote_path, exclude)


def main():
    print('=' * 60)
    print('  LD看世界杯 - CI/CD 部署触发器 v2.0')
    print(f'  目标: {SSH_USER}@{SSH_HOST}')
    print('  模式: 上传 staging → 服务器 cron 自动部署')
    print('=' * 60)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh.connect(SSH_HOST, 22, SSH_USER, key_filename=SSH_KEY, timeout=15)
        print('✅ SSH 连接成功')
    except Exception as e:
        print(f'❌ SSH 连接失败: {e}')
        return 1

    try:
        sftp = ssh.open_sftp()

        # 1. 准备 staging 目录
        print(f'\n[1/3] 准备 staging 目录...')
        ssh_exec(ssh, f'rm -rf {STAGING_DIR} && mkdir -p {STAGING_DIR}')

        # 2. 上传文件到 staging
        print(f'\n[2/3] 上传文件到 {STAGING_DIR}/')
        upload_dir(sftp, str(LOCAL_DIR), STAGING_DIR)
        print('  ✅ 上传完成')

        sftp.close()

        # 3. 主动触发服务器端 auto-deploy(立即生效)
        print(f'\n[3/3] 触发服务器端自动部署...')
        ssh_exec_streaming(ssh, 'sudo /usr/local/bin/auto-deploy-from-staging.sh')

        # 4. 公网访问验证
        print('\n' + '=' * 60)
        print('  公网访问验证')
        print('=' * 60)

        import urllib.request
        try:
            req = urllib.request.Request(
                f'http://{SSH_HOST}:8888/',
                headers={'Connection': 'close', 'Cache-Control': 'no-cache'}
            )
            resp = urllib.request.urlopen(req, timeout=15)
            html = resp.read().decode('utf-8')
            print(f'✅ HTTP {resp.status} | {len(html)} bytes')
            print(f'   标题: {"LD 看世界杯" in html}')
            print(f'   刷新按钮: {"btn-refresh" in html}')
        except Exception as e:
            print(f'❌ 公网测试失败: {e}')

        print('\n' + '=' * 60)
        print('  ✅ CI/CD 部署完成!')
        print(f'  🌐 访问: http://{SSH_HOST}:8888')
        print(f'  📊 数据: http://{SSH_HOST}:8888/data/matches.json')
        print('=' * 60)
        print('\n💡 CI/CD 提示:')
        print('  - 服务器 cron 每 5 分钟自动检查 staging 并部署')
        print('  - 本地运行 watchdog.py 可实现文件变化自动部署')
        print('  - 数据更新:scp new.json ubuntu@101.34.62.149:/var/lib/ld-worldcup/pending-update.json')
        return 0

    except Exception as e:
        print(f'\n❌ 部署失败: {e}')
        import traceback
        traceback.print_exc()
        return 1
    finally:
        ssh.close()


if __name__ == '__main__':
    sys.exit(main())