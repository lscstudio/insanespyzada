import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CreditCard,
  Zap,
  EyeOff,
  Eye,
  CalendarClock,
  History,
  AlertTriangle,
  Plus,
  QrCode,
  Check,
  Lock,
  Minus,
  Loader2,
} from "lucide-react";
import { useStore } from "../lib/store";
import { PLAN_LIST, CREDIT_PACKS } from "../lib/plans";
import type { Plan } from "../lib/types";
import { brl, dateBR, num } from "../lib/format";
import { Badge, Button, Card, Input, Modal, SectionTitle, Toggle } from "../components/ui";

type Cycle = "monthly" | "quarterly";
type Method = "card" | "pix";

type CheckoutTarget =
  | { kind: "plan"; plan: Plan; cycle: Cycle }
  | { kind: "credits"; packId: string; credits: number; price: number };

function CheckoutModal({ target, onClose }: { target: CheckoutTarget; onClose: () => void }) {
  const { setPlan, buyCredits } = useStore();
  const [method, setMethod] = useState<Method>("card");
  const [processing, setProcessing] = useState(false);

  const amount = useMemo(() => {
    if (target.kind === "credits") return target.price;
    const p = target.plan;
    if (method === "pix") return p.pixQuarterly ?? p.quarterly ?? p.monthly ?? 0;
    return target.cycle === "monthly" ? (p.monthly ?? 0) : (p.quarterly ?? p.monthly ?? 0);
  }, [target, method]);

  const isFree = target.kind === "plan" && target.plan.id === "free";

  function confirm() {
    setProcessing(true);
    window.setTimeout(async () => {
      if (target.kind === "credits") {
        await buyCredits(target.credits, target.price, method);
      } else {
        await setPlan(
          target.plan.id,
          method,
          target.plan.quarterlyOnly ? "quarterly" : target.cycle,
        );
      }
      setProcessing(false);
      onClose();
    }, 1600);
  }

  return (
    <Modal open onClose={onClose} title="Checkout" wide>
      <div className="space-y-4">
        <div className="border border-line bg-brand-ghost p-4 dark:border-dline">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-ink-3 dark:text-dink-3">
            resumo do pedido
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <span className="text-sm font-extrabold uppercase">
              {target.kind === "credits"
                ? `Pacote de ${target.credits} créditos`
                : `Plano ${target.plan.name} — ${
                    target.plan.quarterlyOnly || target.cycle === "quarterly"
                      ? "trimestral"
                      : "mensal"
                  }`}
            </span>
            <span className="text-xl font-extrabold tabular-nums text-brand dark:text-brand-bright">
              {isFree ? "grátis" : brl(amount)}
            </span>
          </div>
          {target.kind === "plan" && !isFree && (
            <div className="mt-1 text-[11px] text-ink-2 dark:text-dink-2">
              {method === "card"
                ? target.cycle === "monthly"
                  ? "Assinatura recorrente mensal contínua (até cancelar) — via Asaas."
                  : `Cobrança trimestral recorrente — via Asaas${
                      target.plan.id === "unlimited" ? " (≈ R$ 82,33/mês)" : " (≈ R$ 42,33/mês)"
                    }.`
                : "Pagamento à vista por ciclo via Pix (AbacatePay). Renovação manual a cada trimestre."}
            </div>
          )}
        </div>

        {!isFree && (
          <>
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-ink-3 dark:text-dink-3">
                método de pagamento
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMethod("card")}
                  className={`flex items-center gap-2.5 border p-3 text-left transition-colors ${
                    method === "card"
                      ? "border-brand bg-brand-ghost dark:border-brand-bright"
                      : "border-line hover:border-ink-3 dark:border-dline"
                  }`}
                >
                  <CreditCard size={16} className="text-brand dark:text-brand-bright" />
                  <div>
                    <div className="text-xs font-extrabold uppercase">Cartão</div>
                    <div className="text-[9px] uppercase tracking-widest text-ink-3 dark:text-dink-3">
                      via Asaas · recorrente
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setMethod("pix")}
                  className={`flex items-center gap-2.5 border p-3 text-left transition-colors ${
                    method === "pix"
                      ? "border-brand bg-brand-ghost dark:border-brand-bright"
                      : "border-line hover:border-ink-3 dark:border-dline"
                  }`}
                >
                  <QrCode size={16} className="text-brand dark:text-brand-bright" />
                  <div>
                    <div className="text-xs font-extrabold uppercase">Pix</div>
                    <div className="text-[9px] uppercase tracking-widest text-ink-3 dark:text-dink-3">
                      via AbacatePay · à vista
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {method === "card" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input label="Número do cartão" placeholder="4242 4242 4242 4242" />
                </div>
                <Input label="Validade" placeholder="12/28" />
                <Input label="CVV" placeholder="123" />
              </div>
            ) : (
              <div className="flex items-center gap-3 border border-line p-3 dark:border-dline">
                <div className="grid h-16 w-16 shrink-0 grid-cols-4 gap-0.5">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <span
                      key={i}
                      className={`${(i * 7) % 3 === 0 ? "bg-ink dark:bg-dink" : "bg-line dark:bg-dline"}`}
                    />
                  ))}
                </div>
                <div className="text-[11px] leading-relaxed text-ink-2 dark:text-dink-2">
                  Ao confirmar, um QR Code Pix será gerado pela <b>AbacatePay</b>. O acesso é
                  liberado assim que o pagamento é identificado (geralmente em segundos).
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4 dark:border-dline">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-ink-3 dark:text-dink-3">
            <Lock size={10} /> pagamento seguro
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={confirm} disabled={processing}>
              {processing && <Loader2 size={13} className="animate-spin" />}
              {processing
                ? "Processando…"
                : isFree
                  ? "Mudar para Free"
                  : `Confirmar ${brl(amount)}`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function Assinatura() {
  const {
    plan,
    renewalDate,
    cancelAtPeriodEnd,
    cancelRenewal,
    reactivateRenewal,
    credits,
    libraries,
    toggleHidden,
    payments,
  } = useStore();
  const p = PLAN_LIST.find((x) => x.id === plan)!;
  const [params, setParams] = useSearchParams();
  const [cycle, setCycle] = useState<Cycle>("quarterly");
  const [target, setTarget] = useState<CheckoutTarget | null>(null);

  const nextPayment = payments.find((x) => x.status === "scheduled");
  const pastPayments = payments.filter((x) => x.status === "paid");
  const hidden = libraries.filter((l) => l.hiddenFromSwipe);
  const daysToRenew = Math.max(
    0,
    Math.ceil((new Date(renewalDate).getTime() - Date.now()) / 86400000),
  );

  useEffect(() => {
    if (params.get("creditos")) {
      document.getElementById("creditos")?.scrollIntoView({ behavior: "smooth" });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">Assinatura</h1>
        <p className="mt-1 text-xs text-ink-2 dark:text-dink-2">
          Gerencie seu plano, créditos, cobranças e bibliotecas ocultas em um só lugar.
        </p>
      </div>

      {/* === seção 1: estado atual === */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* plano atual */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-extrabold uppercase tracking-tight">{p.name}</span>
                <Badge tone="brand">{p.codename}</Badge>
                {cancelAtPeriodEnd ? (
                  <Badge tone="warn">
                    <AlertTriangle size={10} /> cancelamento programado
                  </Badge>
                ) : (
                  <Badge tone="success">ativa</Badge>
                )}
              </div>
              <div className="mt-3 space-y-1 text-xs text-ink-2 dark:text-dink-2">
                <div className="flex items-center gap-2">
                  <CalendarClock size={12} className="text-brand dark:text-brand-bright" />
                  {cancelAtPeriodEnd
                    ? `Acesso garantido até ${dateBR(renewalDate)} (sem renovação).`
                    : `Próxima renovação em ${dateBR(renewalDate)} (${daysToRenew} dias).`}
                </div>
                <div>
                  {p.librariesLimit === Infinity ? "∞" : p.librariesLimit} bibliotecas · push a cada{" "}
                  {p.pushIntervalMin}min · histórico {p.historyDays}d · swipe {p.swipe}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {plan !== "free" &&
                (cancelAtPeriodEnd ? (
                  <Button onClick={() => void reactivateRenewal()}>Reativar renovação</Button>
                ) : (
                  <Button variant="danger" onClick={() => void cancelRenewal()}>
                    Cancelar renovação
                  </Button>
                ))}
            </div>
          </div>
          {daysToRenew <= 3 && !cancelAtPeriodEnd && plan !== "free" && (
            <div className="mt-4 flex items-center gap-2 border border-amber-500/50 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertTriangle size={13} />
              Lembrete: sua renovação é em {daysToRenew} dia(s).
            </div>
          )}
        </Card>

        {/* créditos */}
        <Card className="flex flex-col p-6">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tabular-nums text-brand dark:text-brand-bright">
              {num(credits)}
            </span>
            <Zap size={16} className="text-brand dark:text-brand-bright" />
          </div>
          <p className="mt-1 text-[11px] text-ink-3 dark:text-dink-3">
            Saldo de créditos · usados em coletas extras e extrações de vídeo.
          </p>
          <Button
            variant="outline"
            className="mt-auto"
            onClick={() => setParams({ creditos: "1" })}
          >
            <Plus size={13} /> Comprar mais
          </Button>
        </Card>
      </div>

      {/* === seção 2: trocar de plano === */}
      <div>
        <SectionTitle
          title="Trocar de plano"
          right={
            <Toggle
              checked={cycle === "quarterly"}
              onChange={(v) => setCycle(v ? "quarterly" : "monthly")}
              labels={["Mensal", "Trimestral"]}
            />
          }
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {PLAN_LIST.map((pl) => {
            const isCurrent = plan === pl.id;
            const highlight = pl.id === "unlimited";
            const price =
              pl.id === "free"
                ? 0
                : cycle === "monthly" && !pl.quarterlyOnly
                  ? (pl.monthly ?? 0)
                  : (pl.quarterly ?? 0);
            const disabledCycle = pl.quarterlyOnly && cycle === "monthly";

            return (
              <Card
                key={pl.id}
                className={`relative flex flex-col ${highlight ? "border-brand dark:border-brand-bright" : ""}`}
              >
                {highlight && (
                  <div className="absolute -top-px right-4 -translate-y-1/2 bg-brand px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.25em] text-white dark:bg-brand-bright">
                    Diamond
                  </div>
                )}
                <div className="border-b border-line p-6 dark:border-dline">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-extrabold uppercase tracking-tight">
                      {pl.name}
                    </span>
                    <Badge tone={highlight ? "brand" : "neutral"}>{pl.codename}</Badge>
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-2 dark:text-dink-2">{pl.tagline}</div>
                  <div className="mt-4">
                    {pl.id === "free" ? (
                      <div className="text-3xl font-extrabold tabular-nums">R$ 0</div>
                    ) : disabledCycle ? (
                      <div>
                        <div className="text-3xl font-extrabold tabular-nums text-ink-3 dark:text-dink-3">
                          —
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-amber-500">
                          apenas trimestral
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-3xl font-extrabold tabular-nums">{brl(price)}</span>
                        <span className="ml-1 text-[10px] uppercase tracking-widest text-ink-3 dark:text-dink-3">
                          /{cycle === "monthly" ? "mês" : "trimestre"}
                        </span>
                        {cycle === "quarterly" && (
                          <div className="mt-0.5 text-[10px] text-ink-3 dark:text-dink-3">
                            ≈ {brl(price / 3)}/mês no cartão
                            {pl.pixQuarterly ? ` · ${brl(pl.pixQuarterly)} no Pix` : ""}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <ul className="flex-1 space-y-2 p-6">
                  {pl.features.map((f) => {
                    const negative = f.startsWith("Sem");
                    return (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        {negative ? (
                          <Minus
                            size={13}
                            className="mt-0.5 shrink-0 text-ink-3 dark:text-dink-3"
                          />
                        ) : (
                          <Check
                            size={13}
                            className="mt-0.5 shrink-0 text-brand dark:text-brand-bright"
                          />
                        )}
                        <span className={negative ? "text-ink-3 dark:text-dink-3" : ""}>{f}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="p-6 pt-0">
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      <Check size={13} /> Plano atual
                    </Button>
                  ) : (
                    <Button
                      variant={highlight ? "primary" : "outline"}
                      className="w-full"
                      disabled={disabledCycle}
                      onClick={() => setTarget({ kind: "plan", plan: pl, cycle })}
                    >
                      {pl.id === "free" ? "Mudar para Free" : "Assinar agora →"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* === seção 3: créditos avulsos === */}
      <div id="creditos">
        <SectionTitle
          title="Pacotes de créditos"
          right={
            <Badge tone="brand">
              <Zap size={11} /> saldo: {credits}
            </Badge>
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <Card key={pack.id} className="flex items-center justify-between gap-3 p-6">
              <div>
                <div className="text-2xl font-extrabold tabular-nums">
                  {pack.credits}
                  <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-ink-3 dark:text-dink-3">
                    créditos
                  </span>
                </div>
                <div className="mt-1 text-xs text-ink-2 dark:text-dink-2">
                  {brl(pack.price)} · {brl(pack.price / pack.credits)}/crédito
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  setTarget({
                    kind: "credits",
                    packId: pack.id,
                    credits: pack.credits,
                    price: pack.price,
                  })
                }
              >
                Comprar
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* === seção 4: bibliotecas ocultas === */}
      <Card className="p-6">
        <SectionTitle
          title="Bibliotecas ocultas do Swipe"
          right={
            <Badge tone={p.hiddenSlots > 0 ? "brand" : "neutral"}>
              {hidden.length}/{p.hiddenSlots} usadas
            </Badge>
          }
        />
        {p.hiddenSlots === 0 ? (
          <div className="flex items-center gap-3 border border-dashed border-line p-4 text-xs text-ink-2 dark:border-dline dark:text-dink-2">
            <EyeOff size={15} className="shrink-0 text-ink-3 dark:text-dink-3" />
            Ocultar bibliotecas do feed global é exclusivo do plano Unlimited (até 5). Faça upgrade
            acima.
          </div>
        ) : (
          <div className="space-y-2">
            {libraries.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between border border-line px-3 py-2 text-xs dark:border-dline"
              >
                <span className="font-bold uppercase tracking-wide">{l.pageName}</span>
                <button
                  onClick={() => void toggleHidden(l.id)}
                  className={`flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    l.hiddenFromSwipe
                      ? "border-brand bg-brand text-white dark:border-brand-bright dark:bg-brand-bright"
                      : "border-line text-ink-2 hover:border-brand hover:text-brand dark:border-dline dark:text-dink-2"
                  }`}
                >
                  {l.hiddenFromSwipe ? (
                    <>
                      <EyeOff size={11} /> oculta
                    </>
                  ) : (
                    <>
                      <Eye size={11} /> visível
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* === seção 5: cobranças === */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <SectionTitle title="Próxima cobrança" />
          {nextPayment && !cancelAtPeriodEnd ? (
            <div className="flex items-center justify-between border border-brand/40 bg-brand-ghost p-4 dark:border-brand-bright/40">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center border border-brand text-brand dark:border-brand-bright dark:text-brand-bright">
                  {nextPayment.method === "card" ? <CreditCard size={16} /> : <QrCode size={16} />}
                </span>
                <div>
                  <div className="text-xs font-extrabold uppercase">{nextPayment.description}</div>
                  <div className="text-[11px] text-ink-2 dark:text-dink-2">
                    {dateBR(nextPayment.date)} · {nextPayment.method === "card" ? "cartão" : "pix"}
                  </div>
                </div>
              </div>
              <div className="text-xl font-extrabold tabular-nums text-brand dark:text-brand-bright">
                {brl(nextPayment.amount)}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-line p-4 text-xs text-ink-3 dark:border-dline dark:text-dink-3">
              Nenhuma cobrança agendada {cancelAtPeriodEnd && "(renovação automática cancelada)"}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <SectionTitle title="Pagamentos anteriores" />
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {pastPayments.length === 0 ? (
              <div className="py-6 text-center text-xs text-ink-3 dark:text-dink-3">
                Nenhum pagamento registrado ainda.
              </div>
            ) : (
              pastPayments.map((pay) => (
                <div
                  key={pay.id}
                  className="flex items-center justify-between border border-line px-3 py-2.5 text-xs dark:border-dline"
                >
                  <div className="flex items-center gap-2.5">
                    <History size={13} className="text-ink-3 dark:text-dink-3" />
                    <div>
                      <div className="font-bold uppercase tracking-wide">{pay.description}</div>
                      <div className="text-[10px] text-ink-3 dark:text-dink-3">
                        {dateBR(pay.date)} · {pay.method === "card" ? "cartão" : "pix"} · ref{" "}
                        {pay.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold tabular-nums">{brl(pay.amount)}</div>
                    <Badge tone="success" className="mt-0.5">
                      pago
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {target && <CheckoutModal target={target} onClose={() => setTarget(null)} />}
    </div>
  );
}
