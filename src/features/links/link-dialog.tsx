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
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "@/components/common/tag-input";
import { ProjectSelect } from "@/components/common/project-select";
import { links as linksService } from "@/services";
import { linkSchema, type LinkFormValues } from "@/validation/schemas";
import type { LinkItem } from "@/types/domain";

export const LINK_CATEGORIES = [
  "repositório",
  "documentação",
  "ambiente",
  "ferramenta",
  "api",
  "outros",
];

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link?: LinkItem | null;
  defaults?: { category?: string };
  onSaved?: (link: LinkItem) => void;
}

export function LinkDialog({ open, onOpenChange, link, defaults, onSaved }: LinkDialogProps) {
  const isEdit = Boolean(link);

  const form = useForm<LinkFormValues>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      name: "",
      url: "",
      description: "",
      category: "outros",
      projectId: null,
      isFavorite: false,
      tags: [],
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: link?.name ?? "",
        url: link?.url ?? "",
        description: link?.description ?? "",
        category: link?.category ?? defaults?.category ?? "outros",
        projectId: link?.projectId ?? null,
        isFavorite: link?.isFavorite ?? false,
        tags: link?.tags ?? [],
      });
    }
  }, [open, link, defaults, form]);

  const onSubmit = async (values: LinkFormValues) => {
    const payload = {
      name: values.name,
      url: values.url,
      description: values.description,
      category: values.category,
      projectId: values.projectId ?? null,
      isFavorite: values.isFavorite,
      tags: values.tags,
    };
    const saved = isEdit
      ? await linksService.update(link!.id, payload)
      : await linksService.create(payload);

    toast.success(isEdit ? "Link atualizado" : "Link criado", { description: values.name });
    onOpenChange(false);
    onSaved?.(saved);
  };

  const category = form.watch("category");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar link" : "Novo link"}</DialogTitle>
          <DialogDescription>Centralize acessos, docs e ferramentas importantes.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="link-name">Nome</Label>
              <Input id="link-name" placeholder="Ex.: GitLab" autoFocus {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link-category">Categoria</Label>
              <Input
                id="link-category"
                list="link-categories"
                placeholder="Ex.: documentação"
                value={category}
                onChange={(e) => form.setValue("category", e.target.value)}
              />
              <datalist id="link-categories">
                {LINK_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="link-url">URL</Label>
            <Input id="link-url" placeholder="https://…" {...form.register("url")} />
            {form.formState.errors.url && (
              <p className="text-xs text-destructive">{form.formState.errors.url.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="link-description">Descrição</Label>
            <Textarea
              id="link-description"
              placeholder="Para que serve este link…"
              rows={2}
              {...form.register("description")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="link-project">Projeto</Label>
            <ProjectSelect
              id="link-project"
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

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={form.watch("isFavorite")}
              onCheckedChange={(v) => form.setValue("isFavorite", v === true)}
            />
            Adicionar aos favoritos
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando…" : isEdit ? "Salvar" : "Criar link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
