import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useState } from "react";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clearDemoData, seedDemoData } from "@/lib/seed.functions";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · AdSpy Dashboard" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const seed = useServerFn(seedDemoData);
  const clear = useServerFn(clearDemoData);
  const qc = useQueryClient();
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [loadingClear, setLoadingClear] = useState(false);

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ferramentas administrativas e dados de demonstração.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border/60 bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-violet-cyan shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Dados de demonstração</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Insere 3 bibliotecas de exemplo (Saúde, Educação e Finanças) com 14 dias de
                snapshots fictícios e criativos. Útil apenas para visualizar os gráficos.
                Marcadas com <code className="rounded bg-muted px-1 text-xs">[DEMO]</code> nas
                observações.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={handleSeed}
                  disabled={loadingSeed}
                  className="gradient-violet-cyan text-white"
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

      <Card className="border-border/60 bg-card p-6">
        <h2 className="text-lg font-semibold">Coletor externo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Este painel apenas <strong>lê</strong> os dados de <code>library_latest</code>,{" "}
          <code>library_trend</code> e <code>daily_library_stats</code>. As tabelas{" "}
          <code>snapshots</code> e <code>creatives</code> são escritas pelo coletor externo usando
          a chave privilegiada (service_role) — RLS é ignorada nesse caminho.
        </p>
      </Card>
    </div>
  );
}
