-- Notes — initial schema (0001)
-- All timestamps are ISO 8601 UTC strings; pure dates are YYYY-MM-DD.

PRAGMA foreign_keys = ON;

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#6366f1',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Sem título',
  content TEXT NOT NULL DEFAULT '',
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_notes_project ON notes(project_id);
CREATE INDEX idx_notes_updated ON notes(updated_at DESC);
CREATE INDEX idx_notes_favorite ON notes(is_favorite) WHERE is_favorite = 1;
CREATE INDEX idx_notes_archived ON notes(is_archived) WHERE is_archived = 1;

CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('development', 'configuration', 'meeting', 'problem', 'solution', 'study', 'delivery', 'other')),
  status TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('done', 'pending')),
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_activities_occurred ON activity_logs(occurred_at DESC);
CREATE INDEX idx_activities_project ON activity_logs(project_id);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TEXT,
  completed_at TEXT,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_tasks_project ON tasks(project_id);

CREATE TABLE links (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'outros',
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_links_category ON links(category);
CREATE INDEX idx_links_project ON links(project_id);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Polymorphic association (no FK to entity tables by design).
CREATE TABLE entity_tags (
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('note', 'activity', 'task', 'project', 'link')),
  entity_id TEXT NOT NULL,
  PRIMARY KEY (tag_id, entity_type, entity_id)
);
CREATE INDEX idx_entity_tags_entity ON entity_tags(entity_type, entity_id);

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('note', 'activity')),
  entity_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);

CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  remind_at TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  entity_type TEXT,
  entity_id TEXT,
  is_done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_reminders_at ON reminders(remind_at);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
