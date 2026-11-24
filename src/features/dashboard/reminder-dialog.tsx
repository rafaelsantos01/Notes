import * as React from "react";
import { useForm } from "react-hook-form";
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
import { reminders as remindersService } from "@/services";
import { isoToLocalInput, localInputToIso, reminderSchema, type ReminderFormValues } from "@/validation/schemas";

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Data/hora inicial sugerida (input datetime-local). */
  defaultRemindAt?: string;
  onSaved?: () => void;
}

export function ReminderDialog({ open, onOpenChange, defaultRemindAt, onSaved }: ReminderDialogProps) {
  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: "",
      remindAt: new Date().toISOString(),
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        title: "",
        remindAt: defaultRemindAt ? new Date(defaultRemindAt).toISOString() : new Date().toISOString(),
        notes: "",
      });
    }
  }, [open, defaultRemindAt, form]);

  const onSubmit = async (values: ReminderFormValues) => {
    await remindersService.create({
      title: values.title,
      remindAt: values.remindAt,
      notes: values.notes,
    });
    toast.success("Lembrete criado", { description: values.title });
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo lembrete</DialogTitle>
          <DialogDescription>Receba um aviso na data e hora escolhidas.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reminder-title">Título</Label>
            <Input id="reminder-title" placeholder="Ex.: Renovar certificado" autoFocus {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reminder-at">Quando</Label>
            <Input
              id="reminder-at"
              type="datetime-local"
              value={isoToLocalInput(form.watch("remindAt"))}
              onChange={(e) => {
                if (e.target.value) form.setValue("remindAt", localInputToIso(e.target.value));
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reminder-notes">Observações</Label>
            <Textarea id="reminder-notes" rows={2} placeholder="Opcional…" {...form.register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Criando…" : "Criar lembrete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
