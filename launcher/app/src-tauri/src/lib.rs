mod launch;
mod sync;

use launch::LaunchPayload;
use sync::{get_config, LauncherConfig, SyncSummary};

#[tauri::command]
fn get_launcher_config(
    custom_mods_url: Option<String>,
    custom_game_dir: Option<String>,
) -> LauncherConfig {
    get_config(custom_mods_url, custom_game_dir)
}

#[tauri::command]
async fn start_synchronization(
    app: tauri::AppHandle,
    custom_mods_url: Option<String>,
    custom_game_dir: Option<String>,
) -> Result<SyncSummary, String> {
    sync::execute_sync(app, custom_mods_url, custom_game_dir).await
}

#[tauri::command]
async fn launch_minecraft(
    app: tauri::AppHandle,
    payload: LaunchPayload,
) -> Result<String, String> {
    launch::launch_minecraft_game(app, payload).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenvy::dotenv().ok();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_launcher_config,
            start_synchronization,
            launch_minecraft
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
