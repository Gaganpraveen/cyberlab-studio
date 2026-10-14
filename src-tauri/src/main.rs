// Hide the extra console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Url, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

/// The bundled site loads inside the app window: `tauri://localhost` on macOS
/// and Linux, `http://tauri.localhost` on Windows, and the Vite dev server
/// during `npm run desktop:dev`.
fn is_app_url(url: &Url) -> bool {
    match url.scheme() {
        "tauri" | "about" | "blob" | "data" => true,
        "http" | "https" => matches!(
            url.host_str(),
            Some("tauri.localhost") | Some("localhost") | Some("127.0.0.1")
        ),
        _ => false,
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let config = app
                .config()
                .app
                .windows
                .first()
                .cloned()
                .expect("tauri.conf.json defines the main window");
            let handle = app.handle().clone();
            // Readings, standards and GitHub links open in the system browser,
            // so the app window always stays on CyberLab Studio.
            WebviewWindowBuilder::from_config(app, &config)?
                .on_navigation(move |url| {
                    if is_app_url(url) {
                        return true;
                    }
                    if matches!(url.scheme(), "http" | "https" | "mailto") {
                        let _ = handle.opener().open_url(url.as_str(), None::<&str>);
                    }
                    false
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running CyberLab Studio");
}
