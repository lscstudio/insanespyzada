import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Flame, LibraryBig, Layers, ArrowRight, Plus } from "lucide-react";
import { useStore } from "../lib/store";
import { PLANS } from "../lib/plans";
import { num } from "../lib/format";
import { trendOf } from "../lib/mock";
import { Stat, SectionTitle, Card, Badge, TrendBadge, Button } from "../components/ui";
import { PremiumLineChart } from "../components/PremiumLineChart";
import { CreativeThumb } from "../components/CreativeThumb";

export function Home() {
  const { libraries, plan, session, aggregatedDaily, aggregatedLoading } = useStore();
  const p = PLANS[plan];

  const totalAds = libraries.reduce((acc, l) => acc + l.activeAds, 0);
  const totalCreatives = libraries.reduce((acc, l) => acc + l.uniqueCreatives, 0);
  const escalating = libraries.filter((l) => l.isEscalating);
  const favorites = libraries.filter((l) => l.favorite);

  // série agregada — usa `daily_library_stats` (real) quando disponível;
  // senão faz fallback a partir das snapshots internas de cada biblioteca.
  const aggregate = useMemo(() => {
    if (aggregatedDaily.length > 0) return aggregatedDaily;
    if (libraries.length === 0) return [];
    const longest = libraries.reduce((m, l) => (l.snapshots.length > m ? l : m));
    return longest.snapshots.map((s, i) => ({
      t: s.t,
      activeAds: libraries.reduce((acc, l) => acc + (l.snapshots[i]?.activeAds ?? 0), 0),
      uniqueCreatives: libraries.reduce(
        (acc, l) => acc + (l.snapshots[i]?.uniqueCreatives ?? 0),
        0,
      ),
    }));
  }, [aggregatedDaily, libraries]);

  const topEscalating = [...libraries]
    .filter((l) => l.isEscalating)
    .sort((a, b) => b.escalationScore - a.escalationScore)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* saudação */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand dark:text-brand-bright">
            Visão geral
          </div>
          <h1 className="mt-1 text-2xl font-extrabold uppercase tracking-tight">
            Radar ativo{session ? `, ${session.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-xs text-ink-2 dark:text-dink-2">
            Monitoramento 24/7 · push a cada {p.pushIntervalMin}min · plano{" "}
            <span className="font-bold text-brand dark:text-brand-bright">{p.name}</span>
          </p>
        </div>
        <Link to="/bibliotecas">
          <Button>
            <Plus size={13} /> Adicionar biblioteca
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          label="Bibliotecas monitoradas"
          value={num(libraries.length)}
          sub={`limite: ${p.librariesLimit === Infinity ? "∞" : p.librariesLimit}`}
        />
        <Stat label="Anúncios ativos" value={num(totalAds)} sub="soma de todas as bibliotecas" />
        <Stat
          label="Criativos únicos"
          value={num(totalCreatives)}
          sub="criativos distintos rodando"
        />
        <Stat
          label="Escalando agora"
          value={num(escalating.length)}
          sub="bibliotecas em escalação"
          accent
        />
      </div>

      {/* gráfico agregado — premium line chart */}
      <PremiumLineChart
        data={aggregate}
        showFilters
        defaultWindow={30}
        labelFormat="day"
        title="Evolução de anúncios ativos"
        subtitle={`${num(totalAds)} ativos agora · consolidado de todas as bibliotecas`}
        height={300}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* escalando agora */}
        <Card className="p-6">
          <SectionTitle
            kicker="sinal_quente"
            title="Escalando agora"
            right={
              <Link
                to="/bibliotecas"
                className="text-[10px] font-bold uppercase tracking-wider text-brand hover:underline dark:text-brand-bright"
              >
                ver todas →
              </Link>
            }
          />
          {topEscalating.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-3 dark:text-dink-3">
              Nenhuma biblioteca escalando no momento.
            </div>
          ) : (
            <div className="space-y-2">
              {topEscalating.map((l) => (
                <Link
                  key={l.id}
                  to={`/biblioteca/${l.id}`}
                  className="flex items-center gap-3 border border-line p-2.5 transition-colors hover:border-brand dark:border-dline dark:hover:border-brand-bright"
                >
                  <CreativeThumb
                    hue={l.creatives[0]?.hue ?? 220}
                    type={l.creatives[0]?.type ?? "image"}
                    className="h-10 w-14 shrink-0"
                    showType={false}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-extrabold uppercase tracking-wide">
                      {l.pageName}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-ink-3 dark:text-dink-3">
                      {l.niche} · score {l.escalationScore}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold tabular-nums">{num(l.activeAds)}</div>
                    <div className="text-[9px] uppercase tracking-widest text-ink-3 dark:text-dink-3">
                      ads
                    </div>
                  </div>
                  <Badge tone="escalating">
                    <Flame size={10} />
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* favoritas + atalhos */}
        <div className="space-y-6">
          <Card className="p-6">
            <SectionTitle kicker="acesso_rapido" title="Favoritas" />
            {favorites.length === 0 ? (
              <div className="py-6 text-center text-xs text-ink-3 dark:text-dink-3">
                Favorite bibliotecas com a estrela para vê-las aqui.
              </div>
            ) : (
              <div className="space-y-2">
                {favorites.slice(0, 4).map((l) => (
                  <Link
                    key={l.id}
                    to={`/biblioteca/${l.id}`}
                    className="flex items-center justify-between border border-line px-3 py-2 text-xs transition-colors hover:border-brand dark:border-dline dark:hover:border-brand-bright"
                  >
                    <span className="font-bold uppercase tracking-wide">{l.pageName}</span>
                    <span className="flex items-center gap-2">
                      <TrendBadge trend={trendOf(l)} />
                      <span className="font-extrabold tabular-nums">{num(l.activeAds)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card className="flex items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center border border-line text-ink-2 dark:border-dline dark:text-dink-2">
                <Layers size={16} />
              </span>
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wide">Swipe curado</div>
                <div className="text-[11px] text-ink-2 dark:text-dink-2">
                  Criativos aprovados pela curadoria, ordenados por score.
                </div>
              </div>
            </div>
            <Link to="/swipe">
              <Button variant={plan === "free" ? "outline" : "primary"}>
                {plan === "free" ? "Bloqueado" : "Abrir"} <ArrowRight size={12} />
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      {/* atalho bibliotecas */}
      <div className="flex items-center justify-between border border-line bg-card px-4 py-3 text-xs dark:border-dline dark:bg-dcard">
        <span className="flex items-center gap-2 text-ink-2 dark:text-dink-2">
          <LibraryBig size={14} className="text-brand dark:text-brand-bright" />
          {num(libraries.length)} bibliotecas sob monitoramento contínuo
        </span>
        <Link
          to="/bibliotecas"
          className="font-bold uppercase tracking-wider text-brand hover:underline dark:text-brand-bright"
        >
          gerenciar →
        </Link>
      </div>
    </div>
  );
}
