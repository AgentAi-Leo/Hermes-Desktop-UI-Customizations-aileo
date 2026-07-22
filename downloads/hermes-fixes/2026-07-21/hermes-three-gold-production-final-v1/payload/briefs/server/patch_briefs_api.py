#!/usr/bin/env python3
"""Idempotently install or verify the pinned Briefs API block in web_server.py."""
from __future__ import annotations

import hashlib
import os
import stat
import sys
import tempfile
from pathlib import Path

ROUTE_MARKERS = (
    '@app.get("/api/briefs/{kind}")',
    '@app.get("/api/briefs/{kind}/html/{date}")',
    '@app.get("/api/briefs/{kind}/markdown/{date}")',
)
CONTRACT_MARKERS = (
    "class BriefArchive:",
    "_BRIEF_ARCHIVES:",
    '"Content-Security-Policy"',
    "retained_dates = set(sorted(selected, reverse=True)[:5])",
    "candidate.parent == directory",
)
ANCHOR = '@app.get("/api/files")'
LEGACY_START = '@dataclass(frozen=True)\nclass BriefArchive:'
LEGACY_SHA256 = "090a843fa8dcf650847d4d6782fd22b3608e3e8f88127e1a1022b0c03e99f1e0"


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def contract_state(text: str) -> str:
    route_hits = [marker in text for marker in ROUTE_MARKERS]
    contract_hits = [marker in text for marker in CONTRACT_MARKERS]
    if all(route_hits) and all(contract_hits):
        if any(text.count(marker) != 1 for marker in ROUTE_MARKERS):
            fail("DUPLICATE_BRIEFS_API_ROUTE")
        return "complete"
    if any(route_hits) or any(contract_hits):
        return "partial"
    return "absent"


def exact_legacy_block(text: str):
    if text.count(LEGACY_START) != 1 or text.count(ANCHOR) != 1:
        return None
    start = text.index(LEGACY_START)
    end = text.index(ANCHOR, start)
    block = (text[start:end].rstrip("\n") + "\n").encode("utf-8")
    if hashlib.sha256(block).hexdigest() != LEGACY_SHA256:
        return None
    return start, end, block


def compile_or_fail(text: str, target: Path) -> None:
    try:
        compile(text, str(target), "exec")
    except SyntaxError as exc:
        fail(f"BRIEFS_API_PATCH_COMPILE_FAILED={exc}")


def atomic_replace(target: Path, text: str) -> None:
    mode = stat.S_IMODE(target.stat().st_mode)
    fd, temporary = tempfile.mkstemp(prefix=f".{target.name}.", dir=str(target.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, target)
        try:
            directory_fd = os.open(target.parent, os.O_DIRECTORY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
        except (AttributeError, OSError):
            pass
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main() -> None:
    if len(sys.argv) != 4 or sys.argv[1] not in {"apply", "verify"}:
        fail("Usage: patch_briefs_api.py apply|verify WEB_SERVER.py BLOCK.pyfrag")
    mode, target_arg, fragment_arg = sys.argv[1:]
    target = Path(target_arg)
    fragment_path = Path(fragment_arg)
    legacy_path = fragment_path.with_name("legacy_briefs_api_block.pyfrag")
    if not target.is_file():
        fail(f"WEB_SERVER_NOT_FOUND={target}")
    if not fragment_path.is_file():
        fail(f"BRIEFS_API_FRAGMENT_NOT_FOUND={fragment_path}")
    text = target.read_text(encoding="utf-8")
    state = contract_state(text)
    if state == "partial":
        legacy = exact_legacy_block(text)
        if legacy is None:
            fail("PARTIAL_BRIEFS_API")
        if not legacy_path.is_file() or legacy_path.read_bytes() != legacy[2]:
            fail("LEGACY_BRIEFS_API_AUTHORITY_MISMATCH")
        if mode == "verify":
            fail("BRIEFS_API_LEGACY_REQUIRES_MIGRATION")
        start, end, _ = legacy
        fragment = fragment_path.read_text(encoding="utf-8").strip("\n") + "\n\n"
        patched = text[:start] + fragment + text[end:]
        if contract_state(patched) != "complete":
            fail("BRIEFS_API_MIGRATION_CONTRACT_FAILED")
        compile_or_fail(patched, target)
        atomic_replace(target, patched)
        if target.read_text(encoding="utf-8") != patched:
            fail("BRIEFS_API_MIGRATION_READBACK_FAILED")
        print("BRIEFS_API=MIGRATED_FROM_PINNED_LEGACY")
        print("BRIEFS_API_CONTRACT=PASS")
        return
    if state == "complete":
        compile_or_fail(text, target)
        print("BRIEFS_API=ALREADY_PRESENT")
        print("BRIEFS_API_CONTRACT=PASS")
        return
    if mode == "verify":
        fail("BRIEFS_API_MISSING")
    if text.count(ANCHOR) != 1:
        fail("AMBIGUOUS_FILES_ROUTE_ANCHOR")
    fragment = fragment_path.read_text(encoding="utf-8").strip("\n") + "\n\n"
    patched = text.replace(ANCHOR, fragment + ANCHOR, 1)
    if contract_state(patched) != "complete":
        fail("BRIEFS_API_PATCH_CONTRACT_FAILED")
    compile_or_fail(patched, target)
    atomic_replace(target, patched)
    if target.read_text(encoding="utf-8") != patched:
        fail("BRIEFS_API_PATCH_READBACK_FAILED")
    print("BRIEFS_API=INSERTED")
    print("BRIEFS_API_CONTRACT=PASS")


if __name__ == "__main__":
    main()
