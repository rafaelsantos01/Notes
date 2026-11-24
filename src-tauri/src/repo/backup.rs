use std::io::Write;
use std::path::{Path, PathBuf};

use rusqlite::Connection;
use serde::Serialize;

use crate::error::{validation, AppError, AppResult};
use crate::models::{now_iso, Activity, LinkItem, Note, Project, Reminder, Task};

// ---------------------------------------------------------------------------
// Backup / restauração
// ---------------------------------------------------------------------------

/// Cria um backup consistente do banco com VACUUM INTO.
pub fn create(conn: &Connection, target: &Path) -> AppResult<()> {
    if target.exists() {
        return Err(validation("O arquivo de destino já existe"));
    }
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let escaped = target.to_string_lossy().replace('\'', "''");
    conn.execute(&format!("VACUUM INTO '{escaped}'"), [])?;
    Ok(())
}

/// Restaura um backup: valida, faz cópia de segurança do atual e substitui.
/// Recebe callbacks para fechar/reabrir a conexão (gerenciada pelo AppState).
pub fn restore(
    source: &Path,
    db_path: &Path,
    close_conn: impl FnOnce() -> AppResult<()>,
    open_conn: impl FnOnce() -> AppResult<Connection>,
) -> AppResult<Connection> {
    if !source.exists() {
        return Err(validation("Arquivo de backup não encontrado"));
    }
    if !crate::db::is_sqlite_file(source) {
        return Err(validation("O arquivo selecionado não é um banco SQLite válido"));
    }
    if source.canonicalize().ok() == db_path.canonicalize().ok() {
        return Err(validation("Selecione um arquivo de backup diferente do banco atual"));
    }

    // 1. Cópia de segurança do banco atual (segurança antes da substituição)
    if db_path.exists() {
        let safety = db_path.with_extension("pre-restore.db");
        std::fs::copy(db_path, &safety)?;
    }

    // 2. Fecha a conexão atual e remove arquivos WAL/SHM
    close_conn()?;
    let _ = std::fs::remove_file(db_path.with_extension("db-wal"));
    let _ = std::fs::remove_file(db_path.with_extension("db-shm"));

    // 3. Substitui o arquivo do banco
    std::fs::copy(source, db_path)?;

    // 4. Reabre e valida (migrations aplicam se necessário)
    let conn = open_conn()?;
    crate::db::run_migrations(&conn)?;
    Ok(conn)
}

// ---------------------------------------------------------------------------
// Exportações
// ---------------------------------------------------------------------------

fn slugify(text: &str) -> String {
    let normalized: String = text
        .chars()
        .map(|c| c)
        .collect::<String>()
        .to_lowercase();
    let mut out = String::new();
    for c in normalized.chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c);
        } else if !out.ends_with('-') && !out.is_empty() {
            out.push('-');
        }
    }
    let trimmed = out.trim_matches('-').to_string();
    if trimmed.is_empty() {
        "sem-titulo".to_string()
    } else {
        trimmed.chars().take(60).collect()
    }
}

fn unique_path(dir: &Path, name: &str, ext: &str) -> PathBuf {
    let mut candidate = dir.join(format!("{name}.{ext}"));
    let mut counter = 2;
    while candidate.exists() {
        candidate = dir.join(format!("{name}-{counter}.{ext}"));
        counter += 1;
    }
    candidate
}

fn write_file(path: &Path, content: &str) -> AppResult<()> {
    let mut file = std::fs::File::create(path)?;
    file.write_all(content.as_bytes())?;
    Ok(())
}

/// Exporta cada anotação (não arquivada) como um arquivo Markdown.
pub fn export_notes_markdown(conn: &Connection, dir: &Path) -> AppResult<usize> {
    std::fs::create_dir_all(dir)?;
    let list = super::notes::list(
        conn,
        &crate::models::NoteListFilter {
            archived: Some(false),
            limit: Some(2000),
            ..Default::default()
        },
    )?;

    for note in &list {
        let date = note.created_at.get(..10).unwrap_or("sem-data");
        let name = format!("{date}-{}", slugify(&note.title));
        let path = unique_path(dir, &name, "md");

        let mut front = String::from("---\n");
        front.push_str(&format!("title: {}\n", note.title.replace('\n', " ")));
        front.push_str(&format!("created: {}\n", note.created_at));
        front.push_str(&format!("updated: {}\n", note.updated_at));
        if !note.tags.is_empty() {
            front.push_str(&format!("tags: [{}]\n", note.tags.join(", ")));
        }
        front.push_str("---\n\n");

        write_file(&path, &format!("{front}# {}\n\n{}\n", note.title, note.content))?;
    }
    Ok(list.len())
}

