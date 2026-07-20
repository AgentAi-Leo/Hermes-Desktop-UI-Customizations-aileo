from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

from fastapi import HTTPException


API_PATH = Path(sys.argv[1]).resolve()
SEED_PATH = Path(sys.argv[2]).resolve()
spec = importlib.util.spec_from_file_location("git_comments_v27_api_test", API_PATH)
module = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(module)


def expect_http(status: int, function, *args):
    try:
        function(*args)
    except HTTPException as reason:
        assert reason.status_code == status, (reason.status_code, reason.detail)
        return reason
    raise AssertionError(f"expected HTTP {status}")


issue = module._canonical_entry("https://github.com/Owner/Repo/issues/42")
assert issue["id"] == "owner/repo/issues/42"
assert issue["kind"] == "issue"
assert issue["url"] == "https://github.com/Owner/Repo/issues/42"
pull = module._canonical_entry("https://github.com/Owner/Repo/pull/84/")
assert pull["id"] == "owner/repo/pull/84"
assert pull["kind"] == "pull"
expect_http(422, module._canonical_entry, "https://example.com/Owner/Repo/issues/42")
expect_http(422, module._canonical_entry, "https://github.com/Owner/Repo/discussions/42")
expect_http(422, module._canonical_entry, "https://github.com/Owner/Repo/issues/42?tab=comments")
expect_http(422, module._canonical_entry, "https://github.com/Owner/Repo/issues/42#issuecomment-1")

seed = json.loads(SEED_PATH.read_text(encoding="utf-8"))
assert seed["schema_version"] == 1
assert len(seed["active"]) == 2
assert len(seed["archived"]) == 0
assert {entry["number"] for entry in seed["active"]} == {58130, 58510}

