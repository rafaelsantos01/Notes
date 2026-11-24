use tauri::State;

use crate::error::AppResult;
use crate::models::{Reminder, ReminderInput};
use crate::repo;
use crate::state::AppState;

#[tauri::command]
pub async fn reminder_list_upcoming(
    state: State<'_, AppState>,
    limit: Option<i64>,
) -> AppResult<Vec<Reminder>> {
    state.with_conn(|conn| repo::reminders::list_upcoming(conn, limit.unwrap_or(10)))
}

#[tauri::command]
pub async fn reminder_list_range(
    state: State<'_, AppState>,
    from: String,
    to: String,
) -> AppResult<Vec<Reminder>> {
    state.with_conn(|conn| repo::reminders::list_range(conn, &from, &to))
}

#[tauri::command]
pub async fn reminder_create(state: State<'_, AppState>, input: ReminderInput) -> AppResult<Reminder> {
    state.with_conn(|conn| repo::reminders::create(conn, &input))
}

#[tauri::command]
pub async fn reminder_update(
    state: State<'_, AppState>,
    id: String,
    input: ReminderInput,
) -> AppResult<Reminder> {
    state.with_conn(|conn| repo::reminders::update(conn, &id, &input))
}

#[tauri::command]
pub async fn reminder_set_done(
    state: State<'_, AppState>,
    id: String,
    done: bool,
) -> AppResult<Reminder> {
    state.with_conn(|conn| repo::reminders::set_done(conn, &id, done))
}

#[tauri::command]
pub async fn reminder_delete(state: State<'_, AppState>, id: String) -> AppResult<()> {
    state.with_conn(|conn| repo::reminders::delete(conn, &id))
}
