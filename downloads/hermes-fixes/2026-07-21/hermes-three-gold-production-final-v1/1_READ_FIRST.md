# Hermes Three-Gold Production Final V1

Pinned authorities: Briefs-AI V34, Briefs-Stocks V34, and Git Watch Revision 52.

## Safety order

1. Run `2_VERIFY_PACKAGE.command`.
2. Run `3_READ_ONLY_AUDIT.command`.
3. Use `4_CANDIDATE_INSTALL.command` only with explicit disposable root variables.
4. Complete browser, restart, persistence, isolation, and rollback gates.
5. Only then run `5_INSTALL_PRODUCTION.command`.
6. Run `6_VERIFY_INSTALLED.command` after restart.

The installer backs up dashboard source/build (including `App.tsx` and `src/lib/api.ts`), `web_server.py`, profile config, Git Watch state/runtime, materializers, launch-root mirror, and the prior production-system root. It preserves complete existing Briefs server APIs, or inserts the pinned server API block only when the contract is absent; partial states fail closed. Briefs query/hash navigation is migrated only from an audited whole-file `App.tsx` hash. A second exact-byte migration then renders `CUSTOM` first with one `BRIEFS-AI`, one `BRIEF-STOCK`, and the current Git Watch plugin, followed by `HERMES` and the default tabs. It filters the retired `briefs-ai`, `brief-stock`, and `git-comments` plugin identities from frontend navigation/routes, removes only those IDs from `plugins.enabled`, preserves every unrelated enabled ID, and keeps `git-comments-v27-review` enabled. The aggregate sidebar verifier reconstructs and hashes the exact first-stage predecessor, so it proves both navigation stages; every unknown or CRLF-altered source fails closed. The dashboard API type migrates only from the exact pinned production `api.ts` bytes to the exact `generated_at`-hardened successor; every unknown byte variant fails closed and rollback restores all predecessors byte-for-byte.

Git Watch launch-root ownership is profile-guarded. A conflicting profile owner or conflicting unowned data stops before mutation. Set `THREE_GOLD_MANAGE_LAUNCH_ROOT=0` only when Hermes is known to discover profile plugins directly.

Gold masters are immutable authorities. Live state remains separate. The package does not need its download/extraction location after installation. Scheduler rewiring is deliberately not performed by these commands.
