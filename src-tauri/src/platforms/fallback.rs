//! Fallback for unsupported operating systems.

/// Not supported on this platform.
#[tauri::command]
pub fn open_in_file_manager(path: String) -> Result<(), String> {
    Err(format!("cannot open folders on this platform ({path})"))
}
