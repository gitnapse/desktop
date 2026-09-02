# GitNapse Desktop — Roadmap

> App-specific roadmap for the GitNapse desktop interface. The ecosystem map
> (repo boundaries, single-owner capability table, phases F0-F5) lives in
> `ROADMAP.md` at the workspace root; this document details the desktop track.

## 1. Vision

GitNapse Desktop is the **graphical front** of the GitNapse ecosystem: the
"outside the terminal" experience that mirrors everything the CLI/TUI can do,
without duplicating a single line of logic. A user who downloads and installs
the app gets a complete Git-over-GitHub workflow:

- Browse GitHub: search, repository explorer, file previews, PRs, issues,
  releases.
- Work locally: clone into a configured folder, status/log/branches,
  commit/push/pull.
- Manage the session: token onboarding and token lifecycle from the UI.

It must be **ultra fast** (near-instant startup, tiny footprint) and
**multi-platform** (Windows, macOS, Linux) with a strict
`shared/` + `platforms/<os>/` separation.

## 2. Architecture principles

1. **The UI is a thin shell.** Every capability is owned elsewhere:
   - Git local + config: the `gitnapse` core SDK, in-process (headless build,
     TUI disabled), linked by `path`.
   - GitHub data: the GitNapse HTTP API (`gitnapse-server` + typed
     `gitnapse-client`), never the GitHub REST API directly.
2. **Hybrid by capability, not by mood.** GitHub operations go over HTTP; git
   and account config run in-process. The protocol never exposes local git
   (that stays in the core SDK).
3. **One connection, one server.** A single shared API client created when the
   app starts (Tauri state). The app manages the lifecycle of the
   `gitnapse-server` it talks to (sidecar), so an installed app is self
   sufficient.
4. **Frontend shared, OS behind commands.** The frontend is one shared vanilla
   TS bundle; anything OS-specific surfaces through commands implemented in
   `platforms/<os>.rs` and re-exported via `cfg(target_os)`.
5. **No duplication anywhere.** If a piece of logic exists in another repo, we
   delegate to it (see the single-owner table in the master ROADMAP). Within
   this repo, each concern has one owner module.
6. **Preview-friendly.** The frontend runs in a plain browser with mocked
   commands, so UI work never blocks on system packages.

## 3. Decisions (recorded)

| Date | Decision |
|---|---|
| 2026-09 | Repo created as `gitnapse/desktop` (cloned locally as `desktop/`) |
| 2026-09 | Framework: **Tauri 2** + Vite + vanilla TypeScript, no UI framework (ultra fast, ~2 KB assets) |
| 2026-09 | Backend mode: **hybrid** - GitHub data via `gitnapse-server` HTTP API; git/config in-process via the core SDK |
| 2026-09 | Frontend never talks to GitHub or git directly; everything goes through Tauri commands |
| 2026-09 | No crates.io publishing until the ecosystem is fully modularized and tested; `path` deps point at sibling repos (`../gitnapse`, `../api/...`) |
| 2026-09 | Canonical CLI binary stays `gitnapse`; a short alias (`gn`) is user-level only |
| 2026-09 | Server transport: loopback-only by default; `GITNAPSE_SERVER_URL` overrides |
| 2026-09 | Token lifecycle can be managed remotely via `/api/v1/auth/*` once the server is running |

Open questions (no decision yet): exact bundle strategy for the `gitnapse-server`
sidecar (externalBin vs. optional dependency), app icons and product name
per OS, whether the app should ever bind non-loopback.

## 4. Current status

Done (on the local clone, not yet committed/merged):

- [x] Tauri 2 skeleton: single window, dark theme, header with auth chip.
- [x] Structure: `src-tauri/src/shared/` (commands, backend, git_ops) and
      `src-tauri/src/platforms/{linux,macos,windows,fallback}.rs` with
      `open_in_file_manager`.
- [x] Complete command surface bridged (~37 commands):
      local (auth_status, clone_dir, set_clone_dir, clone_repo, git_raw),
      remote (identity, content, commits/CI, issues, PRs, releases, repo
      creation, server token management), platform (open folder).
- [x] Frontend sections: Clone panel (repo + destination + picker + save
      default) and GitHub search with server health check; browser preview
      mode with mocks.
- [x] App-level ROADMAP.md (this file) and README with layout/rules.

Known gaps to close first:

