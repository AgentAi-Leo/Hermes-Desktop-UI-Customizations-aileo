#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const source = fs.readFileSync(path.join(__dirname, "..", "payload", "dashboard", "dist", "index.js"), "utf8");

assert(
  source.includes(".git-comments-action-title{grid-column:1;margin:0;color:#FFE6CB;font-size:68px"),
  "Revision 63 must preserve the 68px confirmation-title text"
);
assert(
  source.includes(".git-comments-action-message{grid-column:1;grid-row:2;margin:14px 0 24px;color:#cbd5e1;font-size:44px"),
  "Revision 63 must preserve the 44px confirmation-message text"
);
assert(
  source.includes(".git-comments-action-modal.red .git-comments-action-message{font-size:32px}"),
  "destructive-dialog messages must fit the screenshot-C cap without horizontal overflow"
);

assert(
  source.includes(".git-comments-action-buttons{grid-column:1;grid-row:3;justify-self:end;display:flex;align-items:center;gap:24px}.git-comments-action-buttons .git-comments-button{min-height:76px;padding:16px 28px;border-radius:18px;font-family:\"Alumni Sans SC\",sans-serif;font-size:24px"),
  "Revision 63 must preserve confirmation-button geometry and label size"
);

assert(
  source.includes(".git-comments-archive-bulk-controls .git-comments-button.deselect-all{border-color:#facc15;background:#713f12;color:#fef3c7}"),
  "Revision 63 must render DESELECT ALL as yellow"
);
assert(
  source.includes(".git-comments-archive-bulk-controls .git-comments-button.bulk-unarchive{border-color:#22c55e;background:#14532d;color:#f0fdf4}"),
  "Revision 63 must render UNARCHIVE SELECTED as green"
);

assert(
  source.includes(".git-comments-action-modal{width:max-content;max-width:min(869px,calc(100vw - 64px));max-height:calc(100vh - 64px);overflow:auto;box-sizing:border-box;display:grid;grid-template-columns:max-content;"),
  "Revision 63 modal must shrink to one content column and never exceed the screenshot-C 869px cap or viewport"
);
assert(
  source.includes(".git-comments-action-title{grid-column:1;margin:0;color:#FFE6CB;font-size:68px"),
  "Revision 63 title must span the content and action columns"
);
assert(
  source.includes(".git-comments-action-message{grid-column:1;grid-row:2;margin:14px 0 24px;color:#cbd5e1;font-size:44px"),
  "Revision 63 message must define the first max-content column"
);
assert(
  source.includes(".git-comments-action-buttons{grid-column:1;grid-row:3;justify-self:end;display:flex;align-items:center;gap:24px}"),
  "Revision 63 button-group right edge must align to and never exceed the message-column right edge"
);
assert(!source.includes("grid-template-columns:max-content max-content"), "Revision 63 must retire the R62 second action column");
assert(!source.includes(".git-comments-action-buttons{grid-column:2"), "Revision 63 actions must not occupy a second column beyond the message");
assert(!source.includes(".git-comments-action-buttons{grid-column:1;grid-row:3;justify-self:start"), "Revision 63 actions must not remain left-anchored inside the message column");
assert(
  source.includes("@media(max-width:760px){.git-comments-archive-bulk-controls{align-items:stretch}.git-comments-archive-selected-count{width:100%}.git-comments-action-backdrop{padding:16px}.git-comments-action-modal{padding:22px}"),
  "Revision 63 mobile rule must retain content sizing instead of restoring a fixed modal width"
);
assert(
  !source.includes(".git-comments-action-modal{width:min(1440px"),
  "Revision 63 must retire the oversized 1440px confirmation width"
);
assert(
  !source.includes(".git-comments-action-buttons{display:flex;align-items:center;justify-content:flex-end"),
  "Revision 63 must retire far-edge button justification"
);
assert(
  source.includes('.git-comments-action-title{grid-column:1;margin:0;color:#FFE6CB;font-size:68px;font-weight:800;letter-spacing:.04em;white-space:nowrap}'),
  "Revision 63 confirmation titles must never wrap"
);
assert(
  source.includes('.git-comments-action-message{grid-column:1;grid-row:2;margin:14px 0 24px;color:#cbd5e1;font-size:44px;line-height:1.2;font-weight:800;letter-spacing:.04em;white-space:nowrap}'),
  "Revision 63 confirmation messages must never wrap"
);
assert(
  source.includes('.git-comments-action-buttons .git-comments-button{min-height:76px;padding:16px 28px;border-radius:18px;font-family:\"Alumni Sans SC\",sans-serif;font-size:24px;font-weight:800;white-space:nowrap}'),
  "Revision 63 confirmation button labels must never wrap"
);

console.log("GIT_WATCH_R63_DIALOG_TEXT_SCALE=PASS");
console.log("GIT_WATCH_R63_DIALOG_BUTTON_SCALE=PASS");
console.log("GIT_WATCH_R63_BULK_ACTION_COLORS=PASS");
console.log("GIT_WATCH_R63_MOBILE_GEOMETRY=PASS");
console.log("GIT_WATCH_R63_SINGLE_LINE_CONFIRMATIONS=PASS");
