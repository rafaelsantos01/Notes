import { Folder } from "lucide-react";
import { useProjectById } from "@/stores/data";
import { cn } from "@/lib/utils";

interface ProjectChipProps {
  projectId: string | null;
  className?: string;
}

export function ProjectChip({ projectId, className }: ProjectChipProps) {
  const project = useProjectById(projectId);
  if (!project) return null;

  return (
    <span
      className={cn(
        "inline-flex max-w-[180px] items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        className
      )}
      style={{ backgroundColor: `${project.color}1a`, color: project.color }}
      title={project.name}
    >
      <Folder className="size-3 shrink-0" />
      <span className="truncate">{project.name}</span>
    </span>
  );
}
