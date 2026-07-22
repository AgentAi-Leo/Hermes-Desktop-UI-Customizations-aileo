import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
// @ts-expect-error jsdom is a transitive test-only dependency without bundled declarations.
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import type { BriefEntry } from "@/lib/api";
import {
  BRIEF_DATE_NAV_MESSAGE_TYPE,
  BRIEF_EXPORT_BUTTON_CLASS,
  BRIEF_PLAYER_MESSAGE_TYPE,
  BRIEF_PREVIEW_SANDBOX,
  adjacentBriefDate,
  briefDashboardHtml,
  briefDashboardMarkdown,
  briefDownloadName,
  briefHtmlDownloadName,
  briefPreviewCanvasColor,
  briefRoute,
  filterBriefs,
  formatStockArchiveDate,
  focusBriefPreview,
  isBriefPlayerShortcut,
  isBriefPlayerTextEditingTarget,
  matchingStockPortfolioCsv,
  paginateBriefs,
  prepareBriefPreviewHtml,
  stockPortfolioCsv,
  stockPortfolioCsvName,
  stockDateNavigationDirection,
  supportsBriefDateNavigation,
} from "./briefs";

const entries: BriefEntry[] = [
  {
    date: "2026-07-14",
    generated_at: 1_784_214_000,
    html_exists: true,
    markdown_exists: true,
    html_route: "/api/briefs/ai/html/2026-07-14",
    markdown_route: "/api/briefs/ai/markdown/2026-07-14",
  },
  {
    date: "2026-07-13",
    generated_at: 1_784_127_600,
    html_exists: true,
    markdown_exists: false,
    html_route: "/api/briefs/ai/html/2026-07-13",
    markdown_route: null,
  },
];

