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
assert(rendered.includes("COMMENTS (1)"), "received comment badge missing");
assert(!rendered.includes("View on GitHub"), "redundant source-link text must be absent everywhere");
assert(rendered.includes("Contributor"), "commenter association missing");
assert(rendered.includes("closed this as not planned"), "closure reason event missing");
assert(!rendered.includes("sweeper:cannot-reproduce"), "irrelevant label-change timeline rows must be removed");
assert(rendered.includes("Watcher healthy"), "healthy title missing");
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
assert(issueHeads.every((head) => nodes(head, (node) => String(node.props?.className || "") === "git-comments-watch-state").length === 1), "WATCHING must render under every repository name");
const healthTitle = nodes(tree, (node) => String(node.props?.className || "") === "git-comments-health-title")[0];
assert(String(healthTitle.children[0].props?.className || "").includes("git-comments-health-dot"), "health indicator must be the far-left item beside its title");
assert(source.includes('.git-comments-watch-state{font-size:15px'), "WATCHING must be exactly 25% larger than its former 12px size");

fixture = { ...fixture, watcher_health: { ok: false, stale: false, status: "failed", error: "network" } };
tree = registered();
rendered = text(tree);
assert(rendered.includes("Watcher needs attention"), "failed watcher must not claim healthy");
assert(nodes(tree, (node) => String(node.props?.className || "").includes("git-comments-health-dot healthy")).length === 0, "failed watcher must not render green dot");

fixture = { ...fixture, watchlist: { ...fixture.watchlist, active: [], archived: [{ id: "nousresearch/hermes-agent/issues/58510", url: "https://github.com/NousResearch/hermes-agent/issues/58510", repo: "NousResearch/hermes-agent", number: 58510, archived_at: "2026-07-19T05:00:00Z" }] }, issues: [] };
tree = registered();
rendered = text(tree);
assert(rendered.includes("WATCH AGAIN"), "archived entry restore control missing");

assert(!source.includes('item.event === "labeled"') && !source.includes('item.event === "unlabeled"'), "label-change rendering logic must be removed");
assert(!source.includes("labelColor") && !source.includes("item.label"), "unused label data fields must not remain in the renderer");
assert(source.includes('const API = "/api/plugins/git-comments-v27-review"'), "renderer must use isolated review API root");
assert(source.includes('fetchJSON(`${API}/data`)'), "renderer must load isolated review data");
assert(source.includes('register("git-comments-v27-review"'), "renderer must register isolated review plugin ID");
assert(checker.includes('plugins/git-comments-v27-review/dashboard'), "watcher must write only to isolated review data");
assert(!checker.includes('plugins/git-comments/dashboard'), "watcher must not write production Git Comments data");
assert(checker.includes('/timeline?per_page=100'), "watcher must fetch GitHub timeline");
assert(checker.includes('"author_association"'), "watcher must preserve commenter association");
assert(checker.includes('GIT_COMMENTS_HEALTH_FILE'), "watcher must atomically record health");
assert(checker.includes('GIT_COMMENTS_WATCHLIST_FILE'), "watcher must read the persistent watchlist");
assert(!checker.includes('watched = ['), "watcher must not contain a hardcoded issue list");
assert(!checker.includes('58130') && !checker.includes('58510'), "migrated issue numbers must not remain in checker source");
assert(api.includes('@router.post("/watchlist/add")'), "API add endpoint missing");
assert(api.includes('@router.post("/watchlist/archive")'), "API archive endpoint missing");
assert(api.includes('@router.post("/watchlist/restore")'), "API restore endpoint missing");
assert(api.includes('os.replace(temporary, path)'), "watchlist writes must publish atomically");
assert(api.includes('_MAX_HEALTH_AGE = timedelta(hours=6)'), "API must enforce freshness window");
assert(api.includes('payload["watcher_health"] = _watcher_health()'), "API must expose computed health");
console.log("GIT_COMMENTS_STATUS_HEALTH_RUNTIME=PASS");
