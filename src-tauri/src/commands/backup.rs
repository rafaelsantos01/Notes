use std::path::PathBuf;

use tauri::State;

use crate::error::AppResult;
use crate::repo;
use crate::state::AppState;

#[tauri::command]
pub async fn backup_create(state: State<'_, AppState>, target_path: String) -> AppResult<()> {
    state.with_conn(|conn| repo::backup::create(conn, &PathBuf::from(target_path)))
}

#[tauri::command]
pub async fn backup_restore(state: State<'_, AppState>, source_path: String) -> AppResult<()> {
    let source = PathBuf::from(source_path);
    let db_path = state.db_path.clone();

    let conn = repo::backup::restore(
        &source,
        &db_path,
        || state.take_conn(),
        || crate::db::open(&db_path),
    )?;
    state.set_conn(conn)
}

#[tauri::command]
pub async fn export_notes_markdown(state: State<'_, AppState>, dir: String) -> AppResult<usize> {
    state.with_conn(|conn| repo::backup::export_notes_markdown(conn, &PathBuf::from(dir)))
}

#[tauri::command]
pub async fn export_activities_markdown(state: State<'_, AppState>, dir: String) -> AppResult<usize> {
    state.with_conn(|conn| repo::backup::export_activities_markdown(conn, &PathBuf::from(dir)))
}

#[tauri::command]
pub async fn export_json(state: State<'_, AppState>, target_path: String) -> AppResult<()> {
    state.with_conn(|conn| repo::backup::export_json(conn, &PathBuf::from(target_path)))
}
