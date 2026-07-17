# BRIEFS-STOCKS V56 — Correct Live Asset Verification

Uses the exact V52 baseline and V55 candidate, replacing only the faulty post-build live-index parser. It waits for port shutdown, parses the served index from a file, downloads the discovered live bundle, verifies stable candidate markers, and restarts only the isolated preview port.
