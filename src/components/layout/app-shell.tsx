import * as React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { QuickCreateDialogs } from "./quick-create";
import { SearchPalette } from "@/features/search/search-palette";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { useThemeStore } from "@/stores/theme";
import { useProjectsStore } from "@/stores/data";

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
