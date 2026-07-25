#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-$(command -v python)}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

make_home() {
  local root="$1"
  local profile="$root/profiles/local-ai-assist1/plugins/git-comments-v27-review/dashboard"
  mkdir -p "$root/plugins/git-comments-v27-review/dashboard/dist" "$profile/dist" "$profile/data"
  printf 'old launch renderer\n' > "$root/plugins/git-comments-v27-review/dashboard/dist/index.js"
  printf 'old profile renderer\n' > "$profile/dist/index.js"
  printf 'old launch api\n' > "$root/plugins/git-comments-v27-review/dashboard/plugin_api.py"
  printf 'old profile api\n' > "$profile/plugin_api.py"
  printf '{"active":[{"id":"fixture"}],"archived":[]}\n' > "$profile/data/watchlist.json"
}

snapshot_home() {
  local root="$1" out="$2"
  mkdir -p "$out"
  cp "$root/plugins/git-comments-v27-review/dashboard/dist/index.js" "$out/launch-index.js"
  cp "$root/profiles/local-ai-assist1/plugins/git-comments-v27-review/dashboard/dist/index.js" "$out/profile-index.js"
  cp "$root/plugins/git-comments-v27-review/dashboard/plugin_api.py" "$out/launch-api.py"
  cp "$root/profiles/local-ai-assist1/plugins/git-comments-v27-review/dashboard/plugin_api.py" "$out/profile-api.py"
  cp "$root/profiles/local-ai-assist1/plugins/git-comments-v27-review/dashboard/data/watchlist.json" "$out/watchlist.json"
}

assert_home() {
  local root="$1" before="$2"
  cmp -s "$before/launch-index.js" "$root/plugins/git-comments-v27-review/dashboard/dist/index.js"
  cmp -s "$before/profile-index.js" "$root/profiles/local-ai-assist1/plugins/git-comments-v27-review/dashboard/dist/index.js"
  cmp -s "$before/launch-api.py" "$root/plugins/git-comments-v27-review/dashboard/plugin_api.py"
  cmp -s "$before/profile-api.py" "$root/profiles/local-ai-assist1/plugins/git-comments-v27-review/dashboard/plugin_api.py"
  cmp -s "$before/watchlist.json" "$root/profiles/local-ai-assist1/plugins/git-comments-v27-review/dashboard/data/watchlist.json"
}

for kind in empty-directory broken-symlink; do
  mutant="$TMP/$kind/package"
  mkdir -p "$TMP/$kind"
  cp -a "$PACKAGE_DIR" "$mutant"
  if [[ "$kind" == "empty-directory" ]]; then
    mkdir "$mutant/unledgered-empty"
  else
    ln -s missing-target "$mutant/unledgered-broken-link"
  fi

  set +e
  GIT_WATCH_R61_SKIP_SURFACE_MUTANTS=1 bash "$mutant/VERIFY.command" > "$TMP/$kind-verify.log" 2>&1
  verify_status=$?
  set -e
  [[ "$verify_status" != "0" ]]
  ! grep -q '^GIT_WATCH_R61_PACKAGE_VERIFICATION=PASS$' "$TMP/$kind-verify.log"

  home="$TMP/$kind-home"
  make_home "$home"
  snapshot_home "$home" "$TMP/$kind-before"
  set +e
  HERMES_HOME="$home" HERMES_PROFILE=local-ai-assist1 HERMES_PYTHON="$PYTHON_BIN" \
    bash "$mutant/INSTALL.command" > "$TMP/$kind-install.log" 2>&1
  install_status=$?
  set -e
  [[ "$install_status" != "0" ]]
  ! grep -q '^GIT_WATCH_R61_RUNTIME_INSTALL=PASS$' "$TMP/$kind-install.log"
  assert_home "$home" "$TMP/$kind-before"
done

echo 'GIT_WATCH_R61_FILESYSTEM_SURFACE_MUTANTS=PASS'
