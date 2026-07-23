#!/usr/bin/env python3
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
PATCHER = ROOT / "payload/briefs/dashboard/patch_briefs_dashboard_api.py"
PRED = ROOT / "payload/briefs/dashboard/dashboard_api.production-b987.ts"
CURRENT = ROOT / "payload/briefs/dashboard/dashboard_api.production-f15.ts"
HARD = ROOT / "payload/briefs/dashboard/dashboard_api.hardened-generated-at.ts"

class DashboardApiPatcherTests(unittest.TestCase):
    def run_patcher(self, target, mode):
        return subprocess.run([sys.executable, str(PATCHER), str(target), mode], text=True, capture_output=True)

    def test_exact_predecessor_migrates_and_verifies(self):
        with tempfile.TemporaryDirectory(dir="/root") as d:
            target=Path(d)/"api.ts"; target.write_bytes(PRED.read_bytes())
            result=self.run_patcher(target,"apply")
            self.assertEqual(result.returncode,0,result.stdout+result.stderr)
            self.assertEqual(target.read_bytes(),HARD.read_bytes())
            text = target.read_text(encoding="utf-8")
            for required in ("export interface BriefEntry", "briefs:", "export interface SessionImportResponse", "importSessions:"):
                self.assertIn(required, text)
            self.assertEqual(self.run_patcher(target,"verify").returncode,0)

    def test_exact_current_predecessor_preserves_newer_contracts(self):
        with tempfile.TemporaryDirectory(dir="/root") as d:
            target=Path(d)/"api.ts"; target.write_bytes(CURRENT.read_bytes())
            result=self.run_patcher(target,"apply")
            self.assertEqual(result.returncode,0,result.stdout+result.stderr)
            self.assertIn("MIGRATED_FROM_PINNED_CURRENT_PRODUCTION", result.stdout)
            self.assertEqual(target.read_bytes(),HARD.read_bytes())
            text = target.read_text(encoding="utf-8")
            for required in (
                "importSessions:",
                "export interface SessionImportResponse",
                "authMcpServer:",
                "auth_flows?:",
                "platform_label:",
                "reasoning_effort?:",
                "reference_max_tokens?:",
                "fanout?:",
                "listBriefs:",
                "export interface BriefEntry",
            ):
                self.assertIn(required, text)
            self.assertEqual(self.run_patcher(target,"verify").returncode,0)

    def test_hardened_apply_is_idempotent(self):
        with tempfile.TemporaryDirectory(dir="/root") as d:
            target=Path(d)/"api.ts"; target.write_bytes(HARD.read_bytes()); before=target.read_bytes()
            result=self.run_patcher(target,"apply")
            self.assertEqual(result.returncode,0,result.stdout+result.stderr)
            self.assertEqual(target.read_bytes(),before)

    def test_unknown_source_fails_closed(self):
        with tempfile.TemporaryDirectory(dir="/root") as d:
            target=Path(d)/"api.ts"; target.write_bytes(b"unknown\n"); before=target.read_bytes()
            result=self.run_patcher(target,"apply")
            self.assertNotEqual(result.returncode,0)
            self.assertIn("UNKNOWN_BRIEFS_DASHBOARD_API_SOURCE",result.stderr)
            self.assertEqual(target.read_bytes(),before)

    def test_crlf_variant_fails_closed(self):
        with tempfile.TemporaryDirectory(dir="/root") as d:
            target=Path(d)/"api.ts"; target.write_bytes(PRED.read_bytes().replace(b"\n",b"\r\n")); before=target.read_bytes()
            result=self.run_patcher(target,"apply")
            self.assertNotEqual(result.returncode,0)
            self.assertEqual(target.read_bytes(),before)

    def test_replace_failure_preserves_original_and_cleans_temp(self):
        spec=importlib.util.spec_from_file_location("dashboard_api_patcher",PATCHER)
        module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory(dir="/root") as d:
            target=Path(d)/"api.ts"; target.write_bytes(PRED.read_bytes()); before=target.read_bytes()
            with mock.patch.object(module.os,"replace",side_effect=OSError("injected")):
                with self.assertRaises(OSError): module.atomic_write(target,HARD.read_bytes())
            self.assertEqual(target.read_bytes(),before)
            self.assertEqual(list(Path(d).glob(".api.ts.*")),[])

if __name__ == "__main__": unittest.main(verbosity=2)
