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
