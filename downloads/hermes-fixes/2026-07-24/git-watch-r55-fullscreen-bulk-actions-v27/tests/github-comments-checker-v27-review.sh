#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROFILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGIN_DIR="$PROFILE_DIR/plugins/git-comments-v27-review/dashboard"
DATA_DIR="$PLUGIN_DIR/data"
DATA_FILE="$DATA_DIR/git-comments.json"
HEALTH_FILE="$DATA_DIR/watcher-health.json"
WATCHLIST_FILE="$DATA_DIR/watchlist.json"
mkdir -p "$DATA_DIR"
export GIT_COMMENTS_DATA_FILE="$DATA_FILE"
export GIT_COMMENTS_HEALTH_FILE="$HEALTH_FILE"
export GIT_COMMENTS_WATCHLIST_FILE="$WATCHLIST_FILE"

python3 - <<'PY'
from __future__ import annotations
import json, os, tempfile, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path

data_path = Path(os.environ["GIT_COMMENTS_DATA_FILE"])
health_path = Path(os.environ["GIT_COMMENTS_HEALTH_FILE"])
watchlist_path = Path(os.environ["GIT_COMMENTS_WATCHLIST_FILE"])


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def atomic_write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{path.stem}-", suffix=".json", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_name, path)
    finally:
        try:
            os.unlink(tmp_name)
        except FileNotFoundError:
            pass


def read_object(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path.name} root is not an object")
    return value


def github(path: str):
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Hermes-Git-Comments-Watcher",
    }
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(f"https://api.github.com{path}", headers=headers)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as reason:
            code = int(reason.code)
            if attempt == 3 or code not in {429, 500, 502, 503, 504}:
                raise
        except (urllib.error.URLError, TimeoutError, OSError):
            if attempt == 3:
                raise
        time.sleep(2 ** attempt)
    raise RuntimeError("GitHub request retry loop exhausted")


def actor(value: dict | None) -> dict:
    value = value or {}
    return {"login": value.get("login") or "unknown", "avatar_url": value.get("avatar_url") or ""}


def api_repo_path(repo: str) -> str:
    owner, name = repo.split("/", 1)
    return f"/repos/{urllib.parse.quote(owner, safe='')}/{urllib.parse.quote(name, safe='')}"


old = {}
try:
    old = read_object(data_path)
except (FileNotFoundError, OSError, json.JSONDecodeError, ValueError):
    pass
old_issues = {str(item.get("watch_id") or ""): item for item in old.get("issues", []) if item.get("watch_id")}

try:
    watchlist = read_object(watchlist_path)
    if watchlist.get("schema_version") != 1 or not isinstance(watchlist.get("active"), list) or not isinstance(watchlist.get("archived"), list):
        raise ValueError("watchlist has an invalid schema")
    comment_owner = str(watchlist.get("comment_owner") or "").strip()
    if not comment_owner:
        raise ValueError("watchlist comment_owner is required")
    issues = []
    for entry in watchlist["active"]:
        watch_id = str(entry["id"])
        repo = str(entry["repo"])
        number = int(entry["number"])
        base = api_repo_path(repo)
        issue = github(f"{base}/issues/{number}")
        comments = github(f"{base}/issues/{number}/comments?per_page=100")
        timeline = github(f"{base}/issues/{number}/timeline?per_page=100")
        normalized_comments = [{
            "id": comment.get("id"),
            "body": comment.get("body") or "",
            "created_at": comment.get("created_at"),
            "updated_at": comment.get("updated_at"),
            "html_url": comment.get("html_url"),
            "author_association": comment.get("author_association") or "NONE",
            "author": actor(comment.get("user")),
        } for comment in comments]
        received = [comment for comment in normalized_comments if comment["author"]["login"].lower() != comment_owner.lower()]
        old_issue = old_issues.get(watch_id, {})
        old_received_ids = {
            comment.get("id") for comment in old_issue.get("comments", [])
            if str(((comment.get("author") or {}).get("login") or "")).lower() != comment_owner.lower()
        }
        new_count = sum(1 for comment in received if comment.get("id") not in old_received_ids)
        new_count = max(new_count, int(old_issue.get("new_received_count") or 0))
        merged_at = (issue.get("pull_request") or {}).get("merged_at")
        normalized_labels = [{
            "name": label.get("name") or "",
            "color": label.get("color") or "",
        } for label in (issue.get("labels") or []) if isinstance(label, dict) and label.get("name")]
        status_events = [{
            "id": f"opened-{issue.get('id') or watch_id}",
            "event": "opened",
            "created_at": issue.get("created_at"),
            "actor": actor(issue.get("user")),
            "state_reason": None,
        }]
        for item in timeline:
            event = item.get("event")
            if event not in {"closed", "reopened", "labeled", "unlabeled"}:
                continue
            status_events.append({
                "id": item.get("id") or item.get("node_id") or f"{event}-{item.get('created_at')}",
                "event": event,
                "created_at": item.get("created_at"),
                "actor": actor(item.get("actor")),
                "state_reason": issue.get("state_reason") if event == "closed" else None,
                "label": {
                    "name": (item.get("label") or {}).get("name") or "",
                    "color": (item.get("label") or {}).get("color") or "",
                } if event in {"labeled", "unlabeled"} else None,
            })
        issues.append({
            "watch_id": watch_id,
            "repo": repo,
            "kind": entry.get("kind") or ("pull" if issue.get("pull_request") else "issue"),
            "number": number,
            "title": issue.get("title") or "",
            "body": issue.get("body") or "",
            "at_a_glance": str((entry.get("presentation") or {}).get("at_a_glance") or old_issue.get("at_a_glance") or ""),
            "html_url": issue.get("html_url") or entry.get("url"),
            "state": issue.get("state"),
            "state_reason": issue.get("state_reason"),
            "merged_at": merged_at,
            "merged": bool(merged_at),
            "author": actor(issue.get("user")),
            "created_at": issue.get("created_at"),
            "updated_at": issue.get("updated_at"),
            "labels": normalized_labels,
            "comments": normalized_comments,
            "status_events": status_events,
            "received_count": len(received),
            "new_received_count": new_count,
        })
    checked_at = now_iso()
    payload = {"schema_version": 4, "comment_owner": comment_owner, "checked_at": checked_at, "updated": checked_at, "issues": issues}
    atomic_write(data_path, payload)
    atomic_write(health_path, {"schema_version": 1, "ok": True, "checked_at": checked_at, "issue_count": len(issues), "error": None})
except Exception as reason:
    atomic_write(health_path, {"schema_version": 1, "ok": False, "checked_at": now_iso(), "issue_count": None, "error": f"{type(reason).__name__}: {reason}"})
    raise
PY
# Deliberately silent on success: no-agent cron delivery should not produce routine messages.
