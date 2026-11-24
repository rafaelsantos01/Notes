import * as React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  CalendarCheck2,
  CheckCircle2,
  Circle,
  FolderKanban,
  ListTodo,
  Plus,
  StickyNote,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryBadge } from "@/components/common/badges";
import { ProjectChip } from "@/components/common/project-chip";
import { EmptyState } from "@/components/common/empty-state";
import { ReminderDialog } from "./reminder-dialog";
import { dashboard, reminders as remindersService } from "@/services";
import { useUiStore } from "@/stores/ui";
import { formatFullDate, formatTime, greeting, relativeTime } from "@/lib/dates";
import type { Activity, DashboardData, Reminder } from "@/types/domain";

export function DashboardPage() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [error, setError] = React.useState(false);
  const openQuickCreate = useUiStore((s) => s.openQuickCreate);
  const [reminderOpen, setReminderOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setError(false);
    try {
      setData(await dashboard.summary());
    } catch {
      setError(true);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const toggleReminder = async (reminder: Reminder) => {
    await remindersService.setDone(reminder.id, !reminder.isDone);
    await load();
  };

  const today = new Date();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Saudação */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()} 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{formatFullDate(today)}</p>
        </div>
        <Button onClick={() => openQuickCreate("note")} className="gap-1.5">
          <Plus className="size-4" />
          Criação rápida
        </Button>
      </div>

      {error && (
        <Card className="flex items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">Não foi possível carregar o painel.</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Tentar novamente
          </Button>
        </Card>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          loading={!data}
          icon={CalendarCheck2}
          label="Atividades hoje"
          value={data?.todayActivities.length}
          to="/journal"
        />
        <StatCard
          loading={!data}
          icon={ListTodo}
          label="Tarefas pendentes"
          value={data?.pendingTasksCount}
          hint={data && data.overdueTasksCount > 0 ? `${data.overdueTasksCount} atrasada(s)` : undefined}
          hintTone={data && data.overdueTasksCount > 0 ? "danger" : undefined}
          to="/tasks"
        />
        <StatCard
          loading={!data}
          icon={FolderKanban}
          label="Projetos ativos"
          value={data?.activeProjectsCount}
          to="/projects"
        />
        <StatCard
          loading={!data}
          icon={StickyNote}
          label="Anotações"
          value={data?.notesCount}
          to="/notes"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Coluna principal */}
        <div className="min-w-0 space-y-6">
          {/* Atividades de hoje */}
          <Section
            title="Atividades de hoje"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/journal" className="gap-1">
                  Ver diário <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          >
            {!data ? (
              <SkeletonList rows={2} />
            ) : data.todayActivities.length === 0 ? (
              <EmptyState
                icon={History}
                title="Nada registrado hoje"
                description="Registre o que aconteceu no seu dia — configure, resolveu, entregou ou aprendeu algo."
                action={
                  <Button variant="outline" size="sm" onClick={() => openQuickCreate("activity")}>
                    <Plus className="size-4" />
                    Registrar atividade
                  </Button>
                }
              />
            ) : (
              <Timeline activities={data.todayActivities} />
            )}
          </Section>

          {/* Atividade recente */}
          <Section
            title="Atividade recente"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/journal" className="gap-1">
                  Histórico <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          >
            {!data ? (
              <SkeletonList rows={4} />
            ) : data.recentActivities.length === 0 ? (
              <EmptyState
                icon={History}
                title="Sem atividade recente"
                description="Suas últimas atividades aparecerão aqui em uma linha do tempo."
              />
            ) : (
              <Timeline activities={data.recentActivities} showRelative />
            )}
          </Section>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Próximos lembretes */}
          <Section
            title="Próximos lembretes"
            action={
              <Button variant="ghost" size="icon-sm" onClick={() => setReminderOpen(true)} aria-label="Novo lembrete">
                <Plus />
              </Button>
            }
          >
            {!data ? (
              <SkeletonList rows={2} />
            ) : data.upcomingReminders.length === 0 ? (
              <p className="px-1 py-4 text-center text-sm text-muted-foreground">
                Nenhum lembrete programado.
              </p>
            ) : (
              <ul className="space-y-1">
                {data.upcomingReminders.map((reminder) => (
                  <li
                    key={reminder.id}
                    className="group flex items-start gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50"
                  >
                    <button
                      className="mt-0.5 rounded-sm"
                      onClick={() => void toggleReminder(reminder)}
                      aria-label={reminder.isDone ? "Marcar como pendente" : "Concluir lembrete"}
                    >
                      {reminder.isDone ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm ${reminder.isDone ? "text-muted-foreground line-through" : ""}`}
                      >
                        {reminder.title}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <BellRing className="size-3" />
                        {relativeTime(reminder.remindAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Últimas anotações */}
          <Section
            title="Últimas anotações"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/notes">
                  Ver todas <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          >
            {!data ? (
              <SkeletonList rows={3} />
            ) : data.recentNotes.length === 0 ? (
              <p className="px-1 py-4 text-center text-sm text-muted-foreground">
                Nenhuma anotação criada ainda.
              </p>
            ) : (
              <ul className="space-y-1">
                {data.recentNotes.map((note) => (
                  <li key={note.id}>
                    <Link
                      to={`/notes/${note.id}`}
                      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50"
                    >
                      <StickyNote className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{note.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {relativeTime(note.updatedAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Projetos recentes */}
          <Section
            title="Projetos recentes"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/projects">
                  Ver todos <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          >
            {!data ? (
              <SkeletonList rows={2} />
            ) : data.recentProjects.length === 0 ? (
              <p className="px-1 py-4 text-center text-sm text-muted-foreground">
                Nenhum projeto criado ainda.
              </p>
            ) : (
              <ul className="space-y-1">
                {data.recentProjects.map((project) => (
                  <li key={project.id}>
                    <Link
                      to={`/projects/${project.id}`}
                      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50"
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{project.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {relativeTime(project.updatedAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      <ReminderDialog open={reminderOpen} onOpenChange={setReminderOpen} onSaved={() => void load()} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function StatCard({
  loading,
  icon: Icon,
  label,
  value,
  hint,
  hintTone,
  to,
}: {
  loading?: boolean;
  icon: React.ElementType;
  label: string;
  value?: number;
  hint?: string;
  hintTone?: "danger";
  to?: string;
}) {
  const content = (
    <Card className="p-4 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground/70" />
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-12" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value ?? 0}</p>
      )}
      {hint && (
        <p className={`mt-0.5 text-xs ${hintTone === "danger" ? "text-destructive" : "text-muted-foreground"}`}>
          {hint}
        </p>
      )}
    </Card>
  );

  return to ? (
    <Link to={to} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  ) : (
    content
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </Card>
  );
}

function Timeline({ activities, showRelative = false }: { activities: Activity[]; showRelative?: boolean }) {
  return (
    <ol className="relative space-y-4 pl-1">
      <span className="absolute bottom-2 left-[7px] top-2 w-px bg-border" aria-hidden />
      {activities.map((activity) => (
        <li key={activity.id} className="relative flex gap-3 pl-4">
          <span
            className="absolute left-0 top-1.5 size-[9px] rounded-full border-2 border-background bg-primary"
            style={
              activity.category === "problem"
                ? { backgroundColor: "#ef4444" }
                : activity.category === "solution"
                  ? { backgroundColor: "#22c55e" }
                  : activity.category === "delivery"
                    ? { backgroundColor: "#06b6d4" }
                    : undefined
            }
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs tabular-nums text-muted-foreground">
                {showRelative ? relativeTime(activity.occurredAt) : formatTime(activity.occurredAt)}
              </span>
              <span className="truncate text-sm font-medium">{activity.title}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <CategoryBadge category={activity.category} />
              <ProjectChip projectId={activity.projectId} />
              {activity.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </li>
      ))}
    </ol>
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
