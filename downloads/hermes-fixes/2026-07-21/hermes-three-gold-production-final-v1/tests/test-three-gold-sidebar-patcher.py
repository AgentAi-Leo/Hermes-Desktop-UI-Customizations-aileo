#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import re
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
PATCHER_PATH = ROOT / "payload/briefs/dashboard/patch_three_gold_sidebar.py"
CURRENT = ROOT / "tests/fixtures/App.three-gold-current.tsx"
CURRENT_SHA256 = "34af200a6064e53b69044c7b003aba872668c87a86a0d4c87c66277cce08ca77"


def load_patcher():
    spec = importlib.util.spec_from_file_location("three_gold_sidebar_patcher", PATCHER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load sidebar patcher")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ThreeGoldSidebarPatcherTests(unittest.TestCase):
    def test_exact_current_production_migrates_to_custom_then_hermes(self):
        patcher = load_patcher()
        original = CURRENT.read_bytes()
        self.assertEqual(hashlib.sha256(original).hexdigest(), CURRENT_SHA256)
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / "App.tsx"
            target.write_bytes(original)
            self.assertEqual(
                patcher.patch_file(target, "apply"),
                "MIGRATED_THREE_GOLD_SIDEBAR",
            )
            installed = target.read_text(encoding="utf-8")
            self.assertIn("THREE_GOLD_CUSTOM_BUILTIN_PATHS", installed)
            self.assertIn("customItems", installed)
            self.assertIn("HERMES\n                </span>", installed)
            self.assertLess(
                installed.index('id="hermes-sidebar-custom-nav-heading"'),
                installed.index('id="hermes-sidebar-core-nav-heading"'),
            )
            self.assertEqual(
                patcher.patch_file(target, "verify"),
                "ALREADY_COMPLIANT",
            )

    def test_exact_upstream_rehearsal_after_first_stage_migrates(self):
        patcher = load_patcher()
        first_path = ROOT / "payload/briefs/dashboard/patch_briefs_navigation.py"
        spec = importlib.util.spec_from_file_location("first_stage_navigation", first_path)
        self.assertIsNotNone(spec)
        self.assertIsNotNone(spec.loader)
        first = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(first)
        upstream = (ROOT / "tests/fixtures/App.data-driven-upstream.tsx").read_text(
            encoding="utf-8"
        )
        first_stage, state = first.patch_text(upstream)
        self.assertEqual(state, "MIGRATED_DATA_DRIVEN_NAVIGATION")
        self.assertEqual(
            hashlib.sha256(first_stage.encode()).hexdigest(),
            "5fa15a6af9a5a47c9d75b030395e0f474fdd9d223a56add852eb9b5d32961836",
        )
        corrected, state = patcher.patch_text(first_stage)
        self.assertEqual(state, "MIGRATED_THREE_GOLD_SIDEBAR")
        self.assertIn("THREE_GOLD_RETIRED_PLUGIN_NAMES", corrected)

    def test_custom_section_is_constrained_to_exact_three_gold_entries(self):
        patcher = load_patcher()
        migrated, _ = patcher.patch_text(CURRENT.read_text(encoding="utf-8"))
        self.assertIn(
            "const customItems = builtIn.filter((item) =>\n"
            "    THREE_GOLD_CUSTOM_BUILTIN_PATHS.has(item.path),\n"
            "  );",
            migrated,
        )
        self.assertIn(
            "const gitWatchManifest = manifests.find(\n"
            "    (manifest) => manifest.name === THREE_GOLD_GIT_WATCH_PLUGIN_NAME,\n"
            "  );",
            migrated,
        )
        self.assertIn(
            "const gitWatchItems = gitWatchManifest\n"
            "    ? buildNavItems([], [gitWatchManifest])\n"
            "    : [];",
            migrated,
        )
        self.assertIn(
            "return { coreItems, customItems: [...customItems, ...gitWatchItems] };",
            migrated,
        )
        self.assertNotIn("otherPluginItems", migrated)
        self.assertNotIn("seenPluginPaths", migrated)

    def test_runtime_manifest_filter_fails_closed_behaviorally(self):
        patcher = load_patcher()
        migrated, _ = patcher.patch_text(CURRENT.read_text(encoding="utf-8"))
        start = migrated.index("const THREE_GOLD_RETIRED_PLUGIN_NAMES")
        end = migrated.index("const THREE_GOLD_CUSTOM_BUILTIN_PATHS", start)
        snippet = migrated[start:end]
        snippet = snippet.replace("manifests: PluginManifest[]", "manifests")
        snippet = snippet.replace("manifest: PluginManifest", "manifest")
        snippet = snippet.replace("value: unknown", "value")
        snippet = snippet.replace("): value is string", ")")
        snippet = snippet.replace("): PluginManifest[]", ")")
        snippet = snippet.replace("): boolean", ")")
        snippet = snippet.replace("new Map<string, PluginManifest>()", "new Map()")
        exercise = r'''
const tab = (path, extra = {}) => ({ path, hidden: false, ...extra });
const manifest = (name, path, extra = {}) => ({ name, label: name, icon: "Puzzle", tab: tab(path, extra) });
const good = manifest(THREE_GOLD_GIT_WATCH_PLUGIN_NAME, THREE_GOLD_GIT_WATCH_PATH);
const unrelated = manifest("unrelated-plugin", "/unrelated");
const retired = manifest("git-comments", "/git-comments");
const names = (items) => filterThreeGoldProductionManifests(items).map((item) => item.name);
const assertJson = (actual, expected, label) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: ${JSON.stringify(actual)}`);
  }
};
assertJson(names(null), [], "null-collection");
assertJson(names({}), [], "non-array-collection");
assertJson(names([retired, unrelated, good]), ["unrelated-plugin", THREE_GOLD_GIT_WATCH_PLUGIN_NAME], "valid");
assertJson(names([retired, unrelated]), ["unrelated-plugin"], "missing");
assertJson(names([unrelated, good, { ...good }]), ["unrelated-plugin"], "duplicate");
assertJson(names([unrelated, { ...good, tab: tab("/wrong") }]), ["unrelated-plugin"], "wrong-path");
assertJson(names([unrelated, { ...good, tab: tab(THREE_GOLD_GIT_WATCH_PATH, { hidden: true }) }]), ["unrelated-plugin"], "hidden");
assertJson(names([unrelated, { ...good, tab: tab(THREE_GOLD_GIT_WATCH_PATH, { override: "/chat" }) }]), ["unrelated-plugin"], "override");
assertJson(names([unrelated, { name: THREE_GOLD_GIT_WATCH_PLUGIN_NAME }]), ["unrelated-plugin"], "missing-tab");
assertJson(names([unrelated, { name: THREE_GOLD_GIT_WATCH_PLUGIN_NAME, tab: null }]), ["unrelated-plugin"], "null-tab");
assertJson(names([unrelated, { name: THREE_GOLD_GIT_WATCH_PLUGIN_NAME, tab: "invalid" }]), ["unrelated-plugin"], "non-object-tab");
assertJson(names([null, unrelated, good]), ["unrelated-plugin", THREE_GOLD_GIT_WATCH_PLUGIN_NAME], "null-manifest");
assertJson(names([unrelated, { name: "malformed-unrelated" }, good]), ["unrelated-plugin", THREE_GOLD_GIT_WATCH_PLUGIN_NAME], "malformed-unrelated");
assertJson(names([unrelated, { ...unrelated, label: null }, good]), ["unrelated-plugin", THREE_GOLD_GIT_WATCH_PLUGIN_NAME], "non-string-label");
assertJson(names([unrelated, { ...unrelated, icon: null }, good]), ["unrelated-plugin", THREE_GOLD_GIT_WATCH_PLUGIN_NAME], "non-string-icon");
assertJson(names([unrelated, manifest("relative-path", "relative"), good]), ["unrelated-plugin", THREE_GOLD_GIT_WATCH_PLUGIN_NAME], "relative-path");
assertJson(names([unrelated, manifest("protocol-relative-path", "//attacker.example/path"), good]), ["unrelated-plugin", THREE_GOLD_GIT_WATCH_PLUGIN_NAME], "protocol-relative-path");
assertJson(names([unrelated, manifest("backslash-path", "/\\attacker.example/path"), good]), ["unrelated-plugin", THREE_GOLD_GIT_WATCH_PLUGIN_NAME], "backslash-path");
assertJson(names([unrelated, manifest("invalid-position", "/position", { position: 7 }), good]), ["unrelated-plugin", THREE_GOLD_GIT_WATCH_PLUGIN_NAME], "invalid-position");
assertJson(names([unrelated, manifest("relative-override", "/override", { override: "chat" }), good]), ["unrelated-plugin", THREE_GOLD_GIT_WATCH_PLUGIN_NAME], "relative-override");
assertJson(names([unrelated, manifest("protocol-relative-override", "/override", { override: "//attacker.example/chat" }), good]), ["unrelated-plugin", THREE_GOLD_GIT_WATCH_PLUGIN_NAME], "protocol-relative-override");
assertJson(names([unrelated, manifest("backslash-override", "/override", { override: "/\\attacker.example/chat" }), good]), ["unrelated-plugin", THREE_GOLD_GIT_WATCH_PLUGIN_NAME], "backslash-override");
for (const [label, character] of [["nbsp", "\u00a0"], ["nel", "\u0085"], ["em-space", "\u2003"], ["line-separator", "\u2028"], ["paragraph-separator", "\u2029"]]) {
  assertJson(names([unrelated, manifest(`unicode-path-${label}`, `/bad${character}path`), good]), ["unrelated-plugin", THREE_GOLD_GIT_WATCH_PLUGIN_NAME], `unicode-path-${label}`);
  assertJson(names([unrelated, manifest(`unicode-override-${label}`, "/override", { override: `/bad${character}override` }), good]), ["unrelated-plugin", THREE_GOLD_GIT_WATCH_PLUGIN_NAME], `unicode-override-${label}`);
}
const impersonator = manifest("r52-path-impersonator", THREE_GOLD_GIT_WATCH_PATH);
assertJson(
  names([impersonator, unrelated, good]),
  ["unrelated-plugin", THREE_GOLD_GIT_WATCH_PLUGIN_NAME],
  "validated-r52-wins-path-collision",
);
const duplicatePathFirst = manifest("duplicate-first", "/duplicate");
const duplicatePathSecond = manifest("duplicate-second", "/duplicate");
assertJson(
  names([unrelated, duplicatePathFirst, duplicatePathSecond, good]),
  ["unrelated-plugin", "duplicate-first", THREE_GOLD_GIT_WATCH_PLUGIN_NAME],
  "unrelated-effective-path-first-wins",
);
const overrideFirst = manifest("override-first", "/one", { override: "/chat" });
const overrideSecond = manifest("override-second", "/two", { override: "/chat" });
assertJson(
  names([overrideFirst, overrideSecond, good]),
  ["override-first", THREE_GOLD_GIT_WATCH_PLUGIN_NAME],
  "override-effective-path-first-wins",
);
'''
        result = subprocess.run(
            ["node", "-e", snippet + exercise],
            text=True,
            capture_output=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_generated_partition_and_routes_execute_behaviorally(self):
        patcher = load_patcher()
        migrated, _ = patcher.patch_text(CURRENT.read_text(encoding="utf-8"))
        start = migrated.index("function buildNavItems(")
        end = migrated.index("const SIDEBAR_COLLAPSED_KEY", start)
        snippet = migrated[start:end]
        snippet = re.sub(
            r"function buildNavItems\(.*?\): NavItem\[\] \{",
            "function buildNavItems(builtIn, manifests) {",
            snippet,
            count=1,
            flags=re.S,
        )
        snippet = re.sub(
            r"function partitionSidebarNav\(.*?\): \{ coreItems: NavItem\[\]; customItems: NavItem\[\] \} \{",
            "function partitionSidebarNav(builtIn, manifests) {",
            snippet,
            count=1,
            flags=re.S,
        )
        snippet = re.sub(
            r"function buildRoutes\(.*?\): Array<\{.*?\}> \{",
            "function buildRoutes(builtinRoutes, manifests) {",
            snippet,
            count=1,
            flags=re.S,
        )
        snippet = re.sub(
            r"const routes: Array<\{.*?\}> = \[\];",
            "const routes = [];",
            snippet,
            count=1,
            flags=re.S,
        )
        for old, new in (
            ("manifests: PluginManifest[]", "manifests"),
            ("manifest: PluginManifest", "manifest"),
            ("value: unknown", "value"),
            ("): value is string", ")"),
            ("): PluginManifest[]", ")"),
            ("): boolean", ")"),
            ("const pluginItem: NavItem =", "const pluginItem ="),
            ("new Map<string, PluginManifest>()", "new Map()"),
            ("const addons: PluginManifest[] = [];", "const addons = [];"),
            ("element: <PluginPage name={om.name} />", "element: { plugin: om.name }"),
            ("element: <Component />", "element: { builtin: path }"),
            ("element: <PluginPage name={m.name} />", "element: { plugin: m.name }"),
        ):
            snippet = snippet.replace(old, new)
        exercise = r'''
const builtinNav = [
  { path: "/briefs-ai", label: "BRIEFS-AI", icon: "Sparkles" },
  { path: "/brief-stock", label: "BRIEF-STOCK", icon: "Chart" },
  { path: "/chat", label: "Chat", icon: "Message" },
];
const builtinRoutes = { "/briefs-ai": () => null, "/brief-stock": () => null, "/chat": () => null };
const tab = (path, extra = {}) => ({ path, hidden: false, ...extra });
const manifest = (name, path, label = name, extra = {}) => ({ name, label, icon: "Puzzle", tab: tab(path, extra) });
const good = manifest(THREE_GOLD_GIT_WATCH_PLUGIN_NAME, THREE_GOLD_GIT_WATCH_PATH, "GIT WATCH");
const unrelated = manifest("unrelated", "/unrelated", "UNRELATED");
const impersonator = manifest("impersonator", THREE_GOLD_GIT_WATCH_PATH, "IMPERSONATOR");
const duplicateFirst = manifest("duplicate-first", "/duplicate");
const duplicateSecond = manifest("duplicate-second", "/duplicate");
const overrideFirst = manifest("override-first", "/one", "OVERRIDE ONE", { override: "/chat" });
const overrideSecond = manifest("override-second", "/two", "OVERRIDE TWO", { override: "/chat" });
const malformedPosition = manifest("bad-position", "/bad-position", "BAD", { position: 7 });
const protocolRelative = manifest("protocol-relative", "//attacker.example/path", "PROTOCOL");
const backslashPath = manifest("backslash-path", "/\\attacker.example/path", "BACKSLASH");
const unicodeInvalid = [["nbsp", "\u00a0"], ["nel", "\u0085"], ["em-space", "\u2003"], ["line-separator", "\u2028"], ["paragraph-separator", "\u2029"]].flatMap(([label, character]) => [
  manifest(`unicode-path-${label}`, `/bad${character}path`, `PATH ${label}`),
  manifest(`unicode-override-${label}`, "/override", `OVERRIDE ${label}`, { override: `/bad${character}override` }),
]);
const filtered = filterThreeGoldProductionManifests([
  impersonator, unrelated, duplicateFirst, duplicateSecond,
  overrideFirst, overrideSecond, malformedPosition, protocolRelative, backslashPath, ...unicodeInvalid, good,
]);
const partition = partitionSidebarNav(builtinNav, filtered);
const customShape = partition.customItems.map((item) => [item.label, item.path]);
const expectedCustom = [["BRIEFS-AI", "/briefs-ai"], ["BRIEF-STOCK", "/brief-stock"], ["GIT WATCH", THREE_GOLD_GIT_WATCH_PATH]];
if (JSON.stringify(customShape) !== JSON.stringify(expectedCustom)) throw new Error(`custom:${JSON.stringify(customShape)}`);
if (partition.coreItems.map((item) => item.path).join(",") !== "/chat") throw new Error("core partition");
const routes = buildRoutes(builtinRoutes, filtered);
const paths = routes.map((route) => route.path);
if (new Set(paths).size !== paths.length) throw new Error(`duplicate routes:${JSON.stringify(paths)}`);
const byPath = Object.fromEntries(routes.map((route) => [route.path, route]));
if (byPath[THREE_GOLD_GIT_WATCH_PATH]?.element?.plugin !== THREE_GOLD_GIT_WATCH_PLUGIN_NAME) throw new Error("R52 route identity");
if (byPath["/duplicate"]?.element?.plugin !== "duplicate-first") throw new Error("duplicate route precedence");
if (byPath["/chat"]?.element?.plugin !== "override-first") throw new Error("override precedence");
if (byPath["/unrelated"]?.element?.plugin !== "unrelated") throw new Error("unrelated route preservation");
if (routes.some((route) => ["impersonator", "bad-position", "protocol-relative", "backslash-path"].includes(route.element?.plugin) || route.element?.plugin?.startsWith("unicode-"))) throw new Error("invalid route admitted");
'''
        result = subprocess.run(
            ["node", "-e", "const resolveIcon = (name) => name;\n" + snippet + exercise],
            text=True,
            capture_output=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_r52_is_explicitly_validated_and_ordered_before_other_plugins(self):
        patcher = load_patcher()
        migrated, _ = patcher.patch_text(CURRENT.read_text(encoding="utf-8"))
        self.assertIn('const THREE_GOLD_GIT_WATCH_PLUGIN_NAME = "git-comments-v27-review";', migrated)
        self.assertIn('const THREE_GOLD_GIT_WATCH_PATH = "/git-comments-v27-review";', migrated)
        self.assertIn("const gitWatchItems = gitWatchManifest", migrated)
        self.assertIn("return { coreItems, customItems: [...customItems, ...gitWatchItems] };", migrated)
        self.assertIn("manifest.name !== THREE_GOLD_GIT_WATCH_PLUGIN_NAME ||", migrated)
        self.assertIn("candidate.tab.path === THREE_GOLD_GIT_WATCH_PATH", migrated)

    def test_retired_plugin_identities_are_filtered_before_navigation_and_routes(self):
        patcher = load_patcher()
        migrated, _ = patcher.patch_text(CURRENT.read_text(encoding="utf-8"))
        self.assertIn("THREE_GOLD_RETIRED_PLUGIN_NAMES", migrated)
        for retired in ("brief-stock", "briefs-ai", "git-comments"):
            self.assertIn(f'  "{retired}",', migrated)
        self.assertIn(
            "const productionManifests = useMemo(\n"
            "    () => filterThreeGoldProductionManifests(manifests),",
            migrated,
        )
        self.assertIn(
            "!THREE_GOLD_RETIRED_PLUGIN_NAMES.has(manifest.name) &&",
            migrated,
        )
        self.assertIn(
            "partitionSidebarNav(builtinNav, productionManifests)", migrated
        )
        self.assertIn("buildRoutes(builtinRoutes, productionManifests)", migrated)

    def test_unknown_and_crlf_sources_fail_closed_unchanged(self):
        patcher = load_patcher()
        variants = [
            CURRENT.read_bytes() + b"// unknown edit\n",
            CURRENT.read_text(encoding="utf-8").replace("\n", "\r\n").encode(),
        ]
        for original in variants:
            with self.subTest(size=len(original)), tempfile.TemporaryDirectory() as td:
                target = Path(td) / "App.tsx"
                target.write_bytes(original)
                with self.assertRaisesRegex(ValueError, "UNKNOWN_THREE_GOLD_SIDEBAR_SOURCE"):
                    patcher.patch_file(target, "apply")
                self.assertEqual(target.read_bytes(), original)
                self.assertEqual(list(target.parent.iterdir()), [target])

    def test_replace_failure_preserves_original_and_cleans_temp(self):
        patcher = load_patcher()
        original = CURRENT.read_bytes()
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / "App.tsx"
            target.write_bytes(original)
            with mock.patch.object(patcher.os, "replace", side_effect=OSError("injected")):
                with self.assertRaisesRegex(OSError, "injected"):
                    patcher.patch_file(target, "apply")
            self.assertEqual(target.read_bytes(), original)
            self.assertEqual(list(target.parent.iterdir()), [target])


if __name__ == "__main__":
    unittest.main(verbosity=2)
