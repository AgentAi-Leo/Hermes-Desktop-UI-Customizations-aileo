# BRIEFS-STOCKS V72 — Current-State Bridge

Corrected fail-closed installer bridge for the isolated BRIEFS-STOCKS preview on port `9120`.

## Why V72 exists

The V71 download was valid but rejected the Mac before modification because its guard expected an earlier source pair. The Mac reported this authoritative current pair:

- `briefs.ts`: `507a64efe6af752acc0e6a2b3744e43de13b324b92e146fb2e4f7224539efdc2`
- `BriefsPage.tsx`: `c2ed9653b71c0136abc14414058bbd241b80b47cda69e54f8a23c48643a8b245`

V72 accepts exactly that pair or the canonical installed candidate pair for an idempotent rerun. No broad hash bypass is used.

## Installed result

The payload is the validated V71 company-above-ticker UI:

```text
THE WALT DISNEY CO.
DIS

APPLE INC.
AAPL
```

The same hierarchy is present in live Stock rows, standalone HTML exports, and Markdown exports. Yellow row-date pills, five metrics including Volume, exact viewport-coordinate date navigation, fullscreen, and the populated Portfolio Position Comparison remain intact. CSV remains unchanged.

## Candidate hashes

- `briefs.ts`: `9eaf3b2148d3906ca89b50567fd909f71413b6611e1a5ac1e3d7dd85686ccd59`
- `BriefsPage.tsx`: `c2ed9653b71c0136abc14414058bbd241b80b47cda69e54f8a23c48643a8b245`

## Verification

```text
SOURCE_STATE_BEFORE=exact-current-mac-pair
FOCUSED_TESTS=47/47
TYPECHECK=PASS
PRODUCTION_BUILD=PASS
IDEMPOTENT_RERUN=PASS
CONTROLLED_FAILURE_ROLLBACK=PASS
DIST_ROLLBACK=PASS
```

Production port `9119`, Gateway, BRIEFS-AI, and host Hermes source are outside this installer’s scope.
