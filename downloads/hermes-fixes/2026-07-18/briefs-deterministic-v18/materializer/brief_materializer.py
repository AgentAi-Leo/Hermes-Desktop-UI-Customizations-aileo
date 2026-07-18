#!/usr/bin/env python3
"""Fail-closed JSON-only host materializer for deterministic Hermes Briefs."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sqlite3
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from brief_renderer import ContractError, RenderedBrief, render

LA = ZoneInfo("America/Los_Angeles")
AI_JOB = "953b4520c95a"
STOCK_JOB = "922c26b9f606"
AI_ROOT = Path(os.environ.get("HERMES_AI_BRIEFS_ROOT", "/Users/jb3/.hermes/sandboxes/docker/default/workspace/__AI-DAILY-BRIEFS"))
STOCK_ROOT = Path(os.environ.get("HERMES_STOCK_BRIEFS_ROOT", "/Users/jb3/.hermes/sandboxes/docker/default/home/.hermes/zDownloads/_STOCK-BRIEFS"))
DATE_RE = re.compile(r"20\d\d-\d\d-\d\d")


def profile_home() -> Path:
    configured = os.environ.get("HERMES_HOME", "").strip()
    return Path(configured).expanduser().resolve() if configured else Path.home() / ".hermes" / "profiles" / "local-ai-assist1"


def marker(content: str, name: str) -> str:
    start = f"<<<HERMES_BRIEF_{name}>>>"
    end = f"<<<END_HERMES_BRIEF_{name}>>>"
    if content.count(start) != 1 or content.count(end) != 1:
        raise ContractError(f"payload must contain exactly one {name} marker pair")
    value = content.split(start, 1)[1].split(end, 1)[0].strip()
    if not value:
        raise ContractError(f"payload section {name} is empty")
    return value


def parse_json_payload(mode: str, content: str, started_at: float) -> dict:
    name = "AI_JSON" if mode == "ai" else "STOCK_JSON"
    try:
        payload = json.loads(marker(content, name))
    except json.JSONDecodeError as exc:
        raise ContractError(f"{name}: invalid JSON at line {exc.lineno} column {exc.colno}") from exc
    if not isinstance(payload, dict):
        raise ContractError(f"{name}: root must be an object")
    session_date = datetime.fromtimestamp(started_at, tz=LA).date().isoformat()
    if payload.get("date") != session_date:
        raise ContractError(f"payload date {payload.get('date')!r} does not match cron session date {session_date}")
    return payload


def newest_payload(mode: str) -> tuple[str, float, str] | None:
    db_path = profile_home() / "state.db"
    if not db_path.is_file():
        raise FileNotFoundError(f"profile state database missing: {db_path}")
    job_id = AI_JOB if mode == "ai" else STOCK_JOB
    required = "AI_JSON" if mode == "ai" else "STOCK_JSON"
    with sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=15) as db:
        row = db.execute(
            """
            SELECT s.id, s.started_at, m.content
            FROM sessions s JOIN messages m ON m.session_id = s.id
            WHERE s.source = 'cron' AND s.id LIKE ? AND m.role = 'assistant'
              AND m.active = 1 AND m.content LIKE ?
            ORDER BY s.started_at DESC, m.id DESC LIMIT 1
            """,
            (f"cron_{job_id}_%", f"%<<<HERMES_BRIEF_{required}>>>%"),
        ).fetchone()
    return None if not row else (str(row[0]), float(row[1]), str(row[2]))


def sha_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def artifact_names(mode: str, day: str) -> dict[str, str]:
    stem = "AI Morning Brief" if mode == "ai" else "Stock Brief"
    result = {"html": f"{stem} - {day}.html", "markdown": f"{stem} - {day}.md"}
    if mode == "stock":
        result["csv"] = f"{stem} - {day}.csv"
    return result


def artifact_bytes(mode: str, rendered: RenderedBrief) -> dict[str, bytes]:
    result = {"html": rendered.html.encode("utf-8"), "markdown": rendered.markdown.encode("utf-8")}
    if mode == "stock":
        if rendered.csv is None:
            raise ContractError("Stock renderer did not produce CSV")
        result["csv"] = rendered.csv.encode("utf-8")
    return result


def validate_artifacts(mode: str, rendered: RenderedBrief, files: dict[str, bytes]) -> None:
    if files != artifact_bytes(mode, rendered):
        raise ContractError("rendered artifacts changed during staging")
    html_text = files["html"].decode("utf-8")
    markdown = files["markdown"].decode("utf-8")
    version = "ai-brief-data-v1" if mode == "ai" else "stock-brief-data-v1"
    if f'content="{version}"' not in html_text or f"**Contract:** {version}" not in markdown:
        raise ContractError("rendered contract marker missing")
    if "<script" in html_text.lower():
        raise ContractError("deterministic archive HTML must not contain scripts")
    if mode == "ai":
        if html_text.count('data-brief-topic="') != 7 or html_text.count('<li><strong>') != 7:
            raise ContractError("AI rendered structure is incomplete")
    else:
        if html_text.count('class="stock-row"') != 7:
            raise ContractError("Stock rendered structure is incomplete")
        if b"ticker,current_price,daily_change,daily_change_pct\n" != files["csv"].splitlines(keepends=True)[0]:
            raise ContractError("Stock CSV contract changed")


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


def publish_rendered(mode: str, rendered: RenderedBrief, root: Path) -> dict:
    root.mkdir(parents=True, exist_ok=True)
    names = artifact_names(mode, rendered.date)
    expected = artifact_bytes(mode, rendered)
    stage = Path(tempfile.mkdtemp(prefix=f".brief-stage-{rendered.date}-", dir=root))
    backup = root / f".brief-last-valid-{rendered.date}"
    target = root / rendered.date
    try:
        for key, name in names.items():
            path = stage / name
            path.write_bytes(expected[key])
            with path.open("rb") as handle:
                os.fsync(handle.fileno())
        fsync_directory(stage)
        staged = {key: (stage / name).read_bytes() for key, name in names.items()}
        validate_artifacts(mode, rendered, staged)
        if backup.exists():
            shutil.rmtree(backup)
        if target.exists():
            os.replace(target, backup)
        try:
            os.replace(stage, target)
            fsync_directory(root)
        except Exception:
            if target.exists():
                shutil.rmtree(target)
            if backup.exists():
                os.replace(backup, target)
            raise
        installed = {key: (target / name).read_bytes() for key, name in names.items()}
        validate_artifacts(mode, rendered, installed)
        if backup.exists():
            shutil.rmtree(backup)
        return {
            "files": {key: str(target / name) for key, name in names.items()},
            "sha256": {key: sha_bytes(value) for key, value in installed.items()},
        }
    finally:
        if stage.exists():
            shutil.rmtree(stage)


def prune(root: Path, mode: str, keep: int = 5) -> None:
    dated = sorted((path for path in root.iterdir() if path.is_dir() and DATE_RE.fullmatch(path.name)), key=lambda path: path.name, reverse=True)
    expected = set(artifact_names(mode, "2000-01-01").keys())
    for directory in dated[keep:]:
        names = artifact_names(mode, directory.name)
        if set(names) != expected:
            continue
        for filename in names.values():
            (directory / filename).unlink(missing_ok=True)
        try:
            directory.rmdir()
        except OSError:
            pass


def publish(mode: str) -> int:
    newest = newest_payload(mode)
    if newest is None:
        return 0
    session_id, started_at, content = newest
    state = read_state(mode)
    if state.get("schema") == 3 and state.get("session_id") == session_id:
        return 0
    payload = parse_json_payload(mode, content, started_at)
    rendered = render(mode, payload)
    root = AI_ROOT if mode == "ai" else STOCK_ROOT
    result = publish_rendered(mode, rendered, root)
    checkpoint = {
        "schema": 3,
        "mode": mode,
        "contract_version": payload["contract_version"],
        "source_sha256": rendered.source_sha256,
        "session_id": session_id,
        "session_started_at": started_at,
        "date": rendered.date,
        "published_at": datetime.now(tz=LA).isoformat(),
        **result,
    }
    atomic_write(state_path(mode), json.dumps(checkpoint, indent=2, sort_keys=True) + "\n")
    prune(root, mode)
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
