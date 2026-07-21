const fs = require("fs");
const vm = require("vm");
const assert = require("assert");
const crypto = require("crypto");

const pluginPath = process.argv[2];
const checkerPath = process.argv[3];
const apiPath = process.argv[4];
const source = fs.readFileSync(pluginPath, "utf8");
const checker = fs.readFileSync(checkerPath, "utf8");
const api = fs.readFileSync(apiPath, "utf8");
let registered = null;
let fixture = null;
let exportedDownload = null;
let exportedBlob = null;
let removedExportControls = 0;
let chimeOscillators = [];
let chimeGains = [];
class MockAudioParam {
  constructor() { this.events = []; this.value = 0; }
  setValueAtTime(value, time) { this.events.push(["set", value, time]); }
  exponentialRampToValueAtTime(value, time) { this.events.push(["ramp", value, time]); }
}
class MockOscillator {
  constructor() { this.frequency = new MockAudioParam(); this.type = ""; this.starts = []; this.stops = []; chimeOscillators.push(this); }
  connect(node) { this.connected = node; return node; }
  start(time) { this.starts.push(time); }
  stop(time) { this.stops.push(time); }
}
class MockGain {
  constructor() { this.gain = new MockAudioParam(); chimeGains.push(this); }
  connect(node) { this.connected = node; return node; }
  disconnect() {}
}
class MockAudioNode {
  constructor() { this.delayTime = new MockAudioParam(); this.frequency = new MockAudioParam(); this.Q = { value: 0 }; }
  connect(node) { this.connected = node; return node; }
  disconnect() {}
}
class MockAudioContext {
  constructor() { this.currentTime = 10; this.state = "running"; this.destination = {}; this.sampleRate = 48000; }
  createOscillator() { return new MockOscillator(); }
  createGain() { return new MockGain(); }
  createDelay() { return new MockAudioNode(); }
  createBiquadFilter() { return new MockAudioNode(); }
  createBuffer(_channels, length) { return { getChannelData() { return new Float32Array(length); } }; }
  createBufferSource() { return { connect(node) { return node; }, start() {}, stop() {} }; }
  resume() { this.state = "running"; return Promise.resolve(); }
}
const React = {
  Fragment: Symbol("Fragment"),
  createElement(type, props, ...children) {
    const normalizedProps = { ...(props || {}), children: children.flat(Infinity).filter((value) => value !== null && value !== false && value !== undefined) };
    if (typeof type === "function") return type(normalizedProps);
    return { type, props: normalizedProps, children: normalizedProps.children };
  },
};
const sdk = {
  React,
  fetchJSON: async () => fixture,
  testing: {},
  hooks: {
    useState(initial) {
      if (initial && typeof initial === "object" && Object.prototype.hasOwnProperty.call(initial, "loading")) return [fixture ? { loading: false, data: fixture, error: null } : initial, () => {}];
      return [initial, () => {}];
    },
    useEffect() {},
    useMemo(fn) { return fn(); },
  },
};
const exportClone = {
  outerHTML: '<div class="git-comments-page"><section>Current Git Comments snapshot</section></div>',
  querySelectorAll(selector) {
    assert.strictEqual(selector, ".git-comments-panel-add,.git-comments-success,.git-comments-error,.git-comments-button.add-toggle,.git-comments-button.archive,.git-comments-button.delete,.git-comments-button.restore,.git-comments-button.unarchive,.git-comments-button.view-archived,.git-comments-button.retry-connection,.git-comments-button.export-html");
    return [{ remove() { removedExportControls += 1; } }];
  },
};
const exportDocument = {
  addEventListener() {},
  querySelector(selector) { assert.strictEqual(selector, ".git-comments-page"); return { cloneNode() { return exportClone; } }; },
  createElement(tag) { assert.strictEqual(tag, "a"); return { href: "", download: "", click() { exportedDownload = { href: this.href, download: this.download }; } }; },
};
class ExportBlob { constructor(parts, options) { this.parts = parts; this.type = options.type; exportedBlob = this; } }
const context = { window: { confirm: () => true, document: exportDocument, Blob: ExportBlob, URL: { createObjectURL: () => "blob:git-comments-export", revokeObjectURL() {} }, AudioContext: MockAudioContext, addEventListener() {}, removeEventListener() {}, __HERMES_PLUGIN_SDK__: sdk, __HERMES_PLUGINS__: { register(_name, component) { registered = component; } } }, document: exportDocument, setTimeout: () => 0, clearTimeout() {}, console };
vm.createContext(context);
vm.runInContext(source, context);
assert(registered, "plugin must register");
assert(typeof sdk.testing.cuelume?.play === "function", "renderer must expose the official Cuelume API only through the supplied test hook");
sdk.testing.cuelume.play("success");
assert(chimeOscillators.length === 3 && chimeGains.length >= 4, "Cuelume success must schedule its official three-note recipe plus gain graph");
assert(chimeOscillators.every((oscillator) => oscillator.type === "sine"), "Cuelume success must use its official sine oscillators");
assert([880, 1108.73, 1318.51].every((frequency, index) => chimeOscillators[index].frequency.events.some((event) => event[0] === "set" && event[1] === frequency)), "Cuelume success must retain the official 880/1108.73/1318.51Hz recipe");
assert(chimeOscillators.every((oscillator) => oscillator.starts.length === 1 && oscillator.stops.length === 1), "all three Cuelume success notes must be bounded and start/stop exactly once");
const gainsBeforePress = chimeGains.length;
sdk.testing.cuelume.play("press");
const pressGains = chimeGains.slice(gainsBeforePress);
assert(pressGains.length === 2 && pressGains[0].gain.value === 1.2, "data-cuelume-press must retain the official recipe shape with its master gain raised exactly 3x from 0.4 to 1.2");

function text(node) {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!node || typeof node !== "object") return "";
  return (node.children || []).map(text).join(" ");
}
function nodes(node, predicate, found = []) {
  if (!node || typeof node !== "object") return found;
  if (predicate(node)) found.push(node);
  for (const child of node.children || []) nodes(child, predicate, found);
  return found;
}

