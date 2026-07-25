const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '../payload/dashboard/dist/index.js');
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
  'event.key !== "Tab"',
  'event.currentTarget.querySelectorAll',
  'window.document.activeElement === first',
  'window.document.activeElement === last',
  'inert: actionDialog ? "inert" : undefined',
  '"aria-hidden": actionDialog ? "true" : undefined',
  'confirm-action',
  'cancel-action',
]) assert(source.includes(marker), `fullscreen confirmation marker missing: ${marker}`);
assert(source.includes('.git-comments-action-backdrop{position:fixed;inset:0;'), 'confirmation backdrop must fill the current fullscreen viewport');
assert(source.includes('.git-comments-action-modal{width:max-content;max-width:min(869px,calc(100vw - 64px));'), 'confirmation modal needs content-fit geometry bounded by screenshot C and the viewport');
assert(source.includes('inert: actionDialog ? \"inert\" : undefined'), 'modal background must use a non-empty inert attribute value that React preserves');
assert(!source.includes('inert: actionDialog ? \"\" : undefined'), 'empty-string inert is omitted by the live React runtime');

// Exercise the modal's focus loop, not just its source markers.
const modalStart = source.indexOf('function ActionConfirmModal');
const modalEnd = source.indexOf('\n\n  function GitCommentsPage', modalStart);
assert(modalStart >= 0 && modalEnd > modalStart, 'confirmation component must be extractable');
const modalDocument = { activeElement: null };
const modalElement = (type, props, ...children) => ({ type, props: props || {}, children });
const ActionConfirmModal = vm.runInNewContext(`(${source.slice(modalStart, modalEnd)})`, { e: modalElement, window: { document: modalDocument }, Array });
const renderedModal = ActionConfirmModal({ dialog: { title: 'Confirm', message: 'Message', confirmLabel: 'DELETE', tone: 'red' }, onCancel() {}, onConfirm() {}, busy: false });
const modalSection = renderedModal.children[0];
const firstFocus = { focused: 0, focus() { this.focused += 1; modalDocument.activeElement = this; } };
const lastFocus = { focused: 0, focus() { this.focused += 1; modalDocument.activeElement = this; } };
const focusEvent = (shiftKey, elements) => ({ key: 'Tab', shiftKey, currentTarget: { querySelectorAll() { return elements; } }, prevented: 0, preventDefault() { this.prevented += 1; } });
modalDocument.activeElement = lastFocus;
const forwardTab = focusEvent(false, [firstFocus, lastFocus]);
modalSection.props.onKeyDown(forwardTab);
assert.equal(forwardTab.prevented, 1); assert.equal(firstFocus.focused, 1);
modalDocument.activeElement = firstFocus;
const reverseTab = focusEvent(true, [firstFocus, lastFocus]);
modalSection.props.onKeyDown(reverseTab);
assert.equal(reverseTab.prevented, 1); assert.equal(lastFocus.focused, 1);
const noTargets = focusEvent(false, []);
modalSection.props.onKeyDown(noTargets);
assert.equal(noTargets.prevented, 1, 'Tab must remain contained while all modal controls are disabled');

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
assert(source.includes('const ids = [...selectedArchivedIds]'), 'bulk selection must be frozen when confirmation opens');
assert(source.includes('openActionDialog({ kind: `bulk-${action}`, action, ids,'), 'frozen IDs must be stored in the confirmation dialog');
assert(source.includes('mutate("/watchlist/bulk-archived", { action: dialog.action, ids: dialog.ids })'), 'bulk operation must execute the frozen IDs in one atomic request');
assert(!source.includes('mutate("/watchlist/bulk-archived", { action: dialog.action, ids: selectedArchivedIds })'), 'confirmed bulk operation must not re-read mutable selection state');
assert(source.includes('disabled: busy || Boolean(actionDialog)'), 'archived checkboxes must be disabled behind a destructive dialog');

