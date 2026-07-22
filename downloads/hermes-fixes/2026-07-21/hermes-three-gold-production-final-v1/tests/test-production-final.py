#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import stat
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / "PRODUCTION-MANIFEST.json").read_text())


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class ProductionFinalContractTests(unittest.TestCase):
    def test_manifest_pins_three_authorities_and_exact_commit(self):
        self.assertEqual(MANIFEST["release"], "HERMES-THREE-GOLD-PRODUCTION-FINAL-V1")
        self.assertEqual(MANIFEST["source_commit"], "5d7e5a88af37a87e68285b97b5ee98ed0fec7de2")
        self.assertEqual(MANIFEST["components"]["briefs_ai"]["version"], "V34")
        self.assertEqual(MANIFEST["components"]["briefs_stocks"]["version"], "V34")
        self.assertEqual(MANIFEST["components"]["git_watch"]["version"], "Revision 52")

    def test_all_required_package_surfaces_exist(self):
        required = [
            "CHECKSUMS.sha256", "1_READ_FIRST.md", "2_VERIFY_PACKAGE.command",
            "3_READ_ONLY_AUDIT.command", "4_CANDIDATE_INSTALL.command",
            "5_INSTALL_PRODUCTION.command", "6_VERIFY_INSTALLED.command",
            "7_ROLLBACK_BACKUP.command", "scripts/three-gold-production-manager.sh",
            "payload/briefs/server/patch_briefs_api.py",
            "payload/briefs/server/briefs_api_block.pyfrag",
            "payload/gold-masters/briefs-ai-v34/CHECKSUMS.sha256",
            "payload/gold-masters/briefs-stocks-v34/CHECKSUMS.sha256",
            "payload/gold-masters/git-watch-r52/RELEASE-MANIFEST.json",
        ]
        for rel in required:
            self.assertTrue((ROOT / rel).is_file(), rel)

    def test_checksum_ledger_has_exact_package_coverage(self):
        entries = {}
        for line in (ROOT / "CHECKSUMS.sha256").read_text().splitlines():
            digest, rel = line.split("  ", 1)
            self.assertNotIn(rel, entries)
            entries[rel] = digest
        actual = {
            p.relative_to(ROOT).as_posix()
            for p in ROOT.rglob("*")
            if p.is_file() and p != ROOT / "CHECKSUMS.sha256" and "__pycache__" not in p.parts
        }
        self.assertEqual(set(entries), actual)
        for rel, expected in entries.items():
            self.assertEqual(sha(ROOT / rel), expected, rel)

    def test_source_union_is_exact_twenty_file_byte_ledger(self):
        ledger = MANIFEST["briefs_source_union"]["files"]
        self.assertEqual(MANIFEST["briefs_source_union"]["file_count"], 20)
        self.assertEqual(len(ledger), 20)
        for rel, expected in ledger.items():
            self.assertEqual(sha(ROOT / rel), expected, rel)

    def test_pinned_git_watch_payload_hashes_match(self):
        for rel, expected in MANIFEST["components"]["git_watch"]["frozen_payload_sha256"].items():
            self.assertEqual(sha(ROOT / rel), expected, rel)

    def test_briefs_backend_fragment_is_pinned(self):
        backend = MANIFEST["briefs_backend"]
        self.assertEqual(sha(ROOT / backend["fragment"]), backend["fragment_sha256"])
        self.assertTrue(MANIFEST["runtime_contract"]["web_server_backup_restore"])

    def test_executable_modes_are_preserved(self):
        executables = [
            "2_VERIFY_PACKAGE.command", "3_READ_ONLY_AUDIT.command",
            "4_CANDIDATE_INSTALL.command", "5_INSTALL_PRODUCTION.command",
            "6_VERIFY_INSTALLED.command", "7_ROLLBACK_BACKUP.command",
            "scripts/three-gold-production-manager.sh",
            "payload/briefs/server/patch_briefs_api.py",
            "payload/git-watch/scripts/github-comments-checker-v27-review.sh",
        ]
        for rel in executables:
            self.assertTrue(os.stat(ROOT / rel).st_mode & stat.S_IXUSR, rel)

    def test_runtime_manager_has_no_temporary_or_download_package_dependency(self):
        manager = (ROOT / "scripts/three-gold-production-manager.sh").read_text().lower()
        for forbidden in ["/tmp/", "/root/remote-", "_briefs-dashboard-v3-preview", "/downloads/"]:
            self.assertNotIn(forbidden, manager)
        self.assertFalse(MANIFEST["state_contract"]["downloads_dependency"])
        self.assertFalse(MANIFEST["state_contract"]["package_path_dependency"])

    def test_launch_ownership_and_relocatable_rollback_are_contractual(self):
        manager = (ROOT / "scripts/three-gold-production-manager.sh").read_text()
        for marker in [
            "LAUNCH_ROOT_OWNED_BY_OTHER_PROFILE",
            "UNOWNED_LAUNCH_DATA_CONFLICTS_WITH_PROFILE_DATA",
            "BACKUP-METADATA.json",
            '--backup "$DIR"',
            "BACKUP_ROOT_MUST_NOT_BE_SYMLINK",
            "install_dashboard_dist",
            "DEPLOYED_DASHBOARD_DIFFERS_FROM_BUILD",
            "THREE_GOLD_NPM",
        ]:
            self.assertIn(marker, manager)
        self.assertTrue(MANIFEST["runtime_contract"]["launch_root_owner_guard"])
        self.assertTrue(MANIFEST["runtime_contract"]["relocatable_backup_launcher"])

    def test_stocks_filename_contracts_remain_surface_owned(self):
        materializer = (ROOT / "payload/briefs/materializer/brief_materializer.py").read_text()
        dashboard = (ROOT / "payload/briefs/dashboard/src/lib/briefs.ts").read_text()
        self.assertIn('stem = "AI Morning Brief" if mode == "ai" else "Stock Brief"', materializer)
        self.assertIn("`Stock Portfolio - ${date}.csv`", dashboard)


if __name__ == "__main__":
    unittest.main(verbosity=2)
