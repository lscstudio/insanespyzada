import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, Sparkles, Trash2, XCircle, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clearDemoData, seedDemoData } from "@/lib/seed.functions";
import { triggerCollection } from "@/lib/collect.functions";
import type { CollectReport } from "@/lib/collect.server";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · AdSpy Dashboard" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const seed = useServerFn(seedDemoData);
  const clear = useServerFn(clearDemoData);
  const collect = useServerFn(triggerCollection);
  const qc = useQueryClient();
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [loadingClear, setLoadingClear] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [lastReport, setLastReport] = useState<CollectReport | null>(null);

  async function handleSeed() {
    setLoadingSeed(true);
    try {
      const res = await seed();
      toast.success("Dados de demonstração inseridos", {
        description: `${res.count} bibliotecas com 14 dias de snapshots.`,
      });
      await qc.invalidateQueries();
    } catch (e) {
      toast.error("Falha ao inserir dados demo", {
        description: e instanceof Error ? e.message : "Erro desconhecido",
      });
    } finally {
      setLoadingSeed(false);
    }
  }

  async function handleClear() {
    setLoadingClear(true);
    try {
      await clear();
      toast.success("Dados de demonstração removidos");
      await qc.invalidateQueries();
    } catch (e) {
      toast.error("Falha ao limpar dados demo", {
        description: e instanceof Error ? e.message : "Erro desconhecido",
      });
    } finally {
      setLoadingClear(false);
    }
  }

  async function handleCollect() {
    setCollecting(true);
    try {
      const report = await collect({ data: {} });
      setLastReport(report);
      if (report.libraries_total === 0) {
        toast.info("Nenhuma biblioteca ativa para coletar");
      } else if (report.libraries_failed === 0) {
        toast.success(`Coleta concluída em ${(report.duration_ms / 1000).toFixed(1)}s`, {
          description: `${report.libraries_ok} biblioteca(s) atualizadas.`,
        });
      } else {
        toast.warning(`Coleta parcial: ${report.libraries_ok} ok, ${report.libraries_failed} falha(s)`);
      }
      await qc.invalidateQueries();
    } catch (e) {
      toast.error("Falha na coleta", {
        description: e instanceof Error ? e.message : "Erro desconhecido",
      });
    } finally {
      setCollecting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ferramentas administrativas, coletor e dados de demonstração.
        </p>
      </div>

      {/* Coletor */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border/60 bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Coletor da Meta Ad Library</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Roda automaticamente a cada 4 horas via cron. Você também pode disparar uma coleta
                imediata. Requer a chave <code className="rounded bg-muted px-1 text-xs">FIRECRAWL_API_KEY</code>{" "}
                configurada no backend (responsável por renderizar a página da Meta).
              </p>
              <div className="mt-4">
                <Button
                  onClick={handleCollect}
                  disabled={collecting}
                  className="gradient-violet-cyan text-white shadow-lg shadow-primary/20"
                >
                  {collecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {collecting ? "Coletando..." : "Coletar agora"}
                </Button>
              </div>

              {lastReport && (
                <div className="mt-5 rounded-xl border border-border/60 bg-background/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Última coleta</p>
                    <span className="text-xs text-muted-foreground">
                      {(lastReport.duration_ms / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {lastReport.details.map((d) => (
                      <div
                        key={d.library_id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {d.ok ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                          ) : (
                            <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                          )}
                          <span className="truncate">{d.label}</span>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {d.ok
                            ? `${d.active_ads_count} ativos · ${d.unique_creatives} únicos`
                            : d.error?.slice(0, 60)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Demo */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="border-border/60 bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-violet-cyan shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Dados de demonstração</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Insere 3 bibliotecas de exemplo (Saúde, Educação e Finanças) com 14 dias de
                snapshots fictícios. Útil para visualizar os gráficos antes da coleta real.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={handleSeed}
                  disabled={loadingSeed}
                  variant="outline"
                  className="border-border/60"
                >
                  {loadingSeed && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Sparkles className="h-4 w-4" /> Inserir 3 bibliotecas demo
                </Button>
                <Button onClick={handleClear} disabled={loadingClear} variant="outline">
                  {loadingClear && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Trash2 className="h-4 w-4" /> Remover dados demo
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
