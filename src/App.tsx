import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell, NotFoundRedirect } from "@/components/layout/app-shell";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { JournalPage } from "@/features/journal/journal-page";
import { NotesPage } from "@/features/notes/notes-page";
import { NoteEditorPage } from "@/features/notes/note-editor-page";
import { ProjectsPage } from "@/features/projects/projects-page";
import { ProjectDetailPage } from "@/features/projects/project-detail-page";
import { TasksPage } from "@/features/tasks/tasks-page";
import { LinksPage } from "@/features/links/links-page";
import { CalendarPage } from "@/features/calendar/calendar-page";
import { FavoritesPage } from "@/features/favorites/favorites-page";
import { ArchivePage } from "@/features/archive/archive-page";
import { SettingsPage } from "@/features/settings/settings-page";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/notes/:id" element={<NoteEditorPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/links" element={<LinksPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/notes/new" element={<Navigate to="/notes" replace />} />
        <Route path="*" element={<NotFoundRedirect />} />
      </Route>
    </Routes>
  );
}
