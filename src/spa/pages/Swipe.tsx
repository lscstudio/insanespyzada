import { useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Heart, Flame, Play, BadgeCheck, Clock } from "lucide-react";
import { useStore } from "../lib/store";
import { PLANS } from "../lib/plans";
import { num } from "../lib/format";
import { Badge, Button, Card } from "../components/ui";
import { CreativeThumb } from "../components/CreativeThumb";

export function Swipe() {
  const { swipeCandidates, plan, swipeFavorites, toggleSwipeFavorite } = useStore();
  const p = PLANS[plan];
  const [onlyFavs, setOnlyFavs] = useState(false);

  // acesso por plano
  if (p.swipe === "none") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center border border-line text-ink-3 dark:border-dline dark:text-dink-3">
            <Lock size={20} />
          </div>
          <h1 className="mt-4 text-xl font-extrabold uppercase tracking-tight">Swipe bloqueado</h1>
          <p className="mt-2 text-xs leading-relaxed text-ink-2 dark:text-dink-2">
            O feed curado de criativos aprovados pela nossa curadoria está disponível a partir do
            plano <b>Pro</b>. No Unlimited você vê <b>todos</b> os nichos.
          </p>
          <Link to="/assinatura">
            <Button className="mt-5">Ver planos →</Button>
          </Link>
          <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-ink-3 dark:text-dink-3">
            Acesso por plano: Free bloqueado · Pro parcial · Unlimited total
          </div>
        </Card>
      </div>
    );
  }

  const visible = swipeCandidates.filter((c) => p.swipe === "full" || c.visibleToPro);
  const locked = swipeCandidates.filter((c) => p.swipe === "partial" && !c.visibleToPro);
  const list = onlyFavs ? visible.filter((c) => swipeFavorites.includes(c.id)) : visible;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand dark:text-brand-bright">
            Curadoria global
          </div>
          <h1 className="mt-1 text-2xl font-extrabold uppercase tracking-tight">Swipe</h1>
          <p className="mt-1 text-xs text-ink-2 dark:text-dink-2">
            Criativos aprovados pelos admins, ordenados por{" "}
            <b className="text-brand dark:text-brand-bright">escalation_score</b> ·{" "}
            {p.swipe === "partial" ? "acesso parcial (nichos liberados)" : "acesso total"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="brand">
            <BadgeCheck size={11} /> {visible.length} aprovados
          </Badge>
          <button
            onClick={() => setOnlyFavs((v) => !v)}
            className={`flex h-9 items-center gap-1.5 border px-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              onlyFavs
                ? "border-brand bg-brand text-white dark:border-brand-bright dark:bg-brand-bright"
                : "border-line text-ink-2 hover:border-brand hover:text-brand dark:border-dline dark:text-dink-2"
            }`}
          >
            <Heart size={12} className={onlyFavs ? "fill-current" : ""} /> Favoritos (
            {swipeFavorites.length})
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <Card className="border-dashed p-10 text-center text-xs text-ink-3 dark:text-dink-3">
          Nenhum criativo favoritado ainda — toque no coração dos cards.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {list.map((c) => (
            <div
              key={c.id}
              className="group flex flex-col overflow-hidden border border-line bg-card transition-colors hover:border-brand dark:border-dline dark:bg-dcard dark:hover:border-brand-bright"
            >
              <div className="relative">
                <CreativeThumb hue={c.hue} type={c.type} className="h-44 w-full" />
                <button
                  onClick={() => void toggleSwipeFavorite(c.id)}
                  className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center border backdrop-blur transition-colors ${
                    swipeFavorites.includes(c.id)
                      ? "border-brand bg-brand text-white dark:border-brand-bright dark:bg-brand-bright"
                      : "border-white/40 bg-black/40 text-white hover:border-brand hover:bg-brand"
                  }`}
                  title="Favoritar"
                >
                  <Heart
                    size={14}
                    className={swipeFavorites.includes(c.id) ? "fill-current" : ""}
                  />
                </button>
                {c.type === "video" && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 border border-white/30 bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                    <Play size={9} className="fill-white" /> vídeo
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2.5 p-4">
                <div className="text-sm font-extrabold uppercase leading-tight tracking-tight">
                  {c.headline}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3 dark:text-dink-3">
                  {c.pageName} · {c.niche}
                </div>
                <div className="mt-auto flex items-center justify-end border-t border-line pt-3 dark:border-dline">
                  <div className="text-right text-[10px] uppercase tracking-widest text-ink-3 dark:text-dink-3">
                    <div>
                      <b className="text-sm text-ink dark:text-dink tabular-nums">
                        ×{num(c.duplications)}
                      </b>{" "}
                      dup
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <Clock size={9} /> {c.daysActive}d ativo
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* cards bloqueados (apenas Pro) */}
          {locked.map((c) => (
            <div
              key={c.id}
              className="relative flex flex-col overflow-hidden border border-line dark:border-dline"
            >
              <div className="blur-sm">
                <CreativeThumb hue={c.hue} type={c.type} className="h-44 w-full" />
                <div className="p-4">
                  <div className="h-4 w-3/4 bg-line dark:bg-dline" />
                  <div className="mt-2 h-3 w-1/2 bg-line dark:bg-dline" />
                </div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-paper/70 text-center dark:bg-dpaper/70">
                <Lock size={18} className="text-brand dark:text-brand-bright" />
                <div className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-2 dark:text-dink-2">
                  Nicho "{c.niche}" exclusivo
                  <br />
                  do plano Unlimited
                </div>
                <Link to="/assinatura">
                  <Button className="mt-1 !h-7 !px-3 !text-[10px]">Desbloquear</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
