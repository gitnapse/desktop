//! Fallback for unsupported operating systems.

/// Not supported on this platform.
pub fn open_in_file_manager(path: &str) -> Result<(), String> {
    Err(format!("cannot open folders on this platform ({path})"))
}

/// Not supported on this platform.
pub fn open_external(url: &str) -> Result<(), String> {
    Err(format!("cannot open URLs on this platform ({url})"))
}
