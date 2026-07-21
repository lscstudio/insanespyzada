import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from "react";
import { X, TrendingUp, TrendingDown, Minus, Inbox } from "lucide-react";
import type { Trend } from "../lib/types";

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const base =
    "inline-flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase tracking-wider transition-colors select-none disabled:opacity-40 disabled:pointer-events-none h-9 px-4 border";
  const variants: Record<BtnVariant, string> = {
    primary:
      "bg-brand text-white border-brand hover:bg-brand-deep dark:hover:bg-brand-bright dark:border-brand-bright",
    secondary:
      "bg-ink text-paper border-ink hover:opacity-85 dark:bg-dink dark:text-dpaper dark:border-dink",
    outline:
      "bg-transparent text-ink border-line hover:border-brand hover:text-brand dark:text-dink dark:border-dline dark:hover:border-brand-bright dark:hover:text-brand-bright",
    ghost:
      "bg-transparent border-transparent text-ink-2 hover:text-brand hover:bg-brand-ghost dark:text-dink-2 dark:hover:text-brand-bright",
    danger:
      "bg-transparent border-line text-red-600 hover:border-red-600 hover:bg-red-600/5 dark:border-dline dark:text-red-400 dark:hover:border-red-400",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function IconButton({
  className = "",
  active = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={`inline-flex h-8 w-8 items-center justify-center border transition-colors disabled:opacity-40 disabled:pointer-events-none ${
        active
          ? "border-brand text-brand dark:border-brand-bright dark:text-brand-bright"
          : "border-line text-ink-2 hover:border-brand hover:text-brand dark:border-dline dark:text-dink-2 dark:hover:border-brand-bright dark:hover:text-brand-bright"
      } ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border border-line bg-card dark:border-dline dark:bg-dcard ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  kicker,
  title,
  right,
}: {
  kicker?: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-extrabold uppercase tracking-tight">{title}</h2>
      </div>
      {right}
    </div>
  );
}

type BadgeTone = "neutral" | "brand" | "success" | "warn" | "danger" | "escalating";

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const tones: Record<BadgeTone, string> = {
    neutral: "border-line text-ink-2 dark:border-dline dark:text-dink-2",
    brand: "border-brand text-brand dark:border-brand-bright dark:text-brand-bright",
    success: "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400",
    warn: "border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400",
    danger: "border-red-600 text-red-600 dark:border-red-400 dark:text-red-400",
    escalating: "border-brand bg-brand text-white dark:border-brand-bright dark:bg-brand-bright",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Input({
  label,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-ink-2 dark:text-dink-2">
          {label}
        </span>
      )}
      <input
        className={`h-10 w-full border border-line bg-card px-3 font-mono text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-brand dark:border-dline dark:bg-dpaper dark:text-dink dark:placeholder:text-dink-3 dark:focus:border-brand-bright ${className}`}
        {...props}
      />
    </label>
  );
}

export function Stat({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3 dark:text-dink-3">
        {label}
      </div>
      <div
        className={`mt-2 text-3xl font-extrabold tabular-nums tracking-tight ${
          accent ? "text-brand dark:text-brand-bright" : ""
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-ink-2 dark:text-dink-2">{sub}</div>}
    </Card>
  );
}

export function TrendBadge({ trend }: { trend: Trend }) {
  if (trend === "up")
    return (
      <Badge tone="success">
        <TrendingUp size={11} /> alta
      </Badge>
    );
  if (trend === "down")
    return (
      <Badge tone="danger">
        <TrendingDown size={11} /> queda
      </Badge>
    );
  return (
    <Badge tone="neutral">
      <Minus size={11} /> estável
    </Badge>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="backdrop-anim fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`modal-anim w-full ${wide ? "max-w-2xl" : "max-w-md"} border border-line bg-card shadow-2xl dark:border-dline dark:bg-dcard`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3 dark:border-dline">
          <div className="text-xs font-bold uppercase tracking-[0.2em]">{title}</div>
          <IconButton onClick={onClose} aria-label="Fechar">
            <X size={14} />
          </IconButton>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  labels,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  labels: [string, string];
}) {
  return (
    <div className="inline-flex overflow-hidden border border-line dark:border-dline">
      {[false, true].map((v) => (
        <button
          key={String(v)}
          onClick={() => onChange(v)}
          className={`h-9 px-4 text-xs font-bold uppercase tracking-wider transition-colors ${
            checked === v
              ? "bg-brand text-white dark:bg-brand-bright"
              : "text-ink-2 hover:text-brand dark:text-dink-2 dark:hover:text-brand-bright"
          }`}
        >
          {labels[v ? 1 : 0]}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 border-dashed p-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-line text-ink-3 dark:border-dline dark:text-dink-3">
        <Inbox size={18} />
      </span>
      <div className="text-sm font-bold uppercase tracking-wider">{title}</div>
      <p className="max-w-sm text-xs text-ink-2 dark:text-dink-2">{body}</p>
      {action}
    </Card>
  );
}

export function QuotaBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit === Infinity ? 8 : Math.min(100, (used / limit) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-wider text-ink-3 dark:text-dink-3">
        <span>Bibliotecas</span>
        <span className="tabular-nums">
          {used}/{limit === Infinity ? "∞" : limit}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-line dark:bg-dline">
        <div
          className="h-full rounded-full bg-brand transition-all dark:bg-brand-bright"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ScoreMeter({ score }: { score: number }) {
  const blocks = 10;
  const filled = Math.round((score / 100) * blocks);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: blocks }).map((_, i) => (
          <span
            key={i}
            className={`h-3 w-1.5 rounded-[2px] ${
              i < filled ? "bg-brand dark:bg-brand-bright" : "bg-line dark:bg-dline"
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-bold tabular-nums text-brand dark:text-brand-bright">
        {score}
      </span>
    </div>
  );
}
