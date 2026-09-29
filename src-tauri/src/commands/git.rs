//! Local git commands: 1:1 delegation to `gitnapse_bridge::git` (which wraps
//! the typed `gitnapse::git` core module). No stdout parsing happens here.

use super::blocking;
use gitnapse_bridge::dto::{
    GitBranch, GitLogEntry, GitRemote, GitRepoInfo, GitStashEntry, GitStatus, GitTag,
};
use gitnapse_bridge::git as bridge;
use gitnapse_bridge::git::DiffModeRequest;
use std::path::PathBuf;

/// Default number of commits returned when `limit` is omitted.
const DEFAULT_LOG_LIMIT: usize = 50;

#[tauri::command]
pub async fn git_repo_info(cwd: String) -> Result<GitRepoInfo, String> {
    blocking(move || bridge::repo_info(&PathBuf::from(cwd))).await
}

#[tauri::command]
pub async fn git_status(cwd: String) -> Result<GitStatus, String> {
    blocking(move || bridge::status(&PathBuf::from(cwd))).await
}

#[tauri::command]
pub async fn git_log(cwd: String, limit: Option<usize>) -> Result<Vec<GitLogEntry>, String> {
    let limit = limit.unwrap_or(DEFAULT_LOG_LIMIT);
    blocking(move || bridge::log(&PathBuf::from(cwd), limit)).await
}

/// Unified diff for `{ kind, path?, rev?, from?, to? }`.
#[tauri::command]
pub async fn git_diff(cwd: String, mode: DiffModeRequest) -> Result<String, String> {
    blocking(move || {
        let mode = mode.to_diff_mode()?;
        bridge::diff(&PathBuf::from(cwd), &mode)
    })
    .await
}

#[tauri::command]
pub async fn git_stage(cwd: String, paths: Vec<String>) -> Result<(), String> {
    blocking(move || bridge::stage(&PathBuf::from(cwd), &paths)).await
}

#[tauri::command]
pub async fn git_unstage(cwd: String, paths: Vec<String>) -> Result<(), String> {
    blocking(move || bridge::unstage(&PathBuf::from(cwd), &paths)).await
}

#[tauri::command]
pub async fn git_discard(cwd: String, paths: Vec<String>) -> Result<(), String> {
    blocking(move || bridge::discard(&PathBuf::from(cwd), &paths)).await
}

#[tauri::command]
pub async fn git_commit(cwd: String, message: String, all: Option<bool>) -> Result<String, String> {
    let all = all.unwrap_or(false);
    blocking(move || bridge::commit(&PathBuf::from(cwd), &message, all)).await
}

#[tauri::command]
pub async fn git_push(
    cwd: String,
    remote: Option<String>,
    branch: Option<String>,
    force: Option<bool>,
    set_upstream: Option<bool>,
) -> Result<String, String> {
    let force = force.unwrap_or(false);
    let set_upstream = set_upstream.unwrap_or(false);
    blocking(move || {
        bridge::push(
            &PathBuf::from(cwd),
            remote.as_deref(),
            branch.as_deref(),
            force,
            set_upstream,
        )
    })
    .await
}

#[tauri::command]
pub async fn git_pull(cwd: String, rebase: Option<bool>) -> Result<String, String> {
    let rebase = rebase.unwrap_or(false);
    blocking(move || bridge::pull(&PathBuf::from(cwd), None, None, rebase)).await
}

#[tauri::command]
pub async fn git_fetch(cwd: String, prune: Option<bool>) -> Result<String, String> {
    let prune = prune.unwrap_or(false);
    blocking(move || bridge::fetch(&PathBuf::from(cwd), prune)).await
}

#[tauri::command]
pub async fn git_branches(cwd: String) -> Result<Vec<GitBranch>, String> {
    blocking(move || bridge::branches(&PathBuf::from(cwd))).await
}

#[tauri::command]
pub async fn git_checkout(cwd: String, branch: String, create: Option<bool>) -> Result<(), String> {
    let create = create.unwrap_or(false);
    blocking(move || bridge::checkout(&PathBuf::from(cwd), &branch, create)).await
}

#[tauri::command]
pub async fn git_branch_create(
    cwd: String,
    name: String,
    from: Option<String>,
) -> Result<(), String> {
    blocking(move || bridge::branch_create(&PathBuf::from(cwd), &name, from.as_deref())).await
}

#[tauri::command]
pub async fn git_branch_delete(
    cwd: String,
    name: String,
    force: Option<bool>,
) -> Result<(), String> {
    let force = force.unwrap_or(false);
    blocking(move || bridge::branch_delete(&PathBuf::from(cwd), &name, force)).await
}

#[tauri::command]
pub async fn git_merge(cwd: String, branch: String) -> Result<String, String> {
    blocking(move || bridge::merge(&PathBuf::from(cwd), &branch)).await
}

#[tauri::command]
pub async fn git_reset(
    cwd: String,
    target: Option<String>,
    hard: Option<bool>,
) -> Result<(), String> {
    let hard = hard.unwrap_or(false);
    blocking(move || bridge::reset(&PathBuf::from(cwd), target.as_deref(), hard)).await
}

#[tauri::command]
pub async fn git_stash_list(cwd: String) -> Result<Vec<GitStashEntry>, String> {
    blocking(move || bridge::stash_list(&PathBuf::from(cwd))).await
}

#[tauri::command]
pub async fn git_stash_push(cwd: String, message: Option<String>) -> Result<(), String> {
    blocking(move || bridge::stash_push(&PathBuf::from(cwd), message.as_deref())).await
}

#[tauri::command]
pub async fn git_stash_pop(cwd: String, index: Option<u32>) -> Result<(), String> {
    blocking(move || bridge::stash_pop(&PathBuf::from(cwd), index)).await
}

#[tauri::command]
pub async fn git_stash_drop(cwd: String, index: Option<u32>) -> Result<(), String> {
    blocking(move || bridge::stash_drop(&PathBuf::from(cwd), index)).await
}

#[tauri::command]
pub async fn git_tags(cwd: String) -> Result<Vec<GitTag>, String> {
    blocking(move || bridge::tags(&PathBuf::from(cwd))).await
}

#[tauri::command]
pub async fn git_tag_create(
    cwd: String,
    name: String,
    message: Option<String>,
    target: Option<String>,
) -> Result<(), String> {
    blocking(move || {
        bridge::tag_create(
            &PathBuf::from(cwd),
            &name,
            message.as_deref(),
            target.as_deref(),
        )
    })
    .await
}

#[tauri::command]
pub async fn git_tag_delete(cwd: String, name: String) -> Result<(), String> {
    blocking(move || bridge::tag_delete(&PathBuf::from(cwd), &name)).await
}

#[tauri::command]
pub async fn git_remotes(cwd: String) -> Result<Vec<GitRemote>, String> {
    blocking(move || bridge::remotes(&PathBuf::from(cwd))).await
}

#[tauri::command]
pub async fn git_remote_add(cwd: String, name: String, url: String) -> Result<(), String> {
    blocking(move || bridge::remote_add(&PathBuf::from(cwd), &name, &url)).await
}

#[tauri::command]
pub async fn git_remote_remove(cwd: String, name: String) -> Result<(), String> {
    blocking(move || bridge::remote_remove(&PathBuf::from(cwd), &name)).await
}

#[tauri::command]
pub async fn git_remote_rename(cwd: String, old: String, new: String) -> Result<(), String> {
    blocking(move || bridge::remote_rename(&PathBuf::from(cwd), &old, &new)).await
}
