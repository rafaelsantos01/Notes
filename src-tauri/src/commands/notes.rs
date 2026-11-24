use tauri::State;

use crate::error::AppResult;
use crate::models::{Note, NoteFlagsInput, NoteInput, NoteListFilter, NoteUpdateInput};
use crate::repo;
use crate::state::AppState;

#[tauri::command]
pub async fn note_list(state: State<'_, AppState>, filter: NoteListFilter) -> AppResult<Vec<Note>> {
    state.with_conn(|conn| repo::notes::list(conn, &filter))
}

#[tauri::command]
pub async fn note_get(state: State<'_, AppState>, id: String) -> AppResult<Note> {
    state.with_conn(|conn| repo::notes::get(conn, &id))
}

#[tauri::command]
pub async fn note_create(state: State<'_, AppState>, input: NoteInput) -> AppResult<Note> {
    state.with_conn(|conn| repo::notes::create(conn, &input))
}

#[tauri::command]
pub async fn note_update(
    state: State<'_, AppState>,
    id: String,
    input: NoteUpdateInput,
) -> AppResult<Note> {
    state.with_conn(|conn| repo::notes::update(conn, &id, &input))
}

#[tauri::command]
pub async fn note_set_flags(state: State<'_, AppState>, input: NoteFlagsInput) -> AppResult<Note> {
    state.with_conn(|conn| repo::notes::set_flags(conn, &input))
}

#[tauri::command]
pub async fn note_delete(state: State<'_, AppState>, id: String) -> AppResult<()> {
    state.with_conn(|conn| repo::notes::delete(conn, &id))
}
