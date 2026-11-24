import * as React from "react";
import {
  CheckCircle2,
  Circle,
  CornerDownLeft,
  ListTodo,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Kbd } from "@/components/ui/kbd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ProjectChip } from "@/components/common/project-chip";
import { PriorityBadge, TASK_PRIORITIES, taskStatusLabel } from "@/components/common/badges";
import { TaskDialog } from "./task-dialog";
import { tasks as tasksService } from "@/services";
import { dueLabel, isOverdue } from "@/lib/dates";
import type { Task, TaskPriority } from "@/types/domain";
import { cn } from "@/lib/utils";

type StatusFilter = "pending" | "done" | "all";

export function TasksPage() {
  const [tasks, setTasks] = React.useState<Task[] | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("pending");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");
  const [quickTitle, setQuickTitle] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Task | null>(null);
  const [deleting, setDeleting] = React.useState<Task | null>(null);

  const load = React.useCallback(async () => {
    setTasks(await tasksService.list({}));
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const quickAdd = async () => {
    const title = quickTitle.trim();
    if (!title) return;
    await tasksService.create({ title });
    setQuickTitle("");
    await load();
  };

  const visible = React.useMemo(() => {
    if (!tasks) return null;
    return tasks.filter((task) => {
      if (statusFilter === "pending" && (task.status === "done" || task.status === "cancelled"))
        return false;
      if (statusFilter === "done" && task.status !== "done") return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, priorityFilter]);

  const pendingCount = tasks?.filter((t) => t.status === "pending" || t.status === "in_progress").length;
  const overdueCount = tasks?.filter(
    (t) => t.status !== "done" && t.status !== "cancelled" && isOverdue(t.dueDate)
  ).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <PageHeader
        title="Tarefas"
        description={
          pendingCount !== undefined
            ? `${pendingCount} pendente(s)${overdueCount ? ` · ${overdueCount} atrasada(s)` : ""}`
            : "Gerencie o que precisa ser feito."
        }
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Nova tarefa
          </Button>
        }
      />

      {/* Criação rápida */}
      <div className="relative">
        <Plus className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void quickAdd();
            }
          }}
          placeholder="Adicionar tarefa rapidamente…"
          className="h-10 pl-9 pr-20"
          autoFocus
        />
        <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-muted-foreground">
          <Kbd>Enter</Kbd>
          <CornerDownLeft className="size-3" />
        </span>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border p-0.5">
          {(
            [
              { value: "pending", label: "Pendentes" },
              { value: "done", label: "Concluídas" },
              { value: "all", label: "Todas" },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={cn(
                "rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors",
                statusFilter === value
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as prioridades</SelectItem>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {!visible ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        !tasks || tasks.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="Nenhuma tarefa"
            description="Crie tarefas para acompanhar o que precisa ser feito, com prioridade e vencimento."
          />
        ) : (
          <EmptyState
            icon={CheckCircle2}
            title="Nada por aqui"
            description="Nenhuma tarefa corresponde aos filtros atuais."
          />
        )
      ) : (
        <ul className="space-y-1.5">
          {visible
            .slice()
            .sort((a, b) => {
              const rank = (p: TaskPriority) => ({ urgent: 0, high: 1, medium: 2, low: 3 })[p];
              const aDone = a.status === "done";
              const bDone = b.status === "done";
              if (aDone !== bDone) return aDone ? 1 : -1;
              if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
              if (a.dueDate) return -1;
              if (b.dueDate) return 1;
              return rank(a.priority) - rank(b.priority);
            })
            .map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() =>
                  void tasksService
                    .toggleDone(task.id, task.status !== "done")
                    .then(() => load())
                }
                onEdit={() => {
                  setEditing(task);
                  setDialogOpen(true);
                }}
                onDelete={() => setDeleting(task)}
              />
            ))}
        </ul>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        task={editing}
        onSaved={() => void load()}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir tarefa?"
        description={`"${deleting?.title}" será removida permanentemente.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          await tasksService.remove(deleting.id);
          await load();
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const done = task.status === "done";
  const overdue = isOverdue(task.dueDate) && !done && task.status !== "cancelled";

  return (
    <li
      className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-all hover:shadow-sm"
    >
      <button
        onClick={onToggle}
        aria-label={done ? "Reabrir tarefa" : "Concluir tarefa"}
        className="shrink-0 transition-transform hover:scale-110"
      >
        {done ? (
          <CheckCircle2 className="size-5 text-emerald-500" />
        ) : (
          <Circle className="size-5 text-muted-foreground/50" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium leading-snug", done && "text-muted-foreground line-through")}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={task.priority} />
          {task.status === "in_progress" && (
            <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
              Em andamento
            </span>
          )}
          {task.dueDate && (
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs",
                overdue
                  ? "bg-destructive/10 font-medium text-destructive"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {dueLabel(task.dueDate)}
            </span>
          )}
          <ProjectChip projectId={task.projectId} />
          {task.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Ações da tarefa"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
          <DropdownMenuItem onClick={onToggle}>
            {done ? "Reabrir" : `Marcar como ${taskStatusLabel("done").toLowerCase()}`}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onClick={onDelete}>
            <Trash2 />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
