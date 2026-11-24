import * as React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { QuickCreateDialogs } from "./quick-create";
import { SearchPalette } from "@/features/search/search-palette";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { useThemeStore } from "@/stores/theme";
import { useProjectsStore } from "@/stores/data";
import { cmdSilent } from "@/services/api";
import { updater } from "@/services";
import type { UpdateInfo } from "@/types/domain";

export function AppShell() {
  const location = useLocation();
  const initTheme = useThemeStore((s) => s.init);
  const loadProjects = useProjectsStore((s) => s.load);

  useGlobalShortcuts();

  React.useEffect(() => {
    initTheme();
  }, [initTheme]);

  React.useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  // Verificação automática de atualizações (silenciosa) na inicialização.
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const auto = await cmdSilent<string | null>("settings_get", {
          key: "updaterAutoCheck",
        });
        if (auto === "0" || cancelled) return;
        const endpoint = await cmdSilent<string | null>("settings_get", {
          key: "updaterEndpoint",
        });
        if (!endpoint || cancelled) return;

        const info = await cmdSilent<UpdateInfo | null>("updater_check");
        if (info && !cancelled) {
          toast.info(`Atualização disponível: v${info.version}`, {
            description: "Baixe e instale a nova versão.",
            duration: 20000,
            action: {
              label: "Instalar",
              onClick: () => {
                toast.info("Baixando atualização…", {
                  description: "O aplicativo será reiniciado ao concluir.",
                });
                void updater.downloadInstall().catch(() => {});
              },
            },
          });
        }
      } catch {
        // verificação automática é silenciosa por design
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Scroll to top on navigation
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main ref={scrollRef} className="flex-1 overflow-y-auto">
            <React.Suspense fallback={null}>
              <Outlet />
            </React.Suspense>
          </main>
        </div>
      </div>

      {/* Overlays globais */}
      <QuickCreateDialogs />
      <SearchPalette />
      <Toaster position="bottom-right" richColors closeButton />
    </TooltipProvider>
  );
}

export function NotFoundRedirect() {
  return <Navigate to="/" replace />;
}
