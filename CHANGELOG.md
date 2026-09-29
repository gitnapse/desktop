# Changelog

## Unreleased

Desktop redesign: the app is now a Tauri 2 shell over a pure-Rust bridge with a
React 19 frontend, wired end to end against the `gitnapse` core SDK and the
`api` protocol. Depends on `gitnapse` v0.1.2 (headless feature split,
`auth::TokenSource`, step-wise OAuth device flow, typed `gitnapse::git`,
provider extension) and the `api` Unreleased dashboard surface
(`gitnapse-protocol`, `gitnapse-server`, `gitnapse-client`).

### Added

- **`gitnapse-bridge` crate**: pure Rust, no Tauri or webview dependency, so it
  builds and unit-tests in CI/containers. Modules: `api/client.rs` (typed
  wrapper over `gitnapse-client`), `api/server.rs` (`gitnapse-server` sidecar
  lifecycle), `auth.rs` (token status/store + step-wise OAuth device flow),
  `clone.rs` (`git clone` with parsed `clone://progress` events), `config.rs`
  (clone-dir preference from the shared account config), `dto.rs` (snake_case
  payloads plus re-exported core/protocol DTOs, never redefined) and `git.rs`
  (typed wrappers over `gitnapse::git`). (`bridge/`)

- **Tauri 2 shell with the 87-command frozen contract**: `src-tauri/` registers
  every command from `WORKSPACE.md` §4 and delegates to the bridge; `AppState`
  holds one sidecar manager and one shared API client; per-OS platform commands
  cover `open_in_file_manager` and `open_external`. Local, blocking bridge
  calls run on `spawn_blocking`; remote calls await the shared HTTP client.
  (`src-tauri/src/main.rs`, `src-tauri/src/commands/`, `src-tauri/src/platforms/`)

- **Sidecar lifecycle**: binary resolution `GITNAPSE_SERVER_BIN` → Tauri
  sidecar path → `gitnapse-server` in `PATH` → documented error;
  `ensure_running()` health-checks `GET /health` with retries, spawns
  `gitnapse-server --host 127.0.0.1 --port 8787` when nothing answers and kills
  only processes it started; `GITNAPSE_SERVER_URL` overrides the default.
  (`bridge/src/api/server.rs`)

- **Auth single source of truth**: the token lives in the core secure store
  (same `~/.config/GitNapse` as the CLI/TUI). `auth_set_token` writes it
  in-process, `api_set_token` writes it through the server, and the server
  re-reads the store at runtime; `auth_status` uses the core `TokenSource`
  without returning the secret. (`bridge/src/auth.rs`,
  `bridge/src/api/client.rs`)

- **React 19 + Vite 8 frontend**: TypeScript strict (`noUncheckedIndexedAccess`,
  `verbatimModuleSyntax`), `HashRouter` (immune to custom-protocol serving),
  React Query for server state, lazy routes per view and per repo tab, and
  theme/glass preferences persisted before first paint. `src/lib/bridge.ts` is
  the only module importing Tauri APIs; in a plain browser the same typed calls
  resolve against `src/lib/mock.ts`, which handles all 87 frozen commands.
  (`src/`)

- **xglass × samurai design system**: five-layer glass token contract (three
  levels), typography and monochrome canvas rules, inline `StatusLine`
  feedback, fallbacks for reduced transparency/contrast, forced colors and
  print, plus a contrast contract asserted in tests. Per-surface contrast,
  cost, fallback and platform audit lines are documented in `docs/DESIGN.md`.
  (`src/styles/`, `src/ui/`, `src/lib/contrast.ts`)

- **Full feature set**: dashboard home, global search (repos/users),
  repo explorer (overview, code, commits, branches, compare, issues, pull
  requests, actions, releases), local repo panel (clone, status/diff, log,
  branches, commit/sync, stash, tags, remotes), user profile, settings, OAuth
  device-flow onboarding and the command palette. (`src/app/pages/`,
  `src/features/`)

- **Native window chrome and real icons**: `windowEffects` selects `mica`
  (Windows) or `underWindowBackground` (macOS) with public APIs only; the
  icon set in `src-tauri/icons/` is generated from
  `gitnapse/assets/gitnapse-icon.png`. (`src-tauri/tauri.conf.json`)

- **Tests**: 23 bridge tests and 99 frontend tests (theme, bridge/mock contract,
  search/sort, diff parsing, content decoding, render smoke, contrast);
  underlying coverage from the core (109 library tests) and `api` (40 tests).
  (`bridge/src/`, `src/**/*.test.ts`)

### Changed

- Replaced the previous prototype skeleton (vanilla TypeScript, client per
  command, `git_raw` shell-outs) with the bridge architecture; git results are
  typed DTOs, never parsed stdout, and the command surface grew from ~37 to the
  frozen 87.
- A running `gitnapse-server` is no longer assumed external: the app resolves
  and manages its own sidecar (external servers are left untouched).

