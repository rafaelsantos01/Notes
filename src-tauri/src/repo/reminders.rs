use rusqlite::{params, Connection};

use crate::error::{not_found, validation, AppResult};
use crate::models::{new_id, now_iso, Reminder, ReminderInput};

const BASE_SELECT: &str =
    "SELECT id, title, remind_at, notes, is_done, entity_type, entity_id, created_at, updated_at
     FROM reminders";

fn row_to_reminder(row: &rusqlite::Row) -> rusqlite::Result<Reminder> {
    Ok(Reminder {
        id: row.get(0)?,
        title: row.get(1)?,
        remind_at: row.get(2)?,
        notes: row.get(3)?,
        is_done: row.get::<_, i64>(4)? != 0,
        entity_type: row.get(5)?,
        entity_id: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

pub fn list_upcoming(conn: &Connection, limit: i64) -> AppResult<Vec<Reminder>> {
    let now = now_iso();
    let mut stmt = conn.prepare(&format!(
        "{BASE_SELECT}
         WHERE is_done = 0 AND remind_at >= ?1
         ORDER BY remind_at ASC LIMIT ?2"
    ))?;
    let rows = stmt.query_map(params![now, limit.clamp(1, 100)], row_to_reminder)?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

pub fn list_range(conn: &Connection, from: &str, to: &str) -> AppResult<Vec<Reminder>> {
    let mut stmt = conn.prepare(&format!(
        "{BASE_SELECT}
         WHERE remind_at >= ?1 AND remind_at <= ?2
         ORDER BY remind_at ASC"
    ))?;
    let rows = stmt.query_map(params![from, to], row_to_reminder)?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

fn get(conn: &Connection, id: &str) -> AppResult<Reminder> {
    let mut stmt = conn.prepare(&format!("{BASE_SELECT} WHERE id = ?1"))?;
    let mut rows: Vec<Reminder> = stmt
        .query_map(params![id], row_to_reminder)?
        .filter_map(|r| r.ok())
        .collect();
    rows.pop().ok_or_else(|| not_found("Lembrete"))
}

pub fn create(conn: &Connection, input: &ReminderInput) -> AppResult<Reminder> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err(validation("O título do lembrete é obrigatório"));
    }
    if input.remind_at.trim().is_empty() {
        return Err(validation("A data do lembrete é obrigatória"));
    }

    let id = new_id();
    let now = now_iso();
    conn.execute(
        "INSERT INTO reminders (id, title, remind_at, notes, is_done, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 0, ?5, ?5)",
        params![id, title, input.remind_at, input.notes.clone().unwrap_or_default(), now],
    )?;
    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, input: &ReminderInput) -> AppResult<Reminder> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err(validation("O título do lembrete é obrigatório"));
    }
    let changed = conn.execute(
        "UPDATE reminders SET title = ?2, remind_at = ?3, notes = ?4, updated_at = ?5 WHERE id = ?1",
        params![id, title, input.remind_at, input.notes.clone().unwrap_or_default(), now_iso()],
    )?;
    if changed == 0 {
        return Err(not_found("Lembrete"));
    }
    get(conn, id)
}

pub fn set_done(conn: &Connection, id: &str, done: bool) -> AppResult<Reminder> {
    let changed = conn.execute(
        "UPDATE reminders SET is_done = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, done, now_iso()],
    )?;
    if changed == 0 {
        return Err(not_found("Lembrete"));
    }
    get(conn, id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    conn.execute("DELETE FROM reminders WHERE id = ?1", params![id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    #[test]
    fn lista_somente_futuros_pendentes() {
        let conn = open_in_memory().unwrap();
        let past = "2020-01-01T00:00:00.000Z";
        let future = "2999-01-01T00:00:00.000Z";
        create(&conn, &ReminderInput { title: "Passado".into(), remind_at: past.into(), notes: None }).unwrap();
        let fut = create(&conn, &ReminderInput { title: "Futuro".into(), remind_at: future.into(), notes: None }).unwrap();
        set_done(&conn, &fut.id, true).unwrap();
        create(&conn, &ReminderInput { title: "Futuro 2".into(), remind_at: future.into(), notes: None }).unwrap();

        let upcoming = list_upcoming(&conn, 10).unwrap();
        assert_eq!(upcoming.len(), 1);
        assert_eq!(upcoming[0].title, "Futuro 2");
    }
}
