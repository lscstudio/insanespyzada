import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
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
import type { HourlyTrend, LibraryLatest } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Props {
  library: LibraryLatest;
  trend?: HourlyTrend;
  index?: number;
}

export function HourlyTrendBadge({ trend, className }: { trend?: HourlyTrend; className?: string }) {
  const { t } = useLang();
  const dir = trend?.direction ?? "flat";
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;
  const color =
    dir === "up"
      ? "text-success border-success/40 bg-success/10"
      : dir === "down"
        ? "text-destructive border-destructive/40 bg-destructive/10"
        : "text-muted-foreground border-border/60 bg-muted/40";
  return (
    <span
      title={
        trend
          ? `${trend.from} → ${trend.to} (Δ ${trend.delta >= 0 ? "+" : ""}${trend.delta})`
          : t("Sem coleta anterior para comparar")
      }
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full border transition-all",
        color,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

export function LibraryCard({ library, trend, index = 0 }: Props) {
  const { lang, t } = useLang();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const del = useDeleteLibrary();
  const toggle = useToggleLibraryStatus();

  const title = library.title || library.search_term || library.page_name || t("Sem título");

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -2 }}
      >
        <Card className="group relative overflow-hidden border-border/50 bg-card/60 p-0 transition-all hover:border-foreground/20 hover:shadow-xl hover:shadow-black/20">
          <Link to="/biblioteca/$id" params={{ id: library.id }} className="block p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {library.niche && (
                    <Badge variant="outline" className="border-border/60 font-normal">
                      {library.niche}
                    </Badge>
                  )}
                  {library.language && (
                    <Badge variant="outline" className="border-border/60 font-normal text-muted-foreground">
                      {library.language}
                    </Badge>
                  )}
                  {library.status === "paused" && (
                    <Badge variant="outline" className="border-warning/40 text-warning">
                      {t("Pausada")}
                    </Badge>
                  )}
                  {library.scrape_ok === false && (
                    <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                      <AlertTriangle className="h-3 w-3" /> {t("falha")}
                    </Badge>
                  )}
                </div>
                <h3 className="mt-3 truncate text-base font-semibold tracking-tight text-foreground">
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
                      <Pencil className="h-4 w-4" /> {t("Editar")}
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
                                library.status === "active" ? t("Biblioteca pausada") : t("Biblioteca ativada"),
                              ),
                          },
                        )
                      }
                    >
                      {library.status === "active" ? (
                        <>
                          <Pause className="h-4 w-4" /> {t("Pausar")}
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" /> {t("Ativar")}
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={library.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" /> {t("Abrir na Meta")}
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="h-4 w-4" /> {t("Excluir")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {t("Anúncios ativos")}
                </p>
                <CountUp
                  value={library.active_ads_count ?? 0}
                  className="mt-1 block text-4xl font-bold tracking-tight tabular-nums text-foreground"
                />
              </div>
              <HourlyTrendBadge trend={trend} />
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
              <span title={library.captured_at ?? ""}>
                {t("Atualizado")}{" "}
                {library.captured_at
                  ? formatDistanceToNow(new Date(library.captured_at), {
                      addSuffix: true,
                      locale: lang === "en" ? enUS : ptBR,
                    })
                  : "—"}
              </span>
            </div>
          </Link>
        </Card>
      </motion.div>

      <AddLibraryModal open={editOpen} onOpenChange={setEditOpen} library={library} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Excluir biblioteca?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Esta ação remove permanentemente")} “{title}”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                del.mutate(library.id, {
                  onSuccess: () => toast.success(t("Biblioteca excluída")),
                })
              }
            >
              {t("Excluir")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
