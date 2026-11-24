import * as React from "react";
import { listen } from "@tauri-apps/api/event";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { save, open } from "@tauri-apps/plugin-dialog";
import {
  CheckCircle2,
  Database,
  Download,
  FileJson,
  FileText,
  FolderOpen,
  HardDriveDownload,
  History,
  Loader2,
  Monitor,
  Moon,
  RefreshCw,
  RotateCcw,
  Save,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { backup, settings, updater } from "@/services";
import { useThemeStore } from "@/stores/theme";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { UpdateInfo, UpdateProgress } from "@/types/domain";

export function SettingsPage() {
  const { mode, setMode } = useThemeStore();
  const [dbPath, setDbPath] = React.useState<string | null>(null);
  const [restoring, setRestoring] = React.useState<string | false>(false);

  // Atualizações -------------------------------------------------------------
  const [appVersion, setAppVersion] = React.useState("…");
  const [endpoint, setEndpoint] = React.useState("");
  const [token, setToken] = React.useState("");
  const [autoCheck, setAutoCheck] = React.useState(true);
  const [checking, setChecking] = React.useState(false);
  const [available, setAvailable] = React.useState<UpdateInfo | null>(null);
  const [installing, setInstalling] = React.useState(false);
  const [progress, setProgress] = React.useState<{
    downloaded: number;
    total: number | null;
  } | null>(null);

  React.useEffect(() => {
    void backup.getDbPath().then(setDbPath);
    void updater.getVersion().then(setAppVersion);
    void (async () => {
      const [e, t, a] = await Promise.all([
        settings.get("updaterEndpoint"),
        settings.get("updaterToken"),
        settings.get("updaterAutoCheck"),
      ]);
      setEndpoint(e ?? "");
      setToken(t ?? "");
      setAutoCheck(a !== "0");
    })();
  }, []);

  // Progresso do download (eventos do backend)
  React.useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void listen<UpdateProgress>("updater://progress", (event) => {
      const payload = event.payload;
      if (payload.event === "progress") {
        setProgress({ downloaded: payload.downloaded, total: payload.total });
      } else if (payload.event === "started") {
        setProgress({ downloaded: 0, total: null });
      }
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const saveUpdaterConfig = async () => {
    await settings.set("updaterEndpoint", endpoint.trim());
    await settings.set("updaterToken", token.trim());
    await settings.set("updaterAutoCheck", autoCheck ? "1" : "0");
    toast.success("Configurações de atualização salvas");
  };

  const checkForUpdates = async () => {
    setChecking(true);
    setAvailable(null);
    try {
      await saveUpdaterConfig();
      const info = await updater.check();
      if (info) {
        setAvailable(info);
        toast.success(`Versão ${info.version} disponível`);
      } else {
        toast.info("Nenhuma atualização disponível", {
          description: `Você já está na versão mais recente (${appVersion}).`,
        });
      }
    } finally {
      setChecking(false);
    }
  };

  const installUpdate = async () => {
    setInstalling(true);
    setProgress({ downloaded: 0, total: null });
    toast.info("Baixando atualização…", {
      description: "O aplicativo será reiniciado ao concluir.",
    });
    await updater.downloadInstall();
  };

  const progressPercent =
    progress && progress.total ? Math.min(100, (progress.downloaded / progress.total) * 100) : null;

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
      <PageHeader title="Configurações" description="Aparência, dados, atualizações e informações." />

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

      {/* Atualizações */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <SectionTitle icon={RefreshCw} title="Atualizações" />
          <span className="text-xs text-muted-foreground">Versão atual: {appVersion}</span>
        </div>

        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="updater-endpoint">Fonte de atualização (latest.json)</Label>
            <Input
              id="updater-endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://github.com/USUARIO/REPO/releases/latest/download/latest.json"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              GitHub Releases: use o formato acima com o seu repositório.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="updater-token">Token de acesso (opcional, repo privado)</Label>
            <Input
              id="updater-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_…"
              spellCheck={false}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={autoCheck} onCheckedChange={(v) => setAutoCheck(v === true)} />
            Verificar atualizações automaticamente ao iniciar
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" onClick={() => void saveUpdaterConfig()} className="gap-2">
              <Save className="size-4" />
              Salvar
            </Button>
            <Button
              onClick={() => void checkForUpdates()}
              disabled={checking || !endpoint.trim()}
              className="gap-2"
            >
              {checking ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {checking ? "Verificando…" : "Verificar atualizações"}
            </Button>
          </div>

          {available && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    Versão {available.version} disponível
                    {available.date && (
                      <span className="text-xs font-normal text-muted-foreground">
                        · {new Date(available.date).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </p>
                  {available.notes && (
                    <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs text-muted-foreground">
                      {available.notes}
                    </p>
                  )}
                </div>
                {!installing && (
                  <Button size="sm" onClick={() => void installUpdate()} className="gap-1.5">
                    <Download className="size-3.5" />
                    Baixar e instalar
                  </Button>
                )}
              </div>

              {installing && progress && (
                <div className="mt-3 space-y-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full bg-primary transition-all",
                        progressPercent === null && "w-full animate-pulse"
                      )}
                      style={progressPercent !== null ? { width: `${progressPercent}%` } : undefined}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {progress.total
                      ? `Baixando… ${formatBytes(progress.downloaded)} de ${formatBytes(progress.total)}`
                      : `Baixando… ${formatBytes(progress.downloaded)}`}
                    <span className="block">O aplicativo será reiniciado ao concluir.</span>
                  </p>
                </div>
              )}
            </div>
          )}
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
            <dd>Notes {appVersion}</dd>
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
