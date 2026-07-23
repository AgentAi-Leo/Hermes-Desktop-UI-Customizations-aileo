#!/usr/bin/env python3
"""Fail-closed migration for the Three Gold sidebar grouping contract."""
from __future__ import annotations

import argparse
import hashlib
import os
import stat
import tempfile
from pathlib import Path

CURRENT_PRODUCTION_SHA256 = {
    # Current Mac production after the first navigation migration.
    "34af200a6064e53b69044c7b003aba872668c87a86a0d4c87c66277cce08ca77",
    # Exact upstream rehearsal fixture after the same first migration.
    "5fa15a6af9a5a47c9d75b030395e0f474fdd9d223a56add852eb9b5d32961836",
}

BRIEFS_IMPORT_ANCHOR = 'import CronPage from "@/pages/CronPage";'
BRIEFS_IMPORT = BRIEFS_IMPORT_ANCHOR + '\nimport BriefsPage from "@/pages/BriefsPage";'
ROOT_REDIRECT = '''function RootRedirect() {
  return <Navigate to="/sessions" replace />;
}'''
BRIEFS_PAGE_WRAPPERS = '''function AiBriefsPage() {
  return (
    <BriefsPage
      kind="ai"
      title="BRIEFS-AI"
      emptyMessage="No AI morning briefs were found yet."
    />
  );
}

function StockBriefsPage() {
  return (
    <BriefsPage
      kind="stock"
      title="BRIEF-STOCK"
      emptyMessage="No stock briefs were found yet."
    />
  );
}'''
BRIEFS_WRAPPER_INSERTION = ROOT_REDIRECT + "\n\n" + BRIEFS_PAGE_WRAPPERS
ROUTE_ANCHOR = '  "/cron": CronPage,'
BRIEFS_ROUTE_INSERTION = ROUTE_ANCHOR + '\n  "/briefs-ai": AiBriefsPage,\n  "/brief-stock": StockBriefsPage,'
NAV_ANCHOR = '  { path: "/cron", labelKey: "cron", label: "Cron", icon: Clock },'
BRIEFS_NAV_INSERTION = NAV_ANCHOR + '\n  { path: "/briefs-ai", label: "BRIEFS-AI", icon: FileText },\n  { path: "/brief-stock", label: "BRIEF-STOCK", icon: BarChart3 },'

OLD_PARTITION = '''/** Split merged nav into built-in sidebar entries vs plugin tabs, preserving plugin order hints. */
function partitionSidebarNav(
  builtIn: NavItem[],
  manifests: PluginManifest[],
): { coreItems: NavItem[]; pluginItems: NavItem[] } {
  const merged = buildNavItems(builtIn, manifests);
  const builtinPaths = new Set(builtIn.map((i) => i.path));
  const coreItems: NavItem[] = [];
  const pluginItems: NavItem[] = [];
  for (const item of merged) {
    if (builtinPaths.has(item.path)) coreItems.push(item);
    else pluginItems.push(item);
  }
  return { coreItems, pluginItems };
}'''

