//! Auth commands: token store + OAuth device flow, in-process via the core SDK.
//!
//! The core store is the single source of truth. Because remote GitHub data is
//! served by the managed `gitnapse-server`, every mutation here also propagates
//! to that server (best effort) so the running process reflects the new token
//! without a manual restart.

use super::blocking;
use crate::AppState;
use gitnapse_bridge::auth;
use gitnapse_bridge::dto::{AuthStatus, DeviceFlowPoll, DeviceFlowStart, DevicePollStatus};
use tauri::State;

/// Current token source (and best-effort login) from the shared core store.
#[tauri::command]
pub async fn auth_status() -> Result<AuthStatus, String> {
    blocking(auth::status).await
}

/// Stores a token in the core secure store (shared with CLI/TUI) and activates
/// it on the managed server so remote data uses it immediately.
#[tauri::command]
pub async fn auth_set_token(state: State<'_, AppState>, token: String) -> Result<(), String> {
    let secret = token.clone();
    blocking(move || auth::set_token(&secret)).await?;
    if let Ok(client) = state.client().await {
        if let Err(error) = client.set_token(&token).await {
            eprintln!("gitnapse: could not activate the token on gitnapse-server: {error}");
        }
    }
    Ok(())
}

/// Forgets the stored token / OAuth session and clears it on the server too.
#[tauri::command]
pub async fn auth_clear_token(state: State<'_, AppState>) -> Result<(), String> {
    blocking(auth::clear_token).await?;
    if let Ok(client) = state.client().await {
        if let Err(error) = client.clear_token().await {
            eprintln!("gitnapse: could not clear the token on gitnapse-server: {error}");
        }
    }
    Ok(())
}

/// Starts the OAuth device flow (step one).
#[tauri::command]
pub async fn auth_login_begin(
    client_id: Option<String>,
    scopes: Option<Vec<String>>,
) -> Result<DeviceFlowStart, String> {
    blocking(move || auth::begin_device_flow(client_id, scopes)).await
}

/// Polls the OAuth device flow once (step two; never sleeps here). When the
/// flow completes, the owned server is recycled so it reloads the freshly
/// stored token from the core store.
#[tauri::command]
pub async fn auth_login_poll(
    state: State<'_, AppState>,
    device_code: String,
) -> Result<DeviceFlowPoll, String> {
    let poll = blocking(move || auth::poll_device_flow(&device_code)).await?;
    if poll.status == DevicePollStatus::Done {
        let server = state.server();
        let _ = blocking(move || {
            let mut manager = server
                .lock()
                .map_err(|_| "server lock poisoned".to_string())?;
            Ok::<_, String>(manager.stop())
        })
        .await;
        let _ = state.client().await;
    }
    Ok(poll)
}
