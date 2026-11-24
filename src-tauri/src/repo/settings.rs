use rusqlite::{params, Connection};

use crate::error::AppResult;
use crate::models::{now_iso, TagInfo};

pub fn get(conn: &Connection, key: &str) -> AppResult<Option<String>> {
    let mut stmt = conn.prepare_cached("SELECT value FROM settings WHERE key = ?1")?;
    let mut rows = stmt.query(params![key])?;
    if let Some(row) = rows.next()? {
        Ok(Some(row.get(0)?))
    } else {
        Ok(None)
    }
}

pub fn set(conn: &Connection, key: &str, value: &str) -> AppResult<()> {
    conn.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
        params![key, value, now_iso()],
    )?;
    Ok(())
}

/// Lista todas as tags com contagem de uso.
pub fn tag_list(conn: &Connection) -> AppResult<Vec<TagInfo>> {
    let mut stmt = conn.prepare(
        "SELECT t.name, COUNT(et.tag_id) AS uses
         FROM tags t
         LEFT JOIN entity_tags et ON et.tag_id = t.id
         GROUP BY t.id
         ORDER BY uses DESC, t.name COLLATE NOCASE ASC
         LIMIT 500",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(TagInfo {
            name: row.get(0)?,
            count: row.get(1)?,
        })
    })?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    #[test]
    fn set_e_get_roundtrip() {
        let conn = open_in_memory().unwrap();
        assert!(get(&conn, "tema").unwrap().is_none());
        set(&conn, "tema", "dark").unwrap();
        assert_eq!(get(&conn, "tema").unwrap().as_deref(), Some("dark"));
        set(&conn, "tema", "light").unwrap();
        assert_eq!(get(&conn, "tema").unwrap().as_deref(), Some("light"));
    }
}