NEW_PARTITION = '''const THREE_GOLD_RETIRED_PLUGIN_NAMES = new Set([
  "brief-stock",
  "briefs-ai",
  "git-comments",
]);

const THREE_GOLD_GIT_WATCH_PLUGIN_NAME = "git-comments-v27-review";
const THREE_GOLD_GIT_WATCH_PATH = "/git-comments-v27-review";

function isThreeGoldApplicationPath(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\\\")
  ) {
    return false;
  }
  return !Array.from(value).some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return /\\s/u.test(character) || code <= 31 || (code >= 127 && code <= 159);
  });
}

function hasUsableThreeGoldManifest(manifest: PluginManifest): boolean {
  return Boolean(
    manifest &&
      typeof manifest === "object" &&
      !Array.isArray(manifest) &&
      typeof manifest.name === "string" &&
      manifest.name.length > 0 &&
      typeof manifest.label === "string" &&
      typeof manifest.icon === "string" &&
      manifest.tab &&
      typeof manifest.tab === "object" &&
      !Array.isArray(manifest.tab) &&
      isThreeGoldApplicationPath(manifest.tab.path) &&
      (typeof manifest.tab.hidden === "undefined" ||
        typeof manifest.tab.hidden === "boolean") &&
      (typeof manifest.tab.override === "undefined" ||
        isThreeGoldApplicationPath(manifest.tab.override)) &&
      (typeof manifest.tab.position === "undefined" ||
        typeof manifest.tab.position === "string"),
  );
}

function filterThreeGoldProductionManifests(
  manifests: PluginManifest[],
): PluginManifest[] {
  const suppliedManifests = Array.isArray(manifests) ? manifests : [];
  const structurallyValidManifests = suppliedManifests.filter(hasUsableThreeGoldManifest);
  const gitWatchManifests = structurallyValidManifests.filter(
    (manifest) => manifest.name === THREE_GOLD_GIT_WATCH_PLUGIN_NAME,
  );
  const candidate = gitWatchManifests.length === 1 ? gitWatchManifests[0] : null;
  const validGitWatch =
    candidate &&
    candidate.tab.path === THREE_GOLD_GIT_WATCH_PATH &&
    !candidate.tab.hidden &&
    !candidate.tab.override
      ? candidate
      : null;

  const eligible = structurallyValidManifests.filter(
    (manifest) =>
      !THREE_GOLD_RETIRED_PLUGIN_NAMES.has(manifest.name) &&
      (manifest.name !== THREE_GOLD_GIT_WATCH_PLUGIN_NAME ||
        manifest === validGitWatch),
  );
  const selectedByEffectivePath = new Map<string, PluginManifest>();
  for (const manifest of eligible) {
    const effectivePath = manifest.tab.override ?? manifest.tab.path;
    if (!selectedByEffectivePath.has(effectivePath) || manifest === validGitWatch) {
      selectedByEffectivePath.set(effectivePath, manifest);
    }
  }
  return eligible.filter((manifest) => {
    const effectivePath = manifest.tab.override ?? manifest.tab.path;
    return selectedByEffectivePath.get(effectivePath) === manifest;
  });
}

const THREE_GOLD_CUSTOM_BUILTIN_PATHS = new Set([
  "/briefs-ai",
  "/brief-stock",
]);

/**
 * Keep exactly the three production products in CUSTOM and Hermes-owned pages
 * in HERMES. Unrelated valid plugins remain enabled and routable, but do not
 * enter the intentionally fixed three-product sidebar group.
 */
function partitionSidebarNav(
  builtIn: NavItem[],
  manifests: PluginManifest[],
): { coreItems: NavItem[]; customItems: NavItem[] } {
  const coreItems = builtIn.filter(
    (item) => !THREE_GOLD_CUSTOM_BUILTIN_PATHS.has(item.path),
  );
  const customItems = builtIn.filter((item) =>
    THREE_GOLD_CUSTOM_BUILTIN_PATHS.has(item.path),
  );
  const gitWatchManifest = manifests.find(
    (manifest) => manifest.name === THREE_GOLD_GIT_WATCH_PLUGIN_NAME,
  );
  const gitWatchItems = gitWatchManifest
    ? buildNavItems([], [gitWatchManifest])
    : [];

  return { coreItems, customItems: [...customItems, ...gitWatchItems] };
}'''

