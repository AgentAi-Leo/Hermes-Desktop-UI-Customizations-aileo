#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const source = fs.readFileSync(path.join(__dirname, "..", "payload", "dashboard", "dist", "index.js"), "utf8");

// Keep the accepted R63 scale and screenshot-C cap.
assert(source.includes('.git-comments-action-modal{width:max-content;max-width:min(869px,calc(100vw - 64px));max-height:calc(100vh - 64px);overflow:auto;box-sizing:border-box;display:grid;grid-template-columns:max-content;'), 'R64 must retain content-fit geometry and the 869px cap');
assert(source.includes('border-radius:25px') && source.includes('padding:28px;font-family:"Alumni Sans SC",sans-serif'), 'R64 must preserve the accepted radius and 28px panel padding');
assert(source.includes('.git-comments-action-title{grid-column:1;margin:0;color:#FFE6CB;font-size:68px;font-weight:800;letter-spacing:.04em;white-space:nowrap}'), 'R64 must preserve 68px one-line titles');
assert(source.includes('.git-comments-action-message{grid-column:1;grid-row:1;margin:14px 0 24px;color:#cbd5e1;font-size:44px;line-height:1.2;font-weight:800;letter-spacing:.04em;white-space:nowrap}'), 'R64 must preserve 44px one-line standard messages inside the content grid');
assert(source.includes('.git-comments-action-modal.red .git-comments-action-message{font-size:32px}'), 'R64 must preserve 32px destructive-message fit');
assert(source.includes('.git-comments-action-buttons .git-comments-button{min-height:76px;padding:16px 28px;border-radius:18px;font-family:"Alumni Sans SC",sans-serif;font-size:24px;font-weight:800;white-space:nowrap}'), 'R64 must preserve approved button geometry and labels');

// Encode the approved review mockup structurally: title is independent; message/actions share intrinsic width.
assert(source.includes('.git-comments-action-content{grid-column:1;display:grid;grid-template-columns:max-content;width:max-content;justify-self:start}'), 'R64 needs an intrinsic-width message/action content grid');
assert(source.includes('.git-comments-action-buttons{grid-column:1;grid-row:2;justify-self:end;display:flex;align-items:center;gap:24px}'), 'adjacent actions must end at, and never pass, the message-box edge');
assert(source.includes('e("div", { className: "git-comments-action-content" },'), 'R64 DOM must wrap the message and actions together');
assert(!source.includes('.git-comments-action-buttons{grid-column:1;grid-row:3;justify-self:end'), 'R63 direct outer-grid action placement must be retired');
assert(!source.includes('grid-template-columns:max-content max-content'), 'R62 second action column must remain retired');
assert(!source.includes('justify-self:start;display:flex;align-items:center;gap:24px'), 'actions must not become left-anchored');

// All and only the approved popup families retain their established semantic tones.
for (const marker of [
  'title: "ARCHIVE URL?", message: "Archive this URL and stop watching it?", confirmLabel: "ARCHIVE", tone: "cyan"',
  'title: "DELETE WATCHED URL?", message: "Permanently delete this watched URL? This cannot be undone.", confirmLabel: "DELETE", tone: "red"',
  'title: action === "restore" ? "UNARCHIVE SELECTED URLS?" : "DELETE SELECTED URLS?"',
  'confirmLabel: action === "restore" ? "UNARCHIVE SELECTED" : "DELETE SELECTED", tone: action === "restore" ? "green" : "red"',
  '.git-comments-action-modal.cyan{border-color:#22d3ee}',
  '.git-comments-action-modal.red{border-color:#ef4444}',
  '.git-comments-action-modal.green{border-color:#22c55e}',
  '.git-comments-action-buttons .confirm-action.red{border-color:#ef4444;background:#7f1d1d;color:#fff}',
  '.git-comments-action-buttons .confirm-action.cyan{border-color:#22d3ee;background:#164e63;color:#ecfeff}',
  '.git-comments-action-buttons .confirm-action.green{border-color:#22c55e;background:#14532d;color:#f0fdf4}',
  '.git-comments-button{min-height:38px;padding:8px 14px;border:1px solid #5db3ff;border-radius:9px;background:#102541;color:#8dccff;',
]) assert(source.includes(marker), `R64 semantic popup contract missing: ${marker}`);

// Exported standalone HTML must carry the same CSS and current provenance.
assert(source.includes('<meta name="git-watch-export-version" content="64">'), 'R64 export schema must advance');
assert(source.includes('<meta name="git-watch-visual-baseline" content="64">'), 'R64 visual baseline must advance');
assert(source.includes('Export format 64 · Visual baseline 64'), 'R64 visible export provenance must advance');
assert(source.includes('CONFIRMATION DIALOG TOKENS (Revision 64)'), 'R64 export guide must identify the current dialog baseline');
assert(source.includes('The message and adjacent actions share an intrinsic-width content grid; the action-group right edge aligns to the message right edge, with 28px panel padding preserved to the border.'), 'R64 export guide must document message-edge alignment and breathing room');

console.log('GIT_WATCH_R64_APPROVED_POPUP_MATRIX=PASS');
console.log('GIT_WATCH_R64_MESSAGE_EDGE_INSET=PASS');
console.log('GIT_WATCH_R64_SEMANTIC_COLORS=PASS');
console.log('GIT_WATCH_R64_EXPORT_PARITY=PASS');