describe("brief helpers", () => {
  it("builds archive routes", () => {
    expect(briefRoute("stock", "html", "2026-07-14")).toBe(
      "/api/briefs/stock/html/2026-07-14",
    );
  });

  it("uses a dark AI preview canvas to prevent white flashes during date navigation", () => {
    expect(briefPreviewCanvasColor("ai")).toBe("#0b1020");
    expect(briefPreviewCanvasColor("stock")).toBe("#ffffff");
  });

  it("supports adjacent-date messages for AI and Stock and keeps export controls 50% larger", () => {
    expect(supportsBriefDateNavigation("ai")).toBe(true);
    expect(supportsBriefDateNavigation("stock")).toBe(true);
    expect(BRIEF_EXPORT_BUTTON_CLASS).toContain("h-[3.375rem]");
    expect(BRIEF_EXPORT_BUTTON_CLASS).toContain("text-[1.125rem]");
    expect(BRIEF_EXPORT_BUTTON_CLASS).toContain("[&_svg]:h-6");
  });

  it("keeps the accepted AI export overlay while moving Stock exports and adjacent-date navigation into the selected-date toolbar", () => {
    const briefsPage = readFileSync(new URL("../pages/BriefsPage.tsx", import.meta.url), "utf8");
    const briefsSource = readFileSync(new URL("./briefs.ts", import.meta.url), "utf8");
    const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
    expect(briefsPage.match(/renderExportButtons\(\"preview\"\)/g)).toHaveLength(1);
    expect(briefsPage.match(/renderExportButtons\(\"stock-toolbar\"\)/g)).toHaveLength(1);
    expect(briefsPage).toContain('data-hermes-stock-date-navigation');
    expect(briefsPage).toContain('kind === "ai" && !previewLoading && previewUrl && selected');
    expect(briefsPage).not.toContain('kind === "stock" && !previewLoading && previewUrl && selected');
    expect(app).toContain('to={{ pathname: "/briefs-ai", search: location.search, hash: location.hash }}');
    expect(briefsSource).toContain("left: 50% !important");
    expect(briefsSource).toContain("transform: translate(-50%, -50%) !important");
  });

  it("filters entries by date", () => {
    expect(filterBriefs(entries, "07-13")).toEqual([entries[1]]);
    expect(filterBriefs(entries, "   ")).toEqual(entries);
  });

  it("paginates date rails newest-first without expanding their width", () => {
    const dated = Array.from({ length: 15 }, (_, index) => ({ ...entries[0], date: `2026-07-${String(15 - index).padStart(2, "0")}` }));
    expect(paginateBriefs(dated, 0).map((entry) => entry.date)).toHaveLength(5);
    expect(paginateBriefs(dated, 1).map((entry) => entry.date)).toEqual(dated.slice(5, 10).map((entry) => entry.date));
    expect(paginateBriefs(dated, 2).map((entry) => entry.date)).toEqual(dated.slice(10, 15).map((entry) => entry.date));
  });

  it("cycles adjacent cron dates forever at both archive boundaries", () => {
    expect(adjacentBriefDate(entries, "2026-07-14", "older")?.date).toBe("2026-07-13");
    expect(adjacentBriefDate(entries, "2026-07-13", "newer")?.date).toBe("2026-07-14");
    expect(adjacentBriefDate(entries, "2026-07-14", "newer")?.date).toBe("2026-07-13");
    expect(adjacentBriefDate(entries, "2026-07-13", "older")?.date).toBe("2026-07-14");
  });

  it("maps Stock arrows and brackets to the visible previous and next date controls", () => {
    expect(stockDateNavigationDirection("ArrowLeft")).toBe("newer");
    expect(stockDateNavigationDirection("[")).toBe("newer");
    expect(stockDateNavigationDirection("ArrowRight")).toBe("older");
    expect(stockDateNavigationDirection("]")).toBe("older");
    expect(stockDateNavigationDirection("ArrowUp")).toBeNull();
    expect(formatStockArchiveDate("2026-07-20")).toBe("July 20, 2026 - Mon.");

    const stockPreview = prepareBriefPreviewHtml(
      '<!doctype html><html><head></head><body><header><h1>Stock Brief — 2026-07-16</h1></header><article id="AAPL">AAPL $333.26</article></body></html>',
      "stock",
    );
    expect(stockPreview).toContain('id="hermes-stock-interaction-controller"');
    expect(stockPreview).toContain('event.key === "["');
    expect(stockPreview).toContain('event.key === "]"');
    expect(stockPreview).toContain('event.target instanceof HTMLInputElement');
    expect(stockPreview).toContain('type: "hermes-brief-date-navigation", direction, position: captureViewportPosition()');
    expect(stockPreview).toContain('type: "hermes-stock-viewport-state", position: captureViewportPosition()');
    expect(stockPreview).toContain('event.data?.type !== "hermes-stock-viewport-restore"');
    expect(stockPreview).toContain('window.scrollTo(targetX, targetY)');
    expect(stockPreview).toContain('requestAnimationFrame(applyPosition)');
    expect(stockPreview).not.toContain('candidate.getAttribute("data-ticker") === ticker');
    expect(stockPreview).not.toContain('row.getBoundingClientRect().top - anchor.top');
    const briefsPage = readFileSync(new URL("../pages/BriefsPage.tsx", import.meta.url), "utf8");
    expect(briefsPage).toContain("latestStockViewportPositionRef");
    expect(briefsPage).toContain("pendingStockViewportPositionRef.current = latestStockViewportPositionRef.current");
    expect(briefsPage).toContain('type: "hermes-stock-viewport-restore", position');
    expect(briefsPage).not.toContain("function humanBriefDate");
    expect(briefsPage).toContain("{formatStockArchiveDate(selected?.date ?? \"\")}");
    expect(briefsPage).toContain('rounded-full bg-[#67e8f9] px-4');
    expect(briefsPage).not.toContain("\n                    DATE\n");
    expect(briefsPage).toContain("Number.isFinite(position?.scrollX)");
    expect(briefsPage).toContain("Number.isFinite(position?.scrollY)");
  });

  it("persists the exact selected AI card independently for every archive date", () => {
    const briefsPage = readFileSync(new URL("../pages/BriefsPage.tsx", import.meta.url), "utf8");
    const aiPreview = prepareBriefPreviewHtml(
      '<html><body><main><section class="takeaways"><h2>Founder Takeaways</h2><ol><li>One</li></ol></section><article class="card"><h2>1) One</h2></article><article class="card"><h2>2) Two</h2></article></main></body></html>',
      "ai",
    );
    expect(aiPreview).toContain('type: "hermes-ai-viewport-state", position: captureViewportPosition()');
    expect(aiPreview).toContain("publishViewportState()");
    expect(aiPreview).toContain('target.scrollIntoView({ behavior: "auto", block: "start" })');
    expect(briefsPage).toContain("aiViewportByDateRef");
    expect(briefsPage).toContain("pendingAiViewportPositionRef");
    expect(briefsPage).toContain("aiViewportByDateRef.current.set(selected.date, position)");
    expect(briefsPage).toContain("aiViewportByDateRef.current.get(target.date) ?? null");
    expect(briefsPage).toContain("aiViewportByDateRef.current.get(targetDate) ?? null");
    expect(briefsPage).not.toContain("aiViewportByDateRef.current.get(target.date) ?? position");
    expect(briefsPage).toContain('type: "hermes-ai-viewport-restore", position');
    expect(briefsPage).toContain("rememberAiViewportForDateChange(brief.date)");
  });

  it("adds a working fullscreen toggle immediately beside the Stock Brief title", () => {
    const stockPreview = prepareBriefPreviewHtml(
      '<!doctype html><html><head></head><body><header><h1>Stock Brief — 2026-07-16</h1></header><article id="AAPL">AAPL $333.26</article></body></html>',
      "stock",
    );
    const dom = new JSDOM(stockPreview, { runScripts: "dangerously" });
    const titleRow = dom.window.document.querySelector(".hermes-stock-title-row");
    const button = titleRow?.querySelector<HTMLButtonElement>("h1 + #hermes-stock-fullscreen-button");
    let requested = 0;
    let exited = 0;
    Object.defineProperty(dom.window.document.documentElement, "requestFullscreen", {
      configurable: true,
      value: () => { requested += 1; },
    });
    Object.defineProperty(dom.window.document, "exitFullscreen", {
      configurable: true,
      value: () => { exited += 1; },
    });

    expect(button?.getAttribute("aria-label")).toBe("Enter Stock Brief fullscreen");
    expect(button?.querySelector('svg[viewBox="0 0 24 24"]')).not.toBeNull();
    button?.click();
    expect(requested).toBe(1);

    Object.defineProperty(dom.window.document, "fullscreenElement", {
      configurable: true,
      get: () => dom.window.document.documentElement,
    });
    button?.click();
    expect(exited).toBe(1);

    const briefsPage = readFileSync(new URL("../pages/BriefsPage.tsx", import.meta.url), "utf8");
    expect(briefsPage).toContain("allowFullScreen");
    expect(stockPreview).toContain('type: "hermes-stock-fullscreen-toggle"');
    expect(stockPreview).toContain('event.data?.type === "hermes-stock-fullscreen-state"');
    expect(briefsPage).toContain("await iframe.requestFullscreen()");
    expect(briefsPage).toContain("document.fullscreenElement === iframe");
    expect(briefsPage.match(/setPreviewUrl\(null\)/g)).toHaveLength(1);
    expect(briefsPage).toContain("{previewUrl && (");
    expect(briefsPage).toContain("{previewLoading && (");
    expect(stockPreview).toContain(".hermes-stock-title-row { display: flex !important; min-width: 0 !important; align-items: center !important;");
    expect(stockPreview).toContain("#hermes-stock-fullscreen-button { display: inline-grid !important; width: 44px !important; height: 44px !important; flex: 0 0 44px !important;");
    expect(stockPreview).toContain("#hermes-stock-fullscreen-button svg { width: 26px !important; height: 26px !important;");
  });

  it("reserves Enter exclusively for Stock fullscreen even on focused controls", () => {
    const stockPreview = prepareBriefPreviewHtml(
      '<!doctype html><html><head></head><body><header><h1>Stock Brief — 2026-07-16</h1></header><input aria-label="Filter"><article id="AAPL">AAPL $333.26</article></body></html>',
      "stock",
    );
    const dom = new JSDOM(stockPreview, { runScripts: "dangerously" });
    let requested = 0;
    Object.defineProperty(dom.window.document.documentElement, "requestFullscreen", {
      configurable: true,
      value: () => { requested += 1; },
    });

    dom.window.document.body.dispatchEvent(new dom.window.KeyboardEvent("keydown", {
      key: "Enter", bubbles: true, cancelable: true,
    }));
    expect(requested).toBe(1);

    dom.window.document.querySelector("#hermes-stock-fullscreen-button")?.dispatchEvent(new dom.window.KeyboardEvent("keydown", {
      key: "Enter", bubbles: true, cancelable: true,
    }));
    expect(requested).toBe(2);
  });

  it("gives AI page-level Enter fullscreen parity without starting or cancelling audio", () => {
    const aiPreview = prepareBriefPreviewHtml(`<!doctype html><html><head></head><body><main>
      <header><span class="pill">July 16, 2026</span><h1>AI Morning Brief</h1><p class="date">July 16, 2026 · America/Los_Angeles</p></header>
      <section class="topics"><article class="card"><h2>1. Topic one</h2><p>Summary one.</p></article></section>
    </main></body></html>`, "ai");
    const dom = new JSDOM(aiPreview, { runScripts: "outside-only" });
    let requested = 0;
    let cancelled = 0;
    let spoken = 0;
    Object.defineProperty(dom.window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel: () => { cancelled += 1; },
        speak: () => { spoken += 1; },
        getVoices: () => [{ name: "Samantha", lang: "en-US", localService: true }],
        pause: () => undefined,
        resume: () => undefined,
      },
    });
    Object.defineProperty(dom.window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: class { text: string; constructor(text: string) { this.text = text; } },
    });
    Object.defineProperty(dom.window, "ResizeObserver", {
      configurable: true,
      value: class { observe() {} },
    });
    Object.defineProperty(dom.window.document.documentElement, "requestFullscreen", {
      configurable: true,
      value: () => { requested += 1; },
    });
    const controller = dom.window.document.querySelector("#hermes-brief-player-controller")?.textContent ?? "";
    dom.window.eval(controller);
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    const cancelledAfterInitialization = cancelled;

    const button = dom.window.document.querySelector<HTMLButtonElement>("h1 + #hermes-ai-fullscreen-button");
    expect(button?.getAttribute("aria-label")).toBe("Enter AI Morning Brief fullscreen");
    dom.window.document.body.dispatchEvent(new dom.window.KeyboardEvent("keydown", {
      key: "Enter", bubbles: true, cancelable: true,
    }));

    expect(requested).toBe(1);
    expect(spoken).toBe(0);
    expect(cancelled).toBe(cancelledAfterInitialization);
  });

  it("uses the centered navigator as the sole AI date pill", () => {
    const aiPreview = prepareBriefPreviewHtml(`<!doctype html><html><head></head><body><main>
      <header><span class="pill">July 16, 2026</span><h1>AI Morning Brief</h1><p class="date">July 16, 2026 · America/Los_Angeles</p></header>
      <section class="takeaways"><div class="hermes-takeaways-heading-row"><h2>FOUNDER TAKEAWAYS</h2><span class="hermes-ai-active-date-pill">July 15, 2026</span></div><ol><li><strong>Key point.</strong> Detail.</li></ol></section>
      <section class="topics">
        <article class="card"><h2>1. Topic one</h2><p>Summary one.</p><p class="sources">Sources: Reuters <span class="pill">July 16, 2026</span></p></article>
        <article class="card"><h2>2. Topic two</h2><p>Summary two.</p><p class="sources">Sources: TechCrunch</p></article>
      </section>
    </main></body></html>`, "ai");

    expect(aiPreview).not.toContain("hermes-ai-active-date-pill");
    expect(aiPreview).not.toContain("hermes-takeaways-heading-row");
    expect(aiPreview.match(/>July 16, 2026<\/span>/g)).toHaveLength(1);
  });

  it("keeps the stable parent iframe fullscreen for AI and republishes state after date loads", () => {
    const aiPreview = prepareBriefPreviewHtml(`<!doctype html><html><head></head><body><main>
      <header><span class="pill">July 16, 2026</span><h1>AI Morning Brief</h1><p class="date">July 16, 2026 · America/Los_Angeles</p></header>
      <article class="card"><h2>1. Topic one</h2><p>Summary one.</p></article>
    </main></body></html>`, "ai");
    const briefsPage = readFileSync(new URL("../pages/BriefsPage.tsx", import.meta.url), "utf8");

    expect(aiPreview).toContain('type: "hermes-ai-fullscreen-toggle"');
    expect(aiPreview).toContain('event.data?.type === "hermes-ai-fullscreen-state"');
    expect(briefsPage).toContain('kind !== "ai" && kind !== "stock"');
    expect(briefsPage).toContain('event.data?.type !== `${fullscreenMessagePrefix}-fullscreen-toggle`');
    expect(briefsPage).toContain('{ type: `${fullscreenMessagePrefix}-fullscreen-state`, active: document.fullscreenElement === iframe }');
    expect(briefsPage).toContain("await iframe.requestFullscreen()");
    expect(briefsPage).toContain("document.fullscreenElement === iframe");
    expect(briefsPage.match(/setPreviewUrl\(null\)/g)).toHaveLength(1);
  });

  it("reserves parent-document Enter exclusively for the stable preview iframe fullscreen", () => {
    const briefsPage = readFileSync(new URL("../pages/BriefsPage.tsx", import.meta.url), "utf8");
    expect(briefsPage).toContain("const handlePreviewFullscreenShortcut = (event: KeyboardEvent) => {");
    expect(briefsPage).toContain('if (event.key !== "Enter") return;');
    expect(briefsPage).not.toContain("isBriefFullscreenInteractiveTarget");
    expect(briefsPage).toContain("await iframe.requestFullscreen()");
    expect(briefsPage).toContain("window.addEventListener(\"keydown\", handlePreviewFullscreenShortcut, true)");
    expect(briefsPage).toContain("window.removeEventListener(\"keydown\", handlePreviewFullscreenShortcut, true)");
  });

  it("reserves topic-card Enter for fullscreen and never restarts active-card narration", () => {
    const aiPreview = prepareBriefPreviewHtml(`<!doctype html><html><head></head><body><main>
      <header><span class="pill">July 16, 2026</span><h1>AI Morning Brief</h1><p class="date">July 16, 2026 · America/Los_Angeles</p></header>
      <section class="topics"><article class="card"><h2>1. Topic one</h2><p>Summary one.</p></article></section>
    </main></body></html>`, "ai");
    const dom = new JSDOM(aiPreview, { runScripts: "outside-only" });
    let requested = 0;
    let cancelled = 0;
    let spoken = 0;
    Object.defineProperty(dom.window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel: () => { cancelled += 1; },
        speak: () => { spoken += 1; },
        getVoices: () => [{ name: "Samantha", lang: "en-US", localService: true }],
        pause: () => undefined,
        resume: () => undefined,
      },
    });
    Object.defineProperty(dom.window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: class { text: string; volume = 1; voice = null; lang = ""; pitch = 1; rate = 1; onend = null; onerror = null; constructor(text: string) { this.text = text; } },
    });
    Object.defineProperty(dom.window, "ResizeObserver", {
      configurable: true,
      value: class { observe() {} },
    });
    Object.defineProperty(dom.window.document.documentElement, "requestFullscreen", {
      configurable: true,
      value: () => { requested += 1; },
    });
    Object.defineProperty(dom.window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: () => undefined,
    });
    const controller = dom.window.document.querySelector("#hermes-brief-player-controller")?.textContent ?? "";
    dom.window.eval(controller);
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));

    const card = dom.window.document.querySelector<HTMLElement>(".hermes-playable-card");
    card?.click();
    expect(spoken).toBe(1);
    const cancelledAfterNarrationStart = cancelled;

    card?.dispatchEvent(new dom.window.KeyboardEvent("keydown", {
      key: "Enter", bubbles: true, cancelable: true,
    }));
    expect(requested).toBe(1);
    expect(spoken).toBe(1);
    expect(cancelled).toBe(cancelledAfterNarrationStart);

    const escape = new dom.window.KeyboardEvent("keydown", {
      key: "Escape", bubbles: true, cancelable: true,
    });
    dom.window.document.body.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(false);
    expect(spoken).toBe(1);
    expect(cancelled).toBe(cancelledAfterNarrationStart);
  });

  it("defaults AI narration to 1.25x and exposes the exact composer-pill speed choices", () => {
    const aiPreview = prepareBriefPreviewHtml(`<!doctype html><html><head></head><body><main>
      <header><span class="pill">July 16, 2026</span><h1>AI Morning Brief</h1><p class="date">July 16, 2026 · America/Los_Angeles</p></header>
      <section class="topics"><article class="card"><h2>1. Topic one</h2><p>Summary one.</p></article></section>
    </main></body></html>`, "ai");

    expect(aiPreview).toContain('"Samantha", "Ava", "Allison", "Susan", "Victoria", "Karen", "Moira"');
    expect(aiPreview).toContain("utterance.pitch = 1;");
    expect(aiPreview).toContain("const playbackRates = [1, 1.25, 1.5, 1.75]");
    expect(aiPreview).toContain("let playbackRate = 1.25;");
    expect(aiPreview).toContain("utterance.rate = playbackRate;");
    expect(aiPreview).toContain('id="tts-speed"');
    expect(aiPreview).toContain('aria-label="Playback speed 1.25x"');
    expect(aiPreview).toContain(">1.25x</button>");
  });

  it("uses S to speed up and Shift+S to slow down with wraparound", () => {
    const aiPreview = prepareBriefPreviewHtml('<html><body><main><section class="topics"><article class="card"><h2>1. Topic</h2><p>Body.</p></article></section></main></body></html>', "ai");
    const dom = new JSDOM(aiPreview, { runScripts: "outside-only", url: "http://localhost" });
    Object.defineProperty(dom.window, "speechSynthesis", { configurable: true, value: {
      cancel: () => undefined, speak: () => undefined, getVoices: () => [{ name: "Samantha", lang: "en-US", localService: true }], pause: () => undefined, resume: () => undefined,
    }});
    Object.defineProperty(dom.window, "SpeechSynthesisUtterance", { configurable: true, value: class { text: string; volume = 1; voice = null; lang = ""; pitch = 1; rate = 1; onend = null; onerror = null; constructor(text: string) { this.text = text; } } });
    Object.defineProperty(dom.window, "ResizeObserver", { configurable: true, value: class { observe() {} } });
    const controller = dom.window.document.querySelector("#hermes-brief-player-controller")?.textContent ?? "";
    dom.window.eval(controller);
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    const speed = () => dom.window.document.getElementById("tts-speed")?.textContent;
    const press = (shiftKey = false) => {
      const event = new dom.window.KeyboardEvent("keydown", { key: shiftKey ? "S" : "s", code: "KeyS", shiftKey, bubbles: true, cancelable: true });
      dom.window.document.body.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      return speed();
    };
    expect(speed()).toBe("1.25x");
    expect(press()).toBe("1.5x");
    expect(press()).toBe("1.75x");
    expect(press()).toBe("1x");
    expect(press(true)).toBe("1.75x");
    expect(press(true)).toBe("1.5x");
    expect(press(true)).toBe("1.25x");
  });

  it("changes active AI utterance volume without cancelling, restarting, or moving the card", async () => {
    const aiPreview = prepareBriefPreviewHtml('<html><body><main><section class="topics"><article class="card"><h2>1. Topic</h2><p>Body.</p></article></section></main></body></html>', "ai");
    const dom = new JSDOM(aiPreview, { runScripts: "outside-only", url: "https://briefs.local/ai" });
    let cancelled = 0;
    const spoken: Array<{ volume: number }> = [];
    Object.defineProperty(dom.window, "speechSynthesis", { configurable: true, value: {
      cancel: () => { cancelled += 1; }, speak: (utterance: { volume: number }) => spoken.push(utterance),
      getVoices: () => [{ name: "Samantha", lang: "en-US", localService: true }], pause: () => undefined, resume: () => undefined,
    }});
    Object.defineProperty(dom.window, "SpeechSynthesisUtterance", { configurable: true, value: class {
      text: string; volume = 1; voice = null; lang = ""; pitch = 1; rate = 1; onend = null; onerror = null;
      constructor(text: string) { this.text = text; }
    }});
    Object.defineProperty(dom.window, "ResizeObserver", { configurable: true, value: class { observe() {} } });
    Object.defineProperty(dom.window.HTMLElement.prototype, "scrollIntoView", { configurable: true, value: () => undefined });
    const controller = dom.window.document.querySelector("#hermes-brief-player-controller")?.textContent ?? "";
    dom.window.eval(controller);
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    dom.window.document.querySelector<HTMLElement>(".hermes-playable-card")?.click();
    expect(spoken).toHaveLength(1);
    const cancelledAfterStart = cancelled;

    const slider = dom.window.document.querySelector<HTMLInputElement>("#tts-volume")!;
    slider.value = "0.35";
    slider.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    await new Promise((resolve) => dom.window.setTimeout(resolve, 180));

    expect(spoken).toHaveLength(1);
    expect(cancelled).toBe(cancelledAfterStart);
    expect(spoken[0].volume).toBe(0.35);
    expect(dom.window.document.querySelector('[aria-current="true"] h2')?.textContent).toBe("1. Topic");
  });

  it("persists one AI volume level and restores it when a new date document initializes", () => {
    const html = prepareBriefPreviewHtml('<html><body><main><article class="card"><h2>1. Topic</h2><p>Body.</p></article></main></body></html>', "ai");
    const initialize = (stored?: string) => {
      const dom = new JSDOM(html, { runScripts: "outside-only", url: "https://briefs.local/ai" });
      if (stored !== undefined) dom.window.localStorage.setItem("hermes-briefs-ai-volume-v1", stored);
      Object.defineProperty(dom.window, "speechSynthesis", { configurable: true, value: { cancel: () => undefined, speak: () => undefined, getVoices: () => [], pause: () => undefined, resume: () => undefined } });
      Object.defineProperty(dom.window, "SpeechSynthesisUtterance", { configurable: true, value: class { constructor(_text: string) {} } });
      Object.defineProperty(dom.window, "ResizeObserver", { configurable: true, value: class { observe() {} } });
      dom.window.eval(dom.window.document.querySelector("#hermes-brief-player-controller")?.textContent ?? "");
      dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
      return dom;
    };
    const first = initialize();
    const firstSlider = first.window.document.querySelector<HTMLInputElement>("#tts-volume")!;
    expect(firstSlider.value).toBe("0.45");
    firstSlider.value = "0.4";
    firstSlider.dispatchEvent(new first.window.Event("input", { bubbles: true }));
    expect(first.window.localStorage.getItem("hermes-briefs-ai-volume-v1")).toBe("0.4");

    const nextDate = initialize(first.window.localStorage.getItem("hermes-briefs-ai-volume-v1") ?? undefined);
    expect(nextDate.window.document.querySelector<HTMLInputElement>("#tts-volume")?.value).toBe("0.4");
  });

  it("keeps one parent-owned AI volume level across sandboxed date iframe loads", () => {
    const briefsPage = readFileSync(new URL("../pages/BriefsPage.tsx", import.meta.url), "utf8");
    expect(briefsPage).toContain('const AI_VOLUME_STORAGE_KEY = "hermes-briefs-ai-volume-v1"');
    expect(briefsPage).toContain("const AI_DEFAULT_VOLUME = 0.45");
    expect(briefsPage).toContain("if (stored === null) return AI_DEFAULT_VOLUME");
    expect(briefsPage).toContain("const aiVolumeRef = useRef(readStoredAiVolume())");
    expect(briefsPage).toContain('event.data?.type !== "hermes-ai-volume-change"');
    expect(briefsPage).toContain('localStorage.setItem(AI_VOLUME_STORAGE_KEY, String(volume))');
    expect(briefsPage).toContain('{ type: "hermes-ai-volume-restore", volume: aiVolumeRef.current }');
  });

  it("keeps keyboard focus and viewport on the player while play and topic controls run", () => {
    const aiPreview = prepareBriefPreviewHtml(`<!doctype html><html><head></head><body><main>
      <header><span class="pill">July 16, 2026</span><h1>AI Morning Brief</h1><p class="date">July 16, 2026 · America/Los_Angeles</p></header>
      <section class="topics">
        <article class="card"><h2>1. Topic one</h2><p>Summary one.</p></article>
        <article class="card"><h2>2. Topic two</h2><p>Summary two.</p></article>
      </section>
    </main></body></html>`, "ai");
    const dom = new JSDOM(aiPreview, { runScripts: "outside-only", url: "http://localhost" });
    let scrollCalls = 0;
    let spoken = 0;
    Object.defineProperty(dom.window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel: () => undefined,
        speak: () => { spoken += 1; },
        getVoices: () => [{ name: "Samantha", lang: "en-US", localService: true }],
        pause: () => undefined,
        resume: () => undefined,
      },
    });
    Object.defineProperty(dom.window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: class { text: string; volume = 1; voice = null; lang = ""; pitch = 1; rate = 1; onend = null; onerror = null; constructor(text: string) { this.text = text; } },
    });
    Object.defineProperty(dom.window, "ResizeObserver", {
      configurable: true,
      value: class { observe() {} },
    });
    Object.defineProperty(dom.window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: () => { scrollCalls += 1; },
    });
    const controller = dom.window.document.querySelector("#hermes-brief-player-controller")?.textContent ?? "";
    dom.window.eval(controller);
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));

    const play = dom.window.document.querySelector<HTMLButtonElement>('#hermes-brief-player button[aria-label="Play reading"]');
    const next = dom.window.document.querySelector<HTMLButtonElement>('#hermes-brief-player button[aria-label="Next topic"]');
    play?.focus();
    play?.click();
    expect(dom.window.document.activeElement).toBe(play);
    expect(spoken).toBe(1);
    expect(scrollCalls).toBe(0);

    next?.focus();
    next?.click();
    expect(dom.window.document.activeElement).toBe(next);
    expect(spoken).toBe(2);
    expect(scrollCalls).toBe(1);

    next?.blur();
    const right = new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
    dom.window.document.body.dispatchEvent(right);
    expect(right.defaultPrevented).toBe(true);
    expect(dom.window.document.activeElement).toBe(dom.window.document.getElementById("hermes-brief-player"));
    expect(dom.window.document.getElementById("hermes-brief-player")?.dataset.hermesAiFocusRestore).toBe("v26-ai-player-focus-restore");
    expect(spoken).toBe(3);
    expect(scrollCalls).toBe(2);
  });

  it("builds stable download filenames", () => {
    expect(briefDownloadName("ai", "2026-07-14")).toBe(
      "AI Morning Brief - 2026-07-14.md",
    );
    expect(briefDownloadName("stock", "2026-07-14")).toBe(
      "Stock Brief - 2026-07-14.md",
    );
    expect(briefHtmlDownloadName("ai", "2026-07-14")).toBe("BRIEFS-AI - 2026-07-14.html");
    expect(briefHtmlDownloadName("stock", "2026-07-14")).toBe("BRIEFS-STOCKS - 2026-07-14.html");
  });

  it("removes archived scripts and injects one network-isolated controller", () => {
    const archivedScript = `
      <script>
        function toggleSpeech() { speechSynthesis.speak(new SpeechSynthesisUtterance("brief")); }
        document.addEventListener("keydown", archivedKeyboardHandler);
      </script>`;

    const result = prepareBriefPreviewHtml(`<!doctype html><html><head>
      <style>body { color: navy; }</style>
      <script src="https://cdn.example.test/player.js"></script>
      ${archivedScript}
    </head><body><h1>Morning brief</h1></body></html>`);

    expect(result).not.toContain("toggleSpeech");
    expect(result).not.toContain("archivedKeyboardHandler");
    expect(result).toContain('id="hermes-brief-player-controller"');
    expect(result).toContain("<style>body { color: navy; }</style>");
    expect(result).toContain("<h1>Morning brief</h1>");
    expect(result).not.toContain("cdn.example.test");
    expect(result).toContain('http-equiv="Content-Security-Policy"');
    expect(result).toContain("default-src 'none'");
    expect(result).toContain("script-src 'unsafe-inline'");
    expect(result).toContain("connect-src 'none'");
  });

  it("removes every external script regardless of attribute order or quote style", () => {
    const result = prepareBriefPreviewHtml(`<html><body>
      <script defer SRC='https://example.test/a.js'>fallbackA()</script>
      <script src=/relative.js async>fallbackB()</script>
      <script data-purpose="src=example">keepInline()</script>
    </body></html>`);

    expect(result).not.toContain("example.test/a.js");
    expect(result).not.toContain("/relative.js");
    expect(result).not.toContain("fallbackA()");
    expect(result).not.toContain("fallbackB()");
    expect(result).not.toContain('data-purpose="src=example"');
    expect(result).not.toContain("keepInline()");
    expect(result.match(/<script\b/gi)).toHaveLength(1);
  });

  it("removes archived inline handlers, javascript URLs, srcdoc, and meta refresh", () => {
    const result = prepareBriefPreviewHtml(`<!doctype html><html><head>
      <meta http-equiv="refresh" content="0;url=https://example.test">
      <meta http-equiv="Content-Security-Policy" content="script-src *">
    </head><body onload="oldLoad()">
      <section class="card" onclick='oldClick()' onkeydown=oldKey()>
        <a href="javascript:oldLink()">Unsafe link</a>
        <a href="java
script:oldObfuscatedLink()">Obfuscated unsafe link</a>
        <iframe srcdoc="&lt;script&gt;oldFrame()&lt;/script&gt;"></iframe>
      </section>
    </body></html>`);

    expect(result).not.toMatch(/\son(?:load|click|keydown)\s*=/i);
    expect(result).not.toMatch(/href\s*=\s*["']?\s*javascript:/i);
    expect(result).not.toMatch(/\ssrcdoc\s*=/i);
    expect(result).not.toMatch(/http-equiv\s*=\s*["']refresh/i);
    expect(result).not.toContain("oldLoad()");
    expect(result).not.toContain("oldClick()");
    expect(result).not.toContain("oldKey()");
    expect(result).not.toContain("oldLink()");
    expect(result).not.toContain("oldObfuscatedLink()");
    expect(result).not.toContain("oldFrame()");
    expect(result).not.toContain("script-src *");
  });

  it("injects one fixed player supporting historical and current controls", () => {
    const result = prepareBriefPreviewHtml(`<!doctype html><html><head></head><body>
      <main class="wrap"><header><h1>AI Morning Brief</h1>
      <div class="tts"><button id="prev">previous</button><button id="play">play</button><button id="next">next</button><input id="vol" type="range"></div>
      </header><section class="card"><h2>First topic</h2><p class="summary">Summary</p></section></main>
      <script>document.addEventListener('keydown', brokenArchivedHandler)</script>
    </body></html>`);

    expect(result).not.toContain("brokenArchivedHandler");
    expect(result).toContain("hermes-brief-player-sticky");
    expect(result).toContain("position: fixed !important");
    expect(result).toContain("hermes-brief-player-placeholder");
    expect(result).toContain("ResizeObserver");
    expect(result).toContain("ensureHermesPlayer");
    expect(result).toContain('player.id = "hermes-brief-player"');
    expect(result).toContain('id="tts-volume"');
    expect(result).toContain('id="tts-speed"');
    expect(result).toContain('class="hermes-player-volume"><input');
    expect(result).not.toContain('class="hermes-player-volume">Volume ');
    expect(result).not.toContain('id="tts-status"');
    expect(result).not.toContain('statusElement = document.getElementById("tts-status")');
    expect(result).toContain("width: 137.5px !important");
    expect(result).toContain(".wrap { width: 100% !important");
    expect(result).not.toContain("Keys: Space Play/Pause · ← Previous · → Next · ↑ Founder takeaways / first topic + Play");
    expect(result).toContain("function selectAndPlay(selectedIndex, options = {})");
    expect(result).toContain("function setVolume(value)");
    expect(result).not.toContain("volumeRestartTimer");
    expect(result).toContain("configureNaturalVoice(utterance)");
    expect(result).toContain("utterance.rate = playbackRate");
    expect(result).toContain('card.addEventListener("click"');
    expect(result).toContain("const selectedIndex = cards.indexOf(selectedCard)");
    expect(result).toContain('card.setAttribute("role", "button")');
    expect(result).toContain("playButton.textContent = paused || !playing ?");
    expect(result).toContain(BRIEF_PLAYER_MESSAGE_TYPE);
    expect(result).toContain(BRIEF_DATE_NAV_MESSAGE_TYPE);
    expect(result).toContain('navigator.setAttribute("aria-label", "Cron date navigation")');
    expect(result).toContain('id="hermes-date-newer"');
    expect(result).toContain('id="hermes-date-older"');
    expect(result).toContain('id="hermes-date-newer"');
    expect(result).toContain('const visibleDate = header?.querySelector(".pill")?.textContent?.trim() || "Date unavailable"');
    expect(result).toContain('navigator.querySelector(".hermes-date-nav-label").textContent = visibleDate');
    expect(result).toContain("shell.appendChild(navigator)");
    expect(result).not.toContain('pill.insertAdjacentElement("afterend", navigator)');
    expect(result).toContain("event.source !== window.parent");
    expect(result).toContain("function isVolumeControl(target)");
    expect(result).toContain("if (textEditingTarget(event.target) && !isVolumeControl(event.target)) return;");
    expect(result).toContain("volumeInput.tabIndex = -1;");
    expect(result).toContain('volumeInput.addEventListener("keydown", (event) => {');
    expect(result).toContain("// The slider is pointer-only: preserve player keys and suppress every native range key.");
    expect(result).toContain("runCommand(command);\n    }, true);");
    expect(result).toContain("selectAndPlay(0, options)");
  });

  it("restores the exact top Portfolio Position Comparison, removes the producer bottom comparison, and keeps quote rows and CSV data", () => {
    const stockHtml = `<!doctype html><html><head></head><body><main>
      <header><h1>Stock Brief — 2026-07-06</h1><button id="playPause">Play/Pause</button></header>
      <section aria-label="Stock price cards">
        <article class="card"><h2>AAPL — Apple</h2><p class="positive">▲ +3.96 (+1.28%)</p><strong>$312.59</strong></article>
        <article class="card"><h2>GOOGL — Alphabet</h2><p class="positive">▲ +1.48 (+0.41%)</p><strong>$361.39</strong></article>
        <article class="card"><h2>AMZN — Amazon</h2><p class="positive">▲ +0.04 (+0.02%)</p><strong>$242.71</strong></article>
        <article class="card"><h2>MSFT — Microsoft</h2><p class="negative">▼ -2.03 (-0.52%)</p><strong>$385.49</strong></article>
        <article class="card"><h2>NVDA — NVIDIA</h2><p class="positive">▲ +5.44 (+2.86%)</p><strong>$195.82</strong></article>
        <article class="card"><h2>DIS — Disney</h2><p class="negative">▼ -2.07 (-2.08%)</p><strong>$95.87</strong></article>
        <article class="card"><h2>SNAP — Snap</h2><p class="negative">▼ -0.10 (-2.06%)</p><strong>$4.75</strong></article>
      </section>
      <section id="hermes-portfolio-comparison" aria-label="Portfolio Position Comparison"><h2>Portfolio comparison</h2><table><tbody><tr><td>Legacy portfolio row</td></tr></tbody></table></section>
    </main></body></html>`;

    const result = prepareBriefPreviewHtml(stockHtml, "stock");
    const portfolioDocument = new JSDOM(result).window.document;
    const portfolioHeaders = (Array.from(portfolioDocument.querySelectorAll("#hermes-portfolio-comparison thead th")) as Element[]).map((header) => header.textContent);
    const portfolioRows = Array.from(portfolioDocument.querySelectorAll("#hermes-portfolio-comparison tbody tr")) as HTMLTableRowElement[];
    const appleRow = portfolioRows.find((row) => row.textContent?.includes("APPLE-1 · AAPL"));
    const disneyRow = portfolioRows.find((row) => row.textContent?.includes("DISNEY · DIS"));

    expect(portfolioHeaders).toEqual(["Position", "Shares", "Purchased price", "CURRENT PRICE", "TOTAL +/-", "DAY +/-", "COST BASIS", "CURRENT VALUE", "GAIN / LOSS", "RETURN"]);
    expect(appleRow?.querySelector(".hermes-portfolio-day")?.textContent).toBe("+$3.96");
    expect(appleRow?.querySelector(".hermes-portfolio-day")?.classList.contains("hermes-portfolio-positive")).toBe(true);
    expect(disneyRow?.querySelector(".hermes-portfolio-day")?.textContent).toBe("-$2.07");
    expect(disneyRow?.querySelector(".hermes-portfolio-day")?.classList.contains("hermes-portfolio-negative")).toBe(true);
    expect(portfolioDocument.querySelector("#hermes-portfolio-comparison tfoot td")?.getAttribute("colspan")).toBe("6");
    expect(result).toContain(".hermes-portfolio-table { width: 100%; min-width: 1480px;");
    expect(result).toContain(".hermes-portfolio-meta { display: block; margin-top: 3px; color: var(--muted, #aab8ca); font-size: 15.25px;");
    expect(result).not.toContain(".hermes-portfolio-meta { display: block; margin-top: 3px; color: var(--muted, #aab8ca); font-size: 12.2px;");

    expect(result).toContain('<span id="hermes-stock-date-pill" data-hermes-stock-date-pill="true" class="pill" role="status" aria-label="Stock brief date: July 6, 2026 - Mon."');
    expect(result).toContain("<h1>Stock Brief</h1>");
    expect(result).not.toContain("<h1>Stock Brief — 2026-07-06</h1>");
    expect(result.match(/id="hermes-portfolio-comparison"/g)).toHaveLength(1);
    expect(result).toContain("Portfolio Position Comparison");
    expect(result).toContain("Daily prices compared with your purchase lots. Precise basis uses shares × purchased price.");
    expect(result).toContain("Available-position total");
    expect(result).not.toContain("Legacy portfolio row");
    expect(result).not.toContain("<h2>Portfolio comparison</h2>");
    expect(result).not.toContain("Play/Pause");
    expect(result).not.toContain("hermes-stock-date-nav-controller");
    expect(result).toContain('<section class="hermes-stock-row" data-ticker="AAPL">');
    expect(result).toContain(".hermes-stock-row { grid-column: 1 / -1 !important;");
    expect(result).toContain("grid-template-columns: minmax(220px, 280px) minmax(150px, 190px) minmax(0, 1fr) !important");
    expect(result).toContain('<span class="hermes-stock-ticker">NVDA</span>');
    expect(result).toContain('<strong class="hermes-stock-price">$195.82</strong>');
    expect(result).toContain('<span class="hermes-stock-ticker">DIS</span>');
    expect(result).toContain('<strong class="hermes-stock-price">$95.87</strong>');
    expect(result).not.toContain('<article class="card"><h2>AAPL');
    expect(result).not.toContain("<strong>$312.59</strong>");
    expect(result).toContain(".hermes-stock-price { display: block !important; margin-top: 7px !important; color: #ffe08a !important; font-size: 2.3rem !important;");
    expect(result).not.toContain(".hermes-stock-price { display: block !important; margin-top: 7px !important; color: #ffe08a !important; font-size: 1.84rem !important;");
    expect(result).toContain(".hermes-stock-metrics dd { max-width: 100% !important; margin: 7px 0 0 !important; color: var(--text, #f4f7fb) !important; font-size: clamp(1.05rem, 1.55vw, 1.9rem) !important;");

    const missingSnapHtml = stockHtml.replace(
      /\s*<article class="card"><h2>SNAP — Snap<\/h2><p class="negative">▼ -0\.10 \(-2\.06%\)<\/p><strong>\$4\.75<\/strong><\/article>/,
      "",
    );
    const csv = stockPortfolioCsv(stockHtml, "2026-07-06");
    const lines = csv.trim().split("\r\n");
    expect(lines).toHaveLength(11);
    lines.forEach((line) => expect(line.split(",")).toHaveLength(13));
    expect(lines[0]).toBe(
      "Brief Date,Position,Ticker,Purchase Date,Shares,Purchased Price,Current Price,Price Difference,Cost Basis,Current Value,Gain Loss,Position Return Percent,Agent",
    );
    expect(lines[1]).toBe(
      "2026-07-06,DISNEY,DIS,8/05/66,268,25.00,95.87,70.87,6700.00,25693.16,18993.16,283.48,HERMES",
    );
    expect(lines[2]).toBe(
      "2026-07-06,APPLE-1,AAPL,5/29/24,146,191.00,312.59,121.59,27886.00,45638.14,17752.14,63.66,HERMES",
    );
    expect(lines).toContain(
      "2026-07-06,SNAP,SNAP,2/3/26,1786,6.18,4.75,-1.43,11037.48,8483.50,-2553.98,-23.14,HERMES",
    );
    expect(csv).not.toContain("$");
    expect(csv).not.toContain("bought");
    expect(stockPortfolioCsvName("2026-07-06")).toBe("Stock Portfolio - 2026-07-06.csv");

    const missingSnapCsv = stockPortfolioCsv(missingSnapHtml, "2026-07-06");
    expect(missingSnapCsv).toContain(
      "2026-07-06,SNAP,SNAP,2/3/26,1786,6.18,,,11037.48,,,,HERMES",
    );

    const crossCardHtml = "<h2>AAPL — price unavailable</h2><h2>AMZN — Amazon $242.71</h2>";
    const crossCardCsv = stockPortfolioCsv(crossCardHtml, "2026-07-06").split("\r\n");
    expect(crossCardCsv).toContain(
      "2026-07-06,APPLE-1,AAPL,5/29/24,146,191.00,,,27886.00,,,,HERMES",
    );
    expect(crossCardCsv).toContain(
      "2026-07-06,AMAZON-1,AMZN,5/29/24,138,181.00,242.71,61.71,24978.00,33493.98,8515.98,34.09,HERMES",
    );
    const crossCardUi = prepareBriefPreviewHtml(crossCardHtml, "stock");
    expect(crossCardUi).toContain("Portfolio Position Comparison");
    expect(crossCardUi).toContain("Current AAPL price unavailable");
    expect(crossCardUi).not.toContain("APPLE-1 · AAPL</span><span class=\"hermes-portfolio-meta\">5/29/24</span></td><td class=\"hermes-portfolio-shares\">146</td><td class=\"hermes-portfolio-purchase\">$191.00</td><td>$242.71</td>");
    expect(crossCardUi).not.toContain("AMZN — Amazon $242.71");
    expect(crossCardUi).toContain('data-hermes-canonical-stock="v26"');

    const tableRowsHtml =
      "<table><tr><td>AAPL — price unavailable</td></tr><tr><td>AMZN</td><td>Amazon</td><td>$242.71</td></tr></table>";
    const tableRowsCsv = stockPortfolioCsv(tableRowsHtml, "2026-07-06").split("\r\n");
    expect(tableRowsCsv).toContain(
      "2026-07-06,APPLE-1,AAPL,5/29/24,146,191.00,,,27886.00,,,,HERMES",
    );
    expect(tableRowsCsv).toContain(
      "2026-07-06,AMAZON-1,AMZN,5/29/24,138,181.00,242.71,61.71,24978.00,33493.98,8515.98,34.09,HERMES",
    );

    const alternateHeadingCsv = stockPortfolioCsv(
      "<h2>Amazon (AMZN) | $242.71</h2><section class=\"card\">SNAP — Snap $4.75</section>",
      "2026-07-06",
    ).split("\r\n");
    expect(alternateHeadingCsv).toContain(
      "2026-07-06,AMAZON-1,AMZN,5/29/24,138,181.00,242.71,61.71,24978.00,33493.98,8515.98,34.09,HERMES",
    );
    expect(alternateHeadingCsv).toContain(
      "2026-07-06,SNAP,SNAP,2/3/26,1786,6.18,4.75,-1.43,11037.48,8483.50,-2553.98,-23.14,HERMES",
    );

    const unrelatedDollarHtml =
      "<article><h2>AAPL — Apple</h2><p>Price unavailable. Market cap rose by $12.5 billion.</p></article><h2>AMZN — Amazon $242.71</h2>";
    const unrelatedDollarCsv = stockPortfolioCsv(unrelatedDollarHtml, "2026-07-06").split("\r\n");
    expect(unrelatedDollarCsv).toContain(
      "2026-07-06,APPLE-1,AAPL,5/29/24,146,191.00,,,27886.00,,,,HERMES",
    );
    expect(unrelatedDollarCsv).toContain(
      "2026-07-06,AMAZON-1,AMZN,5/29/24,138,181.00,242.71,61.71,24978.00,33493.98,8515.98,34.09,HERMES",
    );

    const unavailableHeadingCsv = stockPortfolioCsv(
      "<h2>AAPL — Apple price unavailable; market cap $12.5 billion</h2>",
      "2026-07-06",
    ).split("\r\n");
    expect(unavailableHeadingCsv).toContain(
      "2026-07-06,APPLE-1,AAPL,5/29/24,146,191.00,,,27886.00,,,,HERMES",
    );

    const companyProseCsv = stockPortfolioCsv(
      "<h2>AAPL — Supplier SNAP — social platform note $312.59</h2>",
      "2026-07-06",
    ).split("\r\n");
    expect(companyProseCsv).toContain(
      "2026-07-06,APPLE-1,AAPL,5/29/24,146,191.00,312.59,121.59,27886.00,45638.14,17752.14,63.66,HERMES",
    );
    expect(companyProseCsv).toContain(
      "2026-07-06,SNAP,SNAP,2/3/26,1786,6.18,,,11037.48,,,,HERMES",
    );

    const datedCsv = { date: "2026-07-06", content: csv };
    expect(matchingStockPortfolioCsv(datedCsv, "2026-07-06")).toBe(datedCsv);
    expect(matchingStockPortfolioCsv(datedCsv, "2026-07-14")).toBeNull();
  });

  it("normalizes the July 17 article-and-portfolio producer contract without purchase-price fallback or light-mode drift", () => {
    const stockHtml = `<!doctype html><html><head><style>
      :root{color-scheme:light;--ink:#172033;--muted:#647084;--line:#dce2ea;--panel:#fff;--bg:#f4f6f9}
      body{margin:0;background:var(--bg);color:var(--ink)}
      main{width:min(1120px,calc(100% - 32px));margin:auto}
    </style></head><body><main>
      <header><h1>Stock Brief</h1><div class="context"><strong>Friday, July 17, 2026</strong> · End of U.S. regular session · Generated 7:55:11 PM PDT</div><p>Primary quotes: Yahoo Finance chart metadata; regular-market close and prior close used for daily movement.</p></header>
      <section class="stock-list" aria-label="Tracked stocks">
        <article class="stock-row up" data-ticker="AAPL"><div class="identity"><h2>AAPL — Apple Inc.</h2><div class="price">$333.74</div></div><div class="movement">▲ +$0.48 (+0.14%)</div><dl class="metrics"><div><dt>Day high</dt><dd>$334.98</dd></div><div><dt>Day low</dt><dd>$329.00</dd></div><div><dt>52-week high</dt><dd>$334.99</dd></div><div><dt>52-week low</dt><dd>$201.50</dd></div><div><dt>Volume</dt><dd>63,325,386</dd></div></dl></article>
      </section>
      <section class="portfolio"><h2>Portfolio Position Comparison</h2><table><tbody><tr><td>APPLE-1 · AAPL (5/29/24)</td><td>146</td><td>$191.00</td><td>$333.74</td></tr></tbody></table></section>
    </main></body></html>`;

    const result = prepareBriefPreviewHtml(stockHtml, "stock", 1784346911);
    const csv = stockPortfolioCsv(stockHtml, "2026-07-17");

    expect(result).toContain('aria-label="Stock brief date: July 17, 2026 - Fri."');
    expect(result).toContain('body > main { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 28px !important; }');
    expect(result.match(/Yahoo Finance snapshot generated at end-of-day after U\.S\. close · \$USD/g)).toHaveLength(1);
    expect(result).not.toContain("Friday, July 17, 2026");
    expect(result).not.toContain("Generated 7:55:11 PM PDT");
    expect(result).not.toContain("Primary quotes: Yahoo Finance chart metadata");
    expect(result).toContain('<span class="hermes-stock-ticker">AAPL</span>');
    expect(result).toContain('<strong class="hermes-stock-price hermes-portfolio-positive">$333.74</strong>');
    expect(result).toContain('APPLE-1 · AAPL</span><span class="hermes-portfolio-meta">5/29/24</span></td><td class="hermes-portfolio-shares">146</td><td class="hermes-portfolio-purchase">$191.00</td><td>$333.74</td>');
    expect(result).not.toContain('<section class="portfolio">');
    expect(result).toContain(':root { color-scheme: dark !important;');
    expect(result).toContain('html, body { width: 100% !important; max-width: none !important; min-height: 100% !important; margin: 0 !important; background: #0b1020 !important; color: #eef3ff !important; }');
    expect(csv).toContain('2026-07-17,APPLE-1,AAPL,5/29/24,146,191.00,333.74,142.74,27886.00,48726.04,20840.04,74.73');
  });

  it("normalizes actual section-card stock archives into one horizontal quote row per ticker", () => {
    const stockHtml = `<!doctype html><html><body><main class="grid">
      <section class="card" id="AAPL"><div class="top"><div><div class="ticker">AAPL</div><div class="company">Apple Inc.</div></div><div><div class="price">$327.50</div><div class="change up">+$12.64</div></div></div><dl><div><dt>Day High</dt><dd>$328.72</dd></div><div><dt>Day Low</dt><dd>$317.32</dd></div><div><dt>52-week High</dt><dd>$328.72</dd></div><div><dt>52-week Low</dt><dd>$201.50</dd></div><div><dt>Volume</dt><dd>60,780,931</dd></div></dl><div class="sources"><a href="https://example.test">Yahoo source</a></div></section>
    </main></body></html>`;
    const result = prepareBriefPreviewHtml(stockHtml, "stock", undefined, "2026-07-18");

    expect(result).toContain('<section class="hermes-stock-row" data-ticker="AAPL">');
    expect(result.match(/<h2 id="hermes-stock-today-date-pill" class="hermes-stock-today-date-pill"[^>]*>July 18, 2026 - Sat\.<\/h2>/g)).toHaveLength(1);
    expect(result.indexOf('<h2 id="hermes-stock-today-date-pill"')).toBeLessThan(
      result.indexOf('<section class="hermes-stock-row" data-ticker="AAPL">'),
    );
    expect(result).toContain('.hermes-stock-today-date-pill { display: inline-flex !important; width: max-content !important;');
    expect(result).toContain('background: #ffffff !important; color: #0b1020 !important;');
    expect(result).toContain('@media (max-width: 900px) { .hermes-stock-today-date-pill { font-size: 14.3px !important; } }');
    expect(result).toContain('<span class="hermes-stock-ticker">AAPL</span>');
    expect(result).toContain('<div class="hermes-stock-title"><span class="hermes-stock-ticker">AAPL</span><span class="hermes-stock-company">APPLE INC.</span></div>');
    expect(result).toContain(".hermes-stock-title { display: flex !important; min-width: 0 !important; flex-direction: column !important;");
    expect(result).toContain(".hermes-stock-ticker { color: #ffe08a !important;");
    expect(result).toContain(".hermes-stock-price { display: block !important; margin-top: 7px !important; color: #ffe08a !important;");
    expect(result).toContain('<span class="hermes-stock-change hermes-portfolio-positive">+$12.64</span>');
    expect(result).toContain('<strong class="hermes-stock-price hermes-portfolio-positive">$327.50</strong>');
    expect(result).toContain('<dt>Day High</dt><dd>$328.72</dd>');
    expect(result).toContain('.hermes-stock-row { grid-column: 1 / -1 !important; width: 100% !important; max-width: none !important; min-width: 0 !important;');
    expect(result).toContain('grid-template-columns: minmax(220px, 280px) minmax(150px, 190px) minmax(0, 1fr) !important; gap: 14px !important;');
    expect(result).not.toContain('.hermes-stock-row-date {');
    expect(result).toContain('.hermes-stock-metrics { grid-column: 3 !important; display: grid !important; min-width: 0 !important; grid-template-columns: repeat(5, minmax(0, 1fr)) !important; gap: 12px !important;');
    expect(result).toContain('.hermes-stock-metrics dd { max-width: 100% !important;');
    expect(result).toContain('@media (max-width: 1100px) { .hermes-stock-row { grid-template-columns: minmax(0, 1fr) minmax(150px, 190px) !important;');
    expect(result).toContain('.hermes-stock-metrics { grid-column: 1 / -1 !important; grid-row: 2 !important; width: 100% !important;');
    expect(result).not.toContain('grid-template-columns: minmax(520px, 1.05fr) minmax(190px, .42fr)');
    expect(result).not.toContain('grid-template-columns: repeat(5, minmax(132px, 1fr))');
    expect(result).not.toContain("Yahoo source");
    expect(result).not.toContain('id="hermes-brief-player-controller"');

    const normalizedCompanyNames = prepareBriefPreviewHtml(
      '<main class="grid"><article class="stock-row"><h2>DIS — The Walt Disney Company</h2><div class="price">$99.71</div></article><article class="stock-row"><h2>AMZN — Amazon.com, Inc.</h2><div class="price">$249.89</div></article></main>',
      "stock",
    );
    expect(normalizedCompanyNames).toContain('<span class="hermes-stock-company">THE WALT DISNEY CO.</span>');
    expect(normalizedCompanyNames).toContain('<span class="hermes-stock-company">AMAZON.COM, INC.</span>');
  });

  it("normalizes July 14 stock-card archives with linked tickers and span/b metrics", () => {
    const stockHtml = `<!doctype html><html><body><header><h1>Stock Brief — 2026-07-14</h1></header><main class="grid">
      <article class="stock-card" data-symbol="AAPL"><div class="card-head"><div><a class="ticker" href="https://finance.yahoo.com/quote/AAPL">AAPL</a><div class="name">Apple Inc.</div></div><div class="price">$314.86</div></div><div class="change down">-2.45 / -0.77%</div><div class="metrics"><div><span>Day High</span><b>$316.19</b></div><div><span>Day Low</span><b>$311.91</b></div><div><span>52w High</span><b>$323.45</b></div><div><span>52w Low</span><b>$201.50</b></div><div><span>Volume</span><b>36.33M</b></div><div><span>Source</span><b>Yahoo Finance</b></div></div></article>
    </main></body></html>`;
    const result = prepareBriefPreviewHtml(stockHtml, "stock");

    expect(result).toContain('<section class="hermes-stock-row" data-ticker="AAPL">');
    expect(result).toContain('<span class="hermes-stock-company">APPLE INC.</span>');
    expect(result).toContain('<span class="hermes-stock-change hermes-portfolio-negative">▼ -$2.45 (-0.77%)</span>');
    expect(result).toContain('<dt>Day High</dt><dd>$316.19</dd>');
    expect(result).toContain('<dt>52-week High</dt><dd>$323.45</dd>');
    expect(result).toContain('<dt>Volume</dt><dd>36.33M</dd>');
    expect(result.match(/<div><dt>/g)).toHaveLength(5);
    expect(result).not.toContain("Yahoo Finance</b>");
  });

  it("normalizes July 5 and 6 card archives with text/strong stats", () => {
    const stockHtml = `<!doctype html><html><body><main class="wrap"><header><h1>Stock Brief — 2026-07-06</h1></header><section class="cards" aria-label="Stock price cards">
      <article class="card"><h2>AAPL — Apple <span class="price">$312.59</span></h2><p class="change up">▲ +3.96 (+1.28%)</p><div class="stats"><div class="stat">Day High<strong>$312.75</strong></div><div class="stat">Day Low<strong>$307.01</strong></div><div class="stat">52w High<strong>$323.45</strong></div><div class="stat">52w Low<strong>$201.50</strong></div><div class="stat">Volume<strong>13.47M</strong></div></div></article>
    </section></main></body></html>`;
    const result = prepareBriefPreviewHtml(stockHtml, "stock");

    expect(result).toContain('<section class="hermes-stock-row" data-ticker="AAPL">');
    expect(result).toContain('<dt>Day High</dt><dd>$312.75</dd>');
    expect(result).toContain('<dt>52-week High</dt><dd>$323.45</dd>');
    expect(result).toContain('<dt>Volume</dt><dd>13.47M</dd>');
    expect(result.match(/<div><dt>/g)).toHaveLength(5);
  });

  it("renders exactly one yellow Stock date pill in the hero and none in quote rows", () => {
    const stockHtml = `<!doctype html><html><body><header><h1>Stock Brief — 2026-07-16</h1><p class="date">Los Angeles date: 2026-07-16</p></header><main class="grid">
      <article class="stock-row"><h2>DIS — The Walt Disney Company</h2><div class="price">$99.71</div></article>
      <article class="stock-row"><h2>AAPL — Apple Inc.</h2><div class="price">$333.26</div></article>
    </main></body></html>`;
    const result = prepareBriefPreviewHtml(stockHtml, "stock");
    const document = new JSDOM(result).window.document;

    expect(document.querySelectorAll("#hermes-stock-date-pill")).toHaveLength(1);
    expect(document.querySelector("#hermes-stock-date-pill")?.textContent).toBe("July 16, 2026 - Thu.");
    expect(document.querySelectorAll(".hermes-stock-row-date")).toHaveLength(0);
    expect(document.querySelectorAll('.hermes-stock-row [aria-label^="Daily prices date:"]')).toHaveLength(0);
    expect(result).toContain("grid-template-columns: minmax(220px, 280px) minmax(150px, 190px) minmax(0, 1fr) !important");
    expect(result).not.toContain(".hermes-stock-row-date {");
  });

  it("moves current price into its own column and expands five timestamp-free metrics across the compact row", () => {
    const stockHtml = `<!doctype html><html><body><main class="grid">
      <article class="stock-row up" id="MSFT" data-ticker="MSFT"><div class="identity"><h2>MSFT — Microsoft Corporation</h2><div class="price">$401.10</div></div><div class="movement"><span>▲ +$5.47 (+1.38%)</span></div><dl class="metrics"><div><dt>Day High</dt><dd>$405.99</dd></div><div><dt>Day Low</dt><dd>$392.05</dd></div><div><dt>52-week High</dt><dd>$555.45</dd></div><div><dt>52-week Low</dt><dd>$349.20</dd></div><div><dt>Volume</dt><dd>34,338,326</dd></div></dl><div class="asof">As of 2026-07-16 1:00:00 PM PDT</div></article>
      <p class="archive-timestamp">As of 2026-07-16 1:00:00 PM PDT</p>
    </main></body></html>`;
    const result = prepareBriefPreviewHtml(stockHtml, "stock");
    const document = new JSDOM(result).window.document;
    const row = document.querySelector(".hermes-stock-row");

    expect(Array.from(row?.children ?? [], (node) => (node as Element).className)).toEqual([
      "hermes-stock-identity",
      "hermes-stock-current-price hermes-portfolio-positive",
      "hermes-stock-metrics",
    ]);
    expect(row?.querySelector(":scope > .hermes-stock-identity .hermes-stock-price")).toBeNull();
    expect(row?.querySelector(":scope > .hermes-stock-current-price .hermes-stock-current-label")?.textContent).toBe("CURRENT PRICE");
    expect(row?.querySelector(":scope > .hermes-stock-current-price .hermes-stock-price")?.textContent).toBe("$401.10");
    expect(result.match(/<div><dt>/g)).toHaveLength(5);
    expect(result).toContain("<dt>Day High</dt><dd>$405.99</dd>");
    expect(result).toContain("<dt>Volume</dt><dd>34,338,326</dd>");
    expect(result).not.toMatch(/As of\s+2026-07-16/i);
    expect(result).not.toContain('class="movement"');
    expect(result).not.toContain('class="metrics"');
    expect(result).toContain("grid-template-columns: minmax(220px, 280px) minmax(150px, 190px) minmax(0, 1fr) !important");
    expect(result).toContain("padding: 10px 20px !important");
    expect(result).toContain("main.grid { display: flex !important; flex-direction: column !important; gap: 8px !important;");
    expect(result).toContain(".hermes-stock-current-price { grid-column: 2 !important;");
    expect(result).toContain(".hermes-stock-metrics { grid-column: 3 !important;");
    expect(result).toContain("grid-template-columns: repeat(5, minmax(0, 1fr)) !important");
    expect(result).toContain(".hermes-stock-metrics dt { max-width: 100% !important; color: var(--muted, #aab8ca) !important; font-size: clamp(.82rem, 1vw, 1.15rem) !important;");
    expect(result).toContain(".hermes-stock-metrics dd { max-width: 100% !important; margin: 7px 0 0 !important; color: var(--text, #f4f7fb) !important; font-size: clamp(1.05rem, 1.55vw, 1.9rem) !important;");
  });

  it("uses cyan archive metadata and a weighted Founder Takeaways keypoint hierarchy", () => {
    const result = prepareBriefPreviewHtml(
      '<html><body><header><div class="date">Wednesday, July 15, 2026</div><div class="sub">America/Los_Angeles date: 2026-07-15 · USD</div></header><main><div class="takeaways"><h2>Founder takeaways</h2><ol><li><strong>1. Agentic coding is now a price/performance war, not a novelty.</strong> Supporting detail.</li></ol></div></main></body></html>',
      "ai",
    );

    expect(result).toContain("header .date, header .sub { color: #67e8f9 !important; }");
    expect(result).toContain(".hermes-playable-card.takeaways h2 { color: #67e8f9 !important; text-transform: uppercase !important;");
    expect(result).toContain(".hermes-playable-card.takeaways li { font-size: 1.2em !important;");
    expect(result).toContain(".hermes-playable-card.takeaways li > strong:first-child { display: block !important; color: #67e8f9 !important; font-size: 1.35em !important;");
    expect(result).toContain(".hermes-playable-card.takeaways li::marker { color: #67e8f9 !important;");
    expect(result).not.toContain("hermes-ai-active-date-pill");
    expect(result).not.toContain("hermes-takeaways-heading-row");
  });

  it("keeps standalone AI and Stock export date navigation cyclic", () => {
    const dates = ["2026-07-20", "2026-07-18", "2026-07-15"];
    const ai = briefDashboardHtml('<html><body><header><h1>AI Morning Brief</h1></header><section class="topics"><article class="card"><h2>1. Topic</h2></article></section></body></html>', "ai", dates[0], dates, 1_784_400_000);
    const stock = briefDashboardHtml('<html><body><header><h1>Stock Brief — 2026-07-20</h1></header><main><article class="stock-row"><h2>AAPL — Apple</h2><strong class="price">$1.00</strong></article></main></body></html>', "stock", dates[0], dates, 1_784_400_000);
    for (const exported of [ai, stock]) {
      expect(exported).toContain("(current + offset + state.archiveDates.length) % state.archiveDates.length");
      expect(exported).not.toContain("state.archiveDates[current + offset]");
      expect(exported).toContain("V34 SELF-CONTAINED GOLD MASTER GUIDE");
      expect(exported).toContain('"export_schema":"briefs-v34-gold-master"');
      expect(exported).toContain('"gold_master_documented":true');
      expect(exported).toContain("crossing either archive boundary continues at the opposite end");
      expect(exported).not.toMatch(/<script\b[^>]*\bsrc\s*=/i);
      expect(exported).not.toMatch(/<link\b[^>]*\brel=["']?stylesheet/i);
    }
    expect(ai).toContain('const VOLUME_STORAGE_KEY = "hermes-briefs-ai-volume-v1"');
    expect(ai).toContain("let volume = 0.45");
    expect(ai).toContain("if (storedVolumeRaw !== null)");
    expect(ai).toContain('{ type: "hermes-ai-volume-restore", volume }');
    expect(ai).toContain('event.data?.type === "hermes-ai-volume-change"');
  });

  it("documents every inline style and controller as a reusable gold-master template", () => {
    const dates = ["2026-07-20", "2026-07-18", "2026-07-15"];
    const ai = briefDashboardHtml('<html><body><header><h1>AI Morning Brief</h1></header><section class="topics"><article class="card"><h2>1. Topic</h2></article></section></body></html>', "ai", dates[0], dates, 1_784_400_000);
    const stock = briefDashboardHtml('<html><body><header><h1>Stock Brief — 2026-07-20</h1></header><main><article class="stock-row"><h2>AAPL — Apple</h2><strong class="price">$1.00</strong></article></main></body></html>', "stock", dates[0], dates, 1_784_400_000);

    for (const exported of [ai, stock]) {
      expect(exported).toContain("GOLD MASTER RESTORATION MAP");
      expect(exported).toContain("GOLD MASTER HTML:");
      expect(exported).toContain("HTML ownership:");
      expect(exported).toContain("CSS ownership:");
      expect(exported).toContain("JavaScript ownership:");
      expect(exported).toContain("Security boundary:");
      expect(exported).toContain("No external scripts, stylesheets, fonts, images, APIs, or build step are required");

      const styleBodies = Array.from(exported.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi), (match) => match[1]);
      const scriptBodies = Array.from(exported.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi), (match) => match[1]);
      expect(styleBodies.length).toBeGreaterThan(0);
      expect(scriptBodies.length).toBeGreaterThan(0);
      for (const body of styleBodies) {
        expect(body.trimStart()).toMatch(/^\/\*\s*GOLD MASTER STYLE:/);
        expect(body).toContain("Purpose:");
        expect(body).toContain("Restore notes:");
      }
      for (const body of scriptBodies) {
        expect(body.trimStart()).toMatch(/^\/\*\s*GOLD MASTER CONTROLLER:/);
        expect(body).toContain("Purpose:");
        expect(body).toContain("State:");
        expect(body).toContain("Inputs:");
        expect(body).toContain("Outputs:");
        expect(body).toContain("Dependencies:");
        expect(body).toContain("Restore notes:");
      }
    }
  });

  it("exports a self-contained full-page dashboard clone with archive context and player", () => {
    const result = briefDashboardHtml(
      '<html><head><title>AI Morning Brief</title></head><body><header><span class="pill">AI Morning Brief</span><h1>AI Morning Brief — 2026-07-16</h1><p class="date">July 16, 2026 · America/Los_Angeles</p></header><main><div class="takeaways"><h2>Founder takeaways</h2></div><section><h2>Topic one</h2></section></main></body></html>',
      "ai",
      "2026-07-16",
      ["2026-07-16", "2026-07-15"],
      1_784_236_080,
    );
    expect(result).toContain('id="hermes-brief-export-shell"');
    expect(result).toContain("BRIEFS-AI");
    expect(result).toContain('aria-current="date">2026-07-16');
    expect(result).toContain(">2026-07-15<");
    expect(result).toContain('id="hermes-brief-player-controller"');
    expect(result.match(/id="hermes-brief-player-controller"/g)).toHaveLength(1);
    expect(result).toContain('class="hermes-ai-title-row"');
    expect(result).toContain('id="hermes-ai-fullscreen-button"');
    expect(result).toContain('type: "hermes-ai-fullscreen-toggle"');
    expect(result).toContain('event.data?.type === "hermes-ai-fullscreen-state"');
    expect(result).toContain('if (event.key === "Enter")');
    expect(result).toContain("event.stopImmediatePropagation()");
    expect(result).not.toContain("fullscreenExcludedTarget");
    expect(result).toContain("script-src 'unsafe-inline'");
    expect(result).toContain('<header class="hero" data-hermes-date-normalized="true"><span class="pill">July 16, 2026</span><div class="hermes-ai-title-row">');
    expect(result).toContain('<p class="date">2:08pm - America/Los_Angeles</p>');
    expect(result).toContain("margin: 0 0 18px 22px !important");
    expect(result).toContain("border: 1px solid #67e8f9 !important");
    expect(result).not.toContain('class="hermes-player-volume">Volume ');
    expect(result).not.toContain('id="tts-status"');
    expect(result).toContain("HERMES_BRIEFS_EXPORT_MANIFEST");
    expect(result).toContain('"accepted_ui":"v61-date-load-keyboard-focus"');
    expect(result).toContain('"html_self_contained":true');
    expect(result).toContain('href="BRIEFS-AI - 2026-07-15.html"');
    expect(result).toContain('id="hermes-brief-export-navigation-controller"');
    expect(result).toContain('frame.id = "hermes-ai-stable-date-frame"');
    expect(result).toContain("hermes-ai-date-frame-active");
    expect(result).toContain('type: "hermes-ai-export-date-load"');
    expect(result).toContain('type: "hermes-ai-stop-audio"');
    expect(result).toContain("function stopActiveAudio()");
    expect(result).toContain("stopSpeech({ clearHighlight: true })");
    expect(result).toContain("stopActiveAudio();\n    pendingPosition = viewportPosition;");
    expect(result).toContain('type: "hermes-ai-viewport-restore"');
    expect(result).toContain("topicIndex: activeCardIndex");
    expect(result).toContain("if (activeCardIndex === -1) playFounderTakeaways();\n    else speakCurrent();");
    expect(result).toContain("if (event.code === \"Space\" || event.key === \" \" || event.key === \"Spacebar\") return \"toggle\"");
    expect(result).toContain("const activeCardByDate = new Map()");
    expect(result).toContain("activeCardByDate.set(currentDate, viewportPosition.topicIndex)");
    expect(result).toContain("activeCardByDate.get(destinationDate)");
    expect(result).toContain("function restoreActiveCard(topicIndex)");
    expect(result).toContain('target.scrollIntoView({ behavior: "auto", block: "start" })');
    expect(result).toContain("let framesRemaining = 8");
    expect(result).toContain("function focusActiveFrame()");
    expect(result).toContain("target.focus({ preventScroll: true })");
    expect(result).toContain("target.contentWindow?.focus()");
    expect(result).toContain("window.requestAnimationFrame(focusActiveFrame)");
    expect(result).toContain('event.data?.type === "hermes-ai-fullscreen-toggle"');
    expect(result).toContain("await document.documentElement.requestFullscreen()");
    expect(result).toContain("target.src = file");
    expect(result).toContain("frame-src 'self' file:");
    expect(result).not.toContain("window.location.href = destination");
    expect(result).not.toContain("HERMES_BRIEFS_RESTORE_MANIFEST");
    expect(result).not.toContain("v41-restore-safe-exports");
  });

  it("exports a semantic Markdown snapshot from the same transformed archive", () => {
    const previousDomParser = globalThis.DOMParser;
    globalThis.DOMParser = new JSDOM("").window.DOMParser as typeof DOMParser;
    try {
      const markdown = briefDashboardMarkdown(
        '<html><body><header><h1>AI Morning Brief — 2026-07-15</h1></header><main><div class="takeaways"><h2>Founder takeaways</h2><ol><li><strong>1. Keypoint headline</strong> Supporting detail.</li></ol></div><section class="card"><h2>Topic one</h2><p>Topic detail.</p></section></main></body></html>',
        "ai",
      );
      expect(markdown).toContain("# AI Morning Brief");
      expect(markdown).toContain("V34 SEMANTIC EXPORT");
      expect(markdown).toContain("exact commented CSS and JavaScript live inline in the companion self-contained HTML gold master");
      expect(markdown).not.toContain("# AI Morning Brief — 2026-07-15");
      expect(markdown).toContain("## FOUNDER TAKEAWAYS");
      expect(markdown).toContain("### 1. Keypoint headline");
      expect(markdown).toContain("Supporting detail.");
      expect(markdown).toContain("## Topic one");
      expect(markdown).toContain("Topic detail.");
    } finally {
      globalThis.DOMParser = previousDomParser;
    }
  });

  it("exports complete V69 Stock semantics to Markdown", () => {
    const previousDomParser = globalThis.DOMParser;
    globalThis.DOMParser = new JSDOM("").window.DOMParser as typeof DOMParser;
    try {
      const markdown = briefDashboardMarkdown(
        `<!doctype html><html><body><header><h1>Stock Brief — 2026-07-16</h1><p class="date">Los Angeles date: 2026-07-16</p></header><main class="grid">
          <article class="stock-row"><h2>AAPL — Apple Inc.</h2><div class="price">$333.26</div><div class="movement">▲ +$5.76 (+1.76%)</div><dl><div><dt>Day High</dt><dd>$334.68</dd></div><div><dt>Day Low</dt><dd>$326.79</dd></div><div><dt>52-week High</dt><dd>$334.68</dd></div><div><dt>52-week Low</dt><dd>$201.50</dd></div><div><dt>Volume</dt><dd>62,673,782</dd></div></dl></article>
        </main></body></html>`,
        "stock",
      );
      expect(markdown).toContain("**Brief Date:** July 16, 2026 - Thu.");
      expect(markdown).toContain("**SUMMARY:** +$24,603.78");
      expect(markdown).toContain("## Portfolio Position Comparison");
      expect(markdown).toContain("| Position | Shares | Purchased price | CURRENT PRICE | TOTAL +/- | DAY +/- | COST BASIS | CURRENT VALUE | GAIN / LOSS | RETURN |");
      expect(markdown).toContain("| APPLE-1 · AAPL (5/29/24) | 146 | $191.00 | $333.26 | +$142.26 | +$5.76 |");
      expect(markdown).toContain("## AAPL\n### APPLE INC.");
      expect(markdown).not.toContain("Date · July 16, 2026");
      expect(markdown).toContain("Performance · ▲ +$5.76 (+1.76%)");
      expect(markdown).toContain("Price · $333.26");
      expect(markdown).toContain("Day High · $334.68 · Day Low · $326.79 · 52-week High · $334.68 · 52-week Low · $201.50 · Volume · 62,673,782");
      expect(markdown).toContain('\"accepted_ui\":\"v74-ticker-above-company\"');
    } finally {
      globalThis.DOMParser = previousDomParser;
    }
  });

  it("exports one Founder section and exactly seven non-collapsed AI topics with a restore manifest", () => {
    const previousDomParser = globalThis.DOMParser;
    globalThis.DOMParser = new JSDOM("").window.DOMParser as typeof DOMParser;
    try {
      const topics = Array.from({ length: 7 }, (_, index) =>
        `<article class="card"><h2>${index + 1}) Topic ${index + 1}</h2><p>Summary ${index + 1}.</p><p>Action ${index + 1}.</p></article>`,
      ).join("");
      const markdown = briefDashboardMarkdown(
        `<html><body><header><h1>AI Morning Brief</h1></header><main><section class="takeaways"><h2>FOUNDER TAKEAWAYS</h2><ol><li><strong>Founder item</strong><span>Founder detail.</span></li></ol></section><section class="topics">${topics}</section></main></body></html>`,
        "ai",
      );
      expect(markdown.match(/^## FOUNDER TAKEAWAYS$/gm)).toHaveLength(1);
      expect(markdown.match(/^## \d+[.)] Topic \d+$/gm)).toHaveLength(7);
      expect(markdown.match(/^## 1[.)] Topic 1$/gm)).toHaveLength(1);
      expect(markdown).not.toContain("Topic 1 Summary 1. Action 1. 2) Topic 2");
      expect(markdown).toContain("HERMES_BRIEFS_EXPORT_MANIFEST");
      expect(markdown).toContain('"accepted_ui":"v61-date-load-keyboard-focus"');
      expect(markdown).toContain('"html_self_contained":false');
      expect(markdown).toContain('"companion_html_pattern":"BRIEFS-AI - YYYY-MM-DD.html"');
      expect(markdown).not.toContain("HERMES_BRIEFS_RESTORE_MANIFEST");
      expect(markdown).not.toContain("v41-restore-safe-exports");
    } finally {
      globalThis.DOMParser = previousDomParser;
    }
  });

  it("exports Stock with the shared date pill, undated title, dynamic time, archive-date links, and no player", () => {
    const result = briefDashboardHtml(
      '<html><head><title>Stock Brief</title></head><body><header><h1>Stock Brief — 2026-07-15</h1><p class="sub">America/Los_Angeles date: 2026-07-15 · Live web quote snapshot · USD</p></header><main><section class="card"><h2>AAPL — Apple</h2><p>$210.00</p></section></main></body></html>',
      "stock",
      "2026-07-15",
      ["2026-07-15", "2026-07-14"],
      1_784_236_080,
    );

    expect(result).toContain('<span id="hermes-stock-date-pill" data-hermes-stock-date-pill="true" class="pill" role="status" aria-label="Stock brief date: July 15, 2026 - Wed."');
    expect(result).not.toContain('style="display:inline-block !important;visibility:visible !important;position:static !important;');
    expect(result).toContain("html body .hero .pill, html body header .pill { display: inline-block !important; visibility: visible !important; position: static !important;");
    expect(result).toContain("opacity: 1 !important; clip: auto !important; clip-path: none !important; transform: none !important; overflow: visible !important;");
    expect(result).toContain("<h1>Stock Brief</h1>");
    expect(result).not.toContain("<h1>Stock Brief — 2026-07-15</h1>");
    expect(result).toContain('<p class="date">2:08pm - America/Los_Angeles</p>');
    expect(result).toContain('href="BRIEFS-STOCKS - 2026-07-14.html"');
    expect(result).toContain('const VIEWPORT_HASH_PREFIX = "#hermes-stock-viewport="');
    expect(result).toContain("position: captureViewportPosition()");
    expect(result).toContain("window.scrollTo(targetX, targetY)");
    expect(result).toContain('document.querySelectorAll("#hermes-brief-export-shell a[href]")');
    expect(result).toContain("navigate(event.data.direction, event.data.position)");
    expect(result).toContain("background: linear-gradient(135deg, #10182f, #0b1020)");
    expect(result).toContain('[aria-current="date"] { border-color: #ffd166; background: #ffd166; color: #0b1020;');
    expect(result).toContain('"accepted_ui":"v74-ticker-above-company"');
    expect(result).not.toContain('id="hermes-stock-date-nav-controller"');
    expect(result).not.toContain('id="hermes-brief-player-controller"');
    expect(result).not.toContain('id="hermes-brief-player"');
  });

  it("renders the yellow date pill from the exact live July 16 header shape", () => {
    const result = prepareBriefPreviewHtml(
      `<!doctype html><html><head><title>Stock Brief</title></head><body><header>
        <div>
          <h1>Stock Brief</h1>
          <p>Gain/Loss</p>
          <div class="sub">Los Angeles date: 2026-07-16 · Generated at 2026-07-16T19:11:31-07:00 · End-of-day regular-market snapshot after the U.S. close · USD</div>
        </div>
      </header><main aria-label="Tracked stock quote rows"><section class="card"><h2>AAPL — Apple Inc.</h2><strong class="price">$333.26</strong></section></main></body></html>`,
      "stock",
      1_784_293_891,
    );
    const dom = new JSDOM(result);
    const pill = dom.window.document.querySelector<HTMLElement>("#hermes-stock-date-pill");

    expect(pill?.textContent).toBe("July 16, 2026 - Thu.");
    expect(pill?.getAttribute("aria-label")).toBe("Stock brief date: July 16, 2026 - Thu.");
    expect(pill?.getAttribute("style")).toBeNull();
    expect(result).toContain("html body .hero .pill, html body header .pill { display: inline-block !important; visibility: visible !important;");
    expect(result).toContain('<p class="date">6:11am - America/Los_Angeles</p>');
    expect(result).toContain("Yahoo Finance snapshot generated at end-of-day after U.S. close · $USD");
    expect(result).not.toContain("Snapshot generated end-of-day after U.S. close · $USD");
    expect(result).not.toContain("Los Angeles date: 2026-07-16");
    expect(result).not.toContain("Generated at 2026-07-16T19:11:31-07:00");
    expect(result).toContain("<h1>Stock Brief</h1>");
    expect(result).toContain("Portfolio Position Comparison");
    expect(result.match(/id="hermes-portfolio-comparison"/g)).toHaveLength(1);
    expect(result).not.toContain('id="hermes-brief-player"');
  });

  it("adds one Stock header summary from the portfolio total without changing CSV bytes", () => {
    const stockHtml = `<!doctype html><html><head><title>Stock Brief</title></head><body><header>
      <h1>Stock Brief — 2026-07-16</h1><p class="date">Los Angeles date: 2026-07-16</p>
    </header><main aria-label="Tracked stock quote rows">
      <article class="stock-row"><h2>AAPL — Apple Inc.</h2><div class="price">$333.26</div></article>
      <article class="stock-row"><h2>AMZN — Amazon.com Inc.</h2><div class="price">$242.71</div></article>
      <article class="stock-row"><h2>NVDA — NVIDIA Corp.</h2><div class="price">$191.55</div></article>
      <article class="stock-row"><h2>SNAP — Snap Inc.</h2><div class="price">$4.75</div></article>
      <article class="stock-row"><h2>GOOGL — Alphabet Inc.</h2><div class="price">$195.40</div></article>
      <article class="stock-row"><h2>MSFT — Microsoft Corp.</h2><div class="price">$512.31</div></article>
      <article class="stock-row"><h2>DIS — Walt Disney Co.</h2><div class="price">$121.44</div></article>
    </main></body></html>`;
    const csvBefore = stockPortfolioCsv(stockHtml, "2026-07-16");
    const result = prepareBriefPreviewHtml(stockHtml, "stock", 1_784_293_891);
    const dom = new JSDOM(result);
    const summary = dom.window.document.querySelector("#hermes-stock-portfolio-summary");
    const comparisonTotal = dom.window.document.querySelector("#hermes-portfolio-comparison tfoot td:nth-last-child(2)");

    expect(summary).not.toBeNull();
    expect(summary?.querySelector(".hermes-stock-summary-label")?.textContent).toBe("SUMMARY");
    expect(summary?.querySelector(".hermes-stock-summary-value")?.textContent).toBe(comparisonTotal?.textContent);
    expect(result).toContain(".hermes-stock-summary-value { display: block !important; font-size: clamp(36px, 4.45vw, 56.96px) !important; line-height: 1.05 !important; font-weight: 400 !important;");
    expect(result).toContain("@media (max-width: 900px)");
    expect(result).toContain(".hermes-stock-summary-stack { width: 100% !important; align-items: flex-start !important;");
    expect(result).not.toContain(".hermes-stock-summary-value { display: block !important; font-size: 64px !important;");
    expect(result).not.toContain(".hermes-stock-summary-value { display: block !important; font-size: 56.96px !important; line-height: 1.05 !important; font-weight: 850 !important;");
    expect(result.match(/id="hermes-stock-portfolio-summary"/g)).toHaveLength(1);
    expect(stockPortfolioCsv(stockHtml, "2026-07-16")).toBe(csvBefore);
  });

  it("repairs historical Stock headers that have a fullscreen button but no canonical title wrapper", () => {
    const quoteRows = [
      ["AAPL", "$333.26"], ["AMZN", "$242.71"], ["NVDA", "$191.55"], ["SNAP", "$4.75"],
      ["GOOGL", "$195.40"], ["MSFT", "$512.31"], ["DIS", "$121.44"],
    ].map(([ticker, price]) => `<article class="stock-row"><h2>${ticker} — Company</h2><div class="price">${price}</div></article>`).join("");
    const historical = `<!doctype html><html><body><header><h1>Stock Brief — 2026-07-16</h1><button id="hermes-stock-fullscreen-button" type="button">old fullscreen</button><p class="date">Los Angeles date: 2026-07-16</p></header><main aria-label="Tracked stock quote rows">${quoteRows}</main></body></html>`;
    const result = prepareBriefPreviewHtml(historical, "stock", 1_784_293_891);
    const dom = new JSDOM(result);
    const titleRow = dom.window.document.querySelector(".hermes-stock-title-row");

    expect(titleRow).not.toBeNull();
    expect(titleRow?.querySelectorAll("#hermes-stock-fullscreen-button")).toHaveLength(1);
    expect(dom.window.document.querySelector("#hermes-stock-portfolio-summary .hermes-stock-summary-label")?.textContent).toBe("SUMMARY");
  });

  it("injects a dashboard-owned player for card-only AI archives", () => {
    const result = prepareBriefPreviewHtml(
      "<!doctype html><html><body><section><h2>Founder takeaways</h2><p>Summary</p></section><section><h2>First topic</h2><p>Detail</p></section></body></html>",
      "ai",
    );

    expect(result).toContain('player.id = "hermes-brief-player"');
    expect(result).toContain('id="tts-volume"');
    expect(result).toContain("ensureHermesPlayer");
    expect(result).toContain("main article, main section, article, section");
  });

  it("starts ArrowUp playback at founder takeaways, keeps topic headlines yellow, and removes tactical agendas", () => {
    const result = prepareBriefPreviewHtml(
      `<!doctype html><html><body><main><div class="takeaways"><h2>Founder takeaways</h2><ol><li>Start here.</li></ol></div><section><h2>First topic</h2><p>Detail</p></section><section class="agenda"><h2>Today’s tactical agenda</h2><p>Remove this.</p></section></main></body></html>`,
      "ai",
    );

    expect(result).toContain('founderTakeaways = document.querySelector(".takeaways")');
    expect(result).toContain('if (card.classList.contains("takeaways")) return takeawaySpeechText(card);');
    expect(result).toContain('playFounderTakeaways()');
    expect(result).toContain('.hermes-playable-card h2, .hermes-playable-card h3 { color: var(--hot, #ffd166) !important; }');
    expect(result).not.toContain("Today’s tactical agenda");
    expect(result).not.toContain("Remove this.");
  });

  it("counts all seven numbered sibling topics instead of counting their shared section as one card", () => {
    const topics = Array.from({ length: 7 }, (_, index) =>
      `<h3>${index + 1}) Topic ${index + 1}</h3><p>Detail ${index + 1}</p>`,
    ).join("");
    const result = prepareBriefPreviewHtml(
      `<!doctype html><html><body><main><div class="takeaways"><h2>Founder takeaways</h2></div><section><h2>What changed</h2>${topics}</section></main></body></html>`,
      "ai",
    );

    expect(result).toContain('function isNumberedTopicHeading(element)');
    expect(result).toContain('function wrapSiblingTopic(heading)');
    expect(result).toContain('document.querySelectorAll("main h2, main h3, body > h2, body > h3")');
    expect(result).toContain('statusElement.textContent = "Topic " + (index + 1) + " of " + cards.length + state');
  });

  it("does not add portfolio comparisons to AI briefs", () => {
    const result = prepareBriefPreviewHtml(
      "<!doctype html><html><body><h2>AAPL — Apple $312.59</h2></body></html>",
      "ai",
    );

    expect(result).not.toContain('id="hermes-portfolio-comparison"');
  });

  it("recognizes only the requested global player shortcuts", () => {
    expect(isBriefPlayerShortcut(" ")).toBe(true);
    expect(isBriefPlayerShortcut("Spacebar")).toBe(true);
    expect(isBriefPlayerShortcut("ArrowLeft")).toBe(true);
    expect(isBriefPlayerShortcut("ArrowRight")).toBe(true);
    expect(isBriefPlayerShortcut("ArrowUp")).toBe(true);
    expect(isBriefPlayerShortcut("ArrowDown")).toBe(false);
    expect(isBriefPlayerShortcut("Enter")).toBe(false);
  });

  it("starts first previous or next navigation on topic one before advancing", () => {
    const result = prepareBriefPreviewHtml(
      '<html><body><main><article class="card"><h2>1) One</h2></article><article class="card"><h2>2) Two</h2></article></main></body></html>',
      "ai",
    );

    expect(result).toContain("let navigationStarted = false");
    expect(result).toContain("navigationStarted = true");
  });

  it("starts silently on Founder Takeaways, plays it on first Space, and visibly navigates cards", () => {
    const result = prepareBriefPreviewHtml(
      '<html><body><main><section class="takeaways"><h2>FOUNDER TAKEAWAYS</h2><ol><li><strong>Start here</strong><span>Founder detail.</span></li></ol></section><section class="topics"><article class="card"><h2>1. One</h2><p>First.</p></article><article class="card"><h2>2. Two</h2><p>Second.</p></article></section></main></body></html>',
      "ai",
    );
    const dom = new JSDOM(result, { runScripts: "outside-only", url: "http://localhost" });
    const spoken: string[] = [];
    const scrolled: string[] = [];
    Object.defineProperty(dom.window, "speechSynthesis", { configurable: true, value: {
      cancel: () => undefined, speak: (utterance: { text: string }) => spoken.push(utterance.text),
      getVoices: () => [{ name: "Samantha", lang: "en-US", localService: true }], pause: () => undefined, resume: () => undefined,
    }});
    Object.defineProperty(dom.window, "SpeechSynthesisUtterance", { configurable: true, value: class {
      text: string; volume = 1; voice = null; lang = ""; pitch = 1; rate = 1; onend = null; onerror = null;
      constructor(text: string) { this.text = text; }
    }});
    Object.defineProperty(dom.window, "ResizeObserver", { configurable: true, value: class { observe() {} } });
    Object.defineProperty(dom.window.HTMLElement.prototype, "scrollIntoView", { configurable: true, value(this: HTMLElement) {
      scrolled.push(this.querySelector("h2")?.textContent?.trim() || this.className);
    }});
    const controller = dom.window.document.querySelector("#hermes-brief-player-controller")?.textContent ?? "";
    dom.window.eval(controller);
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));

    const activeHeading = () => dom.window.document.querySelector('[aria-current="true"] h2')?.textContent?.trim();
    expect(activeHeading()).toBe("FOUNDER TAKEAWAYS");
    expect(spoken).toHaveLength(0);
    dom.window.document.body.dispatchEvent(new dom.window.KeyboardEvent("keydown", { code: "Space", key: " ", bubbles: true, cancelable: true }));
    expect(spoken[0]).toContain("FOUNDER TAKEAWAYS");
    dom.window.document.body.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect(activeHeading()).toBe("1. One");
    expect(scrolled.at(-1)).toBe("1. One");
    dom.window.document.body.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect(activeHeading()).toBe("2. Two");
    dom.window.document.body.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect(activeHeading()).toBe("1. One");
    dom.window.document.body.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }));
    expect(activeHeading()).toBe("2. Two");
    dom.window.document.body.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    expect(activeHeading()).toBe("FOUNDER TAKEAWAYS");
    expect(scrolled.at(-1)).toBe("FOUNDER TAKEAWAYS");
  });

  it("captures reserved player shortcuts from initially focused buttons but not text editors", () => {
    const dom = new JSDOM('<button id="selected-date">2026-07-16</button><a id="download">HTML</a><input id="filter"><textarea id="notes"></textarea><div id="editor" contenteditable="true"></div>');
    const document = dom.window.document;

    expect(isBriefPlayerTextEditingTarget(document.getElementById("selected-date"))).toBe(false);
    expect(isBriefPlayerTextEditingTarget(document.getElementById("download"))).toBe(false);
    expect(isBriefPlayerTextEditingTarget(document.getElementById("filter"))).toBe(true);
    expect(isBriefPlayerTextEditingTarget(document.getElementById("notes"))).toBe(true);
    expect(isBriefPlayerTextEditingTarget(document.getElementById("editor"))).toBe(true);
  });

  it("gives every active playable topic an explicit visual highlight", () => {
    const result = prepareBriefPreviewHtml(
      '<html><body><main><div class="takeaways"><h2>Founder takeaways</h2></div><section><h2>Topic 1</h2></section><section><h2>Topic 5</h2></section></main></body></html>',
      "ai",
    );
    expect(result).toContain(".hermes-playable-card.active");
    expect(result).toContain('card.classList.toggle("active", active)');
  });

  it("uses a compact Apple-like AI hierarchy without labels or header summary", () => {
    const result = prepareBriefPreviewHtml(`<!doctype html><html><head><style>
      body { font: 16px/1.55 system-ui; max-width: 1000px; background: #f5f7fb; color: #182033; }
      header, .takeaways, .card { background: white; }
    </style></head><body>
      <header class="hero"><span class="pill">AI Morning Brief</span><div class="tag">Legacy label</div><h1>AI Morning Brief — 2026-07-16</h1><p class="date">July 16, 2026 · America/Los_Angeles</p><p class="meta">For founders and operators · Regulation, implementation, model economics, open weights, infrastructure, monetization, and safety.</p></header>
      <section class="takeaways"><h2>Founder takeaways</h2><ol><li>Readable title.</li></ol></section>
      <section class="topics"><article class="card"><h2>1) Topic</h2><p>Body copy.</p></article></section>
    </body></html>`, "ai", 1_784_214_000);

    expect(result).toContain('id="hermes-ai-restored-style"');
    expect(result).not.toContain('<div class="tag">AI Morning Brief</div>');
    expect(result).toContain('<span class="pill">July 16, 2026</span>');
    expect(result).toContain('data-hermes-date-normalized="true"');
    expect(result).not.toContain('<div class="tag">Legacy label</div>');
    expect(result).toContain("<h1>AI Morning Brief</h1>");
    expect(result).not.toContain("<h1>AI Morning Brief — 2026-07-16</h1>");
    expect(result).toContain('<p class="date">8am - America/Los_Angeles</p>');
    expect(result).not.toContain("For founders and operators");
    expect(result).toContain("background: #0b1020 !important");
    expect(result).toContain("--card: #121a33");
    expect(result).toContain("linear-gradient(135deg, #182345, #10182f)");
    expect(result).toContain("border: 1px solid #263456 !important");
    expect(result).toContain("border-radius: 22px !important");
    expect(result).toContain("letter-spacing: .015em !important");
    expect(result).toContain("content: none !important");
    expect(result).toContain("html body .hero .tag");
    expect(result).toContain("color: #eef3ff !important");
    expect(result).toContain("padding: 22px 26px !important");
    expect(result).toContain("padding: 24px !important");
    expect(result).toContain("font-size: 38px !important");
    expect(result).toContain("color: #ffd166 !important");
    expect(result).toContain("font-size: 42px !important");
    expect(result).toContain("font-size: 36px !important");
    expect(result).toContain("line-height: 1.34 !important");
    expect(result).toContain("margin: 0 0 10px !important");
    expect(result).toContain("padding-left: 1.5em !important");
    expect(result).toContain(".hermes-playable-card:not(.takeaways)");
    expect(result).toContain("function normalizeAiVisualStructure()");
    expect(result).toContain('document.querySelectorAll(".tag").forEach((label) => label.remove())');
    expect(result).toContain('document.querySelector(".hero, body > header, body > main > header, .wrap > header, header")');
    expect(result).toContain('const dateParagraph = header.querySelector(".date")');
    expect(result).toContain('const dateLine = dateParagraph?.textContent?.trim()');
    expect(result).toContain('const alreadyNormalized = header.dataset.hermesDateNormalized === "true"');
    expect(result).toContain('if (dateLine && !alreadyNormalized)');
    expect(result).toContain('const [pillDate, ...metadataParts] = dateLine.split("·").map((part) => part.trim())');
    expect(result).toContain('if (pillDate && pill) pill.textContent = pillDate');
    expect(result).not.toContain('header.querySelectorAll("p").forEach((paragraph) => paragraph.remove())');
    const runtimeStart = result.indexOf("function normalizeAiVisualStructure()");
    const runtimeEnd = result.indexOf("function isNumberedTopicHeading", runtimeStart);
    const runtimeNormalizer = result.slice(runtimeStart, runtimeEnd);
    const runtimeDom = new JSDOM(result, { runScripts: "outside-only" });
    runtimeDom.window.document.body.insertAdjacentHTML("afterbegin", '<nav id="hermes-brief-player"><div class="hermes-player-shell"></div></nav>');
    runtimeDom.window.eval(`${runtimeNormalizer}; normalizeAiVisualStructure(); ensureDateNavigator();`);
    const runtimeHero = runtimeDom.window.document.querySelector(".hero");
    const runtimePlayer = runtimeDom.window.document.querySelector("#hermes-brief-player");
    expect(runtimeHero?.querySelector(".pill")?.textContent).toBe("July 16, 2026");
    expect(runtimeHero?.querySelector(".hermes-date-nav")).toBeNull();
    expect(runtimePlayer?.querySelector(".hermes-date-nav-label")?.textContent).toBe("July 16, 2026");
    expect(runtimePlayer?.querySelector(".hermes-date-nav")?.children[0]?.id).toBe("hermes-date-newer");
    expect(runtimePlayer?.querySelector(".hermes-date-nav")?.children[1]?.className).toBe("hermes-date-nav-label");
    expect(runtimePlayer?.querySelector(".hermes-date-nav")?.children[2]?.id).toBe("hermes-date-older");
    expect(runtimePlayer?.querySelector("#hermes-date-newer")?.getAttribute("aria-label")).toBe("Load newer cron date");
    expect(runtimePlayer?.querySelector("#hermes-date-older")?.getAttribute("aria-label")).toBe("Load older cron date");
    expect(runtimeHero?.querySelector(".date")?.textContent).toBe("8am - America/Los_Angeles");
    expect(runtimeHero?.querySelector(".meta")).toBeNull();
    expect(result).toContain("max-width: none !important");
    expect(result).toContain("margin: 0 0 18px 22px !important");
    expect(result).toContain("gap: 18px !important");
    expect(result).toContain("top: 50% !important");
    expect(result).toContain("left: 50% !important");
    expect(result).toContain("transform: translate(-50%, -50%) !important");
    expect(result).toContain("min-height: 42px !important");
    expect(result).toContain("#hermes-brief-player .hermes-date-nav-label { display: inline-flex !important; min-height: 42px !important; align-items: center !important; padding: 0 16px !important; border-radius: 999px !important; background: #67e8f9 !important; color: #07111f !important;");
    expect(result).toContain("#hermes-brief-player .hermes-date-nav button { width: 42px !important; height: 42px !important; min-width: 42px !important; min-height: 42px !important; margin: 0 !important; border: 1px solid #67e8f9 !important;");
    expect(result).toContain("<strong>Readable title.</strong>");
    expect(result).toContain(".takeaways li > strong:first-child");
  });

  it("reads every visible text block in a numbered topic card, not only its title", () => {
    const result = prepareBriefPreviewHtml(
      '<html><body><main><article class="card"><h2>1) Complete topic</h2><p>Summary text.</p><p>Why it matters text.</p><p>Actionable implication text.</p><p class="sources">Source citation.</p></article></main></body></html>',
      "ai",
    );
    const textForStart = result.indexOf("function textFor(card)");
    const textForEnd = result.indexOf("function configureNaturalVoice", textForStart);
    const textForSource = result.slice(textForStart, textForEnd);
    const runtimeDom = new JSDOM('<article class="card"><h2>1) Complete topic</h2><p>Summary text.</p><p>Why it matters text.</p><p>Actionable implication text.</p><p class="sources">Source citation.</p></article>', { runScripts: "outside-only" });
    const spoken = runtimeDom.window.eval(`(() => { ${textForSource}; return textFor(document.querySelector(".card")); })()`);

    expect(spoken).toContain("1) Complete topic");
    expect(spoken).toContain("Summary text.");
    expect(spoken).toContain("Why it matters text.");
    expect(spoken).toContain("Actionable implication text.");
    expect(spoken).not.toContain("Source citation.");
  });

  it("selects a natural English female voice and rejects macOS novelty voices", () => {
    const result = prepareBriefPreviewHtml(
      '<html><body><main><article class="card"><h2>1) Voice test</h2><p>Natural speech.</p></article></main></body></html>',
      "ai",
    );

    expect(result).toContain("preferredVoiceNames");
    expect(result).toContain("blockedVoiceNames");
    expect(result).toContain("utterance.voice = selectedVoice");
    expect(result).toContain("utterance.pitch = 1");
    expect(result).toContain("utterance.rate = playbackRate");
    expect(result).toContain("return Boolean(selectedVoice)");
    expect(result).not.toContain("usableVoices.find((voice) => voice.localService)");
    expect(result).not.toContain("usableVoices[0]");
    expect(result).toContain("function speakWhenNaturalVoiceReady(utterance, attempt = 0)");
    expect(result).toContain("if (configureNaturalVoice(utterance))");
    expect(result).toContain('statusElement.textContent = "Natural voice unavailable"');
    expect(result).toContain("window.setTimeout(() => speakWhenNaturalVoiceReady(utterance, attempt + 1), 100)");
    expect(result).toContain("synth.cancel();\n    synth.getVoices();");
    expect(result).not.toContain("configureNaturalVoice(utterance);\n    utterance.onend");
    expect(result).toContain("utterance.rate = playbackRate");
  });

  it("opens external source links in a normal new window and preserves internal links", () => {
    const result = prepareBriefPreviewHtml(
      '<html><body><main><article><h2>1. Topic</h2><p class="sources">Sources: <a href="https://techcrunch.com/story" target="_self" rel="nofollow">TechCrunch</a> · <a href="/local">Local</a></p></article></main></body></html>',
      "ai",
    );
    expect(result).toContain('<a href="https://techcrunch.com/story" target="_blank" rel="noopener noreferrer">TechCrunch</a>');
    expect(result).toContain('<a href="/local">Local</a>');
    expect(result).not.toContain('target="_self"');
  });

  it("uses a non-overlapping two-row mobile player layout", () => {
    const result = prepareBriefPreviewHtml('<html><body><main><article><h2>1. Topic</h2></article></main></body></html>', "ai");
    expect(result).toContain("grid-template-columns: repeat(3, auto) minmax(96px, 1fr) !important;");
    expect(result).toContain("grid-column: 1 / -1 !important; grid-row: 2 !important;");
    expect(result).toContain("position: static !important;");
    expect(result).toContain("max-width: 160px !important;");
  });

  it("allows trusted inline controls and external-source popups without granting same-origin access", () => {
    expect(BRIEF_PREVIEW_SANDBOX).toBe("allow-scripts allow-popups allow-popups-to-escape-sandbox");
    expect(BRIEF_PREVIEW_SANDBOX).not.toContain("allow-same-origin");
  });

  it("focuses the iframe and its window after the preview loads", () => {
    let iframeFocused = false;
    let windowFocused = false;
    const iframe = {
      focus: () => {
        iframeFocused = true;
      },
      contentWindow: {
        focus: () => {
          windowFocused = true;
        },
      },
    } as unknown as HTMLIFrameElement;

    focusBriefPreview(iframe);

    expect(iframeFocused).toBe(true);
    expect(windowFocused).toBe(true);

    const briefsPage = readFileSync(new URL("../pages/BriefsPage.tsx", import.meta.url), "utf8");
    expect(briefsPage).toContain('previewRef.current?.contentWindow?.postMessage(\n        { type: BRIEF_PLAYER_MESSAGE_TYPE, command },\n        "*",\n      );\n      if (previewRef.current) focusBriefPreview(previewRef.current);');
  });

  it("uses the full Takeaways width and exactly one cyan-or-yellow card border", () => {
    const result = prepareBriefPreviewHtml(
      '<html><body><main><section class="takeaways"><h2>Founder Takeaways</h2><ol><li><strong>One</strong><div><p>Detail.</p></div></li></ol></section><section class="card"><h2>1. Topic</h2><p>Body.</p></section></main></body></html>',
      "ai",
    );

    expect(result).toContain(".takeaways ol, .hermes-playable-card.takeaways ol { box-sizing: border-box !important; width: 100% !important; max-width: none !important;");
    expect(result).toContain(".takeaways li, .hermes-playable-card.takeaways li { box-sizing: border-box !important; width: 100% !important; max-width: none !important;");
    expect(result).toContain(".takeaways li > *, .hermes-playable-card.takeaways li > * { box-sizing: border-box !important; width: 100% !important; max-width: none !important;");
    expect(result).not.toContain("border-inline: 1px solid #67e8f9");
    expect(result).toContain("border: 1px solid #67e8f9 !important");
    expect(result).toContain("border-color: #ffd166 !important");
    expect(result).toContain("box-shadow: none !important");
    expect(result).not.toContain("rgba(255, 209, 102, .38)");
    expect(result).toContain("body .hermes-topic-container { border: 0 !important;");
    expect(result).toContain("font-size: 36px !important; font-weight: 400 !important; line-height: 1.34 !important;");
    expect(result).toContain("font-size: 42px !important; font-weight: 700 !important; line-height: 1.16 !important;");
    expect(result).toContain("max-width: min(92ch, 100%) !important;");
    expect(result).toContain("text-align: left !important; text-align-last: auto !important;");
    expect(result).toContain("text-wrap: pretty !important; word-spacing: normal !important;");
    expect(result).not.toContain("text-align-last: justify !important;");
    const hoverFocusRule = result.indexOf('.card[role="button"]:hover');
    const activeInteractionRule = result.indexOf(".hermes-playable-card.active:hover");
    expect(hoverFocusRule).toBeGreaterThan(-1);
    expect(activeInteractionRule).toBeGreaterThan(hoverFocusRule);
    expect(result.slice(activeInteractionRule, activeInteractionRule + 520)).toContain("border-color: #ffd166 !important");
    expect(result.slice(activeInteractionRule, activeInteractionRule + 520)).toContain("outline: none !important");
  });

  it("wraps raw and element-backed Takeaway details into one full-width runtime target", () => {
    const result = prepareBriefPreviewHtml(
      '<html><body><main><section class="takeaways"><h2>Founder Takeaways</h2><ol><li><strong>Raw title</strong> Raw detail.</li><li><strong>Nested title</strong><div><p>Nested detail.</p></div></li></ol></section><section class="card"><h2>1. Topic</h2><p>Body.</p></section></main></body></html>',
      "ai",
    );
    const helperStart = result.indexOf("function normalizeTakeawayDetails");
    const helperEnd = result.indexOf("function ensureDateNavigator", helperStart);
    const helperSource = result.slice(helperStart, helperEnd);
    const runtimeDom = new JSDOM('<main><section class="takeaways"><ol><li id="raw"><strong>Raw title</strong> Raw detail.</li><li id="nested"><strong>Nested title</strong><div><p>Nested detail.</p></div></li></ol></section></main>', { runScripts: "outside-only" });
    const details = runtimeDom.window.eval(`(() => { ${helperSource}; normalizeTakeawayDetails(); return ["raw", "nested"].map((id) => { const item = document.getElementById(id); const detail = item.querySelector(":scope > .hermes-takeaway-detail"); return { tag: detail?.tagName, text: detail?.textContent.trim(), count: item.querySelectorAll(":scope > .hermes-takeaway-detail").length }; }); })()`);

    expect(details).toEqual([
      { tag: "SPAN", text: "Raw detail.", count: 1 },
      { tag: "DIV", text: "Nested detail.", count: 1 },
    ]);
    expect(result).toContain("normalizeTakeawayDetails();");
    expect(result).toContain(".takeaways .hermes-takeaway-detail");
  });

  it("writes cyan or yellow directly onto the exact card with inline important priority", () => {
    const result = prepareBriefPreviewHtml(
      '<html><body><main><section><h2>1. One</h2><p>First.</p><h2>2. Two</h2><p>Second.</p></section></main></body></html>',
      "ai",
    );
    const helperStart = result.indexOf("function applyCardVisualState");
    const helperEnd = result.indexOf("function mark(", helperStart);
    const helperSource = result.slice(helperStart, helperEnd);
    const runtimeDom = new JSDOM('<main><section id="one"></section><section id="two"></section></main>', { runScripts: "outside-only" });
    const states = runtimeDom.window.eval(`(() => { ${helperSource}; const one = document.querySelector("#one"); const two = document.querySelector("#two"); applyCardVisualState(one, true); applyCardVisualState(two, false); return [one, two].map((card) => ({ border: card.style.getPropertyValue("border-color"), borderPriority: card.style.getPropertyPriority("border-color"), outline: card.style.getPropertyValue("outline"), outlinePriority: card.style.getPropertyPriority("outline") })); })()`);

    expect(states).toEqual([
      { border: "rgb(255, 209, 102)", borderPriority: "important", outline: "none", outlinePriority: "important" },
      { border: "rgb(103, 232, 249)", borderPriority: "important", outline: "none", outlinePriority: "important" },
    ]);
    expect(result).toContain("applyCardVisualState(card, active);");
  });

  it("builds separately queued Takeaway number-title and detail segments", () => {
    const result = prepareBriefPreviewHtml(
      '<html><body><main><section class="takeaways"><h2>Founder Takeaways</h2><ol><li><strong>Build carefully</strong><p>Detail follows</p></li><li><strong>Measure outcomes</strong><p>Second detail</p></li></ol></section><article><h2>1. Topic</h2></article></main></body></html>',
      "ai",
    );
    const helperStart = result.indexOf("function sentenceForSpeech");
    const helperEnd = result.indexOf("function configureNaturalVoice", helperStart);
    const helperSource = result.slice(helperStart, helperEnd);
    const runtimeDom = new JSDOM('<section class="takeaways"><h2>Founder Takeaways</h2><ol><li><strong>Build carefully</strong><p>Detail follows</p></li><li><strong>Measure outcomes</strong><p>Second detail</p></li></ol></section>', { runScripts: "outside-only" });
    const segments = runtimeDom.window.eval(`(() => { ${helperSource}; return takeawaySpeechSegments(document.querySelector(".takeaways")); })()`);

    expect(segments).toEqual([
      { text: "Founder Takeaways.", pauseAfter: 300 },
      { text: "Takeaway 1. Build carefully.", pauseAfter: 500 },
      { text: "Detail follows.", pauseAfter: 350 },
      { text: "Takeaway 2. Measure outcomes.", pauseAfter: 500 },
      { text: "Second detail.", pauseAfter: 350 },
    ]);
    expect(result).toContain("function speakTakeawayQueue(segments, segmentIndex, queueToken)");
    expect(result).toContain("segment.pauseAfter");
  });

  it("splits a real shared-section shape into sibling cards without nested play buttons", () => {
    const result = prepareBriefPreviewHtml(
      '<html><body><main><section class="card"><h2>1. One</h2><p>First.</p><h2>2. Two</h2><p>Second.</p><h2>3. Three</h2><p>Third.</p></section></main></body></html>',
      "ai",
    );
    const helperStart = result.indexOf("function isNumberedTopicHeading");
    const helperEnd = result.indexOf("function controls()", helperStart);
    const helperSource = result.slice(helperStart, helperEnd);
    const runtimeDom = new JSDOM('<main><section class="card"><h2>1. One</h2><p>First.</p><h2>2. Two</h2><p>Second.</p><h2>3. Three</h2><p>Third.</p></section></main>', { runScripts: "outside-only", url: "https://briefs.test/" });
    const cards = runtimeDom.window.eval(`(() => { ${helperSource}; return playableCards(); })()`);
    const parent = runtimeDom.window.document.querySelector("main > section");

    expect(cards).toHaveLength(3);
    expect(cards.map((card: Element) => card.querySelector("h2")?.textContent)).toEqual(["1. One", "2. Two", "3. Three"]);
    expect(cards.some((card: Element) => cards.some((other: Element) => card !== other && card.contains(other)))).toBe(false);
    expect(parent?.classList.contains("hermes-topic-container")).toBe(true);
  });

  it("selects, focuses, scrolls, highlights, and speaks the exact clicked card", () => {
    const result = prepareBriefPreviewHtml(
      '<html><body><main><section><h2>1. One</h2><p>First.</p><h2>2. Two</h2><p>Second.</p></section></main></body></html>',
      "ai",
    );

    expect(result).toContain("event.stopPropagation();");
    expect(result).toContain("const selectedCard = event.currentTarget;");
    expect(result).toContain("const selectedIndex = cards.indexOf(selectedCard);");
    expect(result).toContain("selectedCard.focus({ preventScroll: true });");
    expect(result).toContain('card.scrollIntoView({ behavior: options.behavior || "smooth", block: "start" });');
    expect(result).not.toContain('founderTakeaways.scrollIntoView({ behavior: "smooth", block: "start" });');
    expect(result).not.toContain("selectAndPlay(cardIndex);");
  });

  it("locks the restored AI-focus and accepted Stock JavaScript controllers byte-for-byte", () => {
    const source = readFileSync(new URL("./briefs.ts", import.meta.url), "utf8");
    const digest = (name: string) => {
      const body = source.match(new RegExp("const " + name + "\\s*=\\s*`([\\s\\S]*?)`;"))?.[1];
      expect(body, `${name} must remain present`).toBeDefined();
      return createHash("sha256").update(body!).digest("hex");
    };
    expect(digest("PLAYER_CONTROLLER")).toBe("7db82e65094935166737e6b2706d625e75594aeb822c04edcf46fa5d5e251962");
    expect(digest("STOCK_INTERACTION_CONTROLLER")).toBe("e0546580a1abea8dc67dbb72d23e958694ee51a94049600356eb9e882e24f732");
  });

  it("preserves the accepted V25 AI computed visual contract after canonicalization", () => {
    const source = '<!doctype html><html><head></head><body><main><header class="hero"><span class="pill">July 18, 2026</span><h1>AI Morning Brief</h1><p class="date">July 18, 2026 · America/Los_Angeles</p></header><section class="takeaways"><h2>FOUNDER TAKEAWAYS</h2><ol><li><strong>Founder point</strong><span class="takeaway-detail">Founder detail.</span></li></ol></section><section class="topics"><article class="card"><h2>1. Topic</h2><p><span class="label">Summary:</span> Detail.</p><p class="sources"><span class="label">Sources:</span> <a href="https://example.com">Source</a></p></article></section></main></body></html>';
    const document = new JSDOM(prepareBriefPreviewHtml(source, "ai", 1_784_400_000, "2026-07-18")).window.document;
    const style = (selector: string) => document.defaultView!.getComputedStyle(document.querySelector(selector)!);
    expect(document.querySelector("#hermes-v25-ai-base-style")).not.toBeNull();
    expect(style(".takeaway-detail").display).toBe("block");
    expect(style(".takeaway-detail").fontSize).toBe("27px");
    expect(style(".takeaway-detail").marginTop).toBe("7px");
    expect(style(".topics").marginTop).toBe("22px");
    expect(style(".topics > .card p").marginTop).toBe("12px");
    expect(style(".topics > .card p").marginBottom).toBe("12px");
    expect(style(".topics .label").fontWeight).toBe("750");
    expect(style(".topics .label").color).toBe("var(--accent)");
  });

  it("preserves Stock typography while retaining the compact accepted geometry and one-pill correction", () => {
    const cards = ['AAPL','AMZN','NVDA','SNAP','GOOGL','MSFT','DIS'].map((ticker) => `<article class="stock-row" data-ticker="${ticker}"><h2>${ticker} — Company</h2><strong class="price">$100.00</strong><span class="movement">+$1.00 (+1.00%)</span><dl><dt>Day High</dt><dd>$101.00</dd><dt>Day Low</dt><dd>$99.00</dd><dt>52-week High</dt><dd>$120.00</dd><dt>52-week Low</dt><dd>$80.00</dd><dt>Volume</dt><dd>1,000</dd></dl></article>`).join("");
    const source = `<!doctype html><html><head></head><body><header class="hero"><h1>Stock Brief — 2026-07-18</h1><p class="date">July 18, 2026 · America/Los_Angeles</p></header><main>${cards}</main></body></html>`;
    const document = new JSDOM(prepareBriefPreviewHtml(source, "stock", 1_784_400_000, "2026-07-18")).window.document;
    const style = (selector: string) => document.defaultView!.getComputedStyle(document.querySelector(selector)!);
    expect(document.querySelector("#hermes-v25-stock-base-style")).not.toBeNull();
    expect(document.querySelector("body#hermes-stock-canonical > header.hero")).not.toBeNull();
    expect(document.querySelector("body#hermes-stock-canonical > main.grid")).not.toBeNull();
    expect(document.querySelectorAll("#hermes-stock-date-pill")).toHaveLength(1);
    expect(style("body").fontFamily).toBe('Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif');
    expect(style("body").padding).toBe("32px 28px 64px");
    expect(style("body > header.hero").padding).toBe("28px");
    expect(style("body > header.hero").marginBottom).toBe("22px");
    expect(style("body > main.grid").display).toBe("flex");
    expect(style("body > main.grid").padding).toBe("28px");
    expect(style("body > main.grid").gap).toBe("8px");
  });

  it("reduces the Stock title-to-metadata gap by 70%, lowers Summary by 25%, and keeps the white daily-date pill", () => {
    const source = `<!doctype html><html><body><header><h1>Stock Brief — 2026-07-18</h1><p class="date">2:11pm - America/Los_Angeles</p></header><main class="grid"><article class="stock-row"><h2>AAPL — Apple Inc.</h2><div class="price">$333.74</div><div class="change">+$0.48</div><dl><div><dt>Day High</dt><dd>$334.00</dd></div><div><dt>Day Low</dt><dd>$330.00</dd></div><div><dt>52w High</dt><dd>$340.00</dd></div><div><dt>52w Low</dt><dd>$200.00</dd></div><div><dt>Volume</dt><dd>10M</dd></div></dl></article></main></body></html>`;
    const result = prepareBriefPreviewHtml(source, "stock", 1_784_400_000, "2026-07-18");
    const document = new JSDOM(result).window.document;
    const heroLeft = document.querySelector(".hermes-stock-hero-left");
    const metadataStack = heroLeft?.querySelector(".hermes-stock-meta-stack");
    const summaryStack = document.querySelector(".hermes-stock-summary-stack");
    const summary = summaryStack?.querySelector("#hermes-stock-portfolio-summary");
    const heroPill = metadataStack?.querySelector("#hermes-stock-date-pill");
    const sectionPill = document.querySelector("#hermes-stock-today-date-pill");

    expect(summary).not.toBeNull();
    expect(heroPill?.textContent).toBe("July 18, 2026 - Sat.");
    expect(heroLeft?.querySelector(".hermes-stock-title-row + .hermes-stock-meta-stack")).toBe(metadataStack);
    expect(Array.from(metadataStack?.children ?? []).map((node) => (node as Element).className || (node as Element).id)).toEqual([
      "pill",
      "date",
      "sub",
    ]);
    expect(summaryStack?.querySelector("#hermes-stock-date-pill")).toBeNull();
    expect(document.querySelectorAll("#hermes-stock-date-pill")).toHaveLength(1);
    expect(sectionPill?.textContent).toBe("July 18, 2026 - Sat.");
    expect(sectionPill?.classList.contains("hermes-stock-today-date-pill")).toBe(true);
    expect(document.querySelector(".hermes-stock-today-title")).toBeNull();
    expect(result).toContain(".hermes-stock-meta-stack { display: flex !important; flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; margin-top: 8.4px !important;");
    expect(result).toContain(".hermes-stock-meta-stack { gap: 10px !important; margin-top: 5.4px !important;");
    expect(result).toContain(".hermes-stock-summary-stack { display: flex !important; flex: 0 0 auto !important; flex-direction: column !important; align-items: flex-end !important; gap: 12px !important; margin-left: auto !important; transform: translateY(25%) !important;");
    expect(result).toContain(".hermes-stock-summary-stack { width: 100% !important; align-items: flex-start !important; margin-left: 0 !important; transform: none !important;");
    expect(result).toContain("background: #ffffff !important; color: #0b1020 !important;");
    expect(result).toContain("font-size: clamp(42px, 5vw, 64px) !important");
    expect(result).toContain("font-size: clamp(36px, 4.45vw, 56.96px) !important");
    expect(result).toContain("@media (max-height: 900px) and (min-width: 1100px)");
  });

  it("uses UTC-safe date-first weekday abbreviations while passing Stock movement through unchanged", () => {
    const source = '<html><body><header><h1>Stock Brief — 2026-07-18</h1></header><main><article class="stock-row"><h2>AAPL — Apple Inc.</h2><strong class="price">$333.74</strong><span class="movement negative">-$2.00 (-0.60%)</span><dl><dt>Day High</dt><dd>$334.98</dd><dt>Day Low</dt><dd>$329.00</dd><dt>52-week High</dt><dd>$334.99</dd><dt>52-week Low</dt><dd>$201.50</dd><dt>Volume</dt><dd>63,325,386</dd></dl></article></main></body></html>';
    const saturday = new JSDOM(prepareBriefPreviewHtml(source, "stock", 1_784_400_000, "2026-07-18")).window.document;
    expect(saturday.querySelector("#hermes-stock-date-pill")?.textContent).toBe("July 18, 2026 - Sat.");
    expect(saturday.querySelector("#hermes-stock-today-date-pill")?.textContent).toBe("July 18, 2026 - Sat.");
    expect(saturday.querySelector(".hermes-stock-change")?.textContent).toBe("-$2.00 (-0.60%)");

    const friday = new JSDOM(prepareBriefPreviewHtml(source, "stock", 1_784_400_000, "2026-07-17")).window.document;
    expect(friday.querySelector("#hermes-stock-date-pill")?.textContent).toBe("July 17, 2026 - Fri.");
    expect(friday.querySelector(".hermes-stock-change")?.textContent).toBe("-$2.00 (-0.60%)");
  });

  it("reduces the white Stock daily-date pill by exactly 45%", () => {
    const source = '<html><body><header><h1>Stock Brief — 2026-07-18</h1></header><main><article class="stock-row"><h2>AAPL — Apple Inc.</h2><strong class="price">$333.74</strong><span class="movement">+$0.48</span><dl><dt>Day High</dt><dd>$334.98</dd><dt>Day Low</dt><dd>$329.00</dd><dt>52-week High</dt><dd>$334.99</dd><dt>52-week Low</dt><dd>$201.50</dd><dt>Volume</dt><dd>63,325,386</dd></dl></article></main></body></html>';
    const result = prepareBriefPreviewHtml(source, "stock", 1_784_400_000, "2026-07-18");

    expect(result).toContain("margin: 6.6px 0 9.9px !important; padding: 5.5px 12.1px !important;");
    expect(result).toContain("font-size: clamp(12.1px, 1.43vw, 18.7px) !important;");
    expect(result).toContain(".hermes-stock-today-date-pill { font-size: 14.3px !important; }");
    expect(result).toContain("background: #ffffff !important; color: #0b1020 !important;");
  });

  it("maps Stock ArrowUp to the complete Stock Brief top and ArrowDown to daily prices", () => {
    const source = `<!doctype html><html><body><header><h1>Stock Brief — 2026-07-18</h1></header><main><article class="stock-row"><h2>AAPL — Apple Inc.</h2><strong class="price">$333.74</strong><span class="movement">+$0.48 (+0.14%)</span><dl><dt>Day High</dt><dd>$334.98</dd><dt>Day Low</dt><dd>$329.00</dd><dt>52-week High</dt><dd>$334.99</dd><dt>52-week Low</dt><dd>$201.50</dd><dt>Volume</dt><dd>63,325,386</dd></dl></article></main></body></html>`;
    const result = prepareBriefPreviewHtml(source, "stock", 1_784_400_000, "2026-07-18");
    const dom = new JSDOM(result, { runScripts: "outside-only" });
    const visited: string[] = [];
    Object.defineProperty(dom.window, "scrollTo", {
      configurable: true,
      value(options: ScrollToOptions) { visited.push(options.top === 0 ? "hermes-stock-canonical" : "wrong-window-position"); },
    });
    Object.defineProperty(dom.window.Element.prototype, "scrollIntoView", {
      configurable: true,
      value(this: Element) { visited.push(this.id); },
    });
    const controller = dom.window.document.querySelector("#hermes-stock-section-navigation-controller")?.textContent ?? "";
    expect(controller).toContain('key === "ArrowUp"');
    expect(controller).toContain('key === "ArrowDown"');
    expect(controller).toContain('document.getElementById("hermes-stock-canonical")');
    dom.window.eval(controller);

    const up = new dom.window.KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true });
    dom.window.document.body.dispatchEvent(up);
    const down = new dom.window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });
    dom.window.document.body.dispatchEvent(down);

    expect(visited).toEqual(["hermes-stock-canonical", "hermes-stock-canonical-quotes"]);
    expect(up.defaultPrevented).toBe(true);
    expect(down.defaultPrevented).toBe(true);
  });

  it("canonicalizes current metric blocks into the same five-stat quote-row structure as July 17", () => {
    const current = `<article class="stock-row" data-ticker="AAPL"><div><a class="ticker">AAPL</a><span class="company">Apple Inc.</span><strong class="price positive">$333.74</strong><span class="movement positive">▲ +$0.48 (+0.14%)</span></div><div class="metric"><span>Day High</span><strong>$334.98</strong></div><div class="metric"><span>Day Low</span><strong>$329.00</strong></div><div class="metric"><span>52-week High</span><strong>$334.99</strong></div><div class="metric"><span>52-week Low</span><strong>$201.50</strong></div><div class="metric"><span>Volume</span><strong>63,325,386</strong></div></article>`;
    const historical = `<article class="stock-row" data-ticker="AAPL"><h2>AAPL — Apple Inc.</h2><strong class="price">$333.74</strong><span class="movement">+$0.48 (+0.14%)</span><dl><dt>Day High</dt><dd>$334.98</dd><dt>Day Low</dt><dd>$329.00</dd><dt>52-week High</dt><dd>$334.99</dd><dt>52-week Low</dt><dd>$201.50</dd><dt>Volume</dt><dd>63,325,386</dd></dl></article>`;
    const prepare = (card: string, date: string) => new JSDOM(prepareBriefPreviewHtml(`<html><body><header><h1>Stock Brief — ${date}</h1></header><main>${card}</main></body></html>`, "stock", 1_784_400_000, date)).window.document;
    const currentDocument = prepare(current, "2026-07-18");
    const historicalDocument = prepare(historical, "2026-07-17");
    const rowShape = (document: Document) => Array.from(document.querySelectorAll(".hermes-stock-row")).map((row) => ({
      classes: row.className,
      identity: row.querySelectorAll(":scope > .hermes-stock-identity").length,
      metrics: Array.from(row.querySelectorAll(":scope > .hermes-stock-metrics > div")).map((metric) => [metric.querySelector("dt")?.textContent, metric.querySelector("dd")?.textContent]),
    }));

    expect(rowShape(currentDocument)).toEqual(rowShape(historicalDocument));
    expect(currentDocument.querySelectorAll(".hermes-stock-row .hermes-stock-metrics > div")).toHaveLength(5);
    expect(Array.from(currentDocument.querySelectorAll(".hermes-stock-row dt"), (node) => (node as HTMLElement).textContent)).toEqual(["Day High", "Day Low", "52-week High", "52-week Low", "Volume"]);
  });

  it("uses non-overlapping responsive dashboard toolbars for both Brief types", () => {
    const pageSource = readFileSync(new URL("../pages/BriefsPage.tsx", import.meta.url), "utf8");
    expect(pageSource).toContain('data-hermes-brief-preview-toolbar');
    expect(pageSource).toContain('xl:grid-cols-[minmax(12rem,1fr)_auto_minmax(28rem,1fr)]');
    expect(pageSource).toContain('data-hermes-export-controls={location} className="flex min-w-0 flex-wrap');
    expect(pageSource).toContain('data-hermes-date-rail');
    expect(pageSource).toContain('snap-x snap-mandatory');
  });

  it("uses the dashboard-selected archive date as the sole canonical pill authority", () => {
    const stock = prepareBriefPreviewHtml('<html><body><header><h1>Stock Brief — 2026-07-17</h1></header><article class="card"><h2>AAPL — Apple</h2><strong>$100.00</strong></article></body></html>', "stock", 1_784_400_000, "2026-07-18");
    const ai = prepareBriefPreviewHtml('<html><body><header><span class="pill">July 17, 2026</span><h1>AI Morning Brief</h1></header><article class="card"><h2>1. Topic</h2><p>Detail.</p></article></body></html>', "ai", 1_784_400_000, "2026-07-18");
    expect(new JSDOM(stock).window.document.querySelector("#hermes-stock-date-pill")?.textContent).toBe("July 18, 2026 - Sat.");
    expect(new JSDOM(ai).window.document.querySelector("header .pill")?.textContent).toBe("July 18, 2026");
    expect(stock).not.toContain("July 17, 2026");
    expect(ai).not.toContain("July 17, 2026");
  });

  it("canonicalizes all seven repeated historical AI section cards and derives Founder Takeaways", () => {
    const cards = Array.from({ length: 7 }, (_, index) => `<section class="card"><h2>${index + 1}. Historical topic ${index + 1}</h2><p>Summary ${index + 1}.</p><div class="take"><b>Founder takeaway:</b> Action ${index + 1}.</div><div class="sources"><b>Sources:</b> <a href="https://example.com/${index + 1}">Source ${index + 1}</a></div></section>`).join("");
    const result = prepareBriefPreviewHtml(`<html><body><header><h1>AI Morning Brief</h1><div class="sub">Tuesday, July 14, 2026 · 7 items</div></header><main>${cards}</main></body></html>`, "ai", 1_784_400_000, "2026-07-14");
    const document = new JSDOM(result).window.document;
    expect(document.querySelectorAll("#hermes-ai-canonical .topics > article.card")).toHaveLength(7);
    expect(document.querySelectorAll("#hermes-ai-canonical .takeaways li")).toHaveLength(7);
    expect(document.querySelector("#hermes-ai-canonical .topics > article.card:last-child h2")?.textContent).toBe("7. Historical topic 7");
    expect(document.querySelector("#hermes-ai-canonical .takeaways li:last-child")?.textContent).toContain("Action 7.");
  });

  it("renders fresh and legacy AI inputs through one identical canonical final DOM", () => {
    const takeaways = '<section class="takeaways"><h2>FOUNDER TAKEAWAYS</h2><ol><li><strong>Founder point</strong><span class="takeaway-detail">Founder detail.</span></li></ol></section>';
    const topics = '<article class="card" data-brief-topic="1"><h2>1. Topic one</h2><p><span class="label">Summary:</span> Summary one.</p><p><span class="label">Why it matters for founders/operators:</span> Why one.</p><p><span class="label">Actionable implication:</span> Action one.</p><p class="sources"><span class="label">Sources:</span> <a href="https://example.com/one">Source one</a></p></article>';
    const fresh = `<!doctype html><html><head><style>.producer-fresh{color:red}</style></head><body class="producer-fresh"><main><header class="hero"><span class="pill">July 18, 2026</span><h1>AI Morning Brief</h1><p class="date">July 18, 2026 · America/Los_Angeles</p></header>${takeaways}<section class="topics">${topics}</section></main></body></html>`;
    const legacy = `<!doctype html><html><head><style>.producer-legacy{color:blue}</style></head><body class="producer-legacy"><div><header><h1>AI Morning Brief — 2026-07-18</h1><p class="date">July 18, 2026 · America/Los_Angeles</p></header>${takeaways}<div class="legacy-topics">${topics}</div></div></body></html>`;
    const freshDom = new JSDOM(prepareBriefPreviewHtml(fresh, "ai", 1_784_400_000));
    const legacyDom = new JSDOM(prepareBriefPreviewHtml(legacy, "ai", 1_784_400_000));
    const freshRoot = freshDom.window.document.querySelector("#hermes-ai-canonical");
    const legacyRoot = legacyDom.window.document.querySelector("#hermes-ai-canonical");
    expect(freshRoot).not.toBeNull();
    expect(legacyRoot).not.toBeNull();
    expect(freshRoot?.innerHTML).toBe(legacyRoot?.innerHTML);
    expect(freshDom.window.document.documentElement.outerHTML).not.toContain("producer-fresh");
    expect(legacyDom.window.document.documentElement.outerHTML).not.toContain("producer-legacy");
  });

  it("renders fresh and legacy Stock inputs through one identical canonical final DOM", () => {
    const quotes = [
      ["AAPL", "Apple", "$100.00", "+$1.00", "+1.00%"], ["AMZN", "Amazon", "$200.00", "-$2.00", "-1.00%"],
      ["NVDA", "NVIDIA", "$300.00", "+$3.00", "+1.00%"], ["SNAP", "Snap", "$4.00", "-$0.10", "-2.00%"],
      ["GOOGL", "Alphabet", "$150.00", "+$1.50", "+1.00%"], ["MSFT", "Microsoft", "$400.00", "-$4.00", "-1.00%"],
      ["DIS", "Disney", "$90.00", "+$0.90", "+1.00%"],
    ];
    const cards = quotes.map(([ticker, company, price, change, percent]) => `<article class="stock-row" data-ticker="${ticker}"><h2>${ticker} — ${company}</h2><strong class="price">${price}</strong><span class="movement">${change} (${percent})</span><dl><dt>Day High</dt><dd>${price}</dd><dt>Day Low</dt><dd>${price}</dd><dt>52-week High</dt><dd>${price}</dd><dt>52-week Low</dt><dd>${price}</dd><dt>Volume</dt><dd>1,000</dd></dl></article>`).join("");
    const fresh = `<!doctype html><html><head><style>.producer-fresh{color:red}</style></head><body class="producer-fresh"><header class="hero"><span class="pill">July 18, 2026</span><div class="heading"><h1>Stock Brief</h1></div></header><main>${cards}</main></body></html>`;
    const legacy = `<!doctype html><html><head><style>.producer-legacy{color:blue}</style></head><body class="producer-legacy"><header><h1>Stock Brief — 2026-07-18</h1></header><section>${cards.replaceAll('class="stock-row"', 'class="card"')}</section></body></html>`;
    const freshDom = new JSDOM(prepareBriefPreviewHtml(fresh, "stock", 1_784_400_000));
    const legacyDom = new JSDOM(prepareBriefPreviewHtml(legacy, "stock", 1_784_400_000));
    const freshRoot = freshDom.window.document.querySelector("#hermes-stock-canonical");
    const legacyRoot = legacyDom.window.document.querySelector("#hermes-stock-canonical");
    expect(freshRoot).not.toBeNull();
    expect(legacyRoot).not.toBeNull();
    expect(freshDom.window.document.querySelectorAll("#hermes-stock-date-pill")).toHaveLength(1);
    expect(legacyDom.window.document.querySelectorAll("#hermes-stock-date-pill")).toHaveLength(1);
    expect(freshDom.window.document.querySelector("#hermes-stock-date-pill")?.textContent).toBe("July 18, 2026 - Sat.");
    expect(legacyDom.window.document.querySelector("#hermes-stock-date-pill")?.textContent).toBe("July 18, 2026 - Sat.");
    expect(freshRoot?.innerHTML).toBe(legacyRoot?.innerHTML);
    expect(freshDom.window.document.documentElement.outerHTML).not.toContain("producer-fresh");
    expect(legacyDom.window.document.documentElement.outerHTML).not.toContain("producer-legacy");
  });
});