fixture = {
  comment_owner: "AgentAi-Leo",
  checked_at: "2026-07-19T04:00:00Z",
  watcher_health: { ok: true, stale: false, status: "healthy", checked_at: "2026-07-19T04:00:00Z" },
  watchlist: {
    schema_version: 1,
    comment_owner: "AgentAi-Leo",
    active: [
      { id: "nousresearch/hermes-agent/issues/58130", url: "https://github.com/NousResearch/hermes-agent/issues/58130", repo: "NousResearch/hermes-agent", number: 58130, kind: "issue" },
      { id: "nousresearch/hermes-agent/issues/58510", url: "https://github.com/NousResearch/hermes-agent/issues/58510", repo: "NousResearch/hermes-agent", number: 58510, kind: "issue" },
    ],
    archived: [],
  },
  issues: [{
    watch_id: "nousresearch/hermes-agent/issues/58130",
    repo: "NousResearch/hermes-agent",
    number: 58130,
    html_url: "https://github.com/NousResearch/hermes-agent/issues/58130",
    title: "Test issue title with useful context",
    body: "This issue description explains why the watcher matters.",
    state: "open",
    author: { login: "teknium1", avatar_url: "avatar" },
    created_at: "2026-07-18T18:00:00Z",
    updated_at: "2026-07-19T03:30:00Z",
    labels: [{ name: "type/feature", color: "1f6feb" }],
    comments: [],
    status_events: [],
    new_received_count: 0,
  }, {
    watch_id: "nousresearch/hermes-agent/issues/58510",
    repo: "NousResearch/hermes-agent",
    number: 58510,
    html_url: "https://github.com/NousResearch/hermes-agent/issues/58510",
    state: "closed",
    comments: [{ id: 1, body: "Maintainer response", created_at: "2026-07-18T20:00:00Z", html_url: "https://github.com/NousResearch/hermes-agent/issues/58510#issuecomment-1", author_association: "CONTRIBUTOR", author: { login: "teknium1", avatar_url: "avatar" } }],
    status_events: [
      { id: 2, event: "closed", state_reason: "not_planned", created_at: "2026-07-18T21:00:00Z", actor: { login: "teknium1", avatar_url: "avatar" } },
      { id: 3, event: "labeled", created_at: "2026-07-18T21:01:00Z", actor: { login: "teknium1", avatar_url: "avatar" }, label: { name: "sweeper:cannot-reproduce", color: "d4a72c" } },
    ],
    new_received_count: 1,
  }],
};
let tree = registered();
let rendered = text(tree);
const exportButton = nodes(tree, (node) => String(node.props?.className || "").includes("export-html") && text(node).trim() === "HTML")[0];
assert(exportButton && typeof exportButton.props.onClick === "function", "Briefs-style HTML export button missing");
assert(nodes(exportButton, (node) => node.type === "svg" && node.props?.viewBox === "0 0 24 24").length === 1, "HTML export button must include the Briefs download icon");
exportButton.props.onClick();
const exportedHtml = exportedBlob?.parts?.join("") || "";
assert(/^git-watch-\d{4}-\d{2}-\d{2}\.html$/.test(exportedDownload?.download || "") && exportedDownload?.href === "blob:git-comments-export", "export must download a dated GIT WATCH HTML file");
assert(exportedBlob?.type === "text/html;charset=utf-8" && exportedHtml.startsWith("<!doctype html>"), "export must create a standalone HTML Blob");
assert(exportedHtml.includes("<style>") && exportedHtml.includes("<script>") && exportedHtml.includes("Current Git Comments snapshot"), "export must inline CSS, JavaScript, and the current dashboard snapshot");
assert((exportedHtml.match(/<style>/g) || []).length === 1 && (exportedHtml.match(/<script>/g) || []).length === 1, "export must contain exactly one inline style and one inline controller");
const exportedScript = exportedHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1] || "";
const sourceStyles = source.match(/const styles = `([\s\S]*?)`;\n/)?.[1] || "";
const exportedStyles = exportedHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
assert(exportedHtml.endsWith("</body></html>") && !exportedHtml.includes('<link rel="stylesheet"') && !exportedHtml.includes('<script src=') && !exportedHtml.includes("/api/plugins/"), "export must be self-contained and independent of Hermes APIs");
assert.doesNotThrow(() => new vm.Script(exportedScript), "exported inline JavaScript must parse");
const exportLink = { setAttribute(name, value) { this[name] = value; } };
const exportedDocument = { documentElement: { dataset: {} }, addEventListener() {}, querySelectorAll(selector) { if (selector === "a") return [exportLink]; if (selector === ".git-comments-button.activity-toggle") return []; return []; }, querySelector() { return null; } };
assert.doesNotThrow(() => new vm.Script(exportedScript).runInNewContext({ document: exportedDocument }), "exported inline JavaScript must execute without Hermes");
assert(exportedDocument.documentElement.dataset.gitCommentsExport === "ready" && exportLink.rel === "noreferrer noopener", "exported controller must initialize and harden links");
const exportActivityRegion = { hidden: false };
const exportActivityButton = { textContent: "SHOW ACTIVITY (2)", attributes: { "aria-controls": "activity-2", "aria-expanded": "false" }, listeners: {}, getAttribute(name) { return this.attributes[name]; }, setAttribute(name, value) { this.attributes[name] = value; }, addEventListener(name, fn) { this.listeners[name] = fn; }, remove() { this.removed = true; } };
const exportCloseButton = { listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; } };
const exportBackdrop = { removed: false, listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; }, remove() { this.removed = true; } };
const exportModal = { closest(selector) { assert.strictEqual(selector, ".git-comments-archive-backdrop"); return exportBackdrop; }, querySelector(selector) { assert.strictEqual(selector, ".git-comments-button.close-archive-view"); return exportCloseButton; }, remove() { this.removed = true; } };
const exportKeyboard = {};
const interactiveExportDocument = { documentElement: { dataset: {} }, querySelectorAll(selector) { if (selector === "a") return []; if (selector === ".git-comments-button.activity-toggle") return [exportActivityButton]; return []; }, querySelector(selector) { return selector === ".git-comments-archive-modal" ? exportModal : null; }, getElementById(id) { return id === "activity-2" ? exportActivityRegion : null; }, addEventListener(name, fn) { exportKeyboard[name] = fn; } };
new vm.Script(exportedScript).runInNewContext({ document: interactiveExportDocument });
assert(exportActivityRegion.hidden === true && exportActivityButton.attributes["aria-expanded"] === "false" && exportActivityButton.textContent === "SHOW ACTIVITY (2)", "standalone activity must initialize collapsed exactly like the dashboard");
exportActivityButton.listeners.click();
assert(exportActivityRegion.hidden === false && exportActivityButton.attributes["aria-expanded"] === "true" && exportActivityButton.textContent === "HIDE ACTIVITY (2)", "standalone activity control must expand retained events");
exportKeyboard.keydown({ key: "Escape" });
assert(exportBackdrop.removed === true, "standalone archive viewer must close on Escape");
assert(sourceStyles && exportedStyles.endsWith(sourceStyles), "export must embed the complete dashboard CSS byte-for-byte");
assert(exportedHtml.includes(exportClone.outerHTML) && exportedHtml.includes('<meta name="git-watch-export-version" content="52">') && exportedHtml.includes('<meta name="git-watch-visual-baseline" content="52">'), "export must embed the exact current HTML snapshot, export format 52, and the locked Revision 52 visual baseline");
assert(exportedHtml.includes("<!-- GIT WATCH OFFLINE FILE GUIDE") && exportedHtml.includes("API-DEPENDENT CONTROLS OMITTED") && exportedHtml.includes("SUCCESS POPUP TOKENS (Revision 52)") && exportedHtml.includes("font: embedded Alumni Sans SC ExtraBold 800") && exportedHtml.includes("border radius: 25px") && exportedHtml.includes("minimum width: 589.7103px") && exportedHtml.includes("minimum height: 245.1429px") && exportedHtml.includes("padding: 83.5714px 70.3257px") && exportedHtml.includes("text size: 60.54px") && exportedHtml.includes("letter spacing: 0.04em") && exportedHtml.includes("background fill alpha: 95%") && exportedHtml.includes("dwell: 2000ms, then fade: 500ms") && exportedHtml.includes("press master gain: 0.4 → 1.2 (3x amplitude)") && exportedHtml.includes("inline sound: Cuelume 0.1.2 success and data-cuelume-press"), "export must explain offline scope and the final Revision 52 popup/font/opacity/timing/Cuelume tokens for readable future modification");
assert(exportedHtml.includes("<!-- EXACT RENDERED DASHBOARD SNAPSHOT") && exportedHtml.includes("<!-- END EXACT RENDERED DASHBOARD SNAPSHOT -->"), "export must label the exact cloned HTML region for offline readers");
assert(exportedStyles.includes("/* EXPORT SHELL:") && exportedStyles.includes("/* DASHBOARD CSS: byte-identical") && exportedStyles.endsWith(sourceStyles), "export must annotate CSS ownership without changing the byte-identical dashboard stylesheet");
assert(exportedScript.includes("GIT WATCH OFFLINE CONTROLLER") && exportedScript.includes("1. Harden every exported link") && exportedScript.includes("2. Preserve activity disclosure") && exportedScript.includes("3. Close an exported archive viewer") && exportedScript.includes("4. Publish a ready marker"), "exported inline JavaScript must contain readable responsibility comments");
assert(exportedScript.includes('.git-comments-button.activity-toggle') && exportedScript.includes('aria-controls') && exportedScript.includes('aria-expanded') && exportedScript.includes('.git-comments-archive-modal') && exportedScript.includes('event.key === "Escape"'), "export must inline self-contained activity and archive-view interactions");
assert(exportedScript.includes("CuelumeOfficial") && exportedScript.includes("data-cuelume-press") && exportedScript.includes("Cuelume.bind()") && exportedScript.includes('press:{masterGain:1.2'), "standalone export must inline the 3x press-gain Cuelume derivation and preserve louder press sound on retained buttons without a package or network request");
assert(!exportedScript.includes("fetch(") && !exportedScript.includes("fetchJSON") && removedExportControls === 1, "export must strip only API-dependent controls and keep its controller network-independent");
assert(!exportedHtml.includes('<meta name="git-watch-export-version" content="51">') && !exportedHtml.includes('<meta name="git-watch-visual-baseline" content="51">'), "export must not retain superseded Revision 51 markers");
assert(exportedHtml.includes("GIT WATCH Export"), "export must identify itself as GIT WATCH");
assert(source.includes('"Loading GIT WATCH…"') && source.includes('`GIT WATCH failed: ${state.error}`'), "dashboard loading and failure copy must use the exact GIT WATCH name");
assert(!source.includes("Git Comments"), "dashboard-facing renderer copy must not retain the former Git Comments name");
assert(rendered.includes("COMMENTS (1)"), "comment badge missing");
assert(rendered.includes("Test issue title with useful context"), "issue title missing from watched card");
assert(rendered.includes("This issue description explains why the watcher matters."), "issue description missing from watched card");
assert(rendered.includes("OPEN"), "current issue state missing from watched card");
const statePillText = nodes(tree, (node) => String(node.props?.className || "").startsWith("git-comments-current-state ")).map((node) => text(node).trim());
assert(statePillText.includes("STATUS: OPEN") && statePillText.includes("STATUS: CLOSED"), "state pills must read STATUS: OPEN or STATUS: CLOSED");
assert(rendered.includes("Opened by teknium1"), "issue author metadata missing from watched card");
assert(nodes(tree, (node) => String(node.props?.className || "") === "git-comments-current-labels").length === 0, "duplicated current-label row must not render above comments");
assert(nodes(tree, (node) => String(node.props?.className || "") === "git-comments-current-label").length === 0, "duplicated current-label pills must not render above comments");
const repoLines = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-repo-line");
assert(repoLines.length === 2 && repoLines.every((line) => nodes(line, (node) => String(node.props?.className || "").startsWith("git-comments-comment-label")).length === 0), "comment pill must not remain in the repository line");
const issueMainRows = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-issue-main");
assert(issueMainRows.length === 2 && issueMainRows.every((row) => String(row.children[0]?.props?.className || "") === "git-comments-number-link" && String(row.children[1]?.props?.className || "") === "git-comments-issue-author" && text(row.children[1]).startsWith("by ")), "issue number and author must occupy the first line in that order, with the hydrated profile picture following when available");
assert(issueMainRows.some((row) => text(row.children[0]).includes("#58130") && text(row.children[1]).trim() === "by teknium1"), "#58130 must show its payload author beside the issue number");
assert(issueMainRows.some((row) => row.children[2]?.props?.src === "avatar" && row.children[2]?.props?.alt === "teknium1 profile picture"), "issue author profile picture must use the payload avatar_url immediately after the author");
assert(nodes(tree, (node) => String(node.props?.className || "") === "git-comments-owner-star").length === 0, "non-owner payload authors must not receive the watchlist-profile star");
const identities = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-issue-identity");
assert(identities.length === 2 && identities.every((identity) => String(identity.children[0]?.props?.className || "") === "git-comments-issue-main" && String(identity.children[1]?.props?.className || "") === "git-comments-repo-line") && identities.some((identity) => String(identity.children[2]?.props?.className || "") === "git-comments-issue-title"), "repository and WATCHING must move to a dedicated second line below number and author, before any title");
assert(source.includes('.git-comments-issue-author{color:#9ca9bd;font-size:16px;font-weight:650;white-space:nowrap}'), "issue-number author must use explicit readable styling");
assert(source.includes('.git-comments-issue-avatar{width:40px;height:40px;'), "issue author profile picture must use the requested 40px card placement");
assert(source.includes('.git-comments-issue-title{display:block;color:#FFE6CB;font-size:24px;'), "issue title must increase exactly 20% from 20px to 24px");
assert(nodes(tree, (node) => String(node.props?.className || "") === "git-comments-issue-meta").length === 0, "old separate comment-pill row must be removed");
const contextRows = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-issue-context-meta");
assert(contextRows.length === 2 && contextRows.every((row) => nodes(row, (node) => String(node.props?.className || "").startsWith("git-comments-comment-label ")).length === 1), "comment pill must render at the end of each OPEN/CLOSED metadata row");
assert(contextRows.every((row) => String(row.children[0]?.props?.className || "").startsWith("git-comments-comment-label ") && String(row.children[1]?.props?.className || "") === "git-comments-status-cluster" && String(row.children[1]?.children[0]?.props?.className || "").startsWith("git-comments-current-state ") && String(row.children[1]?.children[1]?.props?.className || "") === "git-comments-status-text"), "COMMENTS must sit left of one nonbreaking STATUS and metadata cluster");
const statusTextRows = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-status-text");
assert(statusTextRows.length === 2 && statusTextRows.every((row) => text(row).includes("Opened by") && text(row).includes("Created") && text(row).includes("Updated")), "status metadata must share a dedicated row aligned with OPEN/CLOSED");
const commentClasses = nodes(tree, (node) => String(node.props?.className || "").startsWith("git-comments-comment-label ")).map((node) => node.props.className);
assert(commentClasses.includes("git-comments-comment-label open"), "open item comment pill must use the open status class even at zero comments");
assert(commentClasses.includes("git-comments-comment-label closed"), "closed item comment pill must use the closed status class");
const watchStates = nodes(tree, (node) => String(node.props?.className || "").startsWith("git-comments-watch-state ")).map((node) => node.props.className);
assert(watchStates.includes("git-comments-watch-state open"), "open WATCHING text must use the open state class");
assert(watchStates.includes("git-comments-watch-state closed"), "closed WATCHING text must use the closed state class");
assert(nodes(tree, (node) => String(node.props?.className || "") === "git-comments-issue-title" && node.props?.href === "https://github.com/NousResearch/hermes-agent/issues/58130").length === 1, "issue title must link to its canonical GitHub URL");
for (const payloadMarker of ['"body": issue.get("body") or ""', '"at_a_glance": str((entry.get("presentation") or {}).get("at_a_glance") or old_issue.get("at_a_glance") or "")', '"author": actor(issue.get("user"))', '"created_at": issue.get("created_at")', '"updated_at": issue.get("updated_at")', '"labels": normalized_labels', '"merged_at": merged_at', '"merged": bool(merged_at)']) assert(checker.includes(payloadMarker), `checker missing issue context payload: ${payloadMarker}`);
assert(!rendered.includes("COMMENTS RECEIVED"), "received text must be removed from the comment pill");
assert(!rendered.includes("View on GitHub"), "redundant source-link text must be absent everywhere");
assert(rendered.includes("Contributor"), "commenter association missing");
assert(!rendered.includes("closed this as not planned") && !rendered.includes("sweeper:cannot-reproduce"), "lifecycle activity must be collapsed by default");
const activityButtons = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-button activity-toggle");
assert(activityButtons.length === 1 && text(activityButtons[0]).trim() === "SHOW ACTIVITY (2)" && activityButtons[0].props?.["aria-expanded"] === false && activityButtons[0].props?.["aria-controls"], "cards with lifecycle events need one accessible collapsed activity control with a count");
assert(nodes(tree, (node) => String(node.props?.className || "") === "git-comments-events").length === 0, "collapsed activity must not consume card height");
assert(rendered.includes("WATCHER HEALTHY"), "healthy title missing");
assert(rendered.includes("+ ADD URL TO WATCH"), "add URL control missing");
assert(rendered.includes("ARCHIVE"), "archive control missing");
assert(!rendered.includes("✓ ARCHIVE"), "archive control must not look pre-archived");
assert(rendered.includes("ARCHIVED (0)"), "archived summary missing");
assert(nodes(tree, (node) => String(node.props?.className || "").includes("git-comments-health-dot healthy")).length === 1, "green health dot missing for fresh success");
const sourceLinks = nodes(tree, (node) => node.type === "a" && String(node.props?.className || "").includes("git-comments-number-link"));
assert(sourceLinks.length === 2, "every active issue number must be its source hyperlink");
assert(sourceLinks.some((node) => node.props.href === "https://github.com/NousResearch/hermes-agent/issues/58130" && text(node).includes("#58130")), "#58130 source hyperlink missing");
assert(sourceLinks.some((node) => node.props.href === "https://github.com/NousResearch/hermes-agent/issues/58510" && text(node).includes("#58510")), "#58510 source hyperlink missing");
assert(nodes(tree, (node) => String(node.props?.className || "") === "git-comments-repo-primary").every((node) => node.type === "strong"), "repository name must use bold white semantic text");
const issueHeads = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-issue-head");
assert(issueHeads.every((head) => nodes(head, (node) => String(node.props?.className || "") === "git-comments-repo-line").some((line) => text(line).includes("NousResearch/hermes-agent") && text(line).includes("WATCHING"))), "WATCHING must render inline to the right of every repository name");
const issueContents = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-issue-content");
assert(issueContents.length === 2 && issueContents.every((content) => String(content.children[0]?.props?.className || "") === "git-comments-card-icon" && String(content.children[1]?.props?.className || "") === "git-comments-issue-identity"), "every card must keep the same wrapped bubble icon immediately beside its identity");
assert(source.includes('.git-comments-issue-content{display:flex;align-items:flex-start;gap:12px;flex:1 1 720px;min-width:0}') && source.includes('.git-comments-card-icon{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;flex:0 0 32px;line-height:1;font-size:22px}'), "card bubble must use fixed geometry and a nonwrapping identity group");
const commentedIdentity = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-issue-identity" && text(node).includes("#58510"))[0];
assert(nodes(commentedIdentity, (node) => String(node.props?.className || "") === "git-comments-issue-context-meta" && text(node).includes("CLOSED") && text(node).includes("Updated") && text(node).includes("COMMENTS (1)") && !text(node).includes("RECEIVED")).length === 1, "comment pill must end the CLOSED metadata row and omit received text");
assert(source.includes('.git-comments-current-state,.git-comments-comment-label{display:inline-flex;align-items:center;justify-content:center;min-width:200px;width:auto;min-height:44px;box-sizing:border-box;padding:6.25px 16px;border-radius:999px;white-space:nowrap;flex:0 0 auto;font-size:15px;font-weight:850'), "comments and state pills must be wide, nonwrapping, and never truncate status text");
assert(source.includes('.git-comments-issue-context-meta{display:flex;align-items:center;gap:12px;flex-wrap:nowrap;overflow-x:auto;color:#9ca9bd;font-size:14.95px}') && source.includes('.git-comments-status-cluster{display:flex;align-items:center;gap:12px;flex:0 0 auto;white-space:nowrap}') && source.includes('.git-comments-status-text{display:flex;align-items:center;min-height:44px;gap:12px;flex-wrap:nowrap;white-space:nowrap}'), "COMMENTS, status pill, and all status metadata must remain on one horizontal row");
assert(source.includes('.git-comments-comment-label.open{border-color:#4ade80;color:#fff;background:#166534}'), "open comments pill must remain fully opaque green");
assert(source.includes('.git-comments-comment-label.closed{border-color:#ef4444;color:#fff;background:#7f1d1d}'), "closed comments pill must remain fully opaque red");
assert(source.includes('.git-comments-comment-label.merged{border-color:#a78bfa;color:#fff;background:#5b21b6}'), "merged comments pill must remain fully opaque purple");
assert(source.includes('.git-comments-current-state.open{border-color:#4ade80;color:#d1fae5;background:rgba(22,101,52,.25)}'), "open status pill must use a 25% translucent green fill");
assert(source.includes('.git-comments-current-state.closed{border-color:#ef4444;color:#fecaca;background:rgba(127,29,29,.25)}'), "closed status pill must use a 25% translucent red fill");
assert(source.includes('.git-comments-current-state.merged{border-color:#a78bfa;color:#e9d5ff;background:rgba(91,33,182,.25)}'), "merged status pill must use a 25% translucent purple fill");
assert(source.includes('className: `git-comments-comment-label ${status}`'), "comment pill class must follow effective issue status");
assert(source.includes('.git-comments-issue-context-meta{display:flex;align-items:center;gap:12px;flex-wrap:nowrap;overflow-x:auto;color:#9ca9bd;font-size:14.95px}'), "single-line metadata text must remain exactly 15% larger than 13px");
assert(source.includes('activityOpen ? "HIDE ACTIVITY" : "SHOW ACTIVITY"') && source.includes('onClick: () => setActivityOpen((open) => !open)'), "activity control must toggle between SHOW and HIDE without discarding timeline data");
assert(nodes(tree, (node) => String(node.props?.className || "").includes("git-comments-button delete") && text(node).includes("DELETE")).length === 2, "every active watched item must have a red DELETE action");
assert.strictEqual(nodes(tree, (node) => String(node.props?.className || "") === "git-comments-status" || String(node.props?.className || "").startsWith("git-comments-status received")).length, 0, "separate received-count text must be removed");
const panelTitle = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-panel-title")[0];
assert(panelTitle && text(panelTitle).trim() === "*** WATCHED GITHUB ISSUES & PULL REQUESTS ***" && !text(panelTitle).includes("💼") && panelTitle.props?.style?.fontSize === "26.4px" && panelTitle.props?.style?.color === "#FFE6CB", "watched-items heading must use the exact asterisk-delimited text and Hermes Agent color");
assert(nodes(tree, (node) => String(node.props?.className || "").includes("git-comments-button add-toggle") && text(node).trim() === "+ ADD URL TO WATCH").length === 1, "add-watch control must have its dedicated Hermes-color class");
const watchedPanel = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-panel")[0];
const healthPanel = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-health")[0];
assert(nodes(watchedPanel, (node) => String(node.props?.className || "").includes("git-comments-button add-toggle") && text(node).trim() === "+ ADD URL TO WATCH").length === 1, "add-watch control must live in the watched-items card");
assert(nodes(healthPanel, (node) => String(node.props?.className || "").includes("git-comments-button add-toggle")).length === 0, "watcher-health card must not contain the add-watch control");
assert(source.includes('className: "git-comments-panel-heading"') && source.includes('className: "git-comments-panel-add"'), "watched-items card must own its heading and add-form region");
assert(source.includes('.git-comments-button.add-toggle{border-color:#FFE6CB;background:#35291f;color:#FFE6CB}'), "add-watch button must use Hermes Agent color");
assert(source.includes('.git-comments-button.submit-add{border-color:#4ade80;background:#123c2b;color:#b7f7cc}'), "form ADD URL button must be green");
assert(source.includes('.git-comments-button.cancel-add{border-color:#ef4444;background:#4a151b;color:#fecaca}'), "form CANCEL button must be red");
assert(source.includes('if (event.key === "Escape")') && source.includes('closeAddForm();'), "Escape must clear and close the add form");
assert(source.includes('if (event.key === "Enter" && String(event.target?.tagName || "").toUpperCase() === "INPUT")') && source.includes('event.currentTarget.requestSubmit();'), "Enter in the URL input must explicitly submit the add form");
assert(source.includes('className: "git-comments-add-form", onSubmit: addUrl, onKeyDown: addFormKeyDown'), "add form must wire both submit and keyboard handlers");
assert(source.includes('window.addEventListener("keydown", launchAddOnEnter)') && source.includes('window.removeEventListener("keydown", launchAddOnEnter)'), "dashboard must register and clean up the Enter-to-launch shortcut");
assert(source.includes('if (event.key !== "Enter" || addOpen || busy || state.loading || archiveView || event.defaultPrevented'), "Enter-to-launch must run only while the form and archive modal are closed and the view is idle");
assert(source.includes('event.metaKey || event.ctrlKey || event.altKey || event.shiftKey'), "modified Enter shortcuts must not launch Add URL");
assert(source.includes('target.closest("a,button,input,textarea,select,[contenteditable=true]")'), "Enter-to-launch must not hijack interactive or editable controls");
assert(source.includes('setActionError(""); setAddOpen(true);'), "eligible Enter must open the Add URL form");
assert(source.includes('showSuccess("URL ADDED SUCCESSFULLY!", 2000)'), "URL-added notice must remain for two seconds before fading");
assert(source.includes('showSuccess("URL SUCCESSFULLY ARCHIVED!", 2000, "cyan")'), "archive success must publish the exact requested cyan text at unified center for two seconds before fading");
assert(source.includes('const showSuccess = (message, duration, tone = "green") => { Cuelume.play("success");'), "every successful popup path must play exactly one official Cuelume success cue before publishing the notice");
assert(source.includes('Cuelume.bind();') && source.includes('type === "button" ? { ...(props || {}), "data-cuelume-press": props?.["data-cuelume-press"] ?? "" } : props'), "Cuelume must bind once and every rendered button must automatically receive data-cuelume-press");
const cuelumeBundle = source.match(/\/\* CUELUME_OFFICIAL_IIFE_BEGIN \*\/\n([\s\S]*?)\/\* CUELUME_OFFICIAL_IIFE_END \*\//);
assert(cuelumeBundle && cuelumeBundle[1].includes('press:{masterGain:1.2,layers:[{kind:"noise",filterType:"bandpass",filterFrequency:1700,filterQ:1.4,attack:.001,decay:.02,peak:.13}]}'), "vendored Cuelume runtime must retain the exact official press recipe with only masterGain raised to 1.2");
const restoredOfficialCuelume = cuelumeBundle[1].replace('press:{masterGain:1.2', 'press:{masterGain:.4');
assert(crypto.createHash("sha256").update(restoredOfficialCuelume).digest("hex") === "c0f6785fd6d36cadbdb5dd762dc83bc708ffc09c8677866f41af86f7bd771d73", "reverting the single documented press-gain token must reproduce the byte-exact pinned official 0.1.2 bundle");
assert(source.includes("cuelume@0.1.2") && source.includes("sha512-VxL0k9l1fyKGot3VKM+wm5Xd2K75fVeBHdNTrR1EHiqKRtD6S5Dxy/vY7hwl9gXp3QT/TIywFXUos77n39YZVQ==") && source.includes("MIT License") && source.includes("Copyright (c) 2026 Daniel Belyi"), "renderer must retain pinned package provenance and MIT attribution");
assert(source.includes("PRESS GAIN PATCH: masterGain 0.4 → 1.2 (3x amplitude); all other CueLume bytes and recipes remain pinned"), "renderer must document the sole local CueLume press-gain derivation inline");
assert(!source.includes('playSuccessChime') && !source.includes('unlockSuccessChime') && !source.includes('const frequencies = [523.25, 659.25]'), "superseded custom two-note success implementation must be removed");
assert(!source.includes('data:audio/') && !/["'`]([^"'`]*\\.(?:mp3|wav))(?:[?#][^"'`]*)?["'`]/i.test(source) && !source.includes('from "cuelume"') && !source.includes("from 'cuelume'"), "Cuelume must remain synthesized inline with no external or embedded binary audio asset dependency");
assert(source.includes('window.setTimeout(() => setSuccessFading(true), successDuration)'), "success notice must enter its fade state after the requested duration");
assert(source.includes('window.setTimeout(() => setActionSuccess(""), successDuration + 500)'), "success notice must be removed after its 500ms fade transition");
assert(source.includes('className: `git-comments-success ${successTone}${successFading ? " fading" : ""}`'), "success popup must render tone and fading-state classes without per-action placement");
assert(source.includes('.git-comments-success{') && source.includes('transition:opacity .5s ease') && source.includes('.git-comments-success.fading{opacity:0;pointer-events:none}'), "success notice CSS must visibly fade over 500ms without intercepting controls");
assert(source.includes('role: "status", "aria-live": "polite"'), "success status must render as an accessible polite live message");
assert(source.includes('.git-comments-success{position:fixed;left:50%;top:50%;z-index:1100;width:max-content;min-width:min(589.7103px,calc(100vw - 70.3257px));max-width:calc(100vw - 70.3257px);min-height:min(245.1429px,calc(100vh - 70.3257px));box-sizing:border-box;transform:translate(-50%,-50%);') && source.includes('display:flex;align-items:center;justify-content:center') && source.includes('padding:83.5714px 70.3257px') && source.includes('font-family:"Alumni Sans SC",sans-serif;font-size:60.54px;line-height:1.25;font-weight:800;letter-spacing:.04em') && !source.includes('font-size:48.43px') && source.includes('color:rgba(255,255,255,.9)') && source.includes('border:1px solid rgba(187,247,208,.9);border-radius:25px') && source.includes('white-space:nowrap') && source.includes('box-shadow:0 15.6px 41.6px rgba(0,0,0,.6),0 5.2px 15.6px rgba(0,0,0,.36),0 0 14px rgba(134,239,172,.22),inset 0 1px 0 rgba(255,255,255,.16)') && source.includes('backdrop-filter:blur(5.2px)') && source.includes('transition:opacity .5s ease'), "center popup must retain yellow-guide geometry, use 60.54px Alumni Sans SC text with the selected 0.04em tracking, and retain the 25px radius");
const alumniFont = source.match(/@font-face\{font-family:"Alumni Sans SC";font-style:normal;font-weight:800;font-display:swap;src:url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\) format\("woff2"\)\}/);
assert(alumniFont, "Alumni Sans SC ExtraBold Latin WOFF2 must be embedded inline rather than loaded from the network");
assert(crypto.createHash("sha256").update(Buffer.from(alumniFont[1], "base64")).digest("hex") === "e8c408a847fe29097bf5d6c2ca70e2dacd973e915903ef0870673ce8889c5ba9", "embedded Alumni Sans SC WOFF2 must match the official Google Fonts payload");
assert(!source.includes("fonts.googleapis.com") && !source.includes("fonts.gstatic.com"), "popup typography must not depend on an external font request");
assert(!source.includes('width:min(1020px') && !source.includes('font-size:43.2px') && !source.includes('width:min(805px') && !source.includes('font-size:47px'), "superseded popup geometry must be absent");
assert(source.includes('background:rgba(18,60,43,.95)') && source.includes('.git-comments-success.cyan{border-color:rgba(165,243,252,.9);background:rgba(8,51,68,.95);color:rgba(255,255,255,.9);box-shadow:0 15.6px 41.6px rgba(0,0,0,.6),0 5.2px 15.6px rgba(0,0,0,.36),0 0 14px rgba(103,232,249,.22),inset 0 1px 0 rgba(255,255,255,.16)}') && source.includes('.git-comments-success.red{border-color:rgba(254,202,202,.9);background:rgba(74,21,27,.95);color:rgba(255,255,255,.9);box-shadow:0 15.6px 41.6px rgba(0,0,0,.6),0 5.2px 15.6px rgba(0,0,0,.36),0 0 14px rgba(252,165,165,.22),inset 0 1px 0 rgba(255,255,255,.16)}') && !source.includes('background:rgba(18,60,43,.8)') && !source.includes('background:rgba(8,51,68,.8)') && !source.includes('background:rgba(74,21,27,.8)') && !source.includes('.git-comments-success{opacity:.95'), "green, cyan, and red popup fills must use 95% background alpha without weakening text, border, or descendants");
assert(!source.includes('min-width:min(523.25px,calc(100vw - 62.4px))') && !source.includes('padding:39px 62.4px') && !source.includes('border-radius:35px') && !source.includes('.git-comments-success{border-radius:999px') && !source.includes('.git-comments-success{border-radius:50%'), "success popup must remove Revision 46 box/radius tokens and remain a rounded rectangle rather than a pill");
const summary = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-summary")[0];
assert(summary && summary.props?.style?.fontWeight === 400, "watch summary must use normal weight");
assert(nodes(summary, (node) => String(node.props?.className || "") === "git-comments-summary-commented" && text(node).includes("COMMENTED (1)") && node.props?.style?.color === "#4ade80").length === 1, "COMMENTED summary must be green");
assert(nodes(summary, (node) => String(node.props?.className || "") === "git-comments-summary-archived" && text(node).includes("ARCHIVED (0)") && node.props?.style?.color === "#22d3ee").length === 1, "ARCHIVED summary must be cyan");
assert(source.includes('.git-comments-button.archive{margin-left:auto;border-color:#22d3ee;background:#083344;color:#cffafe}'), "active ARCHIVE button must be cyan");
const archivedTitle = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-panel-title" && text(node).trim() === "ARCHIVED (0)")[0];
assert(archivedTitle && archivedTitle.props?.style?.color === "#22d3ee", "bottom ARCHIVED title must be cyan");
const healthTitle = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-health-title")[0];
assert(healthTitle.children[0].props?.style?.fontSize === "22.5px", "WATCHER HEALTHY must be 25% larger than 18px");
assert(String(healthTitle.children[1].props?.className || "").includes("git-comments-health-dot healthy"), "healthy green indicator must render immediately right of its title");
const healthTop = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-health-top")[0];
assert(healthTop && String(healthTop.children[0]?.props?.className || "") === "git-comments-health-title" && String(healthTop.children[1]?.props?.className || "") === "git-comments-health-actions" && nodes(healthTop.children[1], (node) => String(node.props?.className || "").includes("git-comments-button export-html")).length === 1, "health actions must retain the Briefs-style HTML control at top-right");
assert(source.includes('.git-comments-health-top{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}'), "export control must be pinned to the health card's top-right");
assert(source.includes('.git-comments-button.export-html{display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:54px;padding:0 24px;border:1px solid #FFE6CB;border-radius:0;background:#0b1324;color:#FFE6CB;font-size:18px;letter-spacing:.08em}'), "Git Comments export must match the pictured Briefs outlined HTML control");
assert(source.includes('.git-comments-watch-state{font-size:18.75px;line-height:1.1;font-weight:800'), "WATCHING must remain 25% larger and bold");
assert(source.includes('.git-comments-watch-state.open{color:#4ade80}'), "open WATCHING must be green");
assert(source.includes('.git-comments-watch-state.closed{color:#ef4444}'), "closed WATCHING must be red");
assert(source.includes('.git-comments-watch-state.merged{color:#a78bfa}'), "merged WATCHING must be purple");
assert(source.includes('.git-comments-number-link{font-size:25px'), "issue number must be 25% larger than 20px");
assert(source.includes('health.status === "healthy"'), "green health requires an explicit healthy execution status");
assert(checker.includes('for attempt in range(4):') && checker.includes('time.sleep(2 ** attempt)') && checker.includes('code not in {429, 500, 502, 503, 504}'), "checker GitHub transport must retry transient connection and rate-limit failures");
assert(api.includes('for attempt in range(4):') && api.includes('time.sleep(2 ** attempt)') && api.includes('code not in {429, 500, 502, 503, 504}') && api.includes('@router.post("/refresh")'), "immediate hydration and manual recovery must share bounded retry semantics");
const issue58510 = nodes(tree, (node) => String(node.props?.className || "").includes("git-comments-issue") && text(node).includes("#58510"))[0];
const commentsIndex = issue58510.children.findIndex((node) => String(node?.props?.className || "") === "git-comments-comments");
const activityToggleIndex = issue58510.children.findIndex((node) => String(node?.props?.className || "") === "git-comments-button activity-toggle");
assert(activityToggleIndex > commentsIndex && issue58510.children.findIndex((node) => String(node?.props?.className || "") === "git-comments-events") === -1, "collapsed activity control must follow comments while the timeline remains hidden");
assert(source.includes('.git-comments-repo-primary{font-size:20.8px;color:#fff;font-weight:900}'), "repository name must be exactly 30% larger than 16px and extra bold");

