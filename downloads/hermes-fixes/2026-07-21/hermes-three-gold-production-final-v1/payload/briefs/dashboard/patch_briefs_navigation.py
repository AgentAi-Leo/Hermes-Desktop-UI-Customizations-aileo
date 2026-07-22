#!/usr/bin/env python3
"""Fail-closed migration for Briefs query/hash preservation in App.tsx."""
from __future__ import annotations

import argparse
import hashlib
import os
import stat
import tempfile
from pathlib import Path

# Whole-file predecessors audited before mutation.
KNOWN_DATA_DRIVEN_PREDECESSOR_SHA256 = {
    # User's customized Mac production source (2026-07-22).
    "e4fe900bb6df0bd25db9cd3d07e7b76eb2ce795786ecfbce84a0c8beb933aa6e",
    # Current upstream source used for complete-tree compatibility rehearsal.
    "ccccbb3f3d1ae54c54c303b994b052bc66926ace2204bfb12a4c360f550694db",
}

DESTRUCTURE = "  const { path, label, labelKey, icon: Icon } = item;"
DESTINATION_BLOCK = '''  const location = useLocation();
  const briefDestination =
    path === "/briefs-ai" || path === "/brief-stock"
      ? { pathname: path, search: location.search, hash: location.hash }
      : path;'''
OLD_DESTINATION = "to={path}"
NEW_DESTINATION = "to={briefDestination}"


def digest_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def migrate_predecessor(text: str) -> str:
    insertion = DESTRUCTURE + "\n" + DESTINATION_BLOCK
    if text.count(DESTRUCTURE) != 1 or text.count(OLD_DESTINATION) != 1:
        raise ValueError("PINNED_BRIEFS_NAVIGATION_STRUCTURE_MISMATCH")
    migrated = text.replace(DESTRUCTURE, insertion, 1).replace(
        OLD_DESTINATION,
        NEW_DESTINATION,
        1,
    )
    if (
        migrated.count(insertion) != 1
        or migrated.count(NEW_DESTINATION) != 1
        or migrated.count(OLD_DESTINATION) != 0
    ):
        raise ValueError("BRIEFS_NAVIGATION_POSTCONDITION_FAILED")
    return migrated


def reconstruct_predecessor(text: str) -> str | None:
    insertion = DESTRUCTURE + "\n" + DESTINATION_BLOCK
    if (
        text.count(insertion) != 1
        or text.count(NEW_DESTINATION) != 1
        or text.count(OLD_DESTINATION) != 0
    ):
        return None
    predecessor = text.replace(insertion, DESTRUCTURE, 1).replace(
        NEW_DESTINATION,
        OLD_DESTINATION,
        1,
    )
    try:
        round_trip = migrate_predecessor(predecessor)
    except ValueError:
        return None
    return predecessor if round_trip == text else None


def patch_text(
    text: str,
    allowed_predecessor_sha256=None,
    source_sha256: str | None = None,
):
    allowed = (
        KNOWN_DATA_DRIVEN_PREDECESSOR_SHA256
        if allowed_predecessor_sha256 is None
        else set(allowed_predecessor_sha256)
    )
    predecessor_sha256 = source_sha256 or digest_bytes(text.encode("utf-8"))
    if predecessor_sha256 in allowed:
        return migrate_predecessor(text), "MIGRATED_DATA_DRIVEN_NAVIGATION"

    predecessor = reconstruct_predecessor(text)
    if predecessor is not None and digest_bytes(predecessor.encode("utf-8")) in allowed:
        return text, "ALREADY_COMPLIANT"
    raise ValueError("UNKNOWN_BRIEFS_NAVIGATION_SOURCE")


def atomic_write(path: Path, content: bytes) -> None:
    mode = stat.S_IMODE(path.stat().st_mode)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent))
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def patch_file(path: Path, mode: str, allowed_predecessor_sha256=None) -> str:
    original_bytes = path.read_bytes()
    original = original_bytes.decode("utf-8")
    migrated, state = patch_text(
        original,
        allowed_predecessor_sha256,
        source_sha256=digest_bytes(original_bytes),
    )
    if mode == "verify":
        if state != "ALREADY_COMPLIANT":
            raise ValueError("BRIEFS_NAVIGATION_MIGRATION_REQUIRED")
        return state
    if mode != "apply":
        raise ValueError("INVALID_MODE")
    if migrated != original:
        atomic_write(path, migrated.encode("utf-8"))
    return state


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("target", type=Path)
    parser.add_argument("mode", choices=("apply", "verify"))
    args = parser.parse_args()
    try:
        state = patch_file(args.target, args.mode)
    except (OSError, UnicodeError, ValueError) as exc:
        print(str(exc))
        return 1
    print(f"BRIEFS_NAVIGATION={state}")
    print("BRIEFS_NAVIGATION_CONTRACT=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
