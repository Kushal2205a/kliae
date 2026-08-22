use std::fs;
use std::path::PathBuf;

#[cfg(target_os = "linux")]
use tauri::Manager;

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create dirs: {}", e))?;
    }
    fs::write(&path, &content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
fn file_exists(path: String) -> bool {
    PathBuf::from(&path).exists()
}

#[tauri::command]
fn create_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    if PathBuf::from(&path).is_dir() {
        fs::remove_dir_all(&path).map_err(|e| format!("Failed to remove directory: {}", e))
    } else {
        fs::remove_file(&path).map_err(|e| format!("Failed to remove file: {}", e))
    }
}

#[tauri::command]
fn list_dir(path: String) -> Result<Vec<String>, String> {
    let entries = fs::read_dir(&path).map_err(|e| format!("Failed to read directory: {}", e))?;
    let mut names = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        names.push(entry.file_name().to_string_lossy().to_string());
    }
    Ok(names)
}

#[tauri::command]
fn read_dir(path: String) -> Result<Vec<serde_json::Value>, String> {
    let entries = fs::read_dir(&path).map_err(|e| format!("Failed to read directory: {}", e))?;
    let mut result = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry.metadata().ok();
        result.push(serde_json::json!({
            "name": entry.file_name().to_string_lossy().to_string(),
            "isDir": metadata.map(|m| m.is_dir()).unwrap_or(false),
        }));
    }
    Ok(result)
}

// Under XWayland (GDK_BACKEND=x11) GTK cannot see the compositor's scale
// factor, so the webview renders at 1x and the UI looks tiny on HiDPI
// displays. Detect the real scale ourselves: ask Hyprland first, then fall
// back to Xft.dpi from xrdb.
#[cfg(target_os = "linux")]
fn detect_x11_ui_scale() -> f64 {
    if let Ok(output) = std::process::Command::new("hyprctl")
        .args(["monitors", "-j"])
        .output()
    {
        if let Ok(monitors) = serde_json::from_slice::<serde_json::Value>(&output.stdout) {
            if let Some(list) = monitors.as_array() {
                // Prefer the focused monitor; otherwise use the first sane scale.
                let mut fallback = None;
                for m in list {
                    let scale = m["scale"].as_f64().unwrap_or(1.0);
                    if scale <= 0.0 {
                        continue;
                    }
                    if m["focused"].as_bool() == Some(true) {
                        return scale;
                    }
                    fallback = fallback.or(Some(scale));
                }
                if let Some(scale) = fallback {
                    return scale;
                }
            }
        }
    }

    // Non-Hyprland fallback: X resource Xft.dpi (set by many HiDPI setups).
    if let Ok(output) = std::process::Command::new("xrdb").arg("-query").output() {
        if let Ok(text) = String::from_utf8(output.stdout) {
            for line in text.lines() {
                if let Some(rest) = line.strip_prefix("Xft.dpi:") {
                    if let Ok(dpi) = rest.trim().parse::<f64>() {
                        return dpi / 96.0;
                    }
                }
            }
        }
    }

    1.0
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Route the webview through XWayland on Linux, matching the packaged
    // AppImage (its linuxdeploy GTK hook exports GDK_BACKEND=x11 for the
    // same reason): WebKitGTK's native Wayland backend desyncs its input
    // region from the visual content after interactive window resizes on
    // wlroots-based compositors (Hyprland, sway) — clicks land on stale
    // coordinates, leaving dead buttons and glitchy panning until a forced
    // re-layout. An existing GDK_BACKEND (explicitly set by the user)
    // takes precedence.
    #[cfg(target_os = "linux")]
    if std::env::var_os("GDK_BACKEND").is_none() {
        std::env::set_var("GDK_BACKEND", "x11");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            #[cfg(desktop)]
            {
                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;
            }

            // Compensate for XWayland ignoring the compositor's scale factor
            // by zooming the webview to match. Native Wayland sessions already
            // report the correct scale, so this is x11-only.
            #[cfg(target_os = "linux")]
            if std::env::var_os("GDK_BACKEND")
                .map(|v| v == "x11")
                .unwrap_or(false)
            {
                let scale = detect_x11_ui_scale();
                if scale > 1.0 {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.set_zoom(scale);
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            file_exists,
            create_dir,
            delete_file,
            list_dir,
            read_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}