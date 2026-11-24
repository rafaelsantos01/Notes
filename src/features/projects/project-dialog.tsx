import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check } from "lucide-react";
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
import { PROJECT_STATUSES } from "@/components/common/badges";
import { projects as projectsService } from "@/services";
import { projectSchema, type ProjectFormValues } from "@/validation/schemas";
import { useProjectsStore } from "@/stores/data";
import { cn } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/types/domain";

const PRESET_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#64748b", // slate
];

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSaved?: (project: Project) => void;
}

export function ProjectDialog({ open, onOpenChange, project, onSaved }: ProjectDialogProps) {
  const isEdit = Boolean(project);
  const reloadProjects = useProjectsStore((s) => s.load);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#6366f1",
      status: "active",
      tags: [],
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: project?.name ?? "",
        description: project?.description ?? "",
        color: project?.color ?? "#6366f1",
        status: project?.status ?? "active",
        tags: project?.tags ?? [],
      });
    }
  }, [open, project, form]);

  const onSubmit = async (values: ProjectFormValues) => {
    const payload = {
      name: values.name,
      description: values.description,
      color: values.color,
      status: values.status,
      tags: values.tags,
    };
    const saved = isEdit
      ? await projectsService.update(project!.id, payload)
      : await projectsService.create(payload);

    await reloadProjects(true);
    toast.success(isEdit ? "Projeto atualizado" : "Projeto criado", { description: values.name });
    onOpenChange(false);
    onSaved?.(saved);
  };

  const color = form.watch("color");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar projeto" : "Novo projeto"}</DialogTitle>
          <DialogDescription>
            Organize anotações, tarefas e registros sob um contexto comum.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Nome</Label>
            <Input id="project-name" placeholder="Ex.: Migração para AWS" autoFocus {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-description">Descrição</Label>
            <Textarea
              id="project-description"
              placeholder="Objetivo e contexto do projeto…"
              rows={3}
              {...form.register("description")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110",
                    color?.toLowerCase() === preset && "ring-2 ring-ring ring-offset-2 ring-offset-card"
                  )}
                  style={{ backgroundColor: preset }}
                  onClick={() => form.setValue("color", preset)}
                  aria-label={`Cor ${preset}`}
                >
                  {color?.toLowerCase() === preset && <Check className="size-3.5 text-white" strokeWidth={3} />}
                </button>
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => form.setValue("color", e.target.value)}
                className="size-7 cursor-pointer rounded-full border border-input bg-transparent p-0"
                aria-label="Cor personalizada"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as ProjectStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <Controller
                control={form.control}
                name="tags"
                render={({ field }) => <TagInput value={field.value ?? []} onChange={field.onChange} />}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando…" : isEdit ? "Salvar" : "Criar projeto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
