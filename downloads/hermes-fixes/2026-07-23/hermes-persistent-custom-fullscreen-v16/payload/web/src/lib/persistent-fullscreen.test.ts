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
});
