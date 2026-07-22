import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { briefDashboardHtml, briefDashboardMarkdown, stockPortfolioCsv, stockPortfolioCsvName } from "../src/lib/briefs";

/*
V34 GOLD MASTER REGENERATION HELPER
Purpose: Rebuild the same 10 HTML, 10 semantic Markdown, and five Position Comparison CSV files from the bundled canonical references.
Inputs: REFERENCES/AI and REFERENCES/STOCK HTML files for the five sealed archive dates.
Outputs: EXPORTS/AI and EXPORTS/STOCK using the exact browser-download filenames.
Dependencies: The dashboard source toolchain plus jsdom; no network or host API.
Restore notes: Run from a complete extracted V34 package. Do not rename sibling HTML files because offline date navigation uses those filenames.
*/

const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, {
  DOMParser: dom.window.DOMParser,
  Node: dom.window.Node,
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
});

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDirectory, "../../..");
const sourceRoot = join(packageRoot, "REFERENCES");
const targetRoot = join(packageRoot, "EXPORTS");
const dates = ["2026-07-20", "2026-07-18", "2026-07-17", "2026-07-16", "2026-07-15"];

for (const kind of ["ai", "stock"] as const) {
  const stream = kind === "ai" ? "AI" : "STOCK";
  const htmlLabel = kind === "ai" ? "BRIEFS-AI" : "BRIEFS-STOCKS";
  const markdownLabel = kind === "ai" ? "AI Morning Brief" : "Stock Brief";
  mkdirSync(join(targetRoot, stream), { recursive: true });
  for (const date of dates) {
    const sourceHtml = readFileSync(join(sourceRoot, stream, `${htmlLabel} - ${date}.html`), "utf8");
    const generatedAt = Math.floor(Date.parse(`${date}T${kind === "ai" ? "08" : "14"}:00:00-07:00`) / 1000);
    writeFileSync(join(targetRoot, stream, `${htmlLabel} - ${date}.html`), briefDashboardHtml(sourceHtml, kind, date, dates, generatedAt));
    writeFileSync(join(targetRoot, stream, `${markdownLabel} - ${date}.md`), briefDashboardMarkdown(sourceHtml, kind, generatedAt));
    if (kind === "stock") {
      // Match the dashboard button exactly: UTF-8 BOM, CRLF rows, and Agent=HERMES.
      writeFileSync(join(targetRoot, stream, stockPortfolioCsvName(date)), `\uFEFF${stockPortfolioCsv(sourceHtml, date)}`);
    }
  }
}

console.log("V34_GOLD_MASTER_EXPORTS_REBUILT=10_HTML+10_MD+5_PORTFOLIO_CSV");
