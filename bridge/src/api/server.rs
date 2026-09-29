//! `gitnapse-server` sidecar lifecycle.
//!
//! Resolution order for the binary: `GITNAPSE_SERVER_BIN` → the sibling of
//! the current executable (where Tauri places `externalBin` sidecars) →
//! `gitnapse-server` on `PATH` → a documented error. The base URL comes from
//! `GITNAPSE_SERVER_URL` (default `http://127.0.0.1:8787`).
//!
//! [`ServerManager::ensure_running`] probes `GET /health` and only spawns its
//! own process when nothing answers; it remembers ownership and kills **only
//! owned** processes on [`ServerManager::stop`] / drop.

use crate::dto::{ServerState, ServerStatus};
use anyhow::{Context, Result, bail};
use std::ffi::OsStr;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, ExitStatus, Stdio};
use std::time::Duration;

/// Environment variable overriding the resolved server binary.
pub const ENV_SERVER_BIN: &str = "GITNAPSE_SERVER_BIN";
/// Environment variable overriding the server base URL.
pub const ENV_SERVER_URL: &str = "GITNAPSE_SERVER_URL";
/// Default loopback URL of the protocol server.
pub const DEFAULT_SERVER_URL: &str = "http://127.0.0.1:8787";

const DEFAULT_HOST: &str = "127.0.0.1";
const DEFAULT_PORT: u16 = 8787;
const HEALTH_RETRIES: u32 = 20;
const HEALTH_DELAY: Duration = Duration::from_millis(150);
const HEALTH_TIMEOUT: Duration = Duration::from_secs(2);

/// Owns the `gitnapse-server` process it spawns (never external servers).
pub struct ServerManager {
    url: String,
    child: Option<Child>,
    owned: bool,
}

impl ServerManager {
    /// Manager for the URL from `GITNAPSE_SERVER_URL` (or the default).
    pub fn from_env() -> Self {
        let url = std::env::var(ENV_SERVER_URL)
            .ok()
            .map(|url| url.trim().to_string())
            .filter(|url| !url.is_empty())
            .unwrap_or_else(|| DEFAULT_SERVER_URL.to_string());
        Self::with_url(url)
    }

    /// Manager for an explicit base URL.
    pub fn with_url(url: impl Into<String>) -> Self {
        Self {
            url: url.into(),
            child: None,
            owned: false,
        }
    }

    /// Base URL this manager talks to.
    pub fn url(&self) -> &str {
        &self.url
    }

    /// Whether the currently tracked process was spawned by this manager.
    pub fn is_owned(&self) -> bool {
        self.owned
    }

    /// Current status; probes `GET /health` (short timeout).
    ///
    /// Returns `starting` while an owned child is alive but not healthy yet.
    pub fn status(&mut self) -> ServerStatus {
        if let Some(version) = self.health_version() {
            return self.status_with(ServerState::Running, Some(version));
        }
        if self.child.is_some() {
            if self.child_exit().is_none() {
                return self.status_with(ServerState::Starting, None);
            }
            self.child = None;
            self.owned = false;
        }
        self.status_with(ServerState::Stopped, None)
    }

    /// Ensures a server answers at [`ServerManager::url`], spawning an owned
    /// sidecar when none does. Blocks while polling health (bounded retries).
    pub fn ensure_running(&mut self) -> Result<ServerStatus> {
        if let Some(version) = self.health_version() {
            return Ok(self.status_with(ServerState::Running, Some(version)));
        }
        self.spawn()
    }

    /// Spawns `gitnapse-server --host <host> --port <port>` and waits for it
    /// to become healthy. Remembered as owned; killed on stop/drop.
    pub fn spawn(&mut self) -> Result<ServerStatus> {
        self.reap();
        let bin = resolve_server_binary()?;
        let (host, port) = spawn_addr(&self.url);
        let child = Command::new(&bin)
            .arg("--host")
            .arg(&host)
            .arg("--port")
            .arg(port.to_string())
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .with_context(|| format!("cannot start gitnapse-server ({})", bin.display()))?;
        self.child = Some(child);
        self.owned = true;

        for _ in 0..HEALTH_RETRIES {
            std::thread::sleep(HEALTH_DELAY);
            if let Some(version) = self.health_version() {
                return Ok(self.status_with(ServerState::Running, Some(version)));
            }
            if let Some(status) = self.child_exit() {
                self.child = None;
                self.owned = false;
                match status {
                    Some(status) => {
                        bail!("gitnapse-server exited before becoming healthy ({status})")
                    }
                    None => bail!("gitnapse-server exited before becoming healthy"),
                }
            }
        }

        let _ = self.stop();
        bail!(
            "gitnapse-server did not become healthy at {} ({} retries)",
            self.url,
            HEALTH_RETRIES
        )
    }

