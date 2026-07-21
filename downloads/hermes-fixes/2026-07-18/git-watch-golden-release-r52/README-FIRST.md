# GIT WATCH Golden Release — Revision 52

This ZIP is a clean, independent installation and recovery kit for **GIT WATCH**. It does not install or modify Briefs AI, Briefs Stocks, or the production `git-comments` plugin.

## Which file should I use?

### Normal choice: `1_INSTALL_OR_RESTORE_GIT_WATCH.command`

Double-click this file for a new installation, an update, or a future repair.

- If Git Watch data already exists, it is preserved.
- If no data exists, a clean empty watchlist is created.
- A timestamped recovery backup is created before anything changes.
- If verification fails, the installer automatically restores the prior installation.

### Destructive choice: `2_FACTORY_RESET_GIT_WATCH.command`

Use this only when you deliberately want an empty watchlist and archive.

- It asks you to type `RESET`.
- It creates a full recovery backup first.
- It does not affect Briefs or the production `git-comments` plugin.

### Removal choice: `3_UNINSTALL_GIT_WATCH.command`

Use this to remove only the namespaced Golden Release installation.

- It asks you to type `REMOVE`.
- It creates a full recovery backup first.
- It leaves unrelated Hermes plugins and Briefs untouched.

### Verify before sharing or restoring: `4_VERIFY_GIT_WATCH_PACKAGE.command`

Double-click this file to verify every packaged file against `CHECKSUMS.sha256`. Continue only when the final line says:

```text
GIT_WATCH_GOLDEN_PACKAGE_VERIFICATION=PASS
```

### View-only choice: `GIT-WATCH-OFFLINE-DEMO.html`

Open this file in a browser to view and share a sanitized, self-contained demonstration. It needs no Hermes server, credentials, package installation, external script, font download, or audio file. Backend actions such as Add, Archive, Delete, Retry, and Export are omitted because a standalone file has no Hermes API.

## What is a Hermes profile?

A profile is the separate Hermes workspace/account configuration where the plugin should appear.

- If you have never created a named profile, enter `default`.
- If you use a named profile, enter its exact name when the launcher asks.
- The installer never searches through or changes other profiles.

## After installation

1. Restart Hermes Desktop.
2. Select the same profile you entered during installation.
3. Open the **GIT WATCH** tab.
4. If the tab is not visible, enable the plugin named `git-comments-v27-review` in that profile and restart Hermes Desktop once more.

The internal runtime identity remains `git-comments-v27-review` to preserve the verified Revision 52 behavior. The visible product name is **GIT WATCH**.

## Backups and rollback

Every operation prints a backup path. Each backup contains:

```text
RESTORE_THIS_BACKUP.command
```

Double-click that backup-specific file to put back exactly what existed before that operation. Backups are stored under the selected profile in:

```text
backups/git-watch-golden/
```

Uninstall also keeps a recovery backup, including the removed watchlist and archive data.

## Data behavior

| Operation | Application files | Existing watchlist/archive |
|---|---|---|
| Install or restore | Replaced with frozen Revision 52 | Preserved |
| Factory reset | Replaced with frozen Revision 52 | Replaced with clean empty data |
| Uninstall | Removed | Preserved inside recovery backup |
| Automatic rollback | Restored to prior state | Restored to prior state |

The safe installer never silently converts an ordinary restore into a factory reset.

## Frozen Revision 52 contract

The payload is copied byte-for-byte from the published Revision 52 source anchor:

```text
b09c990e4b19cc18c6932d58e9340c59c77d6e39
```

Locked behavior includes:

- success-popup tracking: `0.040em` (`2.4216px` at `60.54px`);
- success dwell: `2000ms`, followed by the existing `500ms` fade;
- CueLume press master gain: `0.4 → 1.2` (3× amplitude);
- unchanged official CueLume success recipe;
- offline HTML export schema and visual baseline `52`;
- accessible archive viewer, activity disclosure, and hardened links;
- no credentials bundled in the release.

Frozen payload SHA-256 values:

```text
Renderer  3f007932e2d39602147b7f35a26dc402edd64de0b3a1849e3fd06fd1ed4e2d4e
API       c51f72ab253b8f156b1c4955fd4298911e7635cb95790828189098e54f77043c
Checker   73384b045ba96c18ff12eb82f6a5a23455f20e701b287d976ece0443c88df076
Manifest  173768da0abae910be056690f2e219bb581ef76f31dcbbc190e10ab7d5156b8f
```

## Privacy and network behavior

- The package contains no GitHub token, API key, email address, or private watchlist data.
- The live checker accesses GitHub only when Git Watch refreshes watched public or authorized repository items.
- If `GITHUB_TOKEN` or `GH_TOKEN` is already configured in the recipient's Hermes environment, the checker may use it; the installer never asks for or stores that token.
- The offline demonstration makes no network request.

## Advanced terminal usage

Most people should use the numbered launchers. Advanced users can run:

```text
bash scripts/git-watch-golden-manager.sh install --profile PROFILE --owner GITHUB_USERNAME --yes
bash scripts/git-watch-golden-manager.sh factory-reset --profile PROFILE --owner GITHUB_USERNAME --yes
bash scripts/git-watch-golden-manager.sh uninstall --profile PROFILE --yes
```

## Support boundary

This Golden Release installs only the separate namespaced Git Watch candidate. It does not promote or overwrite an existing production `/git-comments` runtime. That separation is intentional: sharing, recovery, and removal remain isolated from Briefs and unrelated dashboard plugins.
