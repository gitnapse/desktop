//! Local git + config operations, executed in-process through the `gitnapse`
//! core SDK (same engine the CLI and TUI use; nothing duplicated here).

use gitnapse::config::AccountConfig;

/// Resolve the configured clone destination from the gitnapse account config.
pub fn configured_clone_dir() -> anyhow::Result<String> {
    let account = AccountConfig::load_or_default()?;
    let dir = account.preferred_clone_dir.trim();
    if dir.is_empty() {
        anyhow::bail!("no default clone folder configured");
    }
    Ok(dir.to_string())
}

/// Persist the default clone folder (shared with the CLI and TUI).
pub fn set_clone_dir(dir: &str) -> anyhow::Result<String> {
    let mut account = AccountConfig::load_or_default()?;
    account.preferred_clone_dir = dir.trim().to_string();
    account.save()?;
    Ok(account.preferred_clone_dir.clone())
}

/// Clone `owner/repo[:branch]` or a git URL. The core resolves the clone URL
/// via the GitHub API when given an owner/name, exactly like the CLI.
/// Returns the destination folder (uses the configured default when empty).
pub fn clone_repo(spec: &str, dir: &str) -> anyhow::Result<String> {
    if spec.trim().is_empty() {
        anyhow::bail!("repository spec is empty");
    }
    let dest = if dir.trim().is_empty() {
        configured_clone_dir()?
    } else {
        dir.trim().to_string()
    };
    gitnapse::cli::clone_repo(spec, Some(&dest))?;
    Ok(dest)
}
