import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/common/tag-input";
import { ProjectSelect } from "@/components/common/project-select";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/components/common/badges";
import { tasks as tasksService } from "@/services";
import { taskSchema, type TaskFormValues } from "@/validation/schemas";
import type { Task } from "@/types/domain";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  /** Valores iniciais para criação (ex.: projeto corrente). */
  defaults?: { projectId?: string | null; dueDate?: string | null };
  onSaved?: (task: Task) => void;
}

export function TaskDialog({ open, onOpenChange, task, defaults, onSaved }: TaskDialogProps) {
  const isEdit = Boolean(task);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "pending",
      priority: "medium",
      dueDate: null,
      projectId: null,
      tags: [],
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        title: task?.title ?? "",
        description: task?.description ?? "",
        status: task?.status ?? "pending",
        priority: task?.priority ?? "medium",
        dueDate: task?.dueDate ?? defaults?.dueDate ?? null,
        projectId: task?.projectId ?? defaults?.projectId ?? null,
        tags: task?.tags ?? [],
      });
    }
  }, [open, task, defaults, form]);

  const onSubmit = async (values: TaskFormValues) => {
    const payload = {
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      dueDate: values.dueDate ?? null,
      projectId: values.projectId ?? null,
      tags: values.tags,
    };
    const saved = isEdit
      ? await tasksService.update(task!.id, payload)
      : await tasksService.create(payload);

    toast.success(isEdit ? "Tarefa atualizada" : "Tarefa criada", { description: values.title });
    onOpenChange(false);
    onSaved?.(saved);
  };

  const dueDate = form.watch("dueDate");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>Descreva o que precisa ser feito, quando e com qual prioridade.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Título</Label>
            <Input id="task-title" placeholder="Ex.: Validar acesso ao GitLab" autoFocus {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-description">Descrição</Label>
            <Textarea
              id="task-description"
              placeholder="Detalhes opcionais…"
              rows={3}
              {...form.register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(v) => form.setValue("priority", v as TaskFormValues["priority"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Vencimento</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate ?? ""}
                onChange={(e) => form.setValue("dueDate", e.target.value || null)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as TaskFormValues["status"])}
                disabled={!isEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.filter((s) => s.value !== "cancelled" || isEdit).map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-project">Projeto</Label>
              <ProjectSelect
                id="task-project"
                value={form.watch("projectId") ?? null}
                onChange={(v) => form.setValue("projectId", v)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tags</Label>
            <Controller
              control={form.control}
              name="tags"
              render={({ field }) => <TagInput value={field.value ?? []} onChange={field.onChange} />}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando…" : isEdit ? "Salvar" : "Criar tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
