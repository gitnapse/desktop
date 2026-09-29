//! Local git operations: thin typed wrappers over `gitnapse::git`.
//!
//! Every function takes an explicit `cwd` and returns structured data; no
//! stdout parsing happens here. The JS diff shape is converted to the core
//! [`DiffMode`] with explicit validation.

use anyhow::{Result, bail};
use std::path::Path;

// Result DTOs and DiffMode come from the core — single source of truth.
pub use gitnapse::git::{
    DiffMode, FileChange, GitBranch, GitLogEntry, GitRemote, GitRepoInfo, GitStashEntry, GitStatus,
    GitTag,
};

/// The JS-side diff request shape: `{ kind, path?, rev?, from?, to? }`.
#[derive(Debug, Clone, serde::Deserialize)]
pub struct DiffModeRequest {
    /// `worktree`, `staged`, `commit` or `range`.
    pub kind: String,
    /// Optional repository-relative path filter.
    #[serde(default)]
    pub path: Option<String>,
    /// Commit-ish for `commit`.
    #[serde(default)]
    pub rev: Option<String>,
    /// Base revision for `range`.
    #[serde(default)]
    pub from: Option<String>,
    /// Head revision for `range`.
    #[serde(default)]
    pub to: Option<String>,
}

impl DiffModeRequest {
    /// Builds the typed core [`DiffMode`], validating the required fields.
    pub fn to_diff_mode(&self) -> Result<DiffMode> {
        let path = || {
            self.path
                .clone()
                .map(|path| path.trim().to_string())
                .filter(|path| !path.is_empty())
        };
        let required = |value: &Option<String>, field: &str, kind: &str| -> Result<String> {
            value
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string)
                .ok_or_else(|| anyhow::anyhow!("diff kind '{kind}' requires '{field}'"))
        };
        match self.kind.trim() {
            "worktree" => Ok(DiffMode::Worktree { path: path() }),
            "staged" => Ok(DiffMode::Staged { path: path() }),
            "commit" => Ok(DiffMode::Commit {
                rev: required(&self.rev, "rev", "commit")?,
                path: path(),
            }),
            "range" => Ok(DiffMode::Range {
                from: required(&self.from, "from", "range")?,
                to: required(&self.to, "to", "range")?,
                path: path(),
            }),
            other => {
                bail!("unknown diff kind '{other}' (expected worktree, staged, commit or range)")
            }
        }
    }
}

/// Repository metadata for `cwd`.
pub fn repo_info(cwd: &Path) -> Result<GitRepoInfo> {
    gitnapse::git::repo_info(cwd)
}

/// Working tree and index state for `cwd`.
pub fn status(cwd: &Path) -> Result<GitStatus> {
    gitnapse::git::status(cwd)
}

/// Up to `limit` commits of the current branch, newest first.
pub fn log(cwd: &Path, limit: usize) -> Result<Vec<GitLogEntry>> {
    gitnapse::git::log(cwd, limit)
}

/// Unified diff for `mode`.
pub fn diff(cwd: &Path, mode: &DiffMode) -> Result<String> {
    gitnapse::git::diff(cwd, mode)
}

/// Stages the given paths.
pub fn stage(cwd: &Path, paths: &[String]) -> Result<()> {
    gitnapse::git::stage(cwd, paths)
}

/// Unstages the given paths.
pub fn unstage(cwd: &Path, paths: &[String]) -> Result<()> {
    gitnapse::git::unstage(cwd, paths)
}

/// Discards working tree changes for the given tracked paths.
pub fn discard(cwd: &Path, paths: &[String]) -> Result<()> {
    gitnapse::git::discard(cwd, paths)
}

/// Commits the index (optionally staging all changes first); returns the hash.
pub fn commit(cwd: &Path, message: &str, all: bool) -> Result<String> {
    gitnapse::git::commit(cwd, message, all)
}

/// Pushes and returns the command's stdout.
pub fn push(
    cwd: &Path,
    remote: Option<&str>,
    branch: Option<&str>,
    force: bool,
    set_upstream: bool,
) -> Result<String> {
    gitnapse::git::push(cwd, remote, branch, force, set_upstream)
}

/// Pulls and returns the command's stdout.
pub fn pull(
    cwd: &Path,
    remote: Option<&str>,
    branch: Option<&str>,
    rebase: bool,
) -> Result<String> {
    gitnapse::git::pull(cwd, remote, branch, rebase)
}

/// Fetches and returns the command's stdout.
pub fn fetch(cwd: &Path, prune: bool) -> Result<String> {
    gitnapse::git::fetch(cwd, prune)
}

/// Lists local branches with their upstream tracking state.
pub fn branches(cwd: &Path) -> Result<Vec<GitBranch>> {
    gitnapse::git::branches(cwd)
}

/// Checks out `branch`, creating it when `create` is true.
pub fn checkout(cwd: &Path, branch: &str, create: bool) -> Result<()> {
    gitnapse::git::checkout(cwd, branch, create)
}

/// Creates `name` without switching to it, optionally from `from`.
pub fn branch_create(cwd: &Path, name: &str, from: Option<&str>) -> Result<()> {
    gitnapse::git::branch_create(cwd, name, from)
}

/// Deletes a local branch (`-D` when `force`).
pub fn branch_delete(cwd: &Path, name: &str, force: bool) -> Result<()> {
    gitnapse::git::branch_delete(cwd, name, force)
}

