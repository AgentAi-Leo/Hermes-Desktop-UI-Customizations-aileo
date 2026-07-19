"""Isolated Git Comments V27 review plugin API."""
from __future__ import annotations

import json
import os
import re
import subprocess
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter()
_ROOT = Path(__file__).resolve().parent / "data"
_DATA_PATH = _ROOT / "git-comments.json"
_HEALTH_PATH = _ROOT / "watcher-health.json"
_WATCHLIST_PATH = _ROOT / "watchlist.json"
_CHECKER_PATH = Path(__file__).resolve().parents[3] / "scripts" / "github-comments-checker-v27-review.sh"
_MAX_HEALTH_AGE = timedelta(hours=6)
_GITHUB_URL = re.compile(r"^https://github\.com/([^/?#]+)/([^/?#]+)/(issues|pull)/(\d+)/?$", re.IGNORECASE)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("root is not an object")
    return value


def _atomic_write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.stem}-", suffix=".json", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass


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


def _watchlist() -> dict:
    try:
        value = _read_json(_WATCHLIST_PATH)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail="Git Comments watchlist is missing") from exc
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=f"Git Comments watchlist is unreadable: {exc}") from exc
    if value.get("schema_version") != 1 or not isinstance(value.get("active"), list) or not isinstance(value.get("archived"), list):
        raise HTTPException(status_code=500, detail="Git Comments watchlist has an invalid schema")
    return value


def _canonical_entry(raw_url: object) -> dict:
    url = str(raw_url or "").strip()
    match = _GITHUB_URL.fullmatch(url)
    if not match:
        raise HTTPException(status_code=422, detail="Enter a GitHub issue or pull-request URL")
    owner, repository, route_kind, raw_number = match.groups()
    kind = "pull" if route_kind.lower() == "pull" else "issue"
    number = int(raw_number)
    repo = f"{owner}/{repository}"
    canonical_url = f"https://github.com/{repo}/{route_kind.lower()}/{number}"
    identifier = f"{repo.lower()}/{route_kind.lower()}/{number}"
    return {"id": identifier, "url": canonical_url, "repo": repo, "number": number, "kind": kind, "added_at": _now_iso()}


def _requested_id(payload: dict[str, Any]) -> str:
    identifier = str(payload.get("id") or "").strip().lower()
    if not identifier:
        raise HTTPException(status_code=422, detail="A watchlist id is required")
    return identifier


def _run_checker() -> dict:
    if not _CHECKER_PATH.is_file():
        return {"ok": False, "error": f"Review checker is missing: {_CHECKER_PATH}"}
    try:
        completed = subprocess.run(["bash", str(_CHECKER_PATH)], capture_output=True, text=True, timeout=180, check=True)
        return {"ok": True, "output": completed.stdout.strip()}
    except (subprocess.SubprocessError, OSError) as reason:
        return {"ok": False, "error": str(reason)}


def _payload() -> dict:
    watchlist = _watchlist()
    try:
        payload = _read_json(_DATA_PATH)
    except FileNotFoundError:
        payload = {"schema_version": 4, "comment_owner": watchlist.get("comment_owner"), "checked_at": None, "updated": None, "issues": []}
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=f"Git Comments snapshot is unreadable: {exc}") from exc
    if not isinstance(payload.get("issues"), list):
        raise HTTPException(status_code=500, detail="Git Comments snapshot has an invalid schema")
    payload["watcher_health"] = _watcher_health()
    payload["watchlist"] = watchlist
    return payload


@router.get("/data")
def get_data() -> dict:
    return _payload()


@router.post("/watchlist/add")
def add_watch_url(payload: dict[str, Any]) -> dict:
    entry = _canonical_entry(payload.get("url"))
    watchlist = _watchlist()
    all_entries = [*watchlist["active"], *watchlist["archived"]]
    if any(str(item.get("id") or "").lower() == entry["id"] for item in all_entries):
        raise HTTPException(status_code=409, detail="That GitHub URL is already in the watchlist")
    watchlist["active"].insert(0, entry)
    _atomic_write(_WATCHLIST_PATH, watchlist)
    refresh = _run_checker()
    result = _payload()
    result["refresh"] = refresh
    return result


@router.post("/watchlist/archive")
def archive_watch_url(payload: dict[str, Any]) -> dict:
    identifier = _requested_id(payload)
    watchlist = _watchlist()
    index = next((position for position, item in enumerate(watchlist["active"]) if str(item.get("id") or "").lower() == identifier), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Active watchlist entry not found")
    entry = watchlist["active"].pop(index)
    entry["archived_at"] = _now_iso()
    watchlist["archived"].append(entry)
    _atomic_write(_WATCHLIST_PATH, watchlist)
    refresh = _run_checker()
    result = _payload()
    result["refresh"] = refresh
    return result


@router.post("/watchlist/delete")
def delete_watch_url(payload: dict[str, Any]) -> dict:
    identifier = _requested_id(payload)
    watchlist = _watchlist()
    deleted_from = None
    deleted = None
    for collection in ("active", "archived"):
        index = next((position for position, item in enumerate(watchlist[collection]) if str(item.get("id") or "").lower() == identifier), None)
        if index is not None:
            deleted_from = collection
            deleted = watchlist[collection].pop(index)
            break
    if deleted is None or deleted_from is None:
        raise HTTPException(status_code=404, detail="Watchlist entry not found")
    _atomic_write(_WATCHLIST_PATH, watchlist)
    refresh = _run_checker()
    result = _payload()
    result["refresh"] = refresh
    result["deleted"] = deleted
    result["deleted_from"] = deleted_from
    return result


@router.post("/watchlist/restore")
def restore_watch_url(payload: dict[str, Any]) -> dict:
    identifier = _requested_id(payload)
    watchlist = _watchlist()
    index = next((position for position, item in enumerate(watchlist["archived"]) if str(item.get("id") or "").lower() == identifier), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Archived watchlist entry not found")
    entry = watchlist["archived"].pop(index)
    entry.pop("archived_at", None)
    entry["restored_at"] = _now_iso()
    watchlist["active"].append(entry)
    _atomic_write(_WATCHLIST_PATH, watchlist)
    refresh = _run_checker()
    result = _payload()
    result["refresh"] = refresh
    return result
