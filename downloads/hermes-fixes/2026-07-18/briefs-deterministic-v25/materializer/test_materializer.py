import copy
import json
import os
import sqlite3
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch
from zoneinfo import ZoneInfo

import brief_materializer as materializer
from brief_renderer import ContractError, render_ai, render_stock

ROOT = Path(__file__).resolve().parent
LA = ZoneInfo("America/Los_Angeles")


def fixture(name):
    return json.loads((ROOT / "fixtures" / name).read_text())


class MaterializerTests(unittest.TestCase):
    def test_json_marker_is_exact_and_old_html_markers_are_ignored(self):
        payload = fixture("ai-valid.json")
        body = "<<<HERMES_BRIEF_AI_JSON>>>\n" + json.dumps(payload) + "\n<<<END_HERMES_BRIEF_AI_JSON>>>"
        started = datetime(2026, 7, 18, 8, tzinfo=LA).timestamp()
        self.assertEqual(materializer.parse_json_payload("ai", body, started), payload)
        with self.assertRaises(ContractError):
            materializer.parse_json_payload("ai", "<<<HERMES_BRIEF_AI_HTML>>>x<<<END_HERMES_BRIEF_AI_HTML>>>", started)
        with self.assertRaisesRegex(ContractError, "exactly one"):
            materializer.parse_json_payload("ai", body + body, started)

    def test_cron_session_date_mismatch_fails_closed(self):
        payload = fixture("stock-valid.json")
        body = "<<<HERMES_BRIEF_STOCK_JSON>>>" + json.dumps(payload) + "<<<END_HERMES_BRIEF_STOCK_JSON>>>"
        started = datetime(2026, 7, 17, 14, tzinfo=LA).timestamp()
        with self.assertRaisesRegex(ContractError, "does not match"):
            materializer.parse_json_payload("stock", body, started)

    def test_stock_publishes_exact_artifacts_and_csv_bytes(self):
        rendered = render_stock(fixture("stock-valid.json"))
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            result = materializer.publish_rendered("stock", rendered, root)
            target = root / rendered.date
            csv_path = target / f"Stock Brief - {rendered.date}.csv"
            self.assertEqual(csv_path.read_bytes(), rendered.csv.encode())
            self.assertTrue((target / f"Stock Brief - {rendered.date}.html").is_file())
            self.assertEqual(set(result["sha256"]), {"html", "markdown", "csv"})
            self.assertFalse(any(path.name.startswith(".brief-stage") for path in root.iterdir()))

    def test_ai_publishes_only_html_and_markdown(self):
        rendered = render_ai(fixture("ai-valid.json"))
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            materializer.publish_rendered("ai", rendered, root)
            files = sorted(path.name for path in (root / rendered.date).iterdir())
            self.assertEqual(files, [f"AI Morning Brief - {rendered.date}.html", f"AI Morning Brief - {rendered.date}.md"])

    def test_invalid_render_never_replaces_last_valid(self):
        valid = render_stock(fixture("stock-valid.json"))
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            materializer.publish_rendered("stock", valid, root)
            target = root / valid.date
            before = {path.name: path.read_bytes() for path in target.iterdir()}
            broken = copy.copy(valid)
            object.__setattr__(broken, "csv", "changed,contract\n")
            with self.assertRaisesRegex(ContractError, "CSV contract changed"):
                materializer.publish_rendered("stock", broken, root)
            after = {path.name: path.read_bytes() for path in target.iterdir()}
            self.assertEqual(after, before)

    def test_swap_failure_restores_last_valid_directory(self):
        original = render_ai(fixture("ai-valid.json"))
        changed_payload = fixture("ai-valid.json")
        changed_payload["topics"][0]["headline"] = "Changed only after safe swap"
        changed = render_ai(changed_payload)
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            materializer.publish_rendered("ai", original, root)
            target_file = root / original.date / f"AI Morning Brief - {original.date}.html"
            before = target_file.read_bytes()
            real_replace = os.replace
            calls = {"count": 0}
            def fail_second(source, destination):
                calls["count"] += 1
                if calls["count"] == 2:
                    raise OSError("simulated stage swap failure")
                return real_replace(source, destination)
            with patch.object(materializer.os, "replace", side_effect=fail_second):
                with self.assertRaisesRegex(OSError, "simulated"):
                    materializer.publish_rendered("ai", changed, root)
            self.assertEqual(target_file.read_bytes(), before)

    def test_newest_payload_reads_only_json_marker_for_requested_job(self):
        with tempfile.TemporaryDirectory() as temp:
            home = Path(temp)
            db = sqlite3.connect(home / "state.db")
            db.executescript("CREATE TABLE sessions(id TEXT, started_at REAL, source TEXT); CREATE TABLE messages(id INTEGER, session_id TEXT, role TEXT, active INTEGER, content TEXT);")
            started = datetime(2026, 7, 18, 8, tzinfo=LA).timestamp()
            db.execute("INSERT INTO sessions VALUES (?,?,?)", (f"cron_{materializer.AI_JOB}_fixture", started, "cron"))
            db.execute("INSERT INTO messages VALUES (?,?,?,?,?)", (1, f"cron_{materializer.AI_JOB}_fixture", "assistant", 1, "<<<HERMES_BRIEF_AI_HTML>>>old<<<END_HERMES_BRIEF_AI_HTML>>>"))
            payload = fixture("ai-valid.json")
            content = "<<<HERMES_BRIEF_AI_JSON>>>" + json.dumps(payload) + "<<<END_HERMES_BRIEF_AI_JSON>>>"
            db.execute("INSERT INTO messages VALUES (?,?,?,?,?)", (2, f"cron_{materializer.AI_JOB}_fixture", "assistant", 1, content))
            db.commit(); db.close()
            with patch.dict(os.environ, {"HERMES_HOME": str(home)}):
                found = materializer.newest_payload("ai")
            self.assertEqual(found[0], f"cron_{materializer.AI_JOB}_fixture")
            self.assertEqual(found[2], content)


if __name__ == "__main__":
    unittest.main()
