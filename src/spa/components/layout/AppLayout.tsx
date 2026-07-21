import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAdminCheck } from "../../lib/admin";
import {
  Radar,
  LibraryBig,
  Layers,
  CreditCard,
  User,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  Zap,
  Menu,
  X,
  Shield,
  Settings,
} from "lucide-react";
import { useStore } from "../../lib/store";
import { PLANS } from "../../lib/plans";
import { NotificationsBell } from "../NotificationsBell";
import { QuotaBar } from "../ui";
import { MecanismosTree } from "../MecanismosTree";

const NAV_BASE = [
  { to: "/", label: "Visão geral", icon: Radar, end: true },
  { to: "/bibliotecas", label: "Bibliotecas", icon: LibraryBig },
  { to: "/swipe", label: "Swipe", icon: Layers },
  { to: "/assinatura", label: "Assinatura", icon: CreditCard },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

const NAV_ITEMS = NAV_BASE as ReadonlyArray<{
  to: string;
  label: string;
  icon: typeof Radar;
  end?: boolean;
}>;

const ADMIN_ITEM = { to: "/admin", label: "Admin", icon: Shield };

function UserMenu() {
  const { session, signOut, plan } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!session) return null;
  const initials = session.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center border border-brand bg-brand text-xs font-extrabold text-white dark:border-brand-bright dark:bg-brand-bright"
        title={session.email}
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-60 border border-line bg-card shadow-xl dark:border-dline dark:bg-dcard">
          <div className="border-b border-line px-4 py-3 dark:border-dline">
            <div className="text-xs font-bold uppercase tracking-wider">{session.name}</div>
            <div className="mt-0.5 truncate text-[11px] text-ink-3 dark:text-dink-3">
              {session.email}
            </div>
            <div className="mt-2 inline-flex items-center gap-1 border border-brand px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-brand dark:border-brand-bright dark:text-brand-bright">
              <Zap size={9} /> {PLANS[plan].name}
            </div>
          </div>
          {[
            { to: "/configuracoes", label: "Configurações", icon: Settings },
            { to: "/assinatura", label: "Assinatura", icon: CreditCard },
          ].map((i) => (
            <Link
              key={i.to}
              to={i.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-ink-2 hover:bg-brand-ghost hover:text-brand dark:text-dink-2 dark:hover:text-brand-bright"
            >
              <i.icon size={13} /> {i.label}
            </Link>
          ))}
          <button
            onClick={() => {
              signOut();
              navigate("/auth");
            }}
            className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-red-500 hover:bg-red-500/5 dark:border-dline"
          >
            <LogOut size={13} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { plan, libraries } = useStore();
  const { isAdmin } = useAdminCheck();
  const p = PLANS[plan];
  const items = useMemo(() => {
    const list = [...NAV_ITEMS];
    if (isAdmin) list.push(ADMIN_ITEM as never);
    return list;
  }, [isAdmin]);
  return (
    <div className="flex h-full flex-col">
      {/* logo */}
      <Link
        to="/"
        onClick={onNavigate}
        className="flex h-16 items-center gap-2.5 border-b border-line px-5 transition-colors dark:border-dline"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white dark:bg-brand-bright">
          <Radar size={16} />
        </span>
        <span className="text-base font-extrabold tracking-tight">
          Insane<span className="text-brand dark:text-brand-bright">Spy</span>
        </span>
      </Link>

      {/* nav — lista flat sem tópicos, itens maiores */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {items.map((item, idx) => (
          <div key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `hover-scale group flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors ${
                  isActive
                    ? "border-brand bg-brand-ghost text-brand dark:border-brand-bright dark:text-brand-bright"
                    : "border-transparent text-ink-2 hover:border-line hover:text-ink dark:text-dink-2 dark:hover:border-dline dark:hover:text-dink"
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
              <ChevronRight
                size={13}
                className="ml-auto opacity-0 transition-opacity group-hover:opacity-40"
              />
            </NavLink>
            {/* insere a tree de mecanismos após Bibliotecas */}
            {idx === 1 && (
              <div className="mt-2 mb-1">
                <MecanismosTree />
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* plano / quota */}
      <div className="border-t border-line p-4 dark:border-dline">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3 dark:text-dink-3">
            Plano
          </span>
          <span className="border border-brand px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-brand dark:border-brand-bright dark:text-brand-bright">
            {p.codename}
          </span>
        </div>
        <QuotaBar used={libraries.length} limit={p.librariesLimit} />
        {plan !== "unlimited" && (
          <Link
            to="/assinatura"
            onClick={onNavigate}
            className="mt-3 block border border-brand bg-brand px-3 py-2 text-center text-[10px] font-extrabold uppercase tracking-[0.2em] text-white transition-colors hover:bg-brand-deep dark:border-brand-bright dark:bg-brand-bright"
          >
            Upgrade →
          </Link>
        )}
      </div>
    </div>
  );
}

const TITLES: [RegExp, string][] = [
  [/^\/$/, "Visão geral"],
  [/^\/bibliotecas/, "Bibliotecas"],
  [/^\/biblioteca\//, "Detalhe da biblioteca"],
  [/^\/swipe/, "Swipe"],
  [/^\/dashboards\/.+/, "Mecanismo"],
  [/^\/dashboards/, "Mecanismos"],
  [/^\/assinatura/, "Assinatura"],
  [/^\/configuracoes/, "Configurações"],
  [/^\/admin/, "Admin"],
];

export function AppLayout() {
  const { theme, toggleTheme } = useStore();
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const title = TITLES.find(([re]) => re.test(location.pathname))?.[1] ?? "insanespy";

  useEffect(() => setMobileNav(false), [location.pathname]);

  return (
    <div className="min-h-screen bg-paper text-ink dark:bg-dpaper dark:text-dink">
      {/* sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-card lg:block dark:border-dline dark:bg-dcard">
        <SidebarContent />
      </aside>

      {/* sidebar mobile */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNav(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-line bg-card dark:border-dline dark:bg-dcard">
            <button
              onClick={() => setMobileNav(false)}
              className="absolute right-3 top-5 text-ink-3 hover:text-ink dark:text-dink-3"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setMobileNav(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        {/* header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur lg:px-6 dark:border-dline dark:bg-dpaper/90">
          <button
            className="inline-flex h-9 w-9 items-center justify-center border border-line lg:hidden dark:border-dline"
            onClick={() => setMobileNav(true)}
          >
            <Menu size={16} />
          </button>
          <div className="text-sm font-extrabold tracking-tight">{title}</div>
          <div className="flex-1" />
          <button
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center border border-line text-ink-2 transition-colors hover:border-brand hover:text-brand dark:border-dline dark:text-dink-2 dark:hover:border-brand-bright dark:hover:text-brand-bright"
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <NotificationsBell />
          <UserMenu />
        </header>

        {/* conteúdo */}
        <main className="mx-auto max-w-[1400px] p-4 lg:p-6">
          <div key={location.pathname} data-page-fade>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