- [ ] Rust side not compiled yet on any machine (system packages pending:
      `libwebkit2gtk-4.1-dev` etc. on Linux); first `cargo check`/`tauri dev`
      will surface integration errors to fix.
- [ ] `tauri.conf.json` has no icons (`"icon": []`) and no bundle config.

## 5. Milestones

### M1 - Working shell (next)

Goal: a runnable app that clones and browses in dev mode.

- [ ] Fix whatever the first `npm run tauri dev` compile surfaces.
- [ ] Shared API connection: create `Api` once at startup, expose through
      Tauri `State`; stop constructing a client per command.
- [ ] `shared/server.rs`: server lifecycle module
      - resolve the `gitnapse-server` binary (sidecar path first, then PATH,
        then a documented error)
      - `ensure_running()`: health-check `GET /health` with retries, spawn the
        server if absent, remember whether we own the process
      - shutdown handling when the app exits (kill only if we spawned it)
- [ ] Persisted settings: `GITNAPSE_SERVER_URL`/port and an auto-start
      preference (stored with the gitnapse account config, not app-private).
- [ ] UI: repo explorer (repo -> tree -> file preview) fed by the API, with
      language/description from search results.
- [ ] Acceptance: install system deps, `npm run tauri dev`, clone a repo,
      browse its tree, open a file. All GitHub panels work with the server
      started automatically by the app.

### M2 - Local repository panel

Goal: a real working directory view (the desktop counterpart of the TUI
inside a repo).

- [ ] Repo picker: choose a local folder (recent list from the config).
- [ ] Views: status, log (raw via `git_raw` for now), branches.
- [ ] Actions: commit (message + stage all), pull (rebase option), push,
      checkout/create branch, open in file manager.
- [ ] Where the core CLI functions are cwd-bound, keep using `git_raw` with an
      explicit `cwd` (mirroring the documented CLI flags), and note in code
      when a future core refactor can provide cwd-aware canonical wrappers.
- [ ] Acceptance: full local workflow on a real repo without touching a
      terminal.

### M3 - GitHub management panels

Goal: PR/issues/releases management equal to the CLI/TUI, entirely over the
API.

- [ ] Issues panel: list/filter by state, create, close.
- [ ] PR panel: list, detail (branches, merge info), create, merge (method),
      open/close, review (approve/request changes/comment), comments,
      commits.
- [ ] Releases panel: list and create.
- [ ] Starred/rate-limit/identity widgets (all data already bridged).
- [ ] Acceptance: complete a PR cycle (open -> comment -> approve -> merge)
      from the UI.

### M4 - Session and packaging

Goal: an installable, self-sufficient app per OS.

- [ ] Auth onboarding in the UI: OAuth device flow presented inside the app
      (no terminal), then persist through `POST /api/v1/auth/token`.
- [ ] Server token lifecycle UI (status, set, clear) reflecting
      `/api/v1/auth/*` semantics (including the env-managed `409` case).
- [ ] Bundle: icons per OS, `gitnapse-server` sidecar, product metadata.
- [ ] Windows/macOS/Linux builds green; smoke tests on all three.
- [ ] Acceptance: downloaded app on a fresh machine starts, manages its own
      server, authenticates, and runs the full flow with no extra installs.

## 6. Acceptance criteria (ecosystem level)

The same workflow - search, clone, commit, manage PRs - works identically
from the terminal (CLI/TUI) and from this app, backed by the same logic, with
no duplicated implementation. Any new capability first gets an owner in the
master ROADMAP single-owner table, then an implementation, then optional thin
exposure here.

## 7. Explicitly out of scope (for this repo)

- Landing/marketing website (`web/` repo).
- The GitNapse TUI/CLI themselves (`gitnapse` repo).
- The HTTP protocol, its server, or its client crate (`api/` repo) - we are a
  consumer.
- Theme registry content (`themes/` repo).
- Publishing crates to crates.io (ecosystem decision: later).

## 8. Dependencies on sibling repos

- `gitnapse` core (path: `../../gitnapse`): SDK modules used headless
  (provider is not called directly here, but auth source, account config and
  `cli::clone_repo` are).
- `api/crates/gitnapse-client` + `gitnapse-protocol` (paths under
  `../../api/`): remote data + wire types.
- `gitnapse-server` binary (built from `api`): required at runtime for all
  GitHub operations (M1 makes this automatic).

Keep these paths in sync when the workspace layout changes; the master
ROADMAP tracks the dependency graph.
