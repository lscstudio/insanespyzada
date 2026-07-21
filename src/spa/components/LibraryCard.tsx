import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, Flame, RefreshCw, Star, Trash2, EyeOff } from "lucide-react";
import type { Library } from "../lib/types";
import { trendOf } from "../lib/mock";
import { timeAgo, num } from "../lib/format";
import { useStore } from "../lib/store";
import { Badge, IconButton, TrendBadge } from "./ui";
import { CreativeThumb } from "./CreativeThumb";

export function LibraryCard({
  lib,
  onRemove,
  removeLabel = "Remover biblioteca",
}: {
  lib: Library;
  onRemove?: (id: string) => void;
  removeLabel?: string;
}) {
  const { toggleFavorite, refreshLibrary, removeLibrary } = useStore();
  const navigate = useNavigate();
  const top = lib.creatives[0];
  const running = lib.lastCollection.status === "running";

  return (
    <div
      onClick={() => navigate(`/biblioteca/${lib.id}`)}
      className="group flex flex-col overflow-hidden border border-line bg-card transition-colors hover:border-brand dark:border-dline dark:bg-dcard dark:hover:border-brand-bright"
    >
      {/* thumbnail do top criativo */}
      <div className="relative">
        <CreativeThumb hue={top?.hue ?? 220} type={top?.type ?? "image"} className="h-36 w-full" />
        <div className="absolute left-2 top-2 flex gap-1.5">
          {lib.isEscalating && (
            <Badge tone="escalating">
              <Flame size={11} /> Escalando
            </Badge>
          )}
          {lib.hiddenFromSwipe && (
            <Badge tone="neutral" className="bg-black/60 text-white border-black/60">
              <EyeOff size={11} /> Oculta
            </Badge>
          )}
        </div>
        {top && (
          <div className="absolute bottom-2 right-2 border border-white/30 bg-black/60 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
            ×{num(top.duplications)} dup
          </div>
        )}
      </div>

      {/* corpo */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/biblioteca/${lib.id}`}
              className="text-sm font-extrabold uppercase tracking-tight hover:text-brand dark:hover:text-brand-bright"
            >
              {lib.pageName}
            </Link>
            <TrendBadge trend={trendOf(lib)} />
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3 dark:text-dink-3">
            {lib.niche} · {lib.country}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden border border-line bg-line dark:border-dline dark:bg-dline">
          <div className="bg-card px-3 py-2 dark:bg-dcard">
            <div className="text-[9px] font-bold uppercase tracking-widest text-ink-3 dark:text-dink-3">
              Ads ativos
            </div>
            <div className="text-xl font-extrabold tabular-nums">{num(lib.activeAds)}</div>
          </div>
          <div className="bg-card px-3 py-2 dark:bg-dcard">
            <div className="text-[9px] font-bold uppercase tracking-widest text-ink-3 dark:text-dink-3">
              Criativos únicos
            </div>
            <div className="text-xl font-extrabold tabular-nums">{num(lib.uniqueCreatives)}</div>
          </div>
        </div>

        {/* status da coleta */}
        <div className="flex items-center gap-2 text-[11px] text-ink-2 dark:text-dink-2">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              running
                ? "bg-amber-500 pulse-dot"
                : lib.lastCollection.status === "success"
                  ? "bg-emerald-500"
                  : "bg-red-500"
            }`}
          />
          {running ? (
            <span className="uppercase tracking-wider">{lib.lastCollection.message}</span>
          ) : (
            <span>
              {lib.lastCollection.message} · {timeAgo(lib.lastCollection.at)}
              {lib.lastCollection.attempts > 1 && (
                <span className="text-ink-3 dark:text-dink-3">
                  {" "}
                  · {lib.lastCollection.attempts} tentativas
                </span>
              )}
            </span>
          )}
        </div>

        {/* ações */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-auto flex items-center gap-1.5 border-t border-line pt-3 dark:border-dline"
        >
          <IconButton
            active={lib.favorite}
            onClick={() => toggleFavorite(lib.id)}
            title="Favoritar"
          >
            <Star size={14} className={lib.favorite ? "fill-current" : ""} />
          </IconButton>
          <IconButton
            onClick={() => refreshLibrary(lib.id)}
            disabled={running}
            title="Coletar agora"
          >
            <RefreshCw size={14} className={running ? "animate-spin" : ""} />
          </IconButton>
          <a
            href={lib.url}
            target="_blank"
            rel="noreferrer"
            title="Abrir na Ads Library"
            className="inline-flex h-8 w-8 items-center justify-center border border-line text-ink-2 transition-colors hover:border-brand hover:text-brand dark:border-dline dark:text-dink-2 dark:hover:border-brand-bright dark:hover:text-brand-bright"
          >
            <ExternalLink size={14} />
          </a>
          <div className="flex-1" />
          <Link
            to={`/biblioteca/${lib.id}`}
            className="text-[10px] font-bold uppercase tracking-wider text-brand hover:underline dark:text-brand-bright"
          >
            Detalhes →
          </Link>
          <IconButton
            onClick={() => {
              void (onRemove ? onRemove(lib.id) : removeLibrary(lib.id));
            }}
            title={removeLabel}
            className="hover:!border-red-500 hover:!text-red-500"
          >
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
