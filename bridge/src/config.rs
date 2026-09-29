//! Clone-directory preference, stored in the shared `gitnapse` account config
//! (the same file used by the CLI and the TUI).

use anyhow::{Result, bail};
use gitnapse::config::AccountConfig;

/// Current default clone directory from the account config.
pub fn clone_dir() -> Result<String> {
    let account = AccountConfig::load_or_default()?;
    let dir = account.preferred_clone_dir.trim();
    if dir.is_empty() {
        bail!("no default clone folder configured");
    }
    Ok(dir.to_string())
}

/// Persists the default clone directory and returns the stored value.
///
/// A `None` or blank `dir` leaves the configuration untouched and returns the
/// currently configured directory.
pub fn set_clone_dir(dir: Option<&str>) -> Result<String> {
    let Some(dir) = dir.map(str::trim).filter(|dir| !dir.is_empty()) else {
        return clone_dir();
    };
    let mut account = AccountConfig::load_or_default()?;
    account.preferred_clone_dir = dir.to_string();
    account.save()?;
    Ok(account.preferred_clone_dir.clone())
}
