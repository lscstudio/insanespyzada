import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, Activity, Crown, Layers, Minus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountUp } from "@/components/count-up";
import { useDailyStats, useLibrariesLatest, useLibraryTrend } from "@/hooks/use-libraries";
import { formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Visão Geral · AdSpy Dashboard" },
      {
        name: "description",
        content: "KPIs e rankings da sua inteligência competitiva da Meta Ad Library.",
      },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const libs = useLibrariesLatest();
  const trends = useLibraryTrend();
  const daily = useDailyStats();
  const [range, setRange] = useState<"7" | "14" | "30">("14");

  const data = libs.data ?? [];
  const trendData = trends.data ?? [];
  const dailyData = daily.data ?? [];

  const active = data.filter((l) => l.status === "active");
  const totalAds = data.reduce((s, l) => s + (l.active_ads_count ?? 0), 0);
  const leader = [...data].sort((a, b) => (b.active_ads_count ?? 0) - (a.active_ads_count ?? 0))[0];
  const collections24h = data.filter(
    (l) => l.captured_at && Date.now() - new Date(l.captured_at).getTime() < 86_400_000,
  ).length;

  const libById = useMemo(() => {
    const m = new Map<string, (typeof data)[number]>();
    data.forEach((l) => m.set(l.id, l));
    return m;
  }, [data]);

  const trendByLib = useMemo(() => {
    const m = new Map<string, (typeof trendData)[number]>();
    trendData.forEach((t) => m.set(t.library_id, t));
    return m;
  }, [trendData]);

  const topScaled = useMemo(
    () =>
      [...data]
        .sort((a, b) => (b.active_ads_count ?? 0) - (a.active_ads_count ?? 0))
        .slice(0, 10)
        .map((l) => ({
          id: l.id,
          name: l.search_term || l.page_name || "—",
          value: l.active_ads_count ?? 0,
        })),
    [data],
  );

  const topDuplicates = useMemo(
    () =>
      [...data]
        .sort((a, b) => (b.top_creative_count ?? 0) - (a.top_creative_count ?? 0))
        .slice(0, 10)
        .map((l) => ({
          id: l.id,
          name: l.search_term || l.page_name || "—",
          value: l.top_creative_count ?? 0,
        })),
    [data],
  );

  const evolution = useMemo(() => {
    const days = Number(range);
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));
    cutoff.setUTCHours(0, 0, 0, 0);

    const buckets = new Map<string, number>();
    for (const s of dailyData) {
      const day = s.day;
      if (new Date(day) < cutoff) continue;
      buckets.set(day, (buckets.get(day) ?? 0) + Number(s.avg_active_ads ?? 0));
    }
    // Fill missing days
    const out: { day: string; total: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      d.setUTCHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      out.push({ day: key, total: Math.round(buckets.get(key) ?? 0) });
    }
    return out;
  }, [dailyData, range]);

  const biggestVariations = useMemo(() => {
    return [...trendData]
      .filter((t) => t.delta !== null && libById.has(t.library_id))
      .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))
      .slice(0, 8);
  }, [trendData, libById]);

  const kpis = [
    { label: "Bibliotecas ativas", value: active.length, icon: Layers },
    { label: "Anúncios ativos (soma)", value: totalAds, icon: Activity },
    {
      label: "Biblioteca líder",
      value: leader?.active_ads_count ?? 0,
      icon: Crown,
      sub: leader?.search_term ?? leader?.page_name ?? "—",
    },
    { label: "Coletas nas últimas 24h", value: collections24h, icon: Activity },
  ];

  const isLoading = libs.isLoading || trends.isLoading || daily.isLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Panorama em tempo quase real das bibliotecas que você monitora.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Card className="relative overflow-hidden border-border/60 bg-card p-5">
                <div className="flex items-start justify-between">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {k.label}
                  </p>
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <CountUp
                    value={k.value}
                    className="text-3xl font-bold tracking-tight text-foreground"
                  />
                </div>
                {k.sub && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">{k.sub}</p>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Evolution chart */}
      <Card className="border-border/60 bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Evolução de anúncios ativos</h2>
            <p className="text-sm text-muted-foreground">
              Soma diária da média de anúncios ativos de todas as bibliotecas.
            </p>
          </div>
          <Tabs value={range} onValueChange={(v) => setRange(v as "7" | "14" | "30")}>
            <TabsList>
              <TabsTrigger value="7">7 dias</TabsTrigger>
              <TabsTrigger value="14">14 dias</TabsTrigger>
              <TabsTrigger value="30">30 dias</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="h-[280px]">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-xl shimmer" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolution} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-total" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(270 90% 70%)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(190 90% 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border) / 0.3)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(270 90% 70%)"
                  strokeWidth={2}
                  fill="url(#grad-total)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Rankings */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RankingCard
          title="Mais escaladas"
          subtitle="Top 10 por anúncios ativos"
          items={topScaled}
          color="primary"
        />
        <RankingCard
          title="Mais duplicação de criativo"
          subtitle="Top 10 por contagem do criativo líder"
          items={topDuplicates}
          color="accent"
        />
      </div>

      {/* Variations table */}
      <Card className="border-border/60 bg-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Maiores variações 24h</h2>
          <p className="text-sm text-muted-foreground">
            Comparado ao snapshot anterior de cada biblioteca.
          </p>
        </div>
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl shimmer" />
        ) : biggestVariations.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem dados de tendência ainda — aguarde a segunda coleta do robô.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Biblioteca</th>
                  <th className="py-2 pr-4 font-medium">Atual</th>
                  <th className="py-2 pr-4 font-medium">Anterior</th>
                  <th className="py-2 pr-4 font-medium">Variação</th>
                </tr>
              </thead>
              <tbody>
                {biggestVariations.map((t) => {
                  const lib = libById.get(t.library_id);
                  const dir = t.trend_direction;
                  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
                  const color =
                    dir === "up"
                      ? "text-success"
                      : dir === "down"
                        ? "text-destructive"
                        : "text-muted-foreground";
                  return (
                    <tr key={t.library_id} className="border-t border-border/40">
                      <td className="py-3 pr-4">
                        <Link
                          to="/biblioteca/$id"
                          params={{ id: t.library_id }}
                          className="font-medium hover:text-primary"
                        >
                          {lib?.search_term || lib?.page_name || "—"}
                        </Link>
                        {lib?.niche && (
                          <p className="text-xs text-muted-foreground">{lib.niche}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-semibold">
                        {formatNumber(t.current_active_ads)}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatNumber(t.previous_active_ads)}
                      </td>
                      <td className={cn("py-3 pr-4 font-medium", color)}>
                        <span className="inline-flex items-center gap-1">
                          <Icon className="h-3.5 w-3.5" />
                          {t.delta && t.delta > 0 ? "+" : ""}
                          {formatNumber(t.delta)} ({formatPercent(Number(t.delta_pct))})
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data.length === 0 && !isLoading && (
        <Card className="border-dashed border-border/60 bg-card/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma biblioteca ainda. Vá para{" "}
            <Link to="/bibliotecas" className="text-primary underline-offset-4 hover:underline">
              Bibliotecas
            </Link>{" "}
            e adicione a primeira, ou use{" "}
            <Link to="/configuracoes" className="text-primary underline-offset-4 hover:underline">
              Configurações
            </Link>{" "}
            para inserir dados de demonstração.
          </p>
        </Card>
      )}
    </div>
  );
}

function RankingCard({
  title,
  subtitle,
  items,
  color,
}: {
  title: string;
  subtitle: string;
  items: { id: string; name: string; value: number }[];
  color: "primary" | "accent";
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const gradient =
    color === "primary"
      ? "from-violet-500/80 to-primary"
      : "from-cyan-400/80 to-accent";

  return (
    <Card className="border-border/60 bg-card p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Sem dados ainda.</p>
      ) : (
        <ol className="space-y-2">
          {items.map((it, i) => {
            const pct = (it.value / max) * 100;
            return (
              <motion.li
                key={it.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  to="/biblioteca/$id"
                  params={{ id: it.id }}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40"
                >
                  <span className="w-5 shrink-0 text-xs font-medium text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{it.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatNumber(it.value)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted/60">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className={cn("h-full rounded-full bg-gradient-to-r", gradient)}
                      />
                    </div>
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  const abs = label ? new Date(label).toLocaleDateString("pt-BR") : "";
  const rel = label
    ? formatDistanceToNow(new Date(label), { addSuffix: true, locale: ptBR })
    : "";
  return (
    <div className="rounded-lg border border-border/60 bg-popover/95 p-3 text-xs shadow-xl backdrop-blur">
      <p className="font-medium text-foreground">{abs}</p>
      <p className="text-muted-foreground">{rel}</p>
      <p className="mt-1 text-sm font-semibold text-primary">{formatNumber(value)} anúncios</p>
    </div>
  );
}