/// Merges `branch` into the current branch; returns the command's stdout.
pub fn merge(cwd: &Path, branch: &str) -> Result<String> {
    gitnapse::git::merge(cwd, branch)
}

/// Resets HEAD to `target` (default `HEAD`), optionally hard.
pub fn reset(cwd: &Path, target: Option<&str>, hard: bool) -> Result<()> {
    gitnapse::git::reset(cwd, target, hard)
}

/// Lists stash entries, newest first.
pub fn stash_list(cwd: &Path) -> Result<Vec<GitStashEntry>> {
    gitnapse::git::stash_list(cwd)
}

/// Stashes the current changes with an optional message.
pub fn stash_push(cwd: &Path, message: Option<&str>) -> Result<()> {
    gitnapse::git::stash_push(cwd, message)
}

/// Pops the stash at `index` (default: most recent).
pub fn stash_pop(cwd: &Path, index: Option<u32>) -> Result<()> {
    gitnapse::git::stash_pop(cwd, index)
}

/// Drops the stash at `index` (default: most recent).
pub fn stash_drop(cwd: &Path, index: Option<u32>) -> Result<()> {
    gitnapse::git::stash_drop(cwd, index)
}

/// Lists tags.
pub fn tags(cwd: &Path) -> Result<Vec<GitTag>> {
    gitnapse::git::tags(cwd)
}

/// Creates a tag, optionally annotated and/or pointing at `target`.
pub fn tag_create(
    cwd: &Path,
    name: &str,
    message: Option<&str>,
    target: Option<&str>,
) -> Result<()> {
    gitnapse::git::tag_create(cwd, name, message, target)
}

/// Deletes a local tag.
pub fn tag_delete(cwd: &Path, name: &str) -> Result<()> {
    gitnapse::git::tag_delete(cwd, name)
}

/// Lists configured remotes.
pub fn remotes(cwd: &Path) -> Result<Vec<GitRemote>> {
    gitnapse::git::remotes(cwd)
}

/// Adds a remote.
pub fn remote_add(cwd: &Path, name: &str, url: &str) -> Result<()> {
    gitnapse::git::remote_add(cwd, name, url)
}

/// Removes a remote.
pub fn remote_remove(cwd: &Path, name: &str) -> Result<()> {
    gitnapse::git::remote_remove(cwd, name)
}

/// Renames a remote.
pub fn remote_rename(cwd: &Path, old: &str, new: &str) -> Result<()> {
    gitnapse::git::remote_rename(cwd, old, new)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn diff_request_builds_worktree_and_staged() {
        let worktree = DiffModeRequest {
            kind: "worktree".into(),
            path: None,
            rev: None,
            from: None,
            to: None,
        }
        .to_diff_mode()
        .expect("worktree");
        assert_eq!(worktree, DiffMode::Worktree { path: None });

        let staged = DiffModeRequest {
            kind: "staged".into(),
            path: Some(" src/main.rs ".into()),
            rev: None,
            from: None,
            to: None,
        }
        .to_diff_mode()
        .expect("staged");
        assert_eq!(
            staged,
            DiffMode::Staged {
                path: Some("src/main.rs".into())
            }
        );
    }

    #[test]
    fn diff_request_builds_commit_and_range() {
        let commit = DiffModeRequest {
            kind: "commit".into(),
            path: None,
            rev: Some("HEAD~1".into()),
            from: None,
            to: None,
        }
        .to_diff_mode()
        .expect("commit");
        assert_eq!(
            commit,
            DiffMode::Commit {
                rev: "HEAD~1".into(),
                path: None
            }
        );

        let range = DiffModeRequest {
            kind: "range".into(),
            path: None,
            rev: None,
            from: Some("main".into()),
            to: Some("feature".into()),
        }
        .to_diff_mode()
        .expect("range");
        assert_eq!(
            range,
            DiffMode::Range {
                from: "main".into(),
                to: "feature".into(),
                path: None
            }
        );
    }

    #[test]
    fn diff_request_rejects_missing_fields_and_unknown_kinds() {
        let missing_rev = DiffModeRequest {
            kind: "commit".into(),
            path: None,
            rev: None,
            from: None,
            to: None,
        };
        assert!(
            missing_rev
                .to_diff_mode()
                .unwrap_err()
                .to_string()
                .contains("rev")
        );

        let missing_to = DiffModeRequest {
            kind: "range".into(),
            path: None,
            rev: None,
            from: Some("main".into()),
            to: None,
        };
        assert!(
            missing_to
                .to_diff_mode()
                .unwrap_err()
                .to_string()
                .contains("to")
        );

        let unknown = DiffModeRequest {
            kind: "sideways".into(),
            path: None,
            rev: None,
            from: None,
            to: None,
        };
        assert!(
            unknown
                .to_diff_mode()
                .unwrap_err()
                .to_string()
                .contains("sideways")
        );
    }

    #[test]
    fn diff_request_deserializes_the_js_shape() {
        let request: DiffModeRequest = serde_json::from_value(serde_json::json!({
            "kind": "range",
            "from": "main",
            "to": "dev"
        }))
        .expect("deserialize");
        assert_eq!(request.path, None);
        assert_eq!(
            request.to_diff_mode().expect("range"),
            DiffMode::Range {
                from: "main".into(),
                to: "dev".into(),
                path: None
            }
        );
    }
}
