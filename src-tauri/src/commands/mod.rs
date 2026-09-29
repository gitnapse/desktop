//! Tauri command modules — one per area of the frozen contract.
//!
//! Every command delegates to `gitnapse-bridge`; this crate holds no logic.

pub mod auth;
pub mod git;
pub mod local;
pub mod platform;
pub mod remote;

use tauri::async_runtime::spawn_blocking;

/// Runs a blocking bridge call on Tauri's blocking pool so the webview never
/// freezes. Bridge errors are stringified for the command boundary.
pub async fn blocking<T, E, F>(job: F) -> Result<T, String>
where
    T: Send + 'static,
    E: std::fmt::Display + Send + 'static,
    F: FnOnce() -> Result<T, E> + Send + 'static,
{
    match spawn_blocking(job).await {
        Ok(Ok(value)) => Ok(value),
        Ok(Err(error)) => Err(error.to_string()),
        Err(error) => Err(format!("blocking task failed: {error}")),
    }
}
