"""Git Comments dashboard plugin API.

Reads only atomically-written profile-local snapshots produced by the checker.
Mounted by Hermes at /api/plugins/git-comments/.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter()
_ROOT = Path(__file__).resolve().parent / "data"
_DATA_PATH = _ROOT / "git-comments.json"
_HEALTH_PATH = _ROOT / "watcher-health.json"
_MAX_HEALTH_AGE = timedelta(hours=6)  # Three intervals for the 120-minute watcher.


def _read_json(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("root is not an object")
    return value


def _timestamp(value: object) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed.astimezone(timezone.utc)


def _watcher_health() -> dict:
    try:
        raw = _read_json(_HEALTH_PATH)
    except (FileNotFoundError, OSError, json.JSONDecodeError, ValueError) as reason:
        return {"ok": False, "status": "unknown", "checked_at": None, "stale": True, "max_age_seconds": int(_MAX_HEALTH_AGE.total_seconds()), "error": str(reason)}
    checked_at = _timestamp(raw.get("checked_at"))
    stale = checked_at is None or datetime.now(timezone.utc) - checked_at > _MAX_HEALTH_AGE
    ok = raw.get("ok") is True and not stale
    return {
        "ok": ok,
        "status": "healthy" if ok else "stale" if stale else "failed",
        "checked_at": raw.get("checked_at"),
        "stale": stale,
        "max_age_seconds": int(_MAX_HEALTH_AGE.total_seconds()),
        "error": raw.get("error"),
    }


@router.get("/data")
def get_data() -> dict:
    try:
        payload = _read_json(_DATA_PATH)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Git Comments snapshot not generated yet") from exc
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=f"Git Comments snapshot is unreadable: {exc}") from exc
    if not isinstance(payload.get("issues"), list):
        raise HTTPException(status_code=500, detail="Git Comments snapshot has an invalid schema")
    payload["watcher_health"] = _watcher_health()
    return payload
