use rusqlite::{params, types::Value, Connection};

use crate::error::{not_found, validation, AppResult};
use crate::models::{new_id, now_iso, Activity, ActivityInput, ActivityListFilter, ActivityUpdateInput};

use super::{fetch_tags, like_pattern, sync_tags};

const VALID_CATEGORIES: &[&str] = &[
    "development",
    "configuration",
    "meeting",
    "problem",
    "solution",
    "study",
    "delivery",
    "other",
];

const BASE_SELECT: &str =
    "SELECT id, title, description, category, status, project_id, occurred_at, created_at, updated_at
     FROM activity_logs";

fn row_to_activity(row: &rusqlite::Row) -> rusqlite::Result<Activity> {
    Ok(Activity {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        category: row.get(3)?,
        status: row.get(4)?,
        project_id: row.get(5)?,
        occurred_at: row.get(6)?,
        tags: Vec::new(),
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn attach_tags(conn: &Connection, mut activities: Vec<Activity>) -> AppResult<Vec<Activity>> {
    let ids: Vec<String> = activities.iter().map(|a| a.id.clone()).collect();
    let tags = fetch_tags(conn, "activity", &ids)?;
    for activity in &mut activities {
        activity.tags = tags.get(&activity.id).cloned().unwrap_or_default();
    }
    Ok(activities)
}

pub fn list(conn: &Connection, filter: &ActivityListFilter) -> AppResult<Vec<Activity>> {
    let mut where_clauses: Vec<&str> = vec!["occurred_at >= ?1", "occurred_at <= ?2"];
    let mut bind: Vec<Value> = vec![
        Value::Text(filter.from.clone()),
        Value::Text(filter.to.clone()),
    ];

    if let Some(project_id) = &filter.project_id {
        where_clauses.push("project_id = ?");
        bind.push(Value::Text(project_id.clone()));
    }
    if let Some(q) = &filter.q {
        where_clauses.push("(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
        let pattern = Value::Text(like_pattern(q));
        bind.push(pattern.clone());
        bind.push(pattern);
    }

    let sql = format!(
        "{BASE_SELECT} WHERE {} ORDER BY occurred_at DESC LIMIT 2000",
        where_clauses.join(" AND ")
    );

    let mut stmt = conn.prepare(&sql)?;
    let activities: Vec<Activity> = stmt
        .query_map(rusqlite::params_from_iter(bind.iter()), row_to_activity)?
        .filter_map(|r| r.ok())
        .collect();
    attach_tags(conn, activities)
}

pub fn get(conn: &Connection, id: &str) -> AppResult<Activity> {
    let mut stmt = conn.prepare(&format!("{BASE_SELECT} WHERE id = ?1"))?;
    let mut activities: Vec<Activity> = stmt
        .query_map(params![id], row_to_activity)?
        .filter_map(|r| r.ok())
        .collect();
    activities
        .pop()
        .map(|mut a| {
            a.tags = fetch_tags(conn, "activity", &[a.id.clone()])
                .ok()
                .and_then(|t| t.get(&a.id).cloned())
                .unwrap_or_default();
            a
        })
        .ok_or_else(|| not_found("Registro"))
}

fn validate(category: &str, status: &str) -> AppResult<()> {
    if !VALID_CATEGORIES.contains(&category) {
        return Err(validation("Categoria inválida"));
    }
    if !["done", "pending"].contains(&status) {
        return Err(validation("Status de atividade inválido"));
    }
    Ok(())
}

pub fn create(conn: &Connection, input: &ActivityInput) -> AppResult<Activity> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err(validation("O título do registro é obrigatório"));
    }
    let category = input.category.clone().unwrap_or_else(|| "other".into());
    let status = input.status.clone().unwrap_or_else(|| "done".into());
    validate(&category, &status)?;

    let id = new_id();
    let now = now_iso();
    let occurred_at = input.occurred_at.clone().unwrap_or_else(|| now.clone());
    conn.execute(
        "INSERT INTO activity_logs (id, title, description, category, status, project_id, occurred_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
        params![id, title, input.description.clone().unwrap_or_default(), category, status, input.project_id, occurred_at, now],
    )?;
    sync_tags(conn, "activity", &id, &input.tags.clone().unwrap_or_default())?;
    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, input: &ActivityUpdateInput) -> AppResult<Activity> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err(validation("O título do registro é obrigatório"));
    }
    validate(&input.category, &input.status)?;
    let changed = conn.execute(
        "UPDATE activity_logs SET title = ?2, description = ?3, category = ?4, status = ?5,
             project_id = ?6, occurred_at = ?7, updated_at = ?8
         WHERE id = ?1",
        params![id, title, input.description, input.category, input.status, input.project_id, input.occurred_at, now_iso()],
    )?;
    if changed == 0 {
        return Err(not_found("Registro"));
    }
    sync_tags(conn, "activity", id, &input.tags)?;
    get(conn, id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    conn.execute(
        "DELETE FROM entity_tags WHERE entity_type = 'activity' AND entity_id = ?1",
        params![id],
    )?;
    conn.execute("DELETE FROM activity_logs WHERE id = ?1", params![id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    #[test]
    fn cria_e_filtra_por_periodo() {
        let conn = open_in_memory().unwrap();
        create(
            &conn,
            &ActivityInput {
                title: "Config VPN".into(),
                description: None,
                category: Some("configuration".into()),
                status: None,
                project_id: None,
                occurred_at: Some("2026-11-23T14:00:00.000Z".into()),
                tags: None,
            },
        )
        .unwrap();
        create(
            &conn,
            &ActivityInput {
                title: "Deploy".into(),
                description: None,
                category: Some("delivery".into()),
                status: None,
                project_id: None,
                occurred_at: Some("2026-11-24T10:00:00.000Z".into()),
                tags: None,
            },
        )
        .unwrap();

        let range = list(
            &conn,
            &ActivityListFilter {
                from: "2026-11-23T00:00:00.000Z".into(),
                to: "2026-11-23T23:59:59.999Z".into(),
                project_id: None,
                q: None,
            },
        )
        .unwrap();
        assert_eq!(range.len(), 1);
        assert_eq!(range[0].title, "Config VPN");

        let all = list(
            &conn,
            &ActivityListFilter {
                from: "2026-01-01T00:00:00.000Z".into(),
                to: "2026-12-31T23:59:59.999Z".into(),
                project_id: None,
                q: None,
            },
        )
        .unwrap();
        assert_eq!(all.len(), 2);
        // ordenação decrescente por occurred_at
        assert_eq!(all[0].title, "Deploy");
    }

    #[test]
    fn rejeita_categoria_invalida() {
        let conn = open_in_memory().unwrap();
        let result = create(
            &conn,
            &ActivityInput {
                title: "X".into(),
                description: None,
                category: Some("bananas".into()),
                status: None,
                project_id: None,
                occurred_at: None,
                tags: None,
            },
        );
        assert!(result.is_err());
    }
}
