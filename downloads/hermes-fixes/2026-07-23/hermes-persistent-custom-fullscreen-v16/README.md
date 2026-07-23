# Hermes persistent CUSTOM fullscreen v16

Adds one stable fullscreen shell around the dashboard route outlet.

- Enter toggles fullscreen for any visible CUSTOM route when focus is not in an editor.
- `1` through `9` continue switching visible CUSTOM tabs while fullscreen remains active.
- BRIEFS-AI and BRIEF-STOCK fullscreen controls now target the persistent shell, not their replaceable iframe.
- GIT WATCH receives a shared fullscreen control without modifying its finalized plugin/template.
- Brief iframe message sources are validated before fullscreen or navigation is accepted.
- Existing Brief audio, dates, export controls, Stock Position Comparison, and Git Watch data/template are unchanged.

The installer accepts v14, the uninstalled v15 intermediate, or v16 itself; backs up eight source paths plus `web_dist`; supports absent new files; runs focused/full tests, typecheck, production build, built-contract verification, LaunchAgent restart, and emits a rollback command.
