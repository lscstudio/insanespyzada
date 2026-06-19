import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  Loader2, Activity, KeyRound, Coins, Zap, CheckCircle2, XCircle, AlertTriangle,
  Users, ArrowLeft, ExternalLink, TrendingUp, Trophy, RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { checkIsAdmin, listLibrariesForAccount } from "@/lib/admin.functions";
import { getApiPoolStatus, getUsageRanking, type ApiKeyStatus } from "@/lib/admin-keys.functions";
import { cn } from "@/lib/utils";
import { useLang, useT, tf } from "@/lib/i18n";

function NotFoundView() {
  const t = useT();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">{t("Página não encontrada")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("A página que você procura não existe.")}</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md gradient-violet-cyan px-4 py-2 text-sm font-medium text-white">
            {t("Voltar ao início")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/painel")({
  component: PainelPage,
  notFoundComponent: NotFoundView,
  errorComponent: NotFoundView,
});

function PainelPage() {
  const checkFn = useServerFn(checkIsAdmin);
  const guard = useQuery({
    queryKey: ["admin", "isAdmin"],
    queryFn: () => checkFn({}),
    staleTime: 60_000,
    retry: false,
  });

  if (guard.isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!guard.data?.isAdmin || guard.isError) return <NotFoundView />;

  return <PainelContent />;
}

