const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '../dashboard/dist/index.js');
const source = fs.readFileSync(sourcePath, 'utf8');

// The bundle must remain syntactically executable and register the unchanged runtime identity.
let registered = null;
const React = { Fragment: Symbol('Fragment'), createElement() { return {}; } };
const sdk = {
  React,
  fetchJSON: async () => ({}),
  hooks: { useState: v => [v, () => {}], useEffect() {}, useMemo: fn => fn() },
};
const documentStub = { addEventListener() {}, querySelector() { return null; } };
const windowStub = {
  document: documentStub,
  addEventListener() {}, removeEventListener() {},
  __HERMES_PLUGIN_SDK__: sdk,
  __HERMES_PLUGINS__: { register(name, component) { assert.equal(name, 'git-comments-v27-review'); registered = component; } },
};
vm.runInNewContext(source, { window: windowStub, document: documentStub, console, setTimeout() {}, clearTimeout() {} });
assert.equal(typeof registered, 'function', 'renderer must register');

// Fullscreen-safe confirmation contract: native browser dialogs are forbidden.
assert(!source.includes('window.confirm('), 'native window.confirm exits browser fullscreen');
for (const marker of [
  'function ActionConfirmModal',
  'className: "git-comments-action-backdrop"',
  'className: `git-comments-action-modal',
  'role: "dialog"',
  '"aria-modal": "true"',
  '"aria-labelledby": "git-watch-action-title"',
  'closeActionDialogOnEscape',
  'stopImmediatePropagation()',
  'actionDialogReturnFocus',
  'confirm-action',
  'cancel-action',
]) assert(source.includes(marker), `fullscreen confirmation marker missing: ${marker}`);
assert(source.includes('.git-comments-action-backdrop{position:fixed;inset:0;'), 'confirmation backdrop must fill the current fullscreen viewport');
assert(source.includes('.git-comments-action-modal{width:min('), 'confirmation modal needs bounded in-app geometry');

// Archived selection and atomic bulk controls.
for (const marker of [
  'selectedArchivedIds',
  'toggleArchivedSelection',
  'selectAllArchived',
  'deselectAllArchived',
  'bulkArchived',
  '"/watchlist/bulk-archived"',
  'className: "git-comments-archive-select"',
  'type: "checkbox"',
  'SELECT ALL',
  'DESELECT ALL',
  'UNARCHIVE SELECTED',
  'DELETE SELECTED',
  'SELECTED (${selectedArchivedIds.length})',
]) assert(source.includes(marker), `archive bulk-selection marker missing: ${marker}`);
assert(source.includes('setSelectedArchivedIds((current) => current.filter((id) => archivedIds.has(id)))'), 'selection must prune IDs no longer archived');
assert(source.includes('disabled: busy || selectedArchivedIds.length === 0'), 'bulk mutations must be disabled without a selection');
assert(source.includes('mutate("/watchlist/bulk-archived", { action: dialog.action, ids: selectedArchivedIds })'), 'bulk operation must use one atomic request through the shared mutation path');

// Export must advance while remaining standalone/read-only.
assert(source.includes('<meta name="git-watch-export-version" content="53">'), 'export schema must advance to Revision 53');
assert(source.includes('<meta name="git-watch-visual-baseline" content="53">'), 'visual baseline must identify Revision 53');
for (const selector of [
  '.git-comments-archive-bulk-controls',
  '.git-comments-archive-select',
  '.git-comments-action-backdrop',
]) assert(source.includes(selector), `export cleanup must remove ${selector}`);
assert(source.includes('API-DEPENDENT SELECTION AND MUTATION CONTROLS OMITTED'), 'offline guide must explain bulk-control omission');
assert(!source.includes('content="52"'), 'superseded export metadata must be absent');

console.log('GIT_WATCH_R53_RENDERER_CONTRACT=PASS');
