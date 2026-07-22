#!/usr/bin/env python3
"""Fail-closed whole-file migration for the dashboard BriefEntry API contract."""
from __future__ import annotations
import hashlib
import os
from pathlib import Path
import stat
import sys
import tempfile

PREDECESSOR_SHA = "b9870bc1ef79cc0cad6e0ef40f1cb6f4b21af22711229fe4e1635e073dd469d2"
HARDENED_SHA = "b5ed1687d0692342e105384821e8e078977c3492c080c1ab273080986fcb6022"
HERE = Path(__file__).resolve().parent
PREDECESSOR = HERE / "dashboard_api.production-b987.ts"
HARDENED = HERE / "dashboard_api.hardened-generated-at.ts"

def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def authorities() -> tuple[bytes, bytes]:
    predecessor = PREDECESSOR.read_bytes()
    hardened = HARDENED.read_bytes()
    if digest(predecessor) != PREDECESSOR_SHA:
        raise SystemExit("PINNED_DASHBOARD_API_PREDECESSOR_MISMATCH")
    if digest(hardened) != HARDENED_SHA:
        raise SystemExit("PINNED_DASHBOARD_API_HARDENED_MISMATCH")
    return predecessor, hardened

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
    predecessor, hardened = authorities()
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
    elif actual_sha == PREDECESSOR_SHA and actual == predecessor:
        atomic_write(target, hardened)
        if target.read_bytes() != hardened:
            print("BRIEFS_DASHBOARD_API_POST_WRITE_MISMATCH", file=sys.stderr)
            return 1
        print("BRIEFS_DASHBOARD_API=MIGRATED_FROM_PINNED_PRODUCTION")
    else:
        print("UNKNOWN_BRIEFS_DASHBOARD_API_SOURCE", file=sys.stderr)
        return 1
    print("BRIEFS_DASHBOARD_API_CONTRACT=PASS")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
