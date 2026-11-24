use tauri::State;

use crate::error::AppResult;
use crate::models::{Project, ProjectInput};
use crate::repo;
use crate::state::AppState;

#[tauri::command]
pub async fn project_list(state: State<'_, AppState>) -> AppResult<Vec<Project>> {
    state.with_conn(repo::projects::list)
}

#[tauri::command]
pub async fn project_get(state: State<'_, AppState>, id: String) -> AppResult<Project> {
    state.with_conn(|conn| repo::projects::get(conn, &id))
}

#[tauri::command]
pub async fn project_create(state: State<'_, AppState>, input: ProjectInput) -> AppResult<Project> {
    state.with_conn(|conn| repo::projects::create(conn, &input))
}

#[tauri::command]
pub async fn project_update(
    state: State<'_, AppState>,
    id: String,
    input: ProjectInput,
) -> AppResult<Project> {
    state.with_conn(|conn| repo::projects::update(conn, &id, &input))
}

#[tauri::command]
pub async fn project_delete(state: State<'_, AppState>, id: String) -> AppResult<()> {
    state.with_conn(|conn| repo::projects::delete(conn, &id))
}
