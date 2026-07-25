#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const source = fs.readFileSync(path.join(__dirname, "..", "payload", "dashboard", "dist", "index.js"), "utf8");

assert(
  source.includes(".git-comments-action-title{margin:0;color:#FFE6CB;font-size:78px"),
  "Revision 59 must increase confirmation-title text from 26px to 78px (200% increase)"
);
assert(
  source.includes(".git-comments-action-message{margin:14px 0 24px;color:#cbd5e1;font-size:51px"),
  "Revision 59 must increase confirmation-message text from 17px to 51px (200% increase)"
);

assert(
  source.includes(".git-comments-action-buttons{display:flex;align-items:center;justify-content:flex-end;gap:24px}.git-comments-action-buttons .git-comments-button{min-height:76px;padding:16px 28px;border-radius:18px;font-family:\"Alumni Sans SC\",sans-serif;font-size:24px"),
  "Revision 59 must double confirmation-button geometry and label size"
);

assert(
  source.includes(".git-comments-archive-bulk-controls .git-comments-button.deselect-all{border-color:#facc15;background:#713f12;color:#fef3c7}"),
  "Revision 59 must render DESELECT ALL as yellow"
);
assert(
  source.includes(".git-comments-archive-bulk-controls .git-comments-button.bulk-unarchive{border-color:#22c55e;background:#14532d;color:#f0fdf4}"),
  "Revision 59 must render UNARCHIVE SELECTED as green"
);

assert(
  !source.includes(".git-comments-action-modal{width:min(620px,calc(100vw - 32px));padding:22px}"),
  "Revision 59 must not widen the accepted confirmation geometry at mobile widths"
);
assert(
  source.includes("@media(max-width:760px){.git-comments-archive-bulk-controls{align-items:stretch}.git-comments-archive-selected-count{width:100%}.git-comments-action-backdrop{padding:16px}.git-comments-action-modal{width:min(620px,calc(100vw - 64px));padding:22px}"),
  "Revision 59 mobile rule must preserve the exact accepted 64px viewport inset"
);
assert(
  source.includes(".git-comments-action-modal{width:min(620px,calc(100vw - 64px));max-height:calc(100vh - 64px);overflow:auto;box-sizing:border-box;"),
  "Revision 59 confirmation panel must remain reachable on short viewports"
);

console.log("GIT_WATCH_R59_DIALOG_TEXT_SCALE=PASS");
console.log("GIT_WATCH_R59_DIALOG_BUTTON_SCALE=PASS");
console.log("GIT_WATCH_R59_BULK_ACTION_COLORS=PASS");
console.log("GIT_WATCH_R59_MOBILE_GEOMETRY=PASS");