function PainelContent() {
  const t = useT();
  const apiFn = useServerFn(getApiPoolStatus);
  const usageFn = useServerFn(getUsageRanking);

  const apiQ = useQuery({
    queryKey: ["admin", "api-pool"],
    queryFn: () => apiFn({}),
    refetchInterval: 60_000,
  });
  const usageQ = useQuery({
    queryKey: ["admin", "usage-ranking"],
    queryFn: () => usageFn({}),
    refetchInterval: 60_000,
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Painel Administrativo")}</h1>
          <p className="text-sm text-muted-foreground">{t("APIs, créditos e uso por conta — atualizado em tempo real.")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { apiQ.refetch(); usageQ.refetch(); }}
          disabled={apiQ.isFetching || usageQ.isFetching}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", (apiQ.isFetching || usageQ.isFetching) && "animate-spin")} />
          {t("Atualizar")}
        </Button>
      </header>

      <Tabs defaultValue="apis" className="space-y-6">
        <TabsList>
          <TabsTrigger value="apis"><Zap className="mr-1.5 h-4 w-4" />{t("APIs")}</TabsTrigger>
          <TabsTrigger value="contas"><Users className="mr-1.5 h-4 w-4" />{t("Contas")}</TabsTrigger>
        </TabsList>

        <TabsContent value="apis" className="space-y-6">
          <ApiOverview query={apiQ} />
        </TabsContent>

        <TabsContent value="contas" className="space-y-6">
          <UsagePanel query={usageQ} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ APIs ============

function MetricCard({
  icon: Icon, label, value, sub, accent,
}: { icon: any; label: string; value: React.ReactNode; sub?: string; accent?: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className={cn("grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary", accent)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function ApiOverview({ query }: { query: ReturnType<typeof useQuery<any>> }) {
  const t = useT();
  const { lang } = useLang();
  const locale = lang === "en" ? "en-US" : "pt-BR";
  if (query.isLoading) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (query.error) {
    return <Card><CardContent className="p-4 text-sm text-destructive">{(query.error as Error).message}</CardContent></Card>;
  }
  const data = query.data as { keys: ApiKeyStatus[]; summary: any };
  const { keys, summary } = data;

  const pieData = [
    { name: "Firecrawl", value: summary.firecrawl_credits, color: "hsl(280 80% 60%)" },
    { name: "ScraperAPI", value: summary.scraperapi_credits, color: "hsl(190 80% 55%)" },
  ];

  const barData = keys
    .filter((k) => k.configured)
    .map((k) => ({ name: k.label, credits: k.credits ?? 0, fill: k.provider === "firecrawl" ? "hsl(280 80% 60%)" : "hsl(190 80% 55%)" }));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={KeyRound} label={t("APIs Conectadas")} value={`${summary.configured}/${summary.total_slots}`} sub={`${summary.broken} ${t("com erro")}`} />
        <MetricCard icon={CheckCircle2} label={t("Funcionando")} value={summary.working} sub={`${t("de")} ${summary.configured} ${t("configuradas")}`} accent="bg-emerald-500/10 text-emerald-500" />
        <MetricCard icon={Activity} label={t("Em Uso")} value={summary.working} sub={t("pool ativo c/ failover")} accent="bg-amber-500/10 text-amber-500" />
        <MetricCard icon={Coins} label={t("Créditos Totais")} value={summary.total_credits.toLocaleString(locale)} sub={`FC ${summary.firecrawl_credits.toLocaleString(locale)} · SA ${summary.scraperapi_credits.toLocaleString(locale)}`} accent="bg-violet-500/10 text-violet-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">{t("Créditos por chave")}</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 12, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="credits" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("Distribuição por provider")}</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("Status detalhado das chaves")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {keys.map((k) => <KeyRow key={k.name} k={k} />)}
        </CardContent>
      </Card>
    </>
  );
}

function KeyRow({ k }: { k: ApiKeyStatus }) {
  const t = useT();
  const { lang } = useLang();
  const locale = lang === "en" ? "en-US" : "pt-BR";
  const statusBadge = !k.configured
    ? <Badge variant="outline" className="gap-1 text-muted-foreground"><AlertTriangle className="h-3 w-3" />{t("Vazia")}</Badge>
    : k.working
      ? <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20"><CheckCircle2 className="h-3 w-3" />{t("Online")}</Badge>
      : <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{t("Falha")}</Badge>;

  const pct = k.limit && k.limit > 0 ? Math.min(100, ((k.used ?? 0) / k.limit) * 100) : null;
  const providerDot = k.provider === "firecrawl" ? "bg-violet-500" : "bg-cyan-500";

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={cn("h-2.5 w-2.5 rounded-full", providerDot)} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{k.label}</span>
              {statusBadge}
            </div>
            <div className="text-xs text-muted-foreground font-mono truncate">{k.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          {k.latency_ms !== null && (
            <div className="text-xs text-muted-foreground">{k.latency_ms}ms</div>
          )}
          <div>
            <div className="text-lg font-semibold tabular-nums">
              {k.credits !== null ? k.credits.toLocaleString(locale) : "—"}
            </div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{t("créditos")}</div>
          </div>
        </div>
      </div>
      {pct !== null && (
        <div className="mt-2">
          <Progress value={pct} className="h-1.5" />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>{(k.used ?? 0).toLocaleString(locale)} {t("usados")}</span>
            <span>{(k.limit ?? 0).toLocaleString(locale)} {t("total")}</span>
          </div>
        </div>
      )}
      {k.error && <div className="mt-2 text-xs text-destructive">{k.error}</div>}
    </div>
  );
}

// ============ Contas ============

function UsagePanel({ query }: { query: ReturnType<typeof useQuery<any>> }) {
  const [selected, setSelected] = useState<{ id: string; email: string } | null>(null);
  const [filter, setFilter] = useState("");

  if (query.isLoading) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (query.error) {
    return <Card><CardContent className="p-4 text-sm text-destructive">{(query.error as Error).message}</CardContent></Card>;
  }

  const { accounts, series, totals } = query.data as any;

  if (selected) return <AccountDetail user={selected} onBack={() => setSelected(null)} />;

  const filtered = accounts.filter((a: any) => a.email.toLowerCase().includes(filter.toLowerCase()));
  const top5 = accounts.slice(0, 5);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Users} label="Contas" value={totals.total_accounts} />
        <MetricCard icon={Activity} label="Bibliotecas" value={totals.total_libraries} accent="bg-cyan-500/10 text-cyan-500" />
        <MetricCard icon={TrendingUp} label="Coletas (30d)" value={totals.total_scrapes_30d.toLocaleString("pt-BR")} accent="bg-emerald-500/10 text-emerald-500" />
        <MetricCard icon={Coins} label="Créditos consumidos (30d)" value={totals.total_credits_used_30d.toLocaleString("pt-BR")} accent="bg-violet-500/10 text-violet-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Coletas por dia (últimos 30 dias)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-scrapes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(280 80% 60%)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(280 80% 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="hsl(280 80% 60%)" fill="url(#g-scrapes)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-amber-500" />Top consumidores (30d)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {top5.map((a: any, i: number) => (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-card/30 p-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn(
                    "grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold",
                    i === 0 ? "bg-amber-500/20 text-amber-500" :
                    i === 1 ? "bg-zinc-400/20 text-zinc-400" :
                    i === 2 ? "bg-orange-600/20 text-orange-500" :
                    "bg-muted text-muted-foreground"
                  )}>{i + 1}</span>
                  <span className="truncate text-sm">{a.email || "(sem email)"}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums">{a.credits_used_30d}</span>
              </div>
            ))}
            {top5.length === 0 && <div className="text-center text-xs text-muted-foreground py-4">Sem dados ainda.</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Todas as contas</CardTitle>
          <Input
            placeholder="Filtrar por email..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 max-w-xs"
          />
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.map((a: any) => (
            <button
              key={a.id}
              onClick={() => setSelected({ id: a.id, email: a.email })}
              className="group flex w-full items-center justify-between rounded-lg border border-border/60 bg-card/40 p-3 text-left transition hover:border-primary/50 hover:bg-card"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a.email || "(sem email)"}</div>
                <div className="text-[11px] text-muted-foreground">
                  {a.libraries_count} bibliotecas · {a.scrapes_30d} coletas/30d
                  {a.last_sign_in_at && <> · último login {new Date(a.last_sign_in_at).toLocaleDateString("pt-BR")}</>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-base font-semibold tabular-nums">{a.credits_used_30d}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">créditos 30d</div>
                </div>
                <span className="text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100">Ver →</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function AccountDetail({ user, onBack }: { user: { id: string; email: string }; onBack: () => void }) {
  const listFn = useServerFn(listLibrariesForAccount);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "libraries", user.id],
    queryFn: () => listFn({ data: { userId: user.id } }),
    refetchInterval: 60_000,
  });
  const totalAds = (data ?? []).reduce((acc: number, l: any) => acc + (l.active_ads_count ?? 0), 0);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Button>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{user.email}</h2>
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} bibliotecas · {totalAds} anúncios ativos</p>
      </div>
      {isLoading && <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
      {error && <Card><CardContent className="p-4 text-sm text-destructive">{(error as Error).message}</CardContent></Card>}
      <div className="grid gap-2">
        {(data ?? []).map((l: any) => (
          <div key={l.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{l.page_name || l.search_term || "Sem nome"}</span>
                {l.niche && <Badge variant="outline" className="text-xs">{l.niche}</Badge>}
                <Badge variant={l.status === "active" ? "default" : "secondary"} className="text-xs">{l.status}</Badge>
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {l.last_captured_at ? `Última coleta: ${new Date(l.last_captured_at).toLocaleString("pt-BR")}` : "Sem coletas"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg font-semibold tabular-nums">{l.active_ads_count}</div>
                <div className="text-[10px] uppercase text-muted-foreground">ads ativos</div>
              </div>
              {l.url && <a href={l.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-4 w-4" /></a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
