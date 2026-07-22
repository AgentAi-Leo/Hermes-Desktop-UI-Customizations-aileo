# Briefs-Stocks gold-master templates V34

This is the Stocks-only packaging split of the sealed combined V34 release. It is **not a new template version**.

## Contents

- `EXPORTS/`: five self-contained HTML gold masters, five semantic Markdown companions, and five data-only Position Comparison CSVs.
- `REFERENCES/CANONICAL/`: the five sealed HTML, Markdown, and CSV source references.
- `REFERENCES/DATA/`: five structured Stocks source payloads.
- `SOURCE-SNAPSHOT/`: exact shared V34 dashboard generator files plus Stocks materializer/renderer/quote-collector sources.
- `BYTE_IDENTITY_AUDIT.json`: proves all 35 copied exports/references match the combined V34 bytes.
- `CHECKSUMS.sha256`: package integrity manifest.

## Offline use

Keep the five HTML files together in `EXPORTS/`. Their date navigation is cyclic and uses sibling files only. Each HTML contains all required CSS and JavaScript inline and has no dependency on `_BRIEFS-DASHBOARD-V3-PREVIEW`, a dashboard host, or the network.

Markdown is intentionally semantic-only. CSV is intentionally data-only and retains the exact schema, CRLF rows, and `Agent=HERMES` values. The companion HTML owns accepted presentation and interaction.

## Verify

Double-click `VERIFY_BRIEFS_STOCKS_V34.command`. It checks package checksums, exact export inventory, inline gold-master documentation, offline CSP, five-date cyclic navigation, Markdown/CSV contracts, reference counts, source presence, and the 35/35 byte-identity audit.

## Provenance

The shared generator source naturally contains both AI and Stocks generator code. It is copied unchanged so this packaging split does not create a divergent source variant. Production and the combined V34 package remain untouched.
