import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  History,
  Link2,
  ListTodo,
  Loader2,
  MoreHorizontal,
  Pencil,
  StickyNote,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { CategoryBadge, PriorityBadge } from "@/components/common/badges";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectStatusBadge } from "@/components/common/badges";
import { ProjectDialog } from "./project-dialog";
import { activities as activitiesService, links as linksService, notes as notesService, projects as projectsService, tasks as tasksService } from "@/services";
import { useProjectById, useProjectsStore } from "@/stores/data";
import { formatTime, isOverdue, dueLabel, relativeTime, dayLabel } from "@/lib/dates";
import type { Activity, LinkItem, Note, Task } from "@/types/domain";
import { cn } from "@/lib/utils";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = useProjectById(id ?? null);
  const reloadProjects = useProjectsStore((s) => s.load);

  const [notes, setNotes] = React.useState<Note[] | null>(null);
  const [tasks, setTasks] = React.useState<Task[] | null>(null);
  const [activities, setActivities] = React.useState<Activity[] | null>(null);
  const [links, setLinks] = React.useState<LinkItem[] | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const load = React.useCallback(async () => {
    const projectId = id!;
    const [n, t, a, l] = await Promise.all([
      notesService.list({ projectId }),
      tasksService.list({ projectId }),
      activitiesService.list({ from: "2000-01-01T00:00:00.000Z", to: "2100-01-01T00:00:00.000Z", projectId }),
      linksService.list({ projectId }),
    ]);
    setNotes(n);
    setTasks(t);
    setActivities(a);
    setLinks(l);
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    void reloadProjects();
  }, [reloadProjects]);

  const pendingTasks = tasks?.filter((t) => t.status === "pending" || t.status === "in_progress") ?? [];
  const doneTasks = tasks?.filter((t) => t.status === "done") ?? [];

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const toggleTask = async (task: Task) => {
    await tasksService.toggleDone(task.id, task.status !== "done");
    await load();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate("/projects")} aria-label="Voltar">
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
            <h1 className="truncate text-xl font-semibold tracking-tight">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{project.description}</p>
          )}
          {project.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Ações do projeto">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem destructive onClick={() => setConfirmDelete(true)}>
              <Trash2 />
              Excluir projeto
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryTile icon={StickyNote} label="Anotações" value={notes?.length ?? 0} />
        <SummaryTile icon={ListTodo} label="Tarefas pendentes" value={pendingTasks.length} />
        <SummaryTile icon={History} label="Registros" value={activities?.length ?? 0} />
      </div>

      {/* Tarefas */}
      <Section title="Tarefas" icon={ListTodo}>
        {!tasks ? (
          <SkeletonList rows={2} />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="Nenhuma tarefa"
            description="As tarefas vinculadas a este projeto aparecerão aqui."
            className="border-0 py-8"
          />
        ) : (
          <ul className="space-y-1">
            {[...pendingTasks, ...doneTasks].map((task) => (
              <li key={task.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent/50">
                <Checkbox
                  checked={task.status === "done"}
                  onCheckedChange={() => void toggleTask(task)}
                  aria-label={task.status === "done" ? "Reabrir tarefa" : "Concluir tarefa"}
                />
                <span className={cn("min-w-0 flex-1 truncate text-sm", task.status === "done" && "text-muted-foreground line-through")}>
                  {task.title}
                </span>
                <PriorityBadge priority={task.priority} />
                {task.dueDate && (
                  <span className={cn("text-xs", isOverdue(task.dueDate) && task.status !== "done" ? "font-medium text-destructive" : "text-muted-foreground")}>
                    {dueLabel(task.dueDate)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Atividades */}
      <Section title="Histórico de atividades" icon={History}>
        {!activities ? (
          <SkeletonList rows={3} />
        ) : activities.length === 0 ? (
          <EmptyState
            icon={History}
            title="Sem registros"
            description="Os registros do diário vinculados a este projeto aparecerão aqui."
            className="border-0 py-8"
          />
        ) : (
          <ol className="relative space-y-3 pl-4">
            <span className="absolute bottom-2 left-[5px] top-2 w-px bg-border" aria-hidden />
            {activities
              .slice()
              .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
              .slice(0, 30)
              .map((activity) => (
                <li key={activity.id} className="relative">
                  <span className="absolute -left-4 top-1.5 size-[9px] rounded-full border-2 border-background bg-primary" aria-hidden />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">{dayLabel(activity.occurredAt)} · {formatTime(activity.occurredAt)}</span>
                    <span className="text-sm font-medium">{activity.title}</span>
                    <CategoryBadge category={activity.category} />
                  </div>
                </li>
              ))}
          </ol>
        )}
      </Section>

      {/* Anotações */}
      <Section title="Anotações" icon={StickyNote}>
        {!notes ? (
          <SkeletonList rows={2} />
        ) : notes.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title="Nenhuma anotação"
            description="As anotações vinculadas a este projeto aparecerão aqui."
            className="border-0 py-8"
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {notes.map((note) => (
              <Link
                key={note.id}
                to={`/notes/${note.id}`}
                className="rounded-lg border p-3 transition-colors hover:bg-accent/50"
              >
                <p className="truncate text-sm font-medium">{note.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{relativeTime(note.updatedAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Links */}
      <Section title="Links e referências" icon={Link2}>
        {!links ? (
          <SkeletonList rows={2} />
        ) : links.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="Nenhum link"
            description="Links e referências vinculados a este projeto aparecerão aqui."
            className="border-0 py-8"
          />
        ) : (
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent/50">
                <Link2 className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{link.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{link.url}</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Abrir link"
                  onClick={() => void import("@tauri-apps/plugin-opener").then((m) => m.openUrl(link.url))}
                >
                  <ExternalLink />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <ProjectDialog open={editOpen} onOpenChange={setEditOpen} project={project} />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir projeto?"
        description={`"${project.name}" será removido. Itens vinculados serão desvinculados, mas mantidos.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          await projectsService.remove(project.id);
          await reloadProjects(true);
          toast.success("Projeto excluído");
          navigate("/projects");
        }}
      />
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <Icon className="size-4 text-muted-foreground/70" />
      <div>
        <p className="text-lg font-semibold tabular-nums leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-muted-foreground" />
        {title}
      </h3>
      {children}
    </Card>
  );
}

function SkeletonList({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
