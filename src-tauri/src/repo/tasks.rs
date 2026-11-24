use rusqlite::{params, types::Value, Connection};

use crate::error::{not_found, validation, AppResult};
use crate::models::{new_id, now_iso, Task, TaskInput, TaskListFilter, TaskUpdateInput};

use super::{fetch_tags, like_pattern, sync_tags};

const VALID_STATUSES: &[&str] = &["pending", "in_progress", "done", "cancelled"];
const VALID_PRIORITIES: &[&str] = &["low", "medium", "high", "urgent"];

const BASE_SELECT: &str =
    "SELECT id, title, description, status, priority, due_date, completed_at, project_id, created_at, updated_at
     FROM tasks";

fn row_to_task(row: &rusqlite::Row) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        status: row.get(3)?,
        priority: row.get(4)?,
        due_date: row.get(5)?,
        completed_at: row.get(6)?,
        project_id: row.get(7)?,
        tags: Vec::new(),
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

fn attach_tags(conn: &Connection, mut tasks: Vec<Task>) -> AppResult<Vec<Task>> {
    let ids: Vec<String> = tasks.iter().map(|t| t.id.clone()).collect();
    let tags = fetch_tags(conn, "task", &ids)?;
    for task in &mut tasks {
        task.tags = tags.get(&task.id).cloned().unwrap_or_default();
    }
    Ok(tasks)
}

pub fn list(conn: &Connection, filter: &TaskListFilter) -> AppResult<Vec<Task>> {
    let mut where_clauses: Vec<&str> = Vec::new();
    let mut bind: Vec<Value> = Vec::new();

    if let Some(status) = &filter.status {
        where_clauses.push("status = ?");
        bind.push(Value::Text(status.clone()));
    }
    if let Some(project_id) = &filter.project_id {
        where_clauses.push("project_id = ?");
        bind.push(Value::Text(project_id.clone()));
    }
    if let Some(priority) = &filter.priority {
        where_clauses.push("priority = ?");
        bind.push(Value::Text(priority.clone()));
    }
    if let Some(q) = &filter.q {
        where_clauses.push("(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
        let pattern = Value::Text(like_pattern(q));
        bind.push(pattern.clone());
        bind.push(pattern);
    }

    let sql = if where_clauses.is_empty() {
        format!("{BASE_SELECT} ORDER BY updated_at DESC LIMIT 2000")
    } else {
        format!(
            "{BASE_SELECT} WHERE {} ORDER BY updated_at DESC LIMIT 2000",
            where_clauses.join(" AND ")
        )
    };

    let mut stmt = conn.prepare(&sql)?;
    let tasks: Vec<Task> = stmt
        .query_map(rusqlite::params_from_iter(bind.iter()), row_to_task)?
        .filter_map(|r| r.ok())
        .collect();
    attach_tags(conn, tasks)
}

pub fn get(conn: &Connection, id: &str) -> AppResult<Task> {
    let mut stmt = conn.prepare(&format!("{BASE_SELECT} WHERE id = ?1"))?;
    let mut tasks: Vec<Task> = stmt
        .query_map(params![id], row_to_task)?
        .filter_map(|r| r.ok())
        .collect();
    tasks
        .pop()
        .map(|mut t| {
            t.tags = fetch_tags(conn, "task", &[t.id.clone()])
                .ok()
                .and_then(|tags| tags.get(&t.id).cloned())
                .unwrap_or_default();
            t
        })
        .ok_or_else(|| not_found("Tarefa"))
}

fn validate(status: &str, priority: &str) -> AppResult<()> {
    if !VALID_STATUSES.contains(&status) {
        return Err(validation("Status de tarefa inválido"));
    }
    if !VALID_PRIORITIES.contains(&priority) {
        return Err(validation("Prioridade inválida"));
    }
    Ok(())
}

pub fn create(conn: &Connection, input: &TaskInput) -> AppResult<Task> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err(validation("O título da tarefa é obrigatório"));
    }
    let status = input.status.clone().unwrap_or_else(|| "pending".into());
    let priority = input.priority.clone().unwrap_or_else(|| "medium".into());
    validate(&status, &priority)?;

    let id = new_id();
    let now = now_iso();
    conn.execute(
        "INSERT INTO tasks (id, title, description, status, priority, due_date, completed_at, project_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)",
        params![
            id,
            title,
            input.description.clone().unwrap_or_default(),
            status,
            priority,
            input.due_date,
            if status == "done" { Some(now.clone()) } else { None },
            input.project_id,
            now
        ],
    )?;
    sync_tags(conn, "task", &id, &input.tags.clone().unwrap_or_default())?;
    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, input: &TaskUpdateInput) -> AppResult<Task> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err(validation("O título da tarefa é obrigatório"));
    }
    validate(&input.status, &input.priority)?;

    let completed_at = if input.status == "done" { Some(now_iso()) } else { None };
    let changed = conn.execute(
        "UPDATE tasks SET title = ?2, description = ?3, status = ?4, priority = ?5,
             due_date = ?6, completed_at = ?7, project_id = ?8, updated_at = ?9
         WHERE id = ?1",
        params![id, title, input.description, input.status, input.priority, input.due_date, completed_at, input.project_id, now_iso()],
    )?;
    if changed == 0 {
        return Err(not_found("Tarefa"));
    }
    sync_tags(conn, "task", id, &input.tags)?;
    get(conn, id)
}

pub fn toggle_done(conn: &Connection, id: &str, done: bool) -> AppResult<Task> {
    let now = now_iso();
    let changed = conn.execute(
        "UPDATE tasks SET
            status = CASE WHEN ?2 THEN 'done' ELSE 'pending' END,
            completed_at = CASE WHEN ?2 THEN ?3 ELSE NULL END,
            updated_at = ?3
         WHERE id = ?1",
        params![id, done, now],
    )?;
    if changed == 0 {
        return Err(not_found("Tarefa"));
    }
    get(conn, id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    conn.execute(
        "DELETE FROM entity_tags WHERE entity_type = 'task' AND entity_id = ?1",
        params![id],
    )?;
    conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    #[test]
    fn toggle_done_define_completed_at() {
        let conn = open_in_memory().unwrap();
        let task = create(
            &conn,
            &TaskInput {
                title: "Validar acesso".into(),
                description: None,
                status: None,
                priority: Some("urgent".into()),
                due_date: Some("2026-11-24".into()),
                project_id: None,
                tags: None,
            },
        )
        .unwrap();
        assert_eq!(task.status, "pending");
        assert!(task.completed_at.is_none());

        let done = toggle_done(&conn, &task.id, true).unwrap();
        assert_eq!(done.status, "done");
        assert!(done.completed_at.is_some());

        let reopened = toggle_done(&conn, &task.id, false).unwrap();
        assert_eq!(reopened.status, "pending");
        assert!(reopened.completed_at.is_none());
    }

    #[test]
    fn contagem_de_pendentes_para_dashboard() {
        let conn = open_in_memory().unwrap();
        create(&conn, &TaskInput { title: "A".into(), description: None, status: None, priority: None, due_date: None, project_id: None, tags: None }).unwrap();
        create(&conn, &TaskInput { title: "B".into(), description: None, status: Some("in_progress".into()), priority: None, due_date: None, project_id: None, tags: None }).unwrap();
        create(&conn, &TaskInput { title: "C".into(), description: None, status: Some("done".into()), priority: None, due_date: None, project_id: None, tags: None }).unwrap();

        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE status IN ('pending', 'in_progress')",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 2);
    }
}
