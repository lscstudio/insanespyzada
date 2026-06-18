import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Library,
  Menu,
  Moon,
  Plus,
  Settings,
  Sun,
  LogOut,
  Sparkles,
  User as UserIcon,
} from "lucide-react";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AddLibraryModal } from "@/components/add-library-modal";
import { signOut } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { to: "/bibliotecas", label: "Bibliotecas", icon: Library, exact: false },
  { to: "/perfil", label: "Perfil", icon: UserIcon, exact: false },
  { to: "/configuracoes", label: "Configurações", icon: Settings, exact: false },
];

function SidebarContent({ collapsed, onItemClick }: { collapsed: boolean; onItemClick?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex h-16 items-center gap-2 px-5", collapsed && "justify-center px-2")}>
        <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-primary/30 bg-primary/10 p-[2px]">
          <img src="/insanespy-logo.png" alt="InsaneSpy" className="h-full w-full object-cover" />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">InsaneSpy</div>
            <div className="text-[11px] text-muted-foreground">Você está sendo observado</div>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onItemClick}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                collapsed && "justify-center px-2",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-y-1 left-0 w-[2px] rounded-r-full bg-foreground"
                />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="m-3 rounded-xl border border-border/50 bg-card/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
          Bibliotecas novas são mineradas na hora.
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await signOut();
    toast.success("Você saiu");
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-border/60 transition-[width] duration-300 md:block",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-r border-border/60 bg-sidebar p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <SidebarContent collapsed={false} onItemClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 md:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              onClick={() => setCollapsed((c) => !c)}
              aria-label="Recolher sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="hidden flex-1 md:block">
              <h1 className="text-sm font-medium text-muted-foreground">
                Você está sendo observado
              </h1>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Adicionar biblioteca</span>
                <span className="sm:hidden">Nova</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
                <AnimatePresence mode="wait" initial={false}>
                  {theme === "dark" ? (
                    <motion.span
                      key="moon"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Moon className="h-4 w-4" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="sun"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sun className="h-4 w-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
              <Button variant="ghost" size="icon" aria-label="Sair" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      <AddLibraryModal open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
