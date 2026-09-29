# GitNapse Desktop — Roadmap

> App-specific roadmap for `desktop/`. The ecosystem map — repo boundaries,
> dependency direction, the frozen command contract and phases F0-F5 — lives
> in [`../WORKSPACE.md`](../WORKSPACE.md); this document details the desktop
> track. Status: P1 UI wiring, registry themes, inline commit diffs and server
> auto-start landed; sidecar packaging, visual QA and release pipeline open.

## 1. Vision

GitNapse Desktop is the graphical, non-TUI face of the GitNapse ecosystem: a
GitHub dashboard built on the same core SDK and wire protocol as the CLI/TUI,
without duplicating logic.

- **Dashboard home**: activity, stats, shortcuts and session state.
- **Global search**: repositories, users and code.
- **Repo explorer**: overview, code, commits, branches, compare, issues, pull
  requests, actions and releases.
- **Local repo panel**: clone, status/diff, commit/sync, branches, stash, tags
  and remotes.
- **Profile and session**: user profile, settings, OAuth device-flow onboarding
  and token lifecycle.

The interface follows the workspace design doctrine (`WORKSPACE.md` §6,
xglassmorphism × samurai): five-layer glass with a token contract and
opaque/contrast/reduced-transparency fallbacks, monochrome canvas where color
is an event, inline feedback instead of toasts or skeletons. Targets: Windows,
macOS and Linux.

## 2. Architecture (as built)

- **Tauri 2 shell** (`src-tauri/`): thin. Registers the command surface, owns
  `AppState` (one sidecar manager, one shared API client) and delegates every
  call to the bridge. Window chrome uses native effects (`mica` on Windows,
  `underWindowBackground` on macOS); Linux has no native vibrancy and falls
  back to CSS glass, which also carries every in-page surface. No
  `macOSPrivateApi`.
- **Pure bridge** (`bridge/`, crate `gitnapse-bridge`): all desktop logic, no
  Tauri or webview dependency, so it builds and unit-tests in CI/containers
  (`cargo test -p gitnapse-bridge`).
  - `api/client.rs` — typed async wrapper over `gitnapse-client` (remote data).
  - `api/server.rs` — `gitnapse-server` sidecar lifecycle: resolve
    (`GITNAPSE_SERVER_BIN` → sidecar path → `PATH`), health-check, spawn, and
    kill only processes it started.
  - `auth.rs`, `clone.rs`, `config.rs`, `dto.rs`, `git.rs` — in-process core
    SDK usage: local git through the typed `gitnapse::git` module, shared
    account config, token store and step-wise OAuth device flow.
- **Hybrid data path**: remote GitHub data goes through the managed
  `gitnapse-server` over HTTP (loopback `127.0.0.1:8787`,
  `GITNAPSE_SERVER_URL` override); local git/config/auth run in-process through
  the `gitnapse` core SDK (headless: `default-features = false`, TUI excluded).
  The frontend never talks to GitHub or git directly.
- **87 frozen commands** (`WORKSPACE.md` §4): camelCase arguments in JS,
  snake_case payloads, additive DTO fields only.
- **Auth single source of truth**: the core secure store (same
  `~/.config/GitNapse` as the CLI/TUI). `auth_set_token` writes in-process,
  `api_set_token` writes through the server, and the server re-reads the store
  at runtime; OAuth runs in-process and step-wise (`auth_login_begin` /
  `auth_login_poll`), with no TTY.
- **Frontend** (`src/`): React 19 + Vite 8 + TypeScript strict, `HashRouter`,
  React Query; `src/lib/bridge.ts` is the only module that imports Tauri APIs,
  and mock mode keeps UI work possible in a plain browser.
- **Icons**: real, generated from `gitnapse/assets/gitnapse-icon.png`; the full
  Tauri icon set lives in `src-tauri/icons/`.

Build commands, crate layout and the sidecar flow are detailed in
[`README.md`](README.md); glass audit lines are in
[`docs/DESIGN.md`](docs/DESIGN.md).

## 3. Done

