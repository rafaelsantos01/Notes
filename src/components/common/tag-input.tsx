import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}

const MAX_TAGS = 12;
const MAX_LENGTH = 40;

export function TagInput({ value, onChange, placeholder, suggestions, className }: TagInputProps) {
  const [input, setInput] = React.useState("");
  const [focused, setFocused] = React.useState(false);

  const addTag = React.useCallback(
    (raw: string) => {
      const tag = raw.trim().replace(/,+$/, "");
      if (!tag || value.length >= MAX_TAGS) return;
      if (tag.length > MAX_LENGTH) return;
      if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
      onChange([...value, tag]);
    },
    [value, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
      setInput("");
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handleBlur = () => {
    setFocused(false);
    if (input.trim()) {
      addTag(input);
      setInput("");
    }
  };

  const remaining = suggestions?.filter(
    (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm shadow-sm transition-colors",
          focused && "ring-2 ring-ring"
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
          >
            {tag}
            <button
              type="button"
              className="rounded-sm p-0.5 hover:bg-primary/20"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`Remover tag ${tag}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => setFocused(true)}
          placeholder={value.length === 0 ? (placeholder ?? "Adicionar tag…") : ""}
          className="min-w-[80px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>
      {focused && remaining && remaining.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {remaining.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              className="rounded-md border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
