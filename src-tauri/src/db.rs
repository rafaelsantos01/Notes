use std::path::Path;

use rusqlite::Connection;

use crate::error::{AppError, AppResult};

/// Migrations versionadas, aplicadas em ordem.
const MIGRATIONS: &[(&str, &str)] = &[("0001_init", include_str!("migrations/0001_init.sql"))];

pub fn open(path: &Path) -> AppResult<Connection> {
    let conn = Connection::open(path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.busy_timeout(std::time::Duration::from_secs(5))?;
    Ok(conn)
}

pub fn run_migrations(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (
            name TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        );",
    )?;

    for (name, sql) in MIGRATIONS {
        let applied: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM _migrations WHERE name = ?1",
                [name],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if !applied {
            conn.execute_batch(sql)?;
            conn.execute(
                "INSERT INTO _migrations (name, applied_at) VALUES (?1, ?2)",
                rusqlite::params![name, crate::models::now_iso()],
            )?;
            eprintln!("[notes] migration aplicada: {name}");
        }
    }
    Ok(())
}

/// Abre uma conexão em memória (para testes).
#[cfg(test)]
pub fn open_in_memory() -> AppResult<Connection> {
    let conn = Connection::open_in_memory()?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    run_migrations(&conn)?;
    Ok(conn)
}

/// Valida que um arquivo parece ser um banco SQLite válido.
pub fn is_sqlite_file(path: &Path) -> bool {
    use std::io::Read;
    let mut header = [0u8; 16];
    match std::fs::File::open(path) {
        Ok(mut f) => match f.read_exact(&mut header) {
            Ok(()) => &header == b"SQLite format 3\0",
            Err(_) => false,
        },
        Err(_) => false,
    }
}

#[allow(dead_code)]
pub fn ensure_valid_path(path: &Path) -> AppResult<()> {
    if !path.exists() {
        return Err(AppError::Validation(format!(
            "caminho não existe: {}",
            path.display()
        )));
    }
    Ok(())
}
