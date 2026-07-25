import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Star,
  RefreshCw,
  Flame,
  Download,
  Lock,
  Play,
  Clock,
} from "lucide-react";
import { useStore } from "../lib/store";
import { PLANS } from "../lib/plans";
import { num, timeAgo, hourBR, dayLabel, dateTimeBR } from "../lib/format";
import { trendOf } from "../lib/mock";
import { Badge, Button, Card, IconButton, SectionTitle, Stat, TrendBadge } from "../components/ui";
import { PremiumLineChart } from "../components/PremiumLineChart";
import { CreativeThumb } from "../components/CreativeThumb";

export function BibliotecaDetail() {
  const { id } = useParams<{ id: string }>();
  const { libraries, toggleFavorite, refreshLibrary, fetchLibraryDetail, plan, toast } = useStore();
  const p = PLANS[plan];
  const lib = libraries.find((l) => l.id === id);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
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
  const top = lib.creatives[0];
  const running = lib.lastCollection.status === "running";
  const last = lib.snapshots[lib.snapshots.length - 1];
  const prev = lib.snapshots[lib.snapshots.length - 2];
  const diff = last && prev ? last.activeAds - prev.activeAds : 0;
  const hasData = lib.snapshots.length > 0 || lib.creatives.length > 0;

  function extractVideo() {
    if (!p.videoExtraction) {
      toast("Extração de vídeo é exclusiva do plano Unlimited (Diamond).", "error");
      return;
    }
    setExtracting(true);
    toast("Tentando baixar MP4 real… contornando proteção DPA.", "info");
    window.setTimeout(() => {
      setExtracting(false);
      setExtracted(true);
      toast("MP4 extraído com sucesso. Download iniciado.", "success");
    }, 2800);
  }

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
        <Stat
          label="Criativos únicos"
          value={hasData ? num(lib.uniqueCreatives) : "—"}
          sub="distintos em veiculação"
        />
        <Stat
          label="Top criativo"
          value={top ? `×${num(top.duplications)}` : "—"}
          sub="duplicações (criativo vencedor)"
          accent
        />
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

      {/* criativo mais escalado */}
      {top && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line bg-brand-ghost px-5 py-3 dark:border-dline">
            <Flame size={12} className="text-brand dark:text-brand-bright" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand dark:text-brand-bright">
              Criativo mais escalado
            </span>
          </div>
          <div className="grid md:grid-cols-[280px_1fr]">
            <CreativeThumb hue={top.hue} type={top.type} className="h-48 w-full md:h-full" />
            <div className="flex flex-col gap-4 p-6">
              <div>
                <div className="text-lg font-extrabold uppercase leading-tight tracking-tight">
                  {top.headline}
                </div>
                <p className="mt-1 text-xs text-ink-2 dark:text-dink-2">{top.body}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">×{num(top.duplications)} duplicações</Badge>
                <Badge tone="neutral">
                  <Clock size={10} /> {top.daysActive} dias ativo
                </Badge>
                <Badge tone="neutral">
                  {top.type === "video" ? <Play size={10} /> : null} {top.type} {top.format}
                </Badge>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-line pt-4 dark:border-dline">
                {top.type === "video" && (
                  <Button onClick={extractVideo} disabled={extracting || !p.videoExtraction}>
                    {p.videoExtraction ? (
                      <>
                        <Download size={13} className={extracting ? "animate-bounce" : ""} />
                        {extracting
                          ? "Extraindo MP4…"
                          : extracted
                            ? "Extrair novamente"
                            : "Extrair vídeo (MP4)"}
                      </>
                    ) : (
                      <>
                        <Lock size={13} /> Extração — Diamond
                      </>
                    )}
                  </Button>
                )}
                <a href={lib.url} target="_blank" rel="noreferrer">
                  <Button variant="outline">
                    <ExternalLink size={13} /> Abrir na Ads Library
                  </Button>
                </a>
                {!p.videoExtraction && top.type === "video" && (
                  <span className="text-[11px] text-ink-3 dark:text-dink-3">
                    Extração de vídeo é exclusiva do plano Unlimited.
                  </span>
                )}
                {extracted && (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">
                    MP4 salvo
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* top criativos */}
      {lib.creatives.length > 0 && (
        <Card className="p-6">
          <SectionTitle kicker="ranking" title="Top criativos por duplicação" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[9px] uppercase tracking-[0.25em] text-ink-3 dark:border-dline dark:text-dink-3">
                  <th className="pb-2 pr-3 font-bold">#</th>
                  <th className="pb-2 pr-3 font-bold">Criativo</th>
                  <th className="pb-2 pr-3 font-bold">Headline</th>
                  <th className="pb-2 pr-3 font-bold">Tipo</th>
                  <th className="pb-2 pr-3 font-bold text-right">Duplicações</th>
                  <th className="pb-2 pr-3 font-bold text-right">Dias ativo</th>
                  <th className="pb-2 font-bold">Força</th>
                </tr>
              </thead>
              <tbody>
                {lib.creatives.slice(0, 8).map((c, i) => {
                  const max = lib.creatives[0]?.duplications ?? 1;
                  const pct = Math.max(4, Math.round((c.duplications / max) * 100));
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-line/60 last:border-0 hover:bg-brand-ghost dark:border-dline/60"
                    >
                      <td className="py-2.5 pr-3 font-bold tabular-nums text-ink-3 dark:text-dink-3">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="py-2.5 pr-3">
                        <CreativeThumb
                          hue={c.hue}
                          type={c.type}
                          className="h-9 w-14"
                          showType={false}
                        />
                      </td>
                      <td className="max-w-[260px] py-2.5 pr-3">
                        <div className="truncate font-bold">{c.headline}</div>
                        <div className="truncate text-[10px] text-ink-3 dark:text-dink-3">
                          {c.body}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 uppercase tracking-wider text-ink-2 dark:text-dink-2">
                        {c.type} {c.format}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-extrabold tabular-nums text-brand dark:text-brand-bright">
                        ×{num(c.duplications)}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{c.daysActive}d</td>
                      <td className="py-2.5">
                        <div className="h-1.5 w-24 bg-line dark:bg-dline">
                          <div
                            className="h-full bg-brand dark:bg-brand-bright"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* histórico de snapshots */}
      {lib.snapshots.length > 0 && (
        <Card className="p-6">
          <SectionTitle kicker="log" title="Histórico de snapshots" />
          <div className="max-h-72 space-y-1 overflow-y-auto font-mono text-[11px]">
            {[...lib.snapshots].reverse().map((s, i) => (
              <div
                key={s.t}
                className="flex items-center justify-between border-b border-line/50 py-1.5 last:border-0 dark:border-dline/50"
              >
                <span className="text-ink-3 dark:text-dink-3">
                  Coleta #{String(lib.snapshots.length - i).padStart(3, "0")} · {dateTimeBR(s.t)}
                </span>
                <span className="flex items-center gap-4">
                  <span>
                    ads: <b className="tabular-nums">{num(s.activeAds)}</b>
                  </span>
                  <span className="hidden sm:inline">
                    criativos: <b className="tabular-nums">{num(s.uniqueCreatives)}</b>
                  </span>
                  <span className="font-bold uppercase tracking-wider text-emerald-500">ok</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-line pt-3 text-[10px] uppercase tracking-widest text-ink-3 dark:border-dline dark:text-dink-3">
            última coleta: {hourBR(lib.lastCollection.at)} · {dayLabel(lib.lastCollection.at)} ·{" "}
            {lib.lastCollection.attempts} tentativa(s) · status:{" "}
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
