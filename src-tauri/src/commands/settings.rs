use tauri::State;

use crate::error::AppResult;
use crate::repo;
use crate::state::AppState;

#[tauri::command]
pub async fn settings_get(state: State<'_, AppState>, key: String) -> AppResult<Option<String>> {
    state.with_conn(|conn| repo::settings::get(conn, &key))
}

#[tauri::command]
pub async fn settings_set(state: State<'_, AppState>, key: String, value: String) -> AppResult<()> {
    state.with_conn(|conn| repo::settings::set(conn, &key, &value))
}