- **Core (F0)** — `gitnapse` v0.1.2: headless feature split, `auth::TokenSource`,
  step-wise OAuth device flow, typed `gitnapse::git` module and the
  `GitProvider` extension (15 dashboard methods). See
  [`../gitnapse/CHANGELOG.md`](../gitnapse/CHANGELOG.md).
- **API (F1)** — `api` (Unreleased): drift fix and the full dashboard protocol
  surface (issues detail/comments, users, search, events, notifications, PR
  files/conversation, languages/contributors), request types for every route,
  the `gitnapse-client` crate and the token lifecycle endpoints. See
  [`../api/CHANGELOG.md`](../api/CHANGELOG.md).
- **Bridge + sidecar (F2)** — `gitnapse-bridge` with the modules above; sidecar
  spawn/health/stop ownership semantics; Tauri commands registered and
  delegating.
- **Design system + views (F3/F4)** — glass token contract, five-layer recipe,
  fallback/contrast doctrine and per-surface audit lines in
  `docs/DESIGN.md`; dashboard home, global search, repo explorer tabs, local
  panel, profile, settings, auth onboarding and command palette shipped.
- **Contract audit** — 87/87: every command is registered in `src-tauri`,
  wrapped in `src/lib/bridge.ts`, handled by the mock and pinned by the
  frontend contract test.
- **P1 UI wiring** — code search tab, notifications inbox with unread badge and
  mark-read, repo watchers count, inline remote commit diffs, working-tree reset
  UI and the server auto-start preference all landed.
- **Registry themes** — the `gitnapse/themes` registry drives a swatch picker in
  Settings; accents are distributed across status roles by hue with a WCAG AA
  contrast guarantee, and the selection is applied before first paint.
- **Tests** — core 109 (library), api 40, bridge 23, frontend 125. Frontend
  validation: `npm run build` (`tsc` strict + Vite) and `npx vitest run`.

## 4. Pending / next milestones

- (a) **Sidecar packaging**: enable `bundle.externalBin` in
  `src-tauri/tauri.conf.json` together with `scripts/build-sidecar.sh` per
  platform, then smoke-test the installers (app resolves and controls its own
  server with no `PATH`/env setup).
- (b) **Visual and vibrancy matrix**: run the per-engine contrast/visual check
  (Chromium, Firefox, WebKitGTK) and verify native window effects on macOS and
  Windows. Blocked in the current container: no browser and no Tauri system
  packages.
- (c) **Local clone detection**: optional cwd-aware detection so the local panel
  can preselect the clone matching the viewed repository (the repo header
  already guesses `cloneDir/fullName`).
- (d) **Release pipeline**: desktop versioning/updater configuration and
  release artifacts.
- (e) **Theme contributions**: a "submit a theme" affordance on top of the
  registry picker, and per-theme selection of glass level.
- (f) **Exact organization membership**: add a `users/orgs` route to the
  `gitnapse` core and the HTTP protocol (`GET /users/{login}/orgs`) plus the
  client/bridge/frontend wiring, so the profile graph shows real organization
  memberships instead of deriving connected orgs from public activity.

## 5. Known limitations

- `src-tauri` **cannot be compiled in the current build container** (no
  `pkg-config`, glib or webkit system packages). It was type-checked through a
  userland `pkg-config` shim, and the pure `bridge` crate is fully built and
  tested; the first `cargo check`/`npm run tauri build` on a machine with the
  Tauri system packages may still surface integration errors.
- Glass surfaces are verified mathematically (`src/lib/contrast.test.ts`) plus
  static review only; per-engine rendering and native vibrancy are unverified
  (see (b)).
- The sidecar is not bundled by default (see (a)); a built app needs
  `gitnapse-server` on `PATH` or `GITNAPSE_SERVER_BIN` until then.

## 6. Out of scope

- `web/` (landing/marketing site).
- `themes/` theme registry content.
- Publishing crates to crates.io (ecosystem decision, later).
- The core SDK, the HTTP protocol/server/client and the TUI/CLI themselves:
  owned by the sibling repos and consumed here.