with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    module._ROOT = root
    module._WATCHLIST_PATH = root / "watchlist.json"
    module._DATA_PATH = root / "git-comments.json"
    module._HEALTH_PATH = root / "watcher-health.json"
    module._run_checker = lambda: {"ok": True, "test": True}
    module._atomic_write(module._WATCHLIST_PATH, {"schema_version": 1, "comment_owner": "AgentAi-Leo", "active": [], "archived": []})
    module._atomic_write(module._DATA_PATH, {"schema_version": 4, "comment_owner": "AgentAi-Leo", "checked_at": None, "updated": None, "issues": []})
    module._atomic_write(module._HEALTH_PATH, {"schema_version": 1, "ok": True, "checked_at": module._now_iso(), "error": None})

    def initial_github_fixture(path: str):
        number = int(path.split("/issues/")[1].split("/")[0])
        if path.endswith("/comments?per_page=100"):
            return [{
                "id": number * 10,
                "body": "A maintainer supplied useful implementation context.",
                "created_at": "2026-07-19T02:00:00Z",
                "updated_at": "2026-07-19T02:00:00Z",
                "html_url": f"https://github.com/Owner/Repo/issues/{number}#issuecomment-{number * 10}",
                "author_association": "MEMBER",
                "user": {"login": "maintainer", "avatar_url": "maintainer-avatar"},
            }]
        if path.endswith("/timeline?per_page=100"):
            return [{
                "id": number * 100,
                "event": "labeled",
                "created_at": "2026-07-19T02:30:00Z",
                "actor": {"login": "maintainer", "avatar_url": "maintainer-avatar"},
                "label": {"name": "type/feature", "color": "1f6feb"},
            }]
        return {
            "id": number,
            "title": f"Hydrated GitHub item {number}",
            "body": "## Summary\nAdds immediate GitHub hydration so newly watched items show the real title, author, dates, comments, status, and readable context before the background checker completes.",
            "html_url": f"https://github.com/Owner/Repo/issues/{number}",
            "state": "open",
            "state_reason": None,
            "user": {"login": "issue-author", "avatar_url": "author-avatar"},
            "created_at": "2026-07-18T18:00:00Z",
            "updated_at": "2026-07-19T03:30:00Z",
            "labels": [{"name": "type/feature", "color": "1f6feb"}],
        }

    module._github_json = initial_github_fixture

    added = module.add_watch_url({"url": "https://github.com/Owner/Repo/issues/42"})
    assert added["refresh"]["ok"] is True
    state = module._watchlist()
    assert [entry["id"] for entry in state["active"]] == ["owner/repo/issues/42"]
    assert state["archived"] == []
    presentation = state["active"][0]["presentation"]
    assert presentation["title"] == "Hydrated GitHub item 42"
    assert presentation["author"] == {"login": "issue-author", "avatar_url": "author-avatar"}
    assert presentation["created_at"] == "2026-07-18T18:00:00Z"
    assert presentation["updated_at"] == "2026-07-19T03:30:00Z"
    assert presentation["comments"][0]["author"]["login"] == "maintainer"
    assert presentation["status_events"][0]["event"] == "opened"
    assert presentation["status_events"][1]["event"] == "labeled"
    assert presentation["received_count"] == 1
    assert presentation["at_a_glance"]
    assert len(presentation["at_a_glance"].split()) <= 30
    assert len(presentation["at_a_glance"]) <= 160
    initial_summary = presentation["at_a_glance"]
    expect_http(409, module.add_watch_url, {"url": "https://github.com/Owner/Repo/issues/42"})
    expect_http(409, module.add_watch_url, {"url": "https://github.com/OWNER/REPO/issues/42/"})

    module.add_watch_url({"url": "https://github.com/Owner/Repo/pull/84"})
    state = module._watchlist()
    assert [entry["id"] for entry in state["active"]] == ["owner/repo/pull/84", "owner/repo/issues/42"]
    removed_newest = module.delete_watch_url({"id": "owner/repo/pull/84"})
    assert removed_newest["deleted_from"] == "active"

    snapshot = {
        "watch_id": "owner/repo/issues/42",
        "repo": "Owner/Repo",
        "number": 42,
        "title": "Archived issue title",
        "body": "Archived issue body",
        "html_url": "https://github.com/Owner/Repo/issues/42",
        "state": "open",
        "author": {"login": "issue-author", "avatar_url": "avatar"},
        "created_at": "2026-07-18T18:00:00Z",
        "updated_at": "2026-07-19T03:30:00Z",
        "labels": [{"name": "type/feature", "color": "1f6feb"}],
        "comments": [{"id": 7, "body": "Archived comment", "author": {"login": "reviewer", "avatar_url": ""}}],
        "status_events": [],
        "at_a_glance": "A replacement summary supplied by the browser must not win.",
        "ignored_secret": "must-not-persist",
    }
    archived = module.archive_watch_url({"id": "owner/repo/issues/42", "snapshot": snapshot})
    assert archived["refresh"]["ok"] is True
    state = module._watchlist()
    assert state["active"] == []
    assert state["archived"][0]["id"] == "owner/repo/issues/42"
    assert state["archived"][0]["archived_at"]
    assert state["archived"][0]["snapshot"]["title"] == "Archived issue title"
    assert state["archived"][0]["presentation"]["at_a_glance"] == initial_summary
    assert state["archived"][0]["snapshot"]["at_a_glance"] == initial_summary
    assert "ignored_secret" not in state["archived"][0]["snapshot"]
    viewed = module.view_archived_watch_url({"id": "owner/repo/issues/42"})
    assert viewed["read_only"] is True
    assert viewed["source"] == "archive_snapshot"
    assert viewed["issue"]["title"] == "Archived issue title"
    assert viewed["issue"]["comments"][0]["body"] == "Archived comment"
    expect_http(404, module.archive_watch_url, {"id": "owner/repo/issues/42"})
    expect_http(409, module.add_watch_url, {"url": "https://github.com/Owner/Repo/issues/42"})
    expect_http(409, module.add_watch_url, {"url": "https://github.com/OWNER/REPO/issues/42/"})

    deleted_archived = module.delete_watch_url({"id": "owner/repo/issues/42"})
    assert deleted_archived["refresh"]["ok"] is True
    assert deleted_archived["deleted"]["id"] == "owner/repo/issues/42"
    assert deleted_archived["deleted_from"] == "archived"
    state = module._watchlist()
    assert state["active"] == []
    assert state["archived"] == []

    module.add_watch_url({"url": "https://github.com/Owner/Repo/issues/42"})
    module.archive_watch_url({"id": "owner/repo/issues/42"})
    legacy_state = module._watchlist()
    legacy_state["archived"][0].pop("presentation", None)
    legacy_state["archived"][0].pop("snapshot", None)
    module._atomic_write(module._WATCHLIST_PATH, legacy_state)

    def github_fixture(path: str):
        if path.endswith("/comments?per_page=100"):
            return [{"id": 8, "body": "Live archived comment", "user": {"login": "live-reviewer", "avatar_url": ""}}]
        if path.endswith("/timeline?per_page=100"):
            return []
        return {
            "title": "Live archived issue", "body": "Loaded from GitHub", "html_url": "https://github.com/Owner/Repo/issues/42",
            "state": "closed", "state_reason": "completed", "user": {"login": "live-author", "avatar_url": ""},
            "created_at": "2026-07-18T18:00:00Z", "updated_at": "2026-07-19T04:00:00Z", "labels": [],
        }

    module._github_json = github_fixture
    live_view = module.view_archived_watch_url({"id": "owner/repo/issues/42"})
    assert live_view["read_only"] is True
    assert live_view["source"] == "github_live_migrated"
    assert live_view["issue"]["title"] == "Live archived issue"
    assert live_view["issue"]["comments"][0]["author"]["login"] == "live-reviewer"
    assert live_view["issue"]["at_a_glance"]
    migrated_state = module._watchlist()
    assert migrated_state["archived"][0]["presentation"]["at_a_glance"] == live_view["issue"]["at_a_glance"]
    assert migrated_state["archived"][0]["snapshot"]["at_a_glance"] == live_view["issue"]["at_a_glance"]

    restored = module.restore_watch_url({"id": "owner/repo/issues/42"})
    assert restored["refresh"]["ok"] is True
    state = module._watchlist()
    assert state["archived"] == []
    assert state["active"][0]["restored_at"]
    assert state["active"][0]["presentation"]["at_a_glance"] == live_view["issue"]["at_a_glance"]
    assert "snapshot" not in state["active"][0]
    expect_http(404, module.restore_watch_url, {"id": "owner/repo/issues/42"})

    deleted = module.delete_watch_url({"id": "owner/repo/issues/42"})
    assert deleted["refresh"]["ok"] is True
    assert deleted["deleted"]["id"] == "owner/repo/issues/42"
    assert deleted["deleted_from"] == "active"
    state = module._watchlist()
    assert state["active"] == []
    assert state["archived"] == []
    expect_http(404, module.delete_watch_url, {"id": "owner/repo/issues/42"})

    def failed_hydration(_path: str):
        raise OSError("fixture transport failed")

    module._github_json = failed_hydration
    reason = expect_http(502, module.add_watch_url, {"url": "https://github.com/Owner/Repo/issues/99"})
    assert "Unable to load GitHub item before adding it" in str(reason.detail)
    assert module._watchlist()["active"] == []

    leftovers = [path.name for path in root.iterdir() if path.name.startswith(".watchlist-")]
    assert leftovers == [], leftovers

print("GIT_COMMENTS_WATCHLIST_API=PASS")
