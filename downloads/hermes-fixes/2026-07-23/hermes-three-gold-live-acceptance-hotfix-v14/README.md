# Hermes Three Gold Live-Acceptance Hotfix v14

This fail-closed hotfix corrects the two issues found during live Mac verification:

1. The Three Gold sidebar heading renders literal `CUSTOM`.
2. Dashboard plugin discovery is explicitly scoped to the profile in `?profile=` and refetches when that profile changes. Profile/generation guards synchronously mask stale plugin UI on the profile-changing render, reject stale manifests and delayed same-name registrations, and clear old plugin scripts, CSS, components, and registry state before the new profile becomes active.

## Scope

Only these production paths are managed:

- `web/src/App.tsx`
- `web/src/lib/api.ts`
- `web/src/lib/api.test.ts`
- `web/src/plugins/usePlugins.ts`
- `web/src/plugins/usePlugins.test.ts`
- `web/src/plugins/registry.ts`
- rebuilt `hermes_cli/web_dist`

Brief archives, Git Watch data, plugins, config, cron jobs, credentials, and the prior production backups are untouched.

## Safety

- Exact predecessor hashes are required.
- Package checksums reject missing, altered, and unledgered files.
- A hashed rollback backup is created before mutation.
- Backup validation requires complete coverage of every managed path and fails before deletion on missing or corrupted state.
- Signal-triggered failures retain their nonzero status (`130`/`143`) after rollback.
- TypeScript, all web tests, production build, source hashes, and built-bundle contracts must pass.
- Any failure triggers automatic rollback.
- The backup includes a self-contained `RESTORE_THIS_BACKUP.command`.

Run `VERIFY.command`, then `INSTALL.command` after stopping the dashboard process.

## Required dashboard start mode

Use the exact isolated command printed by the installer. For this installation:

```bash
cd /Users/jb3/.hermes/hermes-agent && ./venv/bin/python -m hermes_cli.main -p local-ai-assist1 dashboard --isolated --port 9120 --no-open
```

`--isolated` is required for Git Watch because plugin backend routers are mounted from the process profile at startup. The normal named-profile `dashboard` command re-executes into the machine/default dashboard; that mode can discover the Git Watch frontend after profile selection but does not mount the profile-local backend router.
