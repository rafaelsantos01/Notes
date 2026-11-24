use tauri::State;

use crate::error::AppResult;
use crate::models::{Activity, ActivityInput, ActivityListFilter, ActivityUpdateInput};
use crate::repo;
use crate::state::AppState;

#[tauri::command]
pub async fn activity_list(
    state: State<'_, AppState>,
    filter: ActivityListFilter,
) -> AppResult<Vec<Activity>> {
    state.with_conn(|conn| repo::activities::list(conn, &filter))
}

#[tauri::command]
pub async fn activity_get(state: State<'_, AppState>, id: String) -> AppResult<Activity> {
    state.with_conn(|conn| repo::activities::get(conn, &id))
}

#[tauri::command]
pub async fn activity_create(state: State<'_, AppState>, input: ActivityInput) -> AppResult<Activity> {
    state.with_conn(|conn| repo::activities::create(conn, &input))
}

#[tauri::command]
pub async fn activity_update(
    state: State<'_, AppState>,
    id: String,
    input: ActivityUpdateInput,
) -> AppResult<Activity> {
    state.with_conn(|conn| repo::activities::update(conn, &id, &input))
}

#[tauri::command]
pub async fn activity_delete(state: State<'_, AppState>, id: String) -> AppResult<()> {
    state.with_conn(|conn| repo::activities::delete(conn, &id))
}
