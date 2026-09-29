//! Windows platform backend (explorer / `cmd start`).

use std::process::Command;

/// Opens a folder in Windows Explorer.
pub fn open_in_file_manager(path: &str) -> Result<(), String> {
    Command::new("explorer")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("cannot open folder with explorer: {error}"))
}

/// Opens a URL in the default browser.
pub fn open_external(url: &str) -> Result<(), String> {
    Command::new("cmd")
        .args(["/C", "start", "", url])
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("cannot open URL with cmd start: {error}"))
}
