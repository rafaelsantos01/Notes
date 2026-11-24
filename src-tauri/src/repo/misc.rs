use rusqlite::Connection;

use crate::error::AppResult;
use crate::models::{DashboardData, SearchResults};

use super::{like_pattern, activities, links, notes, projects, reminders, tasks};

/// Busca global em todas as entidades (LIMITs por tipo para manter a paleta ágil).
pub fn search_global(conn: &Connection, q: &str) -> AppResult<SearchResults> {
    let q = q.trim();
    if q.is_empty() {
        return Ok(SearchResults::default());
    }

    let note_filter = crate::models::NoteListFilter {
        q: Some(q.to_string()),
        limit: Some(8),
        ..Default::default()
    };
    let past = "2000-01-01T00:00:00.000Z".to_string();
    let future = "2999-12-31T23:59:59.999Z".to_string();

    let results_notes = notes::list(conn, &note_filter)?;
    let activities = activities::list(
        conn,
        &crate::models::ActivityListFilter {
            from: past.clone(),
            to: future.clone(),
            project_id: None,
            q: Some(q.to_string()),
        },
    )?
    .into_iter()
    .take(8)
    .collect::<Vec<_>>();
    let projects = projects::list(conn)?
        .into_iter()
        .filter(|p| p.name.to_lowercase().contains(&q.to_lowercase()))
        .take(8)
        .collect::<Vec<_>>();
    let tasks = tasks::list(
        conn,
        &crate::models::TaskListFilter {
            status: None,
            project_id: None,
            priority: None,
            q: Some(q.to_string()),
        },
    )?
    .into_iter()
    .take(8)
    .collect::<Vec<_>>();
    let links = links::list(
        conn,
        &crate::models::LinkListFilter {
            category: None,
            project_id: None,
            q: Some(q.to_string()),
        },
    )?
    .into_iter()
    .take(8)
    .collect::<Vec<_>>();

    // Tags por nome
    let pattern = like_pattern(q);
    let mut stmt = conn.prepare(
        "SELECT t.name FROM tags t WHERE t.name LIKE ?1 ESCAPE '\\'
         ORDER BY (SELECT COUNT(*) FROM entity_tags et WHERE et.tag_id = t.id) DESC
         LIMIT 8",
    )?;
    let tags: Vec<String> = stmt
        .query_map(rusqlite::params![pattern], |row| row.get(0))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(SearchResults {
        notes: results_notes,
        activities,
        projects,
        tasks,
        links,
        tags,
    })
}

/// Limite de "hoje" em UTC, calculado no fuso local do Windows.
fn local_day_bounds_utc() -> (String, String) {
    use chrono::{Local, TimeZone};
    let local_now = Local::now();
    let start_local = local_now.date_naive().and_hms_opt(0, 0, 0).unwrap();
    let start_utc = match Local.from_local_datetime(&start_local) {
        chrono::LocalResult::Single(dt) => dt.with_timezone(&chrono::Utc),
        _ => local_now.with_timezone(&chrono::Utc),
    };
    let end_utc = start_utc + chrono::Duration::hours(24);
    (
        start_utc.to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        end_utc.to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
    )
}

pub fn dashboard_summary(conn: &Connection) -> AppResult<DashboardData> {
    let (day_start, day_end) = local_day_bounds_utc();

    let today_activities = activities::list(
        conn,
        &crate::models::ActivityListFilter {
            from: day_start,
            to: day_end,
            project_id: None,
            q: None,
        },
    )?;

    let pending_tasks_count = conn.query_row(
        "SELECT COUNT(*) FROM tasks WHERE status IN ('pending', 'in_progress')",
        [],
        |r| r.get(0),
    )?;
    let overdue_tasks_count = conn.query_row(
        "SELECT COUNT(*) FROM tasks WHERE status IN ('pending', 'in_progress') AND due_date IS NOT NULL AND due_date < ?1",
        rusqlite::params![chrono::Local::now().date_naive().format("%Y-%m-%d").to_string()],
        |r| r.get(0),
    )?;
    let active_projects_count = conn.query_row(
        "SELECT COUNT(*) FROM projects WHERE status = 'active'",
        [],
        |r| r.get(0),
    )?;
    let notes_count = conn.query_row(
        "SELECT COUNT(*) FROM notes WHERE is_archived = 0",
        [],
        |r| r.get(0),
    )?;

    let recent_notes = notes::list(
        conn,
        &crate::models::NoteListFilter {
            archived: Some(false),
            limit: Some(5),
            ..Default::default()
        },
    )?;

    let past = "2000-01-01T00:00:00.000Z".to_string();
    let future = "2999-12-31T23:59:59.999Z".to_string();
    let recent_activities = activities::list(
        conn,
        &crate::models::ActivityListFilter {
            from: past,
            to: future,
            project_id: None,
            q: None,
        },
    )?
    .into_iter()
    .take(8)
    .collect();

    let upcoming_reminders = reminders::list_upcoming(conn, 5)?;

    let all_projects = projects::list(conn)?;
    let recent_projects: Vec<_> = all_projects.into_iter().take(5).collect();

    Ok(DashboardData {
        today_activities,
        pending_tasks_count,
        overdue_tasks_count,
        active_projects_count,
        notes_count,
        recent_notes,
        recent_activities,
        upcoming_reminders,
        recent_projects,
    })
}
