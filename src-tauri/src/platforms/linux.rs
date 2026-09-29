//! Linux platform backend (`xdg-open`).

use std::process::Command;

/// Opens a folder in the default file manager.
pub fn open_in_file_manager(path: &str) -> Result<(), String> {
    Command::new("xdg-open")
        .arg(path)
        .status()
        .map(|_| ())
        .map_err(|error| format!("cannot open folder with xdg-open: {error}"))
}

/// Opens a URL in the default browser.
pub fn open_external(url: &str) -> Result<(), String> {
    Command::new("xdg-open")
        .arg(url)
        .status()
        .map(|_| ())
        .map_err(|error| format!("cannot open URL with xdg-open: {error}"))
}
