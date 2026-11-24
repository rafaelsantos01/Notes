import * as React from "react";
import { NavLink } from "react-router-dom";
import {
  Archive,
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  Link2,
  ListTodo,
  NotebookPen,
  Settings,
  StickyNote,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/journal", label: "Diário", icon: NotebookPen },
  { to: "/notes", label: "Anotações", icon: StickyNote },
  { to: "/projects", label: "Projetos", icon: FolderKanban },
  { to: "/tasks", label: "Tarefas", icon: ListTodo },
  { to: "/links", label: "Links", icon: Link2 },
  { to: "/calendar", label: "Calendário", icon: CalendarDays },
];

const SECONDARY_ITEMS = [
  { to: "/favorites", label: "Favoritos", icon: Star },
  { to: "/archive", label: "Arquivados", icon: Archive },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
          <StickyNote className="size-4 text-white" />
        </div>
        <div className="leading-tight">
          <span className="text-sm font-semibold tracking-tight">Notes</span>
          <span className="block text-[10px] text-muted-foreground">Personal Knowledge Manager</span>
        </div>
      </div>

      {/* Navegação principal */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.to} {...item} />
        ))}

        <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Biblioteca
        </div>
        {SECONDARY_ITEMS.map((item) => (
          <SidebarLink key={item.to} {...item} />
        ))}
      </nav>

      {/* Configurações */}
      <div className="border-t p-2">
        <SidebarLink to="/settings" label="Configurações" icon={Settings} />
      </div>
    </aside>
  );
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          isActive && "bg-accent text-accent-foreground"
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </NavLink>
  );
}
