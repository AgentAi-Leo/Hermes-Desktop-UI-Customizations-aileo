#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys
import tempfile

LEDGER = "CHECKSUMS.sha256"
LINE = re.compile(r"^([0-9a-f]{64})  (.+)$")


def read_ledger(root: Path) -> set[str]:
    ledger = root / LEDGER
    if not ledger.is_file() or ledger.is_symlink():
        raise AssertionError("checksum ledger must be one regular non-symlink file")
    listed: set[str] = set()
    for number, raw in enumerate(ledger.read_text(encoding="utf-8").splitlines(), 1):
        match = LINE.fullmatch(raw)
        if not match:
            raise AssertionError(f"invalid ledger line {number}")
        relative = match.group(2)
        pure = PurePosixPath(relative)
        if pure.is_absolute() or ".." in pure.parts or relative in {"", "."} or "\\" in relative:
            raise AssertionError(f"unsafe ledger path: {relative}")
        if relative == LEDGER or relative in listed:
            raise AssertionError(f"duplicate/reserved ledger path: {relative}")
        listed.add(relative)
    return listed


def inventory(root: Path) -> tuple[set[str], set[str], set[str], set[str]]:
    regular: set[str] = set()
    directories: set[str] = set()
    symlinks: set[str] = set()
    special: set[str] = set()

    def walk(directory: Path) -> None:
        for entry in os.scandir(directory):
            path = Path(entry.path)
            relative = path.relative_to(root).as_posix()
            mode = entry.stat(follow_symlinks=False).st_mode
            if stat.S_ISLNK(mode):
                symlinks.add(relative)
            elif stat.S_ISDIR(mode):
                directories.add(relative)
                walk(path)
            elif stat.S_ISREG(mode):
                regular.add(relative)
            else:
                special.add(relative)

    walk(root)
    return regular, directories, symlinks, special


def verify(root: Path) -> None:
    root = root.resolve()
    listed = read_ledger(root)
    regular, directories, symlinks, special = inventory(root)
    if symlinks:
        raise AssertionError({"symlinks": sorted(symlinks)})
    if special:
        raise AssertionError({"special": sorted(special)})
    if LEDGER not in regular:
        raise AssertionError("checksum ledger missing from regular-file inventory")
    actual = regular - {LEDGER}
    if listed != actual:
        raise AssertionError({"unlisted": sorted(actual - listed), "missing": sorted(listed - actual)})
    expected_directories: set[str] = set()
    for relative in listed:
        parent = PurePosixPath(relative).parent
        while str(parent) != ".":
            expected_directories.add(parent.as_posix())
            parent = parent.parent
    if directories != expected_directories:
        raise AssertionError({
            "unexpected_or_empty_directories": sorted(directories - expected_directories),
            "missing_directories": sorted(expected_directories - directories),
        })


def write_fixture_ledger(root: Path) -> None:
    payload = root / "payload" / "file.txt"
    payload.parent.mkdir(parents=True)
    payload.write_text("fixture\n", encoding="utf-8")
    digest = hashlib.sha256(payload.read_bytes()).hexdigest()
    (root / LEDGER).write_text(f"{digest}  payload/file.txt\n", encoding="utf-8")


def self_test() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        write_fixture_ledger(root)
        verify(root)
        empty = root / "empty"
        empty.mkdir()
        try:
            verify(root)
            raise AssertionError("empty directory was accepted")
        except AssertionError as error:
            if str(error) == "empty directory was accepted":
                raise
        empty.rmdir()
        broken = root / "broken-link"
        broken.symlink_to("missing-target")
        try:
            verify(root)
            raise AssertionError("broken symlink was accepted")
        except AssertionError as error:
            if str(error) == "broken symlink was accepted":
                raise
        broken.unlink()
        linked = root / "linked-file"
        linked.symlink_to("payload/file.txt")
        try:
            verify(root)
            raise AssertionError("valid symlink was accepted")
        except AssertionError as error:
            if str(error) == "valid symlink was accepted":
                raise
        linked.unlink()
        fifo = root / "special-fifo"
        os.mkfifo(fifo)
        try:
            verify(root)
            raise AssertionError("special entry was accepted")
        except AssertionError as error:
            if str(error) == "special entry was accepted":
                raise
        fifo.unlink()
    print("GIT_WATCH_R63_FILESYSTEM_SURFACE_SELF_TEST=PASS")


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--self-test":
        self_test()
    elif len(sys.argv) == 2:
        verify(Path(sys.argv[1]))
        print("GIT_WATCH_R63_FILESYSTEM_SURFACE=PASS")
    else:
        raise SystemExit(f"usage: {sys.argv[0]} PACKAGE_DIR | --self-test")
