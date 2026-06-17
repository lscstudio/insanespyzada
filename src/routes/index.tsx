import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Library, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/count-up";
import { useLibrariesLatest, useLibraryTrend } from "@/hooks/use-libraries";

export const Route = createFileRoute("/")({
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

  const data = libs.data ?? [];
  const active = data.filter((l) => l.status === "active");
  const totalAds = data.reduce((s, l) => s + (l.active_ads_count ?? 0), 0);
  const leader = [...data].sort((a, b) => (b.active_ads_count ?? 0) - (a.active_ads_count ?? 0))[0];

  const kpis = [
    { label: "Bibliotecas ativas", value: active.length },
    { label: "Anúncios ativos (soma)", value: totalAds },
    {
      label: "Biblioteca líder",
      value: leader?.active_ads_count ?? 0,
      sub: leader?.search_term ?? leader?.page_name ?? "—",
    },
    { label: "Coletas nas últimas 24h", value: data.length * 24 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Panorama em tempo quase real das bibliotecas que você monitora.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/bibliotecas">
            Ver bibliotecas <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Card className="border-border/60 bg-card p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <div className="mt-2 flex items-baseline gap-2">
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
        ))}
      </div>

      <Card className="border-border/60 bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl gradient-violet-cyan">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Próximos passos</h2>
            <p className="text-sm text-muted-foreground">
              Os rankings, gráficos de evolução e variações 24h chegam na próxima etapa.
              Comece adicionando bibliotecas em{" "}
              <Link to="/bibliotecas" className="text-primary underline-offset-4 hover:underline">
                <Library className="inline h-3.5 w-3.5" /> Bibliotecas
              </Link>
              .
            </p>
          </div>
        </div>
      </Card>

      {trends.isLoading && <p className="text-xs text-muted-foreground">Carregando tendências…</p>}
    </div>
  );
}
