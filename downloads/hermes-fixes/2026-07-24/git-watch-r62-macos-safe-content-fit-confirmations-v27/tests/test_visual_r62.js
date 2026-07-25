#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const source = fs.readFileSync(path.join(__dirname, "..", "payload", "dashboard", "dist", "index.js"), "utf8");

assert(
  source.includes(".git-comments-action-title{grid-column:1/-1;margin:0;color:#FFE6CB;font-size:78px"),
  "Revision 62 must preserve the 78px confirmation-title text"
);
assert(
  source.includes(".git-comments-action-message{grid-column:1;grid-row:2;margin:14px 0 24px;color:#cbd5e1;font-size:51px"),
  "Revision 62 must preserve the 51px confirmation-message text"
);

assert(
  source.includes(".git-comments-action-buttons{grid-column:2;grid-row:3;justify-self:start;display:flex;align-items:center;gap:24px}.git-comments-action-buttons .git-comments-button{min-height:76px;padding:16px 28px;border-radius:18px;font-family:\"Alumni Sans SC\",sans-serif;font-size:24px"),
  "Revision 62 must preserve confirmation-button geometry and label size"
);

assert(
  source.includes(".git-comments-archive-bulk-controls .git-comments-button.deselect-all{border-color:#facc15;background:#713f12;color:#fef3c7}"),
  "Revision 62 must render DESELECT ALL as yellow"
);
assert(
  source.includes(".git-comments-archive-bulk-controls .git-comments-button.bulk-unarchive{border-color:#22c55e;background:#14532d;color:#f0fdf4}"),
  "Revision 62 must render UNARCHIVE SELECTED as green"
);

assert(
  source.includes(".git-comments-action-modal{width:max-content;max-width:calc(100vw - 64px);max-height:calc(100vh - 64px);overflow:auto;box-sizing:border-box;display:grid;grid-template-columns:max-content max-content;column-gap:24px;"),
  "Revision 62 modal must shrink to content width, retain the 64px viewport cap, and use a two-column alignment grid"
);
assert(
  source.includes(".git-comments-action-title{grid-column:1/-1;margin:0;color:#FFE6CB;font-size:78px"),
  "Revision 62 title must span the content and action columns"
);
assert(
  source.includes(".git-comments-action-message{grid-column:1;grid-row:2;margin:14px 0 24px;color:#cbd5e1;font-size:51px"),
  "Revision 62 message must define the first max-content column"
);
assert(
  source.includes(".git-comments-action-buttons{grid-column:2;grid-row:3;justify-self:start;display:flex;align-items:center;gap:24px}"),
  "Revision 62 buttons must begin immediately after the message column rather than at the panel edge"
);
assert(
  source.includes("@media(max-width:760px){.git-comments-archive-bulk-controls{align-items:stretch}.git-comments-archive-selected-count{width:100%}.git-comments-action-backdrop{padding:16px}.git-comments-action-modal{padding:22px}"),
  "Revision 62 mobile rule must retain content sizing instead of restoring a fixed modal width"
);
assert(
  !source.includes(".git-comments-action-modal{width:min(1440px"),
  "Revision 62 must retire the oversized 1440px confirmation width"
);
assert(
  !source.includes(".git-comments-action-buttons{display:flex;align-items:center;justify-content:flex-end"),
  "Revision 62 must retire far-edge button justification"
);
assert(
  source.includes('.git-comments-action-title{grid-column:1/-1;margin:0;color:#FFE6CB;font-size:78px;font-weight:800;letter-spacing:.04em;white-space:nowrap}'),
  "Revision 62 confirmation titles must never wrap"
);
assert(
  source.includes('.git-comments-action-message{grid-column:1;grid-row:2;margin:14px 0 24px;color:#cbd5e1;font-size:51px;line-height:1.2;font-weight:800;letter-spacing:.04em;white-space:nowrap}'),
  "Revision 62 confirmation messages must never wrap"
);
assert(
  source.includes('.git-comments-action-buttons .git-comments-button{min-height:76px;padding:16px 28px;border-radius:18px;font-family:\"Alumni Sans SC\",sans-serif;font-size:24px;font-weight:800;white-space:nowrap}'),
  "Revision 62 confirmation button labels must never wrap"
);

console.log("GIT_WATCH_R62_DIALOG_TEXT_SCALE=PASS");
console.log("GIT_WATCH_R62_DIALOG_BUTTON_SCALE=PASS");
console.log("GIT_WATCH_R62_BULK_ACTION_COLORS=PASS");
console.log("GIT_WATCH_R62_MOBILE_GEOMETRY=PASS");
console.log("GIT_WATCH_R62_SINGLE_LINE_CONFIRMATIONS=PASS");
