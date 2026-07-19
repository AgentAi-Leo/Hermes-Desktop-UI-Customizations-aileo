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
    useState() { return [fixture ? { loading: false, data: fixture, error: null } : { loading: true, data: null, error: null }, () => {}]; },
    useEffect() {},
    useMemo(fn) { return fn(); },
  },
};
const context = { window: { __HERMES_PLUGIN_SDK__: sdk, __HERMES_PLUGINS__: { register(_name, component) { registered = component; } } }, console };
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
  owner: "AgentAi-Leo",
  checked_at: "2026-07-19T04:00:00Z",
  watcher_health: { ok: true, stale: false, status: "healthy", checked_at: "2026-07-19T04:00:00Z" },
  issues: [{
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
assert(nodes(tree, (node) => String(node.props?.className || "").includes("git-comments-health-dot healthy")).length === 1, "green health dot missing for fresh success");

fixture = { ...fixture, watcher_health: { ok: false, stale: false, status: "failed", error: "network" } };
tree = registered();
rendered = text(tree);
assert(rendered.includes("Watcher needs attention"), "failed watcher must not claim healthy");
assert(nodes(tree, (node) => String(node.props?.className || "").includes("git-comments-health-dot healthy")).length === 0, "failed watcher must not render green dot");

assert(checker.includes('/timeline?per_page=100'), "watcher must fetch GitHub timeline");
assert(checker.includes('"author_association"'), "watcher must preserve commenter association");
assert(checker.includes('GIT_COMMENTS_HEALTH_FILE'), "watcher must atomically record health");
assert(api.includes('_MAX_HEALTH_AGE = timedelta(hours=6)'), "API must enforce freshness window");
assert(api.includes('payload["watcher_health"] = _watcher_health()'), "API must expose computed health");
console.log("GIT_COMMENTS_STATUS_HEALTH_RUNTIME=PASS");