OLD_RENDER = '''              <ul className="flex flex-col">
                {sidebarNav.coreItems.map((item) => (
                  <SidebarNavLink
                    closeMobile={closeMobile}
                    collapsed={isDesktopCollapsed}
                    item={item}
                    key={item.path}
                    t={t}
                    tooltipWarmRef={tooltipWarmRef}
                  />
                ))}
              </ul>

              {sidebarNav.pluginItems.length > 0 && (
                <div
                  aria-labelledby="hermes-sidebar-plugin-nav-heading"
                  className="flex flex-col border-t border-current/10 pb-2"
                  role="group"
                >
                  <span
                    className={cn(
                      "px-5 pt-2.5 pb-1",
                      "font-sans text-display text-xs tracking-[0.12em] text-text-tertiary",
                      isDesktopCollapsed && "lg:hidden",
                    )}
                    id="hermes-sidebar-plugin-nav-heading"
                  >
                    {t.app.pluginNavSection}
                  </span>

                  <ul className="flex flex-col">
                    {sidebarNav.pluginItems.map((item) => (
                      <SidebarNavLink
                        closeMobile={closeMobile}
                        collapsed={isDesktopCollapsed}
                        item={item}
                        key={item.path}
                        t={t}
                        tooltipWarmRef={tooltipWarmRef}
                      />
                    ))}
                  </ul>
                </div>
              )}'''

NEW_RENDER = '''              {sidebarNav.customItems.length > 0 && (
                <div
                  aria-labelledby="hermes-sidebar-custom-nav-heading"
                  className="flex flex-col pb-2"
                  role="group"
                >
                  <span
                    className={cn(
                      "px-5 pt-2.5 pb-1",
                      "font-sans text-display text-xs tracking-[0.12em] text-text-tertiary",
                      isDesktopCollapsed && "lg:hidden",
                    )}
                    id="hermes-sidebar-custom-nav-heading"
                  >
                    {t.app.pluginNavSection}
                  </span>

                  <ul className="flex flex-col">
                    {sidebarNav.customItems.map((item) => (
                      <SidebarNavLink
                        closeMobile={closeMobile}
                        collapsed={isDesktopCollapsed}
                        item={item}
                        key={item.path}
                        t={t}
                        tooltipWarmRef={tooltipWarmRef}
                      />
                    ))}
                  </ul>
                </div>
              )}

              <div
                aria-labelledby="hermes-sidebar-core-nav-heading"
                className="flex flex-col border-t border-current/10 pb-2"
                role="group"
              >
                <span
                  className={cn(
                    "px-5 pt-2.5 pb-1",
                    "font-sans text-display text-xs tracking-[0.12em] text-text-tertiary",
                    isDesktopCollapsed && "lg:hidden",
                  )}
                  id="hermes-sidebar-core-nav-heading"
                >
                  HERMES
                </span>

                <ul className="flex flex-col">
                  {sidebarNav.coreItems.map((item) => (
                    <SidebarNavLink
                      closeMobile={closeMobile}
                      collapsed={isDesktopCollapsed}
                      item={item}
                      key={item.path}
                      t={t}
                      tooltipWarmRef={tooltipWarmRef}
                    />
                  ))}
                </ul>
              </div>'''

OLD_MANIFEST_USAGE = '''  const chatOverriddenByPlugin = useMemo(
    () => manifests.some((m) => m.tab.override === "/chat"),
    [manifests],
  );

  const builtinRoutes = useMemo(
    () => ({
      ...BUILTIN_ROUTES_CORE,
      ...(embeddedChat ? { "/chat": ChatRouteSink } : {}),
    }),
    [embeddedChat],
  );

  const builtinNav = useMemo(() => {
    const base = embeddedChat
      ? [CHAT_NAV_ITEM, ...BUILTIN_NAV_REST]
      : BUILTIN_NAV_REST;
    return showTokenAnalytics
      ? base
      : base.filter((n) => n.path !== "/analytics");
  }, [embeddedChat, showTokenAnalytics]);

  const sidebarNav = useMemo(
    () => partitionSidebarNav(builtinNav, manifests),
    [builtinNav, manifests],
  );
  const routes = useMemo(
    () => buildRoutes(builtinRoutes, manifests),
    [builtinRoutes, manifests],
  );
  const pluginTabMeta = useMemo(
    () =>
      manifests
        .filter((m) => !m.tab.hidden)
        .map((m) => ({
          path: m.tab.override ?? m.tab.path,
          label: m.label,
        })),
    [manifests],
  );'''

