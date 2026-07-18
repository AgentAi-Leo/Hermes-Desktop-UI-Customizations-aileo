import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "migration", Path(__file__).with_name("briefs_host_root_migration.py")
)
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)


class MigrationTests(unittest.TestCase):
    def make_archive(self, root: Path, mode: str, dates: list[str]) -> None:
        root.mkdir(parents=True)
        for day in dates:
            target = root / day
            target.mkdir()
            for name in migration.expected_files(mode, day):
                (target / name).write_text(f"{mode} {day} {name}\n", encoding="utf-8")

    def test_apply_converts_links_retains_five_and_rollback_restores(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            home = base / "home"
            zdownloads = home / ".hermes" / "zDownloads"
            zdownloads.mkdir(parents=True)
            targets = base / "targets"
            dates = [f"2026-07-{day:02d}" for day in range(10, 19)]
            for mode, stream in migration.STREAMS.items():
                source = targets / mode
                self.make_archive(source, mode, dates)
                (zdownloads / stream["directory"]).symlink_to(source)
            profile = home / ".hermes" / "profiles" / "local-ai-assist1"
            scripts = profile / "scripts"
            scripts.mkdir(parents=True)
            (scripts / "brief_materializer.py").write_text("VALUE = 'before'\n", encoding="utf-8")
            package = base / "package"
            (package / "materializer").mkdir(parents=True)
            (package / "materializer" / "brief_materializer.py").write_text("VALUE = 'after'\n", encoding="utf-8")
            repo = base / "repo"
            (repo / "hermes_cli").mkdir(parents=True)
            (repo / "hermes_cli" / "__init__.py").write_text("", encoding="utf-8")
            (repo / "hermes_cli" / "env_loader.py").write_text(
                "import sys\n_APPLIED_HOMES: set[str] = set()\n"
                "def status():\n    print('hello', file=sys.stderr)\n",
                encoding="utf-8",
            )
            backup = base / "backup"
            manifest = migration.apply(home, repo, profile, package, backup)
            self.assertEqual(manifest["version"], 22)
            for mode, stream in migration.STREAMS.items():
                root = zdownloads / stream["directory"]
                self.assertTrue(root.is_dir())
                self.assertFalse(root.is_symlink())
                self.assertEqual(migration.valid_dates(mode, root), sorted(dates, reverse=True)[:5])
                self.assertTrue((targets / mode).is_dir())
            env_text = (repo / "hermes_cli" / "env_loader.py").read_text(encoding="utf-8")
            self.assertIn("class _SafeStatusStream:", env_text)
            self.assertNotIn("file=sys.stderr", env_text)
            migration.rollback(backup)
            for mode, stream in migration.STREAMS.items():
                alias = zdownloads / stream["directory"]
                self.assertTrue(alias.is_symlink())
                self.assertEqual(alias.resolve(), (targets / mode).resolve())
            self.assertIn("file=sys.stderr", (repo / "hermes_cli" / "env_loader.py").read_text(encoding="utf-8"))

    def test_audit_reports_resolved_targets_and_hashes(self):
        with tempfile.TemporaryDirectory() as temp:
            home = Path(temp) / "home"
            zdownloads = home / ".hermes" / "zDownloads"
            zdownloads.mkdir(parents=True)
            for mode, stream in migration.STREAMS.items():
                source = Path(temp) / mode
                self.make_archive(source, mode, ["2026-07-18"])
                (zdownloads / stream["directory"]).symlink_to(source)
            result = migration.audit(home)
            self.assertTrue(result["ai"]["is_symlink"])
            self.assertEqual(result["stock"]["fingerprint"]["dates"], ["2026-07-18"])
            self.assertTrue(result["ai"]["fingerprint"]["files"])


if __name__ == "__main__":
    unittest.main()