### Added — F5 frontend wave

- **Registry-driven themes** (`src/lib/themes.ts`,
  `src/features/themes/`): the `gitnapse/themes` registry is fetched, parsed
  (JSONC, hex or RGB), and mapped onto the token contract. A hue classifier
  distributes the three theme accents across the four status roles (red→error,
  green→success, blue/cyan→info, warm→warning) and `ensureContrast()` raises any
  derived status/ink color to WCAG AA (4.5:1) on the theme's raised surface.
  Monochrome themes fall back to the built-in semantic status colors. The
  selected theme persists in `localStorage`, is applied by the inline boot
  script before first paint, and is picked from a swatch grid in Settings
  (`ThemePicker`). `src/lib/themes.test.ts` covers parsing, distribution and the
  contrast contract.
- **Notifications inbox** (`src/app/pages/NotificationsPage.tsx`,
  `src/app/NotificationsBell.tsx`, `src/features/notifications/`): all/unread
  filter, reason badges as events, per-item and bulk mark-read via
  `notification_mark_read`, an unread badge in the top bar, a side-nav entry and
  a command-palette action.
- **Code search**: the `code` tab on the search page renders
  `CodeSearchResultDto` rows (`bridge.search_code`), with open-on-GitHub and
  open-repository actions.
- **Inline commit diffs**: `CommitDetail` renders `compare_branches` output in
  the commits tab and the overview's recent-commits list; the parent is the next
  entry in the ordered history, so no protocol change was needed.
- **Repo watchers count** in the repository header stat grid.
- **Working-tree reset** (`git_reset`): the local diff panel exposes "Unstage
  all" and "Discard all changes" through a dropdown, with status/diff/log
  invalidation.
- **Server auto-start preference**: persisted in `localStorage` and applied on
  launch by the shell (`useServerAutoStart`), with a settings toggle.
- **Robustness/a11y**: a top-level `ErrorBoundary`, profile nav resolved from
  the authenticated login, new-repo creation navigates to the created repo, and
  dropdown focus returns to its trigger on close.
- Mock fidelity: remote `branches` returns remote branch fixtures instead of
  local branches, `review_pull_request`/`comment_pull_request` mutate the review
  and comment feeds, `git_stash_pop`/`git_stash_drop` honor `index`, and
  `git_reset` mutates the working tree. Frontend tests now number 125.

### Added — real data path (verified) + glass rework

- **Remote commands ensure the sidecar.** `AppState::client()` runs
  `ServerManager::ensure_running()` (spawn + health-check) before every remote
  call, and every command in `commands/remote.rs` goes through it. Before, only
  `server_start` started the server, so GitHub data only worked after manually
  pressing Start in Settings — the app appeared to be a placeholder.
- **Token propagation to the server.** `auth_set_token` / `auth_clear_token`
  also activate/clear the token on the managed server, and completing the OAuth
  device flow recycles the owned server so it reloads the store. The server
  auto-start preference now defaults on.
- **Dev workflow.** `scripts/dev-server.sh` builds `../api` and stages
  `gitnapse-server` next to the desktop executable (the bridge's first
  resolution candidate): `npm run server:dev`, `npm run tauri:dev`,
  `npm run tauri:build`. The app then owns its server with no `PATH`/env setup.
- **`run.sh` launcher.** One command to run the whole app on Linux. It prefers
  the system `webkit2gtk-4.1` and, when it is missing (Arch without sudo),
  bootstraps a private copy under `~/.cache` (patching the helper-process path),
  reuses the `gh` token when available, stages the sidecar and launches Tauri.
- **Verified end to end in the terminal** against the real server and GitHub:
  `/health`, `auth/status`, `user`, `repos/detail`, `search`, `search/users`,
  `search/code`, `users/notifications`, `user/starred`, `repos/branches`,
  `repos/languages`, `repos/contributors` and `users/events` all returned live
  data. The only earlier failure was the fix itself, not the wire.
- **Glass rework (visible glassmorphism).** The flat black canvas could not
  refract, and near-opaque tint alphas hid the blur. Added a themed aurora
  (`body::before`, four blurred accent blobs, `--accent*-soft` tokens), lowered
  tint alphas to 0.16–0.64, raised `saturate()` to 180–235 %, and made
  `glass-flat` panels actually blur. Nested surfaces drop the second backdrop
  pass (no glass-on-glass). `contrast.test.ts` now measures the aurora peak as
  the worst case; `docs/DESIGN.md` §3.4/§5/§6/§9.2 updated with new audit lines.

### Added — GitHub-style markdown + repository graph