NEW_MANIFEST_USAGE = '''  const productionManifests = useMemo(
    () => filterThreeGoldProductionManifests(manifests),
    [manifests],
  );

  const chatOverriddenByPlugin = useMemo(
    () => productionManifests.some((m) => m.tab.override === "/chat"),
    [productionManifests],
  );

  const builtinRoutes = useMemo(
    () => ({
      ...BUILTIN_ROUTES_CORE,
      ...(embeddedChat ? { "/chat": ChatRouteSink } : {}),
    }),
    [embeddedChat],
  );

  const builtinNav = useMemo(() => {
    const base = embeddedChat
      ? [CHAT_NAV_ITEM, ...BUILTIN_NAV_REST]
      : BUILTIN_NAV_REST;
    return showTokenAnalytics
      ? base
      : base.filter((n) => n.path !== "/analytics");
  }, [embeddedChat, showTokenAnalytics]);

  const sidebarNav = useMemo(
    () => partitionSidebarNav(builtinNav, productionManifests),
    [builtinNav, productionManifests],
  );
  const routes = useMemo(
    () => buildRoutes(builtinRoutes, productionManifests),
    [builtinRoutes, productionManifests],
  );
  const pluginTabMeta = useMemo(
    () =>
      productionManifests
        .filter((m) => !m.tab.hidden)
        .map((m) => ({
          path: m.tab.override ?? m.tab.path,
          label: m.label,
        })),
    [productionManifests],
  );'''


def digest_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def has_complete_first_class_briefs(text: str) -> bool:
    required = (
        'import BriefsPage from "@/pages/BriefsPage";',
        BRIEFS_PAGE_WRAPPERS,
        '  "/briefs-ai": AiBriefsPage,\n  "/brief-stock": StockBriefsPage,',
        '{ path: "/briefs-ai", label: "BRIEFS-AI",',
        '{ path: "/brief-stock", label: "BRIEF-STOCK",',
    )
    return all(text.count(part) == 1 for part in required)


def ensure_first_class_briefs(text: str) -> str:
    if has_complete_first_class_briefs(text):
        return text
    forbidden = (
        'import BriefsPage from "@/pages/BriefsPage";',
        "function AiBriefsPage()",
        "function StockBriefsPage()",
        '"/briefs-ai": AiBriefsPage',
        '"/brief-stock": StockBriefsPage',
        'path: "/briefs-ai"',
        'path: "/brief-stock"',
    )
    if any(part in text for part in forbidden):
        raise ValueError("PARTIAL_FIRST_CLASS_BRIEFS_CONTRACT")
    anchors = (BRIEFS_IMPORT_ANCHOR, ROOT_REDIRECT, ROUTE_ANCHOR, NAV_ANCHOR)
    if any(text.count(anchor) != 1 for anchor in anchors):
        raise ValueError("PINNED_FIRST_CLASS_BRIEFS_STRUCTURE_MISMATCH")
    migrated = (
        text.replace(BRIEFS_IMPORT_ANCHOR, BRIEFS_IMPORT, 1)
        .replace(ROOT_REDIRECT, BRIEFS_WRAPPER_INSERTION, 1)
        .replace(ROUTE_ANCHOR, BRIEFS_ROUTE_INSERTION, 1)
        .replace(NAV_ANCHOR, BRIEFS_NAV_INSERTION, 1)
    )
    if not has_complete_first_class_briefs(migrated):
        raise ValueError("FIRST_CLASS_BRIEFS_POSTCONDITION_FAILED")
    return migrated


