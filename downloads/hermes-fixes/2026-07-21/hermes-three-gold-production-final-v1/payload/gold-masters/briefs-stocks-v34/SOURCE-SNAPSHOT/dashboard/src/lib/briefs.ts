import type { BriefEntry, BriefKind } from "@/lib/api";

export const BRIEF_PREVIEW_SANDBOX = "allow-scripts allow-popups allow-popups-to-escape-sandbox";
export const BRIEF_PLAYER_MESSAGE_TYPE = "hermes-brief-player-command";
export const BRIEF_DATE_NAV_MESSAGE_TYPE = "hermes-brief-date-navigation";
export const BRIEF_EXPORT_BUTTON_CLASS = "h-[3.375rem] min-h-[3.375rem] px-6 text-[1.125rem] tracking-[0.08em] [&_svg]:h-6 [&_svg]:w-6";

export function supportsBriefDateNavigation(kind: BriefKind): boolean {
  return kind === "ai" || kind === "stock";
}

export function stockDateNavigationDirection(key: string): "newer" | "older" | null {
  if (key === "ArrowLeft" || key === "[") return "newer";
  if (key === "ArrowRight" || key === "]") return "older";
  return null;
}

const SCRIPT_ELEMENT = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
const EVENT_HANDLER_ATTRIBUTE = /\s+on[a-z][\w:.-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const URL_ATTRIBUTE = /\s+(?:href|src|action|formaction|xlink:href)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const SRCDOC_ATTRIBUTE = /\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const META_ELEMENT = /<meta\b[^>]*>/gi;
const CSP_META = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data: blob:; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'">`;

interface PortfolioLot {
  label: string;
  ticker: "AAPL" | "AMZN" | "NVDA" | "SNAP" | "GOOGL" | "MSFT" | "DIS";
  purchased: string;
  shares: number;
  purchasePrice: number;
}

const PORTFOLIO_LOTS: readonly PortfolioLot[] = [
  { label: "APPLE-1", ticker: "AAPL", purchased: "5/29/24", shares: 146, purchasePrice: 191 },
  { label: "APPLE-2", ticker: "AAPL", purchased: "4/28/26", shares: 57, purchasePrice: 266 },
  { label: "AMAZON-1", ticker: "AMZN", purchased: "5/29/24", shares: 138, purchasePrice: 181 },
  { label: "AMAZON-2", ticker: "AMZN", purchased: "4/29/26", shares: 65, purchasePrice: 268 },
  { label: "NVIDIA", ticker: "NVDA", purchased: "5/29/24", shares: 204, purchasePrice: 123 },
  { label: "SNAP", ticker: "SNAP", purchased: "2/3/26", shares: 1786, purchasePrice: 6.18 },
  { label: "ALPHABET-1", ticker: "GOOGL", purchased: "4/21/26", shares: 101, purchasePrice: 336 },
  { label: "ALPHABET-2", ticker: "GOOGL", purchased: "4/28/26", shares: 106, purchasePrice: 349 },
  { label: "DISNEY", ticker: "DIS", purchased: "8/05/66", shares: 268, purchasePrice: 25 },
  { label: "MICROSOFT", ticker: "MSFT", purchased: "4/21/26", shares: 83, purchasePrice: 419 },
];

const V25_AI_BASE_STYLE = `<style id="hermes-v25-ai-base-style">
:root{color-scheme:dark;--bg:#0b1020;--card:#121a33;--text:#eef3ff;--muted:#aab6d3;--accent:#8bd3ff;--line:#263456;--hot:#ffd166}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg)}body{color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:24px;line-height:1.5}main{width:100%;padding:24px clamp(18px,4vw,64px) 56px}.hero{padding:28px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(135deg,#182345,#10182f)}.pill{display:inline-block;padding:9px 20px;border-radius:999px;background:var(--hot);color:var(--bg);font-size:21px;font-weight:900}.hero h1{margin:16px 0 4px;font-size:64px;line-height:1.05}.date{margin:0;color:var(--accent)}.takeaways{margin:12px 0;padding:22px 26px;background:var(--card);border:1px solid var(--line);border-radius:18px}.takeaways h2{margin:0 0 20px;color:var(--hot);font-size:38px}.takeaways li{margin:0 0 22px}.takeaways li::marker,.takeaways strong{color:var(--accent)}.takeaways strong{display:block;font-size:34px;line-height:1.16}.takeaway-detail{display:block;margin-top:7px;font-size:27px;line-height:1.34}.topics{display:grid;gap:18px;margin-top:22px}.card{padding:24px;background:rgba(18,26,51,.55);border:1px solid var(--line);border-radius:18px}.card h2{margin:0 0 16px;color:var(--hot);font-size:34px}.card p{margin:12px 0;font-size:23px;line-height:1.52}.label,a{color:var(--accent)}.label{font-weight:750}.sources{color:var(--muted);font-size:20px!important}@media(max-width:720px){body{font-size:20px}.hero h1{font-size:42px}.takeaways,.card{padding:22px}.takeaways h2,.card h2{font-size:30px}.takeaways strong{font-size:26px}.takeaway-detail,.card p{font-size:20px}}
</style>`;

const V25_STOCK_BASE_STYLE = `<style id="hermes-v25-stock-base-style">
:root{color-scheme:dark;--bg:#0b1020;--panel:#111827;--text:#eef3ff;--muted:#aab8ca;--line:#334155;--yellow:#ffd166;--cyan:#67e8f9;--up:#4ade80;--down:#fb7185}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text)}body{padding:32px 28px 64px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.hero{padding:28px;border:1px solid #263456;border-radius:22px;background:linear-gradient(135deg,#182345,#10182f)}.pill{display:inline-block;margin-bottom:18px;padding:10px 22px;border-radius:999px;background:var(--yellow);color:var(--bg);font-size:22px;font-weight:800}.heading{display:flex;justify-content:space-between;gap:28px}.hero h1{margin:0;font-size:64px;line-height:1.05}.date{color:var(--cyan);font-size:27px}.summary{text-align:right;font-variant-numeric:tabular-nums}.summary-label{display:block;color:var(--yellow);font-size:22px;font-weight:850;letter-spacing:.08em}.summary-value{display:block;font-size:64px;line-height:1.05}.positive{color:var(--up)}.negative{color:var(--down)}.portfolio{margin:18px 0 22px;padding:18px;border:1px solid rgba(138,180,255,.45);border-radius:14px;background:rgba(10,24,42,.72)}.portfolio h2{margin:0 0 4px;color:var(--yellow)}.table-wrap{overflow-x:auto}table{width:100%;min-width:1200px;border-collapse:collapse;font-variant-numeric:tabular-nums}th,td{padding:8px 9px;border-bottom:1px solid rgba(255,255,255,.12);text-align:right;white-space:nowrap}th:first-child,td:first-child{text-align:left}.grid{display:flex;flex-direction:column;gap:10px}.stock-row{display:grid;grid-template-columns:minmax(220px,1.45fr) repeat(5,minmax(95px,1fr));align-items:center;gap:14px;padding:16px 18px;border:1px solid var(--line);border-radius:16px;background:var(--panel)}.ticker{display:block;color:var(--yellow);font-size:31px;font-weight:850}.company{display:block;color:var(--text);font-size:18px}.price{display:block;font-size:27px;font-weight:850}.movement{display:block;font-size:18px;font-weight:760}.metric span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase}.metric strong{font-size:16px}a{color:var(--cyan)}@media(max-width:900px){.heading{flex-direction:column}.summary{text-align:left}.hero h1,.summary-value{font-size:48px}.stock-row{grid-template-columns:1fr 1fr}}
</style>`;

const PLAYER_STYLE = `<style id="hermes-brief-player-style">
html, body { width: 100% !important; max-width: none !important; overflow-x: hidden !important; }
.wrap { width: 100% !important; max-width: none !important; margin: 0 !important; }
.hermes-brief-player-sticky {
  position: fixed !important;
  inset: 0 0 auto 0 !important;
  width: 100% !important;
  max-width: none !important;
  box-sizing: border-box !important;
  z-index: 2147483647 !important;
  margin: 0 !important;
  border-radius: 0 0 14px 14px !important;
  background: var(--bg, #0f1117) !important;
  box-shadow: 0 10px 24px rgba(0, 0, 0, .42), 0 1px 0 rgba(255, 255, 255, .12) !important;
  padding-top: max(10px, env(safe-area-inset-top)) !important;
  isolation: isolate;
}
.hermes-brief-player-placeholder { display: block !important; width: 100% !important; }
.hermes-brief-player-sticky input[type="range"] { width: 137.5px !important; min-width: 137.5px !important; height: 28px !important; cursor: pointer !important; }
.hermes-brief-player-sticky button { min-width: 38px !important; min-height: 38px !important; }
.hermes-brief-player-sticky button.hermes-command-active,
.hermes-brief-player-sticky button:active {
  border-color: var(--accent, var(--link, #8ab4ff)) !important;
  color: var(--accent, var(--link, #8ab4ff)) !important;
  box-shadow: 0 0 0 2px var(--accent, var(--link, #8ab4ff)) !important;
}
.hermes-brief-player-status { color: var(--muted, #93a4bd); font-size: 12px; white-space: nowrap; }
#hermes-brief-player .hermes-player-shell { position: relative !important; display: flex; min-height: 50px; align-items: center; gap: 9px; padding: 8px 16px 10px; color: var(--text, #f4f7fb); }
#hermes-brief-player .hermes-player-volume { display: inline-flex; align-items: center; gap: 7px; color: var(--muted, #aab8ca); font-size: 12px; white-space: nowrap; }
#hermes-brief-player #tts-speed { min-width: 58px !important; height: 36px !important; min-height: 36px !important; padding: 0 13px !important; border: 1px solid rgba(255,255,255,.16) !important; border-radius: 999px !important; background: #05070c !important; color: #f7f8fb !important; font-size: 13px !important; font-weight: 600 !important; font-variant-numeric: tabular-nums !important; }
#hermes-brief-player #tts-speed:hover { border-color: rgba(255,255,255,.34) !important; }
#hermes-brief-player .hermes-date-nav { position: absolute !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; display: inline-flex !important; align-items: center !important; gap: 18px !important; margin: 0 !important; vertical-align: middle !important; }
#hermes-brief-player .hermes-date-nav-label { display: inline-flex !important; min-height: 42px !important; align-items: center !important; padding: 0 16px !important; border-radius: 999px !important; background: #67e8f9 !important; color: #07111f !important; font-size: 17px !important; line-height: 42px !important; font-weight: 850 !important; letter-spacing: .02em !important; white-space: nowrap !important; }
#hermes-brief-player .hermes-date-nav button { width: 42px !important; height: 42px !important; min-width: 42px !important; min-height: 42px !important; margin: 0 !important; border: 1px solid #67e8f9 !important; border-radius: 999px !important; background: rgba(103, 232, 249, .10) !important; color: #67e8f9 !important; font-size: 26px !important; line-height: 1 !important; }
#hermes-brief-player + .hero, #hermes-brief-player ~ .hero { scroll-margin-top: var(--hermes-player-height, 10rem); }
header .tts, header .player { display: none !important; }
.card, .hermes-playable-card { width: 100% !important; max-width: none !important; scroll-margin-top: var(--hermes-player-height, 10rem) !important; }
.card[role="button"], .hermes-playable-card[role="button"] { cursor: pointer !important; }
.card[role="button"]:hover, .hermes-playable-card[role="button"]:hover { border-color: var(--accent, var(--link, #8ab4ff)) !important; }
.card[role="button"]:focus-visible, .hermes-playable-card[role="button"]:focus-visible { outline: 2px solid var(--accent, var(--link, #8ab4ff)) !important; outline-offset: 2px; }
.hermes-playable-card.active,
.hermes-playable-card[aria-current="true"],
.hermes-playable-card.active:hover,
.hermes-playable-card[aria-current="true"]:hover,
.hermes-playable-card.active:focus-visible,
.hermes-playable-card[aria-current="true"]:focus-visible {
  border-color: #ffd166 !important;
  box-shadow: none !important;
  outline: none !important;
}
/* AI topic headlines use the concise July 14 visual hierarchy. */
.hermes-playable-card h2, .hermes-playable-card h3 { color: var(--hot, #ffd166) !important; }
.hermes-playable-card.takeaways h2 { color: #67e8f9 !important; text-transform: uppercase !important; letter-spacing: .035em !important; }
.hermes-playable-card.takeaways ol { margin: 1.25rem 0 0 !important; padding-left: 2.15rem !important; }
.hermes-playable-card.takeaways li { font-size: 1.2em !important; line-height: 1.58 !important; margin: 0 0 1.15rem !important; }
.hermes-playable-card.takeaways li > strong:first-child { display: block !important; color: #67e8f9 !important; font-size: 1.35em !important; line-height: 1.25 !important; margin: 0 0 .32rem !important; }
.hermes-playable-card.takeaways li::marker { color: #67e8f9 !important; font-size: 1.35em !important; font-weight: 850 !important; }
/* Cron dates are metadata, not a secondary hierarchy. Keep them consistently cyan. */
header .date, header .sub { color: #67e8f9 !important; }
.hermes-portfolio-comparison { margin: 18px 0 22px; padding: 18px; border: 1px solid rgba(138, 180, 255, .45); border-radius: 14px; background: rgba(10, 24, 42, .72); color: var(--text, #f4f7fb); }
.hermes-portfolio-comparison h2 { color: #ffd166 !important; margin: 0 0 4px; font-size: clamp(28px, 3.08vw, 39px); }
.hermes-portfolio-comparison .hermes-portfolio-note { margin: 0 0 14px; color: var(--muted, #aab8ca); font-size: 18px; }
.hermes-portfolio-table-wrap { width: 100%; overflow-x: auto; }
.hermes-portfolio-table { width: 100%; min-width: 1480px; table-layout: fixed; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.hermes-portfolio-table th, .hermes-portfolio-table td { padding: 8px 9px; border-bottom: 1px solid rgba(255, 255, 255, .12); text-align: right; white-space: nowrap; }
.hermes-portfolio-table th { font-size: 14.7px; }
.hermes-portfolio-table td { font-size: 18.2px; }
.hermes-portfolio-table th:first-child, .hermes-portfolio-table td:first-child { width: 20%; min-width: 230px; }
/* Stock quote cards are intentionally transformed into concise full-width rows. */
[aria-label="Stock price cards"] { display: flex !important; flex-direction: column !important; gap: 10px !important; }
[aria-label="Stock price cards"] .card { display: grid !important; grid-template-columns: minmax(210px, 1.45fr) repeat(5, minmax(92px, 1fr)) !important; grid-template-rows: auto auto; gap: 4px 14px !important; align-items: center !important; margin: 0 !important; padding: 16px 18px !important; }
[aria-label="Stock price cards"] .card h2 { grid-column: 1; grid-row: 1 / span 2; margin: 0 !important; }
.hermes-card-daily-change { display: inline-block; margin-left: 10px; font-size: .9em; font-weight: 760; }
[aria-label="Stock price cards"] .card > .change,
[aria-label="Stock price cards"] .card > p.positive,
[aria-label="Stock price cards"] .card > p.negative { display: none !important; }
[aria-label="Stock price cards"] .card .stats { display: contents !important; }
[aria-label="Stock price cards"] .card .stats > * { min-width: 0; margin: 0 !important; padding: 0 !important; border: 0 !important; background: transparent !important; }
[aria-label="Stock price cards"] .card .stats > *:nth-child(n+6) { display: none !important; }
[aria-label="Stock price cards"] .card .stats > *:nth-child(1) { grid-column: 2; grid-row: 1 / span 2; }
[aria-label="Stock price cards"] .card .stats > *:nth-child(2) { grid-column: 3; grid-row: 1 / span 2; }
[aria-label="Stock price cards"] .card .stats > *:nth-child(3) { grid-column: 4; grid-row: 1 / span 2; }
[aria-label="Stock price cards"] .card .stats > *:nth-child(4) { grid-column: 5; grid-row: 1 / span 2; }
[aria-label="Stock price cards"] .card .stats > *:nth-child(5) { grid-column: 6; grid-row: 1 / span 2; }
[aria-label="Stock price cards"] .card .stats .label { display: block; margin-bottom: 2px; font-size: 10px; letter-spacing: .07em; text-transform: uppercase; }
[aria-label="Stock price cards"] .card .stats strong { font-size: 1rem; }
@media (max-width: 840px) { [aria-label="Stock price cards"] .card { grid-template-columns: minmax(190px, 1fr) repeat(3, minmax(88px, 1fr)) !important; } [aria-label="Stock price cards"] .card .stats > *:nth-child(1) { grid-column: 2; grid-row: 1; } [aria-label="Stock price cards"] .card .stats > *:nth-child(2) { grid-column: 3; grid-row: 1; } [aria-label="Stock price cards"] .card .stats > *:nth-child(3) { grid-column: 4; grid-row: 1; } [aria-label="Stock price cards"] .card .stats > *:nth-child(4) { grid-column: 2; grid-row: 2; } [aria-label="Stock price cards"] .card .stats > *:nth-child(5) { grid-column: 3; grid-row: 2; } }
@media (max-width: 620px) { [aria-label="Stock price cards"] .card { grid-template-columns: 1fr 1fr !important; } [aria-label="Stock price cards"] .card h2 { grid-column: 1 / -1; grid-row: auto; } [aria-label="Stock price cards"] .card .stats > * { grid-column: auto !important; grid-row: auto !important; } }
.hermes-portfolio-table th:first-child, .hermes-portfolio-table td:first-child { text-align: left; }
.hermes-portfolio-table thead th { color: var(--muted, #aab8ca); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
.hermes-portfolio-table tbody tr:hover { background: rgba(138, 180, 255, .07); }
.hermes-portfolio-position { display: block; font-weight: 750; }
.hermes-portfolio-meta { display: block; margin-top: 3px; color: var(--muted, #aab8ca); font-size: 15.25px; font-weight: 500; }
.hermes-portfolio-shares { color: #ffd766; font-weight: 800; }
.hermes-portfolio-table thead .hermes-portfolio-shares { color: #ffd766; }
.hermes-portfolio-purchase { color: #ffd766; font-weight: 800; }
.hermes-portfolio-table thead .hermes-portfolio-purchase { color: #ffd766; }
.hermes-portfolio-positive { color: #4ade80; font-weight: 750; }
.hermes-portfolio-negative { color: #fb7185; font-weight: 750; }
.hermes-card-inline-price { display: block; margin-top: .2rem; font-size: 1.35rem; font-weight: 850; white-space: nowrap; }
/* Preserve each archived brief's original card/grid layout.  Only the price moves beneath the ticker. */
.card h2 { display: block !important; }
.hermes-portfolio-unavailable { color: var(--muted, #aab8ca); }
.hermes-portfolio-table tfoot td { border-top: 2px solid rgba(138, 180, 255, .55); border-bottom: 0; font-weight: 800; }
@media (max-width: 700px) {
  .wrap { padding: 10px 8px 28px !important; }
  .hermes-brief-player-sticky { padding: max(8px, env(safe-area-inset-top)) 8px 8px !important; }
  #hermes-brief-player .hermes-player-shell { display: grid !important; grid-template-columns: repeat(3, auto) minmax(96px, 1fr) !important; grid-template-rows: auto auto !important; gap: 8px !important; padding: 6px !important; }
  #hermes-brief-player .hermes-player-volume { min-width: 0 !important; justify-self: stretch !important; }
  #hermes-brief-player .hermes-date-nav { position: static !important; grid-column: 1 / -1 !important; grid-row: 2 !important; justify-self: center !important; gap: 12px !important; transform: none !important; }
  #hermes-brief-player .hermes-date-nav-label { min-height: 34px !important; font-size: 30px !important; line-height: 34px !important; }
  #hermes-brief-player .hermes-date-nav button { width: 36px !important; height: 36px !important; min-width: 36px !important; min-height: 36px !important; font-size: 22px !important; }
  .hermes-brief-player-sticky button { min-width: 36px !important; min-height: 36px !important; }
  .hermes-brief-player-sticky input[type="range"] { width: 100% !important; min-width: 0 !important; max-width: 160px !important; }
  .hermes-portfolio-comparison { margin: 10px 0 16px; padding: 12px; }
}
/* V26: archive-independent full-width Stock rows. */
.hermes-stock-row { grid-column: 1 / -1 !important; width: 100% !important; max-width: none !important; display: grid !important; grid-template-columns: minmax(280px, 1.45fr) repeat(5, minmax(118px, 1fr)) !important; grid-template-rows: auto auto !important; gap: 6px 22px !important; align-items: center !important; margin: 0 !important; padding: 15px 20px !important; }
.hermes-stock-row h2 { grid-column: 1 !important; grid-row: 1 / span 2 !important; margin: 0 !important; }
.hermes-stock-row .hermes-card-company { display: inline !important; margin-left: 9px !important; color: var(--muted, #aab8ca) !important; font-size: .68em !important; font-weight: 550 !important; }
.hermes-stock-row .hermes-card-daily-change { display: inline !important; margin-left: 10px !important; font-size: .78em !important; }
.hermes-stock-row .hermes-card-inline-price { display: block !important; margin-top: 5px !important; font-size: 1.42rem !important; }
.hermes-stock-row > .change, .hermes-stock-row > p.positive, .hermes-stock-row > p.negative, .hermes-stock-row > .company { display: none !important; }
.hermes-stock-row .stats { display: contents !important; }
.hermes-stock-row .stats > * { min-width: 0 !important; margin: 0 !important; padding: 0 !important; border: 0 !important; background: transparent !important; }
.hermes-stock-row .stats > *:nth-child(n+6) { display: none !important; }
.hermes-stock-row .stats > *:nth-child(1) { grid-column: 2 !important; grid-row: 1 / span 2 !important; }
.hermes-stock-row .stats > *:nth-child(2) { grid-column: 3 !important; grid-row: 1 / span 2 !important; }
.hermes-stock-row .stats > *:nth-child(3) { grid-column: 4 !important; grid-row: 1 / span 2 !important; }
.hermes-stock-row .stats > *:nth-child(4) { grid-column: 5 !important; grid-row: 1 / span 2 !important; }
.hermes-stock-row .stats > *:nth-child(5) { grid-column: 6 !important; grid-row: 1 / span 2 !important; }
.hermes-stock-row .stats .label { display: block !important; margin-bottom: 3px !important; font-size: 11px !important; letter-spacing: .08em !important; text-transform: uppercase !important; }
.hermes-stock-row .stats strong { font-size: 1.08rem !important; }
@media (max-width: 940px) { .hermes-stock-row { grid-template-columns: minmax(230px, 1fr) repeat(3, minmax(100px, 1fr)) !important; } .hermes-stock-row .stats > *:nth-child(1) { grid-column: 2 !important; grid-row: 1 !important; } .hermes-stock-row .stats > *:nth-child(2) { grid-column: 3 !important; grid-row: 1 !important; } .hermes-stock-row .stats > *:nth-child(3) { grid-column: 4 !important; grid-row: 1 !important; } .hermes-stock-row .stats > *:nth-child(4) { grid-column: 2 !important; grid-row: 2 !important; } .hermes-stock-row .stats > *:nth-child(5) { grid-column: 3 !important; grid-row: 2 !important; } }
@media (max-width: 680px) { .hermes-stock-row { grid-template-columns: 1fr 1fr !important; } .hermes-stock-row h2 { grid-column: 1 / -1 !important; grid-row: auto !important; } .hermes-stock-row .stats > * { grid-column: auto !important; grid-row: auto !important; } }
/* Stock archives are rewritten to a stable, canonical row markup rather than restyled opportunistically. */
.hermes-stock-today-date-pill { display: inline-flex !important; width: max-content !important; max-width: 100% !important; align-items: center !important; margin: 6.6px 0 9.9px !important; padding: 5.5px 12.1px !important; border-radius: 999px !important; background: #ffffff !important; color: #0b1020 !important; font-family: inherit !important; font-size: clamp(12.1px, 1.43vw, 18.7px) !important; font-weight: 850 !important; line-height: 1.1 !important; letter-spacing: .02em !important; white-space: nowrap !important; }
main.grid { display: flex !important; flex-direction: column !important; gap: 8px !important; }
.hermes-stock-row { grid-column: 1 / -1 !important; width: 100% !important; max-width: none !important; min-width: 0 !important; box-sizing: border-box !important; display: grid !important; grid-template-columns: minmax(220px, 280px) minmax(150px, 190px) minmax(0, 1fr) !important; gap: 14px !important; align-items: center !important; margin: 0 !important; padding: 10px 20px !important; border: 1px solid var(--line, #334155) !important; border-radius: 16px !important; background: var(--panel, #111827) !important; box-shadow: none !important; }
.hermes-stock-identity { grid-column: 1 !important; display: flex !important; min-width: 0 !important; flex-direction: column !important; align-items: flex-start !important; justify-content: center !important; }
.hermes-stock-title { display: flex !important; min-width: 0 !important; flex-direction: column !important; align-items: flex-start !important; gap: 5px !important; }
.hermes-stock-ticker { color: #ffe08a !important; font-size: 1.55rem !important; font-weight: 850 !important; letter-spacing: .02em !important; }
.hermes-stock-company { min-width: 0 !important; color: var(--text, #f4f7fb) !important; font-size: 1.35rem !important; font-weight: 750 !important; line-height: 1.2 !important; letter-spacing: .025em !important; text-transform: uppercase !important; overflow-wrap: anywhere !important; }
.hermes-stock-change { display: block !important; margin-top: 12px !important; font-size: 1.22rem !important; font-weight: 800 !important; line-height: 1.2 !important; white-space: nowrap !important; }
.hermes-stock-current-price { grid-column: 2 !important; display: flex !important; min-width: 0 !important; flex-direction: column !important; align-items: flex-start !important; justify-content: center !important; }
.hermes-stock-current-label { color: var(--muted, #aab8ca) !important; font-size: clamp(.82rem, 1vw, 1.15rem) !important; font-weight: 700 !important; letter-spacing: .055em !important; line-height: 1.2 !important; }
.hermes-stock-price { display: block !important; margin-top: 7px !important; color: #ffe08a !important; font-size: 2.3rem !important; line-height: 1 !important; font-variant-numeric: tabular-nums !important; }
.hermes-stock-metrics { grid-column: 3 !important; display: grid !important; min-width: 0 !important; grid-template-columns: repeat(5, minmax(0, 1fr)) !important; gap: 12px !important; align-items: center !important; margin: 0 !important; }
.hermes-stock-metrics > div { min-width: 0 !important; }
.hermes-stock-metrics dt { max-width: 100% !important; color: var(--muted, #aab8ca) !important; font-size: clamp(.82rem, 1vw, 1.15rem) !important; font-weight: 700 !important; letter-spacing: .055em !important; line-height: 1.2 !important; text-transform: uppercase !important; overflow-wrap: anywhere !important; }
.hermes-stock-metrics dd { max-width: 100% !important; margin: 7px 0 0 !important; color: var(--text, #f4f7fb) !important; font-size: clamp(1.05rem, 1.55vw, 1.9rem) !important; font-weight: 800 !important; line-height: 1.15 !important; font-variant-numeric: tabular-nums !important; white-space: nowrap !important; }
.hermes-stock-row time, .hermes-stock-row [class*="timestamp"], .hermes-stock-row [class*="as-of"] { display: none !important; }
@media (max-width: 1200px) { .hermes-stock-company { font-size: 1.05rem !important; } .hermes-stock-metrics { gap: 8px !important; } }
@media (max-width: 900px) { .hermes-stock-today-date-pill { font-size: 14.3px !important; } }
@media (max-width: 1100px) { .hermes-stock-row { grid-template-columns: minmax(0, 1fr) minmax(150px, 190px) !important; gap: 10px 16px !important; } .hermes-stock-identity { grid-column: 1 !important; } .hermes-stock-current-price { grid-column: 2 !important; } .hermes-stock-metrics { grid-column: 1 / -1 !important; grid-row: 2 !important; width: 100% !important; } }
@media (max-width: 760px) { .hermes-stock-row { grid-template-columns: 1fr !important; gap: 12px !important; padding: 14px !important; } .hermes-stock-identity, .hermes-stock-current-price, .hermes-stock-metrics { grid-column: 1 !important; } .hermes-stock-current-price { grid-row: 2 !important; } .hermes-stock-metrics { grid-row: 3 !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 16px 22px !important; } }
</style>`;

const AI_RESTORED_STYLE = `<style id="hermes-ai-restored-style">
:root { --bg: #0b1020; --card: #121a33; --text: #eef3ff; --muted: #aab6d3; --accent: #8bd3ff; --line: #263456; --hot: #ffd166; }
html, body { width: 100% !important; max-width: none !important; min-height: 100% !important; margin: 0 !important; background: #0b1020 !important; color: #eef3ff !important; }
body { box-sizing: border-box !important; padding: 40px 22px 64px !important; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important; font-size: 32px !important; line-height: 1.6 !important; }
.wrap, body > main { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
body > header, body > main > header, .wrap > header, .hero { box-sizing: border-box !important; width: 100% !important; max-width: none !important; margin: 0 0 22px !important; padding: 28px !important; border: 1px solid #263456 !important; border-radius: 22px !important; background: linear-gradient(135deg, #182345, #10182f) !important; color: #eef3ff !important; box-shadow: 0 20px 60px rgba(0,0,0,.25) !important; }
body > header::before, body > main > header::before, .wrap > header::before, .hero::before { content: none !important; display: none !important; }
html body .hero .tag, html body header .tag, html body .tag { display: none !important; visibility: hidden !important; }
html body .hero .pill, html body header .pill { display: inline-block !important; visibility: visible !important; margin: 0 0 18px !important; padding: 10px 22px !important; border-radius: 999px !important; background: #ffd166 !important; color: #0b1020 !important; font-size: 22px !important; font-weight: 800 !important; line-height: 1.2 !important; letter-spacing: .02em !important; }
.hermes-date-nav { position: relative !important; top: 10px !important; display: inline-flex !important; align-items: center !important; gap: 18px !important; margin: 0 0 18px 22px !important; vertical-align: middle !important; }
.hermes-date-nav button { display: inline-grid !important; width: 46px !important; height: 46px !important; place-items: center !important; padding: 0 !important; border: 1px solid #67e8f9 !important; border-radius: 999px !important; background: rgba(103,232,249,.10) !important; color: #67e8f9 !important; font-size: 32px !important; font-weight: 800 !important; line-height: 1 !important; cursor: pointer !important; }
.hermes-date-nav button:hover, .hermes-date-nav button:focus-visible { background: #67e8f9 !important; color: #0b1020 !important; outline: none !important; }
body > header h1, body > main > header h1, .wrap > header h1, .hero h1 { margin: 0 0 10px !important; color: #eef3ff !important; font-size: 64px !important; line-height: 1.05 !important; letter-spacing: .015em !important; }
.hermes-ai-title-row { display: flex !important; align-items: center !important; flex-wrap: wrap !important; gap: 16px !important; margin: 0 0 10px !important; }
.hermes-ai-title-row h1 { margin: 0 !important; }
#hermes-ai-fullscreen-button { display: inline-grid !important; width: 44px !important; height: 44px !important; flex: 0 0 44px !important; place-items: center !important; padding: 0 !important; border: 1px solid #67e8f9 !important; border-radius: 10px !important; background: rgba(103,232,249,.10) !important; color: #67e8f9 !important; cursor: pointer !important; }
#hermes-ai-fullscreen-button:hover, #hermes-ai-fullscreen-button:focus-visible { background: #67e8f9 !important; color: #0b1020 !important; outline: none !important; }
#hermes-ai-fullscreen-button svg { width: 26px !important; height: 26px !important; fill: none !important; stroke: currentColor !important; stroke-width: 2 !important; stroke-linecap: round !important; stroke-linejoin: round !important; }
html:fullscreen { overflow-y: auto !important; background: #0b1020 !important; }
body > header p, body > main > header p, .wrap > header p, html body .hero p, body > header .date, body > main > header .date, .wrap > header .date, html body .hero .date, body > header strong, body > main > header strong, .wrap > header strong, html body .hero strong { margin: 0 !important; color: #eef3ff !important; font-size: 27px !important; line-height: 1.35 !important; }
.takeaways, body > main > .takeaways, .hermes-playable-card.takeaways { box-sizing: border-box !important; width: 100% !important; max-width: none !important; margin: 12px 0 !important; padding: 22px 26px !important; border: 1px solid #263456 !important; border-radius: 18px !important; background: #121a33 !important; color: #eef3ff !important; box-shadow: none !important; }
.takeaways h2, .hermes-playable-card.takeaways h2 { margin: 0 0 14px !important; padding: 0 !important; border: 0 !important; color: #ffd166 !important; font-size: 38px !important; font-weight: 700 !important; line-height: 1.15 !important; letter-spacing: .015em !important; text-transform: uppercase !important; }
.takeaways ol, .hermes-playable-card.takeaways ol { box-sizing: border-box !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding-left: 1.5em !important; }
.takeaways li, .hermes-playable-card.takeaways li { box-sizing: border-box !important; width: 100% !important; max-width: none !important; margin: 0 0 10px !important; color: #eef3ff !important; font-size: 36px !important; font-weight: 400 !important; line-height: 1.34 !important; }
.takeaways li > *, .hermes-playable-card.takeaways li > * { box-sizing: border-box !important; width: 100% !important; max-width: none !important; }
.takeaways .hermes-takeaway-detail, .hermes-playable-card.takeaways .hermes-takeaway-detail { display: block !important; width: auto !important; max-width: min(92ch, 100%) !important; margin: .16em 0 0 !important; text-align: left !important; text-align-last: auto !important; text-wrap: pretty !important; word-spacing: normal !important; letter-spacing: -.01em !important; line-height: 1.42 !important; }
.takeaways li:last-child, .hermes-playable-card.takeaways li:last-child { margin-bottom: 0 !important; }
.takeaways li > strong:first-child, .hermes-playable-card.takeaways li > strong:first-child { display: block !important; margin: 0 0 2px !important; color: #8bd3ff !important; font-size: 42px !important; font-weight: 700 !important; line-height: 1.16 !important; letter-spacing: -.02em !important; }
.takeaways li::marker, .hermes-playable-card.takeaways li::marker { color: #8bd3ff !important; font-size: 38px !important; font-weight: 700 !important; }
.topics { display: grid !important; gap: 22px !important; }
.topics > .card, .hermes-playable-card:not(.takeaways), body > main > article, body > main > section.hermes-generated-topic { box-sizing: border-box !important; width: 100% !important; max-width: none !important; margin: 0 0 22px !important; padding: 24px !important; border: 1px solid #67e8f9 !important; border-radius: 18px !important; background: rgba(18,26,51,.55) !important; color: #eef3ff !important; font-size: 32px !important; line-height: 1.6 !important; box-shadow: none !important; }
body .hermes-topic-container { border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
.topics > .card h2, .hermes-playable-card:not(.takeaways) h2, .hermes-playable-card:not(.takeaways) h3 { margin: 0 0 28px !important; padding: 0 !important; border: 0 !important; color: #ffd166 !important; font-size: 44px !important; line-height: 1.25 !important; }
.topics > .card p, .hermes-playable-card:not(.takeaways) p, .topics > .card li, .hermes-playable-card:not(.takeaways) li, .topics > .card a, .hermes-playable-card:not(.takeaways) a { font-size: 32px !important; line-height: 1.6 !important; }
.topics > .card a, .hermes-playable-card:not(.takeaways) a { color: #8bd3ff !important; text-decoration-thickness: .08em !important; text-underline-offset: .18em !important; }
.sources { margin-top: 28px !important; color: #aab6d3 !important; }
#hermes-brief-player { font-size: 16px !important; }
@media (max-width: 900px) {
  body { padding: 20px 12px 36px !important; font-size: 26px !important; }
  body > header, body > main > header, .wrap > header, .hero { padding: 34px !important; }
  .takeaways, body > main > .takeaways, .hermes-playable-card.takeaways { padding: 24px !important; }
  .topics > .card, .hermes-playable-card:not(.takeaways), body > main > article, body > main > section.hermes-generated-topic { padding: 30px !important; }
  body > header h1, body > main > header h1, .wrap > header h1, .hero h1 { font-size: 48px !important; }
  .takeaways h2, .hermes-playable-card.takeaways h2 { font-size: 32px !important; }
  .takeaways li > strong:first-child, .hermes-playable-card.takeaways li > strong:first-child { font-size: 30px !important; }
  .takeaways li, .hermes-playable-card.takeaways li { font-size: 24px !important; }
  .topics > .card h2, .hermes-playable-card:not(.takeaways) h2, .hermes-playable-card:not(.takeaways) h3 { font-size: 36px !important; }
  .topics > .card, .hermes-playable-card:not(.takeaways), .topics > .card p, .hermes-playable-card:not(.takeaways) p, .topics > .card li, .hermes-playable-card:not(.takeaways) li, .topics > .card a, .hermes-playable-card:not(.takeaways) a { font-size: 26px !important; }
}
@media (max-width: 560px) {
  body { padding: 12px 8px 28px !important; font-size: 20px !important; overflow-x: hidden !important; }
  body > header, body > main > header, .wrap > header, .hero { padding: 18px !important; border-radius: 16px !important; }
  body > header h1, body > main > header h1, .wrap > header h1, .hero h1 { font-size: 38px !important; overflow-wrap: anywhere !important; }
  .hermes-ai-title-row { gap: 10px !important; }
  #hermes-ai-fullscreen-button { width: 40px !important; height: 40px !important; flex-basis: 40px !important; }
  .takeaways, body > main > .takeaways, .hermes-playable-card.takeaways, .topics > .card, .hermes-playable-card:not(.takeaways), body > main > article, body > main > section.hermes-generated-topic { padding: 16px !important; border-radius: 15px !important; }
  .takeaways ol, .hermes-playable-card.takeaways ol { padding-left: 1.8em !important; }
  .takeaways li::marker, .hermes-playable-card.takeaways li::marker { font-size: 25px !important; }
  .takeaways h2, .hermes-playable-card.takeaways h2 { font-size: 27px !important; overflow-wrap: anywhere !important; }
  .takeaways li > strong:first-child, .hermes-playable-card.takeaways li > strong:first-child { font-size: 25px !important; }
  .takeaways li, .hermes-playable-card.takeaways li, .topics > .card, .hermes-playable-card:not(.takeaways), .topics > .card p, .hermes-playable-card:not(.takeaways) p, .topics > .card li, .hermes-playable-card:not(.takeaways) li, .topics > .card a, .hermes-playable-card:not(.takeaways) a { font-size: 20px !important; overflow-wrap: anywhere !important; }
  .topics > .card h2, .hermes-playable-card:not(.takeaways) h2, .hermes-playable-card:not(.takeaways) h3 { margin-bottom: 18px !important; font-size: 29px !important; overflow-wrap: anywhere !important; }
}
@media (max-height: 900px) and (min-width: 1100px) {
  body { padding: 18px 18px 40px !important; }
  body > header, body > main > header, .wrap > header, .hero { margin-bottom: 16px !important; padding: 20px 24px !important; }
  body > header h1, body > main > header h1, .wrap > header h1, .hero h1 { font-size: 48px !important; }
}
</style>`;

const STOCK_HERO_STYLE = `<style id="hermes-stock-hero-style">
/* v26-responsive-canonical-stock-hero */
:root { color-scheme: dark !important; --bg: #0b1020 !important; --panel: #111827 !important; --text: #eef3ff !important; --muted: #aab8ca !important; --line: #334155 !important; }
html, body { width: 100% !important; max-width: none !important; min-height: 100% !important; margin: 0 !important; background: #0b1020 !important; color: #eef3ff !important; }
body { box-sizing: border-box !important; padding: 32px 28px 64px !important; overflow-x: hidden !important; }
body > main { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 28px !important; }
body > header, body > main > header, .wrap > header, .hero { box-sizing: border-box !important; width: 100% !important; max-width: none !important; margin: 0 0 22px !important; padding: 28px !important; border: 1px solid #263456 !important; border-radius: 22px !important; background: linear-gradient(135deg, #182345, #10182f) !important; color: #eef3ff !important; box-shadow: 0 20px 60px rgba(0,0,0,.25) !important; }
html body .hero .pill, html body header .pill { display: inline-block !important; visibility: visible !important; position: static !important; inset: auto !important; width: auto !important; height: auto !important; opacity: 1 !important; clip: auto !important; clip-path: none !important; transform: none !important; overflow: visible !important; margin: 0 !important; padding: 10px 22px !important; border-radius: 999px !important; background: #ffd166 !important; color: #0b1020 !important; font-size: 22px !important; font-weight: 800 !important; line-height: 1.2 !important; letter-spacing: .02em !important; white-space: nowrap !important; }
body > header h1, body > main > header h1, .wrap > header h1, .hero h1 { margin: 0 0 10px !important; color: #eef3ff !important; font-size: clamp(42px, 5vw, 64px) !important; line-height: 1.05 !important; letter-spacing: .015em !important; overflow-wrap: anywhere !important; }
.hermes-stock-title-row { display: flex !important; min-width: 0 !important; align-items: center !important; flex-wrap: wrap !important; gap: 16px !important; margin: 0 0 10px !important; }
.hermes-stock-title-row h1 { margin: 0 !important; }
.hermes-stock-hero-left { display: flex !important; min-width: 0 !important; flex-direction: column !important; align-items: flex-start !important; }
.hermes-stock-meta-stack { display: flex !important; flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; margin-top: 8.4px !important; }
.hermes-stock-meta-stack > #hermes-stock-date-pill, .hermes-stock-meta-stack > .date, .hermes-stock-meta-stack > .sub { margin: 0 !important; }
.hermes-stock-meta-stack > .sub { line-height: 1.4 !important; }
.hermes-stock-heading-row { display: flex !important; min-width: 0 !important; align-items: flex-start !important; justify-content: space-between !important; gap: clamp(18px, 3vw, 48px) !important; }
.hermes-stock-heading-row .hermes-stock-title-row { min-width: 0 !important; }
.hermes-stock-summary-stack { display: flex !important; flex: 0 0 auto !important; flex-direction: column !important; align-items: flex-end !important; gap: 12px !important; margin-left: auto !important; transform: translateY(25%) !important; }
.hermes-stock-portfolio-summary { margin: 0 !important; text-align: right !important; font-variant-numeric: tabular-nums !important; }
.hermes-stock-summary-label { display: block !important; margin: 0 0 5px !important; color: #ffd166 !important; font-size: clamp(18px, 1.72vw, 22px) !important; line-height: 1.1 !important; font-weight: 850 !important; letter-spacing: .08em !important; }
.hermes-stock-summary-value { display: block !important; font-size: clamp(36px, 4.45vw, 56.96px) !important; line-height: 1.05 !important; font-weight: 400 !important; white-space: nowrap !important; }
#hermes-stock-fullscreen-button { display: inline-grid !important; width: 44px !important; height: 44px !important; flex: 0 0 44px !important; place-items: center !important; padding: 0 !important; border: 1px solid #67e8f9 !important; border-radius: 10px !important; background: rgba(103,232,249,.10) !important; color: #67e8f9 !important; cursor: pointer !important; }
#hermes-stock-fullscreen-button:hover, #hermes-stock-fullscreen-button:focus-visible { background: #67e8f9 !important; color: #0b1020 !important; outline: none !important; }
#hermes-stock-fullscreen-button svg { width: 26px !important; height: 26px !important; fill: none !important; stroke: currentColor !important; stroke-width: 2 !important; stroke-linecap: round !important; stroke-linejoin: round !important; }
html:fullscreen { overflow-y: auto !important; background: #0b1020 !important; }
body > header .date, body > main > header .date, .wrap > header .date, .hero .date { margin: 0 !important; color: #eef3ff !important; font-size: clamp(20px, 2.1vw, 27px) !important; line-height: 1.35 !important; overflow-wrap: anywhere !important; }
@media (max-width: 900px) {
  body { padding: 20px 12px 40px !important; }
  body > main { padding: 20px !important; }
  body > header, body > main > header, .wrap > header, .hero { padding: 22px !important; }
  .hermes-stock-heading-row { flex-direction: column !important; }
  .hermes-stock-summary-stack { width: 100% !important; align-items: flex-start !important; margin-left: 0 !important; transform: none !important; }
  .hermes-stock-portfolio-summary { text-align: left !important; }
}
@media (max-width: 560px) {
  body { padding: 12px 8px 28px !important; }
  body > main { padding: 14px !important; }
  body > header, body > main > header, .wrap > header, .hero { padding: 18px !important; border-radius: 16px !important; }
  .hermes-stock-title-row { gap: 10px !important; }
  .hermes-stock-meta-stack { gap: 10px !important; margin-top: 5.4px !important; }
  #hermes-stock-fullscreen-button { width: 40px !important; height: 40px !important; flex-basis: 40px !important; }
  html body .hero .pill, html body header .pill { padding: 8px 16px !important; font-size: 18px !important; }
}
@media (max-height: 900px) and (min-width: 1100px) {
  body { padding: 14px 18px 36px !important; }
  body > header, body > main > header, .wrap > header, .hero { margin-bottom: 16px !important; padding: 20px 24px !important; }
  .hermes-stock-heading-row { align-items: center !important; }
  .hermes-stock-summary-stack { gap: 8px !important; }
  .hermes-stock-meta-stack { gap: 10px !important; margin-top: 5.4px !important; }
  html body .hero .pill, html body header .pill { padding: 8px 18px !important; font-size: 18px !important; }
  body > header .date, body > main > header .date, .wrap > header .date, .hero .date { font-size: 21px !important; }
}
</style>`;

const PLAYER_CONTROLLER = `<script id="hermes-brief-player-controller">
(() => {
  const MESSAGE_TYPE = "${BRIEF_PLAYER_MESSAGE_TYPE}";
  const DATE_NAV_MESSAGE_TYPE = "${BRIEF_DATE_NAV_MESSAGE_TYPE}";

  const PLAYER_CLASS = "hermes-brief-player-sticky";
  const PLACEHOLDER_CLASS = "hermes-brief-player-placeholder";
  const synth = window.speechSynthesis;
  const playbackRates = [1, 1.25, 1.5, 1.75];
  const preferredVoiceNames = [
    "Samantha", "Ava", "Allison", "Susan", "Victoria", "Karen", "Moira",
    "Tessa", "Serena", "Kate", "Fiona", "Veena", "Zira", "Jenny", "Aria",
    "Google US English"
  ];
  const blockedVoiceNames = [
    "Bad News", "Bahh", "Bells", "Boing", "Bubbles", "Cellos", "Deranged",
    "Good News", "Hysterical", "Pipe Organ", "Trinoids", "Whisper", "Zarvox"
  ];

  let cards = [];
  let index = 0;
  let playbackRate = 1.25;
  let activeCardIndex = 0;
  let navigationStarted = false;
  let playing = false;
  let paused = false;
  let currentUtterance = null;
  let playbackRestartTimer = null;
  let takeawayQueue = [];
  let takeawayQueueIndex = 0;
  let takeawayQueueToken = 0;
  let takeawayQueueTimer = null;
  let speakingTakeaways = false;
  let root = null;
  let previousButton = null;
  let playButton = null;
  let nextButton = null;
  let volumeInput = null;
  let speedButton = null;
  let statusElement = null;
  let placeholder = null;
  let founderTakeaways = null;
  let fullscreenButton = null;
  let fullscreenActive = Boolean(document.fullscreenElement);

  function updateFullscreenButton(active = fullscreenActive) {
    if (!fullscreenButton) return;
    fullscreenActive = active;
    fullscreenButton.setAttribute("aria-label", active ? "Exit AI Morning Brief fullscreen" : "Enter AI Morning Brief fullscreen");
    fullscreenButton.setAttribute("title", active ? "Exit fullscreen" : "Enter fullscreen");
  }

  async function toggleFullscreen() {
    if (window.parent !== window) {
      window.parent.postMessage({ type: "hermes-ai-fullscreen-toggle" }, "*");
      return;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_reason) {
      // Browser fullscreen denial leaves audio and layout state unchanged.
    }
    updateFullscreenButton(Boolean(document.fullscreenElement));
  }

  function captureViewportPosition() {
    return { scrollX: window.scrollX, scrollY: window.scrollY, topicIndex: activeCardIndex };
  }

  function publishViewportState() {
    if (window.parent === window) return;
    window.parent.postMessage({ type: "hermes-ai-viewport-state", position: captureViewportPosition() }, "*");
  }

  function restoreActiveCard(topicIndex) {
    const requestedIndex = Math.trunc(topicIndex);
    let target = null;
    if (requestedIndex === -1 && founderTakeaways) {
      activeCardIndex = -1;
      cards.forEach((card) => {
        card.classList.remove("active");
        card.removeAttribute("aria-current");
        applyCardVisualState(card, false);
      });
      founderTakeaways.classList.add("hermes-playable-card", "active");
      founderTakeaways.setAttribute("aria-current", "true");
      applyCardVisualState(founderTakeaways, true);
      target = founderTakeaways;
    } else {
      index = Math.max(0, Math.min(cards.length - 1, requestedIndex));
      activeCardIndex = index;
      navigationStarted = true;
      mark({ behavior: "auto", scroll: false });
      target = cards[index];
    }
    if (!target) return;
    let framesRemaining = 8;
    const alignCard = () => {
      target.scrollIntoView({ behavior: "auto", block: "start" });
      framesRemaining -= 1;
      if (framesRemaining > 0) requestAnimationFrame(alignCard);
      else publishViewportState();
    };
    requestAnimationFrame(() => requestAnimationFrame(alignCard));
  }

  function restoreViewportPosition(position) {
    if (Number.isInteger(position?.topicIndex)) {
      restoreActiveCard(position.topicIndex);
      return;
    }
    const targetX = Number.isFinite(position?.scrollX) ? Math.max(0, position.scrollX) : 0;
    const targetY = Number.isFinite(position?.scrollY) ? Math.max(0, position.scrollY) : 0;
    let framesRemaining = 8;
    const applyPosition = () => {
      window.scrollTo(targetX, targetY);
      framesRemaining -= 1;
      if (framesRemaining > 0) requestAnimationFrame(applyPosition);
    };
    requestAnimationFrame(() => requestAnimationFrame(applyPosition));
  }

  function ensureHermesPlayer() {
    let player = document.getElementById("hermes-brief-player");
    if (player) return player;
    player = document.createElement("nav");
    player.id = "hermes-brief-player";
    player.setAttribute("aria-label", "Brief playback controls");
    player.innerHTML = '<div class="hermes-player-shell"><button id="tts-prev" type="button" aria-label="Previous topic" title="Previous topic">←</button><button id="tts-toggle" type="button" aria-label="Play reading" aria-pressed="false" title="Play or pause">▶</button><button id="tts-next" type="button" aria-label="Next topic" title="Next topic">→</button><label class="hermes-player-volume"><input id="tts-volume" type="range" min="0" max="1" step="0.05" value="0.45" aria-label="Volume" title="Volume 45%"></label><button id="tts-speed" type="button" aria-label="Playback speed 1.25x" title="Playback speed">1.25x</button></div>';
    document.body.insertBefore(player, document.body.firstChild);
    return player;
  }

  function normalizeAiVisualStructure() {
    document.querySelectorAll(".tag").forEach((label) => label.remove());
    const header = document.querySelector(".hero, body > header, body > main > header, .wrap > header, header");
    if (!header) return;
    const dateParagraph = header.querySelector(".date");
    const dateLine = dateParagraph?.textContent?.trim();
    const pill = header.querySelector(".pill");
    const alreadyNormalized = header.dataset.hermesDateNormalized === "true";
    if (dateLine && !alreadyNormalized) {
      const [pillDate, ...metadataParts] = dateLine.split("·").map((part) => part.trim());
      if (pillDate && pill) pill.textContent = pillDate;
      const archiveMetadata = metadataParts.filter(Boolean).join(" · ");
      const metadataLine = archiveMetadata;
      if (dateParagraph && metadataLine) dateParagraph.textContent = metadataLine;
      else dateParagraph?.remove();
    }
    header.querySelectorAll(".meta").forEach((metadata) => metadata.remove());
    const heading = header.querySelector("h1");
    if (heading) {
      heading.textContent = heading.textContent.replace(/\\s*(?:—|-)\\s*\\d{4}-\\d{2}-\\d{2}\\s*$/, "");
      let titleRow = heading.closest(".hermes-ai-title-row");
      if (!titleRow) {
        titleRow = document.createElement("div");
        titleRow.className = "hermes-ai-title-row";
        heading.parentElement?.insertBefore(titleRow, heading);
        titleRow.appendChild(heading);
      }
      let fullscreenButton = document.getElementById("hermes-ai-fullscreen-button");
      if (!fullscreenButton) {
        fullscreenButton = document.createElement("button");
        fullscreenButton.id = "hermes-ai-fullscreen-button";
        fullscreenButton.setAttribute("type", "button");
        fullscreenButton.setAttribute("aria-label", "Enter AI Morning Brief fullscreen");
        fullscreenButton.setAttribute("title", "Enter fullscreen");
        fullscreenButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/></svg>';
      }
      titleRow.appendChild(fullscreenButton);
    }
  }

  function normalizeTakeawayDetails() {
    document.querySelectorAll(".takeaways li").forEach((item) => {
      Array.from(item.childNodes).forEach((node) => {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) return;
        const detail = document.createElement("span");
        detail.className = "hermes-takeaway-detail";
        node.replaceWith(detail);
        detail.appendChild(node);
      });
      Array.from(item.children).forEach((element) => {
        if (element.matches("strong:first-child, h3:first-child, h4:first-child")) return;
        element.classList.add("hermes-takeaway-detail");
      });
    });
  }

  function ensureDateNavigator() {
    const shell = document.querySelector("#hermes-brief-player .hermes-player-shell");
    if (!shell) return;
    const header = document.querySelector(".hero, body > header, body > main > header, .wrap > header, header");
    let navigator = document.querySelector(".hermes-date-nav");
    if (!navigator) navigator = document.createElement("span");
    navigator.className = "hermes-date-nav";
    navigator.setAttribute("role", "group");
    navigator.setAttribute("aria-label", "Cron date navigation");
    const visibleDate = header?.querySelector(".pill")?.textContent?.trim() || "Date unavailable";
    navigator.innerHTML = '<button id="hermes-date-newer" type="button" aria-label="Load newer cron date" title="Newer cron date">‹</button><span class="hermes-date-nav-label"></span><button id="hermes-date-older" type="button" aria-label="Load older cron date" title="Older cron date">›</button>';
    navigator.querySelector(".hermes-date-nav-label").textContent = visibleDate;
    shell.appendChild(navigator);
    header?.querySelectorAll(".hermes-date-nav").forEach((element) => {
      if (element !== navigator) element.remove();
    });
    navigator.querySelector("#hermes-date-newer")?.addEventListener("click", () => {
      window.parent?.postMessage({ type: DATE_NAV_MESSAGE_TYPE, direction: "newer", position: captureViewportPosition() }, "*");
    });
    navigator.querySelector("#hermes-date-older")?.addEventListener("click", () => {
      window.parent?.postMessage({ type: DATE_NAV_MESSAGE_TYPE, direction: "older", position: captureViewportPosition() }, "*");
    });
  }

  function isNumberedTopicHeading(element) {
    return /^\\s*\\d+\\s*[.)]\\s+/.test(element.textContent || "");
  }

  function wrapSiblingTopic(heading) {
    const parent = heading.parentElement;
    if (!parent) return heading;
    const wrapper = document.createElement("section");
    wrapper.className = "hermes-playable-card hermes-generated-topic";
    parent.insertBefore(wrapper, heading);
    let node = heading;
    while (node) {
      const next = node.nextSibling;
      if (node !== heading && node instanceof Element && node.matches("h2, h3") && isNumberedTopicHeading(node)) break;
      wrapper.appendChild(node);
      node = next;
    }
    return wrapper;
  }

  function playableCards() {
    const numberedHeadings = Array.from(document.querySelectorAll("main h2, main h3, body > h2, body > h3"))
      .filter(isNumberedTopicHeading);
    if (numberedHeadings.length) {
      return numberedHeadings.map((heading) => {
        const container = heading.closest(".card, article, section");
        const numberedInside = container
          ? Array.from(container.querySelectorAll("h2, h3")).filter(isNumberedTopicHeading)
          : [];
        if (container && numberedInside.length > 1) container.classList.add("hermes-topic-container");
        const card = container && numberedInside.length === 1 ? container : wrapSiblingTopic(heading);
        card.classList.add("hermes-playable-card");
        return card;
      }).filter((element, position, all) => all.indexOf(element) === position)
        .filter((element) => !element.matches(".agenda, [data-hermes-exclude-from-player]"));
    }
    const explicit = Array.from(document.querySelectorAll(".card, article.card"))
      .filter((element) => !element.matches(".takeaways, .agenda, [data-hermes-exclude-from-player]"));
    const fallback = explicit.length
      ? explicit
      : Array.from(document.querySelectorAll("main article, main section, article, section"))
        .filter((element) => element.querySelector("h2, h3"))
        .filter((element) => !element.closest("#hermes-brief-player"))
        .filter((element) => !element.matches(".takeaways, .agenda, [data-hermes-exclude-from-player]"));
    return fallback;
  }

  function controls() {
    root = ensureHermesPlayer();
    previousButton = document.getElementById("tts-prev");
    playButton = document.getElementById("tts-toggle");
    nextButton = document.getElementById("tts-next");
    volumeInput = document.getElementById("tts-volume");
    speedButton = document.getElementById("tts-speed");
    founderTakeaways = document.querySelector(".takeaways");
    fullscreenButton = document.getElementById("hermes-ai-fullscreen-button");
    cards = playableCards();
    return Boolean(root && previousButton && playButton && nextButton && volumeInput && speedButton && cards.length);
  }

  function focusPlayerRoot() {
    if (!root) return;
    root.setAttribute("tabindex", "-1");
    root.dataset.hermesAiFocusRestore = "v26-ai-player-focus-restore";
    root.focus({ preventScroll: true });
  }

  function normalizedIndex(value) {
    if (!cards.length) return 0;
    return ((value % cards.length) + cards.length) % cards.length;
  }

  function sentenceForSpeech(value) {
    const text = String(value || "").replace(/\\s+/g, " ").trim();
    if (!text) return "";
    return /[.!?;:]$/.test(text) ? text : text + ".";
  }

  function takeawaySpeechSegments(card) {
    const heading = sentenceForSpeech(card.querySelector("h1, h2, h3")?.textContent);
    const segments = heading ? [{ text: heading, pauseAfter: 300 }] : [];
    Array.from(card.querySelectorAll("li")).forEach((item, itemIndex) => {
      const clone = item.cloneNode(true);
      clone.querySelectorAll(".sources, .source, script, style").forEach((element) => element.remove());
      const titleElement = clone.querySelector("strong, h3, h4");
      const title = sentenceForSpeech(titleElement?.textContent);
      titleElement?.remove();
      const detail = sentenceForSpeech(clone.textContent);
      segments.push({ text: ["Takeaway " + (itemIndex + 1) + ".", title].filter(Boolean).join(" "), pauseAfter: 500 });
      if (detail) segments.push({ text: detail, pauseAfter: 350 });
    });
    return segments;
  }

  function takeawaySpeechText(card) {
    return takeawaySpeechSegments(card).map((segment) => segment.text).join(" ");
  }

  function textFor(card) {
    const clone = card.cloneNode(true);
    clone.querySelectorAll(".sources, .source, script, style").forEach((element) => element.remove());
    if (card.classList.contains("takeaways")) return takeawaySpeechText(card);
    const parts = Array.from(clone.querySelectorAll("h1, h2, h3, h4, p, li, blockquote, dt, dd"))
      .map((element) => element.textContent.trim())
      .filter(Boolean);
    if (parts.length) return parts.join(". ");
    return clone.textContent.trim();
  }

  function configureNaturalVoice(utterance) {
    const voices = synth ? synth.getVoices() : [];
    const usableVoices = voices.filter((voice) =>
      /^en([-_]|$)/i.test(voice.lang || "") &&
      !blockedVoiceNames.some((name) => voice.name.toLowerCase().includes(name.toLowerCase()))
    );
    const selectedVoice = preferredVoiceNames
      .map((name) => usableVoices.find((voice) => voice.name.toLowerCase().includes(name.toLowerCase())))
      .find(Boolean) || null;
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.lang = selectedVoice?.lang || "en-US";
    utterance.pitch = 1;
    utterance.rate = playbackRate;
    return Boolean(selectedVoice);
  }

  function speakWhenNaturalVoiceReady(utterance, attempt = 0) {
    if (!synth || currentUtterance !== utterance) return;
    if (configureNaturalVoice(utterance)) {
      synth.speak(utterance);
      return;
    }
    if (attempt >= 50) {
      currentUtterance = null;
      playing = false;
      paused = false;
      updateControls();
      if (statusElement) statusElement.textContent = "Natural voice unavailable";
      return;
    }
    if (statusElement) statusElement.textContent = "Loading natural voice…";
    window.setTimeout(() => speakWhenNaturalVoiceReady(utterance, attempt + 1), 100);
  }

  function setStatus() {
    if (!statusElement) return;
    const state = paused ? " · paused" : playing ? " · playing" : "";
    statusElement.textContent = "Topic " + (index + 1) + " of " + cards.length + state;
  }

  function updateControls() {
    playButton.textContent = paused || !playing ? "▶" : "⏸";
    playButton.setAttribute("aria-label", paused || !playing ? "Play reading" : "Pause reading");
    playButton.setAttribute("aria-pressed", playing ? "true" : "false");
    setStatus();
  }

  function applyCardVisualState(card, active) {
    card.style.setProperty("border-color", active ? "#ffd166" : "#67e8f9", "important");
    card.style.setProperty("outline", "none", "important");
    card.style.setProperty("box-shadow", "none", "important");
  }

  function clearCardVisualState(card) {
    card.style.removeProperty("border-color");
    card.style.removeProperty("outline");
    card.style.removeProperty("box-shadow");
  }

  function mark(options = {}) {
    activeCardIndex = index;
    if (founderTakeaways) {
      founderTakeaways.classList.remove("active");
      founderTakeaways.removeAttribute("aria-current");
      clearCardVisualState(founderTakeaways);
    }
    cards.forEach((card, cardIndex) => {
      const active = cardIndex === index;
      card.classList.toggle("active", active);
      card.setAttribute("aria-current", active ? "true" : "false");
      applyCardVisualState(card, active);
    });
    const card = cards[index];
    if (card && options.scroll === true) {
      card.scrollIntoView({ behavior: options.behavior || "smooth", block: "start" });
    }
    setStatus();
    publishViewportState();
  }

  function flash(button) {
    button.classList.add("hermes-command-active");
    window.setTimeout(() => button.classList.remove("hermes-command-active"), 220);
  }

  function clearTakeawayQueue() {
    window.clearTimeout(takeawayQueueTimer);
    takeawayQueueToken += 1;
    takeawayQueue = [];
    takeawayQueueIndex = 0;
    speakingTakeaways = false;
  }

  function finishTakeawayQueue(queueToken) {
    if (queueToken !== takeawayQueueToken) return;
    currentUtterance = null;
    takeawayQueue = [];
    takeawayQueueIndex = 0;
    speakingTakeaways = false;
    playing = false;
    paused = false;
    updateControls();
  }

  function speakTakeawayQueue(segments, segmentIndex, queueToken) {
    if (!synth || queueToken !== takeawayQueueToken || paused) return;
    if (segmentIndex >= segments.length) {
      finishTakeawayQueue(queueToken);
      return;
    }
    takeawayQueueIndex = segmentIndex;
    const segment = segments[segmentIndex];
    const utterance = new SpeechSynthesisUtterance(segment.text);
    utterance.volume = Math.max(0, Math.min(1, Number(volumeInput.value) || 0));
    utterance.onend = () => {
      if (currentUtterance !== utterance || queueToken !== takeawayQueueToken) return;
      currentUtterance = null;
      takeawayQueueIndex = segmentIndex + 1;
      takeawayQueueTimer = window.setTimeout(
        () => speakTakeawayQueue(segments, segmentIndex + 1, queueToken),
        segment.pauseAfter,
      );
    };
    utterance.onerror = () => finishTakeawayQueue(queueToken);
    currentUtterance = utterance;
    speakWhenNaturalVoiceReady(utterance);
  }

  function stopSpeech(options = {}) {
    window.clearTimeout(playbackRestartTimer);
    clearTakeawayQueue();
    synth?.cancel();
    currentUtterance = null;
    playing = false;
    paused = false;
    if (options.clearHighlight) {
      if (founderTakeaways) {
        founderTakeaways.classList.remove("active");
        founderTakeaways.removeAttribute("aria-current");
        clearCardVisualState(founderTakeaways);
      }
      cards.forEach((card) => {
        card.classList.remove("active");
        card.removeAttribute("aria-current");
        clearCardVisualState(card);
      });
    }
    updateControls();
  }

  function speakCurrent(options = {}) {
    if (!synth || !cards.length) return;
    window.clearTimeout(playbackRestartTimer);
    clearTakeawayQueue();
    synth.cancel();
    index = normalizedIndex(index);
    navigationStarted = true;
    const utterance = new SpeechSynthesisUtterance(textFor(cards[index]));
    utterance.volume = Math.max(0, Math.min(1, Number(volumeInput.value) || 0));
    utterance.onend = () => {
      if (currentUtterance !== utterance) return;
      currentUtterance = null;
      playing = false;
      paused = false;
      updateControls();
    };
    utterance.onerror = () => {
      if (currentUtterance !== utterance) return;
      currentUtterance = null;
      playing = false;
      paused = false;
      updateControls();
    };
    currentUtterance = utterance;
    playing = true;
    paused = false;
    mark({ scroll: options.scroll === true });
    updateControls();
    speakWhenNaturalVoiceReady(utterance);
  }

  function selectAndPlay(selectedIndex, options = {}) {
    index = normalizedIndex(selectedIndex);
    const selectedCard = cards[index];
    if (options.focus === true) selectedCard?.focus({ preventScroll: true });
    speakCurrent({ scroll: options.scroll === true });
  }

  function selectFounderTakeaways(options = {}) {
    if (!founderTakeaways) return false;
    activeCardIndex = -1;
    navigationStarted = false;
    cards.forEach((card) => {
      card.classList.remove("active");
      card.removeAttribute("aria-current");
      applyCardVisualState(card, false);
    });
    founderTakeaways.classList.add("hermes-playable-card", "active");
    founderTakeaways.setAttribute("aria-current", "true");
    applyCardVisualState(founderTakeaways, true);
    if (options.scroll === true) founderTakeaways.scrollIntoView({ behavior: options.behavior || "smooth", block: "start" });
    if (statusElement) statusElement.textContent = "Founder takeaways";
    publishViewportState();
    return true;
  }

  function playFounderTakeaways(options = {}) {
    if (!founderTakeaways || !synth) {
      selectAndPlay(0, options);
      return;
    }
    window.clearTimeout(playbackRestartTimer);
    clearTakeawayQueue();
    synth.cancel();
    selectFounderTakeaways(options);

    takeawayQueue = takeawaySpeechSegments(founderTakeaways);
    takeawayQueueIndex = 0;
    takeawayQueueToken += 1;
    const queueToken = takeawayQueueToken;
    speakingTakeaways = true;
    playing = true;
    paused = false;
    playButton.textContent = "⏸";
    playButton.setAttribute("aria-label", "Pause reading");
    playButton.setAttribute("aria-pressed", "true");
    if (statusElement) statusElement.textContent = "Founder takeaways · playing";
    speakTakeawayQueue(takeawayQueue, 0, queueToken);
  }

  function togglePlayback() {
    if (!synth) return;
    if (playing) {
      if (currentUtterance) synth.pause();
      else window.clearTimeout(takeawayQueueTimer);
      playing = false;
      paused = true;
      updateControls();
      return;
    }
    if (paused) {
      playing = true;
      paused = false;
      if (currentUtterance) synth.resume();
      else if (speakingTakeaways) speakTakeawayQueue(takeawayQueue, takeawayQueueIndex, takeawayQueueToken);
      updateControls();
      return;
    }
    if (activeCardIndex === -1) playFounderTakeaways();
    else speakCurrent();
  }

  const VOLUME_STORAGE_KEY = "hermes-briefs-ai-volume-v1";

  function normalizeVolume(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : 0.45;
  }

  function readStoredVolume() {
    try {
      const stored = window.localStorage.getItem(VOLUME_STORAGE_KEY);
      return stored === null ? 0.45 : normalizeVolume(stored);
    } catch (_reason) {
      // Sandboxed dashboard iframes have opaque origins; the parent restores their value.
      return 0.45;
    }
  }

  function applyVolume(value, options = {}) {
    const normalized = normalizeVolume(value);
    volumeInput.value = String(normalized);
    volumeInput.setAttribute("aria-valuetext", Math.round(normalized * 100) + "%");
    volumeInput.setAttribute("title", "Volume " + Math.round(normalized * 100) + "%");
    if (currentUtterance) currentUtterance.volume = normalized;
    if (options.persist !== false) {
      try { window.localStorage.setItem(VOLUME_STORAGE_KEY, String(normalized)); } catch (_reason) {}
    }
    if (options.publish !== false && window.parent) {
      window.parent.postMessage({ type: "hermes-ai-volume-change", volume: normalized }, "*");
    }
  }

  function setVolume(value) {
    // A volume adjustment must never cancel, requeue, scroll, or restart narration.
    applyVolume(value);
  }

  function playbackRateLabel(rate) {
    return String(rate) + "x";
  }

  function setPlaybackRate(rate) {
    const nextRate = playbackRates.includes(Number(rate)) ? Number(rate) : 1.25;
    playbackRate = nextRate;
    speedButton.textContent = playbackRateLabel(playbackRate);
    speedButton.setAttribute("aria-label", "Playback speed " + playbackRateLabel(playbackRate));
    speedButton.setAttribute("title", "Playback speed");
    if (!playing) return;
    window.clearTimeout(playbackRestartTimer);
    const restartTakeaways = speakingTakeaways;
    playbackRestartTimer = window.setTimeout(() => restartTakeaways ? playFounderTakeaways() : speakCurrent(), 120);
  }

  function cyclePlaybackRate(direction = 1) {
    const currentIndex = playbackRates.indexOf(playbackRate);
    const nextIndex = (currentIndex + direction + playbackRates.length) % playbackRates.length;
    setPlaybackRate(playbackRates[nextIndex]);
  }

  function runCommand(command) {
    if (command === "toggle") {
      togglePlayback();
      flash(playButton);
    } else if (command === "previous") {
      if (!navigationStarted) selectAndPlay(0, { scroll: true });
      else selectAndPlay(index - 1, { scroll: true });
      flash(previousButton);
    } else if (command === "next") {
      if (!navigationStarted) selectAndPlay(0, { scroll: true });
      else selectAndPlay(index + 1, { scroll: true });
      flash(nextButton);
    } else if (command === "first") {
      playFounderTakeaways({ scroll: true });
      flash(previousButton);
    }
  }

  function commandForEvent(event) {
    if (event.code === "Space" || event.key === " " || event.key === "Spacebar") return "toggle";
    if (event.key === "ArrowLeft") return "previous";
    if (event.key === "ArrowRight") return "next";
    if (event.key === "ArrowUp") return "first";
    return null;
  }

  function interactiveTarget(target) {
    return target instanceof Element && Boolean(
      target.closest('input, textarea, select, button, a, [contenteditable="true"]')
    );
  }

  function textEditingTarget(target) {
    return target instanceof Element && Boolean(
      target.closest('input:not([type="range"]), textarea, select, [contenteditable="true"]')
    );
  }

  function isVolumeControl(target) {
    return target instanceof HTMLInputElement && target.id === "tts-volume" && target.type === "range";
  }

  function pinPlayer() {
    root.classList.add(PLAYER_CLASS);
    placeholder = root.previousElementSibling;
    if (!placeholder || !placeholder.classList.contains(PLACEHOLDER_CLASS)) {
      placeholder = document.createElement("div");
      placeholder.className = PLACEHOLDER_CLASS;
      root.parentElement?.insertBefore(placeholder, root);
    }
    const syncHeight = () => {
      const height = Math.ceil(root.getBoundingClientRect().height);
      placeholder.style.height = height + "px";
      document.documentElement.style.setProperty("--hermes-player-height", height + 20 + "px");
    };
    syncHeight();
    if ("ResizeObserver" in window) new ResizeObserver(syncHeight).observe(root);
  }

  function init() {
    normalizeAiVisualStructure();
    normalizeTakeawayDetails();
    if (!controls()) return;
    window.__hermesAiCaptureActiveCard = captureViewportPosition;
    ensureDateNavigator();
    synth.cancel();
    synth.getVoices();
    volumeInput.min = "0";
    volumeInput.max = "1";
    volumeInput.step = "0.05";
    volumeInput.setAttribute("aria-label", "Volume");
    applyVolume(readStoredVolume(), { persist: false, publish: false });
    setPlaybackRate(1.25);


    cards.forEach((card, cardIndex) => {
      card.classList.add("hermes-playable-card");
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", "Play topic " + (cardIndex + 1));
      card.addEventListener("click", (event) => {
        if (interactiveTarget(event.target)) return;
        event.stopPropagation();
        const selectedCard = event.currentTarget;
        const selectedIndex = cards.indexOf(selectedCard);
        if (selectedIndex < 0) return;
        selectedCard.focus({ preventScroll: true });
        selectAndPlay(selectedIndex, { focus: true, scroll: true });
      });
    });

    previousButton.onclick = (event) => { event.preventDefault(); runCommand("previous"); };
    playButton.onclick = (event) => { event.preventDefault(); runCommand("toggle"); };
    nextButton.onclick = (event) => { event.preventDefault(); runCommand("next"); };
    volumeInput.oninput = () => setVolume(volumeInput.value);
    speedButton.onclick = (event) => { event.preventDefault(); cyclePlaybackRate(); };
    // The slider is pointer-only: preserve player keys and suppress every native range key.
    volumeInput.tabIndex = -1;
    volumeInput.addEventListener("keydown", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    });

    fullscreenButton?.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", () => updateFullscreenButton(Boolean(document.fullscreenElement)));
    updateFullscreenButton();

    document.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopImmediatePropagation();
        void toggleFullscreen();
        return;
      }
      const dateDirection = event.key === "[" ? "newer" : event.key === "]" ? "older" : null;
      if (dateDirection) {
        if (textEditingTarget(event.target) && !isVolumeControl(event.target)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        window.parent?.postMessage({ type: DATE_NAV_MESSAGE_TYPE, direction: dateDirection, position: captureViewportPosition() }, "*");
        return;
      }
      const speedDirection = event.code === "KeyS" || event.key.toLowerCase() === "s"
        ? (event.shiftKey ? -1 : 1)
        : 0;
      if (speedDirection) {
        if (textEditingTarget(event.target) && !isVolumeControl(event.target)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        focusPlayerRoot();
        cyclePlaybackRate(speedDirection);
        flash(speedButton);
        return;
      }
      const command = commandForEvent(event);
      if (!command) return;
      if (textEditingTarget(event.target) && !isVolumeControl(event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      focusPlayerRoot();
      runCommand(command);
    }, true);

    window.addEventListener("message", (event) => {
      if (event.source !== window.parent) return;
      if (event.data?.type === "hermes-ai-fullscreen-state") {
        updateFullscreenButton(Boolean(event.data.active));
        return;
      }
      if (event.data?.type === "hermes-ai-stop-audio") {
        stopSpeech({ clearHighlight: true });
        return;
      }
      if (event.data?.type === "hermes-ai-viewport-restore") {
        restoreViewportPosition(event.data.position);
        return;
      }
      if (event.data?.type === "hermes-ai-volume-restore") {
        applyVolume(event.data.volume, { publish: false });
        return;
      }
      if (event.data?.type !== MESSAGE_TYPE) return;
      focusPlayerRoot();
      runCommand(event.data.command);
    });
    window.addEventListener("beforeunload", () => stopSpeech({ clearHighlight: true }));

    pinPlayer();
    index = 0;
    if (!selectFounderTakeaways()) mark({ behavior: "auto", scroll: false });
    updateControls();
    window.parent?.postMessage({ type: "hermes-brief-player-ready" }, "*");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
</script>`;

const STOCK_INTERACTION_CONTROLLER = `<script id="hermes-stock-interaction-controller">
(() => {
  const fullscreenButton = document.getElementById("hermes-stock-fullscreen-button");
  let fullscreenActive = Boolean(document.fullscreenElement);
  function updateFullscreenButton(active = fullscreenActive) {
    if (!fullscreenButton) return;
    fullscreenActive = active;
    fullscreenButton.setAttribute("aria-label", active ? "Exit Stock Brief fullscreen" : "Enter Stock Brief fullscreen");
    fullscreenButton.setAttribute("title", active ? "Exit fullscreen" : "Enter fullscreen");
  }
  async function toggleFullscreen() {
    if (window.parent !== window) {
      window.parent.postMessage({ type: "hermes-stock-fullscreen-toggle" }, "*");
      return;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_reason) {
      // Browser fullscreen denial leaves the current layout unchanged.
    }
    updateFullscreenButton(Boolean(document.fullscreenElement));
  }
  fullscreenButton?.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", () => updateFullscreenButton(Boolean(document.fullscreenElement)));
  function captureViewportPosition() {
    return {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };
  }
  function publishViewportState() {
    if (window.parent === window) return;
    window.parent.postMessage({ type: "hermes-stock-viewport-state", position: captureViewportPosition() }, "*");
  }
  function restoreViewport(position) {
    if (!position || typeof position !== "object") return;
    const targetX = Number.isFinite(position.scrollX) ? Math.max(0, position.scrollX) : 0;
    const targetY = Number.isFinite(position.scrollY) ? Math.max(0, position.scrollY) : 0;
    let framesRemaining = 8;
    const applyPosition = () => {
      window.scrollTo(targetX, targetY);
      framesRemaining -= 1;
      if (framesRemaining > 0) {
        requestAnimationFrame(applyPosition);
        return;
      }
      publishViewportState();
    };
    requestAnimationFrame(() => requestAnimationFrame(applyPosition));
  }
  let viewportFrame = 0;
  window.addEventListener("scroll", () => {
    if (viewportFrame) return;
    viewportFrame = requestAnimationFrame(() => {
      viewportFrame = 0;
      publishViewportState();
    });
  }, { passive: true });
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    if (event.data?.type === "hermes-stock-fullscreen-state") {
      updateFullscreenButton(Boolean(event.data.active));
      return;
    }
    if (event.data?.type !== "hermes-stock-viewport-restore") return;
    restoreViewport(event.data.position);
  });
  updateFullscreenButton();
  publishViewportState();

  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopImmediatePropagation();
      void toggleFullscreen();
      return;
    }
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target instanceof Element && event.target.closest('[contenteditable="true"]'))
    ) return;
    const direction = event.key === "ArrowLeft" || event.key === "[" ? "newer" : event.key === "ArrowRight" || event.key === "]" ? "older" : null;
    if (!direction) return;
    event.preventDefault();
    window.parent.postMessage({ type: "${BRIEF_DATE_NAV_MESSAGE_TYPE}", direction, position: captureViewportPosition() }, "*");
  }, true);
})();
</script>`;

const STOCK_SECTION_NAVIGATION_CONTROLLER = `<script id="hermes-stock-section-navigation-controller">
(() => {
  function editableTarget(target) {
    return target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof Element && Boolean(target.closest('[contenteditable="true"]')));
  }
  function navigateToSection(key) {
    if (key === "ArrowUp") {
      const documentTop = document.getElementById("hermes-stock-canonical");
      if (!documentTop) return false;
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      return true;
    }
    const target = key === "ArrowDown"
      ? document.getElementById("hermes-stock-canonical-quotes")
      : null;
    if (!target) return false;
    target.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
    return true;
  }
  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || editableTarget(event.target)) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    if (!navigateToSection(event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
</script>`;

function injectBeforeClosingTag(html: string, tag: "head" | "body", addition: string): string {
  const closingTag = new RegExp(`</${tag}\\s*>`, "i");
  if (closingTag.test(html)) return html.replace(closingTag, `${addition}</${tag}>`);
  return `${html}${addition}`;
}

function sanitizeArchivedHtmlWithRegex(html: string): string {
  return html
    .replace(SCRIPT_ELEMENT, "")
    .replace(EVENT_HANDLER_ATTRIBUTE, "")
    .replace(URL_ATTRIBUTE, (attribute) => {
      const separator = attribute.indexOf("=");
      const rawValue = attribute.slice(separator + 1).trim();
      const unquotedValue =
        (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'"))
          ? rawValue.slice(1, -1)
          : rawValue;
      const normalizedValue = unquotedValue.replace(/[\u0000-\u0020\u007f]/g, "").toLowerCase();
      return normalizedValue.startsWith("javascript:") ? "" : attribute;
    })
    .replace(SRCDOC_ATTRIBUTE, "")
    .replace(META_ELEMENT, (meta) => {
      const unsafeHttpEquiv = /http-equiv\s*=\s*(?:["']?)(?:refresh|content-security-policy)(?:["']?)/i;
      return unsafeHttpEquiv.test(meta) ? "" : meta;
    });
}

function sanitizeArchivedHtml(html: string): string {
  if (typeof DOMParser === "undefined") return sanitizeArchivedHtmlWithRegex(html);

  const documentNode = new DOMParser().parseFromString(html, "text/html");
  documentNode.querySelectorAll("script").forEach((element) => element.remove());
  documentNode.querySelectorAll("meta[http-equiv]").forEach((element) => {
    const directive = element.getAttribute("http-equiv")?.trim().toLowerCase();
    if (directive === "refresh" || directive === "content-security-policy") element.remove();
  });
  documentNode.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.replace(/[\u0000-\u0020\u007f]/g, "").toLowerCase();
      if (
        name.startsWith("on") ||
        name === "srcdoc" ||
        (["href", "src", "action", "formaction", "xlink:href"].includes(name) && value.startsWith("javascript:"))
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  const doctype = /^\s*<!doctype[^>]*>/i.test(html) ? "<!doctype html>" : "";
  return `${doctype}${documentNode.documentElement.outerHTML}`;
}

function openExternalLinksInNewWindow(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (tag, attributes: string) => {
    const href = attributes.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
    const value = href?.[1] ?? href?.[2] ?? href?.[3] ?? "";
    if (!/^https?:\/\//i.test(value)) return tag;
    const cleaned = attributes
      .replace(/\s+target\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)/gi, "")
      .replace(/\s+rel\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)/gi, "");
    return `<a${cleaned} target="_blank" rel="noopener noreferrer">`;
  });
}

function extractStockPrices(html: string): Map<PortfolioLot["ticker"], number> {
  const normalizeText = (fragment: string) =>
    fragment
      .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&mdash;|&#8212;|&#x2014;/gi, "—")
      .replace(/&ndash;|&#8211;|&#x2013;/gi, "–")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  const candidates: string[] = [];
  // Explicit quote cards outrank summary/portfolio rows. Producer tables often
  // place purchase price before current price and must never poison quote data.
  const cardElement = /<article\b([^>]*)>([\s\S]*?)<\/article\s*>/gi;
  for (const match of html.matchAll(cardElement)) {
    candidates.push(normalizeText(match[2]));
  }
  const cardSection = /<section\b([^>]*)>([\s\S]*?)<\/section\s*>/gi;
  for (const match of html.matchAll(cardSection)) {
    if (/\bcard\b/i.test(match[1]) && !/<article\b/i.test(match[2])) {
      candidates.push(normalizeText(match[2]));
    }
  }
  const boundedElement = /<(h[1-6]|tr)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;
  for (const match of html.matchAll(boundedElement)) candidates.push(normalizeText(match[2]));

  if (!candidates.length) {
    candidates.push(...html.split(/\r?\n/).map(normalizeText).filter(Boolean));
  }

  const prices = new Map<PortfolioLot["ticker"], number>();
  const tickerPattern = "AAPL|AMZN|NVDA|SNAP|GOOGL|MSFT|DIS";
  const unsafePriceContext = /\b(?:unavailable|not\s+available|missing)\b|(?:^|\s)n\/?a(?:\s|$)|market\s*cap|market\s+value|valuation|revenue|volume/i;

  for (const candidate of candidates) {
    const start = candidate.match(new RegExp(`^\\s*(${tickerPattern})\\b`, "i"));
    const parenthesized = candidate.match(new RegExp(`\\(\\s*(${tickerPattern})\\s*\\)`, "i"));
    const anywhere = candidate.match(new RegExp(`\\b(${tickerPattern})\\b`, "i"));
    const tickerMatch = start ?? parenthesized ?? anywhere;
    if (!tickerMatch || tickerMatch.index === undefined) continue;

    const ticker = tickerMatch[1].toUpperCase() as PortfolioLot["ticker"];
    const afterTicker = candidate.slice(tickerMatch.index + tickerMatch[0].length, tickerMatch.index + tickerMatch[0].length + 160);
    const priceMatch = afterTicker.match(/\$\s*([0-9][0-9,]*(?:\.\d+)?)/);
    if (!priceMatch || priceMatch.index === undefined) continue;
    const context = afterTicker.slice(0, priceMatch.index);
    if (unsafePriceContext.test(context)) continue;

    const price = Number(priceMatch[1].replace(/,/g, ""));
    if (Number.isFinite(price) && price >= 0 && !prices.has(ticker)) prices.set(ticker, price);
  }
  return prices;
}

function extractStockDailyChanges(html: string): Map<PortfolioLot["ticker"], number> {
  const changes = new Map<PortfolioLot["ticker"], number>();
  const tickerPattern = "AAPL|AMZN|NVDA|SNAP|GOOGL|MSFT|DIS";
  const cards: Array<{ attributes: string; body: string }> = [];
  for (const match of html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article\s*>/gi)) {
    cards.push({ attributes: match[1], body: match[2] });
  }
  for (const match of html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section\s*>/gi)) {
    cards.push({ attributes: match[1], body: match[2] });
  }
  for (const { attributes, body } of cards) {
    if (!/\b(?:stock-row|stock-card|card|hermes-stock-row)\b/i.test(attributes)) continue;
    const attributeTicker = attributes.match(new RegExp(`\\bdata-ticker\\s*=\\s*["'](${tickerPattern})["']`, "i"));
    const bodyTicker = body.match(new RegExp(`\\b(${tickerPattern})\\b`, "i"));
    const ticker = (attributeTicker?.[1] ?? bodyTicker?.[1])?.toUpperCase() as PortfolioLot["ticker"] | undefined;
    if (!ticker || changes.has(ticker)) continue;
    const movement = body.match(/<(?:div|span|p)\b[^>]*class\s*=\s*(?:"[^"]*\b(?:change|movement|hermes-stock-change|positive|negative)\b[^"]*"|'[^']*\b(?:change|movement|hermes-stock-change|positive|negative)\b[^']*')[^>]*>([\s\S]*?)<\/(?:div|span|p)\s*>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/&(?:#43|plus);/gi, "+")
      .replace(/&(?:#45|minus);/gi, "-")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const value = movement?.match(/([+-])\s*\$?\s*([0-9][0-9,]*(?:\.\d+)?)/);
    if (!value) continue;
    const amount = Number(value[2].replace(/,/g, "")) * (value[1] === "-" ? -1 : 1);
    if (Number.isFinite(amount)) changes.set(ticker, amount);
  }
  return changes;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function signedCurrency(value: number): string {
  return `${value >= 0 ? "+" : "-"}${usd.format(Math.abs(value))}`;
}

function signedPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function stockPortfolioCsv(html: string, briefDate: string): string {
  const prices = extractStockPrices(html);
  const headers = [
    "Brief Date",
    "Position",
    "Ticker",
    "Purchase Date",
    "Shares",
    "Purchased Price",
    "Current Price",
    "Price Difference",
    "Cost Basis",
    "Current Value",
    "Gain Loss",
    "Position Return Percent",
    "Agent",
  ];
  const rows = PORTFOLIO_LOTS.map((lot) => {
    const currentPrice = prices.get(lot.ticker);
    const basis = lot.shares * lot.purchasePrice;
    if (currentPrice === undefined) {
      return {
        gain: Number.NEGATIVE_INFINITY,
        cells: [
          briefDate,
          lot.label,
          lot.ticker,
          lot.purchased,
          lot.shares,
          lot.purchasePrice.toFixed(2),
          "",
          "",
          basis.toFixed(2),
          "",
          "",
          "",
          "HERMES",
        ],
      };
    }

    const priceDifference = currentPrice - lot.purchasePrice;
    const currentValue = lot.shares * currentPrice;
    const gain = currentValue - basis;
    const returnPercent = (gain / basis) * 100;
    return {
      gain,
      cells: [
        briefDate,
        lot.label,
        lot.ticker,
        lot.purchased,
        lot.shares,
        lot.purchasePrice.toFixed(2),
        currentPrice.toFixed(2),
        priceDifference.toFixed(2),
        basis.toFixed(2),
        currentValue.toFixed(2),
        gain.toFixed(2),
        returnPercent.toFixed(2),
        "HERMES",
      ],
    };
  })
    .sort((left, right) => right.gain - left.gain)
    .map((row) => row.cells);

  return [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n") + "\r\n";
}

export function stockPortfolioCsvName(date: string): string {
  return `Stock Portfolio - ${date}.csv`;
}

export interface StockPortfolioCsvExport {
  date: string;
  content: string;
}

export function matchingStockPortfolioCsv(
  exportData: StockPortfolioCsvExport | null,
  selectedDate: string | undefined,
): StockPortfolioCsvExport | null {
  return exportData && exportData.date === selectedDate ? exportData : null;
}

function stockPortfolioTotalsFromPrices(prices: Map<PortfolioLot["ticker"], number>) {
  let basis = 0;
  let value = 0;
  for (const lot of PORTFOLIO_LOTS) {
    const currentPrice = prices.get(lot.ticker);
    if (currentPrice === undefined) continue;
    basis += lot.shares * lot.purchasePrice;
    value += lot.shares * currentPrice;
  }
  const gain = value - basis;
  return { basis, value, gain, returnPercent: basis ? (gain / basis) * 100 : 0 };
}

function stockPortfolioSummary(html: string): string {
  const renderedTotal = html.match(/<tfoot\b[^>]*>[\s\S]*?<td\b[^>]*class=["'](hermes-portfolio-(?:positive|negative))["'][^>]*>\s*([+-]\$[0-9,]+(?:\.\d{2})?)\s*<\/td\s*>\s*<td\b[^>]*class=["']hermes-portfolio-(?:positive|negative)["'][^>]*>\s*[+-]?[0-9,.]+%/i);
  if (renderedTotal) {
    const [, resultClass, gainText] = renderedTotal;
    return `<div id="hermes-stock-portfolio-summary" class="hermes-stock-portfolio-summary" role="status" aria-label="Available-position total gain or loss: ${gainText}"><span class="hermes-stock-summary-label">SUMMARY</span><strong class="hermes-stock-summary-value ${resultClass}">${gainText}</strong></div>`;
  }
  const prices = extractStockPrices(html);
  if (!prices.size) return "";
  const { gain } = stockPortfolioTotalsFromPrices(prices);
  const resultClass = gain >= 0 ? "hermes-portfolio-positive" : "hermes-portfolio-negative";
  return `<div id="hermes-stock-portfolio-summary" class="hermes-stock-portfolio-summary" role="status" aria-label="Available-position total gain or loss: ${signedCurrency(gain)}"><span class="hermes-stock-summary-label">SUMMARY</span><strong class="hermes-stock-summary-value ${resultClass}">${signedCurrency(gain)}</strong></div>`;
}

function stockPortfolioComparison(html: string): string {
  const prices = extractStockPrices(html);
  const dailyChanges = extractStockDailyChanges(html);
  if (!prices.size) return "";

  const rows = PORTFOLIO_LOTS.map((lot) => {
    const currentPrice = prices.get(lot.ticker);
    const basis = lot.shares * lot.purchasePrice;
    if (currentPrice === undefined) {
      return { gain: Number.NEGATIVE_INFINITY, basis, value: 0, html: `<tr><td><span class="hermes-portfolio-position">${lot.label} · ${lot.ticker}</span><span class="hermes-portfolio-meta">${lot.purchased}</span></td><td class="hermes-portfolio-shares">${lot.shares.toLocaleString("en-US")}</td><td class="hermes-portfolio-purchase">${usd.format(lot.purchasePrice)}</td><td class="hermes-portfolio-unavailable" colspan="7">Current ${lot.ticker} price unavailable</td></tr>` };
    }

    const priceDifference = currentPrice - lot.purchasePrice;
    const currentValue = lot.shares * currentPrice;
    const gain = currentValue - basis;
    const returnPercent = (gain / basis) * 100;
    const resultClass = priceDifference >= 0 ? "hermes-portfolio-positive" : "hermes-portfolio-negative";
    const dailyChange = dailyChanges.get(lot.ticker);
    const dayClass = dailyChange === undefined ? "hermes-portfolio-unavailable" : dailyChange >= 0 ? "hermes-portfolio-positive" : "hermes-portfolio-negative";
    const dayText = dailyChange === undefined ? "—" : signedCurrency(dailyChange);
    return { gain, basis, value: currentValue, html: `<tr><td><span class="hermes-portfolio-position">${lot.label} · ${lot.ticker}</span><span class="hermes-portfolio-meta">${lot.purchased}</span></td><td class="hermes-portfolio-shares">${lot.shares.toLocaleString("en-US")}</td><td class="hermes-portfolio-purchase">${usd.format(lot.purchasePrice)}</td><td>${usd.format(currentPrice)}</td><td class="${resultClass}">${signedCurrency(priceDifference)}</td><td class="hermes-portfolio-day ${dayClass}">${dayText}</td><td>${usd.format(basis)}</td><td>${usd.format(currentValue)}</td><td class="${resultClass}">${signedCurrency(gain)}</td><td class="${resultClass}">${signedPercent(returnPercent)}</td></tr>` };
  })
    .sort((left, right) => right.gain - left.gain)
    .map((row) => row.html)
    .join("");

  const { basis: totalBasis, value: totalValue, gain: totalGain, returnPercent: totalReturn } = stockPortfolioTotalsFromPrices(prices);
  const totalClass = totalGain >= 0 ? "hermes-portfolio-positive" : "hermes-portfolio-negative";

  return `<section id="hermes-portfolio-comparison" class="hermes-portfolio-comparison" aria-labelledby="hermes-portfolio-title">
    <h2 id="hermes-portfolio-title">Portfolio Position Comparison</h2>
    <p class="hermes-portfolio-note">Daily prices compared with your purchase lots. Precise basis uses shares × purchased price.</p>
    <div class="hermes-portfolio-table-wrap">
      <table class="hermes-portfolio-table" aria-label="Portfolio positions compared with current stock brief prices">
        <thead><tr><th>Position</th><th class="hermes-portfolio-shares">Shares</th><th class="hermes-portfolio-purchase">Purchased price</th><th>CURRENT PRICE</th><th>TOTAL +/-</th><th>DAY +/-</th><th>COST BASIS</th><th>CURRENT VALUE</th><th>GAIN / LOSS</th><th>RETURN</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="6">Available-position total</td><td>${usd.format(totalBasis)}</td><td>${usd.format(totalValue)}</td><td class="${totalClass}">${signedCurrency(totalGain)}</td><td class="${totalClass}">${signedPercent(totalReturn)}</td></tr></tfoot>
      </table>
    </div>
  </section>`;
}

function normalizeStockQuoteRows(html: string, _selectedDate?: string): string {
  const text = (fragment: string) => fragment.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const metricLabel = (value: string) => value.replace(/^52w\s+/i, "52-week ");
  const canonicalDailyChange = (value: string) => {
    const slashChange = value.match(/^([+-])\s*\$?([0-9][0-9,.]*)\s*\/\s*([+-]?\s*[0-9]+(?:\.\d+)?%)$/);
    if (!slashChange) return value;
    const direction = slashChange[1] === "-" ? "▼" : "▲";
    return `${direction} ${slashChange[1]}$${slashChange[2]} (${slashChange[3].replace(/\s+/g, "")})`;
  };
  const cardPattern = /<(section|article)\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\b(?:card|stock-row|hermes-stock-row)\b[^"]*"|'[^']*\b(?:card|stock-row|hermes-stock-row)\b[^']*'))([^>]*)>([\s\S]*?)<\/\1\s*>/gi;

  const normalizedHtml = html.replace(cardPattern, (source, _tag: string, attributes: string, body: string) => {
    if (!/\bclass\s*=\s*(?:"[^"]*\b(?:card|stock-row|hermes-stock-row)\b[^"]*"|'[^']*\b(?:card|stock-row|hermes-stock-row)\b[^']*')/i.test(attributes)) return source;
    const tickerMatch = text(body.match(/<(?:a|div|span|h[1-6])\b[^>]*class\s*=\s*(?:"[^"]*\bticker\b[^"]*"|'[^']*\bticker\b[^']*')[^>]*>([\s\S]*?)<\/(?:a|div|span|h[1-6])\s*>/i)?.[1] ?? body.match(/<h[1-6]\b[^>]*>\s*(AAPL|AMZN|NVDA|SNAP|GOOGL|MSFT|DIS)\b/i)?.[1] ?? "").match(/(AAPL|AMZN|NVDA|SNAP|GOOGL|MSFT|DIS)/i);
    const ticker = tickerMatch?.[1]?.toUpperCase();
    const price = text(body.match(/<(?:div|span|strong)\b[^>]*class\s*=\s*(?:"[^"]*\bprice\b[^"]*"|'[^']*\bprice\b[^']*')[^>]*>([\s\S]*?)<\/(?:div|span|strong)\s*>/i)?.[1] ?? body.match(/<strong\b[^>]*>\s*(\$\s*[0-9][0-9,]*(?:\.\d+)?)\s*<\/strong\s*>/i)?.[1] ?? "");
    if (!ticker || !/^\$\s*[0-9]/.test(price)) return source;

    const heading = text(body.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]\s*>/i)?.[1] ?? "");
    const company = text(body.match(/<(?:div|span|p)\b[^>]*class\s*=\s*(?:"[^"]*\b(?:company|name)\b[^"]*"|'[^']*\b(?:company|name)\b[^']*')[^>]*>([\s\S]*?)<\/(?:div|span|p)\s*>/i)?.[1] ?? heading.replace(new RegExp(`^${ticker}\\s*(?:—|-)\\s*`, "i"), ""))
      .replace(price, "")
      .replace(/\bCompany\b\.?/gi, "CO.")
      .replace(/\bCorporation\b\.?/gi, "CORP.")
      .replace(/\bIncorporated\b\.?/gi, "INC.")
      .trim()
      .toUpperCase();
    const rawDailyChange = text(body.match(/<(?:div|span|p)\b[^>]*class\s*=\s*(?:"[^"]*\b(?:change|movement)\b[^"]*"|'[^']*\b(?:change|movement)\b[^']*')[^>]*>([\s\S]*?)<\/(?:div|span|p)\s*>/i)?.[1] ?? "");
    const dailyChange = canonicalDailyChange(rawDailyChange);
    const negative = /(?:\bdown\b|(?:^|\s)-\s*\$|▼)/i.test(dailyChange);
    const changeClass = dailyChange ? (negative ? "hermes-portfolio-negative" : "hermes-portfolio-positive") : "";
    const definitionMetrics = Array.from(body.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt\s*>\s*<dd\b[^>]*>([\s\S]*?)<\/dd\s*>/gi));
    const spanMetrics = Array.from(body.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span\s*>\s*<b\b[^>]*>([\s\S]*?)<\/b\s*>/gi));
    const currentMetricBlocks = Array.from(body.matchAll(/<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bmetric\b[^"]*"|'[^']*\bmetric\b[^']*'))[^>]*>\s*<span\b[^>]*>([\s\S]*?)<\/span\s*>\s*<strong\b[^>]*>([\s\S]*?)<\/strong\s*>\s*<\/div\s*>/gi));
    const strongMetrics = Array.from(body.matchAll(/<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bstat\b[^"]*"|'[^']*\bstat\b[^']*'))[^>]*>([\s\S]*?)<strong\b[^>]*>([\s\S]*?)<\/strong\s*>[\s\S]*?<\/div\s*>/gi));
    const metricEntries = definitionMetrics.length ? definitionMetrics : spanMetrics.length ? spanMetrics : currentMetricBlocks.length ? currentMetricBlocks : strongMetrics;
    const metrics = metricEntries
      .map((entry) => [metricLabel(text(entry[1])), text(entry[2])])
      .filter(([label]) => !/^source$/i.test(label))
      .slice(0, 5)
      .map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`)
      .join("");

    const priceClass = changeClass ? ` ${changeClass}` : "";
    return `<section class="hermes-stock-row" data-ticker="${ticker}"><div class="hermes-stock-identity"><div class="hermes-stock-title"><span class="hermes-stock-ticker">${ticker}</span>${company ? `<span class="hermes-stock-company">${escape(company)}</span>` : ""}</div>${dailyChange ? `<span class="hermes-stock-change ${changeClass}">${escape(dailyChange)}</span>` : ""}</div><div class="hermes-stock-current-price${priceClass}"><span class="hermes-stock-current-label">CURRENT PRICE</span><strong class="hermes-stock-price${priceClass}">${escape(price)}</strong></div><dl class="hermes-stock-metrics">${metrics}</dl></section>`;
  });
  return normalizedHtml;
}

function injectStockPortfolioComparison(html: string, selectedDate?: string): string {
  const comparison = stockPortfolioComparison(html);
  if (!comparison) return html;
  const titleDate = stockArchiveDate(html);
  html = html.replace(
    /<h1>\s*Stock Brief(?:\s*[—-]\s*[^<]+)?\s*<\/h1>/i,
    `<h1>Stock Brief${titleDate ? ` — ${titleDate}` : ""}</h1>`,
  );
  html = normalizeStockQuoteRows(html, selectedDate);
  const closingHeader = /<\/header\s*>/i;
  if (closingHeader.test(html)) return html.replace(closingHeader, (tag) => `${tag}${comparison}`);
  return injectBeforeClosingTag(html, "body", comparison);
}

function normalizeStockArchive(html: string): string {
  const withoutPortfolioComparison = html.replace(
    /<section\b(?=[^>]*(?:\bid\s*=\s*(?:"hermes-portfolio-comparison"|'hermes-portfolio-comparison')|\baria-label\s*=\s*(?:"[^"]*Portfolio(?: Position)? Comparison[^"]*"|'[^']*Portfolio(?: Position)? Comparison[^']*')|\bclass\s*=\s*(?:"[^"]*\bportfolio\b[^"]*"|'[^']*\bportfolio\b[^']*')))[^>]*>[\s\S]*?<\/section\s*>/gi,
    "",
  );
  const withoutTimestampElements = withoutPortfolioComparison.replace(
    /<(p|div|span|time)\b[^>]*>\s*As of\s+\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\s*(?:PDT|PST)?\s*<\/\1\s*>/gi,
    "",
  );
  return withoutTimestampElements;
}

function removeTacticalAgenda(html: string): string {
  return html.replace(
    /<section\b[^>]*\bclass\s*=\s*(?:"[^"]*\bagenda\b[^"]*"|'[^']*\bagenda\b[^']*')[^>]*>[\s\S]*?<\/section\s*>/gi,
    "",
  );
}

function formatArchiveGenerationTime(generatedAt: number | undefined, timezone: string): string {
  if (!Number.isFinite(generatedAt) || !timezone) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    }).formatToParts(new Date((generatedAt as number) * 1000));
    const hour = parts.find((part) => part.type === "hour")?.value ?? "";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "";
    const dayPeriod = (parts.find((part) => part.type === "dayPeriod")?.value ?? "").toLowerCase();
    if (!hour || !minute || !dayPeriod) return "";
    return minute === "00" ? `${hour}${dayPeriod}` : `${hour}:${minute}${dayPeriod}`;
  } catch {
    return "";
  }
}

function normalizeAiHeroMarkup(html: string, generatedAt?: number): string {
  const dateMarkup = html.match(
    /<p\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bdate\b[^"]*"|'[^']*\bdate\b[^']*'))[^>]*>([\s\S]*?)<\/p\s*>/i,
  )?.[1] ?? "";
  const titleDate = html.match(/<h1\b[^>]*>\s*AI Morning Brief\s*(?:—|&mdash;|&#8212;|-)\s*(\d{4}-\d{2}-\d{2})\s*<\/h1\s*>/i)?.[1] ?? "";
  const dateLine = dateMarkup
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&middot;|&#183;/gi, "·")
    .replace(/&amp;/gi, "&")
    .replace(/^\s*Date\/timezone:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim() || titleDate;
  const [pillDate, ...metadataParts] = dateLine.split("·").map((part) => part.trim());
  const archiveMetadata = metadataParts.filter(Boolean).join(" · ");
  const timezone = metadataParts.find((part) => /^[A-Za-z_]+\/[A-Za-z_]+$/.test(part)) ?? "";
  const generationTime = formatArchiveGenerationTime(generatedAt, timezone);
  const metadataLine = [generationTime, archiveMetadata].filter(Boolean).join(" - ");
  const escapeText = (value: string) => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const escapedPillDate = escapeText(pillDate);
  const escapedMetadata = escapeText(metadataLine);

  let normalized = html.replace(
    /<(div|span|p)\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\btag\b[^"]*"|'[^']*\btag\b[^']*'))[^>]*>[\s\S]*?<\/\1\s*>/gi,
    "",
  );
  const pillPattern = /<(span|div)\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bpill\b[^"]*"|'[^']*\bpill\b[^']*'))([^>]*)>[\s\S]*?<\/\1\s*>/i;
  if (pillDate && pillPattern.test(normalized)) {
    normalized = normalized.replace(pillPattern, (_pill, tag: string, attributes: string) => `<${tag}${attributes}>${escapedPillDate}</${tag}>`);
  } else if (pillDate) {
    normalized = normalized.replace(/<h1\b/i, `<span class="pill">${escapedPillDate}</span><h1`);
  }
  const dateParagraphPattern = /<p\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bdate\b[^"]*"|'[^']*\bdate\b[^']*'))([^>]*)>[\s\S]*?<\/p\s*>/i;
  normalized = metadataLine
    ? normalized.replace(dateParagraphPattern, (_date, attributes: string) => `<p${attributes}>${escapedMetadata}</p>`)
    : normalized.replace(dateParagraphPattern, "");
  normalized = normalized.replace(
    /<p\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bmeta\b[^"]*"|'[^']*\bmeta\b[^']*'))[^>]*>[\s\S]*?<\/p\s*>/gi,
    "",
  );
  normalized = normalized.replace(
    /(<h1\b[^>]*>)\s*AI Morning Brief\s*(?:—|&mdash;|&#8212;|-)\s*\d{4}-\d{2}-\d{2}\s*(<\/h1\s*>)/gi,
    "$1AI Morning Brief$2",
  );
  if (!/\bid\s*=\s*["']hermes-ai-fullscreen-button["']/i.test(normalized)) {
    normalized = normalized.replace(
      /(<h1\b[^>]*>\s*AI Morning Brief\s*<\/h1\s*>)/i,
      `<div class="hermes-ai-title-row">$1<button id="hermes-ai-fullscreen-button" type="button" aria-label="Enter AI Brief fullscreen" title="Enter fullscreen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6"></path><path d="M9 21H3v-6"></path><path d="m21 3-7 7"></path><path d="m3 21 7-7"></path></svg></button></div>`,
    );
  }
  normalized = normalized.replace(
    /<span\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bhermes-ai-active-date-pill\b[^"]*"|'[^']*\bhermes-ai-active-date-pill\b[^']*'))[^>]*>[\s\S]*?<\/span\s*>/gi,
    "",
  );
  normalized = normalized.replace(
    /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bhermes-takeaways-heading-row\b[^"]*"|'[^']*\bhermes-takeaways-heading-row\b[^']*'))[^>]*>\s*(<h2\b[^>]*>\s*FOUNDER TAKEAWAYS\s*<\/h2\s*>)\s*<\/div\s*>/gi,
    "$1",
  );
  const markedHero = normalized.replace(
    /<(header|div)\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bhero\b[^"]*"|'[^']*\bhero\b[^']*'))([^>]*)>/i,
    (opening, tag: string, attributes: string) => /\bdata-hermes-date-normalized\s*=/i.test(opening)
      ? opening
      : `<${tag}${attributes} data-hermes-date-normalized="true">`,
  );
  if (/\bdata-hermes-date-normalized\s*=\s*["']true["']/i.test(markedHero)) return markedHero;
  return markedHero.replace(
    /<header\b([^>]*)>/i,
    '<header$1 data-hermes-date-normalized="true">',
  );
}

function formatArchiveDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));
  } catch {
    return date;
  }
}

export function formatStockArchiveDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return formatArchiveDate(date);
  try {
    const parsed = new Date(`${date}T00:00:00Z`);
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(parsed);
    return `${formatArchiveDate(date)} - ${weekday}.`;
  } catch {
    return formatArchiveDate(date);
  }
}

function stockArchiveDate(html: string): string {
  const isoDate = html.match(/\b(?:Los\s+Angeles\s+)?date\s*:\s*(\d{4}-\d{2}-\d{2})\b/i)?.[1]
    ?? html.match(/Stock Brief\s*(?:—|&mdash;|&#8212;|-)\s*(\d{4}-\d{2}-\d{2})/i)?.[1];
  if (isoDate) return isoDate;

  const explicitPillDate = html.match(/<(?:span|div)\b(?=[^>]*\b(?:id\s*=\s*["']hermes-stock-date-pill["']|class\s*=\s*["'][^"']*\bpill\b[^"']*["']))[^>]*>\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})\s*<\/(?:span|div)\s*>/i)?.[1];
  const humanDate = explicitPillDate ?? html.match(/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})\b/i)?.[1];
  if (!humanDate) return "";
  const match = humanDate.match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (!match) return "";
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const month = months.indexOf(match[1].toLowerCase()) + 1;
  if (!month) return "";
  return `${match[3]}-${String(month).padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

function normalizeStockHeroMarkup(html: string, generatedAt?: number): string {
  const withoutLegacyPlayer = html.replace(
    /<(button|p|span|div)\b[^>]*>\s*Play\s*\/\s*Pause\s*<\/\1\s*>/gi,
    "",
  );
  const stockHeader = withoutLegacyPlayer.match(/<header\b[\s\S]*?<\/header\s*>/i)?.[0] ?? withoutLegacyPlayer;
  const titleDate = stockArchiveDate(stockHeader);
  const timezone = "America/Los_Angeles";
  const generationTime = formatArchiveGenerationTime(generatedAt, timezone);
  const metadataLine = [generationTime, timezone].filter(Boolean).join(" - ");
  const pillDate = formatArchiveDate(titleDate);
  const escapeText = (value: string) => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  let normalized = withoutLegacyPlayer.replace(
    /<(span|div|p)\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\b(?:pill|tag)\b[^"]*"|'[^']*\b(?:pill|tag)\b[^']*'))[^>]*>[\s\S]*?<\/\1\s*>/gi,
    "",
  );
  normalized = normalized.replace(
    /<(button|p|span|div)\b[^>]*>\s*Play\s*\/\s*Pause\s*<\/\1\s*>/gi,
    "",
  );
  if (titleDate) {
    normalized = normalized.replace(
      /(<h1\b[^>]*>)\s*Stock Brief(?:\s*(?:—|&mdash;|&#8212;|-)\s*\d{4}-\d{2}-\d{2})?\s*(<\/h1\s*>)/gi,
      "$1Stock Brief$2",
    );
  }
  if (pillDate) {
    normalized = normalized.replace(
      /<h1\b/i,
      `<span id="hermes-stock-date-pill" data-hermes-stock-date-pill="true" role="status" aria-label="Stock brief date: ${escapeText(pillDate)}" style="display:inline-block !important;visibility:visible !important;position:static !important;inset:auto !important;width:auto !important;height:auto !important;opacity:1 !important;clip:auto !important;clip-path:none !important;transform:none !important;overflow:visible !important;margin:0 0 18px !important;padding:10px 22px !important;border-radius:999px !important;background:#ffd166 !important;color:#0b1020 !important;font-size:22px !important;font-weight:800 !important;line-height:1.2 !important;letter-spacing:.02em !important;">${escapeText(pillDate)}</span><h1`,
    );
  }
  const metadataParagraph = /<p\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\b(?:date|sub)\b[^"]*"|'[^']*\b(?:date|sub)\b[^']*'))[^>]*>[\s\S]*?<\/p\s*>/i;
  if (metadataLine && metadataParagraph.test(normalized)) {
    normalized = normalized.replace(metadataParagraph, `<p class="date">${escapeText(metadataLine)}</p>`);
  } else if (metadataLine) {
    normalized = normalized.replace(/<\/h1\s*>/i, `</h1><p class="date">${escapeText(metadataLine)}</p>`);
  }
  const canonicalStockMetadata = '<div class="sub">Yahoo Finance snapshot generated at end-of-day after U.S. close · $USD</div>';
  normalized = normalized.replace(
    /<(div|p|span)\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bcontext\b[^"]*"|'[^']*\bcontext\b[^']*'))[^>]*>[\s\S]*?<\/\1\s*>/gi,
    "",
  );
  normalized = normalized.replace(
    /<p\b[^>]*>\s*Primary quotes:\s*Yahoo Finance chart metadata;[\s\S]*?<\/p\s*>/gi,
    "",
  );
  normalized = normalized.replace(
    /<(div|p|span)\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bsub\b[^"]*"|'[^']*\bsub\b[^']*'))[^>]*>[\s\S]*?<\/\1\s*>/gi,
    "",
  );
  const normalizedDateParagraph = /(<p\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bdate\b[^"]*"|'[^']*\bdate\b[^']*'))[^>]*>[\s\S]*?<\/p\s*>)/i;
  normalized = normalizedDateParagraph.test(normalized)
    ? normalized.replace(normalizedDateParagraph, `$1${canonicalStockMetadata}`)
    : normalized.replace(/<\/h1\s*>/i, `</h1>${canonicalStockMetadata}`);
  const fullscreenButton = `<button id="hermes-stock-fullscreen-button" type="button" aria-label="Enter Stock Brief fullscreen" title="Enter fullscreen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/></svg></button>`;
  if (!/\bclass\s*=\s*["'][^"']*\bhermes-stock-title-row\b/i.test(normalized)) {
    normalized = normalized.replace(/<button\b[^>]*\bid\s*=\s*["']hermes-stock-fullscreen-button["'][^>]*>[\s\S]*?<\/button\s*>/gi, "");
    normalized = normalized.replace(
      /(<h1\b[^>]*>\s*Stock Brief\s*<\/h1\s*>)/i,
      `<div class="hermes-stock-title-row">$1${fullscreenButton}</div>`,
    );
  } else if (!/\bid\s*=\s*["']hermes-stock-fullscreen-button["']/i.test(normalized)) {
    normalized = normalized.replace(
      /(<div\b[^>]*\bclass\s*=\s*["'][^"']*\bhermes-stock-title-row\b[^"']*["'][^>]*>[\s\S]*?)(<\/div\s*>)/i,
      (_match, titleRowStart, titleRowEnd) => `${titleRowStart}${fullscreenButton}${titleRowEnd}`,
    );
  }
  if (!/\bid\s*=\s*["']hermes-stock-portfolio-summary["']/i.test(normalized)) {
    const summary = stockPortfolioSummary(normalized);
    if (summary) {
      normalized = normalized.replace(
        /(<div\b[^>]*\bclass\s*=\s*["'][^"']*\bhermes-stock-title-row\b[^"']*["'][^>]*>[\s\S]*?<\/div\s*>)/i,
        (titleRow) => `<div class="hermes-stock-heading-row">${titleRow}${summary}</div>`,
      );
    }
  }
  return normalized.replace(/<header\b([^>]*)>/i, (opening, attributes: string) => {
    let updated = opening;
    if (/\bclass\s*=/i.test(attributes)) {
      updated = updated.replace(/\bclass\s*=\s*(["'])(.*?)\1/i, (_match, quote: string, classes: string) => (
        `class=${quote}${classes.split(/\s+/).includes("hero") ? classes : `${classes} hero`}${quote}`
      ));
    } else {
      updated = updated.replace(/^<header/i, '<header class="hero"');
    }
    return /\bdata-hermes-date-normalized\s*=/i.test(updated)
      ? updated
      : updated.replace(/>$/, ' data-hermes-date-normalized="true">');
  });
}

function canonicalAiDocument(html: string, selectedDate?: string): string {
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const text = (fragment: string) => fragment.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
  const sourceDate = text(html.match(/<(?:span|div)\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bpill\b[^"']*["'])[^>]*>([\s\S]*?)<\/(?:span|div)\s*>/i)?.[1] ?? "");
  const date = selectedDate ? formatArchiveDate(selectedDate) : sourceDate;
  const metadata = text(html.match(/<p\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bdate\b[^"']*["'])[^>]*>([\s\S]*?)<\/p\s*>/i)?.[1] ?? "");
  const fullscreenButton = `<button id="hermes-ai-fullscreen-button" type="button" aria-label="Enter AI Morning Brief fullscreen" title="Enter fullscreen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6"></path><path d="M9 21H3v-6"></path><path d="m21 3-7 7"></path><path d="m3 21 7-7"></path></svg></button>`;
  const header = `<header class="hero" data-hermes-date-normalized="true">${date ? `<span class="pill">${escape(date)}</span>` : ""}<div class="hermes-ai-title-row"><h1>AI Morning Brief</h1>${fullscreenButton}</div>${metadata ? `<p class="date">${escape(metadata)}</p>` : ""}</header>`;
  const legacyTakeawayBodies = Array.from(html.matchAll(/<div\b(?=[^>]*\bclass\s*=\s*["'][^"']*\btake\b[^"']*["'])[^>]*>([\s\S]*?)<\/div\s*>/gi), (match) => text(match[1]).replace(/^Founder takeaway:\s*/i, "")).filter(Boolean);
  const hasTakeaways = /<(?:section|div)\b(?=[^>]*\bclass\s*=\s*["'][^"']*\btakeaways\b[^"']*["'])/i.test(html) || legacyTakeawayBodies.length > 0;
  let takeawayList = html.match(/<(ol|ul)\b([^>]*)>[\s\S]*?<\/\1\s*>/i)?.[0] ?? "";
  if (!takeawayList && legacyTakeawayBodies.length) takeawayList = `<ol>${legacyTakeawayBodies.map((item) => `<li><strong>${escape(item)}</strong></li>`).join("")}</ol>`;
  const takeaways = hasTakeaways ? `<section class="takeaways"><h2>FOUNDER TAKEAWAYS</h2>${takeawayList}</section>` : "";
  const articleCards = Array.from(html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article\s*>/gi))
    .filter((match) => /\bcard\b/i.test(match[1]) || /<h[1-6]\b[^>]*>\s*\d+[.)]\s*/i.test(match[2]))
    .map((match) => `<article class="card"${match[1].match(/\bdata-brief-topic\s*=\s*(?:"[^"]*"|'[^']*')/i)?.[0] ? ` ${match[1].match(/\bdata-brief-topic\s*=\s*(?:"[^"]*"|'[^']*')/i)?.[0]}` : ""}>${match[2]}</article>`);
  let cards = articleCards.join("");
  if (!cards) {
    const cardBodies = Array.from(html.matchAll(/<(section|div)\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bcard\b[^"']*["'])[^>]*>([\s\S]*?)<\/\1\s*>/gi), (match) => match[2]);
    cards = cardBodies.map((body) => {
      const starts = Array.from(body.matchAll(/<h[1-6]\b[^>]*>\s*\d+[.)]\s*[\s\S]*?<\/h[1-6]\s*>/gi));
      if (!starts.length) return `<article class="card">${body}</article>`;
      if (starts.length === 1) return `<article class="card" data-brief-topic="1">${body}</article>`;
      return starts.map((start, index) => {
        const from = start.index ?? 0;
        const to = starts[index + 1]?.index ?? body.length;
        return `<article class="card" data-brief-topic="${index + 1}">${body.slice(from, to)}</article>`;
      }).join("");
    }).join("");
  }
  cards = cards.replace(/<span\b[^>]*class=["'][^"']*\bpill\b[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, "");
  const topics = cards ? `<section class="topics" aria-label="Canonical AI news topics">${cards}</section>` : "";
  return `<!doctype html><html lang="en" data-hermes-canonical-ai="v26"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI Morning Brief</title>${V25_AI_BASE_STYLE}</head><body><main id="hermes-ai-canonical">${header}${takeaways}${topics}</main></body></html>`;
}

function canonicalStockDocument(html: string, selectedDate?: string): string {
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const archiveDate = selectedDate || stockArchiveDate(html);
  const date = formatStockArchiveDate(archiveDate);
  const metadata = (html.match(/<p\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bdate\b[^"']*["'])[^>]*>([\s\S]*?)<\/p\s*>/i)?.[1] ?? "")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  const summary = stockPortfolioSummary(html);
  const fullscreenButton = `<button id="hermes-stock-fullscreen-button" type="button" aria-label="Enter Stock Brief fullscreen" title="Enter fullscreen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/></svg></button>`;
  const pill = date ? `<span id="hermes-stock-date-pill" data-hermes-stock-date-pill="true" class="pill" role="status" aria-label="Stock brief date: ${escape(date)}">${escape(date)}</span>` : "";
  const metadataStack = `<div class="hermes-stock-meta-stack">${pill}${metadata ? `<p class="date">${escape(metadata)}</p>` : ""}<div class="sub">Yahoo Finance snapshot generated at end-of-day after U.S. close · $USD</div></div>`;
  const header = `<header class="hero" data-hermes-date-normalized="true"><div class="hermes-stock-heading-row"><div class="hermes-stock-hero-left"><div class="hermes-stock-title-row"><h1>Stock Brief</h1>${fullscreenButton}</div>${metadataStack}</div><div class="hermes-stock-summary-stack">${summary}</div></div></header>`;
  const comparison = html.match(/<section\b(?=[^>]*\bid\s*=\s*["']hermes-portfolio-comparison["'])[^>]*>[\s\S]*?<\/section\s*>/i)?.[0] ?? "";
  // Canonicalization preserves quote values exactly; market-calendar policy belongs in cron JSON.
  const rows = Array.from(html.matchAll(/<section\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bhermes-stock-row\b[^"']*["'])[^>]*>[\s\S]*?<\/section\s*>/gi), (match) => match[0]).join("");
  const quotes = rows ? `<main id="hermes-stock-canonical-quotes" class="grid" aria-label="Canonical tracked stock prices"><h2 id="hermes-stock-today-date-pill" class="hermes-stock-today-date-pill" aria-label="Daily stock prices for ${escape(date)}">${escape(date)}</h2>${rows}</main>` : "";
  return `<!doctype html><html lang="en" data-hermes-canonical-stock="v26"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stock Brief</title>${V25_STOCK_BASE_STYLE}</head><body id="hermes-stock-canonical">${header}${comparison}${quotes}</body></html>`;
}

function normalizeAiTakeawayHeadlines(html: string): string {
  return html.replace(
    /(<(?:section|div)\b[^>]*\bclass\s*=\s*(?:"[^"]*\btakeaways\b[^"]*"|'[^']*\btakeaways\b[^']*')[^>]*>[\s\S]*?<\/(?:section|div)\s*>)/gi,
    (takeaways) => takeaways.replace(
      /(<li\b[^>]*>)(?!\s*<strong\b)([\s\S]*?)(<\/li\s*>)/gi,
      (_item, opening, content, closing) => `${opening}<strong>${content.trim()}</strong>${closing}`,
    ),
  );
}

export const BRIEF_EXPORT_VERSION = "v61-date-load-keyboard-focus";
export const STOCK_BRIEF_EXPORT_VERSION = "v74-ticker-above-company";

type GoldMasterStyleDoc = { purpose: string; restore: string };
type GoldMasterControllerDoc = {
  purpose: string;
  state: string;
  inputs: string;
  outputs: string;
  dependencies: string;
  restore: string;
};

const GOLD_MASTER_STYLE_DOCS: Record<string, GoldMasterStyleDoc> = {
  "hermes-v25-ai-base-style": {
    purpose: "Defines the canonical dark AI canvas, design tokens, hero, Founder Takeaways, topic cards, sources, and base responsive fallback.",
    restore: "Keep this block first. It is the minimal visual foundation; later AI blocks intentionally refine it with the accepted dashboard geometry.",
  },
  "hermes-v25-stock-base-style": {
    purpose: "Defines the canonical dark Stocks canvas, color tokens, hero, portfolio table, quote rows, movement colors, and base responsive fallback.",
    restore: "Keep this block first. It supplies safe fallback styling before the accepted Stocks hero and row refinements are applied.",
  },
  "hermes-brief-player-style": {
    purpose: "Styles the fixed AI narration toolbar, date controls, active-card states, portfolio compatibility rules, canonical Stock rows, and responsive layouts.",
    restore: "Preserve its selectors with the player controller. The normal-flow placeholder and --hermes-player-height prevent content from hiding under the fixed toolbar.",
  },
  "hermes-ai-restored-style": {
    purpose: "Locks the accepted AI typography, full-width hierarchy, Founder Takeaways treatment, topic-card geometry, fullscreen control, and mobile breakpoints.",
    restore: "Load after the base/player styles so these accepted dashboard values win without changing semantic HTML or narration behavior.",
  },
  "hermes-stock-hero-style": {
    purpose: "Locks the accepted Stocks title, date metadata, Summary placement, fullscreen control, responsive hero geometry, and compact-height behavior.",
    restore: "Load after the base/player styles and keep Portfolio Position Comparison plus five-metric quote-row selectors unchanged.",
  },
  "hermes-brief-export-shell-style": {
    purpose: "Styles the offline archive index, selected-date state, and visible gold-master provenance banner above the canonical brief.",
    restore: "This shell is export-only. It may be removed when restoring into the live dashboard, but keep it when sharing files as an offline archive set.",
  },
  "hermes-ai-stable-date-frame-style": {
    purpose: "Makes one stable full-window frame own standalone AI date changes so fullscreen, focus, active-card position, and narration settings survive file swaps.",
    restore: "Keep with the export navigation controller and sibling AI HTML files. The frame is activated only after an offline date change.",
  },
};

const GOLD_MASTER_CONTROLLER_DOCS: Record<string, GoldMasterControllerDoc> = {
  "hermes-brief-player-controller": {
    purpose: "Owns AI narration, natural-voice selection, play/pause, topic traversal, Founder Takeaways sequencing, speed, volume, fullscreen, keyboard controls, and parent-frame synchronization.",
    state: "Tracks selected topic, playback/paused state, utterance and queue generations, 1.25x speed, persistent volume, fullscreen state, and viewport position.",
    inputs: "Toolbar clicks, card clicks, Space/arrow/S/Enter/[ and ] keys, Web Speech events, localStorage, and validated postMessage commands from the parent.",
    outputs: "SpeechSynthesis calls, accessible control state, selected-card visuals, scrolling/focus updates, localStorage volume, and viewport/date/fullscreen messages.",
    dependencies: "Browser DOM, Web Speech API, Fullscreen API, localStorage when available, ResizeObserver when available, and same-package parent message contracts; no network or external library.",
    restore: "Keep this controller single-owned and paired with hermes-brief-player-style. Do not combine it with archived scripts or duplicate keyboard listeners.",
  },
  "hermes-stock-interaction-controller": {
    purpose: "Owns Stocks fullscreen, viewport capture/restore, and parent-directed archive-date navigation.",
    state: "Tracks fullscreen state and a requestAnimationFrame throttle for viewport publication.",
    inputs: "Fullscreen button, Enter/arrow/[ and ] keys, scroll events, Fullscreen API events, and validated parent messages.",
    outputs: "Fullscreen state, viewport messages, restored scroll position, and archive-navigation messages.",
    dependencies: "Browser DOM, Fullscreen API, requestAnimationFrame, and same-package parent message contracts; no network or external library.",
    restore: "Keep with the canonical Stocks hero/fullscreen button and do not add the AI narration controller to Stocks exports.",
  },
  "hermes-stock-section-navigation-controller": {
    purpose: "Provides fast keyboard movement between the complete Stocks brief top and the daily quote section.",
    state: "Stateless; derives destinations from canonical section IDs.",
    inputs: "Unmodified ArrowUp and ArrowDown keyboard events outside editable controls.",
    outputs: "Smooth document or section scrolling with the handled key event consumed.",
    dependencies: "Browser DOM and canonical IDs hermes-stock-canonical and hermes-stock-canonical-quotes; no network or external library.",
    restore: "Keep the canonical IDs or update this controller in the same change so keyboard restoration remains deterministic.",
  },
};

function goldMasterStyleDoc(id: string): GoldMasterStyleDoc {
  return GOLD_MASTER_STYLE_DOCS[id] ?? {
    purpose: "Preserves a dashboard-owned visual layer embedded in this self-contained brief.",
    restore: "Keep this style inline and in source order unless its selectors are intentionally absorbed into another documented layer.",
  };
}

function goldMasterControllerDoc(id: string, kind: BriefKind): GoldMasterControllerDoc {
  if (id === "hermes-brief-export-navigation-controller") {
    return kind === "ai" ? {
      purpose: "Owns offline AI archive links and cyclic date changes inside one stable frame while preserving per-date card, viewport, volume, focus, audio-stop, and fullscreen state.",
      state: "Tracks current date, date-to-file mapping, stable frame, pending viewport/card state, per-date active cards, and persistent volume with a 45% missing-value default.",
      inputs: "Archive-link clicks, date/fullscreen/volume postMessage events, localStorage when available, frame load events, and Fullscreen API events.",
      outputs: "Sibling-file frame loads, audio-stop and state-restore messages, persisted volume, stable focus, and cyclic date selection.",
      dependencies: "All BRIEFS-AI HTML files from the same export folder, browser DOM/iframe/Fullscreen APIs, localStorage when available, and no host API or network.",
      restore: "Share the complete AI HTML set together and preserve filenames from the inline state map; a lone file still renders but cannot open missing sibling dates.",
    } : {
      purpose: "Owns offline Stocks archive links, cyclic date changes, and viewport restoration through a URL hash.",
      state: "Uses the selected date, date-to-file mapping, and encoded scroll coordinates carried in the destination hash.",
      inputs: "Archive-link clicks, date-navigation messages from the inline Stocks controller, and the current viewport.",
      outputs: "Sibling-file navigation with a restorable viewport hash and deterministic cyclic boundary wrapping.",
      dependencies: "All BRIEFS-STOCKS HTML files from the same export folder and browser location/DOM APIs; no host API or network.",
      restore: "Share the complete Stocks HTML set together and preserve filenames from the inline state map; a lone file still renders but cannot open missing sibling dates.",
    };
  }
  return GOLD_MASTER_CONTROLLER_DOCS[id] ?? {
    purpose: "Preserves a dashboard-owned interaction layer embedded in this self-contained brief.",
    state: "Controller-local state only.",
    inputs: "Document events and canonical DOM elements.",
    outputs: "Deterministic updates to the current document.",
    dependencies: "Browser APIs only; no network or external library.",
    restore: "Keep this controller inline and single-owned with its documented canonical DOM IDs.",
  };
}

function annotateGoldMasterExport(html: string, kind: BriefKind): string {
  const withStyles = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_match, attributes: string, body: string) => {
    const id = attributes.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1] ?? "unnamed-inline-style";
    const doc = goldMasterStyleDoc(id);
    return `<style${attributes}>\n/* GOLD MASTER STYLE: ${id}\nPurpose: ${doc.purpose}\nRestore notes: ${doc.restore}\n*/\n${body.replace(/^\s+/, "")}</style>`;
  });
  const withScripts = withStyles.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_match, attributes: string, body: string) => {
    const id = attributes.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1] ?? "unnamed-inline-controller";
    const doc = goldMasterControllerDoc(id, kind);
    return `<script${attributes}>\n/* GOLD MASTER CONTROLLER: ${id}\nPurpose: ${doc.purpose}\nState: ${doc.state}\nInputs: ${doc.inputs}\nOutputs: ${doc.outputs}\nDependencies: ${doc.dependencies}\nRestore notes: ${doc.restore}\n*/\n${body.replace(/^\s+/, "")}</script>`;
  });
  return kind === "ai"
    ? withScripts.replace('<main id="hermes-ai-canonical">', '<!-- GOLD MASTER HTML: Canonical AI structure. The hero, Founder Takeaways, and numbered topic cards are semantic content; CSS and JavaScript remain separate inline ownership layers. --><main id="hermes-ai-canonical">')
    : withScripts
      .replace('<header class="hero"', '<!-- GOLD MASTER HTML: Canonical Stocks structure. Header/Summary, Portfolio Position Comparison, and quote rows are semantic content; CSS and JavaScript remain separate inline ownership layers. --><header class="hero"')
      .replace('<section id="hermes-portfolio-comparison"', '<!-- GOLD MASTER HTML: Portfolio Position Comparison is the restore-safe position table and must remain above daily quote rows. --><section id="hermes-portfolio-comparison"')
      .replace('<main id="hermes-stock-canonical-quotes"', '<!-- GOLD MASTER HTML: Canonical daily quote rows use ticker, company, movement, current price, and exactly five metrics. --><main id="hermes-stock-canonical-quotes"');
}

function briefExportManifest(format: "html" | "markdown", kind: BriefKind): string {
  const label = kind === "ai" ? "BRIEFS-AI" : "BRIEFS-STOCKS";
  const acceptedUi = kind === "stock" ? STOCK_BRIEF_EXPORT_VERSION : BRIEF_EXPORT_VERSION;
  return `HERMES_BRIEFS_EXPORT_MANIFEST ${JSON.stringify({
    accepted_ui: acceptedUi,
    export_schema: "briefs-v34-gold-master",
    format,
    kind,
    html_self_contained: format === "html",
    inline_css: format === "html",
    inline_javascript: format === "html",
    gold_master_documented: format === "html",
    style_comment_contract: format === "html" ? "purpose-and-restore" : "not-applicable",
    script_comment_contract: format === "html" ? "purpose-state-inputs-outputs-dependencies-and-restore" : "not-applicable",
    companion_html_pattern: `${label} - YYYY-MM-DD.html`,
    purpose: format === "html"
      ? "Standalone visual and interactive recreation of the accepted Briefs dashboard archive."
      : "Semantic content export; use the companion HTML export for the accepted visual and interactive recreation.",
  })}`;
}

function standaloneAiExportNavigation(selectedDate: string, archiveDates: string[]): string {
  const files = Object.fromEntries(archiveDates.map((date) => [date, briefHtmlDownloadName("ai", date)]));
  const payload = JSON.stringify({ selectedDate, archiveDates, files }).replace(/</g, "\\u003c");
  return `<!-- V34 GOLD MASTER INLINE CONTROLLER: keeps AI date changes inside one stable offline frame while preserving per-date card state. -->
<style id="hermes-ai-stable-date-frame-style">
/* The stable frame prevents a standalone AI export from losing fullscreen/focus state when dates change. */
html.hermes-ai-date-frame-active, html.hermes-ai-date-frame-active body { overflow: hidden !important; }
html.hermes-ai-date-frame-active body > :not(#hermes-ai-stable-date-frame) { display: none !important; }
#hermes-ai-stable-date-frame { position: fixed !important; inset: 0 !important; z-index: 2147483647 !important; display: block !important; width: 100vw !important; height: 100vh !important; border: 0 !important; background: #0b1020 !important; color-scheme: dark !important; }
</style><script id="hermes-brief-export-navigation-controller">
(() => {
  const state = ${payload};
  const FILE_TO_DATE = Object.fromEntries(Object.entries(state.files).map(([date, file]) => [file, date]));
  let currentDate = state.selectedDate;
  let frame = null;
  let pendingPosition = { scrollX: 0, scrollY: 0, topicIndex: 0 };
  const activeCardByDate = new Map();
  const VOLUME_STORAGE_KEY = "hermes-briefs-ai-volume-v1";
  let volume = 0.45;
  try {
    const storedVolumeRaw = window.localStorage.getItem(VOLUME_STORAGE_KEY);
    if (storedVolumeRaw !== null) {
      const storedVolume = Number(storedVolumeRaw);
      if (Number.isFinite(storedVolume)) volume = Math.max(0, Math.min(1, storedVolume));
    }
  } catch (_reason) {}

  function captureViewportPosition() {
    const activeCard = window.__hermesAiCaptureActiveCard?.();
    return activeCard || { scrollX: window.scrollX, scrollY: window.scrollY, topicIndex: 0 };
  }
  function safePosition(position) {
    return {
      scrollX: Number.isFinite(position?.scrollX) ? Math.max(0, position.scrollX) : 0,
      scrollY: Number.isFinite(position?.scrollY) ? Math.max(0, position.scrollY) : 0,
      topicIndex: Number.isInteger(position?.topicIndex) ? position.topicIndex : 0,
    };
  }

  function activeFrame() {
    return document.getElementById("hermes-ai-stable-date-frame");
  }
  function publishFullscreenState() {
    const target = activeFrame();
    target?.contentWindow?.postMessage({ type: "hermes-ai-fullscreen-state", active: Boolean(document.fullscreenElement) }, "*");
  }
  function restoreChildViewport() {
    const target = activeFrame();
    target?.contentWindow?.postMessage({ type: "hermes-ai-viewport-restore", position: pendingPosition }, "*");
  }
  function restoreChildVolume() {
    const target = activeFrame();
    target?.contentWindow?.postMessage({ type: "hermes-ai-volume-restore", volume }, "*");
  }
  function focusActiveFrame() {
    const target = activeFrame();
    if (!target) return;
    target.focus({ preventScroll: true });
    target.contentWindow?.focus();
  }
  function publishFrameState() {
    publishFullscreenState();
    restoreChildViewport();
    restoreChildVolume();
    focusActiveFrame();
    window.requestAnimationFrame(focusActiveFrame);
  }
  function stopActiveAudio() {
    window.speechSynthesis?.cancel();
    const target = activeFrame();
    target?.contentWindow?.postMessage({ type: "hermes-ai-stop-audio" }, "*");
  }
  async function toggleStableFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_reason) {
      // Browser fullscreen denial leaves the stable date frame unchanged.
    }
    publishFullscreenState();
  }
  function ensureStableFrame() {
    frame = activeFrame();
    if (!frame) {
      frame = document.createElement("iframe");
      frame.id = "hermes-ai-stable-date-frame";
      frame.title = "AI Brief date preview";
      frame.allowFullscreen = true;
      frame.setAttribute("allow", "fullscreen");
      frame.addEventListener("load", publishFrameState);
      document.body.appendChild(frame);
    }
    document.documentElement.classList.add("hermes-ai-date-frame-active");
    return frame;
  }
  function requestFile(file, position = captureViewportPosition()) {
    if (!file) return;
    let viewportPosition = safePosition(position);
    if (window.parent !== window) {
      window.parent.postMessage({ type: "hermes-ai-export-date-load", file, position: viewportPosition }, "*");
      return;
    }
    const destinationDate = FILE_TO_DATE[file] || currentDate;
    activeCardByDate.set(currentDate, viewportPosition.topicIndex);
    const rememberedTopicIndex = activeCardByDate.get(destinationDate);
    if (Number.isInteger(rememberedTopicIndex)) {
      viewportPosition = { ...viewportPosition, topicIndex: rememberedTopicIndex };
    } else {
      activeCardByDate.set(destinationDate, viewportPosition.topicIndex);
    }
    stopActiveAudio();
    pendingPosition = viewportPosition;
    currentDate = destinationDate;
    const target = ensureStableFrame();
    if (target.getAttribute("src") !== file) target.src = file;
    else restoreChildViewport();
  }
  function navigate(direction, position = captureViewportPosition()) {
    const current = state.archiveDates.indexOf(currentDate);
    const offset = direction === "newer" ? -1 : direction === "older" ? 1 : 0;
    if (current < 0 || offset === 0 || state.archiveDates.length === 0) return;
    // Standalone exports use the same archive ring as the live dashboard:
    // crossing either boundary continues at the opposite end instead of stopping.
    const targetIndex = (current + offset + state.archiveDates.length) % state.archiveDates.length;
    const date = state.archiveDates[targetIndex];
    requestFile(date && state.files[date], position);
  }
  document.querySelectorAll("#hermes-brief-export-shell a[href]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const file = link.getAttribute("href");
      if (!file) return;
      event.preventDefault();
      requestFile(file);
    });
  });
  window.addEventListener("message", (event) => {
    const target = activeFrame();
    if (event.source !== window && event.source !== target?.contentWindow) return;
    if (event.data?.type === "hermes-ai-export-date-load") {
      requestFile(event.data.file, event.data.position);
      return;
    }
    if (event.data?.type === "${BRIEF_DATE_NAV_MESSAGE_TYPE}") {
      navigate(event.data.direction, event.data.position);
      return;
    }
    if (event.data?.type === "hermes-ai-volume-change") {
      const nextVolume = Number(event.data.volume);
      if (!Number.isFinite(nextVolume) || nextVolume < 0 || nextVolume > 1) return;
      volume = nextVolume;
      try { window.localStorage.setItem(VOLUME_STORAGE_KEY, String(volume)); } catch (_reason) {}
      return;
    }
    if (event.data?.type === "hermes-ai-fullscreen-toggle") void toggleStableFullscreen();
  });
  document.addEventListener("fullscreenchange", publishFullscreenState);
})();
</script>`;
}

function standaloneExportNavigation(kind: BriefKind, selectedDate: string, archiveDates: string[]): string {
  if (kind === "ai") return standaloneAiExportNavigation(selectedDate, archiveDates);
  const files = Object.fromEntries(archiveDates.map((date) => [date, briefHtmlDownloadName(kind, date)]));
  const payload = JSON.stringify({ selectedDate, archiveDates, files }).replace(/</g, "\\u003c");
  return `<!-- V34 GOLD MASTER INLINE CONTROLLER: provides offline Stocks date navigation and viewport restoration without a host API. -->
<script id="hermes-brief-export-navigation-controller">
(() => {
  const state = ${payload};
  const VIEWPORT_HASH_PREFIX = "#hermes-stock-viewport=";
  function captureViewportPosition() {
    return { scrollX: window.scrollX, scrollY: window.scrollY };
  }
  function safePosition(position) {
    return {
      scrollX: Number.isFinite(position?.scrollX) ? Math.max(0, position.scrollX) : Math.max(0, window.scrollX),
      scrollY: Number.isFinite(position?.scrollY) ? Math.max(0, position.scrollY) : Math.max(0, window.scrollY),
    };
  }
  function destination(file, position) {
    const value = safePosition(position);
    return file + VIEWPORT_HASH_PREFIX + encodeURIComponent(String(value.scrollX) + "," + String(value.scrollY));
  }
  function navigate(direction, position) {
    const current = state.archiveDates.indexOf(state.selectedDate);
    const offset = direction === "newer" ? -1 : direction === "older" ? 1 : 0;
    if (current < 0 || offset === 0 || state.archiveDates.length === 0) return;
    // Preserve the live dashboard's cyclic date contract in this offline export.
    // Modulo wrapping keeps [ and ]/visible arrows functional at both boundaries.
    const targetIndex = (current + offset + state.archiveDates.length) % state.archiveDates.length;
    const date = state.archiveDates[targetIndex];
    const file = date && state.files[date];
    if (file) window.location.href = destination(file, position);
  }
  function restoreViewportFromHash() {
    if (!window.location.hash.startsWith(VIEWPORT_HASH_PREFIX)) return;
    let decoded = "";
    try {
      decoded = decodeURIComponent(window.location.hash.slice(VIEWPORT_HASH_PREFIX.length));
    } catch (_reason) {
      return;
    }
    const values = decoded.split(",").map(Number);
    if (!Number.isFinite(values[0]) || !Number.isFinite(values[1])) return;
    const targetX = Math.max(0, values[0]);
    const targetY = Math.max(0, values[1]);
    let framesRemaining = 8;
    const applyPosition = () => {
      window.scrollTo(targetX, targetY);
      framesRemaining -= 1;
      if (framesRemaining > 0) requestAnimationFrame(applyPosition);
    };
    requestAnimationFrame(() => requestAnimationFrame(applyPosition));
  }
  document.querySelectorAll("#hermes-brief-export-shell a[href]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const file = link.getAttribute("href");
      if (!file) return;
      event.preventDefault();
      window.location.href = destination(file, captureViewportPosition());
    });
  });
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.type !== "${BRIEF_DATE_NAV_MESSAGE_TYPE}") return;
    navigate(event.data.direction, event.data.position);
  });
  restoreViewportFromHash();
})();
</script>`;
}

/**
 * Sanitizes archived content, extracts one canonical view model, and renders one
 * dashboard-owned final document shell with fixed interaction controllers.
 */
export function prepareBriefPreviewHtml(html: string, kind?: BriefKind, generatedAt?: number, selectedDate?: string): string {
  const sanitized = openExternalLinksInNewWindow(sanitizeArchivedHtml(html));
  const aiArchiveWithoutAgenda = kind === "ai" ? removeTacticalAgenda(sanitized) : sanitized;
  const aiArchiveWithHeadlines = kind === "ai" ? normalizeAiTakeawayHeadlines(aiArchiveWithoutAgenda) : aiArchiveWithoutAgenda;
  const aiArchiveWithHero = kind === "ai" ? normalizeAiHeroMarkup(aiArchiveWithHeadlines, generatedAt) : aiArchiveWithHeadlines;
  const archiveWithCanonicalAi = kind === "ai" ? canonicalAiDocument(aiArchiveWithHero, selectedDate) : aiArchiveWithHero;
  const stockArchiveWithoutProducerComparison = kind === "stock" ? normalizeStockArchive(archiveWithCanonicalAi) : archiveWithCanonicalAi;
  const stockArchiveWithTopComparison = kind === "stock" ? injectStockPortfolioComparison(stockArchiveWithoutProducerComparison, selectedDate) : stockArchiveWithoutProducerComparison;
  const stockArchiveWithCanonicalHero = kind === "stock" ? normalizeStockHeroMarkup(stockArchiveWithTopComparison, generatedAt) : stockArchiveWithTopComparison;
  const normalizedArchive = kind === "stock" ? canonicalStockDocument(stockArchiveWithCanonicalHero, selectedDate) : stockArchiveWithCanonicalHero;

  let withCsp: string;
  if (/<head(?:\s[^>]*)?>/i.test(normalizedArchive)) {
    withCsp = normalizedArchive.replace(
      /<head(?:\s[^>]*)?>/i,
      (head) => `${head}${CSP_META}`,
    );
  } else {
    const head = `<head>${CSP_META}</head>`;
    if (/<html(?:\s[^>]*)?>/i.test(normalizedArchive)) {
      withCsp = normalizedArchive.replace(
        /<html(?:\s[^>]*)?>/i,
        (htmlElement) => `${htmlElement}${head}`,
      );
    } else {
      const doctype = normalizedArchive.match(/^\s*<!doctype[^>]*>/i);
      if (doctype) {
        const insertionPoint = doctype.index! + doctype[0].length;
        withCsp = `${normalizedArchive.slice(0, insertionPoint)}${head}${normalizedArchive.slice(insertionPoint)}`;
      } else {
        withCsp = `${head}${normalizedArchive}`;
      }
    }
  }

  const withPlayerStyle = injectBeforeClosingTag(withCsp, "head", PLAYER_STYLE);
  const withArchiveStyle = kind === "ai"
    ? injectBeforeClosingTag(withPlayerStyle, "head", AI_RESTORED_STYLE)
    : kind === "stock"
      ? injectBeforeClosingTag(withPlayerStyle, "head", STOCK_HERO_STYLE)
      : withPlayerStyle;
  return kind === "stock"
    ? injectBeforeClosingTag(withArchiveStyle, "body", `${STOCK_INTERACTION_CONTROLLER}${STOCK_SECTION_NAVIGATION_CONTROLLER}`)
    : injectBeforeClosingTag(withArchiveStyle, "body", PLAYER_CONTROLLER);
}

/** A text-template export of the same transformed archive used by the iframe. */
export function briefDashboardHtml(
  html: string,
  kind: BriefKind,
  selectedDate: string,
  archiveDates: string[],
  generatedAt?: number,
): string {
  const prepared = prepareBriefPreviewHtml(html, kind, generatedAt, selectedDate);
  const exportPrepared = kind === "ai"
    ? prepared.replace("frame-src 'none'", "frame-src 'self' file:")
    : prepared;
  const escape = (value: string) => value.replace(/[&<>\"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;",
  })[character] || character);
  const title = kind === "ai" ? "BRIEFS-AI" : "BRIEFS-STOCKS";
  const dates = archiveDates.map((date) => {
    const current = date === selectedDate ? ' aria-current="date"' : "";
    const file = briefHtmlDownloadName(kind, date);
    return `<a href="${escape(file)}"${current}>${escape(date)}</a>`;
  }).join("");
  const shellStyle = kind === "stock" ? `<style id="hermes-brief-export-shell-style">
/* Dashboard-owned export shell: archive links and selected-date state remain visible offline. */
#hermes-brief-export-shell { margin: 0; padding: 22px 28px; border-bottom: 1px solid #263456; background: linear-gradient(135deg, #10182f, #0b1020); color: #eef3ff; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
#hermes-brief-export-shell .hermes-export-title { color: #ffd166; font: 800 24px/1.2 system-ui, sans-serif; letter-spacing: .08em; }
#hermes-brief-export-shell .hermes-export-meta { margin-top: 14px; color: #67e8f9; }
#hermes-brief-export-shell .hermes-export-dates { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
#hermes-brief-export-shell .hermes-export-dates a { padding: 8px 14px; border: 1px solid #67e8f9; border-radius: 999px; background: rgba(103,232,249,.08); color: #67e8f9; text-decoration: none; }
#hermes-brief-export-shell .hermes-export-dates a:hover, #hermes-brief-export-shell .hermes-export-dates a:focus-visible { background: #67e8f9; color: #0b1020; outline: none; }
#hermes-brief-export-shell .hermes-export-dates [aria-current="date"] { border-color: #ffd166; background: #ffd166; color: #0b1020; font-weight: 850; }
</style>` : `<style id="hermes-brief-export-shell-style">
/* Dashboard-owned export shell: archive links and selected-date state remain visible offline. */
#hermes-brief-export-shell { margin: 0; padding: 22px 28px; border-bottom: 1px solid rgba(255,255,255,.18); background: #03211f; color: #f9dec9; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
#hermes-brief-export-shell .hermes-export-title { font: 750 24px/1.2 system-ui, sans-serif; letter-spacing: .08em; }
#hermes-brief-export-shell .hermes-export-meta { margin-top: 14px; color: #c9baa8; }
#hermes-brief-export-shell .hermes-export-dates { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
#hermes-brief-export-shell .hermes-export-dates a { padding: 8px 12px; border: 1px solid rgba(249,222,201,.35); color: inherit; text-decoration: none; }
#hermes-brief-export-shell .hermes-export-dates a:hover, #hermes-brief-export-shell .hermes-export-dates a:focus-visible { border-color: #67e8f9; color: #67e8f9; outline: none; }
#hermes-brief-export-shell .hermes-export-dates [aria-current="date"] { background: #f9dec9; color: #03211f; font-weight: 800; }
</style>`;
  const exportGuide = `<!--
V34 SELF-CONTAINED GOLD MASTER GUIDE
GOLD MASTER RESTORATION MAP
1. HTML ownership: semantic brief structure and date-specific content are inline in this document body. GOLD MASTER HTML comments identify the canonical restore boundaries.
2. CSS ownership: every style block is inline and begins with a GOLD MASTER STYLE header describing its purpose and restore order.
3. JavaScript ownership: every controller is inline and begins with a GOLD MASTER CONTROLLER header describing purpose, state, inputs, outputs, dependencies, and restore notes.
4. Security boundary: the inline Content-Security-Policy denies network connections, external code, media, objects, workers, forms, and base-URL changes; AI allows only same-folder/file frames for offline date navigation.
5. Offline contract: No external scripts, stylesheets, fonts, images, APIs, or build step are required. Browser-native DOM, Fullscreen, localStorage, iframe, and Web Speech APIs are used only where documented.
6. Archive contract: date navigation is cyclic, so crossing either archive boundary continues at the opposite end. Share all same-kind HTML files together without renaming them to retain date navigation.
7. Data boundary: cron/model content is treated as data and cannot supply layout, styles, controls, navigation, or executable code.
8. Companion Markdown: semantic content and hierarchy only; CSS and browser interactions intentionally live in this companion self-contained HTML file.
9. Companion CSV (Stocks): data-only Position Comparison rows with a fixed schema; CSV has no presentation or executable-code layer and therefore no inline comments.
-->`;
  const shell = `<!-- BEGIN DASHBOARD-OWNED EXPORT SHELL -->${exportGuide}<section id="hermes-brief-export-shell" data-hermes-exclude-from-player><div class="hermes-export-title">${title}</div><div class="hermes-export-meta">Self-contained dashboard export · ${escape(selectedDate)}</div><div class="hermes-export-dates" aria-label="Archive dates">${dates}</div></section><!-- END DASHBOARD-OWNED EXPORT SHELL -->`;
  const exportNavigation = standaloneExportNavigation(kind, selectedDate, archiveDates);
  const exportManifest = `<!-- ${briefExportManifest("html", kind)} -->`;
  const exported = exportPrepared
    .replace(/<\/head>/i, `${shellStyle}</head>`)
    .replace(/<body([^>]*)>/i, `<body$1>${shell}`)
    .replace(/<\/body>/i, `${exportNavigation}${exportManifest}</body>`);
  return annotateGoldMasterExport(exported, kind);
}

export function briefDashboardMarkdown(html: string, kind: BriefKind, generatedAt?: number): string {
  const document = new DOMParser().parseFromString(prepareBriefPreviewHtml(html, kind, generatedAt), "text/html");
  const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
  const lines: string[] = [
    "<!-- V34 SEMANTIC EXPORT: Content and hierarchy match the canonical dashboard rendering. This Markdown file is intentionally data/semantics-only; exact commented CSS and JavaScript live inline in the companion self-contained HTML gold master. -->",
    "",
  ];
  const heading = clean(document.querySelector("h1")?.textContent) || (kind === "ai" ? "AI Morning Brief" : "Stock Brief");
  lines.push(`# ${heading}`);
  const briefDate = kind === "stock" ? clean(document.querySelector("#hermes-stock-date-pill")?.textContent) : "";
  if (briefDate) lines.push("", `**Brief Date:** ${briefDate}`);
  const metadata = clean(document.querySelector("header .date, header .sub")?.textContent);
  if (metadata) lines.push("", metadata);
  const takeaways = document.querySelector(".takeaways");
  if (takeaways) {
    lines.push("", "## FOUNDER TAKEAWAYS");
    takeaways.querySelectorAll("li").forEach((item) => {
      const headline = clean(item.querySelector("strong")?.textContent);
      const detail = clean(item.textContent).replace(headline, "").trim();
      if (headline) lines.push("", `### ${headline}`);
      if (detail) lines.push(detail);
    });
  }
  if (kind === "stock") {
    const summary = document.querySelector("#hermes-stock-portfolio-summary");
    const summaryValue = clean(summary?.querySelector(".hermes-stock-summary-value")?.textContent);
    const summaryReturn = clean(summary?.querySelector(".hermes-stock-summary-return")?.textContent);
    if (summaryValue) lines.push("", `**SUMMARY:** ${summaryValue}${summaryReturn ? ` (${summaryReturn})` : ""}`);
    const portfolio = document.querySelector(".hermes-portfolio-comparison");
    const portfolioTable = portfolio?.querySelector("table");
    if (portfolioTable) {
      const escapeCell = (value: string) => value.replace(/\|/g, "\\|");
      const headers = Array.from(portfolioTable.querySelectorAll("thead th")).map((cell) => escapeCell(clean(cell.textContent)));
      const tableRows = Array.from(portfolioTable.querySelectorAll("tbody tr, tfoot tr")).map((row) => {
        const cells = Array.from(row.querySelectorAll("td"));
        const values = cells.map((cell) => {
          const position = clean(cell.querySelector(".hermes-portfolio-position")?.textContent);
          const meta = clean(cell.querySelector(".hermes-portfolio-meta")?.textContent);
          return escapeCell(position ? `${position}${meta ? ` (${meta})` : ""}` : clean(cell.textContent));
        });
        const unavailable = cells.find((cell) => cell.classList.contains("hermes-portfolio-unavailable"));
        if (unavailable) return [...values.slice(0, 3), values[3], ...Array(Math.max(0, headers.length - 4)).fill("")];
        const total = ["5", "6"].includes(cells[0]?.getAttribute("colspan") ?? "");
        if (total) return [values[0], ...Array(Math.max(0, headers.length - values.length)).fill(""), ...values.slice(1)];
        return [...values, ...Array(Math.max(0, headers.length - values.length)).fill("")].slice(0, headers.length);
      });
      const note = clean(portfolio?.querySelector(".hermes-portfolio-note")?.textContent);
      lines.push("", "## Portfolio Position Comparison");
      if (note) lines.push(note);
      lines.push("", `| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`);
      tableRows.forEach((row) => lines.push(`| ${row.join(" | ")} |`));
    }
    document.querySelectorAll(".hermes-stock-row").forEach((row) => {
      const ticker = clean(row.querySelector(".hermes-stock-ticker")?.textContent);
      const company = clean(row.querySelector(".hermes-stock-company")?.textContent);
      const performance = clean(row.querySelector(".hermes-stock-change")?.textContent);
      const price = clean(row.querySelector(".hermes-stock-price")?.textContent);
      const metrics = Array.from(row.querySelectorAll("dt, dd")).map((element) => clean(element.textContent)).filter(Boolean).join(" · ");
      lines.push("", `## ${ticker || company}`);
      if (ticker && company) lines.push(`### ${company}`);
      if (performance) lines.push(`Performance · ${performance}`);
      if (price) lines.push(`Price · ${price}`);
      if (metrics) lines.push(metrics);
    });
  } else {
    const numberedHeadings = Array.from(document.querySelectorAll("main h2, main h3"))
      .filter((element) => /^\s*\d+\s*[.)]\s+/.test(clean(element.textContent)));
    const appendTopic = (titleElement: Element, contentRoot?: Element | null) => {
      const title = clean(titleElement.textContent);
      if (title) lines.push("", `## ${title}`);
      Array.from(contentRoot?.querySelectorAll("p, li, blockquote, dt, dd") ?? [])
        .filter((element) => !element.closest(".sources, .source"))
        .map((element) => clean(element.textContent))
        .filter(Boolean)
        .forEach((paragraph) => lines.push(paragraph));
    };
    if (numberedHeadings.length) {
      numberedHeadings.forEach((titleElement) => {
        const container = titleElement.closest(".card, article, section");
        const numberedInside = container
          ? Array.from(container.querySelectorAll("h2, h3")).filter((element) => /^\s*\d+\s*[.)]\s+/.test(clean(element.textContent)))
          : [];
        if (!container || numberedInside.length <= 1) {
          appendTopic(titleElement, container);
          return;
        }
        const range = document.createElement("div");
        let sibling = titleElement.nextElementSibling;
        while (sibling && !(/^\s*\d+\s*[.)]\s+/.test(clean(sibling.matches("h2, h3") ? sibling.textContent : "")))) {
          range.appendChild(sibling.cloneNode(true));
          sibling = sibling.nextElementSibling;
        }
        appendTopic(titleElement, range);
      });
    } else {
      const fallbackCards = Array.from(document.querySelectorAll(".card, article.card, main > article, main > section:not(.takeaways):not(.topics)"))
        .filter((card, index, all) => all.indexOf(card) === index);
      fallbackCards.forEach((card) => {
        const titleElement = card.querySelector("h2, h3");
        if (titleElement) appendTopic(titleElement, card);
      });
    }
  }
  const markdown = lines.filter((line, index) => line || lines[index - 1] !== "").join("\n").trim();
  return `${markdown}\n\n<!-- ${briefExportManifest("markdown", kind)} -->\n`;
}

export function briefPreviewCanvasColor(kind: BriefKind): string {
  return kind === "ai" ? "#0b1020" : "#ffffff";
}

export function briefRoute(
  kind: BriefKind,
  format: "html" | "markdown",
  date: string,
): string {
  return `/api/briefs/${kind}/${format}/${encodeURIComponent(date)}`;
}

export function filterBriefs(briefs: BriefEntry[], query: string): BriefEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return briefs;
  return briefs.filter((brief) => brief.date.toLowerCase().includes(normalized));
}

export const BRIEF_DATE_PAGE_SIZE = 5;

export function paginateBriefs(briefs: BriefEntry[], page: number, pageSize = BRIEF_DATE_PAGE_SIZE): BriefEntry[] {
  const safePage = Math.max(0, Math.floor(page));
  return briefs.slice(safePage * pageSize, safePage * pageSize + pageSize);
}

export function adjacentBriefDate(
  briefs: BriefEntry[],
  currentDate: string,
  direction: "newer" | "older",
): BriefEntry | null {
  const currentIndex = briefs.findIndex((brief) => brief.date === currentDate);
  if (currentIndex < 0 || briefs.length === 0) return null;
  // Date navigation is a ring: reaching either archive boundary continues at the other end.
  const offset = direction === "older" ? 1 : -1;
  const targetIndex = (currentIndex + offset + briefs.length) % briefs.length;
  return briefs[targetIndex] ?? null;
}

export function briefHtmlDownloadName(kind: BriefKind, date: string): string {
  return `BRIEFS-${kind === "ai" ? "AI" : "STOCKS"} - ${date}.html`;
}

export function briefDownloadName(kind: BriefKind, date: string): string {
  const stem = kind === "ai" ? "AI Morning Brief" : "Stock Brief";
  return `${stem} - ${date}.md`;
}

export function isBriefPlayerShortcut(key: string): boolean {
  return [" ", "Spacebar", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(key);
}

/** Reserved player keys remain global unless the user is editing text. */
export function isBriefPlayerTextEditingTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  return Boolean((target as Element).closest('input:not([type="range"]), textarea, select, [contenteditable="true"]'));
}

export function focusBriefPreview(iframe: HTMLIFrameElement): void {
  iframe.focus();
  iframe.contentWindow?.focus();
}
