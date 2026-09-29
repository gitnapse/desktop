//! Platform commands: open folders in the file manager / URLs in the browser.

/// Opens a folder in the OS file manager (xdg-open / open / explorer).
#[tauri::command]
pub fn open_in_file_manager(path: String) -> Result<(), String> {
    crate::platforms::open_in_file_manager(&path)
}

/// Opens a URL in the default browser (xdg-open / open / cmd start).
#[tauri::command]
pub fn open_external(url: String) -> Result<(), String> {
    crate::platforms::open_external(&url)
}
