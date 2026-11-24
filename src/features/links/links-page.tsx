import * as React from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { LinkDialog } from "./link-dialog";
import { links as linksService } from "@/services";
import { useProjectsStore } from "@/stores/data";
import { capitalize } from "@/lib/utils";
import type { LinkItem } from "@/types/domain";

export function LinksPage() {
  const [links, setLinks] = React.useState<LinkItem[] | null>(null);
  const [query, setQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [projectFilter, setProjectFilter] = React.useState("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LinkItem | null>(null);
  const [deleting, setDeleting] = React.useState<LinkItem | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const projects = useProjectsStore((s) => s.projects);

  const load = React.useCallback(async () => {
    setLinks(await linksService.list({}));
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const categories = React.useMemo(() => {
    if (!links) return [];
    return Array.from(new Set(links.map((l) => l.category))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [links]);

  const grouped = React.useMemo(() => {
    if (!links) return null;
    const q = query.trim().toLowerCase();
    const filtered = links.filter((link) => {
      if (categoryFilter !== "all" && link.category !== categoryFilter) return false;
      if (projectFilter !== "all" && link.projectId !== projectFilter) return false;
      if (!q) return true;
      return (
        link.name.toLowerCase().includes(q) ||
        link.url.toLowerCase().includes(q) ||
        link.description.toLowerCase().includes(q) ||
        link.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
    const map = new Map<string, LinkItem[]>();
    for (const link of filtered) {
      const bucket = map.get(link.category);
      if (bucket) bucket.push(link);
      else map.set(link.category, [link]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [links, query, categoryFilter, projectFilter]);

  const copyUrl = async (link: LinkItem) => {
    await navigator.clipboard.writeText(link.url);
    setCopiedId(link.id);
    toast.success("URL copiada", { description: link.url });
    setTimeout(() => setCopiedId(null), 1500);
  };

  const open = async (link: LinkItem) => {
    try {
      await openUrl(link.url);
    } catch {
      toast.error("Não foi possível abrir o link");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <PageHeader
        title="Links & Referências"
        description="Acessos, ambientes, documentações e ferramentas importantes."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Novo link
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
            placeholder="Filtrar links…"
            className="pl-8"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {capitalize(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-44">
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
      </div>

      {!grouped ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        !links || links.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="Nenhum link salvo"
            description="Centralize GitLab, ambientes DEV/HML/PRD, documentações, repositórios e ferramentas."
            action={
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="size-4" />
                Adicionar link
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Search}
            title="Nenhum resultado"
            description="Nenhum link corresponde aos filtros atuais."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setCategoryFilter("all");
                  setProjectFilter("all");
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        )
      ) : (
        grouped.map(([category, categoryLinks]) => (
          <section key={category}>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {capitalize(category)} · {categoryLinks.length}
            </h3>
            <ul className="space-y-1.5">
              {categoryLinks.map((link) => (
                <li
                  key={link.id}
                  className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-all hover:shadow-sm"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Globe className="size-4 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{link.name}</p>
                      {link.isFavorite && (
                        <Star className="size-3 shrink-0 fill-amber-500 text-amber-500" aria-label="Favorito" />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <ProjectChip projectId={link.projectId} />
                      {link.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Abrir no navegador"
                      title="Abrir no navegador"
                      onClick={() => void open(link)}
                    >
                      <ExternalLink />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Copiar URL"
                      title="Copiar URL"
                      onClick={() => void copyUrl(link)}
                    >
                      {copiedId === link.id ? <Check className="text-emerald-500" /> : <Copy />}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                          aria-label="Ações do link"
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(link);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            void linksService
                              .update(link.id, {
                                name: link.name,
                                url: link.url,
                                description: link.description,
                                category: link.category,
                                projectId: link.projectId,
                                isFavorite: !link.isFavorite,
                                tags: link.tags,
                              })
                              .then(() => load())
                          }
                        >
                          <Star />
                          {link.isFavorite ? "Remover dos favoritos" : "Favoritar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onClick={() => setDeleting(link)}>
                          <Trash2 />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <LinkDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        link={editing}
        onSaved={() => void load()}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir link?"
        description={`"${deleting?.name}" será removido permanentemente.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          await linksService.remove(deleting.id);
          await load();
        }}
      />
    </div>
  );
}
