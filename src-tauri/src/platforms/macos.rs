//! macOS platform backend (`open`).

use std::process::Command;

/// Opens a folder in Finder.
pub fn open_in_file_manager(path: &str) -> Result<(), String> {
    Command::new("open")
        .arg(path)
        .status()
        .map(|_| ())
        .map_err(|error| format!("cannot open folder with open(1): {error}"))
}

/// Opens a URL in the default browser.
pub fn open_external(url: &str) -> Result<(), String> {
    Command::new("open")
        .arg(url)
        .status()
        .map(|_| ())
        .map_err(|error| format!("cannot open URL with open(1): {error}"))
}
