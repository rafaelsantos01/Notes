import * as React from "react";
import { addMonths, endOfMonth, endOfWeek, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import {
  BellRing,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  History,
  ListTodo,
  RotateCcw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { CategoryBadge } from "@/components/common/badges";
import { ProjectChip } from "@/components/common/project-chip";
import { activities as activitiesService, reminders as remindersService, tasks as tasksService } from "@/services";
import {
  calendarGridRangeUtc,
  dayLabel,
  formatFullDate,
  formatMonthYear,
  formatTime,
  isOverdue,
  monthRangeUtc,
  toDate,
} from "@/lib/dates";
import type { Activity, Reminder, Task } from "@/types/domain";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

export function CalendarPage() {
  const [month, setMonth] = React.useState(() => new Date());
  const [selectedDay, setSelectedDay] = React.useState(() => new Date());
  const [activities, setActivities] = React.useState<Activity[] | null>(null);
  const [tasks, setTasks] = React.useState<Task[] | null>(null);
  const [reminders, setReminders] = React.useState<Reminder[] | null>(null);

  const load = React.useCallback(async () => {
    const grid = calendarGridRangeUtc(month);
    const outer = monthRangeUtc(month);
    const [a, t, r] = await Promise.all([
      activitiesService.list({ from: grid.from, to: grid.to }),
      tasksService.list({}),
      remindersService.listRange(grid.from, grid.to),
    ]);
    setActivities(a);
    setTasks(t);
    setReminders(r);
    void outer;
  }, [month]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const days = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const list: Date[] = [];
    let cursor = start;
    while (cursor <= end) {
      list.push(cursor);
      cursor = new Date(cursor.getTime() + 86_400_000);
    }
    return list;
  }, [month]);

  const dayActivities = (day: Date) =>
    activities?.filter((a) => isSameDay(toDate(a.occurredAt), day)) ?? [];

  const dayTasks = (day: Date) =>
    tasks?.filter((t) => t.dueDate && isSameDay(toDate(`${t.dueDate}T12:00:00`), day)) ?? [];

  const dayReminders = (day: Date) =>
    reminders?.filter((r) => isSameDay(toDate(r.remindAt), day)) ?? [];

  const selected = {
    activities: dayActivities(selectedDay),
    tasks: dayTasks(selectedDay),
    reminders: dayReminders(selectedDay),
  };

  const hasAny = (day: Date) =>
    dayActivities(day).length > 0 || dayTasks(day).length > 0 || dayReminders(day).length > 0;

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col p-6">
      {/* Cabeçalho */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Calendário</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, -1))} aria-label="Mês anterior">
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => {
              setMonth(new Date());
              setSelectedDay(new Date());
            }}
          >
            <RotateCcw className="size-3.5" />
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))} aria-label="Próximo mês">
            <ChevronRight />
          </Button>
        </div>
        <p className="min-w-40 text-center text-sm font-medium">{formatMonthYear(month)}</p>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[1fr_340px]">
        {/* Grade */}
        <Card className="flex min-h-0 flex-col p-3">
          <div className="grid grid-cols-7 gap-1 pb-2">
            {WEEKDAYS.map((d) => (
              <span key={d} className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {d}
              </span>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-1">
            {days.map((day) => {
              const acts = dayActivities(day);
              const tsks = dayTasks(day);
              const rems = dayReminders(day);
              const inMonth = isSameMonth(day, month);
              const isSelected = isSameDay(day, selectedDay);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "flex min-h-16 flex-col items-start rounded-lg border p-1.5 text-left transition-colors hover:bg-accent/50",
                    !inMonth && "opacity-40",
                    isSelected && "border-primary bg-primary/5 ring-1 ring-primary",
                    isToday(day) && !isSelected && "border-primary/50"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-5 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                      isToday(day) && "bg-primary text-primary-foreground"
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {(acts.length > 0 || tsks.length > 0 || rems.length > 0) && (
                    <span className="mt-auto flex flex-wrap gap-0.5 pt-0.5">
                      {acts.length > 0 && (
                        <span className="rounded-full bg-indigo-500/20 px-1.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-300">
                          {acts.length}
                        </span>
                      )}
                      {tsks.length > 0 && (
                        <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
                          {tsks.length}
                        </span>
                      )}
                      {rems.length > 0 && (
                        <span className="rounded-full bg-rose-500/20 px-1.5 text-[10px] font-medium text-rose-600 dark:text-rose-300">
                          {rems.length}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Painel do dia */}
        <Card className="flex min-h-0 flex-col overflow-y-auto p-4">
          <p className="text-xs text-muted-foreground">{formatFullDate(selectedDay)}</p>
          <h2 className="mt-0.5 text-base font-semibold">{dayLabel(selectedDay.toISOString())}</h2>

          {!activities || !tasks || !reminders ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !hasAny(selectedDay) ? (
            <div className="mt-4 flex flex-1 items-center justify-center">
              <EmptyState
                icon={CalendarDays}
                title="Dia vazio"
                description="Nenhuma atividade, tarefa ou lembrete nesta data."
                className="border-0 py-6"
              />
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              {selected.activities.length > 0 && (
                <DaySection title="Atividades" icon={History}>
                  {selected.activities
                    .slice()
                    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
                    .map((activity) => (
                      <div key={activity.id} className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatTime(activity.occurredAt)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">{activity.title}</span>
                        <CategoryBadge category={activity.category} />
                      </div>
                    ))}
                </DaySection>
              )}

              {selected.tasks.length > 0 && (
                <DaySection title="Tarefas com vencimento" icon={ListTodo}>
                  {selected.tasks.map((task) => (
                    <div key={task.id} className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-sm",
                          task.status === "done" && "text-muted-foreground line-through",
                          task.status !== "done" && isOverdue(task.dueDate) && "font-medium text-destructive"
                        )}
                      >
                        {task.title}
                      </span>
                      <ProjectChip projectId={task.projectId} />
                    </div>
                  ))}
                </DaySection>
              )}

              {selected.reminders.length > 0 && (
                <DaySection title="Lembretes" icon={BellRing}>
                  {selected.reminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-center gap-1.5">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatTime(reminder.remindAt)}
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-sm",
                          reminder.isDone && "text-muted-foreground line-through"
                        )}
                      >
                        {reminder.title}
                      </span>
                    </div>
                  ))}
                </DaySection>
              )}

              <Button variant="outline" size="sm" asChild className="w-full">
                <Link to="/journal">Ver diário completo</Link>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function DaySection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}
