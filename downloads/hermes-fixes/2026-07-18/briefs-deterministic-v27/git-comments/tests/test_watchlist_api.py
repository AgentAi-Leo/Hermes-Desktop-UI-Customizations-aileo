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

    added = module.add_watch_url({"url": "https://github.com/Owner/Repo/issues/42"})
    assert added["refresh"]["ok"] is True
    state = module._watchlist()
    assert [entry["id"] for entry in state["active"]] == ["owner/repo/issues/42"]
    assert state["archived"] == []
    expect_http(409, module.add_watch_url, {"url": "https://github.com/Owner/Repo/issues/42"})
    expect_http(409, module.add_watch_url, {"url": "https://github.com/OWNER/REPO/issues/42/"})

    archived = module.archive_watch_url({"id": "owner/repo/issues/42"})
    assert archived["refresh"]["ok"] is True
    state = module._watchlist()
    assert state["active"] == []
    assert state["archived"][0]["id"] == "owner/repo/issues/42"
    assert state["archived"][0]["archived_at"]
    expect_http(404, module.archive_watch_url, {"id": "owner/repo/issues/42"})
    expect_http(409, module.add_watch_url, {"url": "https://github.com/Owner/Repo/issues/42"})
    expect_http(409, module.add_watch_url, {"url": "https://github.com/OWNER/REPO/issues/42/"})

    restored = module.restore_watch_url({"id": "owner/repo/issues/42"})
    assert restored["refresh"]["ok"] is True
    state = module._watchlist()
    assert state["archived"] == []
    assert state["active"][0]["restored_at"]
    expect_http(404, module.restore_watch_url, {"id": "owner/repo/issues/42"})

    deleted = module.delete_watch_url({"id": "owner/repo/issues/42"})
    assert deleted["refresh"]["ok"] is True
    assert deleted["deleted"]["id"] == "owner/repo/issues/42"
    state = module._watchlist()
    assert state["active"] == []
    assert state["archived"] == []
    expect_http(404, module.delete_watch_url, {"id": "owner/repo/issues/42"})

    leftovers = [path.name for path in root.iterdir() if path.name.startswith(".watchlist-")]
    assert leftovers == [], leftovers

print("GIT_COMMENTS_WATCHLIST_API=PASS")
