#!/usr/bin/env python3
"""Backup-first migration from Docker-backed Brief symlinks to real Mac roots."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import py_compile
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

STREAMS = {
    "ai": {
        "directory": "__AI-DAILY-BRIEFS",
        "stem": "AI Morning Brief",
        "extensions": ("html", "md"),
    },
    "stock": {
        "directory": "_STOCK-BRIEFS",
        "stem": "Stock Brief",
        "extensions": ("html", "md", "csv"),
    },
}
DATE_PATTERN = "20??-??-??"


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def expected_files(mode: str, day: str) -> list[str]:
    spec = STREAMS[mode]
    return [f"{spec['stem']} - {day}.{ext}" for ext in spec["extensions"]]


def valid_dates(mode: str, root: Path) -> list[str]:
    dates: list[str] = []
    if not root.is_dir():
        return dates
    for candidate in root.glob(DATE_PATTERN):
        if not candidate.is_dir() or len(candidate.name) != 10:
            continue
        files = [candidate / name for name in expected_files(mode, candidate.name)]
        if all(path.is_file() and path.stat().st_size > 0 for path in files):
            dates.append(candidate.name)
    return sorted(set(dates), reverse=True)[:5]


def root_fingerprint(mode: str, root: Path) -> dict:
    dates = valid_dates(mode, root)
    files = {}
    for day in dates:
        for name in expected_files(mode, day):
            path = root / day / name
            files[str(path.relative_to(root))] = {
                "bytes": path.stat().st_size,
                "sha256": digest(path),
            }
    return {"dates": dates, "files": files}


def copy_valid_archive(mode: str, source: Path, stage: Path) -> dict:
    before = root_fingerprint(mode, source)
    if not before["dates"]:
        raise RuntimeError(f"{mode}: no valid dated Brief artifacts in {source}")
    stage.mkdir(parents=True, exist_ok=True)
    if any(stage.iterdir()):
        raise RuntimeError(f"{mode}: staging directory is not empty: {stage}")
    for day in before["dates"]:
        source_day = source / day
        stage_day = stage / day
        stage_day.mkdir()
        for name in expected_files(mode, day):
            shutil.copy2(source_day / name, stage_day / name)
    after = root_fingerprint(mode, stage)
    if before != after:
        raise RuntimeError(f"{mode}: staged archive fingerprint mismatch")
    return before


def audit(home: Path) -> dict:
    zdownloads = home / ".hermes" / "zDownloads"
    result = {}
    for mode, spec in STREAMS.items():
        alias = zdownloads / spec["directory"]
        is_link = alias.is_symlink()
        exists = alias.exists()
        source = alias.resolve(strict=True) if exists or is_link else None
        result[mode] = {
            "path": str(alias),
            "exists": exists,
            "is_symlink": is_link,
            "link_text": os.readlink(alias) if is_link else None,
            "resolved": str(source) if source else None,
            "fingerprint": root_fingerprint(mode, source) if source and source.is_dir() else {"dates": [], "files": {}},
        }
    return result


def patch_env_loader(repo: Path, backup: Path) -> dict:
    """Validate and preserve the already-installed safe status-print repair."""
    source = repo / "hermes_cli" / "env_loader.py"
    if not source.is_file():
        raise FileNotFoundError(f"Hermes env loader missing: {source}")
    backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, backup)
    text = source.read_text(encoding="utf-8")
    if text.count("def _safe_status_print(message: str) -> None:") != 1:
        raise RuntimeError("env_loader.py does not contain the expected safe-status helper exactly once")
    if text.count("except (BrokenPipeError, OSError):") < 1:
        raise RuntimeError("env_loader.py safe-status helper does not catch closed-pipe errors")
    # One direct stderr print is expected inside the helper itself. Every
    # cosmetic caller must route through _safe_status_print instead.
    if text.count("file=sys.stderr") != 1:
        raise RuntimeError("env_loader.py contains an unexpected direct stderr status write")
    safe_calls = text.count("_safe_status_print(")
    if safe_calls < 7:
        raise RuntimeError("env_loader.py has incomplete safe-status call-site coverage")
    py_compile.compile(str(source), doraise=True)
    probe = r'''
import sys
from hermes_cli import env_loader
class ClosedPipe:
    def write(self, _text):
        raise BrokenPipeError(32, "Broken pipe")
    def flush(self):
        raise BrokenPipeError(32, "Broken pipe")
old = sys.stderr
try:
    sys.stderr = ClosedPipe()
    env_loader._safe_status_print("status probe")
finally:
    sys.stderr = old
print("CLOSED_STDERR_PROBE=PASS")
'''
    env = dict(os.environ)
    env["PYTHONPATH"] = str(repo)
    completed = subprocess.run(
        [sys.executable, "-c", probe],
        cwd=repo,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    if completed.returncode or "CLOSED_STDERR_PROBE=PASS" not in completed.stdout:
        raise RuntimeError(f"closed-stderr regression probe failed: {completed.stderr.strip()}")
    return {
        "path": str(source),
        "changed": False,
        "existing_safe_patch_preserved": True,
        "safe_call_occurrences": safe_calls,
        "sha256": digest(source),
        "closed_stderr_probe": "PASS",
    }


def apply(home: Path, repo: Path, profile_home: Path, package: Path, backup_root: Path) -> dict:
    zdownloads = home / ".hermes" / "zDownloads"
    zdownloads.mkdir(parents=True, exist_ok=True)
    scripts = profile_home / "scripts"
    materializer = scripts / "brief_materializer.py"
    packaged_materializer = package / "materializer" / "brief_materializer.py"
    if not materializer.is_file() or not packaged_materializer.is_file():
        raise FileNotFoundError("installed or packaged brief_materializer.py is missing")
    backup_root.mkdir(parents=True, exist_ok=False)
    shutil.copy2(materializer, backup_root / "brief_materializer.py.before")
    before = audit(home)
    (backup_root / "audit-before.json").write_text(json.dumps(before, indent=2, sort_keys=True) + "\n")
    completed_modes: list[str] = []
    try:
        for mode, spec in STREAMS.items():
            alias = zdownloads / spec["directory"]
            if not alias.is_symlink():
                raise RuntimeError(f"{alias} is not the expected legacy symlink; refusing ambiguous migration")
            source = alias.resolve(strict=True)
            if not source.is_dir():
                raise RuntimeError(f"{mode}: symlink target is not a directory: {source}")
            archive_backup = backup_root / f"{mode}-source-archive"
            shutil.copytree(source, archive_backup, symlinks=True)
            stage = Path(tempfile.mkdtemp(prefix=f".{spec['directory']}.v23-stage-", dir=zdownloads))
            try:
                fingerprint = copy_valid_archive(mode, source, stage)
                alias.unlink()
                os.replace(stage, alias)
            except Exception:
                if stage.exists():
                    shutil.rmtree(stage)
                if not alias.exists() and not alias.is_symlink():
                    alias.symlink_to(before[mode]["link_text"])
                raise
            if alias.is_symlink() or not alias.is_dir():
                raise RuntimeError(f"{mode}: migrated root is not a real directory")
            if root_fingerprint(mode, alias) != fingerprint:
                raise RuntimeError(f"{mode}: installed archive fingerprint mismatch")
            completed_modes.append(mode)
        shutil.copy2(packaged_materializer, materializer)
        py_compile.compile(str(materializer), doraise=True)
        env_result = patch_env_loader(repo, backup_root / "env_loader.py.before")
    except Exception:
        for mode in reversed(completed_modes):
            spec = STREAMS[mode]
            alias = zdownloads / spec["directory"]
            if alias.is_dir() and not alias.is_symlink():
                failed = backup_root / f"{mode}-failed-real-root"
                if failed.exists():
                    shutil.rmtree(failed)
                os.replace(alias, failed)
            alias.symlink_to(before[mode]["link_text"])
        if (backup_root / "brief_materializer.py.before").is_file():
            shutil.copy2(backup_root / "brief_materializer.py.before", materializer)
        env_backup = backup_root / "env_loader.py.before"
        if env_backup.is_file():
            shutil.copy2(env_backup, repo / "hermes_cli" / "env_loader.py")
        raise
    after = audit(home)
    manifest = {
        "version": 23,
        "created_at": datetime.now().astimezone().isoformat(),
        "home": str(home),
        "profile_home": str(profile_home),
        "repo": str(repo),
        "before": before,
        "after": after,
        "env_loader": env_result,
        "materializer_sha256": digest(materializer),
        "old_targets_retained": True,
    }
    (backup_root / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    shutil.copy2(__file__, backup_root / "briefs_host_root_migration.py")
    rollback = backup_root / "ROLLBACK_BRIEFS_HOST_ROOTS_V23.command"
    rollback.write_text(
        "#!/usr/bin/env bash\nset -euo pipefail\n"
        f'exec "{sys.executable}" "{backup_root / "briefs_host_root_migration.py"}" '
        f'--rollback --backup "{backup_root}"\n',
        encoding="utf-8",
    )
    rollback.chmod(0o755)
    return manifest


def rollback(backup_root: Path) -> None:
    manifest = json.loads((backup_root / "manifest.json").read_text(encoding="utf-8"))
    home = Path(manifest["home"])
    profile_home = Path(manifest["profile_home"])
    repo = Path(manifest["repo"])
    zdownloads = home / ".hermes" / "zDownloads"
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    for mode, spec in STREAMS.items():
        alias = zdownloads / spec["directory"]
        if alias.is_dir() and not alias.is_symlink():
            os.replace(alias, backup_root / f"{mode}-post-migration-{stamp}")
        elif alias.is_symlink():
            alias.unlink()
        alias.symlink_to(manifest["before"][mode]["link_text"])
    shutil.copy2(backup_root / "brief_materializer.py.before", profile_home / "scripts" / "brief_materializer.py")
    shutil.copy2(backup_root / "env_loader.py.before", repo / "hermes_cli" / "env_loader.py")
    print("ROLLBACK_BRIEFS_HOST_ROOTS_V23=PASS")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audit", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--rollback", action="store_true")
    parser.add_argument("--home", type=Path, default=Path.home())
    parser.add_argument("--repo", type=Path)
    parser.add_argument("--profile-home", type=Path)
    parser.add_argument("--package", type=Path)
    parser.add_argument("--backup", type=Path)
    args = parser.parse_args()
    if sum((args.audit, args.apply, args.rollback)) != 1:
        parser.error("choose exactly one of --audit, --apply, or --rollback")
    if args.audit:
        print(json.dumps(audit(args.home), indent=2, sort_keys=True))
        return 0
    if args.rollback:
        if not args.backup:
            parser.error("--rollback requires --backup")
        rollback(args.backup)
        return 0
    required = (args.repo, args.profile_home, args.package, args.backup)
    if any(value is None for value in required):
        parser.error("--apply requires --repo, --profile-home, --package, and --backup")
    manifest = apply(args.home, args.repo, args.profile_home, args.package, args.backup)
    print(json.dumps(manifest, indent=2, sort_keys=True))
    print("BRIEFS_HOST_ROOTS_V23_MIGRATION=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
