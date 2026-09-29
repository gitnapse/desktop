# GitNapse Desktop

Desktop interface for GitNapse. Built with **Tauri 2** + **React 19/Vite**
(`src/`) on top of a pure-Rust bridge crate; GitHub data flows through
`gitnapse-server` (HTTP) and local git/config/auth run in-process through the
`gitnapse` core SDK. The frontend never talks to GitHub or git directly.

## Architecture

```
desktop/
  Cargo.toml               cargo workspace (members: bridge, src-tauri)
  bridge/                  PURE Rust lib: all desktop logic, no tauri/webview
    src/api/client.rs      typed async wrapper over gitnapse-client
    src/api/server.rs      gitnapse-server sidecar lifecycle
    src/auth.rs            token status/store + OAuth device flow (core)
    src/clone.rs           git clone with clone://progress parsing
    src/config.rs          clone-dir preference (shared account config)
    src/dto.rs             bridge payloads + re-exported core/protocol DTOs
    src/git.rs             typed local git wrappers (gitnapse::git)
  src-tauri/               THIN shell: commands only delegate to bridge
    src/main.rs            AppState (sidecar manager + shared API client)
    src/commands/          auth, local, git, remote, platform
    src/platforms/         per-OS: xdg-open / open / explorer + cmd start
    tauri.conf.json        window 1280x800, CSP, native window effects
    capabilities/          core defaults + event + dialog grants
  src/                     React app (features, ui, styles)
```

Rule: `bridge` compiles and unit-tests **without** webview/system packages
(`cargo test -p gitnapse-bridge`), so the logic is verified in CI/containers.
`src-tauri` registers the frozen command surface from `WORKSPACE.md` §4 and
forwards arguments/events — nothing else.

## Hybrid backend

1. **Remote GitHub data** (search, repos, issues, PRs, releases, actions,
   profile, notifications) goes through **`gitnapse-server` over HTTP** using
   `gitnapse-client`. The app owns the sidecar lifecycle.
2. **Local git + config + auth token store** run **in-process through the
   `gitnapse` core SDK** (headless: `default-features = false`, TUI excluded).

### Sidecar lifecycle (`bridge::api::server`)

- Binary resolution: `GITNAPSE_SERVER_BIN` → sibling of the app executable
  (Tauri sidecar location) → `gitnapse-server` in `PATH` → clear error.
- `server_start` / `ServerManager::ensure_running()`: `GET /health` with
  retries; spawns `gitnapse-server --host 127.0.0.1 --port 8787` when nothing
  answers, remembers `owned = true`.
- `server_stop` / drop: kills **only** processes the app spawned; external
  servers are left running.
- URL: `GITNAPSE_SERVER_URL` overrides the default `http://127.0.0.1:8787`.

### Auth single source of truth

The GitHub token lives in the core secure store (same `~/.config/GitNapse`
used by the CLI/TUI). Both paths converge: `auth_set_token` writes it
in-process, `api_set_token` writes it through the server, and the server
re-reads the store at runtime. OAuth device flow runs in-process, step-wise
(`auth_login_begin` / `auth_login_poll`), no TTY.

## Prerequisites

- Node 24+ (LTS) and Rust 1.85+ (edition 2024).
- Linux system packages for Tauri (Ubuntu/Debian):

```sh
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

- The `gitnapse` and `api` repos must live next to this repo (`../gitnapse`,
  `../api`): the crates are wired with `path =` dependencies.

## Build & verify

```sh
# bridge: pure Rust, no webview packages needed (CI-safe)
cargo fmt --all
cargo clippy -p gitnapse-bridge --all-targets -- -D warnings
cargo test -p gitnapse-bridge

# Tauri shell (needs the system packages above)
cd src-tauri && cargo check          # or: npm run tauri build
```

Frontend (browser preview with mocked commands, no Rust needed):

```sh
npm install
npm run dev            # http://localhost:1420
npm run tauri dev      # real desktop window (needs system packages)
npm run tauri build    # bundle
```

### Sidecar packaging (opt-in)

`npm run tauri build` produces an app that resolves `gitnapse-server` from
`GITNAPSE_SERVER_BIN` or `PATH`. To make the bundle self-sufficient, stage the
server binary and enable the Tauri sidecar:

```sh
./scripts/build-sidecar.sh   # builds ../api and stages binaries/gitnapse-server-<target-triple>
```

Then add `"externalBin": ["binaries/gitnapse-server"]` to the `bundle` section
of `src-tauri/tauri.conf.json` (kept off by default so builds work without the
API repo checked out next door).


## Command surface (Tauri, frozen)

Invoke args are camelCase in JS; payloads are snake_case.

- **Local/auth** (`commands/auth.rs`): `auth_status`, `auth_set_token`,
  `auth_clear_token`, `auth_login_begin`, `auth_login_poll`
- **Local/clone** (`commands/local.rs`): `clone_dir`, `set_clone_dir`,
  `clone_repo` (+ `clone://progress` events `{ phase, message, percent? }`)
- **Local/git** (`commands/git.rs`): `git_repo_info`, `git_status`, `git_log`,
  `git_diff` (`{kind, path?, rev?, from?, to?}`), `git_stage`, `git_unstage`,
  `git_discard`, `git_commit`, `git_push`, `git_pull`, `git_fetch`,
  `git_branches`, `git_checkout`, `git_branch_create`, `git_branch_delete`,
  `git_merge`, `git_reset`, `git_stash_list`, `git_stash_push`,
  `git_stash_pop`, `git_stash_drop`, `git_tags`, `git_tag_create`,
  `git_tag_delete`, `git_remotes`, `git_remote_add`, `git_remote_remove`,
  `git_remote_rename`
- **Remote** (`commands/remote.rs`): server (`server_status`, `server_start`,
  `server_stop`), API auth (`api_auth_status`, `api_set_token`,
  `api_clear_token`), user/profile/activity (8), search (3), repos (8),
  issues (7), pull requests (12), releases/actions/repos (5)
- **Platform** (`commands/platform.rs`): `open_in_file_manager`,
  `open_external`

Window chrome uses Tauri native effects (`mica` on Windows 11,
`underWindowBackground` on macOS) via `windowEffects`; Linux has no native
vibrancy and falls back to the CSS glass. No `macOSPrivateApi` (public APIs
only). In-page glass surfaces stay CSS `backdrop-filter`.

See `ROADMAP.md` for the app-specific roadmap and `docs/DESIGN.md` for the
glass audit lines.
