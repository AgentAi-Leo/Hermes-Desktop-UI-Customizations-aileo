#!/usr/bin/env python3
"""Strict data validation and deterministic Brief rendering (stdlib only)."""
from __future__ import annotations

import csv
import hashlib
import html
import io
import json
import re
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

PACKAGE_ROOT = Path(__file__).resolve().parent
LA = ZoneInfo("America/Los_Angeles")
TRACKED = ["AAPL", "AMZN", "NVDA", "SNAP", "GOOGL", "MSFT", "DIS"]
AI_VERSION = "ai-brief-data-v1"
STOCK_VERSION = "stock-brief-data-v1"


class ContractError(ValueError):
    pass


@dataclass(frozen=True)
class RenderedBrief:
    date: str
    html: str
    markdown: str
    csv: str | None
    source_sha256: str


def _exact_keys(value: dict, required: set[str], where: str) -> None:
    missing = required - value.keys()
    extra = value.keys() - required
    if missing or extra:
        raise ContractError(f"{where}: missing={sorted(missing)} extra={sorted(extra)}")


def _text(value: object, where: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ContractError(f"{where}: expected a non-empty string")
    if "\x00" in value:
        raise ContractError(f"{where}: NUL is forbidden")
    return value.strip()


def _https(value: object, where: str, host: str | None = None) -> str:
    text = _text(value, where)
    parsed = urlparse(text)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ContractError(f"{where}: expected an https URL")
    if host and parsed.hostname != host:
        raise ContractError(f"{where}: expected host {host}")
    return text


def _base(payload: dict, version: str, kind: str) -> None:
    if payload.get("contract_version") != version or payload.get("kind") != kind:
        raise ContractError("contract_version/kind mismatch")
    try:
        parsed_date = date.fromisoformat(_text(payload.get("date"), "date"))
    except ValueError as exc:
        raise ContractError("date: expected YYYY-MM-DD") from exc
    if payload.get("timezone") != "America/Los_Angeles":
        raise ContractError("timezone must be America/Los_Angeles")
    try:
        generated = datetime.fromisoformat(_text(payload.get("generated_at"), "generated_at"))
    except ValueError as exc:
        raise ContractError("generated_at: expected ISO-8601") from exc
    if generated.tzinfo is None or generated.astimezone(LA).date() != parsed_date:
        raise ContractError("generated_at must resolve to payload date in America/Los_Angeles")


def validate_ai(payload: object) -> dict:
    if not isinstance(payload, dict):
        raise ContractError("AI payload must be an object")
    _exact_keys(payload, {"contract_version", "kind", "date", "timezone", "generated_at", "founder_takeaways", "topics"}, "AI payload")
    _base(payload, AI_VERSION, "ai")
    takeaways = payload["founder_takeaways"]
    topics = payload["topics"]
    if not isinstance(takeaways, list) or not 5 <= len(takeaways) <= 7:
        raise ContractError("founder_takeaways must contain five through seven items")
    if not isinstance(topics, list) or not 5 <= len(topics) <= 7:
        raise ContractError("topics must contain five through seven items")
    if len(takeaways) != len(topics):
        raise ContractError("founder_takeaways and topics must contain the same number of items")
    for index, item in enumerate(takeaways, 1):
        if not isinstance(item, dict):
            raise ContractError(f"founder_takeaways[{index}] must be an object")
        _exact_keys(item, {"headline", "detail"}, f"founder_takeaways[{index}]")
        _text(item["headline"], f"founder_takeaways[{index}].headline")
        _text(item["detail"], f"founder_takeaways[{index}].detail")
    topic_keys = {"number", "headline", "summary", "why_it_matters", "actionable_implication", "sources"}
    for index, item in enumerate(topics, 1):
        if not isinstance(item, dict):
            raise ContractError(f"topics[{index}] must be an object")
        _exact_keys(item, topic_keys, f"topics[{index}]")
        if item["number"] != index:
            raise ContractError("topic numbers must be sequential from 1 in source order")
        for field in ("headline", "summary", "why_it_matters", "actionable_implication"):
            _text(item[field], f"topics[{index}].{field}")
        if not isinstance(item["sources"], list) or not item["sources"]:
            raise ContractError(f"topics[{index}].sources must be non-empty")
        for source_index, source in enumerate(item["sources"], 1):
            if not isinstance(source, dict):
                raise ContractError("source must be an object")
            _exact_keys(source, {"label", "url"}, f"topics[{index}].sources[{source_index}]")
            _text(source["label"], "source.label")
            _https(source["url"], "source.url")
    return payload


_MONEY = re.compile(r"^\$[0-9][0-9,]*\.[0-9]{2}$")
_CHANGE = re.compile(r"^[+-]\$[0-9][0-9,]*\.[0-9]{2}$")
_PERCENT = re.compile(r"^[+-][0-9][0-9,]*\.[0-9]{2}%$")
_VOLUME = re.compile(r"^[0-9][0-9,]*$")


def validate_stock(payload: object) -> dict:
    if not isinstance(payload, dict):
        raise ContractError("Stock payload must be an object")
    _exact_keys(payload, {"contract_version", "kind", "date", "timezone", "generated_at", "quotes"}, "Stock payload")
    _base(payload, STOCK_VERSION, "stock")
    quotes = payload["quotes"]
    if not isinstance(quotes, list) or len(quotes) != 7:
        raise ContractError("quotes must contain exactly seven items")
    quote_keys = {"ticker", "company", "current_price", "daily_change", "daily_change_percent", "day_high", "day_low", "fifty_two_week_high", "fifty_two_week_low", "volume", "source_label", "source_url"}
    tickers = []
    for index, quote in enumerate(quotes, 1):
        if not isinstance(quote, dict):
            raise ContractError(f"quotes[{index}] must be an object")
        _exact_keys(quote, quote_keys, f"quotes[{index}]")
        ticker = _text(quote["ticker"], f"quotes[{index}].ticker")
        tickers.append(ticker)
        if ticker not in TRACKED:
            raise ContractError(f"unexpected ticker {ticker}")
        _text(quote["company"], f"quotes[{index}].company")
        for field in ("current_price", "day_high", "day_low", "fifty_two_week_high", "fifty_two_week_low"):
            if not _MONEY.fullmatch(_text(quote[field], f"quotes[{index}].{field}")):
                raise ContractError(f"quotes[{index}].{field}: expected $0.00 display format")
        if not _CHANGE.fullmatch(_text(quote["daily_change"], f"quotes[{index}].daily_change")):
            raise ContractError("daily_change: expected signed dollar display format")
        if not _PERCENT.fullmatch(_text(quote["daily_change_percent"], f"quotes[{index}].daily_change_percent")):
            raise ContractError("daily_change_percent: expected signed percent display format")
        if not _VOLUME.fullmatch(_text(quote["volume"], f"quotes[{index}].volume")):
            raise ContractError("volume: expected digits and commas")
        if quote["source_label"] != "Yahoo Finance":
            raise ContractError("source_label must be Yahoo Finance")
        source = _https(quote["source_url"], "source_url", "finance.yahoo.com")
        if f"/quote/{ticker}" not in urlparse(source).path:
            raise ContractError(f"source_url does not match {ticker}")
    if tickers != TRACKED:
        raise ContractError(f"quotes must use canonical order {TRACKED}")
    return payload


def canonical_json(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _sha(payload: dict) -> str:
    return hashlib.sha256(canonical_json(payload).encode()).hexdigest()


def _human_date(value: str) -> str:
    return date.fromisoformat(value).strftime("%B %-d, %Y")


def _stock_human_date(value: str) -> str:
    parsed = date.fromisoformat(value)
    return f'{parsed.strftime("%B %-d, %Y")} - {parsed.strftime("%a")}.'


def _esc(value: object) -> str:
    return html.escape(str(value), quote=True)


AI_CSS = """
:root{color-scheme:dark;--bg:#0b1020;--card:#121a33;--text:#eef3ff;--muted:#aab6d3;--accent:#8bd3ff;--line:#263456;--hot:#ffd166}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg)}body{color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:24px;line-height:1.5}main{width:100%;padding:24px clamp(18px,4vw,64px) 56px}.hero{padding:28px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(135deg,#182345,#10182f)}.pill{display:inline-block;padding:9px 20px;border-radius:999px;background:var(--hot);color:var(--bg);font-size:21px;font-weight:900}.hero h1{margin:16px 0 4px;font-size:64px;line-height:1.05}.date{margin:0;color:var(--accent)}.takeaways{margin:12px 0;padding:22px 26px;background:var(--card);border:1px solid var(--line);border-radius:18px}.takeaways h2{margin:0 0 20px;color:var(--hot);font-size:38px}.takeaways li{margin:0 0 22px}.takeaways li::marker,.takeaways strong{color:var(--accent)}.takeaways strong{display:block;font-size:34px;line-height:1.16}.takeaway-detail{display:block;margin-top:7px;font-size:27px;line-height:1.34}.topics{display:grid;gap:18px;margin-top:22px}.card{padding:24px;background:rgba(18,26,51,.55);border:1px solid var(--line);border-radius:18px}.card h2{margin:0 0 16px;color:var(--hot);font-size:34px}.card p{margin:12px 0;font-size:23px;line-height:1.52}.label,a{color:var(--accent)}.label{font-weight:750}.sources{color:var(--muted);font-size:20px!important}@media(max-width:720px){body{font-size:20px}.hero h1{font-size:42px}.takeaways,.card{padding:22px}.takeaways h2,.card h2{font-size:30px}.takeaways strong{font-size:26px}.takeaway-detail,.card p{font-size:20px}}
""".strip()


STOCK_CSS = """
:root{color-scheme:dark;--bg:#0b1020;--panel:#111827;--text:#eef3ff;--muted:#aab8ca;--line:#334155;--yellow:#ffd166;--cyan:#67e8f9;--up:#4ade80;--down:#fb7185}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text)}body{padding:32px 28px 64px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.hero{padding:28px;border:1px solid #263456;border-radius:22px;background:linear-gradient(135deg,#182345,#10182f)}.pill{display:inline-block;margin-bottom:18px;padding:10px 22px;border-radius:999px;background:var(--yellow);color:var(--bg);font-size:22px;font-weight:800}.heading{display:flex;justify-content:space-between;gap:28px}.hero h1{margin:0;font-size:64px;line-height:1.05}.date{color:var(--cyan);font-size:27px}.summary{text-align:right;font-variant-numeric:tabular-nums}.summary-label{display:block;color:var(--yellow);font-size:22px;font-weight:850;letter-spacing:.08em}.summary-value{display:block;font-size:64px;line-height:1.05}.positive{color:var(--up)}.negative{color:var(--down)}.portfolio{margin:18px 0 22px;padding:18px;border:1px solid rgba(138,180,255,.45);border-radius:14px;background:rgba(10,24,42,.72)}.portfolio h2{margin:0 0 4px;color:var(--yellow)}.table-wrap{overflow-x:auto}table{width:100%;min-width:1200px;border-collapse:collapse;font-variant-numeric:tabular-nums}th,td{padding:8px 9px;border-bottom:1px solid rgba(255,255,255,.12);text-align:right;white-space:nowrap}th:first-child,td:first-child{text-align:left}.grid{display:flex;flex-direction:column;gap:10px}.stock-row{display:grid;grid-template-columns:minmax(220px,1.45fr) repeat(5,minmax(95px,1fr));align-items:center;gap:14px;padding:16px 18px;border:1px solid var(--line);border-radius:16px;background:var(--panel)}.ticker{display:block;color:var(--yellow);font-size:31px;font-weight:850}.company{display:block;color:var(--text);font-size:18px}.price{display:block;font-size:27px;font-weight:850}.movement{display:block;font-size:18px;font-weight:760}.metric span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase}.metric strong{font-size:16px}a{color:var(--cyan)}@media(max-width:900px){.heading{flex-direction:column}.summary{text-align:left}.hero h1,.summary-value{font-size:48px}.stock-row{grid-template-columns:1fr 1fr}}
""".strip()


def _portfolio(payload: dict):
    lots = json.loads((PACKAGE_ROOT / "config" / "portfolio-lots.json").read_text())
    prices = {quote["ticker"]: float(quote["current_price"].replace("$", "").replace(",", "")) for quote in payload["quotes"]}
    rows = []
    total_basis = total_value = 0.0
    for lot in lots:
        basis = lot["shares"] * lot["purchase_price"]
        value = lot["shares"] * prices[lot["ticker"]]
        gain = value - basis
        total_basis += basis
        total_value += value
        rows.append({**lot, "current_price": prices[lot["ticker"]], "basis": basis, "value": value, "gain": gain, "return": gain / basis * 100})
    rows.sort(key=lambda row: row["gain"], reverse=True)
    total_gain = total_value - total_basis
    return rows, total_basis, total_value, total_gain, total_gain / total_basis * 100


def _money(value: float) -> str:
    return f"${value:,.2f}"


def _signed_money(value: float) -> str:
    return f"{'+' if value >= 0 else '-'}${abs(value):,.2f}"


def _signed_percent(value: float) -> str:
    return f"{'+' if value >= 0 else ''}{value:.2f}%"


def render_ai(payload: object) -> RenderedBrief:
    data = validate_ai(payload)
    human = _human_date(data["date"])
    takeaways = "".join(f'<li><strong>{_esc(item["headline"])}</strong><span class="takeaway-detail">{_esc(item["detail"])}</span></li>' for item in data["founder_takeaways"])
    topics = []
    for item in data["topics"]:
        links = " · ".join(f'<a href="{_esc(source["url"])}">{_esc(source["label"])}</a>' for source in item["sources"])
        topics.append(f'<article class="card" data-brief-topic="{item["number"]}"><h2>{item["number"]}. {_esc(item["headline"])}</h2><p><span class="label">Summary:</span> {_esc(item["summary"])}</p><p><span class="label">Why it matters for founders/operators:</span> {_esc(item["why_it_matters"])}</p><p><span class="label">Actionable implication:</span> {_esc(item["actionable_implication"])}</p><p class="sources"><span class="label">Sources:</span> {links}</p></article>')
    html_doc = f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="hermes-contract-version" content="{AI_VERSION}"><title>AI Morning Brief — {human}</title><style>{AI_CSS}</style></head><body><main><header class="hero"><span class="pill">{human}</span><h1>AI Morning Brief</h1><p class="date">{human} · America/Los_Angeles</p></header><section class="takeaways"><h2>FOUNDER TAKEAWAYS</h2><ol>{takeaways}</ol></section><section class="topics" aria-label="Seven AI news topics">{"".join(topics)}</section></main></body></html>\n'
    lines = ["# AI Morning Brief", "", f"**Date:** {human}  ", "**Timezone:** America/Los_Angeles  ", f"**Contract:** {AI_VERSION}", "", "## FOUNDER TAKEAWAYS", ""]
    for item in data["founder_takeaways"]:
        lines += [f'### {item["headline"]}', "", item["detail"], ""]
    for item in data["topics"]:
        lines += [f'## {item["number"]}. {item["headline"]}', "", f'**Summary:** {item["summary"]}', "", f'**Why it matters for founders/operators:** {item["why_it_matters"]}', "", f'**Actionable implication:** {item["actionable_implication"]}', ""]
        lines += ["**Sources:** " + " · ".join(f'[{source["label"]}]({source["url"]})' for source in item["sources"]), ""]
    return RenderedBrief(data["date"], html_doc, "\n".join(lines).rstrip() + "\n", None, _sha(data))


def render_stock(payload: object) -> RenderedBrief:
    data = validate_stock(payload)
    human = _stock_human_date(data["date"])
    # The renderer is presentation-only: never infer market state or rewrite JSON quote fields.
    display_quotes = data["quotes"]
    rows, total_basis, total_value, total_gain, total_return = _portfolio(data)
    total_class = "positive" if total_gain >= 0 else "negative"
    portfolio_rows = "".join(f'<tr><td><strong>{_esc(row["label"])} · {_esc(row["ticker"])}</strong><br><small>{_esc(row["purchased"])}</small></td><td>{row["shares"]:,}</td><td>{_money(row["purchase_price"])}</td><td>{_money(row["current_price"])}</td><td class="{"positive" if row["current_price"]-row["purchase_price"] >= 0 else "negative"}">{_signed_money(row["current_price"]-row["purchase_price"])}</td><td>{_money(row["basis"])}</td><td>{_money(row["value"])}</td><td class="{"positive" if row["gain"] >= 0 else "negative"}">{_signed_money(row["gain"])}</td><td class="{"positive" if row["gain"] >= 0 else "negative"}">{_signed_percent(row["return"])}</td></tr>' for row in rows)
    quote_rows = []
    for quote in display_quotes:
        change_class = "positive" if quote["daily_change"].startswith("+") else "negative"
        metrics = [("Day High", quote["day_high"]), ("Day Low", quote["day_low"]), ("52-week High", quote["fifty_two_week_high"]), ("52-week Low", quote["fifty_two_week_low"]), ("Volume", quote["volume"])]
        metric_html = "".join(
            f'<div class="metric"><span>{_esc(label)}</span><strong>{_esc(value)}</strong></div>'
            for label, value in metrics
        )
        arrow = "▲" if change_class == "positive" else "▼"
        quote_rows.append(f'<article class="stock-row" data-ticker="{quote["ticker"]}"><div><a class="ticker" href="{_esc(quote["source_url"])}">{quote["ticker"]}</a><span class="company">{_esc(quote["company"])}</span><strong class="price {change_class}">{quote["current_price"]}</strong><span class="movement {change_class}">{arrow} {quote["daily_change"]} ({quote["daily_change_percent"]})</span></div>{metric_html}</article>')
    html_doc = f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="hermes-contract-version" content="{STOCK_VERSION}"><title>Stock Brief — {human}</title><style>{STOCK_CSS}</style></head><body><header class="hero"><span class="pill">{human}</span><div class="heading"><div><h1>Stock Brief</h1><p class="date">{human} · America/Los_Angeles</p></div><div id="hermes-stock-portfolio-summary" class="summary"><span class="summary-label">SUMMARY</span><strong class="summary-value {total_class}">{_signed_money(total_gain)}</strong></div></div></header><section class="portfolio" aria-label="Portfolio Position Comparison"><h2>Portfolio Position Comparison</h2><p>Daily prices compared with purchase lots. Precise basis uses shares × purchased price.</p><div class="table-wrap"><table><thead><tr><th>Position</th><th>Shares</th><th>Purchased price</th><th>Current price</th><th>+/-</th><th>Cost basis</th><th>Current value</th><th>Gain / loss</th><th>Return</th></tr></thead><tbody>{portfolio_rows}</tbody><tfoot><tr><td colspan="5">Available-position total</td><td>{_money(total_basis)}</td><td>{_money(total_value)}</td><td class="{total_class}">{_signed_money(total_gain)}</td><td class="{total_class}">{_signed_percent(total_return)}</td></tr></tfoot></table></div></section><main class="grid" aria-label="Tracked stock quote rows">{"".join(quote_rows)}</main></body></html>\n'
    lines = ["# Stock Brief", "", f"**Date:** {human}  ", "**Timezone:** America/Los_Angeles  ", f"**Contract:** {STOCK_VERSION}", "", "## SUMMARY", "", f"**{_signed_money(total_gain)}**", "", "## Portfolio Position Comparison", "", "| Position | Shares | Purchased price | Current price | +/- | Cost basis | Current value | Gain / loss | Return |", "|---|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for row in rows:
        lines.append(f'| {row["label"]} · {row["ticker"]}<br>{row["purchased"]} | {row["shares"]:,} | {_money(row["purchase_price"])} | {_money(row["current_price"])} | {_signed_money(row["current_price"]-row["purchase_price"])} | {_money(row["basis"])} | {_money(row["value"])} | {_signed_money(row["gain"])} | {_signed_percent(row["return"])} |')
    lines += [f'| **Available-position total** ||||| **{_money(total_basis)}** | **{_money(total_value)}** | **{_signed_money(total_gain)}** | **{_signed_percent(total_return)}** |', ""]
    for quote in display_quotes:
        lines += [f'## {quote["ticker"]}', f'### {quote["company"].upper()}', "", f'Date · {human}', f'Performance · {"▲" if quote["daily_change"].startswith("+") else "▼"} {quote["daily_change"]} ({quote["daily_change_percent"]})', f'Price · {quote["current_price"]}', f'Day High · {quote["day_high"]} · Day Low · {quote["day_low"]} · 52-week High · {quote["fifty_two_week_high"]} · 52-week Low · {quote["fifty_two_week_low"]} · Volume · {quote["volume"]}', f'Source · [{quote["source_label"]}]({quote["source_url"]})', ""]
    csv_buffer = io.StringIO(newline="")
    writer = csv.writer(csv_buffer, lineterminator="\n")
    writer.writerow(["ticker", "current_price", "daily_change", "daily_change_pct", "Agent"])
    for quote in data["quotes"]:
        writer.writerow([quote["ticker"], quote["current_price"], quote["daily_change"], quote["daily_change_percent"], "HERMES"])
    return RenderedBrief(data["date"], html_doc, "\n".join(lines).rstrip() + "\n", csv_buffer.getvalue(), _sha(data))


def render(kind: str, payload: object) -> RenderedBrief:
    if kind == "ai":
        return render_ai(payload)
    if kind == "stock":
        return render_stock(payload)
    raise ContractError(f"unknown kind: {kind}")
