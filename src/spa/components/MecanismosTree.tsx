import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Library as LibraryIcon,
  Search,
  Flame,
} from "lucide-react";
import { useStore } from "../lib/store";

const SS_KEY = "insanespy-expanded-mecanismos";
const PARENT_KEY = "__dashboards";

/**
 * MecanismosTree — tree view hierárquica com folder mãe "DASHBOARDS".
 *
 * Estrutura:
 *   ▼ DASHBOARDS
 *     ├── ▼ Truque da Gelatina
 *     │   ├── 📚 Gelatina Max
 *     │   └── 📚 Corpo Ideal
 *     └── ▶ Dor nas Articulações
 */
export function MecanismosTree() {
  const { dashboards, libraries } = useStore();
  const location = useLocation();
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (raw) {
        const s = new Set(JSON.parse(raw) as string[]);
        // DASHBOARDS começa aberto por padrão
        if (!s.has(PARENT_KEY)) s.add(PARENT_KEY);
        return s;
      }
    } catch {}
    return new Set([PARENT_KEY]);
  });
  const [query, setQuery] = useState("");

  const currentLibId = useMemo(
    () => location.pathname.match(/^\/biblioteca\/(.+)/)?.[1] ?? null,
    [location.pathname],
  );

  // auto-expande o folder mãe + mecanismo que contém a biblioteca ativa
  useEffect(() => {
    if (!currentLibId) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(PARENT_KEY);
      for (const d of dashboards) {
        if (d.libraryIds.includes(currentLibId)) {
          next.add(d.id);
          break;
        }
      }
      sessionStorage.setItem(SS_KEY, JSON.stringify([...next]));
      return next;
    });
  }, [currentLibId, dashboards]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      sessionStorage.setItem(SS_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  const q = query.trim().toLowerCase();
  const matches = (s: string) => !q || s.toLowerCase().includes(q);

  const filteredDashboards = dashboards.filter(
    (d) =>
      !q ||
      matches(d.name) ||
      libraries.some((l) => d.libraryIds.includes(l.id) && matches(l.pageName)),
  );
  const isSearching = q.length > 0;

  function isOpen(id: string): boolean {
    return isSearching || expanded.has(id);
  }

  const totalCount = dashboards.length;
  const parentOpen = isOpen(PARENT_KEY);

  function renderLibrary(lib: { id: string; pageName: string; isEscalating: boolean }) {
    return (
      <NavLink
        key={lib.id}
        to={`/biblioteca/${lib.id}`}
        className={({ isActive }) =>
          `mec-lib group flex items-center gap-2 border-l-2 py-1.5 pl-2.5 text-[11px] font-semibold tracking-wide transition-all duration-150 ${
            isActive
              ? "border-brand bg-brand-ghost text-brand dark:border-brand-bright dark:text-brand-bright"
              : "border-transparent text-ink-2 hover:border-line hover:bg-brand-ghost/30 hover:text-ink dark:text-dink-2 dark:hover:border-dline dark:hover:text-dink"
          }`
        }
      >
        <LibraryIcon size={12} className="shrink-0 opacity-50 group-hover:opacity-80" />
        <span className="truncate">{lib.pageName}</span>
        {lib.isEscalating && (
          <Flame size={10} className="ml-auto shrink-0 text-brand dark:text-brand-bright" />
        )}
      </NavLink>
    );
  }

  function renderChildren(open: boolean, children: React.ReactNode) {
    return (
      <div
        className="mec-tree-children"
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          transition: "grid-template-rows 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease",
        }}
      >
        <div className="overflow-hidden min-h-0">{children}</div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {/* folder mãe DASHBOARDS */}
      <div>
        <button
          onClick={() => toggle(PARENT_KEY)}
          className={`group mec-folder flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-sm font-bold uppercase tracking-wider transition-all duration-150 ${
            parentOpen
              ? "border-line text-ink dark:border-dline dark:text-dink"
              : "border-transparent text-ink-2 hover:border-line hover:bg-brand-ghost/50 hover:text-ink dark:text-dink-2 dark:hover:border-dline dark:hover:text-dink"
          }`}
        >
          <ChevronRight
            size={13}
            className={`shrink-0 transition-transform duration-200 ${parentOpen ? "rotate-90" : ""}`}
          />
          {parentOpen ? (
            <FolderOpen size={16} className="shrink-0" />
          ) : (
            <Folder size={16} className="shrink-0" />
          )}
          <span>Dashboards</span>
        </button>

        {renderChildren(
          parentOpen,
          <div className="mec-tree-indent ml-4 border-l border-line/40 pl-1 dark:border-dline/40">
            {/* busca quando há muitos itens */}
            {totalCount > 3 && (
              <div className="relative mb-1 px-1 py-1">
                <Search
                  size={10}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 dark:text-dink-3"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="filtrar…"
                  className="h-6 w-full border border-line bg-card pl-6 pr-2 font-mono text-[10px] outline-none placeholder:text-ink-3 focus:border-brand dark:border-dline dark:bg-dcard dark:placeholder:text-dink-3 dark:focus:border-brand-bright"
                />
              </div>
            )}

            {/* mecanismos */}
            {filteredDashboards.map((d) => {
              const open = isOpen(d.id);
              const libs = libraries.filter(
                (l) => d.libraryIds.includes(l.id) && (!q || matches(l.pageName)),
              );
              const hasActiveLib = currentLibId && d.libraryIds.includes(currentLibId);

              return (
                <div key={d.id}>
                  <button
                    onClick={() => toggle(d.id)}
                    className={`group mec-folder flex w-full items-center gap-2.5 border-l-2 px-3 py-2 text-[13px] font-bold uppercase tracking-wider transition-all duration-150 ${
                      hasActiveLib
                        ? "border-brand bg-brand-ghost text-brand dark:border-brand-bright dark:text-brand-bright"
                        : "border-transparent text-ink-2 hover:border-line hover:bg-brand-ghost/50 hover:text-ink dark:text-dink-2 dark:hover:border-dline dark:hover:text-dink"
                    }`}
                  >
                    <ChevronRight
                      size={12}
                      className={`shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
                    />
                    {open ? (
                      <FolderOpen size={14} className="shrink-0" />
                    ) : (
                      <Folder size={14} className="shrink-0" />
                    )}
                    <span className="truncate">{d.name}</span>
                  </button>

                  {renderChildren(
                    open,
                    <div className="mec-tree-indent ml-3 border-l border-line/40 pl-1 dark:border-dline/40">
                      {libs.map((lib) => renderLibrary(lib))}
                      {libs.length === 0 && (
                        <div className="py-1.5 pl-2.5 text-[10px] italic text-ink-3 dark:text-dink-3">
                          {q ? "Nenhum resultado" : "Vazio"}
                        </div>
                      )}
                    </div>,
                  )}
                </div>
              );
            })}

            {/* empty state */}
            {filteredDashboards.length === 0 && (
              <div className="px-3 py-3 text-center">
                <div className="text-[11px] text-ink-3 dark:text-dink-3">
                  {q ? "Nenhum resultado." : "Nenhum mecanismo criado."}
                </div>
              </div>
            )}
          </div>,
        )}
      </div>
    </div>
  );
}
