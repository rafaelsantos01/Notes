use rusqlite::{params, types::Value, Connection};

use crate::error::{not_found, validation, AppResult};
use crate::models::{new_id, now_iso, Note, NoteFlagsInput, NoteInput, NoteListFilter, NoteUpdateInput};

use super::{fetch_tags, like_pattern, sync_tags};

const BASE_SELECT: &str =
    "SELECT id, title, content, project_id, is_favorite, is_pinned, is_archived, created_at, updated_at
     FROM notes";

fn row_to_note(row: &rusqlite::Row) -> rusqlite::Result<Note> {
    Ok(Note {
        id: row.get(0)?,
        title: row.get(1)?,
        content: row.get(2)?,
        project_id: row.get(3)?,
        is_favorite: row.get::<_, i64>(4)? != 0,
        is_pinned: row.get::<_, i64>(5)? != 0,
        is_archived: row.get::<_, i64>(6)? != 0,
        tags: Vec::new(),
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn attach_tags(conn: &Connection, mut notes: Vec<Note>) -> AppResult<Vec<Note>> {
    let ids: Vec<String> = notes.iter().map(|n| n.id.clone()).collect();
    let tags = fetch_tags(conn, "note", &ids)?;
    for note in &mut notes {
        note.tags = tags.get(&note.id).cloned().unwrap_or_default();
    }
    Ok(notes)
}

pub fn list(conn: &Connection, filter: &NoteListFilter) -> AppResult<Vec<Note>> {
    let mut where_clauses: Vec<&str> = Vec::new();
    let mut bind: Vec<Value> = Vec::new();

    if let Some(archived) = filter.archived {
        where_clauses.push(if archived {
            "is_archived = 1"
        } else {
            "is_archived = 0"
        });
    }
    if let Some(favorite) = filter.favorite {
        where_clauses.push(if favorite { "is_favorite = 1" } else { "is_favorite = 0" });
    }
    if let Some(pinned) = filter.pinned {
        where_clauses.push(if pinned { "is_pinned = 1" } else { "is_pinned = 0" });
    }
    if let Some(project_id) = &filter.project_id {
        where_clauses.push("project_id = ?");
        bind.push(Value::Text(project_id.clone()));
    }
    if let Some(tag) = &filter.tag {
        where_clauses.push(
            "EXISTS (SELECT 1 FROM entity_tags et JOIN tags t ON t.id = et.tag_id
                     WHERE et.entity_type = 'note' AND et.entity_id = notes.id AND t.name = ? COLLATE NOCASE)",
        );
        bind.push(Value::Text(tag.clone()));
    }
    if let Some(q) = &filter.q {
        where_clauses.push("(title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\')");
        let pattern = Value::Text(like_pattern(q));
        bind.push(pattern.clone());
        bind.push(pattern);
    }

    let sql = if where_clauses.is_empty() {
        format!(
            "{BASE_SELECT} ORDER BY is_pinned DESC, updated_at DESC LIMIT {}",
            filter.limit.unwrap_or(500).clamp(1, 2000)
        )
    } else {
        format!(
            "{BASE_SELECT} WHERE {} ORDER BY is_pinned DESC, updated_at DESC LIMIT {}",
            where_clauses.join(" AND "),
            filter.limit.unwrap_or(500).clamp(1, 2000)
        )
    };

    let mut stmt = conn.prepare(&sql)?;
    let notes: Vec<Note> = stmt
        .query_map(rusqlite::params_from_iter(bind.iter()), row_to_note)?
        .filter_map(|r| r.ok())
        .collect();
    attach_tags(conn, notes)
}

pub fn get(conn: &Connection, id: &str) -> AppResult<Note> {
    let mut stmt = conn.prepare(&format!("{BASE_SELECT} WHERE id = ?1"))?;
    let mut notes: Vec<Note> = stmt
        .query_map(params![id], row_to_note)?
        .filter_map(|r| r.ok())
        .collect();
    notes
        .pop()
        .map(|mut n| {
            n.tags = fetch_tags(conn, "note", &[n.id.clone()])
                .ok()
                .and_then(|t| t.get(&n.id).cloned())
                .unwrap_or_default();
            n
        })
        .ok_or_else(|| not_found("Anotação"))
}

pub fn create(conn: &Connection, input: &NoteInput) -> AppResult<Note> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err(validation("O título da anotação é obrigatório"));
    }
    let id = new_id();
    let now = now_iso();
    conn.execute(
        "INSERT INTO notes (id, title, content, project_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
        params![id, title, input.content.clone().unwrap_or_default(), input.project_id, now],
    )?;
    sync_tags(conn, "note", &id, &input.tags.clone().unwrap_or_default())?;
    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, input: &NoteUpdateInput) -> AppResult<Note> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err(validation("O título da anotação é obrigatório"));
    }
    let changed = conn.execute(
        "UPDATE notes SET title = ?2, content = ?3, project_id = ?4, updated_at = ?5 WHERE id = ?1",
        params![id, title, input.content, input.project_id, now_iso()],
    )?;
    if changed == 0 {
        return Err(not_found("Anotação"));
    }
    sync_tags(conn, "note", id, &input.tags)?;
    get(conn, id)
}

