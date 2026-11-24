import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Archive,
  Bold,
  CheckSquare,
  Code,
  Eye,
  Heading2,
  Italic,
  List,
  Loader2,
  Pencil,
  Pin,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Markdown } from "@/components/common/markdown";
import { SaveIndicator, type SaveState } from "@/components/common/save-indicator";
import { TagInput } from "@/components/common/tag-input";
import { ProjectSelect } from "@/components/common/project-select";
import { notes as notesService } from "@/services";
import { relativeTime } from "@/lib/dates";
import type { Note } from "@/types/domain";
import { cn } from "@/lib/utils";

type EditorMode = "edit" | "preview";

interface Draft {
  title: string;
  content: string;
  projectId: string | null;
  tags: string[];
}

const AUTOSAVE_DELAY = 700;

export function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [note, setNote] = React.useState<Note | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saveState, setSaveState] = React.useState<SaveState>("saved");
  const [mode, setMode] = React.useState<EditorMode>("edit");
  const [deleting, setDeleting] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const savedRef = React.useRef<Draft | null>(null);
  const timerRef = React.useRef<number | undefined>(undefined);
  const savingRef = React.useRef(false);
  const draftRef = React.useRef<Draft | null>(null);

  // Carrega a nota
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await notesService.get(id!);
        if (cancelled) return;
        const initial: Draft = {
          title: loaded.title,
          content: loaded.content,
          projectId: loaded.projectId,
          tags: loaded.tags,
        };
        savedRef.current = initial;
        draftRef.current = initial;
        setNote(loaded);
        setDraft(initial);
      } catch {
        if (!cancelled) setNotFound(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const persist = React.useCallback(async () => {
    const current = draftRef.current;
    if (!current || !id || savingRef.current) return;
    savingRef.current = true;
    setSaveState("saving");
    try {
      const updated = await notesService.update(id, {
        title: current.title.trim() || "Sem título",
        content: current.content,
        projectId: current.projectId,
        tags: current.tags,
      });
      savedRef.current = current;
      setNote(updated);
      setSaveState("saved");
    } catch {
      setSaveState("error");
      // tenta novamente em 2s
      timerRef.current = window.setTimeout(() => void persist(), 2000);
    } finally {
      savingRef.current = false;
    }
  }, [id]);

  // Autosave com debounce
  React.useEffect(() => {
    if (!draft) return;
    draftRef.current = draft;
    if (JSON.stringify(draft) === JSON.stringify(savedRef.current)) return;

    setSaveState("dirty");
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void persist(), AUTOSAVE_DELAY);
    return () => window.clearTimeout(timerRef.current);
  }, [draft, persist]);

  // Ctrl+S = salvar agora
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        window.clearTimeout(timerRef.current);
        void persist();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [persist]);

  const updateDraft = (patch: Partial<Draft>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  // ------------------------------------------------------------------
  // Ferramentas de Markdown
  // ------------------------------------------------------------------
  const applyToSelection = React.useCallback(
    (before: string, after = "") => {
      const el = textareaRef.current;
      if (!el || !draft) return;
      const { selectionStart, selectionEnd, value } = el;
      const selected = value.slice(selectionStart, selectionEnd);
      const next =
        value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
      updateDraft({ content: next });
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(selectionStart + before.length, selectionEnd + before.length);
      });
    },
    [draft]
  );

  const applyToLines = React.useCallback(
    (prefix: string) => {
      const el = textareaRef.current;
      if (!el || !draft) return;
      const { selectionStart, selectionEnd, value } = el;
      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const lineEnd = value.indexOf("\n", selectionEnd);
      const block = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);
      const prefixed = block
        .split("\n")
        .map((line) => (line.startsWith(prefix) ? line.slice(prefix.length) : prefix + line))
        .join("\n");
      const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd === -1 ? value.length : lineEnd);
      updateDraft({ content: next });
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(lineStart, lineStart + prefixed.length);
      });
    },
    [draft]
  );

  if (notFound) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm font-medium">Anotação não encontrada</p>
        <Button variant="outline" onClick={() => navigate("/notes")}>
          <ArrowLeft className="size-4" />
          Voltar para anotações
        </Button>
      </div>
    );
  }

  if (!draft || !note) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col px-6 py-5">
      {/* Topo */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate("/notes")} aria-label="Voltar">
          <ArrowLeft />
        </Button>
        <div className="flex-1" />
        <SaveIndicator state={saveState} />
        <span className="hidden text-xs text-muted-foreground sm:inline">
          editada {relativeTime(note.updatedAt)}
        </span>

        <div className="flex items-center rounded-md border p-0.5">
          <button
            onClick={() => setMode("edit")}
            className={cn(
              "flex items-center gap-1 rounded-[5px] px-2 py-1 text-xs font-medium transition-colors",
              mode === "edit" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
            aria-label="Modo edição"
          >
            <Pencil className="size-3.5" />
            Editar
          </button>
          <button
            onClick={() => setMode("preview")}
            className={cn(
              "flex items-center gap-1 rounded-[5px] px-2 py-1 text-xs font-medium transition-colors",
              mode === "preview" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
            aria-label="Modo visualização"
          >
            <Eye className="size-3.5" />
            Visualizar
          </button>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={note.isFavorite ? "Remover dos favoritos" : "Favoritar"}
          className={note.isFavorite ? "text-amber-500 hover:text-amber-500" : ""}
          onClick={() =>
            void notesService.setFlags({ id: note.id, isFavorite: !note.isFavorite }).then(setNote)
          }
        >
          <Star className={cn(note.isFavorite && "fill-current")} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={note.isPinned ? "Desafixar" : "Fixar"}
          className={note.isPinned ? "text-primary" : ""}
          onClick={() =>
            void notesService.setFlags({ id: note.id, isPinned: !note.isPinned }).then(setNote)
          }
        >
          <Pin className={cn(note.isPinned && "fill-current")} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Arquivar"
          onClick={() => {
            void notesService.setFlags({ id: note.id, isArchived: true }).then(() => {
              toast.success("Anotação arquivada");
              navigate("/notes");
            });
          }}
        >
          <Archive />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Excluir"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => setDeleting(true)}
        >
          <Trash2 />
        </Button>
      </div>

      {/* Título */}
      <input
        value={draft.title}
        onChange={(e) => updateDraft({ title: e.target.value })}
        placeholder="Título da anotação…"
        className="mt-4 w-full bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50"
      />

      {/* Meta */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-b pb-4">
        <ProjectSelect
          value={draft.projectId}
          onChange={(v) => updateDraft({ projectId: v })}
          className="h-8 w-48 text-xs"
        />
        <div className="min-w-48 flex-1">
          <TagInput value={draft.tags} onChange={(tags) => updateDraft({ tags })} />
        </div>
      </div>

      {/* Toolbar markdown */}
      {mode === "edit" && (
        <div className="flex items-center gap-0.5 py-2">
          <ToolbarButton icon={Bold} label="Negrito" onClick={() => applyToSelection("**", "**")} />
          <ToolbarButton icon={Italic} label="Itálico" onClick={() => applyToSelection("*", "*")} />
          <ToolbarButton icon={Heading2} label="Título" onClick={() => applyToLines("## ")} />
          <ToolbarButton icon={List} label="Lista" onClick={() => applyToLines("- ")} />
          <ToolbarButton icon={CheckSquare} label="Checklist" onClick={() => applyToLines("- [ ] ")} />
          <ToolbarButton icon={Code} label="Código" onClick={() => applyToSelection("`", "`")} />
        </div>
      )}

      {/* Conteúdo */}
      {mode === "edit" ? (
        <textarea
          ref={textareaRef}
          value={draft.content}
          onChange={(e) => updateDraft({ content: e.target.value })}
          placeholder="Escreva em Markdown…"
          spellCheck={false}
          className="min-h-0 w-full flex-1 resize-none bg-transparent py-2 font-mono text-[13.5px] leading-relaxed outline-none placeholder:text-muted-foreground/50"
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto py-3">
          {draft.content.trim() ? (
            <Markdown content={draft.content} className="text-[14px]" />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nada para visualizar ainda.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Excluir anotação?"
        description={`"${note.title}" será removida permanentemente.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          await notesService.remove(note.id);
          navigate("/notes");
        }}
      />
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon className="size-3.5" />
    </Button>
  );
}
