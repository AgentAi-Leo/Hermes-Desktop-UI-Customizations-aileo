#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATCHER = ROOT / "payload/briefs/server/patch_briefs_api.py"
FRAGMENT = ROOT / "payload/briefs/server/briefs_api_block.pyfrag"
LEGACY = ROOT / "payload/briefs/server/legacy_briefs_api_block.pyfrag"

BASE = """from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import os
class DummyApp:
    def get(self, path): return lambda fn: fn
app = DummyApp()
class HTTPException(Exception): pass
class FileResponse: pass
def get_hermes_home(): return Path.home() / '.hermes'
@app.get(\"/api/files\")
async def list_files(): return {}
"""


class BriefsApiPatcherTests(unittest.TestCase):
    def run_patcher(self, mode: str, target: Path):
        return subprocess.run(
            [sys.executable, str(PATCHER), mode, str(target), str(FRAGMENT)],
            text=True, capture_output=True,
        )

    def test_active_hermes_archive_precedes_user_home_fallback(self):
        with tempfile.TemporaryDirectory() as td:
            base = Path(td)
            target = base / "web_server.py"
            target.write_text(BASE)
            result = self.run_patcher("apply", target)
            self.assertEqual(result.returncode, 0, result.stderr)
            spec = importlib.util.spec_from_file_location("candidate_web_server", target)
            module = importlib.util.module_from_spec(spec)
            sys.modules[spec.name] = module
            spec.loader.exec_module(module)
            active = base / "active-hermes"
            module.get_hermes_home = lambda: active / "profiles" / "local-ai-assist1"
            roots = module._brief_roots(module._BRIEF_ARCHIVES["ai"])
            self.assertEqual(roots[0], active / "zDownloads" / "__AI-DAILY-BRIEFS")
            self.assertNotEqual(roots[0], Path.home() / ".hermes" / "zDownloads" / "__AI-DAILY-BRIEFS")

    def test_apply_then_verify_and_idempotence(self):
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / "web_server.py"
            target.write_text(BASE)
            first = self.run_patcher("apply", target)
            self.assertEqual(first.returncode, 0, first.stderr)
            self.assertIn("BRIEFS_API=INSERTED", first.stdout)
            installed = target.read_bytes()
            second = self.run_patcher("apply", target)
            self.assertEqual(second.returncode, 0, second.stderr)
            self.assertEqual(target.read_bytes(), installed)
            verified = self.run_patcher("verify", target)
            self.assertEqual(verified.returncode, 0, verified.stderr)

    def test_verify_rejects_missing_contract(self):
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / "web_server.py"
            target.write_text(BASE)
            result = self.run_patcher("verify", target)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("BRIEFS_API_MISSING", result.stderr)

    def test_exact_pinned_legacy_contract_migrates_and_is_idempotent(self):
        legacy = LEGACY.read_text()
        self.assertEqual(len(legacy.encode()), 4967)
        self.assertEqual(
            __import__("hashlib").sha256(legacy.encode()).hexdigest(),
            "090a843fa8dcf650847d4d6782fd22b3608e3e8f88127e1a1022b0c03e99f1e0",
        )
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / "web_server.py"
            target.write_text(BASE.replace('@app.get("/api/files")', legacy.rstrip("\n") + '\n\n@app.get("/api/files")'))
            before = target.read_bytes()
            verify_legacy = self.run_patcher("verify", target)
            self.assertNotEqual(verify_legacy.returncode, 0)
            self.assertIn("BRIEFS_API_LEGACY_REQUIRES_MIGRATION", verify_legacy.stderr)
            self.assertEqual(target.read_bytes(), before)
            migrated = self.run_patcher("apply", target)
            self.assertEqual(migrated.returncode, 0, migrated.stderr)
            self.assertIn("BRIEFS_API=MIGRATED_FROM_PINNED_LEGACY", migrated.stdout)
            installed = target.read_bytes()
            self.assertNotEqual(installed, before)
            verified = self.run_patcher("verify", target)
            self.assertEqual(verified.returncode, 0, verified.stderr)
            repeated = self.run_patcher("apply", target)
            self.assertEqual(repeated.returncode, 0, repeated.stderr)
            self.assertEqual(target.read_bytes(), installed)

    def test_drifted_legacy_contract_fails_without_mutation(self):
        legacy = LEGACY.read_text().replace("AI Morning Briefs", "AI Morning Briefs drifted", 1)
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / "web_server.py"
            target.write_text(BASE.replace('@app.get("/api/files")', legacy.rstrip("\n") + '\n\n@app.get("/api/files")'))
            before = target.read_bytes()
            result = self.run_patcher("apply", target)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("PARTIAL_BRIEFS_API", result.stderr)
            self.assertEqual(target.read_bytes(), before)

    def test_partial_contract_fails_without_mutation(self):
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / "web_server.py"
            target.write_text('@app.get("/api/briefs/{kind}")\n' + BASE)
            before = target.read_bytes()
            result = self.run_patcher("apply", target)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("PARTIAL_BRIEFS_API", result.stderr)
            self.assertEqual(target.read_bytes(), before)

    def test_ambiguous_anchor_fails_without_mutation(self):
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / "web_server.py"
            target.write_text(BASE + '\n@app.get("/api/files")\nasync def other(): return {}\n')
            before = target.read_bytes()
            result = self.run_patcher("apply", target)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("AMBIGUOUS_FILES_ROUTE_ANCHOR", result.stderr)
            self.assertEqual(target.read_bytes(), before)


if __name__ == "__main__":
    unittest.main(verbosity=2)
