use serde::{Deserialize, Serialize};

/// Timestamp atual em ISO 8601 UTC.
pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn clean(s: &str) -> String {
    s.trim().to_string()
}

// ---------------------------------------------------------------------------
// Entidades
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
    pub color: String,
    pub status: String,
    pub tags: Vec<String>,
    pub note_count: i64,
    pub pending_task_count: i64,
    pub activity_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub project_id: Option<String>,
    pub is_favorite: bool,
    pub is_pinned: bool,
    pub is_archived: bool,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Activity {
    pub id: String,
    pub title: String,
    pub description: String,
    pub category: String,
    pub status: String,
    pub project_id: Option<String>,
    pub occurred_at: String,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub due_date: Option<String>,
    pub completed_at: Option<String>,
    pub project_id: Option<String>,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkItem {
    pub id: String,
    pub name: String,
    pub url: String,
    pub description: String,
    pub category: String,
    pub project_id: Option<String>,
    pub is_favorite: bool,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Reminder {
    pub id: String,
    pub title: String,
    pub remind_at: String,
    pub notes: String,
    pub is_done: bool,
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInput {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub status: Option<String>,
    pub tags: Option<Vec<String>>,
}

impl ProjectInput {
    pub fn validated(&self) -> Self {
        Self {
            name: clean(&self.name),
            description: Some(self.description.as_deref().map(clean).unwrap_or_default()),
            color: Some(self.color.clone().unwrap_or_else(|| "#6366f1".into())),
            status: Some(self.status.clone().unwrap_or_else(|| "active".into())),
            tags: Some(self.tags.clone().unwrap_or_default()),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteInput {
    pub title: String,
    pub content: Option<String>,
    pub project_id: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteUpdateInput {
    pub title: String,
    pub content: String,
    pub project_id: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteFlagsInput {
    pub id: String,
    pub is_favorite: Option<bool>,
    pub is_pinned: Option<bool>,
    pub is_archived: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityInput {
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub project_id: Option<String>,
    pub occurred_at: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityUpdateInput {
    pub title: String,
    pub description: String,
    pub category: String,
    pub status: String,
    pub project_id: Option<String>,
    pub occurred_at: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskInput {
    pub title: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<String>,
    pub project_id: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskUpdateInput {
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub due_date: Option<String>,
    pub project_id: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkInput {
    pub name: String,
    pub url: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub project_id: Option<String>,
    pub is_favorite: Option<bool>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReminderInput {
    pub title: String,
    pub remind_at: String,
    pub notes: Option<String>,
}

// ---------------------------------------------------------------------------
// Filtros de listagem
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct NoteListFilter {
    pub project_id: Option<String>,
    pub favorite: Option<bool>,
    pub pinned: Option<bool>,
    pub archived: Option<bool>,
    pub tag: Option<String>,
    pub q: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityListFilter {
    pub from: String,
    pub to: String,
    pub project_id: Option<String>,
    pub q: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct TaskListFilter {
    pub status: Option<String>,
    pub project_id: Option<String>,
    pub priority: Option<String>,
    pub q: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct LinkListFilter {
    pub category: Option<String>,
    pub project_id: Option<String>,
    pub q: Option<String>,
}

// ---------------------------------------------------------------------------
// Composições
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardData {
    pub today_activities: Vec<Activity>,
    pub pending_tasks_count: i64,
    pub overdue_tasks_count: i64,
    pub active_projects_count: i64,
    pub notes_count: i64,
    pub recent_notes: Vec<Note>,
    pub recent_activities: Vec<Activity>,
    pub upcoming_reminders: Vec<Reminder>,
    pub recent_projects: Vec<Project>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SearchResults {
    pub notes: Vec<Note>,
    pub activities: Vec<Activity>,
    pub projects: Vec<Project>,
    pub tasks: Vec<Task>,
    pub links: Vec<LinkItem>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagInfo {
    pub name: String,
    pub count: i64,
}

/// Informações sobre uma atualização disponível.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub version: String,
    pub notes: String,
    pub date: Option<String>,
}
