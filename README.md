# GitNapse Desktop

Desktop interface for GitNapse. Built with **Tauri 2** and an ultra-light
frontend (Vite + vanilla TypeScript, no framework) for instant startup.

The UI is a thin shell: all heavy logic (provider, auth, config, git) runs
**in-process** through the `gitnapse` core SDK (headless build, TUI disabled).

## Layout

```
desktop/
  index.html             single-page shell
  src/                   frontend (vanilla TS + CSS, no framework)
  src-tauri/
    src/
      main.rs            entry point (wires shared + platform commands)
      shared/            cross-platform logic (auth, config, git bridge)
      platforms/         per-OS code, selected with cfg(target_os):
                         linux.rs  macos.rs  windows.rs  fallback.rs
    tauri.conf.json      window + build config
    capabilities/        permission grants (dialog, core)
```

Rule: anything that behaves the same on the three OS goes in `shared/`; only
genuine OS differences (opening folders, notifications, menu, updater...) go
in `platforms/<os>.rs`, re-exported by `platforms/mod.rs` with `cfg(target_os)`.
The frontend is shared; OS behavior is surfaced through commands.

## Prerequisites

- Node 24+ (LTS) and Rust 1.85+ (edition 2024).
- Linux system packages for Tauri (Ubuntu/Debian):

```sh
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

- The `gitnapse` core must live next to this repo (`../gitnapse`) because the
  crates are wired with `path =` dependencies (no crates.io publishing yet).

## Run (dev)

The frontend also runs in a plain browser: Tauri commands are mocked and a
banner warns about it (ideal for UI work without the system packages).

```sh
npm install
npm run dev          # browser preview at http://localhost:1420
npm run tauri dev    # real desktop window (needs the system packages)
```

## Build

```sh
npm run tauri build
```

## Commands exposed to the UI

The complete hybrid surface is bridged (each is a thin delegation, no logic
duplicated):

**Local — git + config, in-process with the core SDK** (`shared/git_ops.rs`):
`auth_status`, `clone_dir`, `set_clone_dir`, `clone_repo` (owner/repo[:branch]
or URL into the configured folder) and `git_raw` (escape hatch: run any git
command scoped to a repository folder, output as raw text).

**Remote — GitHub data through the GitNapse HTTP API** (`shared/backend.rs`
+ `gitnapse-client`, server at `GITNAPSE_SERVER_URL`):
- identity: `server_status`, `api_user`, `starred_repos`, `rate_limit`,
  `api_auth_status`, `api_set_token`, `api_clear_token`
- content: `search_repos`, `repo_detail`, `branches`, `repo_tree`,
  `file_content`
- commits/CI: `recent_commits`, `compare_branches`, `check_runs`,
  `workflow_runs`
- issues: `issues`, `create_issue`, `close_issue`
- pull requests: `pull_requests`, `pull_request`, `create_pull_request`,
  `merge_pull_request`, `update_pull_request`, `pull_request_reviews`,
  `review_pull_request`, `pull_request_comments`, `comment_pull_request`,
  `pull_request_commits`
- releases/repos: `releases`, `create_release`, `create_repo`

**Platform** (`platforms/<os>.rs`): `open_in_file_manager`
(xdg-open / open / explorer).

See `ROADMAP.md` in this repo for the app-specific roadmap.
