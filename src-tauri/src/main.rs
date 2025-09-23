// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WebviewWindowBuilder, LogicalSize, LogicalPosition};
use tauri::State;
use std::sync::Mutex;

// Store window references for management
type WindowStore = Mutex<Vec<String>>;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn create_floating_window(
    app: tauri::AppHandle,
    window_store: State<'_, WindowStore>,
) -> Result<String, String> {
    let window_id = format!("floating-{}", chrono::Utc::now().timestamp_millis());

    let window = WebviewWindowBuilder::new(
        &app,
        &window_id,
        tauri::WebviewUrl::App("index.html".into())
    )
    .title("Floating Panel")
    .inner_size(LogicalSize::new(400.0, 300.0))
    .position(LogicalPosition::new(100.0, 100.0))
    .resizable(true)
    .decorations(true)
    .always_on_top(true)
    .skip_taskbar(false)
    .build();

    match window {
        Ok(win) => {
            // Store window ID for management
            window_store.lock().unwrap().push(window_id.clone());

            // Send initialization message to the new window
            let _ = win.emit("window-type", "floating-panel");

            Ok(window_id)
        }
        Err(e) => Err(format!("Failed to create window: {}", e))
    }
}

#[tauri::command]
async fn close_floating_window(
    app: tauri::AppHandle,
    window_store: State<'_, WindowStore>,
    window_id: String,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_id) {
        window.close().map_err(|e| format!("Failed to close window: {}", e))?;

        // Remove from store
        let mut store = window_store.lock().unwrap();
        store.retain(|id| id != &window_id);

        Ok(())
    } else {
        Err("Window not found".to_string())
    }
}

#[tauri::command]
async fn list_floating_windows(
    window_store: State<'_, WindowStore>,
) -> Result<Vec<String>, String> {
    Ok(window_store.lock().unwrap().clone())
}

#[tauri::command]
async fn update_window_position(
    app: tauri::AppHandle,
    window_id: String,
    x: f64,
    y: f64,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_id) {
        window.set_position(LogicalPosition::new(x, y))
            .map_err(|e| format!("Failed to update position: {}", e))?;
        Ok(())
    } else {
        Err("Window not found".to_string())
    }
}

#[tauri::command]
async fn update_window_size(
    app: tauri::AppHandle,
    window_id: String,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_id) {
        window.set_size(LogicalSize::new(width, height))
            .map_err(|e| format!("Failed to update size: {}", e))?;
        Ok(())
    } else {
        Err("Window not found".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(WindowStore::new(Vec::new()))
        .invoke_handler(tauri::generate_handler![
            greet,
            create_floating_window,
            close_floating_window,
            list_floating_windows,
            update_window_position,
            update_window_size
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}