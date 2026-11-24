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
import { ACTIVITY_CATEGORIES } from "@/components/common/badges";
import { activities as activitiesService } from "@/services";
import { activitySchema, isoToLocalInput, localInputToIso, type ActivityFormValues } from "@/validation/schemas";
import type { Activity } from "@/types/domain";

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se informado, edita em vez de criar. */
  activity?: Activity | null;
  /** Data/hora inicial sugerida (ISO UTC). */
  defaultOccurredAt?: string;
  onSaved?: (activity: Activity) => void;
}

export function ActivityDialog({
  open,
  onOpenChange,
  activity,
  defaultOccurredAt,
  onSaved,
}: ActivityDialogProps) {
  const isEdit = Boolean(activity);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      title: "",
      description: "",
      category: "development",
      status: "done",
      projectId: null,
      occurredAt: new Date().toISOString(),
      tags: [],
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        title: activity?.title ?? "",
        description: activity?.description ?? "",
        category: activity?.category ?? "development",
        status: activity?.status ?? "done",
        projectId: activity?.projectId ?? null,
        occurredAt: activity?.occurredAt ?? defaultOccurredAt ?? new Date().toISOString(),
        tags: activity?.tags ?? [],
      });
    }
  }, [open, activity, defaultOccurredAt, form]);

  const onSubmit = async (values: ActivityFormValues) => {
    const payload = {
      title: values.title,
      description: values.description,
      category: values.category,
      status: values.status,
      projectId: values.projectId ?? null,
      occurredAt: values.occurredAt,
      tags: values.tags,
    };
    const saved = isEdit
      ? await activitiesService.update(activity!.id, payload)
      : await activitiesService.create(payload);

    toast.success(isEdit ? "Registro atualizado" : "Registro criado", { description: values.title });
    onOpenChange(false);
    onSaved?.(saved);
  };

  const occurredAtValue = isoToLocalInput(form.watch("occurredAt"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar registro" : "Novo registro diário"}</DialogTitle>
          <DialogDescription>
            Registre o que aconteceu — configure, resolva, entregou ou aprendeu.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="activity-title">Título</Label>
            <Input
              id="activity-title"
              placeholder="Ex.: Túnel VPN configurado"
              autoFocus
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="activity-description">Descrição</Label>
            <Textarea
              id="activity-description"
              placeholder="Detalhes do que foi feito (Markdown é suportado nas anotações)…"
              rows={4}
              {...form.register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={form.watch("category")}
                onValueChange={(v) => form.setValue("category", v as ActivityFormValues["category"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as ActivityFormValues["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="done">Concluído</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="activity-occurred">Data e hora</Label>
              <Input
                id="activity-occurred"
                type="datetime-local"
                value={occurredAtValue}
                onChange={(e) => {
                  if (e.target.value) form.setValue("occurredAt", localInputToIso(e.target.value));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-project">Projeto</Label>
              <ProjectSelect
                id="activity-project"
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
              {form.formState.isSubmitting ? "Salvando…" : isEdit ? "Salvar" : "Criar registro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
