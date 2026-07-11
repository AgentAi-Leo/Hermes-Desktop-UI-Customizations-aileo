# Maintainer Notes

This release was generated from a private local snapshot and converted into public patches.

Source snapshot name:

```txt
2026-07-11-current-working-ui
```

Recorded Hermes Desktop baseline:

```txt
b9b463f3bd6517b76687d9b3c9dea1e62f01f9e1
```

The public package was generated with a staged workflow:

```txt
ui-01-customizations-snapshot  -> local/private exact snapshot
ui-02-customizations-share     -> public package with patches, scripts, docs
ui-03-customizations-load      -> future loader skill, not part of this release
```

Validation performed before publishing:

```txt
1. create local/private snapshot
2. validate snapshot status against current working tree
3. stage public package
4. generate patches from a clean same-commit baseline
5. validate package for public-readiness
6. create temporary clean checkout at the same baseline commit
7. run installer --dry-run
8. run installer --apply
9. run verify script
10. run rollback script
11. confirm source tree returned clean except backup folder
```

The public README intentionally keeps these workflow details out of the opening section because most public users only need features, install, verify, rollback, and compatibility information.
