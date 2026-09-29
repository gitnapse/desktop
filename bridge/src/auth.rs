//! Authentication through the core SDK: token status/store plus the
//! step-wise OAuth device flow (no TTY, no stdout).

use crate::dto::{AuthStatus, DeviceFlowPoll, DeviceFlowStart};
use anyhow::Result;

/// Token status from the core store, with a best-effort login lookup.
///
/// The login is only resolved when a token exists and the provider answers;
/// failures there never make the command fail.
pub fn status() -> Result<AuthStatus> {
    let source = gitnapse::auth::token_source()?;
    let login = if source.has_token() {
        authenticated_login()
    } else {
        None
    };
    Ok(AuthStatus {
        has_token: source.has_token(),
        source: source.label().to_string(),
        login,
    })
}

fn authenticated_login() -> Option<String> {
    let token = gitnapse::auth::load_token().ok().flatten()?;
    let provider = gitnapse::provider::create_provider(
        gitnapse::provider::ProviderKind::GitHub,
        Some(token.as_str()),
    )
    .ok()?;
    provider.fetch_authenticated_user().ok().flatten()
}

/// Stores a token in the core secure store (shared with CLI/TUI).
pub fn set_token(token: &str) -> Result<()> {
    gitnapse::auth::save_token(token)
}

/// Forgets the stored token and any persisted OAuth session.
pub fn clear_token() -> Result<()> {
    gitnapse::auth::clear_token()
}

/// Starts the OAuth device flow; `scopes` defaults to `read:user` in the core.
pub fn begin_device_flow(
    client_id: Option<String>,
    scopes: Option<Vec<String>>,
) -> Result<DeviceFlowStart> {
    gitnapse::oauth::begin_device_flow(client_id, &scopes.unwrap_or_default())
}

/// Performs a single poll of the device flow (never blocks between polls).
pub fn poll_device_flow(device_code: &str) -> Result<DeviceFlowPoll> {
    Ok(gitnapse::oauth::complete_device_flow(device_code)?.into())
}
