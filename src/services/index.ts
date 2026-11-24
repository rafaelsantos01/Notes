// Service layer — typed wrappers around Tauri commands.
// Keep in sync with src-tauri/src/commands/*.

import { cmd } from "./api";
import type {
  Activity,
  ActivityInput,
  ActivityListFilter,
  ActivityUpdateInput,
  DashboardData,
  ID,
  LinkInput,
  LinkItem,
  LinkListFilter,
  Note,
  NoteFlagsInput,
  NoteInput,
  NoteListFilter,
  NoteUpdateInput,
  Project,
  ProjectInput,
  Reminder,
  ReminderInput,
  SearchResults,
  TagInfo,
  Task,
  TaskInput,
  TaskListFilter,
  TaskUpdateInput,
} from "@/types/domain";

// Projects -------------------------------------------------------------------

export const projects = {
  list: () => cmd<Project[]>("project_list"),
  get: (id: ID) => cmd<Project>("project_get", { id }),
  create: (input: ProjectInput) => cmd<Project>("project_create", { input }),
  update: (id: ID, input: ProjectInput) => cmd<Project>("project_update", { id, input }),
  remove: (id: ID) => cmd<void>("project_delete", { id }),
};

// Notes ----------------------------------------------------------------------

export const notes = {
  list: (filter: NoteListFilter = {}) => cmd<Note[]>("note_list", { filter }),
  get: (id: ID) => cmd<Note>("note_get", { id }),
  create: (input: NoteInput) => cmd<Note>("note_create", { input }),
  update: (id: ID, input: NoteUpdateInput) => cmd<Note>("note_update", { id, input }),
  setFlags: (input: NoteFlagsInput) => cmd<Note>("note_set_flags", { input }),
  remove: (id: ID) => cmd<void>("note_delete", { id }),
};

// Activities -----------------------------------------------------------------

export const activities = {
  list: (filter: ActivityListFilter) => cmd<Activity[]>("activity_list", { filter }),
  get: (id: ID) => cmd<Activity>("activity_get", { id }),
  create: (input: ActivityInput) => cmd<Activity>("activity_create", { input }),
  update: (id: ID, input: ActivityUpdateInput) => cmd<Activity>("activity_update", { id, input }),
  remove: (id: ID) => cmd<void>("activity_delete", { id }),
};

// Tasks ----------------------------------------------------------------------

export const tasks = {
  list: (filter: TaskListFilter = {}) => cmd<Task[]>("task_list", { filter }),
  get: (id: ID) => cmd<Task>("task_get", { id }),
  create: (input: TaskInput) => cmd<Task>("task_create", { input }),
  update: (id: ID, input: TaskUpdateInput) => cmd<Task>("task_update", { id, input }),
  toggleDone: (id: ID, done: boolean) => cmd<Task>("task_toggle_done", { id, done }),
  remove: (id: ID) => cmd<void>("task_delete", { id }),
};

// Links ----------------------------------------------------------------------

export const links = {
  list: (filter: LinkListFilter = {}) => cmd<LinkItem[]>("link_list", { filter }),
  get: (id: ID) => cmd<LinkItem>("link_get", { id }),
  create: (input: LinkInput) => cmd<LinkItem>("link_create", { input }),
  update: (id: ID, input: LinkInput) => cmd<LinkItem>("link_update", { id, input }),
  remove: (id: ID) => cmd<void>("link_delete", { id }),
};

// Reminders ------------------------------------------------------------------

export const reminders = {
  listUpcoming: (limit = 10) => cmd<Reminder[]>("reminder_list_upcoming", { limit }),
  listRange: (from: string, to: string) => cmd<Reminder[]>("reminder_list_range", { from, to }),
  create: (input: ReminderInput) => cmd<Reminder>("reminder_create", { input }),
  update: (id: ID, input: ReminderInput) => cmd<Reminder>("reminder_update", { id, input }),
  setDone: (id: ID, done: boolean) => cmd<Reminder>("reminder_set_done", { id, done }),
  remove: (id: ID) => cmd<void>("reminder_delete", { id }),
};

// Tags -----------------------------------------------------------------------

export const tags = {
  list: () => cmd<TagInfo[]>("tag_list"),
};

// Search / Dashboard ----------------------------------------------------------

export const search = {
  global: (q: string) => cmd<SearchResults>("search_global", { q }),
};

export const dashboard = {
  summary: () => cmd<DashboardData>("dashboard_summary"),
};

// Settings / Backup ----------------------------------------------------------

export const settings = {
  get: (key: string) => cmd<string | null>("settings_get", { key }),
  set: (key: string, value: string) => cmd<void>("settings_set", { key, value }),
};

export const backup = {
  create: (targetPath: string) => cmd<void>("backup_create", { targetPath }),
  restore: (sourcePath: string) => cmd<void>("backup_restore", { sourcePath }),
  exportNotesMarkdown: (dir: string) => cmd<number>("export_notes_markdown", { dir }),
  exportActivitiesMarkdown: (dir: string) => cmd<number>("export_activities_markdown", { dir }),
  exportJson: (targetPath: string) => cmd<void>("export_json", { targetPath }),
  getDbPath: () => cmd<string>("get_db_path"),
};
