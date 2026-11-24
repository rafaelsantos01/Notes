use rusqlite::{params, types::Value, Connection};

use crate::error::{not_found, validation, AppResult};
use crate::models::{new_id, now_iso, LinkInput, LinkItem, LinkListFilter};

use super::{fetch_tags, like_pattern, sync_tags};

const BASE_SELECT: &str =
    "SELECT id, name, url, description, category, project_id, is_favorite, created_at, updated_at
     FROM links";

fn row_to_link(row: &rusqlite::Row) -> rusqlite::Result<LinkItem> {
    Ok(LinkItem {
        id: row.get(0)?,
        name: row.get(1)?,
        url: row.get(2)?,
        description: row.get(3)?,
        category: row.get(4)?,
        project_id: row.get(5)?,
        is_favorite: row.get::<_, i64>(6)? != 0,
        tags: Vec::new(),
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn attach_tags(conn: &Connection, mut links: Vec<LinkItem>) -> AppResult<Vec<LinkItem>> {
    let ids: Vec<String> = links.iter().map(|l| l.id.clone()).collect();
    let tags = fetch_tags(conn, "link", &ids)?;
    for link in &mut links {
        link.tags = tags.get(&link.id).cloned().unwrap_or_default();
    }
    Ok(links)
}

pub fn list(conn: &Connection, filter: &LinkListFilter) -> AppResult<Vec<LinkItem>> {
    let mut where_clauses: Vec<&str> = Vec::new();
    let mut bind: Vec<Value> = Vec::new();

    if let Some(category) = &filter.category {
        where_clauses.push("category = ?");
        bind.push(Value::Text(category.clone()));
    }
    if let Some(project_id) = &filter.project_id {
        where_clauses.push("project_id = ?");
        bind.push(Value::Text(project_id.clone()));
    }
    if let Some(q) = &filter.q {
        where_clauses.push("(name LIKE ? ESCAPE '\\' OR url LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
        let pattern = Value::Text(like_pattern(q));
        bind.push(pattern.clone());
        bind.push(pattern.clone());
        bind.push(pattern);
    }

    let sql = if where_clauses.is_empty() {
        format!("{BASE_SELECT} ORDER BY LOWER(name) COLLATE NOCASE ASC LIMIT 2000")
    } else {
        format!(
            "{BASE_SELECT} WHERE {} ORDER BY LOWER(name) COLLATE NOCASE ASC LIMIT 2000",
            where_clauses.join(" AND ")
        )
    };

    let mut stmt = conn.prepare(&sql)?;
    let links: Vec<LinkItem> = stmt
        .query_map(rusqlite::params_from_iter(bind.iter()), row_to_link)?
        .filter_map(|r| r.ok())
        .collect();
    attach_tags(conn, links)
}

pub fn get(conn: &Connection, id: &str) -> AppResult<LinkItem> {
    let mut stmt = conn.prepare(&format!("{BASE_SELECT} WHERE id = ?1"))?;
    let mut links: Vec<LinkItem> = stmt
        .query_map(params![id], row_to_link)?
        .filter_map(|r| r.ok())
        .collect();
    links
        .pop()
        .map(|mut l| {
            l.tags = fetch_tags(conn, "link", &[l.id.clone()])
                .ok()
                .and_then(|t| t.get(&l.id).cloned())
                .unwrap_or_default();
            l
        })
        .ok_or_else(|| not_found("Link"))
}

pub fn create(conn: &Connection, input: &LinkInput) -> AppResult<LinkItem> {
    let name = input.name.trim();
    let url = input.url.trim();
    if name.is_empty() {
        return Err(validation("O nome do link é obrigatório"));
    }
    if url.is_empty() {
        return Err(validation("A URL é obrigatória"));
    }
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err(validation("A URL deve começar com http:// ou https://"));
    }

    let id = new_id();
    let now = now_iso();
    let category = input
        .category
        .clone()
        .map(|c| c.trim().to_lowercase())
        .filter(|c| !c.is_empty())
        .unwrap_or_else(|| "outros".into());

    conn.execute(
        "INSERT INTO links (id, name, url, description, category, project_id, is_favorite, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
        params![
            id,
            name,
            url,
            input.description.clone().unwrap_or_default(),
            category,
            input.project_id,
            input.is_favorite.unwrap_or(false),
            now
        ],
    )?;
    sync_tags(conn, "link", &id, &input.tags.clone().unwrap_or_default())?;
    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, input: &LinkInput) -> AppResult<LinkItem> {
    let name = input.name.trim();
    let url = input.url.trim();
    if name.is_empty() {
        return Err(validation("O nome do link é obrigatório"));
    }
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err(validation("A URL deve começar com http:// ou https://"));
    }

    let category = input
        .category
        .clone()
        .map(|c| c.trim().to_lowercase())
        .filter(|c| !c.is_empty())
        .unwrap_or_else(|| "outros".into());

    let changed = conn.execute(
        "UPDATE links SET name = ?2, url = ?3, description = ?4, category = ?5,
             project_id = ?6, is_favorite = ?7, updated_at = ?8
         WHERE id = ?1",
        params![
            id,
            name,
            url,
            input.description.clone().unwrap_or_default(),
            category,
            input.project_id,
            input.is_favorite.unwrap_or(false),
            now_iso()
        ],
    )?;
    if changed == 0 {
        return Err(not_found("Link"));
    }
    sync_tags(conn, "link", id, &input.tags.clone().unwrap_or_default())?;
    get(conn, id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    conn.execute(
        "DELETE FROM entity_tags WHERE entity_type = 'link' AND entity_id = ?1",
        params![id],
    )?;
    conn.execute("DELETE FROM links WHERE id = ?1", params![id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    #[test]
    fn cria_agrupa_por_categoria_normalizada() {
        let conn = open_in_memory().unwrap();
        create(
            &conn,
            &LinkInput {
                name: "GitLab".into(),
                url: "https://gitlab.com".into(),
                description: None,
                category: Some("  Ferramentas ".into()),
                project_id: None,
                is_favorite: None,
                tags: None,
            },
        )
        .unwrap();
        let links = list(&conn, &LinkListFilter::default()).unwrap();
        assert_eq!(links[0].category, "ferramentas");
    }

    #[test]
    fn rejeita_url_sem_protocolo() {
        let conn = open_in_memory().unwrap();
        let result = create(
            &conn,
            &LinkInput {
                name: "X".into(),
                url: "gitlab.com".into(),
                description: None,
                category: None,
                project_id: None,
                is_favorite: None,
                tags: None,
            },
        );
        assert!(result.is_err());
    }
}
