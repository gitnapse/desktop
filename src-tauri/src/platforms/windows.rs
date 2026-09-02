//! Windows platform backend (explorer).

/// Open a folder in Windows Explorer.
#[tauri::command]
pub fn open_in_file_manager(path: String) -> Result<(), String> {
    std::process::Command::new("explorer")
        .arg(&path)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("cannot open folder with explorer: {e}"))
}
