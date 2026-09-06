//! LeanAI Desktop — Tauri application layer.
//!
//! This crate owns process, database and IPC concerns. All product policy
//! (what may be scanned, selected, bundled or read) lives in `leanai-core`, so
//! the rules are testable without a running desktop app and cannot be bypassed
//! by adding a command here.

pub mod app_state;
pub mod commands;
pub mod db;
pub mod error;
pub mod keychain;
pub mod sidecar_manager;

use app_state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let state = AppState::initialize(app_data_dir).map_err(|error| {
                std::io::Error::other(format!("{}: {}", error.code, error.message))
            })?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::projects::open_project,
            commands::projects::close_project,
            commands::projects::list_projects,
            commands::projects::scan_project,
            commands::projects::cancel_scan,
            commands::projects::git_status,
            commands::projects::changed_files,
            commands::projects::preview_ai_ignore,
            commands::projects::read_ai_ignore,
            commands::projects::write_ai_ignore,
            commands::projects::forget_project,
            commands::bundles::resolve_selection,
            commands::bundles::directory_states,
            commands::bundles::build_bundle,
            commands::bundles::export_preflight,
            commands::bundles::export_bundle,
            commands::bundles::save_preset,
            commands::bundles::list_presets,
            commands::bundles::rename_preset,
            commands::bundles::delete_preset,
            commands::bundles::bundle_history,
            commands::bundles::clear_bundle_history,
            commands::bundles::audit_log,
            commands::context::generate_context,
            commands::context::load_context,
            commands::context::context_change_impact,
            commands::context::fetch_source,
            commands::context::save_context_document,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::describe_policy,
            commands::settings::reset_settings,
            commands::diagnostics::diagnostics,
            commands::models::list_models,
            commands::models::register_local_model,
            commands::models::unregister_model,
            commands::models::start_local_model,
            commands::models::stop_local_model,
            commands::models::local_model_status,
            commands::models::list_providers,
            commands::models::configure_provider_credential,
            commands::models::disconnect_provider,
            commands::models::check_provider_status,
            commands::models::get_model_catalog,
            commands::models::route_task,
            commands::models::estimate_provider_tokens,
        ])
        .run(tauri::generate_context!())
        .expect("error while running LeanAI Desktop");
}
