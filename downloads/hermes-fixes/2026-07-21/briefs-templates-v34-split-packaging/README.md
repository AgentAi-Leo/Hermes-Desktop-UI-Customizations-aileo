# Briefs V34 split packaging

These are packaging-only splits of the sealed V34 gold-master release. They do not introduce a new template version and do not change any export, canonical reference, or shared source bytes.

## AI

`BRIEFS-AI-GOLD-MASTER-TEMPLATES-V34.zip`

- Five self-contained HTML gold masters.
- Five semantic Markdown companions.
- AI canonical references and structured data.
- Relevant shared generator and AI materializer source snapshot.
- Stream-specific README, byte-identity audit, checksum manifest, and verifier.

## Stocks

`BRIEFS-STOCKS-GOLD-MASTER-TEMPLATES-V34.zip`

- Five self-contained HTML gold masters.
- Five semantic Markdown companions.
- Five data-only Position Comparison CSVs.
- Stocks canonical references and structured data.
- Relevant shared generator and Stocks materializer/quote source snapshot.
- Stream-specific README, byte-identity audit, checksum manifest, and verifier.

## Verification

- Combined V34 source package: 119/119 checksums.
- Split AI copy audit: 25/25 byte-identical exports/references.
- Split Stocks copy audit: 35/35 byte-identical exports/references.
- Extracted direct exports: 25/25 byte-identical to combined V34.
- AI package: 42/42 checksums and embedded verifier pass.
- Stocks package: 55/55 checksums and embedded verifier pass.
- Clean extracted command modes: `0755`.
- Clean extracted offline Chromium navigation: 7/7.

The five sibling HTML files in each ZIP must remain together to preserve cyclic offline date navigation. Neither split depends on `_BRIEFS-DASHBOARD-V3-PREVIEW`.