const healthyFixture = fixture;
fixture = { ...healthyFixture, watcher_health: { ok: false, stale: false, status: "failed", checked_at: "2026-07-19T04:01:00Z", error: "HTTPError: HTTP Error 503" } };
tree = registered();
rendered = text(tree);
const retryButton = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-button retry-connection")[0];
assert(rendered.includes("BROKEN") && retryButton && text(retryButton).trim() === "RETRY CONNECTION" && typeof retryButton.props?.onClick === "function", "broken health must expose an explicit connection recovery action");
assert(source.includes('fetchJSON(`${API}/refresh`, { method: "POST" })') && source.includes('showSuccess("CONNECTION RESTORED!", 2000, "green")'), "retry action must call the dedicated refresh endpoint and confirm only successful recovery with the unified two-second dwell");
fixture = healthyFixture;
tree = registered();
rendered = text(tree);

const primaryFixture = fixture;
fixture = {
  ...primaryFixture,
  watchlist: {
    ...primaryFixture.watchlist,
    active: [{
      id: "owner/repo/issues/42", url: "https://github.com/Owner/Repo/issues/42", repo: "Owner/Repo", number: 42, kind: "issue",
      presentation: {
        watch_id: "owner/repo/issues/42", repo: "Owner/Repo", kind: "issue", number: 42,
        title: "Immediately hydrated issue title", body: "The complete initial issue body remains readable before the background checker finishes.",
        html_url: "https://github.com/Owner/Repo/issues/42", state: "open", author: { login: "issue-author", avatar_url: "author-avatar" },
        created_at: "2026-07-18T18:00:00Z", updated_at: "2026-07-19T03:30:00Z",
        at_a_glance: "Newly watched items immediately show complete GitHub context while one durable summary follows them through their lifecycle.",
        comments: [{ id: 42, body: "Initial maintainer comment", html_url: "https://github.com/Owner/Repo/issues/42#issuecomment-42", author: { login: "maintainer", avatar_url: "maintainer-avatar" } }],
        status_events: [{ id: "opened-42", event: "opened", created_at: "2026-07-18T18:00:00Z", actor: { login: "issue-author", avatar_url: "author-avatar" } }],
        received_count: 1, new_received_count: 1,
      },
    }],
  },
  issues: [],
};
tree = registered();
rendered = text(tree);
assert(rendered.includes("Immediately hydrated issue title") && rendered.includes("The complete initial issue body remains readable") && rendered.includes("by issue-author"), "newly added item must render its persisted title, body, and author before a full checker result exists");
assert(rendered.includes("Newly watched items immediately show complete GitHub context") && nodes(tree, (node) => String(node.props?.className || "") === "git-comments-at-a-glance").length === 1, "newly added item must render its one-time cyan AT A GLANCE summary");
assert(nodes(tree, (node) => String(node.props?.className || "") === "git-comments-comment-label open" && text(node).trim() === "COMMENTS (1)").length === 1, "immediately hydrated open item must render the required opaque green comment pill");
assert(nodes(tree, (node) => String(node.props?.className || "") === "git-comments-current-state open" && text(node).trim() === "STATUS: OPEN").length === 1, "immediately hydrated open item must render the required translucent green status pill");
assert(!rendered.includes("Waiting for the first successful GitHub check."), "a persisted presentation must never regress to the unknown/never placeholder");
assert(source.includes('.git-comments-at-a-glance{margin-top:10px;color:#22d3ee;') && source.includes('"AT A GLANCE:"'), "active one-time summary must use explicit cyan styling and label");
assert(source.includes('const presentation = entry.presentation || {};') && source.includes('at_a_glance: presentation.at_a_glance || liveIssue?.at_a_glance || ""'), "active rendering must overlay dynamic checker data onto the persisted presentation without replacing its summary");
fixture = primaryFixture;
fixture = {
  ...primaryFixture,
  watchlist: { ...primaryFixture.watchlist, active: [primaryFixture.watchlist.active[0]] },
  issues: [{ ...primaryFixture.issues[0], author: { login: "AgentAi-Leo", avatar_url: "owner-avatar" } }],
};
tree = registered();
const ownerStars = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-owner-star" && text(node).trim() === "★");
assert(ownerStars.length === 1 && ownerStars[0].props?.title === "Watchlist profile owner" && ownerStars[0].props?.["aria-label"] === "Watchlist profile owner", "payload author matching the configured watchlist profile must show an accessible star beside the avatar");
const ownerTreeButtons = nodes(tree, (node) => node.type === "button");
assert(ownerTreeButtons.length > 0 && ownerTreeButtons.every((button) => button.props?.["data-cuelume-press"] === ""), "every rendered live button must automatically carry data-cuelume-press");
assert(source.includes('.git-comments-owner-star{color:#facc15;') && source.includes('issueAuthor.toLowerCase() === String(owner || "").toLowerCase()'), "owner-star styling and profile comparison missing");
fixture = {
  ...primaryFixture,
  watchlist: { ...primaryFixture.watchlist, active: [{ id: "nousresearch/hermes-agent/pull/60000", url: "https://github.com/NousResearch/hermes-agent/pull/60000", repo: "NousResearch/hermes-agent", number: 60000, kind: "pull" }] },
  issues: [{ watch_id: "nousresearch/hermes-agent/pull/60000", repo: "NousResearch/hermes-agent", number: 60000, html_url: "https://github.com/NousResearch/hermes-agent/pull/60000", state: "closed", merged: true, merged_at: "2026-07-19T04:30:00Z", author: { login: "teknium1", avatar_url: "avatar" }, comments: [], status_events: [] }],
};
tree = registered();
assert(nodes(tree, (node) => String(node.props?.className || "") === "git-comments-current-state merged" && text(node).trim() === "STATUS: MERGED").length === 1, "merged PR must render STATUS: MERGED");
assert(nodes(tree, (node) => String(node.props?.className || "") === "git-comments-comment-label merged" && text(node).trim() === "COMMENTS (0)").length === 1, "merged PR comment pill must be purple-status class");
assert(nodes(tree, (node) => String(node.props?.className || "") === "git-comments-watch-state merged" && text(node).trim() === "WATCHING").length === 1, "merged PR WATCHING text must be purple-status class");
fixture = primaryFixture;

