#!/usr/bin/env python3
from pathlib import Path
import csv,io,json,re

ROOT=Path(__file__).resolve().parent
DATES=['2026-07-15','2026-07-16','2026-07-17','2026-07-18','2026-07-20']
HEADER=['Brief Date','Position','Ticker','Purchase Date','Shares','Purchased Price','Current Price','Price Difference','Cost Basis','Current Value','Gain Loss','Position Return Percent','Agent']

def require(ok,msg):
    if not ok: raise SystemExit('STOCKS_V34_SPLIT_VERIFY=FAIL: '+msg)

exports=ROOT/'EXPORTS'
expected={*(f'BRIEFS-STOCKS - {d}.html' for d in DATES),*(f'Stock Brief - {d}.md' for d in DATES),*(f'Stock Portfolio - {d}.csv' for d in DATES)}
actual={p.name for p in exports.iterdir() if p.is_file()}
require(actual==expected,f'export set differs: missing={sorted(expected-actual)} extra={sorted(actual-expected)}')
for d in DATES:
    text=(exports/f'BRIEFS-STOCKS - {d}.html').read_text()
    styles=re.findall(r'<style[^>]*>(.*?)</style>',text,re.I|re.S)
    scripts=re.findall(r'<script[^>]*>(.*?)</script>',text,re.I|re.S)
    require(len(styles)==4,f'{d}: expected 4 inline style blocks')
    require(len(scripts)==3,f'{d}: expected 3 inline script blocks')
    require(all(s.lstrip().startswith('/* GOLD MASTER STYLE:') and 'Purpose:' in s and 'Restore notes:' in s for s in styles),f'{d}: style documentation incomplete')
    require(all(s.lstrip().startswith('/* GOLD MASTER CONTROLLER:') and all(k in s for k in ('Purpose:','State:','Inputs:','Outputs:','Dependencies:','Restore notes:')) for s in scripts),f'{d}: controller documentation incomplete')
    require('<script src' not in text and 'rel="stylesheet"' not in text,f'{d}: external dependency found')
    require('Content-Security-Policy' in text and "connect-src 'none'" in text,f'{d}: offline CSP missing')
    for sibling in DATES:
        require(f'BRIEFS-STOCKS - {sibling}.html' in text,f'{d}: sibling navigation missing {sibling}')
    md=(exports/f'Stock Brief - {d}.md').read_text()
    require('<style' not in md and '<script' not in md,f'{d}: Markdown is not semantic-only')
    require('V34 SEMANTIC EXPORT' in md,f'{d}: Markdown provenance marker missing')
    raw=(exports/f'Stock Portfolio - {d}.csv').read_bytes()
    require(b'\r\n' in raw,f'{d}: CSV CRLF rows missing')
    rows=list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
    require(rows and list(rows[0])==HEADER,f'{d}: CSV schema differs')
    require(all(r['Agent']=='HERMES' for r in rows),f'{d}: CSV Agent differs')
audit=json.loads((ROOT/'BYTE_IDENTITY_AUDIT.json').read_text())
require(audit.get('passed') is True and audit.get('comparison_count')==35,'byte identity audit is not 35/35')
require(len(list((ROOT/'REFERENCES'/'CANONICAL').glob('*')))==15,'canonical reference count is not 15')
require(len(list((ROOT/'REFERENCES'/'DATA').glob('*.json')))==5,'structured data reference count is not 5')
require((ROOT/'SOURCE-SNAPSHOT'/'dashboard'/'src'/'lib'/'briefs.ts').is_file(),'shared generator source missing')
print('BRIEFS_STOCKS_V34_SPLIT_VERIFY=PASS')
print('HTML=5 MARKDOWN=5 CSV=5 BYTE_IDENTITY=35/35 CYCLIC_NAVIGATION=PASS')
