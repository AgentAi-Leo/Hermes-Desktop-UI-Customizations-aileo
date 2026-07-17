#!/usr/bin/env python3
"""Deterministically publish durable Hermes AI/Stock Brief cron payloads.

The generator's complete final response is persisted in the profile state DB.
This host-side script validates that payload, atomically publishes dashboard
artifacts, prunes only after read-back, and stays silent when there is no newer
successful payload.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sqlite3
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

LA = ZoneInfo("America/Los_Angeles")
AI_JOB = "953b4520c95a"
STOCK_JOB = "922c26b9f606"
AI_ROOT = Path(os.environ.get("HERMES_AI_BRIEFS_ROOT", "/Users/jb3/.hermes/sandboxes/docker/default/workspace/__AI-DAILY-BRIEFS"))
STOCK_ROOT = Path(os.environ.get("HERMES_STOCK_BRIEFS_ROOT", "/Users/jb3/.hermes/sandboxes/docker/default/home/.hermes/zDownloads/_STOCK-BRIEFS"))
TOPIC_RE_HTML = re.compile(r"<h[23][^>]*>\s*([1-7])[.)]\s+", re.I)
TOPIC_RE_MD = re.compile(r"^##\s+([1-7])[.)]\s+", re.M)
TRACKED = ("AAPL", "AMZN", "NVDA", "SNAP", "GOOGL", "MSFT", "DIS")


def profile_home() -> Path:
    configured = os.environ.get("HERMES_HOME", "").strip()
    if configured:
        return Path(configured).expanduser().resolve()
    return Path.home() / ".hermes" / "profiles" / "local-ai-assist1"


def marker(content: str, name: str) -> str:
    start = f"<<<HERMES_BRIEF_{name}>>>"
    end = f"<<<END_HERMES_BRIEF_{name}>>>"
    if content.count(start) != 1 or content.count(end) != 1:
        raise ValueError(f"payload must contain exactly one {name} marker pair")
    value = content.split(start, 1)[1].split(end, 1)[0].strip()
    if not value:
        raise ValueError(f"payload section {name} is empty")
    return value


def newest_payload(mode: str) -> tuple[str, float, str] | None:
    home = profile_home()
    db_path = home / "state.db"
    if not db_path.is_file():
        raise FileNotFoundError(f"profile state database missing: {db_path}")
    job_id = AI_JOB if mode == "ai" else STOCK_JOB
    required = "AI_META" if mode == "ai" else "STOCK_META"
    uri = f"file:{db_path}?mode=ro"
    with sqlite3.connect(uri, uri=True, timeout=15) as db:
        row = db.execute(
            """
            SELECT s.id, s.started_at, m.content
            FROM sessions s
            JOIN messages m ON m.session_id = s.id
            WHERE s.source = 'cron'
              AND s.id LIKE ?
              AND m.role = 'assistant'
              AND m.active = 1
              AND m.content LIKE ?
            ORDER BY s.started_at DESC, m.id DESC
            LIMIT 1
            """,
            (f"cron_{job_id}_%", f"%<<<HERMES_BRIEF_{required}>>>%"),
        ).fetchone()
    if not row:
        return None
    return str(row[0]), float(row[1]), str(row[2])


def validate_meta(content: str, mode: str, started_at: float) -> tuple[str, dict]:
    name = "AI_META" if mode == "ai" else "STOCK_META"
    meta = json.loads(marker(content, name))
    if meta.get("kind") != mode:
        raise ValueError(f"payload kind must be {mode!r}")
    date = str(meta.get("date", ""))
    if not re.fullmatch(r"20\d\d-\d\d-\d\d", date):
        raise ValueError("payload date is not YYYY-MM-DD")
    session_date = datetime.fromtimestamp(started_at, tz=LA).date().isoformat()
    if date != session_date:
        raise ValueError(f"payload date {date} does not match cron session date {session_date}")
    return date, meta


def validate_ai(date: str, html: str, md: str) -> None:
    if "<html" not in html.lower() or "</html>" not in html.lower():
        raise ValueError("AI HTML is not a complete standalone document")
    html_topics = TOPIC_RE_HTML.findall(html)
    md_topics = TOPIC_RE_MD.findall(md)
    if html_topics != list("1234567") or md_topics != list("1234567"):
        raise ValueError(f"AI topics must be exactly 1-7 (html={html_topics}, md={md_topics})")
    takeaways_html = re.search(r'class=["\'][^"\']*takeaways[^"\']*["\'][^>]*>(.*?)</section>', html, re.I | re.S)
    if not takeaways_html or len(re.findall(r"<li\b", takeaways_html.group(1), re.I)) != 7:
        raise ValueError("AI HTML must contain exactly seven Founder Takeaways")
    if len(re.findall(r"^###\s+", md, re.M)) < 7:
        raise ValueError("AI Markdown must contain seven standalone takeaway headlines")
    if date not in html or date not in md:
        raise ValueError("AI outputs must include the payload date")
    if len(re.findall(r"https?://", html)) < 7 or len(re.findall(r"https?://", md)) < 7:
        raise ValueError("AI outputs must retain source URLs")


def validate_stock(date: str, html: str, md: str, csv_text: str) -> None:
    if "<html" not in html.lower() or "</html>" not in html.lower():
        raise ValueError("Stock HTML is not a complete standalone document")
    if ".stock-grid" in html or "repeat(" in html:
        raise ValueError("Stock HTML violates the horizontal-row contract")
    for ticker in TRACKED:
        if ticker not in html or ticker not in md:
            raise ValueError(f"Stock output is missing tracked ticker {ticker}")
    if date not in html or date not in md:
        raise ValueError("Stock outputs must include the payload date")
    rows = list(csv.DictReader(csv_text.splitlines()))
    csv_tickers = {str(row.get("ticker", "")).strip().upper() for row in rows}
    missing = set(TRACKED) - csv_tickers
    if missing:
        raise ValueError(f"Stock CSV is missing tracked tickers: {sorted(missing)}")
    if not {"ticker", "current_price", "daily_change", "daily_change_pct"}.issubset(rows[0].keys() if rows else set()):
        raise ValueError("Stock CSV is missing required columns")


def fsync_directory(path: Path) -> None:
    fd = os.open(path, os.O_RDONLY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    tmp = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp, path)
        fsync_directory(path.parent)
    finally:
        tmp.unlink(missing_ok=True)


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def state_path(mode: str) -> Path:
    return profile_home() / "cron" / f"brief-materializer-{mode}-state.json"


def read_state(mode: str) -> dict:
    path = state_path(mode)
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def prune_ai(root: Path, keep: int = 5) -> None:
    date_dirs = sorted(
        (p for p in root.iterdir() if p.is_dir() and re.fullmatch(r"20\d\d-\d\d-\d\d", p.name)),
        key=lambda p: p.name,
        reverse=True,
    )
    for directory in date_dirs[keep:]:
        date = directory.name
        for suffix in ("html", "md"):
            (directory / f"AI Morning Brief - {date}.{suffix}").unlink(missing_ok=True)
        try:
            directory.rmdir()
        except OSError:
            pass


def prune_stock(root: Path, keep: int = 5) -> None:
    date_dirs = sorted((p for p in root.iterdir() if p.is_dir() and re.fullmatch(r"20\d\d-\d\d-\d\d", p.name)), key=lambda p: p.name, reverse=True)
    for directory in date_dirs[keep:]:
        date = directory.name
        for suffix in ("html", "md", "csv"):
            (directory / f"Stock Brief - {date}.{suffix}").unlink(missing_ok=True)
        try:
            directory.rmdir()
        except OSError:
            pass


def publish(mode: str) -> int:
    payload = newest_payload(mode)
    if payload is None:
        return 0
    session_id, started_at, content = payload
    state = read_state(mode)
    if state.get("schema") == 2 and state.get("session_id") == session_id:
        return 0
    date, meta = validate_meta(content, mode, started_at)
    if mode == "ai":
        html = marker(content, "AI_HTML")
        md = marker(content, "AI_MARKDOWN") + "\n"
        validate_ai(date, html, md)
        root = AI_ROOT
        date_root = root / date
        html_path = date_root / f"AI Morning Brief - {date}.html"
        md_path = date_root / f"AI Morning Brief - {date}.md"
        atomic_write(md_path, md)
        atomic_write(html_path, html)
        validate_ai(date, html_path.read_text(encoding="utf-8"), md_path.read_text(encoding="utf-8"))
        # Remove only the obsolete strict flat pair after the canonical nested
        # pair has passed read-back validation.
        (root / f"AI_Brief_{date}.html").unlink(missing_ok=True)
        (root / f"AI_Brief_{date}.md").unlink(missing_ok=True)
        prune_ai(root)
        files = {"html": str(html_path), "markdown": str(md_path)}
        hashes = {"html": sha(html), "markdown": sha(md)}
    else:
        html = marker(content, "STOCK_HTML")
        md = marker(content, "STOCK_MARKDOWN") + "\n"
        csv_text = marker(content, "STOCK_CSV") + "\n"
        validate_stock(date, html, md, csv_text)
        root = STOCK_ROOT
        date_root = root / date
        html_path = date_root / f"Stock Brief - {date}.html"
        md_path = date_root / f"Stock Brief - {date}.md"
        csv_path = date_root / f"Stock Brief - {date}.csv"
        atomic_write(csv_path, csv_text)
        atomic_write(md_path, md)
        atomic_write(html_path, html)
        validate_stock(date, html_path.read_text(encoding="utf-8"), md_path.read_text(encoding="utf-8"), csv_path.read_text(encoding="utf-8"))
        prune_stock(root)
        files = {"html": str(html_path), "markdown": str(md_path), "csv": str(csv_path)}
        hashes = {"html": sha(html), "markdown": sha(md), "csv": sha(csv_text)}
    checkpoint = {
        "schema": 2,
        "mode": mode,
        "session_id": session_id,
        "session_started_at": started_at,
        "date": date,
        "published_at": datetime.now(tz=LA).isoformat(),
        "files": files,
        "sha256": hashes,
        "meta": meta,
    }
    atomic_write(state_path(mode), json.dumps(checkpoint, indent=2, sort_keys=True) + "\n")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("ai", "stock"))
    args = parser.parse_args()
    try:
        return publish(args.mode)
    except Exception as exc:
        print(f"BRIEF_MATERIALIZER_{args.mode.upper()}_ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
