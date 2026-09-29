//! Local clone commands: config preference + `git clone` with progress events.

use super::blocking;
use gitnapse_bridge::dto::CloneResult;
use gitnapse_bridge::{clone, config};
use tauri::Emitter;

/// Current default clone directory from the shared account config.
#[tauri::command]
pub async fn clone_dir() -> Result<String, String> {
    blocking(config::clone_dir).await
}

/// Persists the default clone directory; returns the stored value.
#[tauri::command]
pub async fn set_clone_dir(dir: Option<String>) -> Result<String, String> {
    blocking(move || config::set_clone_dir(dir.as_deref())).await
}

/// Clones `spec` (`owner/repo[:branch]` or a URL) into `dir` (or the
/// configured clone directory) and streams `clone://progress` events.
#[tauri::command]
pub async fn clone_repo(
    app: tauri::AppHandle,
    spec: String,
    dir: Option<String>,
    branch: Option<String>,
) -> Result<CloneResult, String> {
    let task = tauri::async_runtime::spawn_blocking(move || {
        clone::clone_repo(&spec, dir, branch, |progress| {
            let _ = app.emit("clone://progress", &progress);
        })
        .map_err(|error| error.to_string())
    });
    task.await
        .map_err(|error| format!("clone task failed: {error}"))?
}
