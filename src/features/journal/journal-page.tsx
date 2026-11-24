import * as React from "react";
import {
  CalendarDays,
  CalendarRange,
  CalendarSearch,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  NotebookPen,
  Plus,
  RotateCcw,
} from "lucide-react";
import { addMonths, addWeeks } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ActivityStatusBadge, CategoryBadge } from "@/components/common/badges";
import { ProjectChip } from "@/components/common/project-chip";
import { Markdown } from "@/components/common/markdown";
import { ActivityDialog } from "./activity-dialog";
import { activities as activitiesService } from "@/services";
import { useFocusStore } from "@/stores/ui";
import {
  dayLabel,
  dayRangeUtc,
  formatTime,
  groupByLocalDay,
  monthRangeUtc,
  nextDay,
  prevDay,
  toDate,
  weekLabel,
  weekRangeUtc,
} from "@/lib/dates";
import type { JournalViewMode } from "@/lib/dates";
import type { Activity, ID } from "@/types/domain";
import { cn } from "@/lib/utils";

export function JournalPage() {
  const [selectedDate, setSelectedDate] = React.useState(() => new Date());
  const [viewMode, setViewMode] = React.useState<JournalViewMode>("day");
  const [activities, setActivities] = React.useState<Activity[] | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Activity | null>(null);
  const [presetDate, setPresetDate] = React.useState<string | undefined>();
  const [deleting, setDeleting] = React.useState<Activity | null>(null);
  const [expanded, setExpanded] = React.useState<Set<ID>>(new Set());

  const focusRef = React.useRef<HTMLDivElement>(null);
  const consumeFocus = useFocusStore((s) => s.consumeFocus);

  const range = React.useMemo(() => {
    if (viewMode === "day") return dayRangeUtc(selectedDate);
    if (viewMode === "week") return weekRangeUtc(selectedDate);
    return monthRangeUtc(selectedDate);
  }, [selectedDate, viewMode]);

  const load = React.useCallback(async () => {
    setActivities(null);
    const list = await activitiesService.list({ from: range.from, to: range.to });
    setActivities(list);
  }, [range]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Foco vindo da busca global
  React.useEffect(() => {
    const focus = consumeFocus();
    if (focus?.type === "activity") {
      void (async () => {
        const activity = await activitiesService.get(focus.id);
        setSelectedDate(toDate(activity.occurredAt));
        setTimeout(() => {
          document.getElementById(`activity-${activity.id}`)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 350);
      })();
    }
  }, [consumeFocus]);

  const step = (direction: 1 | -1) => {
    setSelectedDate((d) => {
      if (viewMode === "day") return direction === 1 ? nextDay(d) : prevDay(d);
      if (viewMode === "week") return addWeeks(d, direction);
      return addMonths(d, direction);
    });
  };

  const rangeLabel = () => {
    if (viewMode === "day") return dayLabel(selectedDate.toISOString());
    if (viewMode === "week") return weekLabel(selectedDate);
    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
      .format(selectedDate)
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  const groups = React.useMemo(() => {
    if (!activities) return null;
    return Array.from(groupByLocalDay(activities, (a) => a.occurredAt).entries()).sort((a, b) =>
      b[0].localeCompare(a[0])
    );
  }, [activities]);

  const toggleExpand = (id: ID) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaved = () => {
    void load();
    setEditing(null);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <PageHeader
        title="Diário"
        description="Registre o que aconteceu a cada dia — o seu histórico de trabalho."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setPresetDate(new Date().toISOString());
              setDialogOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Registrar
          </Button>
        }
      />

      {/* Barra de navegação temporal */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Período anterior">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Próximo período">
            <ChevronRight />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
            className="gap-1.5 text-muted-foreground"
          >
            <RotateCcw className="size-3.5" />
            Hoje
          </Button>
        </div>

        <p className="min-w-0 flex-1 truncate text-center text-sm font-medium">{rangeLabel()}</p>

        <div className="flex items-center rounded-md border p-0.5" role="tablist" aria-label="Agrupamento">
          {(
            [
              { mode: "day", label: "Dia", icon: CalendarDays },
              { mode: "week", label: "Semana", icon: CalendarRange },
              { mode: "month", label: "Mês", icon: CalendarSearch },
            ] as const
          ).map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              role="tab"
              aria-selected={viewMode === mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === mode
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      {!groups ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Nenhum registro neste período"
          description="Registre acontecimentos, configurações, problemas, soluções e entregas do seu dia a dia."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setPresetDate(
                  viewMode === "day" ? selectedDate.toISOString() : new Date().toISOString()
                );
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Criar registro
            </Button>
          }
        />
      ) : (
        <div className="space-y-6" ref={focusRef}>
          {groups.map(([day, dayActivities]) => (
            <section key={day}>
              <div className="sticky top-0 z-10 -mx-1 mb-2 flex items-center gap-2 bg-background/90 px-1 py-1.5 backdrop-blur">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {dayLabel(dayActivities[0]!.occurredAt)}
                </h3>
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] text-muted-foreground">
                  {dayActivities.length} registro{dayActivities.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-2">
                {dayActivities
                  .slice()
                  .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
                  .map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      expanded={expanded.has(activity.id)}
                      onToggleExpand={() => toggleExpand(activity.id)}
                      onEdit={() => {
                        setEditing(activity);
                        setPresetDate(undefined);
                        setDialogOpen(true);
                      }}
                      onDelete={() => setDeleting(activity)}
                      onToggleStatus={() =>
                        void activitiesService
                          .update(activity.id, {
                            title: activity.title,
                            description: activity.description,
                            category: activity.category,
                            status: activity.status === "done" ? "pending" : "done",
                            projectId: activity.projectId,
                            occurredAt: activity.occurredAt,
                            tags: activity.tags,
                          })
                          .then(() => load())
                      }
                    />
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ActivityDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        activity={editing}
        defaultOccurredAt={presetDate}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir registro?"
        description={`"${deleting?.title}" será removido permanentemente. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          await activitiesService.remove(deleting.id);
          await load();
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function ActivityCard({
  activity,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  activity: Activity;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}) {
  const description = activity.description.trim();
  const isLong = description.length > 220;

  return (
    <article
      id={`activity-${activity.id}`}
      className="group rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {formatTime(activity.occurredAt)}
            </span>
            <h4 className="min-w-0 flex-1 text-sm font-medium leading-snug">{activity.title}</h4>
          </div>

          {description && (
            <div className={cn("mt-2 text-sm text-muted-foreground", !expanded && "line-clamp-3")}>
              <Markdown content={description} />
            </div>
          )}
          {isLong && (
            <button
              onClick={onToggleExpand}
              className="mt-1 text-xs font-medium text-primary hover:underline"
            >
              {expanded ? "Ver menos" : "Ver mais"}
            </button>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={activity.category} />
            <ActivityStatusBadge status={activity.status} />
            <ProjectChip projectId={activity.projectId} />
            {activity.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
              >
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
              aria-label="Ações do registro"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleStatus}>
              {activity.status === "done" ? "Marcar como pendente" : "Marcar como concluído"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={onDelete}>
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
