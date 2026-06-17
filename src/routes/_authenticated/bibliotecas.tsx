import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { LayoutGrid, List, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LibraryCard } from "@/components/library-card";
import { AddLibraryModal } from "@/components/add-library-modal";
import { useHourlyTrend, useLibrariesLatest, useNiches } from "@/hooks/use-libraries";
import { LANGUAGES } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/bibliotecas")({
  head: () => ({
    meta: [
      { title: "Bibliotecas · AdSpy Dashboard" },
      {
        name: "description",
        content: "Todas as bibliotecas monitoradas com filtros, busca e ações.",
      },
    ],
  }),
  component: BibliotecasPage,
});

function BibliotecasPage() {
  const libs = useLibrariesLatest();
  const trends = useHourlyTrend();
  const nichesQuery = useNiches();
  const [query, setQuery] = useState("");
  const [niche, setNiche] = useState<string>("all");
  const [language, setLanguage] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [addOpen, setAddOpen] = useState(false);

  const data = libs.data ?? [];

  const niches = useMemo(() => {
    const fromDb = (nichesQuery.data ?? []).map((n) => n.name);
    const fromLibs = data.map((l) => l.niche).filter(Boolean) as string[];
    return Array.from(new Set([...fromDb, ...fromLibs])).sort();
  }, [data, nichesQuery.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (niche !== "all" && l.niche !== niche) return false;
      if (language !== "all" && l.language !== language) return false;
      if (!q) return true;
      const hay = [l.search_term, l.page_name, l.niche, l.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data, query, niche, language, status]);

  const isLoading = libs.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bibliotecas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} de {data.length} biblioteca{data.length === 1 ? "" : "s"} monitorada
            {data.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Adicionar biblioteca
        </Button>
      </div>

      <Card className="border-border/50 bg-card/40 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por termo, nicho ou observações…"
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <Select value={niche} onValueChange={setNiche}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Nicho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os nichos</SelectItem>
                {niches.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Idioma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos idiomas</SelectItem>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="paused">Pausada</SelectItem>
                <SelectItem value="archived">Arquivada</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex overflow-hidden rounded-lg border border-border/60">
              <Button
                type="button"
                size="icon"
                variant={view === "grid" ? "secondary" : "ghost"}
                className="rounded-none"
                onClick={() => setView("grid")}
                aria-label="Visualização em grade"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant={view === "list" ? "secondary" : "ghost"}
                className="rounded-none"
                onClick={() => setView("list")}
                aria-label="Visualização em lista"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={() => setAddOpen(true)} hasAny={data.length > 0} />
      ) : (
        <motion.div
          layout
          className={
            view === "grid"
              ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              : "flex flex-col gap-3"
          }
        >
          {filtered.map((lib, i) => (
            <LibraryCard key={lib.id} library={lib} trend={trends.data?.[lib.id]} index={i} />
          ))}
        </motion.div>
      )}

      <AddLibraryModal open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function EmptyState({ onAdd, hasAny }: { onAdd: () => void; hasAny: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid place-items-center rounded-3xl border border-dashed border-border/60 bg-card/30 px-8 py-20 text-center"
    >
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-border/60 bg-card">
        <Plus className="h-6 w-6 text-foreground" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">
        {hasAny ? "Nenhum resultado para os filtros" : "Comece adicionando sua primeira biblioteca"}
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Cole o link de uma busca na Biblioteca de Anúncios da Meta. A mineração roda na hora e os
        números aparecem aqui automaticamente.
      </p>
      <Button onClick={onAdd} className="mt-6">
        <Plus className="h-4 w-4" /> Adicionar biblioteca
      </Button>
    </motion.div>
  );
}
