import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useStore } from "../lib/store";

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            className={`toast-anim pointer-events-auto flex items-start gap-2.5 border bg-card p-3 shadow-lg dark:bg-dcard ${
              t.kind === "error"
                ? "border-red-500"
                : t.kind === "success"
                  ? "border-brand dark:border-brand-bright"
                  : "border-line dark:border-dline"
            }`}
          >
            <Icon
              size={15}
              className={`mt-0.5 shrink-0 ${
                t.kind === "error"
                  ? "text-red-500"
                  : t.kind === "success"
                    ? "text-brand dark:text-brand-bright"
                    : "text-ink-2 dark:text-dink-2"
              }`}
            />
            <div className="flex-1 text-xs leading-snug">{t.message}</div>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-ink-3 hover:text-ink dark:text-dink-3 dark:hover:text-dink"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
