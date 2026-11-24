import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Converte um timestamp ISO (UTC, com Z) ou data pura (YYYY-MM-DD) em um Date local.
 * Datas puras são interpretadas como datas locais (não UTC).
 */
export function toDate(iso: string): Date {
  return parseISO(iso);
}

/** Data atual em ISO UTC (para persisted timestamps). */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Data local do dia atual em formato pura YYYY-MM-DD (para due dates). */
export function todayDateOnly(): string {
  return format(new Date(), "yyyy-MM-dd");
}

// ---------------------------------------------------------------------------
// Formatação (pt-BR, fuso local)
// ---------------------------------------------------------------------------

export function formatDate(iso: string): string {
  return format(toDate(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatShortDate(iso: string): string {
  return format(toDate(iso), "dd/MM/yyyy");
}

export function formatTime(iso: string): string {
  return format(toDate(iso), "HH:mm");
}

export function formatDateTime(iso: string): string {
  return format(toDate(iso), "dd/MM/yy 'às' HH:mm");
}

export function formatMonthYear(date: Date): string {
  return capitalize(format(date, "MMMM 'de' yyyy", { locale: ptBR }));
}

export function formatFullDate(date: Date): string {
  const base = format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  return capitalize(base);
}

export function weekdayShort(date: Date): string {
  return format(date, "EE", { locale: ptBR });
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ---------------------------------------------------------------------------
// Tempo relativo
// ---------------------------------------------------------------------------

export function relativeTime(iso: string): string {
  const date = toDate(iso);
  const diffDays = differenceInCalendarDays(new Date(), date);

  if (diffDays === 0) {
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 60_000) return "agora mesmo";
    if (diffMs < 3_600_000) return `há ${Math.floor(diffMs / 60_000)} min`;
    if (diffMs < 21_600_000) return `há ${Math.floor(diffMs / 3_600_000)} h`;
    return `hoje às ${formatTime(iso)}`;
  }
  if (diffDays === 1) return `ontem às ${formatTime(iso)}`;
  if (diffDays === -1) return `amanhã às ${formatTime(iso)}`;
  if (diffDays > 1 && diffDays < 7) return `há ${diffDays} dias`;
  if (diffDays < 0 && diffDays > -7) return `em ${-diffDays} dias`;
  return formatShortDate(iso);
}

/** Rótulo de dia para agrupamentos (Hoje / Ontem / data completa). */
export function dayLabel(iso: string): string {
  const diffDays = differenceInCalendarDays(new Date(), toDate(iso));
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays === -1) return "Amanhã";
  return capitalize(format(toDate(iso), "EEEE, d 'de' MMMM", { locale: ptBR }));
}

/** Rótulo de semana: "17 – 23 de novembro". */
export function weekLabel(date: Date): string {
  const start = startOfWeek(date, { locale: ptBR, weekStartsOn: 1 });
  const end = endOfWeek(date, { locale: ptBR, weekStartsOn: 1 });
  const sameMonth = start.getMonth() === end.getMonth();
  const startFmt = sameMonth ? format(start, "d", { locale: ptBR }) : format(start, "d MMM", { locale: ptBR });
  return capitalize(`${startFmt} – ${format(end, "d 'de' MMMM", { locale: ptBR })}`);
}

// ---------------------------------------------------------------------------
// Bounds de range (local → ISO UTC para consultas no banco)
// ---------------------------------------------------------------------------

export function dayRangeUtc(date: Date): { from: string; to: string } {
  return { from: startOfDay(date).toISOString(), to: endOfDay(date).toISOString() };
}

export function weekRangeUtc(date: Date): { from: string; to: string } {
  return {
    from: startOfWeek(date, { locale: ptBR, weekStartsOn: 1 }).toISOString(),
    to: endOfWeek(date, { locale: ptBR, weekStartsOn: 1 }).toISOString(),
  };
}

export function monthRangeUtc(date: Date): { from: string; to: string } {
  return {
    from: startOfMonth(date).toISOString(),
    to: endOfMonth(date).toISOString(),
  };
}

/** Meses visíveis numa grade de calendário (inclui dias do mês anterior/seguinte). */
export function calendarGridRangeUtc(date: Date): { from: string; to: string } {
  const gridStart = startOfWeek(startOfMonth(date), { locale: ptBR, weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(date), { locale: ptBR, weekStartsOn: 1 });
  return { from: gridStart.toISOString(), to: gridEnd.toISOString() };
}

// ---------------------------------------------------------------------------
// Tarefas / vencimentos
// ---------------------------------------------------------------------------

/** Uma due date (YYYY-MM-DD) está atrasada? (comparação por dia local) */
export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const due = startOfDay(parseISO(dueDate));
  return due.getTime() < startOfDay(new Date()).getTime();
}

export function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return differenceInCalendarDays(new Date(), parseISO(dueDate)) === 0;
}

export function dueLabel(dueDate: string | null): string | null {
  if (!dueDate) return null;
  const diff = differenceInCalendarDays(parseISO(dueDate), new Date());
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  if (diff < 0) return `${formatShortDate(dueDate)}`;
  if (diff < 7) return `Em ${diff} dias`;
  return formatShortDate(dueDate);
}

// ---------------------------------------------------------------------------
// Utilidades diversas
// ---------------------------------------------------------------------------

export type JournalViewMode = "day" | "week" | "month";

export function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Agrupa itens por dia local (chave YYYY-MM-DD, preservando ordem). */
export function groupByLocalDay<T>(items: T[], getDate: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = format(toDate(getDate(item)), "yyyy-MM-dd");
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

export function addMonthsSafe(date: Date, amount: number): Date {
  return addMonths(date, amount);
}

export function nextDay(date: Date): Date {
  return addDays(date, 1);
}

export function prevDay(date: Date): Date {
  return addDays(date, -1);
}
