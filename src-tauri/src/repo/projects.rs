use rusqlite::{params, Connection};

use crate::error::{validation, AppResult};
use crate::models::{new_id, now_iso, Project, ProjectInput};

use super::fetch_tags;

const BASE_SELECT: &str = "SELECT p.id, p.name, p.description, p.color, p.status,
    (SELECT COUNT(*) FROM notes n WHERE n.project_id = p.id AND n.is_archived = 0),
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status IN ('pending', 'in_progress')),
    (SELECT COUNT(*) FROM activity_logs a WHERE a.project_id = p.id),
    p.created_at, p.updated_at
FROM projects p";

fn row_to_project_fixed(row: &rusqlite::Row) -> rusqlite::Result<Project> {
    Ok(Project {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        color: row.get(3)?,
        status: row.get(4)?,
        note_count: row.get(5)?,
        pending_task_count: row.get(6)?,
        activity_count: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
        tags: Vec::new(),
    })
}

pub fn attach_tags(conn: &Connection, mut projects: Vec<Project>) -> AppResult<Vec<Project>> {
    let ids: Vec<String> = projects.iter().map(|p| p.id.clone()).collect();
    let tags = fetch_tags(conn, "project", &ids)?;
    for project in &mut projects {
        project.tags = tags.get(&project.id).cloned().unwrap_or_default();
    }
    Ok(projects)
}

pub fn list(conn: &Connection) -> AppResult<Vec<Project>> {
    let mut stmt = conn.prepare(&format!("{BASE_SELECT} ORDER BY p.updated_at DESC"))?;
    let projects: Vec<Project> = stmt
        .query_map([], row_to_project_fixed)?
        .filter_map(|r| r.ok())
        .collect();
    attach_tags(conn, projects)
}

pub fn get(conn: &Connection, id: &str) -> AppResult<Project> {
    let mut stmt = conn.prepare(&format!("{BASE_SELECT} WHERE p.id = ?1"))?;
    let mut projects: Vec<Project> = stmt
        .query_map(params![id], row_to_project_fixed)?
        .filter_map(|r| r.ok())
        .collect();
    projects
        .pop()
        .map(|mut p| {
            p.tags = fetch_tags(conn, "project", &[p.id.clone()])
                .ok()
                .and_then(|t| t.get(&p.id).cloned())
                .unwrap_or_default();
            p
        })
        .ok_or_else(|| crate::error::not_found("Projeto"))
}

fn validate(input: &ProjectInput) -> AppResult<()> {
    if input.name.trim().is_empty() {
        return Err(validation("O nome do projeto é obrigatório"));
    }
    if input.name.len() > 120 {
        return Err(validation("Nome do projeto muito longo (máx. 120)"));
    }
    if let Some(status) = &input.status {
        if !["active", "paused", "completed"].contains(&status.as_str()) {
            return Err(validation("Status de projeto inválido"));
        }
    }
    Ok(())
}

pub fn create(conn: &Connection, raw: &ProjectInput) -> AppResult<Project> {
    let input = raw.validated();
    validate(&input)?;
    let id = new_id();
    let now = now_iso();
    conn.execute(
        "INSERT INTO projects (id, name, description, color, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![
            id,
            input.name,
            input.description.unwrap_or_default(),
            input.color.unwrap_or_else(|| "#6366f1".into()),
            input.status.unwrap_or_else(|| "active".into()),
            now
        ],
    )?;
    super::sync_tags(conn, "project", &id, &input.tags.unwrap_or_default())?;
    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, raw: &ProjectInput) -> AppResult<Project> {
    let input = raw.validated();
    validate(&input)?;
    let changed = conn.execute(
        "UPDATE projects SET name = ?2, description = ?3, color = ?4, status = ?5, updated_at = ?6
         WHERE id = ?1",
        params![
            id,
            input.name,
            input.description.unwrap_or_default(),
            input.color.unwrap_or_else(|| "#6366f1".into()),
            input.status.unwrap_or_else(|| "active".into()),
            now_iso()
        ],
    )?;
    if changed == 0 {
        return Err(crate::error::not_found("Projeto"));
    }
    super::sync_tags(conn, "project", id, &input.tags.unwrap_or_default())?;
    get(conn, id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    // entity_tags não tem FK para entidades (polimórfico) — limpa manualmente.
    conn.execute(
        "DELETE FROM entity_tags WHERE entity_type = 'project' AND entity_id = ?1",
        params![id],
    )?;
    conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    fn sample() -> ProjectInput {
        ProjectInput {
            name: "Projeto Teste".into(),
            description: Some("Descrição".into()),
            color: Some("#22c55e".into()),
            status: None,
            tags: Some(vec!["cli".into()]),
        }
    }

    #[test]
    fn crud_basico() {
        let conn = open_in_memory().unwrap();
        let created = create(&conn, &sample()).unwrap();
        assert_eq!(created.name, "Projeto Teste");
        assert_eq!(created.tags, vec!["cli".to_string()]);

        let all = list(&conn).unwrap();
        assert_eq!(all.len(), 1);

        let updated = update(
            &conn,
            &created.id,
            &ProjectInput {
                name: "Renomeado".into(),
                description: None,
                color: None,
                status: Some("paused".into()),
                tags: Some(vec![]),
            },
        )
        .unwrap();
        assert_eq!(updated.name, "Renomeado");
        assert_eq!(updated.status, "paused");
        assert!(updated.tags.is_empty());

        delete(&conn, &created.id).unwrap();
        assert!(list(&conn).unwrap().is_empty());
    }
    #[test]
    fn rejeita_nome_vazio() {
        let conn = open_in_memory().unwrap();
        let err = create(
            &conn,
            &ProjectInput {
                name: "   ".into(),
                description: None,
                color: None,
                status: None,
                tags: None,
            },
        );
        assert!(err.is_err());
    }

    #[test]
    fn exclusao_desvincula_notas() {
        let conn = open_in_memory().unwrap();
        let project = create(&conn, &sample()).unwrap();
        conn.execute(
            "INSERT INTO notes (id, title, content, project_id, created_at, updated_at)
             VALUES ('n1', 'Nota', '', ?1, '2026-01-01', '2026-01-01')",
            params![project.id],
        )
        .unwrap();
        delete(&conn, &project.id).unwrap();
        let project_id: Option<String> = conn
            .query_row("SELECT project_id FROM notes WHERE id = 'n1'", [], |r| r.get(0))
            .unwrap();
        assert!(project_id.is_none());
    }
}