/// Atualiza flags opcionais — NULL preserva o valor atual (COALESCE).
pub fn set_flags(conn: &Connection, input: &NoteFlagsInput) -> AppResult<Note> {
    let changed = conn.execute(
        "UPDATE notes SET
            is_favorite = COALESCE(?2, is_favorite),
            is_pinned = COALESCE(?3, is_pinned),
            is_archived = COALESCE(?4, is_archived),
            updated_at = ?5
         WHERE id = ?1",
        params![input.id, input.is_favorite, input.is_pinned, input.is_archived, now_iso()],
    )?;
    if changed == 0 {
        return Err(not_found("Anotação"));
    }
    get(conn, &input.id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    conn.execute(
        "DELETE FROM entity_tags WHERE entity_type = 'note' AND entity_id = ?1",
        params![id],
    )?;
    conn.execute("DELETE FROM notes WHERE id = ?1", params![id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    #[test]
    fn cria_atualiza_e_arquiva() {
        let conn = open_in_memory().unwrap();
        let note = create(
            &conn,
            &NoteInput {
                title: "  Minha nota  ".into(),
                content: Some("conteúdo".into()),
                project_id: None,
                tags: Some(vec!["a".into()]),
            },
        )
        .unwrap();
        assert_eq!(note.title, "Minha nota");

        let updated = update(
            &conn,
            &note.id,
            &NoteUpdateInput {
                title: "Novo título".into(),
                content: "novo conteúdo".into(),
                project_id: None,
                tags: vec![],
            },
        )
        .unwrap();
        assert_eq!(updated.title, "Novo título");

        let flagged = set_flags(
            &conn,
            &NoteFlagsInput {
                id: note.id.clone(),
                is_favorite: Some(true),
                is_pinned: None,
                is_archived: Some(true),
            },
        )
        .unwrap();
        assert!(flagged.is_favorite);
        assert!(flagged.is_archived);
        assert!(!flagged.is_pinned);
    }

    #[test]
    fn filtros_de_listagem() {
        let conn = open_in_memory().unwrap();
        let a = create(&conn, &NoteInput { title: "Alpha".into(), content: Some("docker".into()), project_id: None, tags: Some(vec!["ops".into()]) }).unwrap();
        create(&conn, &NoteInput { title: "Beta".into(), content: None, project_id: None, tags: None }).unwrap();
        set_flags(&conn, &NoteFlagsInput { id: a.id.clone(), is_favorite: Some(true), is_pinned: None, is_archived: None }).unwrap();

        assert_eq!(list(&conn, &NoteListFilter { archived: Some(false), ..Default::default() }).unwrap().len(), 2);
        assert_eq!(list(&conn, &NoteListFilter { favorite: Some(true), ..Default::default() }).unwrap().len(), 1);
        assert_eq!(list(&conn, &NoteListFilter { q: Some("docker".into()), ..Default::default() }).unwrap().len(), 1);
        assert_eq!(list(&conn, &NoteListFilter { tag: Some("ops".into()), ..Default::default() }).unwrap().len(), 1);
    }
}
