#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
PATCHER_PATH = ROOT / "payload/briefs/dashboard/patch_briefs_navigation.py"
PINNED_APP_FIXTURE = ROOT / "tests/fixtures/App.data-driven-upstream.tsx"
PINNED_APP_SHA256 = "ccccbb3f3d1ae54c54c303b994b052bc66926ace2204bfb12a4c360f550694db"

MODERN_PREDECESSOR = '''import { NavLink, useLocation } from "react-router-dom";
function SidebarNavLink({ item }: any) {
  const { path, label, labelKey, icon: Icon } = item;
  return (
    <NavLink
      to={path}
      end={path === "/sessions"}
    >
      {label}
    </NavLink>
  );
}
'''


def load_patcher():
    spec = importlib.util.spec_from_file_location("briefs_navigation_patcher", PATCHER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load patcher")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class BriefsNavigationPatcherTests(unittest.TestCase):
    def test_real_pinned_predecessor_bytes_migrate_and_round_trip_verify(self):
        patcher = load_patcher()
        predecessor_bytes = PINNED_APP_FIXTURE.read_bytes()
        self.assertEqual(hashlib.sha256(predecessor_bytes).hexdigest(), PINNED_APP_SHA256)
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / "App.tsx"
            target.write_bytes(predecessor_bytes)
            self.assertEqual(
                patcher.patch_file(target, "apply"),
                "MIGRATED_DATA_DRIVEN_NAVIGATION",
            )
            installed = target.read_bytes()
            self.assertNotEqual(installed, predecessor_bytes)
            self.assertEqual(patcher.patch_file(target, "verify"), "ALREADY_COMPLIANT")
            self.assertEqual(target.read_bytes(), installed)

    def test_exact_audited_data_driven_predecessor_migrates_and_is_idempotent(self):
        patcher = load_patcher()
        predecessor_sha = hashlib.sha256(MODERN_PREDECESSOR.encode()).hexdigest()
        migrated, state = patcher.patch_text(
            MODERN_PREDECESSOR,
            allowed_predecessor_sha256={predecessor_sha},
        )
        self.assertEqual(state, "MIGRATED_DATA_DRIVEN_NAVIGATION")
        self.assertIn('const location = useLocation();', migrated)
        self.assertIn('path === "/briefs-ai" || path === "/brief-stock"', migrated)
        self.assertIn('pathname: path, search: location.search, hash: location.hash', migrated)
        self.assertIn('to={briefDestination}', migrated)
        repeated, repeated_state = patcher.patch_text(
            migrated,
            allowed_predecessor_sha256={predecessor_sha},
        )
        self.assertEqual(repeated_state, "ALREADY_COMPLIANT")
        self.assertEqual(repeated, migrated)

    def test_unknown_noncompliant_source_fails_closed(self):
        patcher = load_patcher()
        edited = MODERN_PREDECESSOR.replace("{label}", "{label}!")
        with self.assertRaisesRegex(ValueError, "UNKNOWN_BRIEFS_NAVIGATION_SOURCE"):
            patcher.patch_text(edited)

    def test_inline_comment_and_string_literal_decoys_fail_closed(self):
        patcher = load_patcher()
        marker = 'to={{ pathname: "/briefs-ai", search: location.search, hash: location.hash }}'
        for decoy in (
            MODERN_PREDECESSOR + f"// {marker}\n",
            MODERN_PREDECESSOR + f"const decoy = '{marker}';\n",
        ):
            with self.subTest(decoy=decoy[-80:]):
                with self.assertRaisesRegex(ValueError, "UNKNOWN_BRIEFS_NAVIGATION_SOURCE"):
                    patcher.patch_text(decoy)

    def test_data_driven_comment_and_string_literal_decoys_fail_closed(self):
        patcher = load_patcher()
        insertion = patcher.DESTRUCTURE + "\n" + patcher.DESTINATION_BLOCK
        for wrapper in ("/*{}*/", "const decoy = `{}`;"):
            decoy = MODERN_PREDECESSOR + wrapper.format(
                insertion + "\n" + patcher.NEW_DESTINATION
            ) + "\n"
            with self.subTest(wrapper=wrapper):
                with self.assertRaisesRegex(ValueError, "UNKNOWN_BRIEFS_NAVIGATION_SOURCE"):
                    patcher.patch_text(decoy)

    def test_apply_and_verify_are_atomic_and_fail_closed(self):
        patcher = load_patcher()
        predecessor_sha = hashlib.sha256(MODERN_PREDECESSOR.encode()).hexdigest()
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / "App.tsx"
            target.write_text(MODERN_PREDECESSOR)
            state = patcher.patch_file(target, "apply", {predecessor_sha})
            self.assertEqual(state, "MIGRATED_DATA_DRIVEN_NAVIGATION")
            installed = target.read_bytes()
            self.assertEqual(
                patcher.patch_file(target, "verify", {predecessor_sha}),
                "ALREADY_COMPLIANT",
            )
            self.assertEqual(target.read_bytes(), installed)

    def test_crlf_byte_variant_of_approved_lf_source_is_rejected_unchanged(self):
        patcher = load_patcher()
        approved_sha = hashlib.sha256(MODERN_PREDECESSOR.encode()).hexdigest()
        crlf_bytes = MODERN_PREDECESSOR.replace("\n", "\r\n").encode()
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / "App.tsx"
            target.write_bytes(crlf_bytes)
            with self.assertRaisesRegex(ValueError, "UNKNOWN_BRIEFS_NAVIGATION_SOURCE"):
                patcher.patch_file(target, "apply", {approved_sha})
            self.assertEqual(target.read_bytes(), crlf_bytes)
            self.assertEqual(list(target.parent.iterdir()), [target])

    def test_replace_failure_preserves_original_bytes_and_removes_temporary_file(self):
        patcher = load_patcher()
        original_bytes = MODERN_PREDECESSOR.encode()
        predecessor_sha = hashlib.sha256(original_bytes).hexdigest()
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / "App.tsx"
            target.write_bytes(original_bytes)
            with mock.patch.object(patcher.os, "replace", side_effect=OSError("injected")):
                with self.assertRaisesRegex(OSError, "injected"):
                    patcher.patch_file(target, "apply", {predecessor_sha})
            self.assertEqual(target.read_bytes(), original_bytes)
            self.assertEqual(list(target.parent.iterdir()), [target])


if __name__ == "__main__":
    unittest.main(verbosity=2)
