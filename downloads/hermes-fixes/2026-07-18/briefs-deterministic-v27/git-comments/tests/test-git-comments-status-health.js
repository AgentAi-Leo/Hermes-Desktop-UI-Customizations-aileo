const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const pluginPath = process.argv[2];
const checkerPath = process.argv[3];
const apiPath = process.argv[4];
const source = fs.readFileSync(pluginPath, "utf8");
const checker = fs.readFileSync(checkerPath, "utf8");
const api = fs.readFileSync(apiPath, "utf8");
let registered = null;
let fixture = null;
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
  hooks: {
    useState(initial) {
      if (initial && typeof initial === "object" && Object.prototype.hasOwnProperty.call(initial, "loading")) return [fixture ? { loading: false, data: fixture, error: null } : initial, () => {}];
      return [initial, () => {}];
    },
    useEffect() {},
    useMemo(fn) { return fn(); },
  },
};
const context = { window: { confirm: () => true, __HERMES_PLUGIN_SDK__: sdk, __HERMES_PLUGINS__: { register(_name, component) { registered = component; } } }, console };
vm.createContext(context);
vm.runInContext(source, context);
assert(registered, "plugin must register");

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
    comments: [],
    status_events: [],
    new_received_count: 0,
  }, {
    watch_id: "nousresearch/hermes-agent/issues/58510",
    repo: "NousResearch/hermes-agent",
    number: 58510,
    html_url: "https://github.com/NousResearch/hermes-agent/issues/58510",
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
assert(rendered.includes("COMMENTS (1)"), "comment badge missing");
assert(!rendered.includes("COMMENTS RECEIVED"), "received text must be removed from the comment pill");
assert(!rendered.includes("View on GitHub"), "redundant source-link text must be absent everywhere");
assert(rendered.includes("Contributor"), "commenter association missing");
assert(rendered.includes("closed this as not planned"), "closure reason event missing");
assert(rendered.includes("sweeper:cannot-reproduce"), "GitHub label/tag timeline event missing");
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
const commentedIdentity = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-issue-identity" && text(node).includes("#58510"))[0];
assert(nodes(commentedIdentity, (node) => String(node.props?.className || "") === "git-comments-issue-meta" && text(node).includes("COMMENTS (1)") && !text(node).includes("RECEIVED")).length === 1, "comment pill must omit received text");
assert(source.includes('.git-comments-comment-label{display:inline-flex;align-items:center;padding:6.25px 12.5px;') && source.includes('font-size:15px;font-weight:850'), "comment pill must be exactly 25% larger in font and padding");
assert(nodes(tree, (node) => String(node.props?.className || "") === "git-comments-event-label" && text(node).includes("sweeper:cannot-reproduce")).length === 1, "label event must render as a tag pill");
assert(nodes(tree, (node) => String(node.props?.className || "").includes("git-comments-button delete") && text(node).includes("DELETE")).length === 2, "every active watched item must have a red DELETE action");
assert.strictEqual(nodes(tree, (node) => String(node.props?.className || "").includes("git-comments-status")).length, 0, "separate received-count text must be removed");
const panelTitle = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-panel-title")[0];
assert(panelTitle && text(panelTitle).trim() === "/// WATCHED GITHUB ISSUES & PULL REQUESTS ///" && !text(panelTitle).includes("💼") && panelTitle.props?.style?.fontSize === "26.4px" && panelTitle.props?.style?.color === "#FFE6CB", "watched-items heading must use the Hermes Agent color");
assert(nodes(tree, (node) => String(node.props?.className || "").includes("git-comments-button add-toggle") && text(node).trim() === "+ ADD URL TO WATCH").length === 1, "add-watch control must have its dedicated Hermes-color class");
assert(source.includes('.git-comments-button.add-toggle{border-color:#FFE6CB;background:#35291f;color:#FFE6CB}'), "add-watch button must use Hermes Agent color");
assert(source.includes('.git-comments-button.submit-add{border-color:#4ade80;background:#123c2b;color:#b7f7cc}'), "form ADD URL button must be green");
assert(source.includes('.git-comments-button.cancel-add{border-color:#ef4444;background:#4a151b;color:#fecaca}'), "form CANCEL button must be red");
assert(source.includes('if (event.key === "Escape")') && source.includes('closeAddForm();'), "Escape must clear and close the add form");
assert(source.includes('if (event.key === "Enter" && String(event.target?.tagName || "").toUpperCase() === "INPUT")') && source.includes('event.currentTarget.requestSubmit();'), "Enter in the URL input must explicitly submit the add form");
assert(source.includes('className: "git-comments-add-form", onSubmit: addUrl, onKeyDown: addFormKeyDown'), "add form must wire both submit and keyboard handlers");
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
assert(source.includes('.git-comments-watch-state{font-size:18.75px;line-height:1.1;color:#4ade80;font-weight:800'), "WATCHING must be 25% larger, bold, and green");
assert(source.includes('.git-comments-number-link{font-size:25px'), "issue number must be 25% larger than 20px");
assert(source.includes('health.status === "healthy"'), "green health requires an explicit healthy execution status");
const issue58510 = nodes(tree, (node) => String(node.props?.className || "").includes("git-comments-issue") && text(node).includes("#58510"))[0];
const importantTimelineIndex = issue58510.children.findIndex((node) => String(node?.props?.className || "") === "git-comments-events");
const commentsIndex = issue58510.children.findIndex((node) => String(node?.props?.className || "") === "git-comments-comments");
assert(importantTimelineIndex > commentsIndex, "lifecycle/tag timeline must render at the end of the issue card after comments");
assert(source.includes('.git-comments-repo-primary{font-size:20.8px;color:#fff;font-weight:900}'), "repository name must be exactly 30% larger than 16px and extra bold");

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

fixture = { ...fixture, watchlist: { ...fixture.watchlist, active: [], archived: [{ id: "nousresearch/hermes-agent/issues/58510", url: "https://github.com/NousResearch/hermes-agent/issues/58510", repo: "NousResearch/hermes-agent", number: 58510, archived_at: "2026-07-19T05:00:00Z" }] }, issues: [] };
tree = registered();
rendered = text(tree);
assert(rendered.includes("WATCH AGAIN"), "archived entry restore control missing");

assert(source.includes('new Set(["opened", "closed", "reopened", "labeled", "unlabeled"])'), "timeline must retain lifecycle and label/tag events");
assert(source.includes("labelColor") && source.includes("item.label"), "label/tag data must be rendered as a visible timeline pill");
assert(source.includes('mutate("/watchlist/delete", { id })'), "DELETE action must call the permanent-delete endpoint");
assert(source.includes("Permanently delete this watched URL?"), "DELETE action must require explicit confirmation");
assert(source.includes("duplicateWatchId"), "client must preflight canonical duplicate URLs");
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
assert(api.includes('@router.post("/watchlist/archive")'), "API archive endpoint missing");
assert(api.includes('@router.post("/watchlist/restore")'), "API restore endpoint missing");
assert(api.includes('@router.post("/watchlist/delete")'), "API permanent-delete endpoint missing");
assert(api.includes('os.replace(temporary, path)'), "watchlist writes must publish atomically");
assert(api.includes('_MAX_HEALTH_AGE = timedelta(hours=6)'), "API must enforce freshness window");
assert(api.includes('payload["watcher_health"] = _watcher_health()'), "API must expose computed health");
console.log("GIT_COMMENTS_STATUS_HEALTH_RUNTIME=PASS");
