//! Pure Rust bridge for GitNapse Desktop.
//!
//! This crate holds **all** desktop logic and has no Tauri/webview dependency,
//! so it compiles and unit-tests in containers and CI:
//!
//! - [`api::client`] — typed async wrapper over `gitnapse-client` (remote
//!   GitHub data through a running `gitnapse-server`).
//! - [`api::server`] — `gitnapse-server` sidecar lifecycle (resolve, spawn,
//!   health-check, stop; kills only processes it started).
//! - [`auth`] — token status/store and the step-wise OAuth device flow.
//! - [`clone`] — `git clone` with parsed `clone://progress` events.
//! - [`config`] — clone-directory preference from the shared account config.
//! - [`dto`] — bridge payloads (snake_case, additive) plus re-exports of the
//!   core and protocol DTOs (never redefined).
//! - [`git`] — thin typed wrappers over the local `gitnapse::git` module.
//!
//! The Tauri shell (`src-tauri`) only registers commands that delegate here.

pub mod api;
pub mod auth;
pub mod clone;
pub mod config;
pub mod dto;
pub mod git;
