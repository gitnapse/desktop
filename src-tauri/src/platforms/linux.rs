//! Linux platform backend (xdg-open based).

/// Open a folder in the default file manager.
#[tauri::command]
pub fn open_in_file_manager(path: String) -> Result<(), String> {
    std::process::Command::new("xdg-open")
        .arg(&path)
        .status()
        .map(|_| ())
        .map_err(|e| format!("cannot open folder with xdg-open: {e}"))
}
