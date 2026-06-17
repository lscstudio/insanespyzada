import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  Minus,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CountUp } from "@/components/count-up";
import { AddLibraryModal } from "@/components/add-library-modal";
import { useDeleteLibrary, useToggleLibraryStatus } from "@/hooks/use-libraries";
import { formatNumber, formatPercent } from "@/lib/format";
import type { LibraryLatest, LibraryTrend } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  library: LibraryLatest;
  trend?: LibraryTrend;
  index?: number;
}

export function LibraryCard({ library, trend, index = 0 }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const del = useDeleteLibrary();
  const toggle = useToggleLibraryStatus();

  const title = library.search_term || library.page_name || "Sem título";
  const direction = trend?.trend_direction ?? "flat";
  const delta = trend?.delta ?? 0;
  const deltaPct = trend?.delta_pct ?? 0;

  const TrendIcon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const trendColor =
    direction === "up"
      ? "text-success"
      : direction === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -3 }}
      >
        <Card className="group relative overflow-hidden border-border/60 bg-card p-0 transition-shadow hover:shadow-2xl hover:shadow-primary/10">
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="absolute inset-0 rounded-2xl ring-1 ring-primary/30" />
          </div>

          <Link
            to="/biblioteca/$id"
            params={{ id: library.id }}
            className="block p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {library.niche && (
                    <Badge variant="secondary" className="bg-primary/15 text-primary border-0">
                      {library.niche}
                    </Badge>
                  )}
                  {library.language && (
                    <Badge variant="outline" className="border-border/60">
                      {library.language}
                    </Badge>
                  )}
                  {library.status === "paused" && (
                    <Badge variant="outline" className="border-warning/40 text-warning">
                      Pausada
                    </Badge>
                  )}
                  {library.scrape_ok === false && (
                    <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                      <AlertTriangle className="h-3 w-3" /> falha na última coleta
                    </Badge>
                  )}
                </div>
                <h3 className="mt-2 truncate text-base font-semibold text-foreground">
                  {title}
                </h3>
                {library.page_name && library.search_term && (
                  <p className="truncate text-xs text-muted-foreground">{library.page_name}</p>
                )}
              </div>

              <div onClick={(e) => e.preventDefault()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                      <Pencil className="h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        toggle.mutate(
                          {
                            id: library.id,
                            status: library.status === "active" ? "paused" : "active",
                          },
                          {
                            onSuccess: () =>
                              toast.success(
                                library.status === "active" ? "Biblioteca pausada" : "Biblioteca ativada",
                              ),
                          },
                        )
                      }
                    >
                      {library.status === "active" ? (
                        <>
                          <Pause className="h-4 w-4" /> Pausar
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" /> Ativar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={library.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" /> Abrir na Meta
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mt-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Anúncios ativos
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <CountUp
                    value={library.active_ads_count ?? 0}
                    className="text-3xl font-bold tracking-tight text-gradient-violet-cyan"
                  />
                </div>
              </div>
              {trend && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15 + index * 0.04 }}
                  className={cn(
                    "flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-xs font-medium",
                    trendColor,
                  )}
                >
                  <motion.span
                    animate={{ y: direction === "up" ? [-2, 0] : direction === "down" ? [2, 0] : 0 }}
                    transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.4 }}
                  >
                    <TrendIcon className="h-3.5 w-3.5" />
                  </motion.span>
                  <span>
                    {delta > 0 ? "+" : ""}
                    {formatNumber(delta)} ({formatPercent(deltaPct)})
                  </span>
                </motion.div>
              )}
            </div>

            {/* Top creative */}
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-border/60 bg-background/30 p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                {library.top_creative_url ? (
                  <img
                    src={library.top_creative_url}
                    alt="Top criativo"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Criativo mais escalado</p>
                <p className="text-sm font-medium text-foreground">
                  ×{formatNumber(library.top_creative_count ?? 0)} duplicados
                </p>
                {library.top_creative_id && (
                  <p
                    className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground"
                    title={`Library ID: ${library.top_creative_id}`}
                  >
                    ID: {library.top_creative_id}
                  </p>
                )}
              </div>
              {library.top_creative_id && /^\d{14,17}$/.test(library.top_creative_id) && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <a
                    href={`https://www.facebook.com/ads/library/?id=${library.top_creative_id}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Abrir
                  </a>
                </Button>
              )}
            </div>


            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span title={library.captured_at ?? ""}>
                Atualizado{" "}
                {library.captured_at
                  ? formatDistanceToNow(new Date(library.captured_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })
                  : "—"}
              </span>
              <span>
                {formatNumber(library.unique_creatives ?? 0)} criativos únicos
              </span>
            </div>
          </Link>
        </Card>
      </motion.div>

      <AddLibraryModal open={editOpen} onOpenChange={setEditOpen} library={library} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir biblioteca?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente “{title}” do seu painel. Os snapshots históricos
              não são apagados no banco, mas deixarão de aparecer aqui.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                del.mutate(library.id, {
                  onSuccess: () => toast.success("Biblioteca excluída"),
                })
              }
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
