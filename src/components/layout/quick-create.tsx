import { useNavigate } from "react-router-dom";
import { useUiStore } from "@/stores/ui";
import { NoteDialog } from "@/features/notes/note-dialog";
import { ActivityDialog } from "@/features/journal/activity-dialog";
import { TaskDialog } from "@/features/tasks/task-dialog";
import { ProjectDialog } from "@/features/projects/project-dialog";
import { LinkDialog } from "@/features/links/link-dialog";
import { ReminderDialog } from "@/features/dashboard/reminder-dialog";

/**
 * Diálogos globais de criação rápida, acionados pelo menu "Novo"
 * e pelos atalhos de teclado.
 */
export function QuickCreateDialogs() {
  const type = useUiStore((s) => s.quickCreate);
  const close = useUiStore((s) => s.openQuickCreate);
  const navigate = useNavigate();

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) close(null);
  };

  return (
    <>
      <NoteDialog
        open={type === "note"}
        onOpenChange={handleOpenChange}
        onSaved={(note) => navigate(`/notes/${note.id}`)}
      />
      <ActivityDialog
        open={type === "activity"}
        onOpenChange={handleOpenChange}
        onSaved={() => navigate("/journal")}
      />
      <TaskDialog open={type === "task"} onOpenChange={handleOpenChange} />
      <ProjectDialog
        open={type === "project"}
        onOpenChange={handleOpenChange}
        onSaved={(project) => navigate(`/projects/${project.id}`)}
      />
      <LinkDialog open={type === "link"} onOpenChange={handleOpenChange} />
      <ReminderDialog open={type === "reminder"} onOpenChange={handleOpenChange} />
    </>
  );
}
