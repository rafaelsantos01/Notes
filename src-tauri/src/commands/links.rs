use tauri::State;

use crate::error::AppResult;
use crate::models::{LinkInput, LinkItem, LinkListFilter};
use crate::repo;
use crate::state::AppState;

#[tauri::command]
pub async fn link_list(state: State<'_, AppState>, filter: LinkListFilter) -> AppResult<Vec<LinkItem>> {
    state.with_conn(|conn| repo::links::list(conn, &filter))
}

#[tauri::command]
pub async fn link_get(state: State<'_, AppState>, id: String) -> AppResult<LinkItem> {
    state.with_conn(|conn| repo::links::get(conn, &id))
}

#[tauri::command]
pub async fn link_create(state: State<'_, AppState>, input: LinkInput) -> AppResult<LinkItem> {
    state.with_conn(|conn| repo::links::create(conn, &input))
}

#[tauri::command]
pub async fn link_update(
    state: State<'_, AppState>,
    id: String,
    input: LinkInput,
) -> AppResult<LinkItem> {
    state.with_conn(|conn| repo::links::update(conn, &id, &input))
}

#[tauri::command]
pub async fn link_delete(state: State<'_, AppState>, id: String) -> AppResult<()> {
    state.with_conn(|conn| repo::links::delete(conn, &id))
}
