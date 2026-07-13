#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
LD看世界杯 - 本地 Watchdog 自动部署
监听 ld-worldcup/ 目录文件变化,自动触发部署到腾讯云。

用法:
  python watchdog.py                 # 前台运行
  python watchdog.py --daemon        # 后台守护进程模式
  python watchdog.py --once          # 单次部署(不监听)
"""
import os
import sys
import time
import hashlib
import argparse
import subprocess
from pathlib import Path
from datetime import datetime

# 配置
PROJECT_DIR = Path(__file__).parent.parent  # 项目根目录
WATCH_DIRS = ['css', 'js', 'data']  # 监听这些子目录
WATCH_FILES = ['index.html']  # 监听这些根目录文件
DEPLOY_SCRIPT = PROJECT_DIR / 'deploy' / 'deploy.py'
LOG_FILE = PROJECT_DIR / 'deploy' / 'watchdog.log'
HASH_FILE = PROJECT_DIR / 'deploy' / '.last-hash'

# 防抖:文件变化后等待 N 秒再部署(避免频繁触发)
DEBOUNCE_SECONDS = 3


def log(msg, also_print=True):
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    line = f'[{ts}] {msg}'
    if also_print:
        print(line, flush=True)
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(line + '\n')
    except Exception:
        pass


def compute_hash():
    """计算项目所有监听文件的 SHA256 哈希"""
    files = []
    for d in WATCH_DIRS:
        dpath = PROJECT_DIR / d
        if dpath.exists():
            for f in sorted(dpath.rglob('*')):
                if f.is_file() and f.suffix not in ('.pyc', '.log'):
                    files.append(f)
    for fname in WATCH_FILES:
        fpath = PROJECT_DIR / fname
        if fpath.exists():
            files.append(fpath)

    h = hashlib.sha256()
    for f in files:
        try:
            h.update(str(f.relative_to(PROJECT_DIR)).encode())
            h.update(f.read_bytes())
        except Exception as e:
            log(f'WARN: 跳过 {f}: {e}')
    return h.hexdigest()[:16]


def has_changed():
    """检测是否有文件变化(通过哈希对比)"""
    current = compute_hash()
    if not HASH_FILE.exists():
        HASH_FILE.write_text(current)
        return True, current

    previous = HASH_FILE.read_text().strip()
    if current != previous:
        return True, current
    return False, current


def run_deploy():
    """执行部署脚本"""
    log('🚀 触发自动部署...')
    try:
        result = subprocess.run(
            [sys.executable, str(DEPLOY_SCRIPT)],
            capture_output=True,
            text=True,
            timeout=300,
            cwd=str(PROJECT_DIR)
        )
        if result.returncode == 0:
            log('✅ 部署成功')
            # 提取关键输出
            for line in result.stdout.split('\n'):
                if '✅' in line or '公网访问' in line or 'HTTP' in line:
                    log(f'   {line.strip()}')
            return True
        else:
            log(f'❌ 部署失败:returncode={result.returncode}')
            log(f'   STDERR: {result.stderr[:500]}')
            return False
    except subprocess.TimeoutExpired:
        log('❌ 部署超时(>300s)')
        return False
    except Exception as e:
        log(f'❌ 部署异常: {e}')
        return False


def initial_deploy():
    """首次运行:如果有变更立即部署一次"""
    log('=== WatchDog 启动 ===')
    log(f'项目目录: {PROJECT_DIR}')
    log(f'部署脚本: {DEPLOY_SCRIPT}')
    log(f'防抖时间: {DEBOUNCE_SECONDS}s')

    changed, current = has_changed()
    if changed:
        log(f'检测到首次变化(hash={current}),启动部署')
        if run_deploy():
            HASH_FILE.write_text(current)
    else:
        log(f'无变化(hash={current})')


def watch_loop(interval=10):
    """主循环:定期检查文件变化"""
    log(f'开始监听(间隔 {interval}s)...')
    last_change_time = 0
    last_hash = HASH_FILE.read_text().strip() if HASH_FILE.exists() else ''

    try:
        while True:
            time.sleep(interval)
            changed, current = has_changed()

            if changed and current != last_hash:
                log(f'🔔 检测到文件变化(hash: {last_hash} → {current})')
                last_change_time = time.time()
                last_hash = current

            # 防抖:最后一次变化后等 DEBOUNCE_SECONDS 才执行
            if last_change_time > 0 and time.time() - last_change_time >= DEBOUNCE_SECONDS:
                if run_deploy():
                    HASH_FILE.write_text(current)
                last_change_time = 0

    except KeyboardInterrupt:
        log('👋 WatchDog 停止(用户中断)')
    except Exception as e:
        log(f'❌ WatchDog 异常: {e}')


def daemon_mode():
    """后台守护进程模式"""
    import threading

    def run():
        watch_loop()

    thread = threading.Thread(target=run, daemon=True)
    thread.start()

    log('Daemon 模式:WatchDog 在后台运行')
    log('按 Ctrl+C 退出主进程(WatchDog 也会停止)')

    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        log('👋 Daemon 停止')


def main():
    parser = argparse.ArgumentParser(description='LD看世界杯 自动部署 WatchDog')
    parser.add_argument('--once', action='store_true', help='单次部署(不监听)')
    parser.add_argument('--daemon', action='store_true', help='后台守护进程模式')
    parser.add_argument('--interval', type=int, default=10, help='检查间隔(秒)')
    args = parser.parse_args()

    if args.once:
        log('=== 单次部署模式 ===')
        if run_deploy():
            current = compute_hash()
            HASH_FILE.write_text(current)
            log(f'已更新哈希记录: {current}')
        return

    initial_deploy()

    if args.daemon:
        daemon_mode()
    else:
        watch_loop(args.interval)


if __name__ == '__main__':
    main()