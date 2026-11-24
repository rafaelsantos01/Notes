import * as React from "react";
import { Link } from "react-router-dom";
import { FolderKanban, MoreHorizontal, Pencil, Plus, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ProjectStatusBadge } from "@/components/common/badges";
import { ProjectDialog } from "./project-dialog";
import { projects as projectsService } from "@/services";
import { useProjectsStore } from "@/stores/data";
import { relativeTime } from "@/lib/dates";
import type { Project } from "@/types/domain";

export function ProjectsPage() {
  const { projects, load, loading, loaded } = useProjectsStore();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Project | null>(null);
  const [deleting, setDeleting] = React.useState<Project | null>(null);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <PageHeader
        title="Projetos"
        description="Organize anotações, tarefas, registros e links por contexto."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-4" />
            Novo projeto
          </Button>
        }
      />

      {loading && !loaded ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum projeto ainda"
          description="Crie projetos para agrupar tudo que pertence a um mesmo contexto — cliente, produto ou iniciativa."
          action={
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Criar projeto
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => setEditing(project)}
              onDelete={() => setDeleting(project)}
            />
          ))}
        </div>
      )}

      <ProjectDialog
        open={createOpen || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditing(null);
          }
        }}
        project={editing}
        onSaved={() => void load(true)}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir projeto?"
        description={`"${deleting?.name}" será removido. Anotações, tarefas e registros vinculados serão desvinculados, mas mantidos.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          await projectsService.remove(deleting.id);
          await load(true);
          toast.success("Projeto excluído");
        }}
      />
    </div>
  );

  function ProjectCard({
    project,
    onEdit,
    onDelete,
  }: {
    project: Project;
    onEdit: () => void;
    onDelete: () => void;
  }) {
    return (
      <Card className="group relative overflow-hidden">
        <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: project.color }} />
        <Link to={`/projects/${project.id}`} className="block p-4 pt-5">
          <h3 className="text-sm font-semibold leading-snug">{project.name}</h3>
          {project.description ? (
            <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{project.description}</p>
          ) : (
            <p className="mt-1 text-[13px] italic text-muted-foreground/60">Sem descrição</p>
          )}

          <div className="mt-3">
            <ProjectStatusBadge status={project.status} />
          </div>

          <div className="mt-3 flex items-center gap-3 border-t pt-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <StickyNote className="size-3" />
              {project.noteCount} nota{project.noteCount === 1 ? "" : "s"}
            </span>
            <span>{project.pendingTaskCount} tarefa(s) pendente(s)</span>
            <span className="ml-auto">{relativeTime(project.updatedAt)}</span>
          </div>
        </Link>

        <div className="absolute right-2 top-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                aria-label="Ações do projeto"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  onEdit();
                }}
              >
                <Pencil />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                onClick={(e) => {
                  e.preventDefault();
                  onDelete();
                }}
              >
                <Trash2 />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    );
  }
}
