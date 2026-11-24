mod commands;
mod db;
mod error;
mod models;
mod repo;
mod state;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir).map_err(|e| {
                Box::new(std::io::Error::other(format!(
                    "falha ao criar diretório de dados {:?}: {e}",
                    data_dir
                ))) as Box<dyn std::error::Error>
            })?;

            let db_path = data_dir.join("notes.db");
            let conn = db::open(&db_path)?;
            db::run_migrations(&conn)?;
            log::info_placeholder(&db_path);

            app.manage(AppState::new(conn, db_path.clone()));

            // Backup automático (se habilitado nas configurações).
            let state = app.state::<AppState>();
            if let Err(e) = state.with_conn(|conn| repo::backup::maybe_auto_backup(conn, &data_dir)) {
                eprintln!("[notes] auto-backup falhou: {e}");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // projetos
            commands::projects::project_list,
            commands::projects::project_get,
            commands::projects::project_create,
            commands::projects::project_update,
            commands::projects::project_delete,
            // anotações
            commands::notes::note_list,
            commands::notes::note_get,
            commands::notes::note_create,
            commands::notes::note_update,
            commands::notes::note_set_flags,
            commands::notes::note_delete,
            // diário
            commands::activities::activity_list,
            commands::activities::activity_get,
            commands::activities::activity_create,
            commands::activities::activity_update,
            commands::activities::activity_delete,
            // tarefas
            commands::tasks::task_list,
            commands::tasks::task_get,
            commands::tasks::task_create,
            commands::tasks::task_update,
            commands::tasks::task_toggle_done,
            commands::tasks::task_delete,
            // links
            commands::links::link_list,
            commands::links::link_get,
            commands::links::link_create,
            commands::links::link_update,
            commands::links::link_delete,
            // lembretes
            commands::reminders::reminder_list_upcoming,
            commands::reminders::reminder_list_range,
            commands::reminders::reminder_create,
            commands::reminders::reminder_update,
            commands::reminders::reminder_set_done,
            commands::reminders::reminder_delete,
            // diversos
            commands::misc::tag_list,
            commands::misc::search_global,
            commands::misc::dashboard_summary,
            commands::misc::get_db_path,
            commands::settings::settings_get,
            commands::settings::settings_set,
            commands::backup::backup_create,
            commands::backup::backup_restore,
            commands::backup::export_notes_markdown,
            commands::backup::export_activities_markdown,
            commands::backup::export_json,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao executar o Notes");
}

/// Logging mínimo para stderr (usado em dev; em release o console fica oculto).
mod log {
    pub fn info_placeholder(db_path: &std::path::Path) {
        eprintln!("[notes] banco de dados: {}", db_path.display());
    }
}
