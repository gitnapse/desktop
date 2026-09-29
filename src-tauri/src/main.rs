//! GitNapse Desktop entry point — a thin Tauri shell over `gitnapse-bridge`.
//!
//! This crate owns no logic: it registers the frozen command surface from
//! `WORKSPACE.md` §4 and delegates every call to the bridge crate (blocking
//! bridge calls run on `tauri::async_runtime::spawn_blocking`; remote calls
//! await the shared HTTP client). Local git/config/auth run in-process through
//! the core SDK; GitHub data goes through `gitnapse-server` over HTTP.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod platforms;

use gitnapse_bridge::api::{ApiClient, ServerManager};
use std::sync::{Arc, Mutex, OnceLock};

/// Shared application state: one sidecar manager, one lazy API client.
pub struct AppState {
    server: Arc<Mutex<ServerManager>>,
    api: OnceLock<ApiClient>,
}

impl AppState {
    /// Fresh state; the server URL comes from `GITNAPSE_SERVER_URL` or the
    /// default `http://127.0.0.1:8787`.
    pub fn new() -> Self {
        Self {
            server: Arc::new(Mutex::new(ServerManager::from_env())),
            api: OnceLock::new(),
        }
    }

    /// The sidecar manager, cloneable so blocking calls can own it.
    pub fn server(&self) -> Arc<Mutex<ServerManager>> {
        Arc::clone(&self.server)
    }

    /// The single API client, created once from the server base URL.
    pub fn api(&self) -> Result<&ApiClient, String> {
        if self.api.get().is_none() {
            let base_url = self
                .server
                .lock()
                .map_err(|_| "server lock poisoned".to_string())?
                .url()
                .to_string();
            let client = ApiClient::new(&base_url).map_err(|error| error.to_string())?;
            let _ = self.api.set(client);
        }
        self.api
            .get()
            .ok_or_else(|| "API client unavailable".to_string())
    }

    /// Ensures the `gitnapse-server` sidecar is healthy, then hands back a clone
    /// of the shared client. Every remote command goes through this, so the app
    /// transparently manages its own server instead of assuming one is running.
    pub async fn client(&self) -> Result<ApiClient, String> {
        let server = self.server();
        tauri::async_runtime::spawn_blocking(move || {
            let mut manager = server
                .lock()
                .map_err(|_| "server lock poisoned".to_string())?;
            manager
                .ensure_running()
                .map_err(|error| error.to_string())?;
            Ok::<(), String>(())
        })
        .await
        .map_err(|error| format!("blocking task failed: {error}"))??;
        Ok(self.api()?.clone())
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            // ── Local: auth (core SDK, in-process) ──────────────────────
            commands::auth::auth_status,
            commands::auth::auth_set_token,
            commands::auth::auth_clear_token,
            commands::auth::auth_login_begin,
            commands::auth::auth_login_poll,
            // ── Local: clone (core SDK + git) ───────────────────────────
            commands::local::clone_dir,
            commands::local::set_clone_dir,
            commands::local::clone_repo,
            // ── Local: git (core SDK typed module) ──────────────────────
            commands::git::git_repo_info,
            commands::git::git_status,
            commands::git::git_log,
            commands::git::git_diff,
            commands::git::git_stage,
            commands::git::git_unstage,
            commands::git::git_discard,
            commands::git::git_commit,
            commands::git::git_push,
            commands::git::git_pull,
            commands::git::git_fetch,
            commands::git::git_branches,
            commands::git::git_checkout,
            commands::git::git_branch_create,
            commands::git::git_branch_delete,
            commands::git::git_merge,
            commands::git::git_reset,
            commands::git::git_stash_list,
            commands::git::git_stash_push,
            commands::git::git_stash_pop,
            commands::git::git_stash_drop,
            commands::git::git_tags,
            commands::git::git_tag_create,
            commands::git::git_tag_delete,
            commands::git::git_remotes,
            commands::git::git_remote_add,
            commands::git::git_remote_remove,
            commands::git::git_remote_rename,
            // ── Remote: server lifecycle ────────────────────────────────
            commands::remote::server_status,
            commands::remote::server_start,
            commands::remote::server_stop,
            // ── Remote: protocol auth ───────────────────────────────────
            commands::remote::api_auth_status,
            commands::remote::api_set_token,
            commands::remote::api_clear_token,
            // ── Remote: user/profile, activity, notifications ───────────
            commands::remote::api_user,
            commands::remote::user_profile,
            commands::remote::user_repos,
            commands::remote::starred_repos,
            commands::remote::rate_limit,
            commands::remote::user_events,
            commands::remote::notifications,
            commands::remote::notification_mark_read,
            // ── Remote: search ──────────────────────────────────────────
            commands::remote::search_repos,
            commands::remote::search_users,
            commands::remote::search_code,
            // ── Remote: repositories ────────────────────────────────────
            commands::remote::repo_detail,
            commands::remote::branches,
            commands::remote::repo_tree,
            commands::remote::file_content,
            commands::remote::recent_commits,
            commands::remote::compare_branches,
            commands::remote::repo_languages,
            commands::remote::repo_contributors,
            // ── Remote: issues ──────────────────────────────────────────
            commands::remote::issues,
            commands::remote::issue,
            commands::remote::issue_comments,
            commands::remote::comment_issue,
            commands::remote::create_issue,
            commands::remote::close_issue,
            commands::remote::reopen_issue,
            // ── Remote: pull requests ───────────────────────────────────
            commands::remote::pull_requests,
            commands::remote::pull_request,
            commands::remote::pr_files,
            commands::remote::pull_request_commits,
            commands::remote::pull_request_reviews,
            commands::remote::pull_request_comments,
            commands::remote::pr_conversation,
            commands::remote::create_pull_request,
            commands::remote::merge_pull_request,
            commands::remote::update_pull_request,
            commands::remote::review_pull_request,
            commands::remote::comment_pull_request,
            // ── Remote: releases / actions / repos ──────────────────────
            commands::remote::releases,
            commands::remote::create_release,
            commands::remote::check_runs,
            commands::remote::workflow_runs,
            commands::remote::create_repo,
            // ── Platform ────────────────────────────────────────────────
            commands::platform::open_in_file_manager,
            commands::platform::open_external,
        ])
        .run(tauri::generate_context!())
        .expect("error while running GitNapse Desktop");
}
