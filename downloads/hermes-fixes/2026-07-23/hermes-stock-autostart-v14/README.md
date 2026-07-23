# Hermes Dash-CUSTOM Autostart v14

Installs a profile-scoped macOS LaunchAgent for the isolated `local-ai-assist1` dashboard on port 9120. At service start, Brave opens directly to `/brief-stock?profile=local-ai-assist1`. Also installs `~/Applications/Hermes Dash-CUSTOM.app` for later one-click opening.

- Existing managed launcher files are backed up under the profile backup directory.
- Every launcher run creates one fresh BRIEF-STOCK page and closes all older pages in the dedicated Brave debug profile.
- A cold start uses a clean dedicated profile directory, so previous tabs and windows are not restored.
- Normal Brave profiles and windows outside the dedicated port-9222 profile are not modified.
- An unexpected process on port 9120 is never killed; installation fails closed.
- Normal dashboard use does not require `/browser`.
