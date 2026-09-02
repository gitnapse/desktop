//! Shared (cross-platform) logic.
//!
//! Hybrid architecture decided for GitNapse Desktop:
//! - **GitHub data operations** (search, tree, PRs, issues, releases, auth
//!   status) go through the GitNapse HTTP API: `backend::Api` wraps
//!   `gitnapse-client` pointing at a running `gitnapse-server`.
//! - **Local git and config operations** (clone, folder preferences) run
//!   in-process through the `gitnapse` core SDK: `git_ops`.
//!
//! Nothing in this module depends on the OS (see `platforms/` for that).

pub mod backend;
pub mod commands;
pub mod git_ops;