    /// Stops the owned server (external servers are left running) and returns
    /// the resulting status.
    pub fn stop(&mut self) -> ServerStatus {
        self.stop_owned();
        self.status()
    }

    /// Kills and reaps the owned child, if any.
    fn stop_owned(&mut self) {
        if !self.owned {
            return;
        }
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        self.owned = false;
    }

    fn status_with(&self, state: ServerState, version: Option<String>) -> ServerStatus {
        ServerStatus {
            state,
            version,
            url: self.url.clone(),
            owned: self.owned,
        }
    }

    /// Drops a dead child; `Some(status)` when it has exited (status unknown
    /// on a `try_wait` error), `None` while running or when there is none.
    fn child_exit(&mut self) -> Option<Option<ExitStatus>> {
        let child = self.child.as_mut()?;
        match child.try_wait() {
            Ok(Some(status)) => Some(Some(status)),
            Ok(None) => None,
            Err(_) => Some(None),
        }
    }

    fn reap(&mut self) {
        if self.child_exit().is_some() {
            self.child = None;
            self.owned = false;
        }
    }

    /// `GET /health` through the typed client, blocking the calling thread for
    /// at most [`HEALTH_TIMEOUT`]. `None` when unreachable/unhealthy.
    fn health_version(&self) -> Option<String> {
        let client = gitnapse_client::Client::with_timeout(&self.url, HEALTH_TIMEOUT).ok()?;
        gitnapse::runtime::ensure_crypto_provider();
        gitnapse::runtime::get_runtime()
            .block_on(async { client.health().await })
            .ok()
            .map(|health| health.version)
    }
}

impl Drop for ServerManager {
    fn drop(&mut self) {
        self.stop_owned();
    }
}

/// Resolves the `gitnapse-server` executable with the documented precedence.
pub fn resolve_server_binary() -> Result<PathBuf> {
    let exe = std::env::current_exe().ok();
    resolve_binary(
        std::env::var_os(ENV_SERVER_BIN).as_deref(),
        exe.as_deref().and_then(Path::parent),
        std::env::var_os("PATH").as_deref(),
    )
}

/// Testable core of [`resolve_server_binary`].
fn resolve_binary(
    env_bin: Option<&OsStr>,
    exe_dir: Option<&Path>,
    path_var: Option<&OsStr>,
) -> Result<PathBuf> {
    if let Some(bin) = env_bin.filter(|bin| !bin.is_empty()) {
        let candidate = PathBuf::from(bin);
        if candidate.is_file() {
            return Ok(candidate);
        }
        bail!(
            "{ENV_SERVER_BIN} points to '{}', but that file does not exist",
            candidate.display()
        );
    }

    let file_name = server_file_name();
    if let Some(exe_dir) = exe_dir {
        let candidate = exe_dir.join(file_name);
        if candidate.is_file() {
            return Ok(candidate);
        }
    }

    if let Some(path_var) = path_var {
        for dir in std::env::split_paths(path_var) {
            let candidate = dir.join(file_name);
            if candidate.is_file() {
                return Ok(candidate);
            }
        }
    }

    bail!(
        "gitnapse-server binary not found: set {ENV_SERVER_BIN}, place '{file_name}' next to the app executable, or add it to PATH"
    )
}

fn server_file_name() -> &'static str {
    if cfg!(windows) {
        "gitnapse-server.exe"
    } else {
        "gitnapse-server"
    }
}

/// Host/port to pass to `gitnapse-server` for a given base URL.
///
/// Loopback URLs use their own host/port; anything else falls back to the
/// default `127.0.0.1:8787`.
fn spawn_addr(url: &str) -> (String, u16) {
    match url_host_port(url) {
        Some((host, port)) if is_loopback(&host) => (host, port),
        _ => (DEFAULT_HOST.to_string(), DEFAULT_PORT),
    }
}

