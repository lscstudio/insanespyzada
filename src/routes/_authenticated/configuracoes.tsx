import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Tags,
  Trash2,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useCreateNiche,
  useDeleteNiche,
  useNiches,
  useUpdateNiche,
} from "@/hooks/use-libraries";
import { clearDemoData, seedDemoData } from "@/lib/seed.functions";
import { triggerCollection } from "@/lib/collect.functions";
import { checkIsAdmin } from "@/lib/admin.functions";
import type { CollectReport } from "@/lib/collect.server";
import { useT } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";


export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · InsaneSpy" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const t = useT();
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
      toast.success(t("Dados de demonstração inseridos"), {
        description: `${res.count} ${t("bibliotecas")}.`,
      });
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(t("Falha ao inserir dados demo"), {
        description: e instanceof Error ? e.message : t("Erro desconhecido"),
      });
    } finally {
      setLoadingSeed(false);
    }
  }

  async function handleClear() {
    setLoadingClear(true);
    try {
      await clear();
      toast.success(t("Dados de demonstração removidos"));
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(t("Falha ao limpar dados demo"), {
        description: e instanceof Error ? e.message : t("Erro desconhecido"),
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
        toast.info(t("Nenhuma biblioteca ativa para coletar"));
      } else if (report.libraries_failed === 0) {
        toast.success(t("Coleta concluída"), {
          description: `${report.libraries_ok} ${t("biblioteca(s) atualizadas")}.`,
        });
      } else {
        toast.warning(`${report.libraries_ok} ok · ${report.libraries_failed} ${t("falha(s)")}`);
      }
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(t("Falha na coleta"), {
        description: e instanceof Error ? e.message : t("Erro desconhecido"),
      });
    } finally {
      setCollecting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("Configurações")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Coletor, nichos e dados de demonstração.")}
        </p>
      </div>

      {/* Coletor */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border/50 bg-card/60 p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/60 bg-background/50">
              <Zap className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{t("Coletor da Meta Ad Library")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Roda automaticamente a cada 4 horas. Dispare uma coleta imediata abaixo.")}
              </p>
              <div className="mt-4">
                <Button onClick={handleCollect} disabled={collecting}>
                  {collecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {collecting ? t("Coletando...") : t("Coletar agora")}
                </Button>
              </div>

              {lastReport && (
                <div className="mt-5 rounded-xl border border-border/50 bg-background/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{t("Última coleta")}</p>
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
                            ? `${d.active_ads_count} ${t("ativos")} · ${d.unique_creatives} ${t("únicos")}`
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

      {/* Nichos */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
      >
        <NichesManager />
      </motion.div>

      {/* Demo */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <Card className="border-border/50 bg-card/60 p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/60 bg-background/50">
              <Sparkles className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{t("Dados de demonstração")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Insere 3 bibliotecas de exemplo com 14 dias de snapshots fictícios.")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={handleSeed} disabled={loadingSeed} variant="outline">
                  {loadingSeed && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Sparkles className="h-4 w-4" /> {t("Inserir bibliotecas demo")}
                </Button>
                <Button onClick={handleClear} disabled={loadingClear} variant="outline">
                  {loadingClear && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Trash2 className="h-4 w-4" /> {t("Remover dados demo")}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function NichesManager() {
  const t = useT();
  const niches = useNiches();
  const create = useCreateNiche();
  const update = useUpdateNiche();
  const del = useDeleteNiche();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      await create.mutateAsync(name);
      setNewName("");
      toast.success(t("Nicho criado"));
    } catch (err) {
      toast.error(t("Não foi possível criar"), {
        description: err instanceof Error ? err.message : t("Erro desconhecido"),
      });
    }
  }

  async function handleSaveEdit(id: string, previousName: string) {
    const name = editingValue.trim();
    if (!name || name === previousName) {
      setEditingId(null);
      return;
    }
    try {
      await update.mutateAsync({ id, name, previousName });
      setEditingId(null);
      toast.success(t("Nicho atualizado"));
    } catch (err) {
      toast.error(t("Não foi possível atualizar"), {
        description: err instanceof Error ? err.message : t("Erro desconhecido"),
      });
    }
  }

  async function handleDelete(id: string, name: string) {
    try {
      await del.mutateAsync({ id, name });
      toast.success(t("Nicho excluído"));
    } catch (err) {
      toast.error(t("Não foi possível excluir"), {
        description: err instanceof Error ? err.message : t("Erro desconhecido"),
      });
    }
  }

  return (
    <Card className="border-border/50 bg-card/60 p-6">
      <div className="flex items-start gap-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/60 bg-background/50">
          <Tags className="h-5 w-5 text-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{t("Nichos")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Crie, edite e exclua os nichos disponíveis ao adicionar bibliotecas.")}
          </p>

          <form onSubmit={handleCreate} className="mt-4 flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("Ex.: Saúde, Coaching, Imobiliário…")}
              maxLength={80}
            />
            <Button type="submit" disabled={create.isPending || !newName.trim()}>
              {create.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t("Adicionar")}
            </Button>
          </form>

          <div className="mt-5">
            {niches.isLoading ? (
              <p className="text-sm text-muted-foreground">{t("Carregando…")}</p>
            ) : (niches.data ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                {t("Nenhum nicho ainda. Crie o primeiro acima.")}
              </p>
            ) : (
              <ul className="divide-y divide-border/40 rounded-xl border border-border/50 bg-background/30">
                {(niches.data ?? []).map((n) => (
                  <li key={n.id} className="flex items-center gap-2 px-3 py-2">
                    {editingId === n.id ? (
                      <>
                        <Input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="h-9"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(n.id, n.name);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                        <Button size="sm" onClick={() => handleSaveEdit(n.id, n.name)}>
                          {t("Salvar")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 truncate text-sm font-medium">{n.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingId(n.id);
                            setEditingValue(n.name);
                          }}
                          aria-label={`${t("Editar")} ${n.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDelete(n.id, n.name)}
                          aria-label={`${t("Excluir")} ${n.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
