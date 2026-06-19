import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useLang, useT, tf } from "@/lib/i18n";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Flame,
  Layers,
  Pencil,
  Radio,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountUp } from "@/components/count-up";
import { AddLibraryModal } from "@/components/add-library-modal";
import { HourlyTrendBadge } from "@/components/library-card";
import {
  useDailyStatsForLibrary,
  useHourlyTrend,
  useLibrary,
  useLibrarySnapshots,
  useLibrarySnapshotsHistory,
  useTopCreatives,
} from "@/hooks/use-libraries";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/biblioteca/$id")({
  head: () => ({ meta: [{ title: "Detalhe · InsaneSpy" }] }),
  component: LibraryDetailPage,
});

function LibraryDetailPage() {
  const t = useT();
  const { lang } = useLang();
  const dLocale = lang === "en" ? enUS : ptBR;
  const { id } = Route.useParams();
  const lib = useLibrary(id);
  const trends = useHourlyTrend();
  const daily = useDailyStatsForLibrary(id);
  const snaps48 = useLibrarySnapshots(id, 48);
  const history = useLibrarySnapshotsHistory(id, 100);
  const topCreatives = useTopCreatives(id, lib.data?.latest_snapshot_id ?? null);

  const [range, setRange] = useState<"7" | "14" | "30" | "90">("14");
  const [mode, setMode] = useState<"day" | "hour">("day");
  const [hourRange, setHourRange] = useState<"24" | "48">("24");
  const [editOpen, setEditOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const data = lib.data;
  const trend = trends.data?.[id];

  const chartData = useMemo(() => {
    if (mode === "hour") {
      const hours = Number(hourRange);
      const cutoff = Date.now() - hours * 3600_000;
      return (snaps48.data ?? [])
        .filter((s) => new Date(s.captured_at).getTime() >= cutoff)
        .map((s) => ({
          ts: s.captured_at,
          value: s.active_ads_count ?? 0,
        }));
    }
    const days = Number(range);
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));
    cutoff.setUTCHours(0, 0, 0, 0);
    const byDay = new Map<string, { avg: number; max: number }>();
    for (const s of daily.data ?? []) {
      if (new Date(s.day) < cutoff) continue;
      byDay.set(s.day, {
        avg: Number(s.avg_active_ads ?? 0),
        max: Number(s.max_active_ads ?? 0),
      });
    }
    const out: { ts: string; value: number; max: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      d.setUTCHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      const v = byDay.get(key);
      out.push({ ts: key, value: Math.round(v?.avg ?? 0), max: v?.max ?? 0 });
    }
    return out;
  }, [mode, range, hourRange, daily.data, snaps48.data]);

  if (lib.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 shimmer" />
        <Skeleton className="h-32 w-full rounded-2xl shimmer" />
        <Skeleton className="h-80 w-full rounded-2xl shimmer" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/bibliotecas">
            <ArrowLeft className="h-4 w-4" /> {t("Voltar")}
          </Link>
        </Button>
        <Card className="border-border/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">{t("Biblioteca não encontrada.")}</p>
        </Card>
      </div>
    );
  }

  const title = data.title || data.search_term || data.page_name || t("Biblioteca");

  const totalHistory = history.data?.length ?? 0;
  const pagedHistory = (history.data ?? []).slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/bibliotecas">
          <ArrowLeft className="h-4 w-4" /> {t("Voltar")}
        </Link>
      </Button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {data.niche && (
              <Badge className="border-0 bg-primary/15 text-primary">{data.niche}</Badge>
            )}
            {data.language && <Badge variant="outline">{data.language}</Badge>}
            {data.status === "paused" && (
              <Badge variant="outline" className="border-warning/40 text-warning">
                {t("Pausada")}
              </Badge>
            )}
            {data.scrape_ok === false && (
              <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                <AlertTriangle className="h-3 w-3" /> {t("falha na última coleta")}
              </Badge>
            )}
          </div>
          <h1 className="mt-2 truncate text-3xl font-bold tracking-tight">{title}</h1>
          {data.notes && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{data.notes}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href={data.url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> {t("Abrir na Meta")}
            </a>
          </Button>
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> {t("Editar")}
          </Button>
        </div>
      </motion.div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label={t("Anúncios ativos")} icon={Layers}>
          <div className="flex items-end justify-between gap-3">
            <CountUp
              value={data.active_ads_count ?? 0}
              className="text-4xl font-bold tracking-tight tabular-nums text-foreground"
            />
            <HourlyTrendBadge trend={trend} />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t("Variação vs coleta anterior")}
          </p>
        </SummaryCard>

        <SummaryCard label={t("Última coleta")} icon={Radio}>
          <p className="text-base font-semibold" title={data.captured_at ?? ""}>
            {data.captured_at
              ? formatDistanceToNow(new Date(data.captured_at), {
                  addSuffix: true,
                  locale: dLocale,
                })
              : "—"}
          </p>
          {data.captured_at && (
            <p className="mt-1 text-xs text-muted-foreground">
              {format(new Date(data.captured_at), lang === "en" ? "MMMM dd, HH:mm" : "dd 'de' MMMM, HH:mm", { locale: dLocale })}
            </p>
          )}
        </SummaryCard>

        <SummaryCard label={t("Status")} icon={Layers}>
          <p className="text-base font-semibold capitalize">{data.status}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.scrape_ok === false ? t("Última coleta falhou") : t("Mineração saudável")}
          </p>
        </SummaryCard>
      </div>

      {/* Main chart */}
      <Card className="border-border/60 bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t("Evolução")}</h2>
            <p className="text-sm text-muted-foreground">
              {mode === "day"
                ? t("Média diária de anúncios ativos.")
                : tf(t("Snapshots crus das últimas {h} horas."), { h: hourRange })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "day" | "hour")}>
              <TabsList>
                <TabsTrigger value="hour">{t("Hora")}</TabsTrigger>
                <TabsTrigger value="day">{t("Dia")}</TabsTrigger>
              </TabsList>
            </Tabs>
            {mode === "hour" ? (
              <Tabs value={hourRange} onValueChange={(v) => setHourRange(v as "24" | "48")}>
                <TabsList>
                  <TabsTrigger value="24">24h</TabsTrigger>
                  <TabsTrigger value="48">48h</TabsTrigger>
                </TabsList>
              </Tabs>
            ) : (
              <Tabs value={range} onValueChange={(v) => setRange(v as "7" | "14" | "30" | "90")}>
                <TabsList>
                  <TabsTrigger value="7">7d</TabsTrigger>
                  <TabsTrigger value="14">14d</TabsTrigger>
                  <TabsTrigger value="30">30d</TabsTrigger>
                  <TabsTrigger value="90">90d</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {mode === "day" ? (
              <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-day" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(270 90% 70%)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(190 90% 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border) / 0.3)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="ts"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip content={<DetailTooltip mode="day" />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(270 90% 70%)"
                  strokeWidth={2}
                  fill="url(#grad-day)"
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border) / 0.3)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="ts"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(d: string) =>
                    format(new Date(d), "dd/MM HH:mm", { locale: dLocale })
                  }
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip content={<DetailTooltip mode="hour" />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(190 90% 60%)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Best creative + Active pages ranking */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card className="border-border/60 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t("Criativo mais escalado")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("Com mais duplicações conforme a própria Meta exibe.")}
              </p>
            </div>
          </div>
          {topCreatives.isLoading ? (
            <Skeleton className="aspect-square w-full max-w-sm mx-auto rounded-2xl shimmer" />
          ) : (topCreatives.data ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("Sem criativos no último snapshot.")}
            </p>
          ) : (
            (() => {
              const tc = (topCreatives.data ?? [])[0];
              const href =
                tc.ad_url ||
                (tc.ad_archive_id
                  ? `https://www.facebook.com/ads/library/?id=${tc.ad_archive_id}`
                  : data.url);
              return (
                <motion.a
                  key={tc.id}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.015 }}
                  className="group relative mx-auto block aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-primary/60 bg-gradient-to-br from-primary/25 via-primary/10 to-background p-6 shadow-[0_0_60px_-15px_rgba(80,110,255,0.55)] transition-shadow hover:shadow-[0_0_80px_-10px_rgba(80,110,255,0.85)]"
                >
                  <Badge className="absolute right-3 top-3 z-10 border-0 bg-foreground text-background">
                    {t("#1 escalado")}
                  </Badge>
                  <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                    <motion.div
                      animate={{ scale: [1, 1.08, 1], rotate: [0, -3, 3, 0] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                      className="rounded-full bg-primary/15 p-6 ring-1 ring-primary/40 backdrop-blur"
                    >
                      <Flame
                        className="h-24 w-24 text-primary drop-shadow-[0_0_25px_rgba(120,140,255,0.85)]"
                        strokeWidth={1.6}
                      />
                    </motion.div>
                    <div className="text-center">
                      <p className="text-4xl font-bold tabular-nums text-foreground">
                        ×{formatNumber(tc.duplicate_count ?? 0)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {t("duplicações")}
                      </p>
                    </div>
                    {tc.page_name && (
                      <p className="line-clamp-1 text-sm text-foreground/80">{tc.page_name}</p>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      {t("Abrir criativo na Meta")} <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </motion.a>
              );
            })()
          )}
        </Card>

        <Card className="border-border/60 bg-card p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{t("Páginas ativas")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("Ranking por anúncios ativos nesta biblioteca.")}
            </p>
          </div>
          {(() => {
            const pages = (data.pages ?? []) as { name: string; active_ads_count: number; page_id?: string | null }[];
            if (pages.length === 0) {
              return (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("Sem detecção de páginas no último snapshot.")}
                </p>
              );
            }
            const max = Math.max(...pages.map((p) => p.active_ads_count), 1);
            return (
              <ol className="space-y-2">
                {pages.slice(0, 12).map((p, i) => (
                  <li
                    key={`${p.name}-${i}`}
                    className="group relative overflow-hidden rounded-lg border border-border/50 bg-background/40 p-3"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/15 transition-all"
                      style={{ width: `${(p.active_ads_count / max) * 100}%` }}
                    />
                    <div className="relative flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary">
                          {i + 1}
                        </span>
                        <span className="truncate text-sm font-medium">{p.name}</span>
                      </div>
                      <span className="tabular-nums text-sm font-semibold text-foreground">
                        {formatNumber(p.active_ads_count)}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            );
          })()}
        </Card>
      </div>


      {/* History */}
      <Card className="border-border/60 bg-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{t("Histórico de snapshots")}</h2>
          <p className="text-sm text-muted-foreground">{tf(t("{n} coletas registradas."), { n: totalHistory })}</p>
        </div>
        {history.isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl shimmer" />
        ) : pagedHistory.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("Sem snapshots ainda.")}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">{t("Coletado em")}</th>
                    <th className="py-2 pr-4 font-medium">{t("Ativos")}</th>
                    <th className="py-2 pr-4 font-medium">{t("Top")}</th>
                    <th className="py-2 pr-4 font-medium">{t("Únicos")}</th>
                    <th className="py-2 pr-4 font-medium">{t("Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedHistory.map((s) => (
                    <tr key={s.id} className="border-t border-border/40">
                      <td className="py-2 pr-4" title={s.captured_at}>
                        {format(new Date(s.captured_at), lang === "en" ? "MM/dd/yyyy HH:mm" : "dd/MM/yyyy HH:mm", { locale: dLocale })}
                      </td>
                      <td className="py-2 pr-4 font-medium tabular-nums">
                        {formatNumber(s.active_ads_count)}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        ×{formatNumber(s.top_creative_count ?? 0)}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {formatNumber(s.unique_creatives ?? 0)}
                      </td>
                      <td className="py-2 pr-4">
                        {s.scrape_ok ? (
                          <span className="text-xs text-success">{t("OK")}</span>
                        ) : (
                          <span className="text-xs text-warning">{s.error_message || t("Falhou")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalHistory > pageSize && (
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {tf(t("Página {a} de {b}"), { a: page + 1, b: Math.ceil(totalHistory / pageSize) })}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    {t("Anterior")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(page + 1) * pageSize >= totalHistory}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {t("Próxima")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <AddLibraryModal open={editOpen} onOpenChange={setEditOpen} library={data} />
    </div>
  );
}

function SummaryCard({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-border/60 bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">{children}</div>
      </Card>
    </motion.div>
  );
}

function DetailTooltip({ active, payload, label, mode }: any) {
  const t = useT();
  const { lang } = useLang();
  const dLocale = lang === "en" ? enUS : ptBR;
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  const max = payload[0].payload?.max;
  const abs =
    mode === "day"
      ? new Date(label).toLocaleDateString(lang === "en" ? "en-US" : "pt-BR")
      : format(new Date(label), "dd/MM HH:mm", { locale: dLocale });
  return (
    <div className="rounded-lg border border-border/60 bg-popover/95 p-3 text-xs shadow-xl backdrop-blur">
      <p className="font-medium text-foreground">{abs}</p>
      <p className="mt-1 text-sm font-semibold text-primary">
        {mode === "day" ? `${t("Média:")} ` : ""}
        {formatNumber(value)}
      </p>
      {mode === "day" && max ? (
        <p className="text-xs text-muted-foreground">{t("Máximo:")} {formatNumber(max)}</p>
      ) : null}
    </div>
  );
}
