import importlib.util
import json
import os
import sys
import tempfile
import types
import unittest
from pathlib import Path

sys.dont_write_bytecode = True

try:
    from fastapi import HTTPException
except ModuleNotFoundError:
    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    class APIRouter:
        def _route(self, _path):
            return lambda function: function

        get = _route
        post = _route

    sys.modules["fastapi"] = types.SimpleNamespace(
        APIRouter=APIRouter,
        HTTPException=HTTPException,
    )

MODULE_PATH = Path(os.environ.get("GIT_WATCH_API_PATH", Path(__file__).resolve().parents[1] / "payload" / "dashboard" / "plugin_api.py"))
spec = importlib.util.spec_from_file_location("git_watch_r64_api", MODULE_PATH)
api = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(api)


def entry(number: int) -> dict:
    return {
        "id": f"owner/repo/issues/{number}",
        "url": f"https://github.com/owner/repo/issues/{number}",
        "repo": "owner/repo",
        "number": number,
        "kind": "issue",
        "archived_at": f"2026-07-{number:02d}T00:00:00Z",
        "snapshot": {"watch_id": f"owner/repo/issues/{number}", "number": number},
    }


class BulkArchivedApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.watchlist_path = Path(self.temp.name) / "watchlist.json"
        api._WATCHLIST_PATH = self.watchlist_path
        api._DATA_PATH = Path(self.temp.name) / "git-comments.json"
        api._HEALTH_PATH = Path(self.temp.name) / "watcher-health.json"
        self.checker_calls = 0
        self.write_calls = 0
        api._run_checker = self.run_checker
        self.real_atomic_write = api._atomic_write
        api._atomic_write = self.atomic_write
        api._payload = lambda: {"watchlist": json.loads(self.watchlist_path.read_text())}

    def tearDown(self):
        api._atomic_write = self.real_atomic_write
        self.temp.cleanup()

    def run_checker(self):
        self.checker_calls += 1
        return {"ok": True}

    def atomic_write(self, path, payload):
        self.write_calls += 1
        self.real_atomic_write(path, payload)

    def seed(self):
        payload = {
            "schema_version": 1,
            "comment_owner": "AgentAi-Leo",
            "active": [{
                "id": "owner/repo/issues/9",
                "url": "https://github.com/owner/repo/issues/9",
                "repo": "owner/repo",
                "number": 9,
                "kind": "issue",
            }],
            "archived": [entry(1), entry(2), entry(3)],
        }
        self.watchlist_path.write_text(json.dumps(payload), encoding="utf-8")
        return payload

    def read(self):
        return json.loads(self.watchlist_path.read_text(encoding="utf-8"))

    def test_bulk_restore_is_atomic_ordered_and_cleans_archive_fields(self):
        self.seed()
        result = api.bulk_archived_watch_urls({
            "action": "restore",
            "ids": ["owner/repo/issues/3", "owner/repo/issues/1"],
        })
        stored = self.read()
        self.assertEqual([item["number"] for item in stored["archived"]], [2])
        self.assertEqual([item["number"] for item in stored["active"]], [9, 1, 3])
        restored = stored["active"][-2:]
        self.assertTrue(all("archived_at" not in item and "snapshot" not in item for item in restored))
        self.assertTrue(all(item.get("restored_at") for item in restored))
        self.assertEqual(result["bulk"], {
            "action": "restore",
            "count": 2,
            "ids": ["owner/repo/issues/3", "owner/repo/issues/1"],
        })
        self.assertEqual(self.write_calls, 1)
        self.assertEqual(self.checker_calls, 1)

    def test_bulk_delete_removes_only_selected_archives_once(self):
        self.seed()
        result = api.bulk_archived_watch_urls({
            "action": "delete",
            "ids": ["owner/repo/issues/2", "owner/repo/issues/3"],
        })
        stored = self.read()
        self.assertEqual([item["number"] for item in stored["archived"]], [1])
        self.assertEqual([item["number"] for item in stored["active"]], [9])
        self.assertEqual(result["bulk"]["count"], 2)
        self.assertEqual(self.write_calls, 1)
        self.assertEqual(self.checker_calls, 1)

    def test_missing_id_fails_closed_without_write_or_partial_mutation(self):
        original = self.seed()
        with self.assertRaises(HTTPException) as raised:
            api.bulk_archived_watch_urls({
                "action": "delete",
                "ids": ["owner/repo/issues/1", "owner/repo/issues/404"],
            })
        self.assertEqual(raised.exception.status_code, 404)
        self.assertEqual(self.read(), original)
        self.assertEqual(self.write_calls, 0)
        self.assertEqual(self.checker_calls, 0)

    def test_rejects_empty_duplicate_or_unknown_actions(self):
        self.seed()
        bad_payloads = [
            {"action": "restore", "ids": []},
            {"action": "restore", "ids": ["owner/repo/issues/1", "OWNER/REPO/ISSUES/1"]},
            {"action": "archive", "ids": ["owner/repo/issues/1"]},
        ]
        for payload in bad_payloads:
            with self.subTest(payload=payload), self.assertRaises(HTTPException) as raised:
                api.bulk_archived_watch_urls(payload)
            self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(self.write_calls, 0)
        self.assertEqual(self.checker_calls, 0)


if __name__ == "__main__":
    unittest.main()
