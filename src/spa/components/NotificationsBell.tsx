import { useEffect, useRef, useState } from "react";
import { Bell, Flame, CalendarClock, Database, Info, CheckCheck } from "lucide-react";
import { useStore } from "../lib/store";
import { timeAgo } from "../lib/format";
import type { AppNotification } from "../lib/types";

const ICONS: Record<AppNotification["type"], typeof Flame> = {
  escalating: Flame,
  renewal: CalendarClock,
  collection: Database,
  system: Info,
};

export function NotificationsBell() {
  const { notifications, markAllRead } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center border border-line text-ink-2 transition-colors hover:border-brand hover:text-brand dark:border-dline dark:text-dink-2 dark:hover:border-brand-bright dark:hover:text-brand-bright"
        title="Notificações"
      >
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center bg-brand px-1 text-[9px] font-extrabold tabular-nums text-white dark:bg-brand-bright">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-80 border border-line bg-card shadow-xl dark:border-dline dark:bg-dcard">
          <div className="flex items-center justify-between border-b border-line px-3 py-2 dark:border-dline">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
              Notificações{" "}
              {unread > 0 && <span className="text-brand dark:text-brand-bright">({unread})</span>}
            </span>
            <button
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-3 hover:text-brand dark:text-dink-3 dark:hover:text-brand-bright"
            >
              <CheckCheck size={12} /> ler todas
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="p-6 text-center text-xs text-ink-3 dark:text-dink-3">
                Sem notificações.
              </div>
            )}
            {notifications.map((n) => {
              const Icon = ICONS[n.type];
              return (
                <div
                  key={n.id}
                  className={`flex gap-3 border-b border-line px-3 py-3 last:border-0 dark:border-dline ${
                    n.read ? "opacity-55" : ""
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border ${
                      n.type === "escalating"
                        ? "border-brand text-brand dark:border-brand-bright dark:text-brand-bright"
                        : "border-line text-ink-2 dark:border-dline dark:text-dink-2"
                    }`}
                  >
                    <Icon size={13} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wide">{n.title}</div>
                    <p className="mt-0.5 text-[11px] leading-snug text-ink-2 dark:text-dink-2">
                      {n.body}
                    </p>
                    <div className="mt-1 text-[9px] uppercase tracking-widest text-ink-3 dark:text-dink-3">
                      {timeAgo(n.at)}
                    </div>
                  </div>
                  {!n.read && (
                    <span className="ml-auto mt-1 h-1.5 w-1.5 shrink-0 bg-brand dark:bg-brand-bright" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
