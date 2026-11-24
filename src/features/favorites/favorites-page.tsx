import * as React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Link2, Pin, Star, StickyNote } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ProjectChip } from "@/components/common/project-chip";
import { links as linksService, notes as notesService } from "@/services";
import { relativeTime } from "@/lib/dates";
import { excerpt } from "@/lib/text";

export function FavoritesPage() {
  const [notes, setNotes] = React.useState<Awaited<ReturnType<typeof notesService.list>> | null>(null);
  const [links, setLinks] = React.useState<Awaited<ReturnType<typeof linksService.list>> | null>(null);

  React.useEffect(() => {
    void notesService.list({ favorite: true }).then(setNotes);
    void linksService.list({}).then(setLinks);
  }, []);

  const pinned = notes?.filter((n) => n.isPinned) ?? [];
  const favorited = notes?.filter((n) => !n.isPinned) ?? [];
  const favoriteLinks = links?.filter((l) => l.isFavorite) ?? [];

  const isEmpty = notes && links && pinned.length === 0 && favorited.length === 0 && favoriteLinks.length === 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <PageHeader
        title="Favoritos"
        description="Anotações fixadas, favoritadas e links marcados com estrela."
      />

      {isEmpty ? (
        <EmptyState
          icon={Star}
          title="Nada favoritado ainda"
          description="Use a estrela para favoritar anotações e links, ou o alfinete para fixar anotações importantes no topo."
        />
      ) : (
        <>
          {pinned.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Pin className="size-4 text-primary" />
                Fixadas
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {pinned.map((note) => (
                  <NoteTile key={note.id} id={note.id} title={note.title} content={note.content} updatedAt={note.updatedAt} projectId={note.projectId} />
                ))}
              </div>
            </section>
          )}

          {favorited.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Star className="size-4 fill-amber-500 text-amber-500" />
                Anotações favoritas
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {favorited.map((note) => (
                  <NoteTile key={note.id} id={note.id} title={note.title} content={note.content} updatedAt={note.updatedAt} projectId={note.projectId} />
                ))}
              </div>
            </section>
          )}

          {favoriteLinks.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Link2 className="size-4" />
                Links favoritos
              </h2>
              <ul className="space-y-1.5">
                {favoriteLinks.map((link) => (
                  <li
                    key={link.id}
                    className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Link2 className="size-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{link.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                    </div>
                    <ProjectChip projectId={link.projectId} />
                    <button
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label="Abrir link"
                      onClick={() => void openUrl(link.url)}
                    >
                      <ExternalLink className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function NoteTile({
  id,
  title,
  content,
  updatedAt,
  projectId,
}: {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  projectId: string | null;
}) {
  return (
    <Link to={`/notes/${id}`}>
      <Card className="h-full p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start gap-2">
          <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <h3 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h3>
        </div>
        <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
          {excerpt(content, 140) || <span className="italic opacity-60">Anotação vazia…</span>}
        </p>
        <div className="mt-3 flex items-center gap-2 border-t pt-2.5">
          <ProjectChip projectId={projectId} />
          <span className="ml-auto text-[11px] text-muted-foreground">{relativeTime(updatedAt)}</span>
        </div>
      </Card>
    </Link>
  );
}
