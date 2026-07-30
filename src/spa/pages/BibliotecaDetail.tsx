import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Star, RefreshCw, Flame } from "lucide-react";
import { useStore } from "../lib/store";
import { PLANS } from "../lib/plans";
import { num, timeAgo, hourBR, dayLabel } from "../lib/format";
import { trendOf } from "../lib/mock";
import { Badge, Button, Card, IconButton, Stat, TrendBadge } from "../components/ui";
import { PremiumLineChart } from "../components/PremiumLineChart";

export function BibliotecaDetail() {
  const { id } = useParams<{ id: string }>();
  const { libraries, toggleFavorite, refreshLibrary, fetchLibraryDetail, plan } = useStore();
  const p = PLANS[plan];
  const lib = libraries.find((l) => l.id === id);
  const [detailLoading, setDetailLoading] = useState(false);

  // Busca snapshots + top creatives REAIS quando abre a página.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setDetailLoading(true);
    fetchLibraryDetail(id).finally(() => {
      if (!cancelled) setDetailLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, fetchLibraryDetail]);

  const history = useMemo(
    () => (lib ? lib.snapshots.slice(-p.historyDays) : []),
    [lib, p.historyDays],
  );

  if (!lib) {
    return (
      <div className="space-y-4">
        <Link
          to="/bibliotecas"
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand hover:underline dark:text-brand-bright"
        >
          <ArrowLeft size={12} /> voltar
        </Link>
        <Card className="p-10 text-center text-sm text-ink-2 dark:text-dink-2">
          Biblioteca não encontrada (ou removida).
        </Card>
      </div>
    );
  }

  const trend = trendOf(lib);
  const running = lib.lastCollection.status === "running";
  const last = lib.snapshots[lib.snapshots.length - 1];
  const prev = lib.snapshots[lib.snapshots.length - 2];
  const diff = last && prev ? last.activeAds - prev.activeAds : 0;
  const hasData = lib.snapshots.length > 0 || lib.creatives.length > 0;

  return (
    <div className="space-y-6">
      {/* header */}
      <div>
        <Link
          to="/bibliotecas"
          className="mb-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-ink-3 hover:text-brand dark:text-dink-3 dark:hover:text-brand-bright"
        >
          <ArrowLeft size={12} /> bibliotecas
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold uppercase tracking-tight">{lib.pageName}</h1>
              {lib.isEscalating && (
                <Badge tone="escalating">
                  <Flame size={11} /> Escalando
                </Badge>
              )}
              <TrendBadge trend={trend} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-ink-2 dark:text-dink-2">
              <span className="uppercase tracking-widest text-[10px] text-ink-3 dark:text-dink-3">
                {lib.niche} · {lib.country} · adicionada {timeAgo(lib.addedAt)}
              </span>
              <a
                href={lib.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-brand hover:underline dark:text-brand-bright"
              >
                <ExternalLink size={11} /> Ads Library
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              active={lib.favorite}
              onClick={() => toggleFavorite(lib.id)}
              title="Favoritar"
            >
              <Star size={14} className={lib.favorite ? "fill-current" : ""} />
            </IconButton>
            <Button variant="outline" onClick={() => refreshLibrary(lib.id)} disabled={running}>
              <RefreshCw size={13} className={running ? "animate-spin" : ""} />
              {running ? "Coletando…" : "Coletar agora"}
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3 sm:col-span-1">
          <Stat
            label="Anúncios ativos"
            value={hasData ? num(lib.activeAds) : "—"}
            sub={
              last && prev ? (
                <span className={diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : ""}>
                  {diff > 0 ? "+" : ""}
                  {diff} vs coleta anterior
                </span>
              ) : (
                <span className="text-ink-3 dark:text-dink-3">aguardando primeira coleta</span>
              )
            }
          />
        </div>
      </div>

      {running && (
        <Card className="flex items-center gap-3 border-amber-500/40 bg-amber-500/5 p-4">
          <RefreshCw size={16} className="animate-spin text-amber-500" />
          <div className="text-sm">
            <span className="font-bold uppercase tracking-wider text-amber-500">
              Coleta em andamento
            </span>
            <p className="text-xs text-ink-2 dark:text-dink-2">
              {lib.lastCollection.message}. Os dados serão preenchidos assim que a primeira coleta
              for concluída.
            </p>
          </div>
        </Card>
      )}

      {!hasData && !running && (
        <Card className="p-6 text-center text-sm text-ink-2 dark:text-dink-2">
          Nenhum snapshot disponível para esta biblioteca. Dispare uma coleta manual em “Coletar
          agora”.
        </Card>
      )}

      {/* gráficos */}
      {hasData && (
        <div className="grid gap-4 xl:grid-cols-2">
          <PremiumLineChart
            data={history}
            showFilters
            defaultWindow={30}
            labelFormat="day"
            title="Evolução diária"
            subtitle={`Histórico do plano ${p.name} · ${p.historyDays} dias`}
            height={260}
          />
          <PremiumLineChart
            data={lib.snapshots48h}
            labelFormat="hour"
            title="Snapshots — últimas 48h"
            subtitle="Granularidade por hora · resolução alta"
            height={260}
          />
        </div>
      )}

      {/* histórico de snapshots */}
      {lib.snapshots.length > 0 && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-ink-3 dark:text-dink-3">
                log
              </div>
              <h3 className="mt-0.5 text-sm font-extrabold uppercase tracking-tight">
                Histórico de coletas
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink-3 dark:text-dink-3">
              {lib.snapshots.length} snapshots
            </span>
          </div>

          <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {[...lib.snapshots].reverse().map((s, i) => {
              const maxAds = Math.max(1, ...lib.snapshots.map((x) => x.activeAds));
              const pct = Math.round((s.activeAds / maxAds) * 100);
              const isLatest = i === 0;
              return (
                <div
                  key={s.t}
                  className={`group flex items-center gap-3 rounded px-2.5 py-2 transition-colors hover:bg-brand-ghost dark:hover:bg-dcard ${
                    isLatest ? "bg-brand-ghost/60 dark:bg-dcard/60" : ""
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      isLatest ? "bg-brand dark:bg-brand-bright" : "bg-line dark:bg-dline"
                    }`}
                  />
                  <div className="w-[7.5rem] shrink-0 font-mono text-[11px] text-ink-2 dark:text-dink-2">
                    <div className="font-bold tabular-nums">{hourBR(s.t)}</div>
                    <div className="text-[9px] uppercase tracking-widest text-ink-3 dark:text-dink-3">
                      {dayLabel(s.t)}
                    </div>
                  </div>
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-line dark:bg-dline">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-brand dark:bg-brand-bright transition-all duration-300"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right font-mono text-sm font-extrabold tabular-nums">
                    {num(s.activeAds)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[10px] uppercase tracking-widest text-ink-3 dark:border-dline dark:text-dink-3">
            <span>
              último push: {hourBR(lib.lastCollection.at)} · {dayLabel(lib.lastCollection.at)}
            </span>
            <span
              className={
                lib.lastCollection.status === "success"
                  ? "text-emerald-500"
                  : lib.lastCollection.status === "running"
                    ? "text-amber-500"
                    : "text-red-500"
              }
            >
              {lib.lastCollection.status}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
