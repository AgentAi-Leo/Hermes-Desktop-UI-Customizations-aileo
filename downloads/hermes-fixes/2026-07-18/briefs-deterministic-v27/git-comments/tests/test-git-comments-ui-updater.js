const fs = require("fs");
const assert = require("assert");
const vm = require("vm");

const installerPath = process.argv[2];
const source = fs.readFileSync(installerPath, "utf8");
const renderer = fs.readFileSync(process.argv[3], "utf8");

assert(!source.includes('curl -fsS "http://127.0.0.1:$PORT/api/plugins/git-comments-v27-review/data"'), "updater must not curl the browser-authenticated plugin data endpoint");
assert(source.includes('"$PROFILE_DATA/git-comments.json"'), "updater must verify the freshly written profile snapshot directly");
assert(source.includes('"$PROFILE_DATA/watcher-health.json"'), "updater must verify the freshly written profile health directly");
assert(source.includes('datetime.now(timezone.utc) - checked_at <= timedelta(hours=6)'), "updater must enforce the same six-hour freshness rule as the API");
assert(source.includes('V27_PROFILE_HEALTH_LIFECYCLE_AND_CONTEXT=PASS'), "direct profile context verification success marker missing");
assert(source.includes('API_SOURCE="$PACKAGE_DIR/plugin_api.py"'), "updater must package the permanent-delete API");
assert(source.includes('MANIFEST_SOURCE="$PACKAGE_DIR/manifest.json"'), "updater must package the GIT WATCH dashboard manifest");
assert(source.includes('for destination in "$LAUNCH_MANIFEST" "$PROFILE_MANIFEST"'), "updater must install the GIT WATCH manifest into both candidate roots");
assert(source.includes('p.get("label")=="GIT WATCH"'), "live plugin discovery must verify the exact GIT WATCH tab label");
assert(!source.includes('setActionSuccess("URL ADDED SUCCESSFULLY!")'), "updater must not retain the obsolete direct-success assertion");
assert(!source.includes('className: "git-comments-success", role: "status"'), "updater must not retain the obsolete fixed success-class assertion");
const requiredBlock = source.match(/required = (\[[\s\S]*?\])\nfor marker in required:/);
assert(requiredBlock, "updater renderer-marker block missing");
const requiredMarkers = vm.runInNewContext(requiredBlock[1]);
const missingMarkers = requiredMarkers.filter((marker) => !renderer.includes(marker));
assert.deepStrictEqual(Array.from(missingMarkers), [], `updater has stale renderer markers: ${missingMarkers.join(" | ")}`);
assert(source.includes('for destination in "$LAUNCH_API" "$PROFILE_API"'), "updater must install the API into both candidate roots");
assert(source.includes('allowed = {"opened", "closed", "reopened", "labeled", "unlabeled"}'), "updater must verify lifecycle and label/tag event data");
assert(source.includes('ui=303'), "Revision 33 cache-busting marker missing");
assert(source.indexOf('GIT_COMMENTS_V27_UI_REFINEMENTS=PASS') < source.indexOf('open -a "Brave Browser"'), "Brave must open only after every verification passes");
console.log("GIT_COMMENTS_UI_UPDATER_AUTH_REGRESSION=PASS");
