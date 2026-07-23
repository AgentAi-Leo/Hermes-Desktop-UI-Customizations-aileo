import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BRIEF_FULLSCREEN_STATE_MESSAGE_TYPES,
  PERSISTENT_FULLSCREEN_SHELL_ID,
  isBriefFullscreenToggleMessage,
} from "./persistent-fullscreen";

describe("persistent route fullscreen", () => {
  it("accepts only the two trusted Brief fullscreen toggle messages", () => {
    expect(PERSISTENT_FULLSCREEN_SHELL_ID).toBe("hermes-persistent-route-shell");
    expect(isBriefFullscreenToggleMessage("hermes-ai-fullscreen-toggle")).toBe(true);
    expect(isBriefFullscreenToggleMessage("hermes-stock-fullscreen-toggle")).toBe(true);
    expect(isBriefFullscreenToggleMessage("hermes-ai-fullscreen-state")).toBe(false);
    expect(isBriefFullscreenToggleMessage("fullscreen-toggle")).toBe(false);
    expect(BRIEF_FULLSCREEN_STATE_MESSAGE_TYPES).toEqual([
      "hermes-ai-fullscreen-state",
      "hermes-stock-fullscreen-state",
    ]);
  });

  it("keeps one fullscreen shell mounted around route changes and exposes a Git Watch control", () => {
    const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

    expect(app).toContain('id={PERSISTENT_FULLSCREEN_SHELL_ID}');
    expect(app).toContain('ref={fullscreenShellRef}');
    expect(app).toContain('document.fullscreenElement === shell');
    expect(app).toContain('data-hermes-persistent-fullscreen-control');
    expect(app).toContain('normalizedPath === THREE_GOLD_GIT_WATCH_PATH');

    const shellAt = app.indexOf('id={PERSISTENT_FULLSCREEN_SHELL_ID}');
    const routesAt = app.indexOf("<ProfileKeyedRoutes>");
    expect(shellAt).toBeGreaterThanOrEqual(0);
    expect(routesAt).toBeGreaterThan(shellAt);
  });

  it("centralizes Brief and Enter fullscreen ownership in the persistent App shell", () => {
    const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
    const briefsPage = readFileSync(new URL("../pages/BriefsPage.tsx", import.meta.url), "utf8");

    expect(app).toContain("isBriefFullscreenToggleMessage(event.data?.type)");
    expect(app).toContain("BRIEF_FULLSCREEN_STATE_MESSAGE_TYPES.forEach");
    expect(app).toContain('event.key === "Enter"');
    expect(app).toContain("customShortcutPaths.includes(normalizedPath)");
    expect(app).toContain('document.addEventListener("load", publishLoadedIframeState, true)');

    expect(briefsPage).not.toContain("handlePreviewFullscreenShortcut");
    expect(briefsPage).not.toContain("handleBriefFullscreen");
    expect(briefsPage).not.toContain("iframe.requestFullscreen()");
    expect(briefsPage).not.toContain("document.exitFullscreen()");
  });

  it("removes normal route bottom padding from the fullscreen shell instead of relying on CSS utility order", () => {
    const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

    expect(app).toContain('!isPersistentFullscreen &&\n                  !isChatRoute &&\n                    "pb-[calc(2rem+env(safe-area-inset-bottom,0px))] lg:pb-8"');
    expect(app.match(/pb-\[calc\(2rem\+env\(safe-area-inset-bottom,0px\)\)\] lg:pb-8/g)).toHaveLength(1);
  });

  it("fits fullscreen Briefs to the A/B presentation without clipping while leaving normal mode unscaled", () => {
    const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
    const briefsPage = readFileSync(new URL("../pages/BriefsPage.tsx", import.meta.url), "utf8");

    expect(app).toContain('"h-dvh overflow-hidden bg-background-base p-0"');
    expect(app).not.toContain('"h-dvh overflow-auto bg-background-base p-3 sm:p-6"');
    expect(app).toContain("<PersistentFullscreenContext.Provider value={isPersistentFullscreen}>");
    expect(briefsPage).toContain("usePersistentFullscreen()");
    expect(briefsPage).toContain("data-hermes-brief-route-chrome");
    expect(briefsPage).toContain("data-hermes-brief-archive-rail");
    expect(briefsPage).toContain("data-hermes-brief-preview-card");
    expect(briefsPage).toContain("data-hermes-brief-preview-toolbar");
    expect(briefsPage).toContain("data-hermes-ai-export-overlay");
    expect(briefsPage.match(/isPersistentFullscreen && \"hidden\"/g)).toHaveLength(4);
    expect(briefsPage).toContain('kind === "ai"');
    expect(briefsPage).toContain(
      '"h-[138.889dvh] w-[138.889%] flex-none origin-top-left scale-[0.72] gap-0 overflow-hidden"',
    );
    expect(briefsPage).toContain(
      '"h-[113.636dvh] w-[113.636%] flex-none origin-top-left scale-[0.88] gap-0 overflow-hidden"',
    );
    expect(briefsPage).toContain(': "gap-4"');
    expect(briefsPage).not.toContain('"h-[125dvh] w-[125%] flex-none origin-top-left scale-[0.8] gap-0 overflow-hidden"');
    expect(briefsPage).toContain('isPersistentFullscreen ? "h-full min-h-0 rounded-none border-0 shadow-none"');
    expect(app).toContain("if (!isPersistentFullscreen) return;");
    expect(app).toContain("shell.scrollTop = 0;");
    expect(app).toContain("requestAnimationFrame(resetFullscreenShellScroll)");
  });
});
