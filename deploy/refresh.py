#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LD看世界杯 - 真实数据刷新脚本
- 接收外部 JSON 更新(/var/lib/ld-worldcup/pending-update.json)
- 拉取 football-data.org API(需要 token)
- 调用后端合并并发布新数据
"""
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

DATA_FILE = "/var/www/ld-worldcup/data/matches.json"
PENDING_FILE = "/var/lib/ld-worldcup/pending-update.json"
LOG_FILE = "/var/log/ld-worldcup-refresh.log"
BACKUP_DIR = "/var/lib/ld-worldcup/backups"

# 可选:football-data.org API token(从环境变量读取)
FOOTBALL_DATA_TOKEN = os.environ.get("FOOTBALL_DATA_TOKEN", "")


def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception as e:
        print(f"  WARN: 无法写入日志: {e}", file=sys.stderr)


def backup_data():
    """备份当前数据"""
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        if os.path.exists(DATA_FILE):
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup = f"{BACKUP_DIR}/matches_{ts}.json"
            with open(DATA_FILE, "r", encoding="utf-8") as src:
                content = src.read()
            with open(backup, "w", encoding="utf-8") as dst:
                dst.write(content)
            log(f"已备份 → {backup}")
            return backup
    except Exception as e:
        log(f"WARN: 备份失败: {e}")
    return None


def apply_pending_update():
    """应用待处理更新文件"""
    if not os.path.exists(PENDING_FILE):
        log("无待处理更新文件")
        return False

    try:
        with open(PENDING_FILE, "r", encoding="utf-8") as f:
            new_data = json.load(f)

        # 加载现有数据
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            current = json.load(f)

        # 合并:浅更新 meta 和各阶段数组
        current["meta"].update(new_data.get("meta", {}))
        current["meta"]["lastUpdate"] = datetime.now().strftime(
            "%Y-%m-%d %H:%M GMT+8"
        )

        for key in ["roundOf32", "roundOf16", "quarterFinals", "semiFinals", "final"]:
            if key in new_data:
                current[key] = new_data[key]

        if "teamStats" in new_data:
            current["teamStats"] = new_data["teamStats"]

        if "championPrediction" in new_data:
            current["championPrediction"] = new_data["championPrediction"]

        # 写回
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, ensure_ascii=False, indent=2)

        log(f"✅ 已应用更新:meta={new_data.get('meta', {}).get('lastUpdate', 'N/A')}")
        # 清理 pending 文件
        os.remove(PENDING_FILE)
        return True
    except Exception as e:
        log(f"❌ 应用更新失败: {e}")
        return False


def fetch_from_api():
    """从 football-data.org 拉取(需要 token)"""
    if not FOOTBALL_DATA_TOKEN:
        log("未配置 FOOTBALL_DATA_TOKEN,跳过 API 拉取")
        return False

    try:
        url = "https://api.football-data.org/v4/competitions/WC/matches"
        req = urllib.request.Request(
            url, headers={"X-Auth-Token": FOOTBALL_DATA_TOKEN}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        log(f"✅ 从 API 拉取到 {len(data.get('matches', []))} 场比赛")
        # TODO: 解析并转换格式
        return True
    except urllib.error.HTTPError as e:
        log(f"⚠️ API 拉取失败 HTTP {e.code}: {e.reason}")
    except Exception as e:
        log(f"⚠️ API 拉取异常: {e}")
    return False


def touch_nginx_cache():
    """触发 nginx 重新读取(通过修改 mtime)"""
    try:
        os.utime(DATA_FILE, None)
        log(f"✅ 已更新 {DATA_FILE} 的修改时间")
    except Exception as e:
        log(f"WARN: 更新 mtime 失败: {e}")


def main():
    log("=" * 50)
    log("LD看世界杯 数据刷新任务启动")

    # 1. 备份
    backup_data()

    # 2. 尝试应用待处理更新(本地手动推送)
    updated = apply_pending_update()

    # 3. 尝试从 API 拉取(可选)
    api_ok = fetch_from_api()

    # 4. 更新文件 mtime
    touch_nginx_cache()

    log(f"任务结束:pending_update={updated}, api={api_ok}")
    log("=" * 50)


if __name__ == "__main__":
    main()