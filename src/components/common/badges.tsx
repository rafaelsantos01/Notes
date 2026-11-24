import * as React from "react";
import type {
  ActivityCategory,
  ActivityStatus,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock,
  Code2,
  Flame,
  Minus,
  Package,
  PauseCircle,
  PlayCircle,
  Settings,
  Users,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Categorias de atividade
// ---------------------------------------------------------------------------

export const ACTIVITY_CATEGORIES: { value: ActivityCategory; label: string }[] = [
  { value: "development", label: "Desenvolvimento" },
  { value: "configuration", label: "Configuração" },
  { value: "meeting", label: "Reunião" },
  { value: "problem", label: "Problema" },
  { value: "solution", label: "Solução" },
  { value: "study", label: "Estudo" },
  { value: "delivery", label: "Entrega" },
  { value: "other", label: "Outros" },
];

export function activityCategoryLabel(category: ActivityCategory): string {
  return ACTIVITY_CATEGORIES.find((c) => c.value === category)?.label ?? "Outros";
}

export function CategoryBadge({ category }: { category: ActivityCategory }) {
  const config: Record<ActivityCategory, { label: string; icon: React.ElementType }> = {
    development: { label: "Desenvolvimento", icon: Code2 },
    configuration: { label: "Configuração", icon: Settings },
    meeting: { label: "Reunião", icon: Users },
    problem: { label: "Problema", icon: AlertTriangle },
    solution: { label: "Solução", icon: CheckCircle2 },
    study: { label: "Estudo", icon: BookOpen },
    delivery: { label: "Entrega", icon: Package },
    other: { label: "Outros", icon: CircleDot },
  };
  const { label, icon: Icon } = config[category] ?? config.other;
  return (
    <Badge variant="muted" className="gap-1">
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Status de atividade
// ---------------------------------------------------------------------------

export function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  if (status === "done") {
    return (
      <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-3" />
        Concluído
      </Badge>
    );
  }
  return (
    <Badge variant="muted" className="gap-1">
      <Clock className="size-3" />
      Pendente
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Prioridade de tarefa
// ---------------------------------------------------------------------------

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

export function priorityLabel(priority: TaskPriority): string {
  return TASK_PRIORITIES.find((p) => p.value === priority)?.label ?? "Média";
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config: Record<TaskPriority, { label: string; icon: React.ElementType; className: string }> = {
    low: { label: "Baixa", icon: ArrowDown, className: "bg-slate-500/10 text-slate-500" },
    medium: { label: "Média", icon: Minus, className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    high: { label: "Alta", icon: ArrowUp, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    urgent: { label: "Urgente", icon: Flame, className: "bg-red-500/10 text-red-600 dark:text-red-400" },
  };
  const { label, icon: Icon, className } = config[priority];
  return (
    <Badge className={`gap-1 ${className}`}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Status de tarefa
// ---------------------------------------------------------------------------

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em andamento" },
  { value: "done", label: "Concluída" },
  { value: "cancelled", label: "Cancelada" },
];

export function taskStatusLabel(status: TaskStatus): string {
  return TASK_STATUSES.find((s) => s.value === status)?.label ?? "Pendente";
}

// ---------------------------------------------------------------------------
// Status de projeto
// ---------------------------------------------------------------------------

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "active", label: "Ativo" },
  { value: "paused", label: "Pausado" },
  { value: "completed", label: "Concluído" },
];

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  if (status === "active") {
    return (
      <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <PlayCircle className="size-3" />
        Ativo
      </Badge>
    );
  }
  if (status === "paused") {
    return (
      <Badge variant="muted" className="gap-1">
        <PauseCircle className="size-3" />
        Pausado
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400">
      <CheckCircle2 className="size-3" />
      Concluído
    </Badge>
  );
}

export function DotIcon() {
  return <Circle className="size-2 fill-current" />;
}
