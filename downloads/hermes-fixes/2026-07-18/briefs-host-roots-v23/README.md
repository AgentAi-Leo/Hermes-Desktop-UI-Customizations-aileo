# Briefs host-root migration V23

This focused package removes the two Brief archive symlinks and makes the established Mac `zDownloads` paths real directories:

- `~/.hermes/zDownloads/__AI-DAILY-BRIEFS`
- `~/.hermes/zDownloads/_STOCK-BRIEFS`

It preserves only the newest five complete dated archives in each new root, retains the old Docker targets unchanged for rollback, updates the deterministic materializer defaults to the real Mac roots, bumps its checkpoint schema to 4, repairs optional `env_loader.py` status writes so a closed `stderr` cannot abort cron initialization, restarts only the `local-ai-assist1` gateway, and verifies the resulting primary roots.

The installer fails closed when either archive is not the expected legacy symlink, when no valid dated artifacts exist, when `env_loader.py` already has uncommitted changes, or when any checksum/test/restart/read-back probe fails. A failure after cutover restores both original links and source files automatically.

## Install

Double-click `INSTALL_BRIEFS_HOST_ROOTS_V23.command`, or run it in Mac Terminal. Successful output ends with:

```text
BRIEFS_HOST_ROOTS_V23_INSTALL=PASS
ROOTS=REAL_MAC_DIRECTORIES
MATERIALIZER_SCHEMA=4
CLOSED_STDERR_PROBE=PASS
OLD_DOCKER_TARGETS=RETAINED
```

Keep the printed backup and rollback paths until one later unattended AI and Stock cycle has succeeded.
