//! Platform-specific behavior, dispatched by `cfg(target_os)`.
//!
//! Everything generic lives in `shared/`; this tree only holds the few
//! operations that genuinely differ per OS (opening folders in the file
//! manager, future: notifications, app menu, deep links, updater...).

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
