const fs = require("fs");
const assert = require("assert");

const installerPath = process.argv[2];
const source = fs.readFileSync(installerPath, "utf8");

assert(!source.includes('curl -fsS "http://127.0.0.1:$PORT/api/plugins/git-comments-v27-review/data"'), "updater must not curl the browser-authenticated plugin data endpoint");
assert(source.includes('"$PROFILE_DATA/git-comments.json"'), "updater must verify the freshly written profile snapshot directly");
assert(source.includes('"$PROFILE_DATA/watcher-health.json"'), "updater must verify the freshly written profile health directly");
assert(source.includes('datetime.now(timezone.utc) - checked_at <= timedelta(hours=6)'), "updater must enforce the same six-hour freshness rule as the API");
assert(source.includes('V27_PROFILE_HEALTH_AND_LIFECYCLE=PASS'), "direct profile verification success marker missing");
assert(source.includes('API_SOURCE="$PACKAGE_DIR/plugin_api.py"'), "updater must package the permanent-delete API");
assert(source.includes('for destination in "$LAUNCH_API" "$PROFILE_API"'), "updater must install the API into both candidate roots");
assert(source.includes('allowed = {"opened", "closed", "reopened", "labeled", "unlabeled"}'), "updater must verify lifecycle and label/tag event data");
assert(source.includes('ui=274'), "Revision 4 cache-busting marker missing");
assert(source.indexOf('GIT_COMMENTS_V27_UI_REFINEMENTS=PASS') < source.indexOf('open -a "Brave Browser"'), "Brave must open only after every verification passes");
console.log("GIT_COMMENTS_UI_UPDATER_AUTH_REGRESSION=PASS");