/// Exporta o diário completo como um único Markdown agrupado por dia.
pub fn export_activities_markdown(conn: &Connection, dir: &Path) -> AppResult<usize> {
    std::fs::create_dir_all(dir)?;
    let list = super::activities::list(
        conn,
        &crate::models::ActivityListFilter {
            from: "2000-01-01T00:00:00.000Z".into(),
            to: "2999-12-31T23:59:59.999Z".into(),
            project_id: None,
            q: None,
        },
    )?;

    let mut by_day: std::collections::BTreeMap<String, Vec<&Activity>> =
        std::collections::BTreeMap::new();
    for activity in &list {
        let day = activity.occurred_at.get(..10).unwrap_or("sem-data").to_string();
        by_day.entry(day).or_default().push(activity);
    }

    let mut content = String::from("# Diário — Notes\n\n");
    for (day, activities) in by_day.iter().rev() {
        content.push_str(&format!("## {day}\n\n"));
        for activity in activities.iter().rev() {
            let time = activity.occurred_at.get(11..16).unwrap_or("--:--");
            content.push_str(&format!("- **{}** ({}, {}) — ", activity.title, activity.category, time));
            if !activity.description.trim().is_empty() {
                content.push_str(&activity.description.replace('\n', " "));
            }
            if !activity.tags.is_empty() {
                content.push_str(&format!(" `#{}`", activity.tags.join(" #")));
            }
            content.push('\n');
        }
        content.push('\n');
    }

    let path = unique_path(dir, "diario", "md");
    write_file(&path, &content)?;
    Ok(list.len())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FullExport {
    exported_at: String,
    schema_version: u32,
    projects: Vec<Project>,
    notes: Vec<Note>,
    activities: Vec<Activity>,
    tasks: Vec<Task>,
    links: Vec<LinkItem>,
    reminders: Vec<Reminder>,
    tags: Vec<TagExport>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TagExport {
    name: String,
    #[serde(rename = "type")]
    entity_type: String,
    entity_id: String,
}

/// Exporta todos os dados em JSON (sem dados sensíveis — secrets não fazem parte).
pub fn export_json(conn: &Connection, target: &Path) -> AppResult<()> {
    let past = "2000-01-01T00:00:00.000Z".to_string();
    let future = "2999-12-31T23:59:59.999Z".to_string();

    let export = FullExport {
        exported_at: now_iso(),
        schema_version: 1,
        projects: super::projects::list(conn)?,
        notes: super::notes::list(
            conn,
            &crate::models::NoteListFilter {
                limit: Some(2000),
                ..Default::default()
            },
        )?,
        activities: super::activities::list(
            conn,
            &crate::models::ActivityListFilter {
                from: past,
                to: future,
                project_id: None,
                q: None,
            },
        )?,
        tasks: super::tasks::list(conn, &crate::models::TaskListFilter::default())?,
        links: super::links::list(conn, &crate::models::LinkListFilter::default())?,
        reminders: {
            let mut stmt = conn.prepare(
                "SELECT id, title, remind_at, notes, is_done, entity_type, entity_id, created_at, updated_at
                 FROM reminders ORDER BY remind_at ASC",
            )?;
            let rows = stmt.query_map([], |row| {
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
            })?;
            rows.filter_map(|r| r.ok()).collect()
        },
        tags: {
            let mut stmt = conn.prepare(
                "SELECT t.name, et.entity_type, et.entity_id
                 FROM tags t LEFT JOIN entity_tags et ON et.tag_id = t.id
                 ORDER BY t.name COLLATE NOCASE",
            )?;
            let rows = stmt.query_map([], |row| {
                Ok(TagExport {
                    name: row.get(0)?,
                    entity_type: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                    entity_id: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                })
            })?;
            rows.filter_map(|r| r.ok()).collect()
        },
    };

    let json = serde_json::to_string_pretty(&export)
        .map_err(|e| AppError::Internal(format!("falha ao serializar JSON: {e}")))?;
    write_file(target, &json)
}

// ---------------------------------------------------------------------------
// Backup automático (executado na inicialização)
// ---------------------------------------------------------------------------

/// Executa backup automático se habilitado e vencido. Frequências:
/// `daily` ou `weekly` (settings: autoBackup). Mantém os últimos N (autoBackupKeep).
pub fn maybe_auto_backup(conn: &Connection, data_dir: &Path) -> AppResult<()> {
    let mode = super::settings::get(conn, "autoBackup")?.unwrap_or_else(|| "off".into());
    if mode == "off" {
        return Ok(());
    }

    let period_secs: i64 = if mode == "weekly" { 7 * 24 * 3600 } else { 24 * 3600 };
    let keep: usize = super::settings::get(conn, "autoBackupKeep")?
        .and_then(|v| v.parse().ok())
        .unwrap_or(7);

    let now = chrono::Utc::now();
    if let Some(last) = super::settings::get(conn, "lastAutoBackup")? {
        if let Ok(last_dt) = chrono::DateTime::parse_from_rfc3339(&last) {
            if now.timestamp() - last_dt.timestamp() < period_secs {
                return Ok(());
            }
        }
    }

    let backups_dir = data_dir.join("backups");
    std::fs::create_dir_all(&backups_dir)?;

    let stamp = now.format("%Y%m%d-%H%M%S");
    let target = backups_dir.join(format!("auto-{stamp}.db"));
    create(conn, &target)?;
    super::settings::set(conn, "lastAutoBackup", &now_iso())?;

    // Remove backups automáticos antigos (mantém os N mais recentes)
    let mut autos: Vec<PathBuf> = std::fs::read_dir(&backups_dir)?
        .filter_map(|entry| entry.ok().map(|e| e.path()))
        .filter(|p| {
            p.file_name()
                .and_then(|n| n.to_str())
                .map(|n| n.starts_with("auto-") && n.ends_with(".db"))
                .unwrap_or(false)
        })
        .collect();
    autos.sort();
    while autos.len() > keep {
        let oldest = autos.remove(0);
        let _ = std::fs::remove_file(oldest);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    fn temp_dir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("notes-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn backup_e_restore_roundtrip() {
        let dir = temp_dir();
        let db_path = dir.join("notes.db");
        let conn = crate::db::open(&db_path).unwrap();
        crate::db::run_migrations(&conn).unwrap();

        super::super::notes::create(
            &conn,
            &crate::models::NoteInput {
                title: "Importante".into(),
                content: Some("conteúdo".into()),
                project_id: None,
                tags: None,
            },
        )
        .unwrap();

        let backup_path = dir.join("backup.db");
        create(&conn, &backup_path).unwrap();
        assert!(backup_path.exists());

        // Simula restauração em um novo arquivo
        let db2_path = dir.join("notes2.db");
        let restored = restore(&backup_path, &db2_path, || Ok(()), || {
            crate::db::open(&db2_path)
        })
        .unwrap();
        let notes = super::super::notes::list(
            &restored,
            &crate::models::NoteListFilter::default(),
        )
        .unwrap();
        assert_eq!(notes.len(), 1);
        assert_eq!(notes[0].title, "Importante");

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn export_notes_markdown_cria_arquivos() {
        let dir = temp_dir();
        let conn = open_in_memory().unwrap();
        super::super::notes::create(
            &conn,
            &crate::models::NoteInput {
                title: "Anotação de Teste".into(),
                content: Some("corpo".into()),
                project_id: None,
                tags: Some(vec!["x".into()]),
            },
        )
        .unwrap();

        let out = dir.join("md");
        let count = export_notes_markdown(&conn, &out).unwrap();
        assert_eq!(count, 1);
        let entries: Vec<_> = std::fs::read_dir(&out).unwrap().collect();
        assert_eq!(entries.len(), 1);
        let first = entries[0].as_ref().unwrap();
        let content = std::fs::read_to_string(first.path()).unwrap();
        assert!(content.contains("# Anotação de Teste"));
        assert!(content.contains("tags: [x]"));

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn rejeita_backup_sobre_arquivo_existente() {
        let dir = temp_dir();
        let conn = open_in_memory().unwrap();
        let target = dir.join("b.db");
        std::fs::write(&target, b"x").unwrap();
        assert!(create(&conn, &target).is_err());
        std::fs::remove_dir_all(&dir).ok();
    }
}
