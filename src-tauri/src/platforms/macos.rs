//! macOS platform backend (`open` command).

/// Open a folder in Finder.
#[tauri::command]
pub fn open_in_file_manager(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .arg(&path)
        .status()
        .map(|_| ())
        .map_err(|e| format!("cannot open folder with open(1): {e}"))
}