fixture = { ...fixture, watcher_health: { ok: false, stale: false, status: "failed", error: "network" } };
tree = registered();
rendered = text(tree);
assert(rendered.includes("BROKEN"), "failed watcher must read BROKEN");
assert(nodes(tree, (node) => String(node.props?.className || "").includes("git-comments-health-dot healthy")).length === 0, "failed watcher must not render green dot");
assert(nodes(tree, (node) => String(node.props?.className || "").includes("git-comments-health-dot broken")).length === 1, "failed watcher must render red broken dot");

fixture = { ...fixture, watcher_health: { ok: true, stale: true, status: "healthy", checked_at: "2026-07-18T01:00:00Z" } };
tree = registered();
rendered = text(tree);
assert(rendered.includes("BROKEN"), "stale watcher must read BROKEN even if its last execution succeeded");
assert(nodes(tree, (node) => String(node.props?.className || "").includes("git-comments-health-dot broken")).length === 1, "stale watcher must render red broken dot");

fixture = { ...fixture, watchlist: { ...fixture.watchlist, active: [], archived: [{ id: "nousresearch/hermes-agent/issues/58510", url: "https://github.com/NousResearch/hermes-agent/issues/58510", repo: "NousResearch/hermes-agent", number: 58510, kind: "issue", archived_at: "2026-07-19T05:00:00Z", presentation: { author: { login: "AgentAi-Leo", avatar_url: "owner-avatar" }, at_a_glance: "One persisted summary follows this item into archive without another summarization pass." }, snapshot: { title: "Archive summary rendering", body: "The complete archived body remains available.", author: { login: "AgentAi-Leo", avatar_url: "owner-avatar" }, at_a_glance: "One persisted summary follows this item into archive without another summarization pass." } }] }, issues: [] };
tree = registered();
rendered = text(tree);
assert(rendered.includes("UNARCHIVE"), "archived entry unarchive control missing");
const archivedRows = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-archived-row");
assert(archivedRows.length === 1 && nodes(archivedRows[0], (node) => String(node.props?.className || "").includes("git-comments-button unarchive") && text(node).trim() === "UNARCHIVE").length === 1, "archived row must contain an UNARCHIVE button");
assert(archivedRows.length === 1 && nodes(archivedRows[0], (node) => String(node.props?.className || "").includes("git-comments-button delete") && text(node).trim() === "DELETE").length === 1, "archived row must contain a permanent DELETE button");
assert(archivedRows.length === 1 && nodes(archivedRows[0], (node) => String(node.props?.className || "").includes("git-comments-button view-archived") && text(node).trim() === "VIEW ISSUE").length === 1, "archived issue row must contain a small VIEW ISSUE button");
assert(String(archivedRows[0].children[0]?.props?.className || "") === "git-comments-archived-content", "archived identity and summary must occupy the left flexible content column");
const archivedPrimary = archivedRows[0].children[0]?.children?.[0];
assert(String(archivedPrimary?.props?.className || "") === "git-comments-archived-primary" && nodes(archivedPrimary, (node) => String(node.props?.className || "") === "git-comments-issue-author" && text(node).trim() === "by AgentAi-Leo").length === 1 && nodes(archivedPrimary, (node) => String(node.props?.className || "") === "git-comments-issue-avatar" && node.props?.src === "owner-avatar").length === 1 && nodes(archivedPrimary, (node) => String(node.props?.className || "") === "git-comments-owner-star" && text(node).trim() === "★").length === 1 && nodes(archivedPrimary, (node) => String(node.props?.className || "") === "git-comments-time").length === 1 && nodes(archivedPrimary, (node) => String(node.props?.className || "").includes("git-comments-button view-archived")).length === 1, "archived row must preserve the post author, avatar, and owner star before its timestamp and inline VIEW control");
assert(source.includes('const archivedAuthor = entry.presentation?.author || entry.snapshot?.author || hydratedIssue?.author || {}') && source.includes('archivedAuthorLogin.toLowerCase() === String(owner || "").toLowerCase()'), "archived owner star must derive from persisted presentation/snapshot author data with legacy hydration fallback");
const archivedActions = archivedRows[0].children[1];
assert(String(archivedActions?.props?.className || "") === "git-comments-archived-actions" && String(archivedActions.children[0]?.props?.className || "").includes("git-comments-button unarchive") && String(archivedActions.children[1]?.props?.className || "").includes("git-comments-button delete"), "UNARCHIVE and DELETE must share one right-side action group");
assert(source.includes('.git-comments-archived-row{display:flex;align-items:flex-start;') && source.includes('.git-comments-archived-actions{display:flex;align-items:center;gap:12px;margin-left:auto;flex:0 0 auto}') && source.includes('.git-comments-archived-actions .git-comments-button{min-height:32px;height:32px;padding:5px 11px;font-size:12px}'), "archived actions must move up, remain right-aligned, and match the 32px VIEW height");
const archivedSummary = nodes(archivedRows[0], (node) => String(node.props?.className || "") === "git-comments-archived-summary")[0];
assert(text(archivedSummary).trim() === "One persisted summary follows this item into archive without another summarization pass.", "archive row must reuse the exact persisted one-time summary");
assert(source.includes('.git-comments-archived-summary{margin-top:7px;color:#22d3ee;font-size:15.6px;'), "archived issue summary must be cyan and exactly 20% larger than the 13px archive timestamp");
assert(!source.includes("function archivedSummary"), "client-side archive summarization must be removed");
assert(source.includes('entry.presentation?.at_a_glance || entry.snapshot?.at_a_glance || hydratedIssue?.at_a_glance || ""'), "archive must reuse the persisted summary and allow only server-migrated legacy fallback data");
assert(source.includes('fetchJSON(`${API}/watchlist/view-archived`') && source.includes('setArchiveHydration'), "legacy archived rows must hydrate summaries through the existing read-only endpoint");
const archivedViewLabelFunction = source.match(/function archivedViewLabel\(entry, hydratedIssue\) \{([\s\S]*?)\n  \}/);
assert(archivedViewLabelFunction, "archived VIEW label helper missing");
const archiveViewLabel = vm.runInNewContext(`(function archivedViewLabel(entry, hydratedIssue) {${archivedViewLabelFunction[1]}\n})`);
assert(archiveViewLabel({ kind: "issue", url: "https://github.com/o/r/issues/1" }) === "VIEW ISSUE", "issue button must read VIEW ISSUE");
assert(archiveViewLabel({ kind: "pull", url: "https://github.com/o/r/pull/2" }) === "VIEW PR", "pull-request button must read VIEW PR");
assert(source.includes('.git-comments-success{position:fixed;left:50%;top:50%;') && !source.includes('.git-comments-success.top{') && !source.includes('.git-comments-success.bottom{'), "all completion popups must use one unified center-screen position");
assert(source.includes('.git-comments-success{position:fixed;left:50%;top:50%;z-index:1100;width:max-content;min-width:min(589.7103px,calc(100vw - 70.3257px));max-width:calc(100vw - 70.3257px);min-height:min(245.1429px,calc(100vh - 70.3257px));'), "success popup box geometry must match the measured yellow guide");
assert(source.includes('padding:83.5714px 70.3257px;border:1px solid rgba(187,247,208,.9);border-radius:25px;'), "success popup must use guide-derived padding with the retained 25px rounded-rectangle radius and pale green edge");
assert(source.includes('font-family:"Alumni Sans SC",sans-serif;font-size:60.54px;line-height:1.25;font-weight:800;letter-spacing:.04em;text-align:center;white-space:nowrap;') && !source.includes('letter-spacing:.01em;text-align:center;white-space:nowrap;') && !source.includes('font-size:48.43px') && !source.includes('font-size:38.1875px'), "success text must use Alumni Sans SC at 60.54px with the selected 0.04em spacing on every popup");
assert(source.includes('box-shadow:0 15.6px 41.6px rgba(0,0,0,.6),0 5.2px 15.6px rgba(0,0,0,.36),0 0 14px rgba(134,239,172,.22),inset 0 1px 0 rgba(255,255,255,.16);backdrop-filter:blur(5.2px)'), "success shadow and blur must retain Revision 45 values plus a subtle matching outer glow and very light inner highlight");
assert(source.includes('.git-comments-success.cyan{border-color:rgba(165,243,252,.9);background:rgba(8,51,68,.95);color:rgba(255,255,255,.9);box-shadow:0 15.6px 41.6px rgba(0,0,0,.6),0 5.2px 15.6px rgba(0,0,0,.36),0 0 14px rgba(103,232,249,.22),inset 0 1px 0 rgba(255,255,255,.16)}'), "archive success must use 95% cyan fill and white text with a matching pale cyan edge glow");
assert(source.includes('.git-comments-success.red{border-color:rgba(254,202,202,.9);background:rgba(74,21,27,.95);color:rgba(255,255,255,.9);box-shadow:0 15.6px 41.6px rgba(0,0,0,.6),0 5.2px 15.6px rgba(0,0,0,.36),0 0 14px rgba(252,165,165,.22),inset 0 1px 0 rgba(255,255,255,.16)}'), "delete success must use 95% red fill and white text with a matching pale red edge glow");
assert(!source.includes('min-width:min(654.0625px,calc(100vw - 78px))') && !source.includes('min-height:min(143px,calc(100vh - 78px))') && !source.includes('padding:48.75px 78px') && !source.includes('min-width:min(523.25px,calc(100vw - 62.4px))') && !source.includes('padding:39px 62.4px') && !source.includes('border-radius:35px') && !source.includes('.git-comments-success{border-radius:999px') && !source.includes('.git-comments-success{border-radius:50%'), "all success popups must remove superseded Revision 47/46 geometry and remain 25px rounded rectangles rather than pills");
assert(!source.includes('width:min(805px') && !source.includes('min-height:min(176px') && !source.includes('font-size:47px'), "superseded Revision 44 popup geometry must be absent");
assert(source.includes('showSuccess("URL SUCCESSFULLY ARCHIVED!", 2000, "cyan")'), "archive success must use the unified cyan 2-second popup");
assert(source.includes('showSuccess("SUCCESSFULLY DELETED!", 2000, "red")'), "both delete paths must use the red SUCCESSFULLY DELETED popup");
assert(source.match(/showSuccess\("SUCCESSFULLY DELETED!", 2000, "red"\)/g)?.length === 2, "main-watch and archived delete paths must each publish red success");
assert(!source.includes('showSuccess("URL ADDED SUCCESSFULLY!", 3000)') && source.match(/showSuccess\([^\n]+2000/g)?.length === 6, "all six successful action paths must use one 2000ms dwell, exactly one second shorter than Revision 51");
assert(source.includes('showSuccess("SUCCESSFULLY UNARCHIVED!", 2000, "green")'), "unarchive must publish the exact green unified-center success popup");
assert(!source.includes('SUCCESSFULLY UNARCHIVED!!'), "obsolete double-exclamation unarchive text must be removed");
assert(source.includes('git-comments-success ${successTone}') && source.includes('setSuccessTone(tone)') && !source.includes('successPlacement'), "success renderer must apply only tone because every action shares one center position");
assert(source.includes('role: "dialog", "aria-modal": "true"') && source.includes('className: "git-comments-archive-modal"'), "VIEW must open an accessible in-dashboard read-only modal");
assert(source.includes('className: "git-comments-button close-archive-view"') && source.includes('"CLOSE"'), "archived-item modal must provide an explicit CLOSE button");
assert(source.includes('window.addEventListener("keydown", closeArchiveViewOnEscape, true)') && source.includes('event.stopImmediatePropagation()') && source.includes('window.removeEventListener("keydown", closeArchiveViewOnEscape, true)'), "modal Escape handler must run in capture phase, stop conflicting keybinds, and clean up");
assert(source.includes('fetchJSON(`${API}/watchlist/view-archived`') && source.includes('method: "POST"'), "VIEW must use the read-only archived-item API");
assert(source.includes('.git-comments-button.view-archived{min-height:32px;padding:5px 11px;'), "archived VIEW control must remain small");
assert(source.includes('.git-comments-archive-backdrop{position:fixed;inset:0;z-index:1000;') && source.includes('.git-comments-archive-modal{'), "archived item must render as a focused overlay rather than expanding the archive row");

assert(source.includes('new Set(["opened", "closed", "reopened", "labeled", "unlabeled"])'), "timeline must retain lifecycle and label/tag events");
assert(source.includes("labelColor") && source.includes("item.label"), "label/tag data must be rendered as a visible timeline pill");
assert(source.includes('mutate("/watchlist/delete", { id })'), "DELETE action must call the permanent-delete endpoint");
assert(source.includes("Permanently delete this watched URL?"), "DELETE action must require explicit confirmation");
assert(source.includes('const unarchive = async (id) => { if (await mutate("/watchlist/restore", { id })) showSuccess("SUCCESSFULLY UNARCHIVED!", 2000, "green"); }'), "UNARCHIVE must use the archived restore endpoint and publish green feedback only after success with the unified two-second dwell");
assert(source.includes("Permanently delete this archived URL?"), "archived DELETE action must require explicit confirmation");
assert(source.includes("duplicateWatchId"), "client must preflight canonical duplicate URLs");
const duplicateFunctions = source.match(/(function watchIdFromUrl\(value\) \{[^\n]+\}\n  function duplicateWatchId\(value, active, archived\) \{[^\n]+\})/);
assert(duplicateFunctions, "canonical duplicate helpers must remain extractable for execution tests");
const duplicateWatchId = vm.runInNewContext(`(() => { ${duplicateFunctions[1]}; return duplicateWatchId; })()`, { URL });
const activeDuplicates = [{ id: "owner/repo/issues/42" }];
const archivedDuplicates = [{ id: "owner/repo/pull/84" }];
for (const candidate of ["https://github.com/owner/repo/issues/42", "https://github.com/OWNER/REPO/issues/42/", "https://github.com/Owner/Repo/issues/42?tab=comments", "https://github.com/Owner/Repo/issues/42#issuecomment-1"]) assert(duplicateWatchId(candidate, activeDuplicates, archivedDuplicates), `active duplicate variant was accepted: ${candidate}`);
for (const candidate of ["https://github.com/owner/repo/pull/84", "https://github.com/OWNER/REPO/pull/84/?diff=split", "https://github.com/Owner/Repo/pull/84#discussion_r1"]) assert(duplicateWatchId(candidate, activeDuplicates, archivedDuplicates), `archived duplicate variant was accepted: ${candidate}`);
assert(!duplicateWatchId("https://github.com/owner/repo/issues/43", activeDuplicates, archivedDuplicates), "a distinct issue URL must not be rejected as duplicate");
assert(source.includes('const API = "/api/plugins/git-comments-v27-review"'), "renderer must use isolated review API root");
assert(source.includes('fetchJSON(`${API}/data`)'), "renderer must load isolated review data");
assert(source.includes('register("git-comments-v27-review"'), "renderer must register isolated review plugin ID");
assert(checker.includes('plugins/git-comments-v27-review/dashboard'), "watcher must write only to isolated review data");
assert(!checker.includes('plugins/git-comments/dashboard'), "watcher must not write production Git Comments data");
assert(checker.includes('/timeline?per_page=100'), "watcher must fetch GitHub timeline");
assert(checker.includes('"event": "opened"'), "watcher must synthesize the important opening lifecycle event");
assert(checker.includes('"labeled"') && checker.includes('"unlabeled"') && checker.includes('"label":'), "watcher must persist visible GitHub label/tag events");
assert(checker.includes('"author_association"'), "watcher must preserve commenter association");
assert(checker.includes('GIT_COMMENTS_HEALTH_FILE'), "watcher must atomically record health");
assert(checker.includes('GIT_COMMENTS_WATCHLIST_FILE'), "watcher must read the persistent watchlist");
assert(!checker.includes('watched = ['), "watcher must not contain a hardcoded issue list");
assert(!checker.includes('58130') && !checker.includes('58510'), "migrated issue numbers must not remain in checker source");
assert(api.includes('@router.post("/watchlist/add")'), "API add endpoint missing");
assert(api.includes('entry["presentation"] = _live_entry_snapshot(entry, str(watchlist.get("comment_owner") or ""))'), "Add must hydrate and persist one complete presentation before insertion");
assert(api.includes('raise HTTPException(status_code=502, detail=f"Unable to load GitHub item before adding it: {reason}")'), "Add must reject rather than persist an unknown/never placeholder when hydration fails");
assert(api.includes('summary = str(((entry.get("presentation") or {}).get("at_a_glance")) or "")'), "archive must take summary ownership from the persisted presentation");
assert(api.includes('entry["presentation"] = issue') && api.includes('"source": "github_live_migrated"'), "legacy archive hydration must persist a one-time server-side presentation migration");
assert(api.includes('source_words = _clean_markdown(summary_section or body or title).split()[:100]') && api.includes('words = candidate.split()[:30]') && api.includes('if len(rendered) <= 160'), "server summary generation must inspect at most 100 source words and display at most 30 words within 160 characters");
assert(!api.includes('entry.pop("presentation", None)'), "unarchive must retain the one-time presentation snapshot");
assert(api.includes('@router.post("/watchlist/view-archived")'), "read-only archived-item API endpoint missing");
assert(api.includes('entry["snapshot"] = _sanitize_snapshot(snapshot)'), "archive mutation must retain a sanitized read-only snapshot");
assert(api.includes('@router.post("/watchlist/archive")'), "API archive endpoint missing");
assert(api.includes('@router.post("/watchlist/restore")'), "API restore endpoint missing");
assert(api.includes('@router.post("/watchlist/delete")'), "API permanent-delete endpoint missing");
assert(api.includes('os.replace(temporary, path)'), "watchlist writes must publish atomically");
assert(api.includes('_MAX_HEALTH_AGE = timedelta(hours=6)'), "API must enforce freshness window");
assert(api.includes('payload["watcher_health"] = _watcher_health()'), "API must expose computed health");
console.log("GIT_COMMENTS_STATUS_HEALTH_RUNTIME=PASS");
