import * as React from "react";
import { useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  FolderKanban,
  History,
  ListTodo,
  Link2,
  Search,
  StickyNote,
  Tag,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { search as searchService } from "@/services";
import { useFocusStore, useUiStore } from "@/stores/ui";
import { formatShortDate } from "@/lib/dates";
import { excerpt } from "@/lib/text";
import type { SearchResults } from "@/types/domain";

export function SearchPalette() {
  const open = useUiStore((s) => s.searchOpen);
  const setOpen = useUiStore((s) => s.setSearchOpen);
  const requestFocus = useFocusStore((s) => s.requestFocus);
  const navigate = useNavigate();

  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResults | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Busca com debounce
  React.useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        setResults(await searchService.global(q));
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
    }
  }, [open]);

  const hasResults =
    results &&
    (results.notes.length +
      results.activities.length +
      results.projects.length +
      results.tasks.length +
      results.links.length >
      0);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[15%] z-50 w-[calc(100%-3rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-popover shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">Pesquisa global</DialogPrimitive.Title>
          <Command shouldFilter={false} loop>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Pesquisar anotações, atividades, projetos, tarefas, links e tags…"
            />
            <CommandList>
              {query.trim().length < 2 ? (
                <div className="space-y-6 p-6 text-center text-sm text-muted-foreground">
                  <Search className="mx-auto size-6 opacity-40" />
                  <p>
                    Digite pelo menos 2 caracteres para pesquisar
                    <br />
                    em todo o seu conhecimento.
                  </p>
                  <p className="flex items-center justify-center gap-1.5">
                    <Kbd>↑</Kbd>
                    <Kbd>↓</Kbd>
                    para navegar
                    <Kbd>Enter</Kbd>
                    para abrir
                    <Kbd>Esc</Kbd>
                    para fechar
                  </p>
                </div>
              ) : loading && !results ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
                  ))}
                </div>
              ) : !hasResults ? (
                <CommandEmpty>
                  Nenhum resultado para “{query.trim()}”.
                </CommandEmpty>
              ) : (
                <>
                  {results!.notes.length > 0 && (
                    <CommandGroup heading="Anotações">
                      {results!.notes.slice(0, 6).map((note) => (
                        <CommandItem
                          key={note.id}
                          value={`note-${note.id}`}
                          onSelect={() => {
                            setOpen(false);
                            navigate(`/notes/${note.id}`);
                          }}
                        >
                          <StickyNote />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{note.title}</span>
                            {note.content && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {excerpt(note.content, 80)}
                              </span>
                            )}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {results!.activities.length > 0 && (
                    <>
                      <CommandSeparator />
                      <CommandGroup heading="Diário">
                        {results!.activities.slice(0, 6).map((activity) => (
                          <CommandItem
                            key={activity.id}
                            value={`activity-${activity.id}`}
                            onSelect={() => {
                              setOpen(false);
                              requestFocus("activity", activity.id);
                              navigate("/journal");
                            }}
                          >
                            <History />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{activity.title}</span>
                              <span className="block text-xs text-muted-foreground">
                                {formatShortDate(activity.occurredAt)}
                              </span>
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}

                  {results!.projects.length > 0 && (
                    <>
                      <CommandSeparator />
                      <CommandGroup heading="Projetos">
                        {results!.projects.map((project) => (
                          <CommandItem
                            key={project.id}
                            value={`project-${project.id}`}
                            onSelect={() => {
                              setOpen(false);
                              navigate(`/projects/${project.id}`);
                            }}
                          >
                            <FolderKanban />
                            <span className="min-w-0 flex-1 truncate font-medium">{project.name}</span>
                            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}

                  {results!.tasks.length > 0 && (
                    <>
                      <CommandSeparator />
                      <CommandGroup heading="Tarefas">
                        {results!.tasks.slice(0, 6).map((task) => (
                          <CommandItem
                            key={task.id}
                            value={`task-${task.id}`}
                            onSelect={() => {
                              setOpen(false);
                              navigate("/tasks");
                            }}
                          >
                            <ListTodo />
                            <span className="min-w-0 flex-1 truncate font-medium">{task.title}</span>
                            {task.dueDate && (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatShortDate(`${task.dueDate}T12:00:00`)}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}

                  {results!.links.length > 0 && (
                    <>
                      <CommandSeparator />
                      <CommandGroup heading="Links">
                        {results!.links.slice(0, 6).map((link) => (
                          <CommandItem
                            key={link.id}
                            value={`link-${link.id}`}
                            onSelect={() => {
                              setOpen(false);
                              navigate("/links");
                            }}
                          >
                            <Link2 />
                            <span className="min-w-0 flex-1 truncate font-medium">{link.name}</span>
                            <span className="shrink-0 truncate text-xs text-muted-foreground">
                              {link.url.replace(/^https?:\/\//, "")}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}

                  {results!.tags.length > 0 && (
                    <>
                      <CommandSeparator />
                      <CommandGroup heading="Tags">
                        {results!.tags.slice(0, 8).map((tag) => (
                          <CommandItem
                            key={tag}
                            value={`tag-${tag}`}
                            onSelect={() => setQuery(tag)}
                          >
                            <Tag />
                            #{tag}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
