# Hermes Three-Gold Production Final V1

Pinned authorities: Briefs-AI V34, Briefs-Stocks V34, and Git Watch Revision 52.

## Safety order

1. Run `2_VERIFY_PACKAGE.command`.
2. Run `3_READ_ONLY_AUDIT.command`.
3. Use `4_CANDIDATE_INSTALL.command` only with explicit disposable root variables.
4. Complete browser, restart, persistence, isolation, and rollback gates.
5. Only then run `5_INSTALL_PRODUCTION.command`.
6. Run `6_VERIFY_INSTALLED.command` after restart.

The installer backs up dashboard source/build (including `App.tsx`), `web_server.py`, profile config, Git Watch state/runtime, materializers, launch-root mirror, and the prior production-system root. It preserves complete existing Briefs APIs, or inserts the pinned API block only when the contract is absent; partial states fail closed. Briefs navigation is preserved unchanged when already compliant, migrated only from an audited whole-file `App.tsx` hash, and rejected for every unknown noncompliant variant.

Git Watch launch-root ownership is profile-guarded. A conflicting profile owner or conflicting unowned data stops before mutation. Set `THREE_GOLD_MANAGE_LAUNCH_ROOT=0` only when Hermes is known to discover profile plugins directly.

Gold masters are immutable authorities. Live state remains separate. The package does not need its download/extraction location after installation. Scheduler rewiring is deliberately not performed by these commands.
