const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const pkg = path.resolve(__dirname, '..');
const PACKAGE_NAME = 'GOLDEN-FINAL_LAYOUT-R52-GIT-WATCH-v1-JB';
const manager = path.join(pkg, 'scripts', 'git-watch-golden-manager.sh');
const renderer = path.join(pkg, 'payload', 'dashboard', 'dist', 'index.js');
const api = path.join(pkg, 'payload', 'dashboard', 'plugin_api.py');
const checker = path.join(pkg, 'payload', 'scripts', 'github-comments-checker-v27-review.sh');
const manifest = path.join(pkg, 'payload', 'dashboard', 'manifest.json');
const demo = path.join(pkg, 'GIT-WATCH-OFFLINE-DEMO.html');
const readme = path.join(pkg, 'README-FIRST.md');
const releaseManifest = path.join(pkg, 'RELEASE-MANIFEST.json');
const verifier = path.join(pkg, '4_VERIFY_GIT_WATCH_PACKAGE.command');
const wrappers = [
  ['1_INSTALL_OR_RESTORE_GIT_WATCH.command', 'install'],
  ['2_FACTORY_RESET_GIT_WATCH.command', 'factory-reset'],
  ['3_UNINSTALL_GIT_WATCH.command', 'uninstall'],
];

for (const required of [manager, renderer, api, checker, manifest, demo, readme, releaseManifest, verifier]) {
  assert(fs.existsSync(required), `Golden Release file missing: ${required}`);
}
const provenance = JSON.parse(fs.readFileSync(releaseManifest, 'utf8'));
assert.equal(provenance.release_name, PACKAGE_NAME);
assert.equal(provenance.package_folder, PACKAGE_NAME);
assert.equal(provenance.package_zip, `${PACKAGE_NAME}.zip`);
assert.equal(provenance.source.commit, 'b09c990e4b19cc18c6932d58e9340c59c77d6e39');
assert.equal(provenance.source.revision_zip_sha256, '6acc841439f55f578b7a7b578e56dfc95e250a3fdcb75231c7bae35c49bb4569');
assert(fs.readFileSync(readme, 'utf8').startsWith(`# ${PACKAGE_NAME}\n`), 'README must use the exact package name');
assert(fs.readFileSync(manager, 'utf8').includes(`"release": "${PACKAGE_NAME}"`), 'install receipt must use the exact package name');
assert(fs.readFileSync(verifier, 'utf8').includes('CHECKSUMS.sha256') && fs.readFileSync(verifier, 'utf8').includes('GIT_WATCH_GOLDEN_PACKAGE_VERIFICATION=PASS'), 'beginner package verifier contract missing');
for (const [name, mode] of wrappers) {
  const file = path.join(pkg, name);
  assert(fs.existsSync(file), `${name} missing`);
  const source = fs.readFileSync(file, 'utf8');
  assert(source.includes(`"${mode}"`) && source.includes('README-FIRST.md'), `${name} must invoke ${mode} and point beginners to README-FIRST.md`);
}

const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(sha(renderer), '3f007932e2d39602147b7f35a26dc402edd64de0b3a1849e3fd06fd1ed4e2d4e', 'renderer must be exact frozen Revision 52');
assert.equal(sha(api), 'c51f72ab253b8f156b1c4955fd4298911e7635cb95790828189098e54f77043c', 'API must be exact frozen Revision 52');
assert.equal(sha(checker), '73384b045ba96c18ff12eb82f6a5a23455f20e701b287d976ece0443c88df076', 'checker must be exact frozen Revision 52');
assert.equal(sha(manifest), '173768da0abae910be056690f2e219bb581ef76f31dcbbc190e10ab7d5156b8f', 'manifest must be exact frozen Revision 52');

const managerSource = fs.readFileSync(manager, 'utf8');
for (const marker of ['install|factory-reset|uninstall', 'GIT_WATCH_GOLDEN_HOME', 'PRESERVED_EXISTING_DATA', 'FACTORY_RESET_DATA', 'RESTORE_THIS_BACKUP.command', 'git-watch-golden-install.json', 'FAIL_AT']) {
  assert(managerSource.includes(marker), `manager contract marker missing: ${marker}`);
}
assert(!managerSource.includes('/plugins/git-comments/dashboard'), 'Golden installer must not modify the production Git Comments plugin');
assert(!managerSource.includes('briefs-ai') && !managerSource.includes('briefs-stocks'), 'Golden installer must not modify Briefs');

