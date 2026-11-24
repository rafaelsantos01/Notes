use tauri::State;

use crate::error::AppResult;
use crate::models::{DashboardData, SearchResults, TagInfo};
use crate::repo;
use crate::state::AppState;

#[tauri::command]
pub async fn tag_list(state: State<'_, AppState>) -> AppResult<Vec<TagInfo>> {
    state.with_conn(repo::settings::tag_list)
}

#[tauri::command]
pub async fn search_global(state: State<'_, AppState>, q: String) -> AppResult<SearchResults> {
    state.with_conn(|conn| repo::misc::search_global(conn, &q))
}

#[tauri::command]
pub async fn dashboard_summary(state: State<'_, AppState>) -> AppResult<DashboardData> {
    state.with_conn(repo::misc::dashboard_summary)
}

#[tauri::command]
pub async fn get_db_path(state: State<'_, AppState>) -> AppResult<String> {
    Ok(state.db_path.to_string_lossy().to_string())
}
