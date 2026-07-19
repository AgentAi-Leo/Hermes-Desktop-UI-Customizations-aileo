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
    active: [{ id: "nousresearch/hermes-agent/issues/58510", url: "https://github.com/NousResearch/hermes-agent/issues/58510", repo: "NousResearch/hermes-agent", number: 58510, kind: "issue" }],
    archived: [],
  },
  issues: [{
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
assert(!rendered.includes("View on GitHub"), "redundant issue link must be absent when a real received comment exists");
assert(rendered.includes("Contributor"), "commenter association missing");
assert(rendered.includes("closed this as not planned"), "closure reason event missing");
assert(rendered.includes("sweeper:cannot-reproduce"), "label event missing");
assert(rendered.includes("Watcher healthy"), "healthy title missing");
assert(rendered.includes("+ ADD URL TO WATCH"), "add URL control missing");
assert(rendered.includes("✓ ARCHIVE"), "archive checkmark control missing");
assert(rendered.includes("ARCHIVED (0)"), "archived summary missing");
assert(nodes(tree, (node) => String(node.props?.className || "").includes("git-comments-health-dot healthy")).length === 1, "green health dot missing for fresh success");

fixture = { ...fixture, watcher_health: { ok: false, stale: false, status: "failed", error: "network" } };
tree = registered();
rendered = text(tree);
assert(rendered.includes("Watcher needs attention"), "failed watcher must not claim healthy");
assert(nodes(tree, (node) => String(node.props?.className || "").includes("git-comments-health-dot healthy")).length === 0, "failed watcher must not render green dot");

fixture = { ...fixture, watchlist: { ...fixture.watchlist, active: [], archived: [{ id: "nousresearch/hermes-agent/issues/58510", url: "https://github.com/NousResearch/hermes-agent/issues/58510", repo: "NousResearch/hermes-agent", number: 58510, archived_at: "2026-07-19T05:00:00Z" }] }, issues: [] };
tree = registered();
rendered = text(tree);
assert(rendered.includes("WATCH AGAIN"), "archived entry restore control missing");

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
