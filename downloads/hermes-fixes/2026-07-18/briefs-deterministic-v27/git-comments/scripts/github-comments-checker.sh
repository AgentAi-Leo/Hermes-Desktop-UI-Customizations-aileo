#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROFILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGIN_DIR="$PROFILE_DIR/plugins/git-comments/dashboard"
DATA_DIR="$PLUGIN_DIR/data"
DATA_FILE="$DATA_DIR/git-comments.json"
HEALTH_FILE="$DATA_DIR/watcher-health.json"
mkdir -p "$DATA_DIR"
export GIT_COMMENTS_DATA_FILE="$DATA_FILE"
export GIT_COMMENTS_HEALTH_FILE="$HEALTH_FILE"

python3 - <<'PY'
from __future__ import annotations
import json, os, tempfile, urllib.request
from datetime import datetime, timezone
from pathlib import Path

repo = "NousResearch/hermes-agent"
watched = [58130, 58510]
owner = "AgentAi-Leo"
data_path = Path(os.environ["GIT_COMMENTS_DATA_FILE"])
health_path = Path(os.environ["GIT_COMMENTS_HEALTH_FILE"])


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
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def actor(value: dict | None) -> dict:
    value = value or {}
    return {"login": value.get("login") or "unknown", "avatar_url": value.get("avatar_url") or ""}


old = {}
try:
    old = json.loads(data_path.read_text(encoding="utf-8"))
except (FileNotFoundError, OSError, json.JSONDecodeError):
    pass
old_issues = {int(item.get("number") or item.get("issue_number")): item for item in old.get("issues", []) if item.get("number") or item.get("issue_number")}

try:
    issues = []
    for number in watched:
        issue = github(f"/repos/{repo}/issues/{number}")
        comments = github(f"/repos/{repo}/issues/{number}/comments?per_page=100")
        timeline = github(f"/repos/{repo}/issues/{number}/timeline?per_page=100")
        normalized_comments = [{
            "id": comment.get("id"),
            "body": comment.get("body") or "",
            "created_at": comment.get("created_at"),
            "updated_at": comment.get("updated_at"),
            "html_url": comment.get("html_url"),
            "author_association": comment.get("author_association") or "NONE",
            "author": actor(comment.get("user")),
        } for comment in comments]
        received = [comment for comment in normalized_comments if comment["author"]["login"].lower() != owner.lower()]
        old_issue = old_issues.get(number, {})
        old_received_ids = {
            comment.get("id") for comment in old_issue.get("comments", [])
            if ((comment.get("author") or {}).get("login") or (comment.get("user") or {}).get("login") or comment.get("user") or "").lower() != owner.lower()
        }
        new_count = sum(1 for comment in received if comment.get("id") not in old_received_ids)
        new_count = max(new_count, int(old_issue.get("new_received_count") or 0))
        status_events = []
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
            "number": number,
            "title": issue.get("title") or "",
            "html_url": issue.get("html_url"),
            "state": issue.get("state"),
            "state_reason": issue.get("state_reason"),
            "comments": normalized_comments,
            "status_events": status_events,
            "received_count": len(received),
            "new_received_count": new_count,
        })
    checked_at = now_iso()
    payload = {"schema_version": 3, "repo": repo, "owner": owner, "checked_at": checked_at, "updated": checked_at, "issues": issues}
    atomic_write(data_path, payload)
    atomic_write(health_path, {"schema_version": 1, "ok": True, "checked_at": checked_at, "issue_count": len(issues), "error": None})
except Exception as reason:
    atomic_write(health_path, {"schema_version": 1, "ok": False, "checked_at": now_iso(), "issue_count": None, "error": f"{type(reason).__name__}: {reason}"})
    raise
PY
# Deliberately silent on success: no-agent cron delivery should not produce routine messages.