def remove_inserted_first_class_briefs(text: str) -> str | None:
    inserted = (
        BRIEFS_IMPORT,
        BRIEFS_WRAPPER_INSERTION,
        BRIEFS_ROUTE_INSERTION,
        BRIEFS_NAV_INSERTION,
    )
    if any(text.count(part) != 1 for part in inserted):
        return None
    stripped = (
        text.replace(BRIEFS_IMPORT, BRIEFS_IMPORT_ANCHOR, 1)
        .replace(BRIEFS_WRAPPER_INSERTION, ROOT_REDIRECT, 1)
        .replace(BRIEFS_ROUTE_INSERTION, ROUTE_ANCHOR, 1)
        .replace(BRIEFS_NAV_INSERTION, NAV_ANCHOR, 1)
    )
    return stripped


def migrate_predecessor(text: str) -> str:
    source = ensure_first_class_briefs(text)
    if (
        source.count(OLD_PARTITION) != 1
        or source.count(OLD_RENDER) != 1
        or source.count(OLD_MANIFEST_USAGE) != 1
    ):
        raise ValueError("PINNED_THREE_GOLD_SIDEBAR_STRUCTURE_MISMATCH")
    migrated = (
        source.replace(OLD_PARTITION, NEW_PARTITION, 1)
        .replace(OLD_RENDER, NEW_RENDER, 1)
        .replace(OLD_MANIFEST_USAGE, NEW_MANIFEST_USAGE, 1)
    )
    if (
        migrated.count(NEW_PARTITION) != 1
        or migrated.count(NEW_RENDER) != 1
        or migrated.count(NEW_MANIFEST_USAGE) != 1
        or OLD_PARTITION in migrated
        or OLD_RENDER in migrated
        or OLD_MANIFEST_USAGE in migrated
        or not has_complete_first_class_briefs(migrated)
    ):
        raise ValueError("THREE_GOLD_SIDEBAR_POSTCONDITION_FAILED")
    return migrated


def reconstruct_predecessor(text: str) -> str | None:
    if (
        text.count(NEW_PARTITION) != 1
        or text.count(NEW_RENDER) != 1
        or text.count(NEW_MANIFEST_USAGE) != 1
        or OLD_PARTITION in text
        or OLD_RENDER in text
        or OLD_MANIFEST_USAGE in text
    ):
        return None
    sidebar_predecessor = (
        text.replace(NEW_PARTITION, OLD_PARTITION, 1)
        .replace(NEW_RENDER, OLD_RENDER, 1)
        .replace(NEW_MANIFEST_USAGE, OLD_MANIFEST_USAGE, 1)
    )
    stripped = remove_inserted_first_class_briefs(sidebar_predecessor)
    candidates = [stripped, sidebar_predecessor] if stripped is not None else [sidebar_predecessor]
    for predecessor in candidates:
        try:
            if migrate_predecessor(predecessor) == text:
                return predecessor
        except ValueError:
            continue
    return None


def patch_text(
    text: str,
    allowed_predecessor_sha256=None,
    source_sha256: str | None = None,
):
    allowed = (
        CURRENT_PRODUCTION_SHA256
        if allowed_predecessor_sha256 is None
        else set(allowed_predecessor_sha256)
    )
    source_digest = source_sha256 or digest_bytes(text.encode("utf-8"))
    if source_digest in allowed:
        return migrate_predecessor(text), "MIGRATED_THREE_GOLD_SIDEBAR"

    predecessor = reconstruct_predecessor(text)
    if predecessor is not None and digest_bytes(predecessor.encode("utf-8")) in allowed:
        return text, "ALREADY_COMPLIANT"
    raise ValueError("UNKNOWN_THREE_GOLD_SIDEBAR_SOURCE")


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
            raise ValueError("THREE_GOLD_SIDEBAR_MIGRATION_REQUIRED")
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
    print(f"THREE_GOLD_SIDEBAR={state}")
    print("THREE_GOLD_SIDEBAR_CONTRACT=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
