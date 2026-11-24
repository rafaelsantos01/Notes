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
import { TagInput } from "@/components/common/tag-input";
import { ProjectSelect } from "@/components/common/project-select";
import { notes as notesService } from "@/services";
import { noteSchema, type NoteFormValues } from "@/validation/schemas";
import { useProjectsStore } from "@/stores/data";
import type { Note } from "@/types/domain";

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: Note | null;
  onSaved?: (note: Note) => void;
}

export function NoteDialog({ open, onOpenChange, note, onSaved }: NoteDialogProps) {
  const reloadProjects = useProjectsStore((s) => s.load);

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: "",
      content: "",
      projectId: null,
      tags: [],
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        title: note?.title ?? "",
        content: note?.content ?? "",
        projectId: note?.projectId ?? null,
        tags: note?.tags ?? [],
      });
    }
  }, [open, note, form]);

  const onSubmit = async (values: NoteFormValues) => {
    const created = await notesService.create({
      title: values.title,
      content: values.content,
      projectId: values.projectId ?? null,
      tags: values.tags,
    });
    toast.success("Anotação criada", { description: values.title });
    void reloadProjects();
    onOpenChange(false);
    form.reset({ title: "", content: "", projectId: null, tags: [] });
    onSaved?.(created);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova anotação</DialogTitle>
          <DialogDescription>Crie uma anotação e comece a escrever em Markdown.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="note-title">Título</Label>
            <Input
              id="note-title"
              placeholder="Ex.: Configuração do ambiente de desenvolvimento"
              autoFocus
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note-project">Projeto</Label>
            <ProjectSelect
              id="note-project"
              value={form.watch("projectId") ?? null}
              onChange={(v) => form.setValue("projectId", v)}
            />
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
              {form.formState.isSubmitting ? "Criando…" : "Criar anotação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
