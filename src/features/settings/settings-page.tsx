import * as React from "react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { save, open } from "@tauri-apps/plugin-dialog";
import {
  Database,
  Download,
  FileJson,
  FileText,
  FolderOpen,
  HardDriveDownload,
  History,
  Monitor,
  Moon,
  RotateCcw,
  Save,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { backup } from "@/services";
import { useThemeStore } from "@/stores/theme";
import { cn } from "@/lib/utils";

export function SettingsPage() {
  const { mode, setMode } = useThemeStore();
  const [dbPath, setDbPath] = React.useState<string | null>(null);
  const [restoring, setRestoring] = React.useState<string | false>(false);

  React.useEffect(() => {
    void backup.getDbPath().then(setDbPath);
  }, []);

  const handleBackup = async () => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const target = await save({
      title: "Salvar backup",
      defaultPath: `notes-backup-${stamp}.db`,
      filters: [{ name: "Banco de dados SQLite", extensions: ["db"] }],
    });
    if (!target) return;
    await backup.create(target);
    toast.success("Backup criado", { description: target });
  };

  const handleRestore = async (source: string) => {
    await backup.restore(source);
    toast.success("Backup restaurado", {
      description: "Os dados foram recarregados a partir do backup.",
    });
    setTimeout(() => window.location.reload(), 900);
  };

  const pickFolder = async (title: string) => {
    const dir = await open({ title, directory: true });
    return typeof dir === "string" ? dir : null;
  };

  const handleExportNotes = async () => {
    const dir = await pickFolder("Exportar anotações em Markdown");
    if (!dir) return;
    const count = await backup.exportNotesMarkdown(dir);
    toast.success(`${count} anotação(ões) exportada(s)`, { description: dir });
  };

  const handleExportActivities = async () => {
    const dir = await pickFolder("Exportar diário em Markdown");
    if (!dir) return;
    const count = await backup.exportActivitiesMarkdown(dir);
    toast.success(`${count} registro(s) exportado(s)`, { description: dir });
  };

  const handleExportJson = async () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const target = await save({
      title: "Exportar dados em JSON",
      defaultPath: `notes-export-${stamp}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!target) return;
    await backup.exportJson(target);
    toast.success("Dados exportados", { description: target });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <PageHeader title="Configurações" description="Aparência, dados e informações do aplicativo." />

      {/* Aparência */}
      <Card className="p-5">
        <SectionTitle icon={Monitor} title="Aparência" />
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg border p-1" role="radiogroup" aria-label="Tema">
          {(
            [
              { value: "light", label: "Claro", icon: Sun },
              { value: "dark", label: "Escuro", icon: Moon },
              { value: "system", label: "Sistema", icon: Monitor },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                mode === value
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Dados */}
      <Card className="p-5">
        <SectionTitle icon={Database} title="Backup e restauração" />
        <p className="mt-1 text-sm text-muted-foreground">
          Seus dados ficam em um único arquivo SQLite local. Faça backups regularmente.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" className="justify-start gap-2" onClick={() => void handleBackup()}>
            <Save className="size-4" />
            Criar backup agora
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={async () => {
              const source = await open({
                title: "Selecionar backup para restaurar",
                filters: [{ name: "Banco de dados SQLite", extensions: ["db"] }],
                multiple: false,
                directory: false,
              });
              if (typeof source === "string") setRestoring(source);
            }}
          >
            <RotateCcw className="size-4" />
            Restaurar backup…
          </Button>
        </div>

        <Separator className="my-4" />

        <SectionTitle icon={Download} title="Exportação" />
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Button variant="outline" className="justify-start gap-2" onClick={() => void handleExportNotes()}>
            <FileText className="size-4" />
            Notas (MD)
          </Button>
          <Button variant="outline" className="justify-start gap-2" onClick={() => void handleExportActivities()}>
            <History className="size-4" />
            Diário (MD)
          </Button>
          <Button variant="outline" className="justify-start gap-2" onClick={() => void handleExportJson()}>
            <FileJson className="size-4" />
            Tudo (JSON)
          </Button>
        </div>
      </Card>

      {/* Sobre */}
      <Card className="p-5">
        <SectionTitle icon={HardDriveDownload} title="Armazenamento" />
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Banco de dados</dt>
            <dd className="min-w-0 truncate font-mono text-xs" title={dbPath ?? ""}>
              {dbPath ?? "…"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Versão</dt>
            <dd>Notes 0.1.0</dd>
          </div>
        </dl>
        {dbPath && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 gap-2 text-muted-foreground"
            onClick={() => void revealItemInDir(dbPath)}
          >
            <FolderOpen className="size-4" />
            Abrir pasta de dados
          </Button>
        )}
      </Card>

      <ConfirmDialog
        open={restoring !== false}
        onOpenChange={(open) => !open && setRestoring(false)}
        title="Restaurar backup?"
        description="O banco atual será substituído pelo arquivo selecionado. Recomenda-se criar um backup antes. O aplicativo será recarregado."
        confirmLabel="Restaurar"
        destructive
        onConfirm={async () => {
          if (typeof restoring !== "string") return;
          await handleRestore(restoring);
        }}
      />
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold">
      <Icon className="size-4 text-muted-foreground" />
      {title}
    </h3>
  );
}
