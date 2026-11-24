import { useLocation } from "react-router-dom";
import { ChevronDown, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUiStore, type QuickCreateType } from "@/stores/ui";

const TITLES: { match: (pathname: string) => boolean; title: string }[] = [
  { match: (p) => p === "/", title: "Dashboard" },
  { match: (p) => p.startsWith("/journal"), title: "Diário" },
  { match: (p) => p.startsWith("/notes"), title: "Anotações" },
  { match: (p) => p.startsWith("/projects"), title: "Projetos" },
  { match: (p) => p.startsWith("/tasks"), title: "Tarefas" },
  { match: (p) => p.startsWith("/links"), title: "Links & Referências" },
  { match: (p) => p.startsWith("/calendar"), title: "Calendário" },
  { match: (p) => p.startsWith("/favorites"), title: "Favoritos" },
  { match: (p) => p.startsWith("/archive"), title: "Arquivados" },
  { match: (p) => p.startsWith("/settings"), title: "Configurações" },
];

const CREATE_OPTIONS: { type: QuickCreateType; label: string; shortcut: string }[] = [
  { type: "note", label: "Nova anotação", shortcut: "Ctrl+N" },
  { type: "activity", label: "Novo registro diário", shortcut: "Ctrl+D" },
  { type: "task", label: "Nova tarefa", shortcut: "Ctrl+T" },
  { type: "project", label: "Novo projeto", shortcut: "" },
  { type: "link", label: "Novo link", shortcut: "" },
  { type: "reminder", label: "Novo lembrete", shortcut: "" },
];

export function Header() {
  const { pathname } = useLocation();
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const openQuickCreate = useUiStore((s) => s.openQuickCreate);

  const title = TITLES.find((t) => t.match(pathname))?.title ?? "Notes";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
      <h2 className="text-sm font-semibold">{title}</h2>

      <div className="flex-1" />

      {/* Busca global */}
      <button
        onClick={() => setSearchOpen(true)}
        className="hidden h-9 w-64 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Pesquisar…</span>
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </button>
      <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setSearchOpen(true)}>
        <Search />
      </Button>

      {/* Criação rápida */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Novo
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Criar</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {CREATE_OPTIONS.map((option) => (
            <DropdownMenuItem key={option.type} onClick={() => openQuickCreate(option.type)}>
              <span className="flex-1">{option.label}</span>
              {option.shortcut && <Kbd className="ml-auto">{option.shortcut.replace("Ctrl+", "")}</Kbd>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
