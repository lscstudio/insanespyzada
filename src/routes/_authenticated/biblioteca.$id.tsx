import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  Pencil,
  Radio,
  Video,
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
  head: () => ({ meta: [{ title: "Detalhe · AdSpy Dashboard" }] }),
  component: LibraryDetailPage,
});

function LibraryDetailPage() {
  const { id } = Route.useParams();
  const lib = useLibrary(id);
  const trends = useHourlyTrend();
  const daily = useDailyStatsForLibrary(id);
  const snaps48 = useLibrarySnapshots(id, 48);
  const history = useLibrarySnapshotsHistory(id, 100);
  const topCreatives = useTopCreatives(id, lib.data?.latest_snapshot_id ?? null);

  const [range, setRange] = useState<"7" | "14" | "30" | "90">("14");
  const [mode, setMode] = useState<"day" | "hour">("day");
  const [editOpen, setEditOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const data = lib.data;
  const trend = trends.data?.[id];

  const chartData = useMemo(() => {
    if (mode === "hour") {
      return (snaps48.data ?? []).map((s) => ({
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
  }, [mode, range, daily.data, snaps48.data]);

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
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>
        <Card className="border-border/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">Biblioteca não encontrada.</p>
        </Card>
      </div>
    );
  }

  const title = data.search_term || data.page_name || "Biblioteca";

  const totalHistory = history.data?.length ?? 0;
  const pagedHistory = (history.data ?? []).slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/bibliotecas">
          <ArrowLeft className="h-4 w-4" /> Voltar
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
                Pausada
              </Badge>
            )}
            {data.scrape_ok === false && (
              <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                <AlertTriangle className="h-3 w-3" /> falha na última coleta
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
              <ExternalLink className="h-4 w-4" /> Abrir na Meta
            </a>
          </Button>
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        </div>
      </motion.div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="Anúncios ativos" icon={Layers}>
          <div className="flex items-end justify-between gap-3">
            <CountUp
              value={data.active_ads_count ?? 0}
              className="text-4xl font-bold tracking-tight tabular-nums text-foreground"
            />
            <HourlyTrendBadge trend={trend} />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Variação em relação à última 1h
          </p>
        </SummaryCard>

        <SummaryCard label="Última coleta" icon={Radio}>
          <p className="text-base font-semibold" title={data.captured_at ?? ""}>
            {data.captured_at
              ? formatDistanceToNow(new Date(data.captured_at), {
                  addSuffix: true,
                  locale: ptBR,
                })
              : "—"}
          </p>
          {data.captured_at && (
            <p className="mt-1 text-xs text-muted-foreground">
              {format(new Date(data.captured_at), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
            </p>
          )}
        </SummaryCard>

        <SummaryCard label="Status" icon={Layers}>
          <p className="text-base font-semibold capitalize">{data.status}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.scrape_ok === false ? "Última coleta falhou" : "Mineração saudável"}
          </p>
        </SummaryCard>
      </div>

      {/* Main chart */}
      <Card className="border-border/60 bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Evolução</h2>
            <p className="text-sm text-muted-foreground">
              {mode === "day"
                ? "Média diária de anúncios ativos."
                : "Snapshots crus das últimas 48 horas."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "day" | "hour")}>
              <TabsList>
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="hour">Hora (48h)</TabsTrigger>
              </TabsList>
            </Tabs>
            {mode === "day" && (
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
                    format(new Date(d), "dd/MM HH:mm", { locale: ptBR })
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

      {/* Top creatives */}
      <Card className="border-border/60 bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Top criativos atuais</h2>
            <p className="text-sm text-muted-foreground">
              Do último snapshot, ordenados por número de duplicações.
            </p>
          </div>
        </div>
        {topCreatives.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl shimmer" />
            ))}
          </div>
        ) : (topCreatives.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem criativos no último snapshot.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(topCreatives.data ?? []).map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-background/40 p-3 transition-all hover:border-primary/60",
                  i === 0 ? "border-primary/60 glow-border" : "border-border/60",
                )}
              >
                {i === 0 && (
                  <Badge className="absolute right-2 top-2 z-10 border-0 bg-foreground text-background">
                    #1
                  </Badge>
                )}
                <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                  {c.preview_url ? (
                    <img
                      src={c.preview_url}
                      alt="Criativo"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur">
                    {c.media_type === "video" ? (
                      <Video className="h-3 w-3" />
                    ) : (
                      <ImageIcon className="h-3 w-3" />
                    )}
                    {c.media_type ?? "—"}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    ×{formatNumber(c.duplicate_count ?? 0)}
                  </span>
                  {c.ad_archive_id && (
                    <Button asChild size="sm" variant="ghost">
                      <a
                        href={`https://www.facebook.com/ads/library/?id=${c.ad_archive_id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
                {c.body_text && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{c.body_text}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* History */}
      <Card className="border-border/60 bg-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Histórico de snapshots</h2>
          <p className="text-sm text-muted-foreground">{totalHistory} coletas registradas.</p>
        </div>
        {history.isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl shimmer" />
        ) : pagedHistory.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem snapshots ainda.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Coletado em</th>
                    <th className="py-2 pr-4 font-medium">Ativos</th>
                    <th className="py-2 pr-4 font-medium">Top</th>
                    <th className="py-2 pr-4 font-medium">Únicos</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedHistory.map((s) => (
                    <tr key={s.id} className="border-t border-border/40">
                      <td className="py-2 pr-4" title={s.captured_at}>
                        {format(new Date(s.captured_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
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
                          <span className="text-xs text-success">OK</span>
                        ) : (
                          <span className="text-xs text-warning">{s.error_message || "Falhou"}</span>
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
                  Página {page + 1} de {Math.ceil(totalHistory / pageSize)}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(page + 1) * pageSize >= totalHistory}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
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
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  const max = payload[0].payload?.max;
  const abs =
    mode === "day"
      ? new Date(label).toLocaleDateString("pt-BR")
      : format(new Date(label), "dd/MM HH:mm", { locale: ptBR });
  return (
    <div className="rounded-lg border border-border/60 bg-popover/95 p-3 text-xs shadow-xl backdrop-blur">
      <p className="font-medium text-foreground">{abs}</p>
      <p className="mt-1 text-sm font-semibold text-primary">
        {mode === "day" ? "Média: " : ""}
        {formatNumber(value)}
      </p>
      {mode === "day" && max ? (
        <p className="text-xs text-muted-foreground">Máximo: {formatNumber(max)}</p>
      ) : null}
    </div>
  );
}
