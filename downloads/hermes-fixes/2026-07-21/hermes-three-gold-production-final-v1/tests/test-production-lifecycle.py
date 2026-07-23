#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANAGER_REL = Path("scripts/three-gold-production-manager.sh")
PROFILE = "local-ai-assist1"


def digest_tree(path: Path) -> str | None:
    if not path.exists() and not path.is_symlink():
        return None
    h = hashlib.sha256()
    if path.is_symlink():
        h.update(b"L\0" + os.readlink(path).encode())
        return h.hexdigest()
    if path.is_file():
        h.update(b"F\0" + path.read_bytes())
        return h.hexdigest()
    for item in sorted(path.rglob("*")):
        rel = item.relative_to(path).as_posix().encode()
        if item.is_symlink():
            h.update(b"L\0" + rel + b"\0" + os.readlink(item).encode())
        elif item.is_file():
            h.update(b"F\0" + rel + b"\0" + item.read_bytes())
        elif item.is_dir():
            h.update(b"D\0" + rel + b"\0")
    return h.hexdigest()


class ProductionLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(dir="/root")
        self.base = Path(self.tmp.name)
        self.package = self.base / "package"
        shutil.copytree(ROOT, self.package)
        self.home = self.base / "hermes-home"
        self.agent = self.base / "agent"
        self.profile = self.home / "profiles" / PROFILE
        self.web = self.agent / "web"
        self.server = self.agent / "hermes_cli/web_server.py"
        for path in [
            self.web / "src/lib",
            self.web / "src/pages",
            self.agent / "hermes_cli/web_dist",
            self.home / "zDownloads/__AI-DAILY-BRIEFS",
            self.home / "zDownloads/_STOCK-BRIEFS",
            self.profile / "scripts",
        ]:
            path.mkdir(parents=True, exist_ok=True)
        (self.web / "package.json").write_text('{"scripts":{}}\n')
        (self.web / "src/lib/briefs.ts").write_text("OLD_BRIEFS\n")
        (self.web / "src/lib/briefs.test.ts").write_text("OLD_BRIEFS_TEST\n")
        (self.web / "src/pages/BriefsPage.tsx").write_text("OLD_BRIEFS_PAGE\n")
        shutil.copyfile(
            self.package / "tests/fixtures/App.data-driven-upstream.tsx",
            self.web / "src/App.tsx",
        )
        shutil.copyfile(
            self.package / "payload/briefs/dashboard/dashboard_api.production-b987.ts",
            self.web / "src/lib/api.ts",
        )
        (self.agent / "hermes_cli/web_dist/index.html").write_text("OLD_DIST\n")
        self.original_web_server = (
            "from dataclasses import dataclass\n"
            "from datetime import datetime\n"
            "from pathlib import Path\n"
            "from typing import Any, Dict, List, Optional\n"
            "import os\n"
            "class DummyApp:\n"
            "    def get(self, path): return lambda fn: fn\n"
            "app = DummyApp()\n"
            "class HTTPException(Exception): pass\n"
            "class FileResponse: pass\n"
            "def get_hermes_home(): return Path.home() / '.hermes'\n"
            "@app.get('/unrelated')\n"
            "async def unrelated(): return {}\n"
            "@app.get(\"/api/files\")\n"
            "async def list_files(): return {}\n"
        )
        self.server.write_text(self.original_web_server)
        self.profile_plugin = self.profile / "plugins/git-comments-v27-review"
        self.launch_plugin = self.home / "plugins/git-comments-v27-review"
        for plugin in [self.profile_plugin, self.launch_plugin]:
            (plugin / "dashboard/dist").mkdir(parents=True, exist_ok=True)
            (plugin / "dashboard/dist/index.js").write_text("OLD_GIT_RUNTIME\n")
            (plugin / "dashboard/plugin_api.py").write_text("OLD_API\n")
            (plugin / "dashboard/manifest.json").write_text('{"old":true}\n')
            (plugin / "dashboard/data").mkdir()
            (plugin / "dashboard/data/watchlist.json").write_text(
                json.dumps({"schema_version": 1, "active": [{"repo": "kept/state"}], "archived": []}) + "\n"
            )
        self.config = self.profile / "config.yaml"
        self.config.parent.mkdir(parents=True, exist_ok=True)
        self.original_config = "plugins:\n  enabled:\n    - unrelated-plugin\n  disabled:\n    - git-comments-v27-review\ncustom: preserved\n"
        self.config.write_text(self.original_config)
        self.original = self.capture_original()

    def tearDown(self):
        self.tmp.cleanup()

    def capture_original(self):
        return {
            "source": (self.web / "src/lib/briefs.ts").read_bytes(),
            "test": (self.web / "src/lib/briefs.test.ts").read_bytes(),
            "page": (self.web / "src/pages/BriefsPage.tsx").read_bytes(),
            "app": (self.web / "src/App.tsx").read_bytes(),
            "dashboard_api": (self.web / "src/lib/api.ts").read_bytes(),
            "server": self.server.read_bytes(),
            "dist": digest_tree(self.agent / "hermes_cli/web_dist"),
            "profile_plugin": digest_tree(self.profile_plugin),
            "launch_plugin": digest_tree(self.launch_plugin),
            "config": self.config.read_bytes(),
        }

    def assert_original_restored(self):
        self.assertEqual((self.web / "src/lib/briefs.ts").read_bytes(), self.original["source"])
        self.assertEqual((self.web / "src/lib/briefs.test.ts").read_bytes(), self.original["test"])
        self.assertEqual((self.web / "src/pages/BriefsPage.tsx").read_bytes(), self.original["page"])
        self.assertEqual((self.web / "src/App.tsx").read_bytes(), self.original["app"])
        self.assertEqual((self.web / "src/lib/api.ts").read_bytes(), self.original["dashboard_api"])
        self.assertEqual(self.server.read_bytes(), self.original["server"])
        self.assertEqual(digest_tree(self.agent / "hermes_cli/web_dist"), self.original["dist"])
        self.assertEqual(digest_tree(self.profile_plugin), self.original["profile_plugin"])
        self.assertEqual(digest_tree(self.launch_plugin), self.original["launch_plugin"])
        self.assertEqual(self.config.read_bytes(), self.original["config"])

    def python_executable(self):
        return os.environ.get("THREE_GOLD_TEST_PYTHON", sys.executable)

    def parse_yaml(self, path: Path):
        code = "import json,sys,yaml; print(json.dumps(yaml.safe_load(open(sys.argv[1]))))"
        return json.loads(subprocess.check_output([self.python_executable(), "-c", code, str(path)], text=True))

    def env(self, **extra):
        python = self.python_executable()
        env = os.environ.copy()
        env.update({
            "THREE_GOLD_HERMES_HOME": str(self.home),
            "THREE_GOLD_AGENT_ROOT": str(self.agent),
            "THREE_GOLD_PYTHON": python,
            "THREE_GOLD_SKIP_BUILD": "1",
        })
        env.update(extra)
        return env

    def run_manager(self, *args, env=None):
        return subprocess.run(
            ["bash", str(self.package / MANAGER_REL), *args],
            text=True, capture_output=True, env=env or self.env(), cwd=self.package,
        )

    def install(self, **env_extra):
        result = self.run_manager("candidate-install", "--profile", PROFILE, "--yes", env=self.env(**env_extra))
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return result

    def fake_npm(self):
        bindir = self.base / "fake-bin"
        bindir.mkdir(exist_ok=True)
        npm = bindir / "npm"
        npm.write_text(
            "#!/usr/bin/env bash\nset -euo pipefail\n"
            "if [[ \"$*\" == \"run build\" ]]; then "
            "mkdir -p dist/assets; printf 'CANDIDATE BUILT DASHBOARD\\n' > dist/index.html; "
            "printf 'asset\\n' > dist/assets/app.js; fi\n"
        )
        npm.chmod(0o755)
        return str(npm)

    def latest_backup(self):
        backups = sorted((self.profile / "backups/hermes-three-gold-production-final-v1").iterdir())
        self.assertTrue(backups)
        return backups[-1]

    def refresh_package_ledger(self):
        ledger = self.package / "CHECKSUMS.sha256"
        files = sorted(path for path in self.package.rglob("*") if path.is_file() and path != ledger)
        ledger.write_text(
            "".join(
                f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(self.package).as_posix()}\n"
                for path in files
            )
        )

    def test_package_verification_rejects_unledgered_file(self):
        self.refresh_package_ledger()
        (self.package / "UNLEDGERED").write_text("unexpected\n")
        result = self.run_manager("package-verify")
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("CHECKSUM_UNLEDGERED_FILE=UNLEDGERED", result.stdout + result.stderr)
        self.assertNotIn("THREE_GOLD_PACKAGE_VERIFICATION=PASS", result.stdout)

    def test_package_verification_accepts_canonicalized_ledger_path(self):
        self.refresh_package_ledger()
        private_root = self.base / "private-var"
        private_root.mkdir()
        physical_package = private_root / "package"
        shutil.move(str(self.package), physical_package)
        alias_root = self.base / "var"
        alias_root.symlink_to(private_root, target_is_directory=True)
        self.package = alias_root / "package"
        self.manager = self.package / "scripts/three-gold-production-manager.sh"
        result = self.run_manager("package-verify")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("THREE_GOLD_PACKAGE_VERIFICATION=PASS", result.stdout)

    def test_package_verification_is_repeatable_and_read_only(self):
        self.refresh_package_ledger()
        before = digest_tree(self.package)
        first = self.run_manager("package-verify")
        second = self.run_manager("package-verify")
        self.assertEqual(first.returncode, 0, first.stdout + first.stderr)
        self.assertEqual(second.returncode, 0, second.stdout + second.stderr)
        self.assertEqual(digest_tree(self.package), before)

    def test_read_only_audit_fails_when_required_source_is_missing(self):
        self.refresh_package_ledger()
        (self.web / "src/lib/briefs.ts").unlink()
        result = self.run_manager("audit")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("AUDIT_REQUIRED_SOURCE_PREREQUISITES=FAILED", result.stdout)
        self.assertNotIn("THREE_GOLD_READ_ONLY_AUDIT=PASS", result.stdout)

    def test_read_only_audit_fails_when_archives_are_missing(self):
        self.refresh_package_ledger()
        result = self.run_manager(
            "audit",
            env=self.env(
                THREE_GOLD_HERMES_HOME=str(self.base / "missing-hermes-home"),
                THREE_GOLD_AGENT_ROOT=str(self.base / "missing-agent"),
            ),
        )
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("AUDIT_ARCHIVE_PREREQUISITES=FAILED", result.stdout)
        self.assertNotIn("THREE_GOLD_READ_ONLY_AUDIT=PASS", result.stdout)

    def test_built_dashboard_is_promoted_and_rollback_restores_previous_dist(self):
        self.install(THREE_GOLD_SKIP_BUILD="0", THREE_GOLD_NPM=self.fake_npm(), THREE_GOLD_BUILD_DIST=str(self.web / "dist"))
        deployed = self.agent / "hermes_cli/web_dist"
        self.assertEqual((deployed / "index.html").read_text(), "CANDIDATE BUILT DASHBOARD\n")
        self.assertEqual(digest_tree(deployed), digest_tree(self.web / "dist"))
        backup = self.latest_backup()
        result = subprocess.run(["bash", str(backup / "RESTORE_THIS_BACKUP.command")], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assert_original_restored()

    def test_install_preserves_state_and_enables_complete_system(self):
        self.install()
        watch = json.loads((self.profile_plugin / "dashboard/data/watchlist.json").read_text())
        self.assertEqual(watch["active"][0]["repo"], "kept/state")
        self.assertTrue((self.launch_plugin / "dashboard/data").is_symlink())
        owner = json.loads((self.launch_plugin / ".three-gold-owner.json").read_text())
        self.assertEqual(owner["profile"], PROFILE)
        config = self.parse_yaml(self.config)
        self.assertEqual(config["custom"], "preserved")
        self.assertIn("unrelated-plugin", config["plugins"]["enabled"])
        self.assertIn("git-comments-v27-review", config["plugins"]["enabled"])
        self.assertNotIn("git-comments-v27-review", config["plugins"]["disabled"])
        self.assertIn('@app.get("/api/briefs/{kind}")', self.server.read_text())
        self.assertIn('pathname: path, search: location.search, hash: location.hash', (self.web / "src/App.tsx").read_text())
        self.assertEqual(
            (self.web / "src/lib/api.ts").read_bytes(),
            (self.package / "payload/briefs/dashboard/dashboard_api.hardened-generated-at.ts").read_bytes(),
        )
        self.assertTrue((self.profile / "production-systems/HERMES-THREE-GOLD-PRODUCTION-FINAL-V1/receipt.json").is_file())

    def test_retired_duplicate_plugin_ids_are_removed_and_rollback_restores_config(self):
        original_config = (
            "plugins:\n"
            "  enabled:\n"
            "    - unrelated-plugin\n"
            "    - brief-stock\n"
            "    - briefs-ai\n"
            "    - git-comments\n"
            "  disabled:\n"
            "    - git-comments-v27-review\n"
            "custom: preserved\n"
        )
        self.config.write_text(original_config)
        self.original = self.capture_original()

        self.install()
        config = self.parse_yaml(self.config)
        self.assertEqual(
            config["plugins"]["enabled"],
            ["unrelated-plugin", "git-comments-v27-review"],
        )
        for retired in ("brief-stock", "briefs-ai", "git-comments"):
            self.assertNotIn(retired, config["plugins"]["enabled"])
        self.assertNotIn("git-comments-v27-review", config["plugins"]["disabled"])

        backup = self.latest_backup()
        rollback = subprocess.run(
            ["bash", str(backup / "RESTORE_THIS_BACKUP.command")],
            text=True,
            capture_output=True,
        )
        self.assertEqual(rollback.returncode, 0, rollback.stdout + rollback.stderr)
        self.assertEqual(self.config.read_text(), original_config)
        self.assert_original_restored()

    def test_exact_host_legacy_api_migrates_and_rollback_restores_legacy_bytes(self):
        legacy = (self.package / "payload/briefs/server/legacy_briefs_api_block.pyfrag").read_text()
        anchor = '@app.get("/api/files")'
        self.server.write_text(
            self.original_web_server.replace(anchor, legacy.rstrip("\n") + "\n\n" + anchor)
        )
        self.original = self.capture_original()
        legacy_bytes = self.server.read_bytes()
        result = self.install()
        self.assertIn("BRIEFS_API=MIGRATED_FROM_PINNED_LEGACY", result.stdout)
        installed = self.server.read_text()
        self.assertIn("retained_dates = set(sorted(selected, reverse=True)[:5])", installed)
        self.assertIn("candidate.parent == directory", installed)
        backup = self.latest_backup()
        rollback = subprocess.run(
            ["bash", str(backup / "RESTORE_THIS_BACKUP.command")],
            text=True,
            capture_output=True,
        )
        self.assertEqual(rollback.returncode, 0, rollback.stdout + rollback.stderr)
        self.assertEqual(self.server.read_bytes(), legacy_bytes)
        self.assert_original_restored()

    def test_install_verification_is_read_only_for_python_sources(self):
        self.refresh_package_ledger()
        self.install()
        self.assertFalse((self.agent / "hermes_cli" / "__pycache__").exists())

    def test_repeat_install_is_idempotent_and_preserves_watchlist(self):
        self.install()
        watch = self.profile_plugin / "dashboard/data/watchlist.json"
        before = watch.read_bytes()
        self.install()
        self.assertEqual(watch.read_bytes(), before)

    def test_corrupt_backup_fails_automatic_rollback_without_deleting_destination(self):
        self.refresh_package_ledger()
        result = self.run_manager(
            "candidate-install", "--profile", PROFILE, "--yes",
            env=self.env(
                THREE_GOLD_INJECT_FAILURE_AFTER_RUNTIME="1",
                THREE_GOLD_INJECT_CORRUPT_BACKUP_LABEL="dashboard-briefs-source",
            ),
        )
        self.assertEqual(result.returncode, 98, result.stdout + result.stderr)
        self.assertIn("THREE_GOLD_AUTOMATIC_ROLLBACK=FAIL", result.stderr)
        self.assertNotIn("THREE_GOLD_AUTOMATIC_ROLLBACK=PASS", result.stderr)
        self.assertEqual(
            (self.web / "src/lib/briefs.ts").read_bytes(),
            (self.package / "payload/briefs/dashboard/src/lib/briefs.ts").read_bytes(),
        )

    def test_injected_failure_restores_every_original(self):
        self.refresh_package_ledger()
        result = self.run_manager(
            "candidate-install", "--profile", PROFILE, "--yes",
            env=self.env(THREE_GOLD_INJECT_FAILURE_AFTER_RUNTIME="1"),
        )
        self.assertEqual(result.returncode, 97, result.stdout + result.stderr)
        self.assertIn("THREE_GOLD_AUTOMATIC_ROLLBACK=PASS", result.stderr)
        self.assert_original_restored()
        self.assertFalse((self.agent / "hermes_cli" / "__pycache__").exists())

    def test_unknown_app_source_fails_closed_and_restores_every_original(self):
        (self.web / "src/App.tsx").write_text(
            '<NavLink to={path}>unknown customized navigation</NavLink>\n'
        )
        self.original = self.capture_original()
        result = self.run_manager(
            "candidate-install", "--profile", PROFILE, "--yes",
            env=self.env(),
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("UNKNOWN_BRIEFS_NAVIGATION_SOURCE", result.stdout + result.stderr)
        self.assertIn("THREE_GOLD_AUTOMATIC_ROLLBACK=PASS", result.stderr)
        self.assert_original_restored()

    def test_unknown_dashboard_api_source_fails_closed_and_restores_every_original(self):
        (self.web / "src/lib/api.ts").write_text("export interface BriefEntry { unknown: true }\n")
        self.original = self.capture_original()
        result = self.run_manager(
            "candidate-install", "--profile", PROFILE, "--yes",
            env=self.env(),
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("UNKNOWN_BRIEFS_DASHBOARD_API_SOURCE", result.stderr)
        self.assertIn("THREE_GOLD_AUTOMATIC_ROLLBACK=PASS", result.stderr)
        self.assert_original_restored()

    def test_relocated_backup_launcher_restores_original(self):
        self.install()
        backup = self.latest_backup()
        relocated = self.base / "relocated-backup"
        shutil.move(str(backup), relocated)
        result = subprocess.run(["bash", str(relocated / "RESTORE_THIS_BACKUP.command")], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assert_original_restored()

    def test_other_profile_launch_owner_fails_before_mutation(self):
        (self.launch_plugin / ".three-gold-owner.json").write_text(json.dumps({"profile": "other-profile"}))
        before = self.capture_original()
        result = self.run_manager("candidate-install", "--profile", PROFILE, "--yes")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("LAUNCH_ROOT_OWNED_BY_OTHER_PROFILE", result.stderr)
        self.assertEqual(self.capture_original(), before)

    def test_conflicting_unowned_launch_data_fails_before_mutation(self):
        (self.launch_plugin / "dashboard/data/watchlist.json").write_text(
            json.dumps({"schema_version": 1, "active": [{"repo": "other/state"}], "archived": []}) + "\n"
        )
        before = self.capture_original()
        result = self.run_manager("candidate-install", "--profile", PROFILE, "--yes")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("UNOWNED_LAUNCH_DATA_CONFLICTS_WITH_PROFILE_DATA", result.stderr)
        self.assertEqual(self.capture_original(), before)

    def test_launch_root_management_can_be_disabled(self):
        launch_before = digest_tree(self.launch_plugin)
        self.install(THREE_GOLD_MANAGE_LAUNCH_ROOT="0")
        self.assertEqual(digest_tree(self.launch_plugin), launch_before)
        self.assertTrue((self.profile_plugin / "dashboard/dist/index.js").is_file())

    def test_symlinked_backup_root_fails_before_mutation(self):
        backup_parent = self.profile / "backups"
        backup_parent.mkdir(parents=True, exist_ok=True)
        outside = self.base / "outside-backups"
        outside.mkdir()
        (backup_parent / "hermes-three-gold-production-final-v1").symlink_to(outside, target_is_directory=True)
        before = self.capture_original()
        result = self.run_manager("candidate-install", "--profile", PROFILE, "--yes")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("BACKUP_ROOT_MUST_NOT_BE_SYMLINK", result.stderr)
        self.assertEqual(self.capture_original(), before)


if __name__ == "__main__":
    unittest.main(verbosity=2)
