import { useId, useMemo, useRef, useState } from "react";
import type { Snapshot } from "../lib/types";

/**
 * PremiumLineChart — gráfico de linha único estilo Stripe/Vercel/Linear.
 *
 * - Linha suave (catmull-rom → bézier), 2px stroke #4F7DFF
 * - Área semi-transparente com gradiente vertical fade→transparent
 * - Sem markers fixos; ponto final destacado (estilo Stripe)
 * - Animação de entrada (stroke draw + area fade)
 * - Interativo: hover com cursor vertical, dot no ponto, tooltip HTML
 * - Só grid horizontal hairline, Y-axis discreto
 * - Filtros 7D/14D/30D opcionais (top-right), ativo em azul + underline
 * - Card rounded 20px, padding 32px, dark bg (#0F1115) / light bg (#FFFFFF)
 */

const W = 1000;
const H = 280;
const PAD_X = 36;
const PAD_TOP = 28;
const PAD_BOTTOM = 36;

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
function dayLabelLong(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
function hourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function hourLabelLong(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function num(v: number): string {
  return v.toLocaleString("pt-BR");
}

export interface PremiumLineChartProps {
  data?: Snapshot[];
  defaultWindow?: 7 | 14 | 30;
  showFilters?: boolean;
  labelFormat?: "day" | "hour";
  title?: string;
  subtitle?: string;
  height?: number;
  /** lock para não usar filtros (já fatiado externamente). */
  windowLocked?: number;
}

type WindowOpt = 7 | 14 | 30;

export function PremiumLineChart({
  data = [],
  defaultWindow = 30,
  showFilters = false,
  labelFormat = "day",
  title,
  subtitle,
  height = H,
  windowLocked,
}: PremiumLineChartProps) {
  const [win, setWin] = useState<WindowOpt>((defaultWindow as WindowOpt) ?? 30);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const effective = windowLocked ?? win;
  const fmtShort = labelFormat === "day" ? dayLabel : hourLabel;
  const fmtLong = labelFormat === "day" ? dayLabelLong : hourLabelLong;
  const gradId = useId();
  const gradIdSolid = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);

  const slice = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (effective >= data.length) return data;
    return data.slice(-effective);
  }, [data, effective]);

  const values = slice.map((d) => d.activeAds);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const innerW = W - PAD_X * 2;
  const innerH = height - PAD_TOP - PAD_BOTTOM;

  const pts = values.map((v, i) => ({
    x: PAD_X + (slice.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW),
    y: PAD_TOP + (1 - (v - min) / span) * innerH,
  }));

  const line = smoothPath(pts);
  const baseline = height - PAD_BOTTOM;
  const area =
    pts.length > 1
      ? `${line} L ${pts[pts.length - 1].x.toFixed(2)} ${baseline} L ${pts[0].x.toFixed(2)} ${baseline} Z`
      : "";

  const last = pts[pts.length - 1];
  const gridYs = [0.2, 0.4, 0.6, 0.8].map((f) => PAD_TOP + f * innerH);

  const labelCount = Math.min(6, slice.length);
  const labelIdxs =
    slice.length === 1
      ? [0]
      : Array.from({ length: labelCount }, (_, i) =>
          Math.round((i * (slice.length - 1)) / (labelCount - 1)),
        );

  const current = slice[slice.length - 1]?.activeAds ?? 0;
  const delta = slice.length >= 2 ? slice[slice.length - 1].activeAds - slice[0].activeAds : 0;
  const deltaPct =
    slice.length >= 2 && slice[0].activeAds > 0
      ? Math.round((delta / slice[0].activeAds) * 100)
      : 0;

  const hasData = slice.length >= 2;
  const WINDOWS: WindowOpt[] = [7, 14, 30];

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!hasData || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const xVb = (xPx / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const dx = Math.abs(pts[i].x - xVb);
      if (dx < best) {
        best = dx;
        nearest = i;
      }
    }
    setHoverIdx(nearest);
  }

  function handleTouch(e: React.TouchEvent<SVGSVGElement>) {
    if (!hasData || !svgRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xPx = touch.clientX - rect.left;
    const xVb = (xPx / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const dx = Math.abs(pts[i].x - xVb);
      if (dx < best) {
        best = dx;
        nearest = i;
      }
    }
    setHoverIdx(nearest);
  }

  // posição do tooltip em % (relativo ao wrapper do svg)
  const tipLeftPct = hoverIdx !== null ? (pts[hoverIdx].x / W) * 100 : 0;
  const tipTopPct = hoverIdx !== null ? (pts[hoverIdx].y / height) * 100 : 0;
  const tipFlip = tipLeftPct > 75;

  return (
    <div
      className="premium-chart-card"
      style={{
        borderRadius: 20,
        padding: 32,
        background: "var(--pc-bg, #0F1115)",
        color: "var(--pc-fg, #EDEDF2)",
        border: "1px solid var(--pc-border, #1E1E2C)",
        position: "relative",
      }}
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ minWidth: 0 }}>
          {title && (
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "var(--pc-title, #EDEDF2)",
              }}
            >
              {title}
            </div>
          )}
          {subtitle && (
            <div
              style={{
                marginTop: 4,
                fontSize: 12.5,
                color: "var(--pc-sub, #8A8A92)",
                fontWeight: 500,
              }}
            >
              {subtitle}
            </div>
          )}
          {hasData && !title && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
                {num(current)}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: delta >= 0 ? "#10B981" : "#F87171",
                }}
              >
                {delta >= 0 ? "↑" : "↓"} {Math.abs(deltaPct)}%
              </span>
            </div>
          )}
        </div>

        {showFilters && (
          <div style={{ display: "flex", gap: 4 }}>
            {WINDOWS.map((w) => {
              const active = effective === w;
              return (
                <button
                  key={w}
                  onClick={() => setWin(w)}
                  style={{
                    padding: "6px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    background: "transparent",
                    color: active ? "#4F7DFF" : "var(--pc-sub, #8A8A92)",
                    border: "none",
                    borderBottom: active ? "2px solid #4F7DFF" : "2px solid transparent",
                    cursor: "pointer",
                    transition: "color .15s, border-color .15s",
                  }}
                >
                  {w}D
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!hasData ? (
        <div
          style={{
            height: height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--pc-sub, #8A8A92)",
            fontSize: 12,
          }}
        >
          Dados insuficientes para o período.
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${height}`}
            style={{ width: "100%", height: "auto", display: "block" }}
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverIdx(null)}
            onTouchStart={handleTouch}
            onTouchMove={handleTouch}
            onTouchEnd={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F7DFF" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#4F7DFF" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={gradIdSolid} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4F7DFF" />
                <stop offset="100%" stopColor="#6B8EFF" />
              </linearGradient>
              <filter id={`${gradId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* grade horizontal hairline */}
            {gridYs.map((y, i) => (
              <line
                key={i}
                x1={PAD_X}
                x2={W - PAD_X}
                y1={y}
                y2={y}
                stroke="var(--pc-grid, #2A2A35)"
                strokeWidth={1}
                strokeOpacity={0.4}
              />
            ))}

            {/* cursor vertical no hover */}
            {hoverIdx !== null && (
              <line
                x1={pts[hoverIdx].x}
                x2={pts[hoverIdx].x}
                y1={PAD_TOP - 8}
                y2={baseline + 4}
                stroke="#4F7DFF"
                strokeOpacity={0.35}
                strokeWidth={1}
                strokeDasharray="3 3"
                style={{ transition: "x .08s ease" }}
              />
            )}

            {/* área semi-transparente */}
            {area && <path d={area} fill={`url(#${gradId})`} className="plc-area-fade" />}

            {/* linha suave com glow + animação de draw */}
            {line && (
              <path
                d={line}
                fill="none"
                stroke={`url(#${gradIdSolid})`}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                className="plc-line-draw"
                filter={`url(#${gradId}-glow)`}
              />
            )}

            {/* ponto final destacado (estilo Stripe) */}
            {last && hoverIdx === null && (
              <>
                <circle cx={last.x} cy={last.y} r={4} fill="#4F7DFF" className="plc-area-fade" />
                <circle
                  cx={last.x}
                  cy={last.y}
                  r={8}
                  fill="none"
                  stroke="#4F7DFF"
                  strokeOpacity={0.3}
                  strokeWidth={1.5}
                  className="plc-area-fade"
                />
              </>
            )}

            {/* dot no ponto hoverado */}
            {hoverIdx !== null && (
              <>
                <circle
                  cx={pts[hoverIdx].x}
                  cy={pts[hoverIdx].y}
                  r={6}
                  fill="#4F7DFF"
                  stroke="var(--pc-bg, #0F1115)"
                  strokeWidth={2.5}
                  style={{ transition: "cx .08s ease, cy .08s ease" }}
                />
              </>
            )}

            {/* rótulos X discretos */}
            {labelIdxs.map((i) => (
              <text
                key={i}
                x={pts[i]?.x}
                y={height - 12}
                textAnchor="middle"
                fontSize={10.5}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                fill="var(--pc-sub, #8A8A92)"
                fillOpacity={0.7}
              >
                {fmtShort(slice[i].t)}
              </text>
            ))}
          </svg>

          {/* tooltip HTML overlay */}
          {hoverIdx !== null && (
            <div
              className="plc-tooltip"
              style={{
                position: "absolute",
                left: `${tipLeftPct}%`,
                top: `${tipTopPct}%`,
                transform: tipFlip
                  ? "translate(calc(-100% - 14px), -50%)"
                  : "translate(14px, -50%)",
                pointerEvents: "none",
                background: "var(--pc-tip-bg, #1A1A24)",
                border: "1px solid var(--pc-tip-border, #2A2A35)",
                borderRadius: 10,
                padding: "8px 12px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                zIndex: 5,
                whiteSpace: "nowrap",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#4F7DFF",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.1,
                }}
              >
                {num(slice[hoverIdx].activeAds)}
              </div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 10.5,
                  color: "var(--pc-sub, #8A8A92)",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                }}
              >
                {fmtLong(slice[hoverIdx].t)}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .premium-chart-card {
          --pc-bg: #0F1115;
          --pc-fg: #EDEDF2;
          --pc-title: #EDEDF2;
          --pc-sub: #8A8A92;
          --pc-grid: #2A2A35;
          --pc-border: #1E1E2C;
          --pc-tip-bg: #1A1A24;
          --pc-tip-border: #2A2A35;
        }
        :root:not(.dark) .premium-chart-card {
          --pc-bg: #FFFFFF;
          --pc-fg: #101014;
          --pc-title: #101014;
          --pc-sub: #8A8A92;
          --pc-grid: #E3E3DC;
          --pc-border: #E3E3DC;
          --pc-tip-bg: #FFFFFF;
          --pc-tip-border: #E3E3DC;
        }
        @keyframes plc-draw {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
        .plc-line-draw {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: plc-draw 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes plc-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .plc-area-fade {
          opacity: 0;
          animation: plc-fade 0.7s ease-out 0.55s forwards;
        }
      `}</style>
    </div>
  );
}
