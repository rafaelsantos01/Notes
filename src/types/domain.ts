// Domain types — mirror of the Rust models (serde camelCase).
// Keep in sync with src-tauri/src/models.rs.

export type ID = string;

export type ProjectStatus = "active" | "paused" | "completed";

export type ActivityCategory =
  | "development"
  | "configuration"
  | "meeting"
  | "problem"
  | "solution"
  | "study"
  | "delivery"
  | "other";

export type ActivityStatus = "done" | "pending";

export type TaskStatus = "pending" | "in_progress" | "done" | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type EntityType = "note" | "activity" | "task" | "project" | "link";

export interface Project {
  id: ID;
  name: string;
  description: string;
  color: string;
  status: ProjectStatus;
  tags: string[];
  noteCount: number;
  pendingTaskCount: number;
  activityCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: ID;
  title: string;
  content: string;
  projectId: ID | null;
  isFavorite: boolean;
  isPinned: boolean;
  isArchived: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: ID;
  title: string;
  description: string;
  category: ActivityCategory;
  status: ActivityStatus;
  projectId: ID | null;
  occurredAt: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: ID;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  projectId: ID | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LinkItem {
  id: ID;
  name: string;
  url: string;
  description: string;
  category: string;
  projectId: ID | null;
  isFavorite: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: ID;
  title: string;
  remindAt: string;
  notes: string;
  isDone: boolean;
  entityType: EntityType | null;
  entityId: ID | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  todayActivities: Activity[];
  pendingTasksCount: number;
  overdueTasksCount: number;
  activeProjectsCount: number;
  notesCount: number;
  recentNotes: Note[];
  recentActivities: Activity[];
  upcomingReminders: Reminder[];
  recentProjects: Project[];
}

export interface SearchResults {
  notes: Note[];
  activities: Activity[];
  projects: Project[];
  tasks: Task[];
  links: LinkItem[];
  tags: string[];
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface ProjectInput {
  name: string;
  description?: string;
  color?: string;
  status?: ProjectStatus;
  tags?: string[];
}

export interface NoteInput {
  title: string;
  content?: string;
  projectId?: ID | null;
  tags?: string[];
}

export interface NoteUpdateInput {
  title: string;
  content: string;
  projectId: ID | null;
  tags: string[];
}

export interface NoteFlagsInput {
  id: ID;
  isFavorite?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
}

export interface ActivityInput {
  title: string;
  description?: string;
  category?: ActivityCategory;
  status?: ActivityStatus;
  projectId?: ID | null;
  occurredAt?: string;
  tags?: string[];
}

export interface ActivityUpdateInput {
  title: string;
  description: string;
  category: ActivityCategory;
  status: ActivityStatus;
  projectId: ID | null;
  occurredAt: string;
  tags: string[];
}

export interface TaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  projectId?: ID | null;
  tags?: string[];
}

export interface TaskUpdateInput {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  projectId: ID | null;
  tags: string[];
}

export interface LinkInput {
  name: string;
  url: string;
  description?: string;
  category?: string;
  projectId?: ID | null;
  isFavorite?: boolean;
  tags?: string[];
}

export interface ReminderInput {
  title: string;
  remindAt: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// List filters
// ---------------------------------------------------------------------------

export interface NoteListFilter {
  projectId?: ID | null;
  favorite?: boolean;
  pinned?: boolean;
  archived?: boolean;
  tag?: string;
  q?: string;
  limit?: number;
}

export interface ActivityListFilter {
  from: string; // ISO UTC
  to: string; // ISO UTC
  projectId?: ID | null;
  q?: string;
}

export interface TaskListFilter {
  status?: TaskStatus | null;
  projectId?: ID | null;
  priority?: TaskPriority | null;
  q?: string;
}

export interface LinkListFilter {
  category?: string | null;
  projectId?: ID | null;
  q?: string;
}

export interface TagInfo {
  name: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Atualizações
// ---------------------------------------------------------------------------

export interface UpdateInfo {
  version: string;
  notes: string;
  date: string | null;
}

/** Payload dos eventos `updater://progress`. */
export type UpdateProgress =
  | { event: "started" }
  | { event: "progress"; downloaded: number; total: number | null }
  | { event: "finished" };