// Export must advance while remaining standalone/read-only.
assert(source.includes('<meta name="git-watch-export-version" content="63">'), 'export schema must advance to Revision 63');
assert(source.includes('<meta name="git-watch-visual-baseline" content="63">'), 'visual baseline must identify Revision 63');
assert(source.includes('Export format 63 · Visual baseline 63'), 'visible export provenance must identify Revision 63');
assert(!source.includes('Export format 55 · Visual baseline 55'), 'stale Revision 55 visible provenance must be absent');
assert(!source.includes('Export format 54 · Visual baseline 54'), 'stale Revision 54 visible provenance must be absent');
for (const selector of [
  '.git-comments-archive-bulk-controls',
  '.git-comments-archive-select',
  '.git-comments-action-backdrop',
]) assert(source.includes(selector), `export cleanup must remove ${selector}`);
assert(source.includes('API-DEPENDENT SELECTION AND MUTATION CONTROLS OMITTED'), 'offline guide must explain bulk-control omission');
assert(source.includes('CONFIRMATION DIALOG TOKENS (Revision 63)'), 'offline guide must document the rounded Alumni Sans SC confirmation dialog');
assert(source.includes('border radius: 25px') && source.includes('font: embedded Alumni Sans SC ExtraBold 800'), 'export guide must preserve dialog radius and font tokens');
assert(source.includes('width: max-content capped at min(869px, calc(100vw - 64px)); border radius: 25px'), 'export guide must document the screenshot-C modal cap');
assert(source.includes('title: 68px; message: 44px; destructive message: 32px; action buttons: 76px minimum height / 24px labels'), 'export guide must document Revision 63 dialog scaling');
assert(source.includes('The message and actions share column 1; the action-group right edge aligns to the message right edge.'), 'export guide must document one-column message-edge alignment');
assert(source.includes('archived bulk colors: DESELECT ALL yellow; UNARCHIVE SELECTED green'), 'export guide must document Revision 63 semantic bulk colors');
assert(source.includes('.git-comments-action-modal{width:max-content;max-width:min(869px,calc(100vw - 64px));max-height:calc(100vh - 64px);overflow:auto;box-sizing:border-box;display:grid;grid-template-columns:max-content;border:1px solid #475569;border-radius:25px;'), 'confirmation panel must use one message-width column, stay under the screenshot-C cap, and remain viewport-scrollable');
assert(source.includes('.git-comments-action-buttons{grid-column:1;grid-row:3;justify-self:end;display:flex;align-items:center;gap:24px}'), 'confirmation button-group right edge must align to and never exceed the message-column right edge');
assert(source.includes('.git-comments-action-modal.red .git-comments-action-message{font-size:32px}'), 'destructive-dialog messages must fit the screenshot-C cap without horizontal overflow');
assert(source.includes('Permanently delete this watched URL? This cannot be undone.') && source.includes('Permanently delete ${count} selected archived URL${count === 1 ? "" : "s"}? This cannot be undone.'), 'geometry contract must cover the exact runtime destructive-dialog messages');
assert(!source.includes('grid-template-columns:max-content max-content'), 'exported CSS must not retain the R62 second action column');
assert(!source.includes('.git-comments-action-buttons{grid-column:2'), 'exported CSS must not place actions beyond the message column');
assert(!source.includes('.git-comments-action-modal{width:min(620px,calc(100vw - 32px));padding:22px}'), 'rejected Revision 57 mobile width override must be absent');
assert(source.includes('.git-comments-action-modal{') && source.includes('font-family:"Alumni Sans SC",sans-serif'), 'confirmation panel must use the embedded Google font already used by success popups');
assert(!source.includes('.git-comments-archived-actions{'), 'retired per-row archived action group CSS must be absent');
assert(!source.includes('className: "git-comments-archived-actions"'), 'retired per-row archived action group DOM must be absent');
assert(!source.includes('const unarchive = async (id)'), 'retired single-item unarchive handler must be absent');
assert(!source.includes('const deleteArchived = (id, event)'), 'retired single-item archived delete handler must be absent');
assert(source.includes('// Archived restore/delete are intentionally selection-only; per-row mutation buttons were retired in Revision 56.'), 'renderer must retain the historical R56 rationale for selection-only archived mutations');
assert(!source.includes('.git-comments-button.unarchive{') && !source.includes(',.git-comments-button.unarchive{'), 'retired single-unarchive CSS must be absent');
assert(!source.includes('content="52"'), 'superseded export metadata must be absent');

console.log('GIT_WATCH_R63_RENDERER_CONTRACT=PASS');
