import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArchiveRestore, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { notes as notesService } from "@/services";
import { relativeTime } from "@/lib/dates";
import { excerpt } from "@/lib/text";
import type { Note } from "@/types/domain";

export function ArchivePage() {
  const navigate = useNavigate();
  const [notes, setNotes] = React.useState<Note[] | null>(null);
  const [deleting, setDeleting] = React.useState<Note | null>(null);

  const load = React.useCallback(async () => {
    setNotes(await notesService.list({ archived: true }));
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const restore = async (note: Note) => {
    await notesService.setFlags({ id: note.id, isArchived: false });
    toast.success("Anotação restaurada", { description: note.title });
    await load();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <PageHeader
        title="Arquivados"
        description="Anotações arquivadas ficam fora da lista principal, mas continuam pesquisáveis."
      />

      {!notes ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="Nada arquivado"
          description="Ao arquivar uma anotação ela aparece aqui e deixa de ocupar espaço na lista principal."
        />
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div className="min-w-0 flex-1">
                <button
                  className="block max-w-full truncate text-left text-sm font-medium hover:underline"
                  onClick={() => navigate(`/notes/${note.id}`)}
                >
                  {note.title}
                </button>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {excerpt(note.content, 120) || "Anotação vazia"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Arquivada · {relativeTime(note.updatedAt)}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void restore(note)}>
                <ArchiveRestore className="size-3.5" />
                Restaurar
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Excluir permanentemente"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setDeleting(note)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir definitivamente?"
        description={`"${deleting?.title}" será removida permanentemente. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          await notesService.remove(deleting.id);
          await load();
        }}
      />
    </div>
  );
}