const run = (home, args, extra = {}) => spawnSync('bash', [manager, ...args], {
  encoding: 'utf8',
  env: { ...process.env, HOME: home, GIT_WATCH_GOLDEN_HOME: path.join(home, '.hermes'), GIT_WATCH_GOLDEN_SKIP_ENABLE: '1', ...extra },
});
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-watch-golden-'));
const hermesHome = path.join(temp, '.hermes');
const profileHome = path.join(hermesHome, 'profiles', 'alice');
const profilePlugin = path.join(profileHome, 'plugins', 'git-comments-v27-review', 'dashboard');
const launchPlugin = path.join(hermesHome, 'plugins', 'git-comments-v27-review', 'dashboard');
const profileChecker = path.join(profileHome, 'scripts', 'github-comments-checker-v27-review.sh');

let result = run(temp, ['install', '--profile', 'alice', '--owner', 'ExampleUser', '--yes']);
assert.equal(result.status, 0, result.stdout + result.stderr);
assert(fs.existsSync(path.join(profilePlugin, 'dist', 'index.js')) && fs.existsSync(path.join(launchPlugin, 'dist', 'index.js')), 'named-profile install must create profile and launch plugin copies');
assert(fs.existsSync(profileChecker), 'named-profile checker missing');
assert(fs.lstatSync(path.join(launchPlugin, 'data')).isSymbolicLink(), 'launch data must link to authoritative profile data');
assert.equal(fs.realpathSync(path.join(launchPlugin, 'data')), fs.realpathSync(path.join(profilePlugin, 'data')), 'launch data link must target authoritative profile data');
let watchlist = readJSON(path.join(profilePlugin, 'data', 'watchlist.json'));
assert.equal(watchlist.comment_owner, 'ExampleUser');
assert.deepEqual(watchlist.active, []);
assert.deepEqual(watchlist.archived, []);
const receiptPath = path.join(profileHome, 'git-watch-golden-install.json');
assert(fs.existsSync(receiptPath), 'install receipt missing');
assert.equal(readJSON(receiptPath).release, PACKAGE_NAME, 'installed receipt must use the exact package name');

watchlist.active.push({ id: 'owner/repo/issues/7', url: 'https://github.com/owner/repo/issues/7', repo: 'owner/repo', number: 7, kind: 'issue' });
fs.writeFileSync(path.join(profilePlugin, 'data', 'watchlist.json'), JSON.stringify(watchlist, null, 2) + '\n');
result = run(temp, ['install', '--profile', 'alice', '--owner', 'IgnoredOwner', '--yes']);
assert.equal(result.status, 0, result.stdout + result.stderr);
watchlist = readJSON(path.join(profilePlugin, 'data', 'watchlist.json'));
assert.equal(watchlist.active.length, 1, 'safe restore must preserve active watchlist data');
assert.equal(watchlist.comment_owner, 'ExampleUser', 'safe restore must preserve existing owner');
assert((result.stdout + result.stderr).includes('PRESERVED_EXISTING_DATA'), 'safe restore must report preserved data');

result = run(temp, ['factory-reset', '--profile', 'alice', '--owner', 'ResetUser', '--yes']);
assert.equal(result.status, 0, result.stdout + result.stderr);
const resetBackup = (result.stdout + result.stderr).match(/^BACKUP=(.+)$/m)?.[1];
assert(resetBackup && fs.existsSync(path.join(resetBackup, 'RESTORE_THIS_BACKUP.command')), 'factory reset recovery launcher missing');
watchlist = readJSON(path.join(profilePlugin, 'data', 'watchlist.json'));
assert.equal(watchlist.comment_owner, 'ResetUser');
assert.deepEqual(watchlist.active, []);
assert((result.stdout + result.stderr).includes('FACTORY_RESET_DATA'), 'factory reset must report destructive data replacement');
let rollback = spawnSync('bash', [path.join(resetBackup, 'RESTORE_THIS_BACKUP.command')], {
  encoding: 'utf8',
  env: { ...process.env, HOME: temp, GIT_WATCH_GOLDEN_HOME: hermesHome, GIT_WATCH_GOLDEN_SKIP_ENABLE: '1' },
});
assert.equal(rollback.status, 0, rollback.stdout + rollback.stderr);
watchlist = readJSON(path.join(profilePlugin, 'data', 'watchlist.json'));
assert.equal(watchlist.active.length, 1, 'backup-specific recovery launcher must restore pre-reset watchlist data');
assert.equal(watchlist.comment_owner, 'ExampleUser', 'backup-specific recovery launcher must restore pre-reset owner');
result = run(temp, ['factory-reset', '--profile', 'alice', '--owner', 'ResetUser', '--yes']);
assert.equal(result.status, 0, result.stdout + result.stderr);

