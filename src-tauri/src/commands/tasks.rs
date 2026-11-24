use tauri::State;

use crate::error::AppResult;
use crate::models::{Task, TaskInput, TaskListFilter, TaskUpdateInput};
use crate::repo;
use crate::state::AppState;

#[tauri::command]
pub async fn task_list(state: State<'_, AppState>, filter: TaskListFilter) -> AppResult<Vec<Task>> {
    state.with_conn(|conn| repo::tasks::list(conn, &filter))
}

#[tauri::command]
pub async fn task_get(state: State<'_, AppState>, id: String) -> AppResult<Task> {
    state.with_conn(|conn| repo::tasks::get(conn, &id))
}

#[tauri::command]
pub async fn task_create(state: State<'_, AppState>, input: TaskInput) -> AppResult<Task> {
    state.with_conn(|conn| repo::tasks::create(conn, &input))
}

#[tauri::command]
pub async fn task_update(
    state: State<'_, AppState>,
    id: String,
    input: TaskUpdateInput,
) -> AppResult<Task> {
    state.with_conn(|conn| repo::tasks::update(conn, &id, &input))
}

#[tauri::command]
pub async fn task_toggle_done(
    state: State<'_, AppState>,
    id: String,
    done: bool,
) -> AppResult<Task> {
    state.with_conn(|conn| repo::tasks::toggle_done(conn, &id, done))
}

#[tauri::command]
pub async fn task_delete(state: State<'_, AppState>, id: String) -> AppResult<()> {
    state.with_conn(|conn| repo::tasks::delete(conn, &id))
}