- **HTML in READMEs, rendered like GitHub** (`src/ui/markdown.ts`,
  `src/ui/markdown-urls.ts`, `src/ui/Markdown.tsx`): raw HTML from markdown is
  passed through and sanitized with a GitHub-like allowlist (headings, tables,
  images, `details`/`summary`, `kbd`, GFM task-list checkboxes; scripts, styles,
  iframes, forms and event handlers are stripped). Relative links and images in
  a README resolve against the file's directory like GitHub does — images point
  at `raw.githubusercontent.com`, links at the blob URL; leading `/` means repo
  root. `OverviewTab` passes the repo/ref/path context.
- **Graph tab** (`src/features/repo/lib/graph.ts`,
  `src/features/repo/components/RepoGraph.tsx`,
  `src/app/pages/repo/GraphTab.tsx`): an Obsidian-style force-directed network of
  the whole `repo_tree`. Nodes are colored by top-level folder using the active
  theme's accents (read from CSS custom properties and re-read on theme change),
  directories are larger, links join each entry to its parent. Canvas renderer
  with drag, pan, zoom, hover tooltips, path highlight, labels/files toggles,
  re-heat and reset; clicking a file opens it in the Code tab. Truncation keeps
  directories first and reports `N/Total`.
- Tests: `graph.test.ts` (category/links/cap/simulation) and
  `markdown-urls.test.ts` (relative, root-relative, external, HEAD fallback);
  the Graph tab is in the render smoke + seeded-page suites. Frontend tests now
  number 144.

### Added — persistent disk cache + organization search

- **Navigation cache on disk** (`src/lib/queryPersist.ts`, `App.tsx`): the React
  Query cache is persisted to IndexedDB via
  `@tanstack/react-query-persist-client`, with a 5-minute fresh window and
  7-day retention (throttled writes, in-memory fallback when IndexedDB is
  unavailable). Repositories, trees, files, commits, issues, pull requests,
  releases, search results and profiles survive navigation and restarts, so the
  app stays well under the GitHub API rate limit.
- **Token-safe by allowlist**: `shouldPersistQueryKey` persists only an explicit
  set of public navigation query keys. Authentication, token, device-flow,
  server-lifecycle, local-git and rate-limit queries are never written to disk,
  and a defensive check rejects credential-shaped keys; the GitHub token keeps
  living only in the core secure store. Sign-out and Settings → Cache clear the
  on-disk data. Covered by `queryPersist.test.ts`.
- **Organization search**: a new "Organizations" scope in global search
  (`search_users` with the `type:org` qualifier) finds orgs alongside
  repositories, users and code.
- Frontend tests now number 149.

### Changed — performance pass

- **Scroll no longer repaints blur.** Content panels (`glass-flat`) keep the
  translucent tint, edge and shadow but no backdrop-filter; the sticky shell
  bars are an opaque-translucent fill instead of a sticky blur. Real blur is now
  only on transient overlays (dropdown, modal, sheet, palette). The optional
  `thick` glass level re-enables bar + panel blur for users who want the heavier
  look and accept the cost. The `.glass::after` noise layer (which used
  `mix-blend-mode: overlay`, forcing a repainted blend group on every scroll
  frame) was removed.
- **Aurora is static and cheap.** Removed the animated `filter: blur(28px)`
  drift and the `will-change: transform` promotion of the full-viewport
  background (a large promoted layer that cost CPU even when idle). Idle
  WebKitGTK usage on the dashboard dropped from ~20% to ~5%.
- **Lighter panel paint.** `glass-flat` cast shadow reduced from a 30px spread
  to a 2px hairline.
- **Graph idles.** `RepoGraph` only steps the simulation and redraws when the
  layout is moving or the view is dirty (drag/pan/zoom/hover/theme), with stable
  effect dependencies, an O(1) category→color map, and an energy threshold
  normalized per node (previously a large graph never stopped simulating).
- **Faster dev / production run.** `Cargo.toml` optimizes dependencies in the
  debug profile (`opt-level = 3` for `dev.package."*"`); `run.sh` builds and
  stages a **release** `gitnapse-server`; and `./run.sh --release` builds the
  production frontend and runs the release binary.
- **Lighter persistence.** The disk cache caps array payloads (6k items) and
  strings (200k chars) and throttles writes to 3s.

### Added — graph controls and profile graph

- **Node-size control** in the force-graph toolbar (10 %–150 %), defaulting to
  **20 %** of the previous radius, so large graphs stay legible. Applies to both
  the repository and the profile graph.
- **Profile graph**: the user page gains a Graph tab (`buildUserGraph`) with the
  user at the center, their repositories around them, and the organizations they
  are connected to — derived from their public activity — each with the org's
  repositories. Clicking a repo opens it, clicking an org opens its profile. It
  reuses existing, cached endpoints (`user_events`, `user_repos`); no protocol
  change.
- The graph model is generalized (`GraphKind`/`isHub`) to users, orgs and repos,
  and `RepoGraph` accepts either a repo tree or a prebuilt model.
- Tests: `buildUserGraph`, `isHub`, and profile Graph-tab parsing; frontend
  tests now number 151.
