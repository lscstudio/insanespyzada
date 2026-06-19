import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, Crown, Layers, Radio } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
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
import { HourlyTrendBadge } from "@/components/library-card";
import { useDailyStats, useHourlyTrend, useLibrariesLatest } from "@/hooks/use-libraries";
import { formatNumber } from "@/lib/format";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Visão Geral · InsaneSpy" },
      {
        name: "description",
        content: "Você está sendo observado — KPIs e rankings da Meta Ad Library.",
      },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const t = useT();
  const libs = useLibrariesLatest();
  const trends = useHourlyTrend();
  const daily = useDailyStats();
  const [range, setRange] = useState<"7" | "14" | "30">("14");

  const data = libs.data ?? [];
  const dailyData = daily.data ?? [];

  const active = data.filter((l) => l.status === "active");
  const totalAds = data.reduce((s, l) => s + (l.active_ads_count ?? 0), 0);
  const leader = [...data].sort((a, b) => (b.active_ads_count ?? 0) - (a.active_ads_count ?? 0))[0];
  const collections1h = data.filter(
    (l) => l.captured_at && Date.now() - new Date(l.captured_at).getTime() < 3_600_000,
  ).length;

  const topScaled = useMemo(
    () =>
      [...data]
        .sort((a, b) => (b.active_ads_count ?? 0) - (a.active_ads_count ?? 0))
        .slice(0, 10)
        .map((l) => ({
          id: l.id,
          name: l.title || l.search_term || l.page_name || "—",
          value: l.active_ads_count ?? 0,
          niche: l.niche,
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

  const movers = useMemo(() => {
    const tmap = trends.data ?? {};
    return [...data]
      .map((l) => ({ lib: l, trend: tmap[l.id] }))
      .filter((x) => x.trend && x.trend.direction !== "flat")
      .sort((a, b) => Math.abs((b.trend?.delta ?? 0)) - Math.abs((a.trend?.delta ?? 0)))
      .slice(0, 8);
  }, [data, trends.data]);

  const kpis = [
    { label: t("Bibliotecas ativas"), value: active.length, icon: Layers },
    { label: t("Anúncios ativos (soma)"), value: totalAds, icon: Activity },
    {
      label: t("Biblioteca líder"),
      value: leader?.active_ads_count ?? 0,
      icon: Crown,
      sub: leader?.title ?? leader?.search_term ?? leader?.page_name ?? "—",
    },
    { label: t("Coletas na última 1h"), value: collections1h, icon: Radio },
  ];

  const isLoading = libs.isLoading || daily.isLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("Visão Geral")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Panorama em tempo quase real das bibliotecas que você monitora.")}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
            >
              <Card className="relative overflow-hidden border-border/50 bg-card/60 p-5 transition-all hover:border-foreground/20">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {k.label}
                  </p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CountUp
                  value={k.value}
                  className="mt-3 block text-3xl font-bold tracking-tight tabular-nums text-foreground"
                />
                {k.sub && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">{k.sub}</p>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Evolution chart */}
      <Card className="border-border/50 bg-card/60 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t("Evolução de anúncios ativos")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("Soma diária da média de anúncios ativos.")}
            </p>
          </div>
          <Tabs value={range} onValueChange={(v) => setRange(v as "7" | "14" | "30")}>
            <TabsList>
              <TabsTrigger value="7">{t("7 dias")}</TabsTrigger>
              <TabsTrigger value="14">{t("14 dias")}</TabsTrigger>
              <TabsTrigger value="30">{t("30 dias")}</TabsTrigger>
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
                    <stop offset="0%" stopColor="var(--color-foreground)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--color-foreground)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.4} />
                <XAxis
                  dataKey="day"
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--color-foreground)"
                  strokeWidth={1.6}
                  fill="url(#grad-total)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Top scaled + Hourly movers */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RankingCard
          title={t("Mais escaladas")}
          subtitle={t("Top 10 por anúncios ativos")}
          items={topScaled}
        />

        <Card className="border-border/50 bg-card/60 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{t("Movimentação na última 1h")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("Bibliotecas que subiram ou caíram em anúncios ativos.")}
            </p>
          </div>
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-xl shimmer" />
          ) : movers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("Sem variações na última 1h. Tudo estável.")}
            </p>
          ) : (
            <ul className="space-y-2">
              {movers.map(({ lib, trend }, i) => (
                <motion.li
                  key={lib.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    to="/biblioteca/$id"
                    params={{ id: lib.id }}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {lib.title || lib.search_term || lib.page_name || "—"}
                      </p>
                      {lib.niche && (
                        <p className="truncate text-xs text-muted-foreground">{lib.niche}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatNumber(lib.active_ads_count)}
                    </span>
                    <HourlyTrendBadge trend={trend} />
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {data.length === 0 && !isLoading && (
        <Card className="border-dashed border-border/60 bg-card/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("Nenhuma biblioteca ainda. Vá para")}{" "}
            <Link to="/bibliotecas" className="text-foreground underline-offset-4 hover:underline">
              {t("Bibliotecas")}
            </Link>{" "}
            {t("e adicione a primeira.")}
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
}: {
  title: string;
  subtitle: string;
  items: { id: string; name: string; value: number; niche?: string | null }[];
}) {
  const t = useT();
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <Card className="border-border/50 bg-card/60 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("Sem dados ainda.")}</p>
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
                  <span className="w-5 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{it.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatNumber(it.value)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-muted/60">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-foreground/80"
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
      <p className="mt-1 text-sm font-semibold text-foreground">{formatNumber(value)}</p>
    </div>
  );
}
