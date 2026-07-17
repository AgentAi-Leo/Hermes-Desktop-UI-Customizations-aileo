# BRIEFS-STOCKS V54 — Correct Preview Target

Corrected fail-closed installer for the isolated BRIEFS dashboard preview.

It patches and builds only:

`~/.hermes/zDownloads/_BRIEFS-DASHBOARD-V3-PREVIEW`

It does not modify `/Users/jb3/.hermes/hermes-agent` source and does not restart production port 9119. The Stock UI candidate itself remains `v53-stock-toolbar-parity`; V54 identifies the corrected installer target.

Validation gates: 40 Brief tests, typecheck, production build, built/live marker checks, automatic rollback, preview port 9120 restart.
