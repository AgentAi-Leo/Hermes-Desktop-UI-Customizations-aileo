#!/usr/bin/env python3
"""Fail-closed whole-file migration for the dashboard BriefEntry API contract."""
from __future__ import annotations
import hashlib
import os
from pathlib import Path
import stat
import sys
import tempfile

LEGACY_PREDECESSOR_SHA = "b9870bc1ef79cc0cad6e0ef40f1cb6f4b21af22711229fe4e1635e073dd469d2"
CURRENT_PREDECESSOR_SHA = "f15bcef7de2fb1397d8ad3978da637d970007b8ca33627d63109a4106412427e"
HARDENED_SHA = "cd2d7af4732554c2a7f5191a7f4294d3fbdef1ca506637168ddc8d8cd1410ce9"
HERE = Path(__file__).resolve().parent
LEGACY_PREDECESSOR = HERE / "dashboard_api.production-b987.ts"
CURRENT_PREDECESSOR = HERE / "dashboard_api.production-f15.ts"
HARDENED = HERE / "dashboard_api.hardened-generated-at.ts"

def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def authorities() -> tuple[bytes, bytes, bytes]:
    legacy_predecessor = LEGACY_PREDECESSOR.read_bytes()
    current_predecessor = CURRENT_PREDECESSOR.read_bytes()
    hardened = HARDENED.read_bytes()
    if digest(legacy_predecessor) != LEGACY_PREDECESSOR_SHA:
        raise SystemExit("PINNED_DASHBOARD_API_LEGACY_PREDECESSOR_MISMATCH")
    if digest(current_predecessor) != CURRENT_PREDECESSOR_SHA:
        raise SystemExit("PINNED_DASHBOARD_API_CURRENT_PREDECESSOR_MISMATCH")
    if digest(hardened) != HARDENED_SHA:
        raise SystemExit("PINNED_DASHBOARD_API_HARDENED_MISMATCH")
    return legacy_predecessor, current_predecessor, hardened

def atomic_write(path: Path, data: bytes) -> None:
    mode = stat.S_IMODE(path.stat().st_mode)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent))
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)

def main() -> int:
    if len(sys.argv) != 3 or sys.argv[2] not in {"apply", "verify"}:
        print(f"Usage: {sys.argv[0]} TARGET apply|verify", file=sys.stderr)
        return 2
    target = Path(sys.argv[1])
    legacy_predecessor, current_predecessor, hardened = authorities()
    actual = target.read_bytes()
    actual_sha = digest(actual)
    if sys.argv[2] == "verify":
        if actual_sha != HARDENED_SHA or actual != hardened:
            print("BRIEFS_DASHBOARD_API_CONTRACT=FAIL", file=sys.stderr)
            return 1
        print("BRIEFS_DASHBOARD_API_CONTRACT=PASS")
        return 0
    if actual_sha == HARDENED_SHA and actual == hardened:
        print("BRIEFS_DASHBOARD_API=ALREADY_PINNED_HARDENED")
    elif actual_sha == CURRENT_PREDECESSOR_SHA and actual == current_predecessor:
        atomic_write(target, hardened)
        if target.read_bytes() != hardened:
            print("BRIEFS_DASHBOARD_API_POST_WRITE_MISMATCH", file=sys.stderr)
            return 1
        print("BRIEFS_DASHBOARD_API=MIGRATED_FROM_PINNED_CURRENT_PRODUCTION")
    elif actual_sha == LEGACY_PREDECESSOR_SHA and actual == legacy_predecessor:
        atomic_write(target, hardened)
        if target.read_bytes() != hardened:
            print("BRIEFS_DASHBOARD_API_POST_WRITE_MISMATCH", file=sys.stderr)
            return 1
        print("BRIEFS_DASHBOARD_API=MIGRATED_FROM_PINNED_LEGACY_PRODUCTION")
    else:
        print("UNKNOWN_BRIEFS_DASHBOARD_API_SOURCE", file=sys.stderr)
        return 1
    print("BRIEFS_DASHBOARD_API_CONTRACT=PASS")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
