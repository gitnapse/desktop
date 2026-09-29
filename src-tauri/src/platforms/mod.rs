//! Platform-specific behavior, dispatched by `cfg(target_os)`.
//!
//! Only genuine OS differences live here (opening folders in the file
//! manager, opening URLs in the browser); everything else is in the bridge
//! crate. Signals are surfaced through Tauri commands in `commands/platform`.

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "linux")]
pub use linux::*;
#[cfg(target_os = "macos")]
pub use macos::*;
#[cfg(target_os = "windows")]
pub use windows::*;

/// Fallback for unsupported targets (e.g. CI on other unixes).
#[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
mod fallback;
#[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
pub use fallback::*;
