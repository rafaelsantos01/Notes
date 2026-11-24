import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Archive, MoreHorizontal, Pin, PinOff, Plus, Search, Star, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ProjectChip } from "@/components/common/project-chip";
import { NoteDialog } from "./note-dialog";
import { notes as notesService } from "@/services";
import { useProjectsStore } from "@/stores/data";
import { relativeTime } from "@/lib/dates";
import { excerpt } from "@/lib/text";
import type { Note } from "@/types/domain";
import { cn } from "@/lib/utils";

type SortMode = "updated" | "created" | "title";

export function NotesPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = React.useState<Note[] | null>(null);
  const [query, setQuery] = React.useState("");
  const [projectFilter, setProjectFilter] = React.useState<string>("all");
  const [sort, setSort] = React.useState<SortMode>("updated");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Note | null>(null);
  const projects = useProjectsStore((s) => s.projects);

  const load = React.useCallback(async () => {
    setNotes(await notesService.list({ archived: false }));
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = React.useMemo(() => {
    if (!notes) return null;
    const q = query.trim().toLowerCase();
    let list = notes.filter((note) => {
      if (projectFilter !== "all" && note.projectId !== projectFilter) return false;
      if (!q) return true;
      return (
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q) ||
        note.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
    list = list.slice().sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (sort === "title") return a.title.localeCompare(b.title, "pt-BR");
      if (sort === "created") return b.createdAt.localeCompare(a.createdAt);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return list;
  }, [notes, query, projectFilter, sort]);

  const toggleFlag = async (note: Note, flag: "isFavorite" | "isPinned") => {
    const updated = await notesService.setFlags({ id: note.id, [flag]: !note[flag] });
    setNotes((prev) => prev?.map((n) => (n.id === updated.id ? updated : n)) ?? null);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <PageHeader
        title="Anotações"
        description="Suas anotações livres em Markdown, com tags, projetos e favoritos."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-4" />
            Nova anotação
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar anotações…"
            className="pl-8"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Editadas recentemente</SelectItem>
            <SelectItem value="created">Criadas recentemente</SelectItem>
            <SelectItem value="title">Por título</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!filtered ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        !notes || notes.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title="Nenhuma anotação ainda"
            description="Crie sua primeira anotação em Markdown — ideias, decisões, documentação e tudo que precisar lembrar."
            action={
              <Button variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Criar anotação
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Search}
            title="Nenhum resultado"
            description="Nenhuma anotação corresponde aos filtros atuais."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setProjectFilter("all");
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onOpen={() => navigate(`/notes/${note.id}`)}
              onToggleFavorite={() => void toggleFlag(note, "isFavorite")}
              onTogglePin={() => void toggleFlag(note, "isPinned")}
              onArchive={() =>
                void notesService
                  .setFlags({ id: note.id, isArchived: true })
                  .then(() => load())
              }
              onDelete={() => setDeleting(note)}
            />
          ))}
        </div>
      )}

      <NoteDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={(n) => navigate(`/notes/${n.id}`)} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir anotação?"
        description={`"${deleting?.title}" será removida permanentemente. Considere arquivar se quiser manter o histórico.`}
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

// ---------------------------------------------------------------------------

function NoteCard({
  note,
  onOpen,
  onToggleFavorite,
  onTogglePin,
  onArchive,
  onDelete,
}: {
  note: Note;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onTogglePin: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="group relative flex cursor-pointer flex-col p-4 transition-all hover:-translate-y-0.5 hover:shadow-md" onClick={onOpen}>
      {note.isPinned && (
        <Pin className="absolute right-3 top-3 size-3.5 fill-primary text-primary" aria-label="Fixada" />
      )}
      <h3 className={cn("pr-6 text-sm font-medium leading-snug", note.isPinned && "pr-8")}>
        {note.title}
      </h3>
      <p className="mt-1.5 line-clamp-4 min-h-10 flex-1 text-[13px] leading-relaxed text-muted-foreground">
        {excerpt(note.content) || <span className="italic opacity-60">Anotação vazia…</span>}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <ProjectChip projectId={note.projectId} />
        {note.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            #{tag}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t pt-2.5">
        <span className="text-[11px] text-muted-foreground">{relativeTime(note.updatedAt)}</span>
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleFavorite}
            aria-label={note.isFavorite ? "Remover dos favoritos" : "Favoritar"}
            className={note.isFavorite ? "text-amber-500 hover:text-amber-500" : ""}
          >
            <Star className={cn(note.isFavorite && "fill-current")} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Mais ações">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onTogglePin}>
                {note.isPinned ? <PinOff /> : <Pin />}
                {note.isPinned ? "Desafixar" : "Fixar no topo"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Archive />
                Arquivar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={onDelete}>
                <Trash2 />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
