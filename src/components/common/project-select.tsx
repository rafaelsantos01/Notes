import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";import { useProjectsStore } from "@/stores/data";
import { PROJECT_STATUSES } from "@/components/common/badges";

const NONE = "__none__";

interface ProjectSelectProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function ProjectSelect({ value, onChange, placeholder, className, id }: ProjectSelectProps) {
  const projects = useProjectsStore((s) => s.projects);

  return (
    <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
      <SelectTrigger id={id} className={className} aria-label="Projeto relacionado">
        <SelectValue placeholder={placeholder ?? "Sem projeto"} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Projeto</SelectLabel>
          <SelectItem value={NONE}>Sem projeto</SelectItem>
          {projects
            .filter((p) => p.status !== "completed")
            .map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="inline-flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </span>
              </SelectItem>
            ))}
          {projects.filter((p) => p.status === "completed").length > 0 && (
            <SelectGroup>
              <SelectLabel>{PROJECT_STATUSES.find((s) => s.value === "completed")?.label}</SelectLabel>
              {projects
                .filter((p) => p.status === "completed")
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
            </SelectGroup>
          )}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