fs.writeFileSync(path.join(profilePlugin, 'dist', 'index.js'), 'ORIGINAL_SENTINEL\n');
result = run(temp, ['install', '--profile', 'alice', '--owner', 'ResetUser', '--yes'], { GIT_WATCH_GOLDEN_FAIL_AT: 'after-runtime' });
assert.notEqual(result.status, 0, 'injected failure must fail');
assert.equal(fs.readFileSync(path.join(profilePlugin, 'dist', 'index.js'), 'utf8'), 'ORIGINAL_SENTINEL\n', 'transaction failure must restore prior renderer');

result = run(temp, ['uninstall', '--profile', 'alice', '--yes']);
assert.equal(result.status, 0, result.stdout + result.stderr);
assert(!fs.existsSync(path.join(profileHome, 'plugins', 'git-comments-v27-review')), 'uninstall must remove namespaced profile plugin');
assert(!fs.existsSync(path.join(hermesHome, 'plugins', 'git-comments-v27-review')), 'uninstall must remove namespaced launch plugin');
assert(!fs.existsSync(profileChecker), 'uninstall must remove namespaced checker');
assert(fs.readdirSync(path.join(profileHome, 'backups', 'git-watch-golden')).length >= 1, 'uninstall must retain recovery backup');

const defaultHome = fs.mkdtempSync(path.join(os.tmpdir(), 'git-watch-golden-default-'));
result = run(defaultHome, ['install', '--profile', 'default', '--owner', 'DefaultUser', '--yes']);
assert.equal(result.status, 0, result.stdout + result.stderr);
assert(fs.existsSync(path.join(defaultHome, '.hermes', 'plugins', 'git-comments-v27-review', 'dashboard', 'dist', 'index.js')), 'default-profile install path incorrect');

const html = fs.readFileSync(demo, 'utf8');
assert(html.includes(`<title>${PACKAGE_NAME} — Offline Demo</title>`) && html.includes(`<strong>${PACKAGE_NAME}</strong>`), 'offline demo must use the exact package name');
for (const retired of ['Git Watch Golden Release R52', 'GIT WATCH Golden Release — Revision 52', 'git-watch-golden-release-r52']) {
  assert(![fs.readFileSync(readme, 'utf8'), fs.readFileSync(releaseManifest, 'utf8'), fs.readFileSync(manager, 'utf8'), html].some(source => source.includes(retired)), `retired package identity remains: ${retired}`);
}
assert(html.startsWith('<!doctype html>') && html.endsWith('</body></html>'), 'offline demo must be a complete HTML document');
assert((html.match(/<style>/g) || []).length === 1 && (html.match(/<script>/g) || []).length === 1, 'offline demo must contain exactly one inline style and script');
assert(html.includes('git-watch-export-version" content="52') && html.includes('git-watch-visual-baseline" content="52'), 'offline demo must retain Revision 52 export metadata');
assert(html.includes('Export format 52') && html.includes('Visual baseline 52') && !html.includes('Export format 51') && !html.includes('Visual baseline 51'), 'offline demo visible provenance banner must identify Revision 52');
assert(html.includes('press:{masterGain:1.2') && html.includes('letter spacing: 0.04em') && html.includes('dwell: 2000ms, then fade: 500ms'), 'offline demo must retain Revision 52 audio/visual notes');
assert(!html.includes('<script src=') && !html.includes('<link rel="stylesheet"') && !html.includes('fetch(') && !html.includes('/api/plugins/'), 'offline demo must be host- and network-independent');

console.log('GIT_WATCH_GOLDEN_RELEASE=PASS');
