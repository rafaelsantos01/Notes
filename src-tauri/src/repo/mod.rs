pub mod activities;
pub mod backup;
pub mod links;
pub mod misc;
pub mod notes;
pub mod projects;
pub mod reminders;
pub mod settings;
pub mod tasks;

use std::collections::HashMap;

use rusqlite::Connection;

use crate::error::AppResult;

/// Sincroniza as tags de uma entidade (polimórfica).
pub fn sync_tags(
    conn: &Connection,
    entity_type: &str,
    entity_id: &str,
    tags: &[String],
) -> AppResult<()> {
    conn.execute(
        "DELETE FROM entity_tags WHERE entity_type = ?1 AND entity_id = ?2",
        rusqlite::params![entity_type, entity_id],
    )?;

    for raw in tags {
        let tag = raw.trim();
        if tag.is_empty() || tag.len() > 40 {
            continue;
        }
        let now = crate::models::now_iso();
        conn.execute(
            "INSERT INTO tags (id, name, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?3)
             ON CONFLICT(name) DO UPDATE SET updated_at = ?3",
            rusqlite::params![crate::models::new_id(), tag, now],
        )?;
        let tag_id: String = conn.query_row(
            "SELECT id FROM tags WHERE name = ?1",
            rusqlite::params![tag],
            |row| row.get(0),
        )?;
        conn.execute(
            "INSERT OR IGNORE INTO entity_tags (tag_id, entity_type, entity_id) VALUES (?1, ?2, ?3)",
            rusqlite::params![tag_id, entity_type, entity_id],
        )?;
    }
    Ok(())
}

/// Busca as tags de um conjunto de entidades, agrupadas por id.
pub fn fetch_tags(
    conn: &Connection,
    entity_type: &str,
    ids: &[String],
) -> AppResult<HashMap<String, Vec<String>>> {
    let mut map: HashMap<String, Vec<String>> = HashMap::new();
    for chunk in ids.chunks(400) {
        if chunk.is_empty() {
            continue;
        }
        let placeholders = vec!["?"; chunk.len()].join(",");
        let sql = format!(
            "SELECT et.entity_id, t.name
             FROM entity_tags et
             JOIN tags t ON t.id = et.tag_id
             WHERE et.entity_type = ? AND et.entity_id IN ({placeholders})
             ORDER BY t.name COLLATE NOCASE"
        );
        let mut params: Vec<&str> = Vec::with_capacity(chunk.len() + 1);
        params.push(entity_type);
        params.extend(chunk.iter().map(|s| s.as_str()));

        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(rusqlite::params_from_iter(params), |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        for row in rows {
            let (entity_id, tag) = row?;
            map.entry(entity_id).or_default().push(tag);
        }
    }
    Ok(map)
}

/// Padrão LIKE escapado (com ESCAPE '\').
pub fn like_pattern(q: &str) -> String {
    let escaped = q
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_");
    format!("%{escaped}%")
}

// ---------------------------------------------------------------------------
// Testes de integração (SQLite em memória)
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    #[test]
    fn migrations_criam_todas_as_tabelas() {
        let conn = open_in_memory().expect("abrir banco em memória");
        let mut stmt = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .unwrap();
        let tables: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();

        for expected in [
            "projects",
            "notes",
            "activity_logs",
            "tasks",
            "links",
            "tags",
            "entity_tags",
            "attachments",
            "reminders",
            "settings",
            "_migrations",
        ] {
            assert!(tables.contains(&expected.to_string()), "tabela {expected} ausente");
        }
    }

    #[test]
    fn sync_tags_cria_e_deduplica() {
        let conn = open_in_memory().unwrap();
        let id = crate::models::new_id();
        conn.execute(
            "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?1, 'Teste', '', ?2, ?2)",
            rusqlite::params![id, crate::models::now_iso()],
        )
        .unwrap();

        sync_tags(&conn, "note", &id, &["rust".into(), "Rust".into(), " sqlite ".into()]).unwrap();

        let tags = fetch_tags(&conn, "note", &[id.clone()]).unwrap();
        let mut list = tags.get(&id).cloned().unwrap_or_default();
        list.sort();
        assert_eq!(list, vec!["rust".to_string(), "sqlite".to_string()]);

        // Re-sincronização substitui em vez de duplicar
        sync_tags(&conn, "note", &id, &["novo".into()]).unwrap();
        let tags = fetch_tags(&conn, "note", &[id.clone()]).unwrap();
        assert_eq!(tags.get(&id).unwrap(), &vec!["novo".to_string()]);
    }

    #[test]
    fn constraints_de_status_sao_aplicadas() {
        let conn = open_in_memory().unwrap();
        let result = conn.execute(
            "INSERT INTO tasks (id, title, status, priority, created_at, updated_at) VALUES ('1', 'X', 'invalid', 'medium', '2026-01-01', '2026-01-01')",
            [],
        );
        assert!(result.is_err());
    }
}
