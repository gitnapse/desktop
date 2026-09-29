//! Auth commands: token store + OAuth device flow, in-process via the core SDK.

use super::blocking;
use gitnapse_bridge::auth;
use gitnapse_bridge::dto::{AuthStatus, DeviceFlowPoll, DeviceFlowStart};

/// Current token source (and best-effort login) from the shared core store.
#[tauri::command]
pub async fn auth_status() -> Result<AuthStatus, String> {
    blocking(auth::status).await
}

/// Stores a token in the core secure store (shared with CLI/TUI).
#[tauri::command]
pub async fn auth_set_token(token: String) -> Result<(), String> {
    blocking(move || auth::set_token(&token)).await
}

/// Forgets the stored token and any persisted OAuth session.
#[tauri::command]
pub async fn auth_clear_token() -> Result<(), String> {
    blocking(auth::clear_token).await
}

/// Starts the OAuth device flow (step one).
#[tauri::command]
pub async fn auth_login_begin(
    client_id: Option<String>,
    scopes: Option<Vec<String>>,
) -> Result<DeviceFlowStart, String> {
    blocking(move || auth::begin_device_flow(client_id, scopes)).await
}

/// Polls the OAuth device flow once (step two; never sleeps here).
#[tauri::command]
pub async fn auth_login_poll(device_code: String) -> Result<DeviceFlowPoll, String> {
    blocking(move || auth::poll_device_flow(&device_code)).await
}