fn url_host_port(url: &str) -> Option<(String, u16)> {
    let rest = url.split_once("://").map(|(_, rest)| rest).unwrap_or(url);
    let authority = rest.split('/').next().unwrap_or(rest);
    let authority = authority.rsplit('@').next().unwrap_or(authority);
    match authority.rsplit_once(':') {
        Some((host, port)) => Some((
            host.trim_matches(['[', ']']).to_string(),
            port.parse().ok()?,
        )),
        None => Some((authority.to_string(), 80)),
    }
}

fn is_loopback(host: &str) -> bool {
    matches!(host, "127.0.0.1" | "localhost" | "::1")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn env_bin_wins_over_sibling_and_path() {
        let root = tempfile::tempdir().expect("tempdir");
        let env_bin = root.path().join("from-env");
        let sibling = root.path().join(server_file_name());
        let path_dir = root.path().join("path");
        fs::create_dir(&path_dir).expect("path dir");
        let path_bin = path_dir.join(server_file_name());
        for file in [&env_bin, &sibling, &path_bin] {
            fs::write(file, b"#!/bin/sh\n").expect("write fake binary");
        }

        let resolved = resolve_binary(
            Some(env_bin.as_os_str()),
            Some(root.path()),
            Some(path_dir.as_os_str()),
        )
        .expect("resolve");
        assert_eq!(resolved, env_bin);
    }

    #[test]
    fn missing_env_bin_is_reported_instead_of_silently_falling_back() {
        let root = tempfile::tempdir().expect("tempdir");
        let missing = root.path().join("missing-server");
        let error = resolve_binary(Some(missing.as_os_str()), Some(root.path()), None)
            .expect_err("env override must not fall back");
        let message = error.to_string();
        assert!(message.contains(ENV_SERVER_BIN), "message: {message}");
    }

    #[test]
    fn sibling_wins_over_path() {
        let root = tempfile::tempdir().expect("tempdir");
        let sibling = root.path().join(server_file_name());
        let path_dir = root.path().join("path");
        fs::create_dir(&path_dir).expect("path dir");
        fs::write(&sibling, b"#!/bin/sh\n").expect("write sibling");
        fs::write(path_dir.join(server_file_name()), b"#!/bin/sh\n").expect("write path binary");

        let resolved =
            resolve_binary(None, Some(root.path()), Some(path_dir.as_os_str())).expect("resolve");
        assert_eq!(resolved, sibling);
    }

    #[test]
    fn path_is_the_last_resort() {
        let root = tempfile::tempdir().expect("tempdir");
        let empty_dir = root.path().join("empty");
        fs::create_dir(&empty_dir).expect("empty dir");
        let path_dir = root.path().join("path");
        fs::create_dir(&path_dir).expect("path dir");
        let path_bin = path_dir.join(server_file_name());
        fs::write(&path_bin, b"#!/bin/sh\n").expect("write path binary");

        let resolved =
            resolve_binary(None, Some(&empty_dir), Some(path_dir.as_os_str())).expect("resolve");
        assert_eq!(resolved, path_bin);
    }

    #[test]
    fn missing_everywhere_reports_the_documented_locations() {
        let root = tempfile::tempdir().expect("tempdir");
        let error = resolve_binary(None, Some(root.path()), Some(root.path().as_os_str()))
            .expect_err("nothing to resolve");
        let message = error.to_string();
        assert!(message.contains("gitnapse-server"), "message: {message}");
        assert!(message.contains(ENV_SERVER_BIN), "message: {message}");
        assert!(message.contains("PATH"), "message: {message}");
    }

    #[test]
    fn spawn_addr_uses_loopback_url_host_and_port() {
        assert_eq!(
            spawn_addr("http://127.0.0.1:9000"),
            ("127.0.0.1".to_string(), 9000)
        );
        assert_eq!(
            spawn_addr("http://localhost:8788/"),
            ("localhost".to_string(), 8788)
        );
        assert_eq!(spawn_addr("http://[::1]:9001"), ("::1".to_string(), 9001));
    }

    #[test]
    fn spawn_addr_falls_back_to_the_default_for_non_loopback_urls() {
        assert_eq!(
            spawn_addr("https://api.example.com"),
            (DEFAULT_HOST.to_string(), DEFAULT_PORT)
        );
        assert_eq!(
            spawn_addr(DEFAULT_SERVER_URL),
            (DEFAULT_HOST.to_string(), DEFAULT_PORT)
        );
    }
}
