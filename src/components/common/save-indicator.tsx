import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveState = "saved" | "saving" | "dirty" | "error";

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Salvando…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="size-3.5 text-emerald-500" />
        Salvo
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-destructive">Erro ao salvar</span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground")}>
      <span className="size-1.5 rounded-full bg-muted-foreground/40" />
      Não salvo
    </span>
  );
}
