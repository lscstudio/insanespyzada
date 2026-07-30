import { useId, useMemo, useRef, useState } from "react";
import type { Snapshot } from "../lib/types";

/**
 * PremiumLineChart — gráfico de linha estilo Stripe/Vercel/Linear.
 *
 * - Linha suave (catmull-rom → bézier) com stroke em gradiente
 * - Área semi-transparente com fade vertical
 * - Eixo Y com ticks de valor; grid hairline horizontal
 * - Crosshair: band vertical + dot + tooltip HTML com delta vs ponto anterior
 * - Marcadores min/max anotados
 * - Ponto final pulsante; animação de entrada (stroke draw + area fade)
 * - Filtros 7D/14D/30D opcionais
 */

const W = 1000;
const H = 280;
const PAD_LEFT = 48;
const PAD_RIGHT = 24;
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
    const c1y = p1.y + (p2.y - p1.y) / 6;
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
function fmtNum(v: number): string {
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
  const [hoverX, setHoverX] = useState<number | null>(null);
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
  const maxV = Math.max(...values, 1);
  const minV = Math.min(...values, 0);
  // adiciona 8% de headroom no topo para o ponto não colar na borda
  const yMax = maxV === 0 ? 1 : maxV + (maxV - minV) * 0.08;
  const yMin = Math.min(0, minV - (maxV - minV) * 0.04);
  const span = yMax - yMin || 1;
  const innerW = W - PAD_LEFT - PAD_RIGHT;
  const innerH = height - PAD_TOP - PAD_BOTTOM;

  const pts = values.map((v, i) => ({
    x: PAD_LEFT + (slice.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW),
    y: PAD_TOP + (1 - (v - yMin) / span) * innerH,
  }));

  const line = smoothPath(pts);
  const baseline = height - PAD_BOTTOM;
  const area =
    pts.length > 1
      ? `${line} L ${pts[pts.length - 1].x.toFixed(2)} ${baseline} L ${pts[0].x.toFixed(2)} ${baseline} Z`
      : "";

  const last = pts[pts.length - 1];
  // 4 ticks Y (inclui extremos)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const v = yMin + f * span;
    const y = PAD_TOP + (1 - f) * innerH;
    return { y, v: Math.round(v) };
  });

  // min/max points
  let maxIdx = 0;
  let minIdx = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[maxIdx]) maxIdx = i;
    if (values[i] < values[minIdx]) minIdx = i;
  }
  const hasMinMax = values.length >= 3 && maxV !== minV;

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

  function nearestIdx(xVb: number): number {
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const dx = Math.abs(pts[i].x - xVb);
      if (dx < best) {
        best = dx;
        nearest = i;
      }
    }
    return nearest;
  }

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!hasData || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const xVb = (xPx / rect.width) * W;
    setHoverIdx(nearestIdx(xVb));
    setHoverX(xVb);
  }

  function handleTouch(e: React.TouchEvent<SVGSVGElement>) {
    if (!hasData || !svgRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xPx = touch.clientX - rect.left;
    const xVb = (xPx / rect.width) * W;
    setHoverIdx(nearestIdx(xVb));
    setHoverX(xVb);
  }

  const hoverPoint = hoverIdx !== null ? pts[hoverIdx] : null;
  const hoverVal = hoverIdx !== null ? values[hoverIdx] : 0;
  const prevHoverVal = hoverIdx !== null && hoverIdx > 0 ? values[hoverIdx - 1] : null;
  const hoverDelta = prevHoverVal !== null ? hoverVal - prevHoverVal : null;

  const tipLeftPct = hoverPoint ? (hoverPoint.x / W) * 100 : 0;
  const tipTopPct = hoverPoint ? (hoverPoint.y / height) * 100 : 0;
  const tipFlip = tipLeftPct > 62;

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
                {fmtNum(current)}
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
            onMouseLeave={() => {
              setHoverIdx(null);
              setHoverX(null);
            }}
            onTouchStart={handleTouch}
            onTouchMove={handleTouch}
            onTouchEnd={() => {
              setHoverIdx(null);
              setHoverX(null);
            }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F7DFF" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#4F7DFF" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={gradIdSolid} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4F7DFF" />
                <stop offset="100%" stopColor="#7B9CFF" />
              </linearGradient>
              <filter id={`${gradId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* grade horizontal hairline + rótulos Y */}
            {yTicks.map((t, i) => (
              <g key={i}>
                <line
                  x1={PAD_LEFT}
                  x2={W - PAD_RIGHT}
                  y1={t.y}
                  y2={t.y}
                  stroke="var(--pc-grid, #2A2A35)"
                  strokeWidth={1}
                  strokeOpacity={hoverPoint && Math.abs(hoverPoint.y - t.y) < 2 ? 0.6 : 0.32}
                  style={{ transition: "stroke-opacity .15s" }}
                />
                <text
                  x={PAD_LEFT - 8}
                  y={t.y + 3}
                  textAnchor="end"
                  fontSize={10}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                  fill="var(--pc-sub, #8A8A92)"
                  fillOpacity={0.75}
                >
                  {fmtNum(t.v)}
                </text>
              </g>
            ))}

            {/* band vertical no hover (realça a coluna) */}
            {hoverPoint && (
              <rect
                x={hoverPoint.x - 14}
                y={PAD_TOP - 8}
                width={28}
                height={innerH + 12}
                fill="#4F7DFF"
                fillOpacity={0.06}
                rx={4}
                style={{ transition: "x .08s ease" }}
              />
            )}

            {/* cursor vertical no hover */}
            {hoverPoint && (
              <line
                x1={hoverPoint.x}
                x2={hoverPoint.x}
                y1={PAD_TOP - 8}
                y2={baseline + 4}
                stroke="#4F7DFF"
                strokeOpacity={0.45}
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
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                className="plc-line-draw"
                filter={`url(#${gradId}-glow)`}
              />
            )}

            {/* marcadores min/max */}
            {hasMinMax && hoverIdx === null && (
              <>
                <circle
                  cx={pts[maxIdx].x}
                  cy={pts[maxIdx].y}
                  r={3}
                  fill="#10B981"
                  className="plc-area-fade"
                />
                <text
                  x={pts[maxIdx].x}
                  y={pts[maxIdx].y - 10}
                  textAnchor="middle"
                  fontSize={9.5}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                  fill="#10B981"
                  className="plc-area-fade"
                >
                  máx {fmtNum(values[maxIdx])}
                </text>
                <circle
                  cx={pts[minIdx].x}
                  cy={pts[minIdx].y}
                  r={3}
                  fill="#F87171"
                  className="plc-area-fade"
                />
                <text
                  x={pts[minIdx].x}
                  y={pts[minIdx].y + 16}
                  textAnchor="middle"
                  fontSize={9.5}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                  fill="#F87171"
                  className="plc-area-fade"
                >
                  min {fmtNum(values[minIdx])}
                </text>
              </>
            )}

            {/* ponto final pulsante (estilo Stripe) */}
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
                  className="plc-pulse"
                />
              </>
            )}

            {/* dot no ponto hoverado */}
            {hoverPoint && (
              <>
                <circle
                  cx={hoverPoint.x}
                  cy={hoverPoint.y}
                  r={6.5}
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
                fillOpacity={hoverIdx === i ? 1 : 0.7}
                style={{ transition: "fill-opacity .15s" }}
              >
                {fmtShort(slice[i].t)}
              </text>
            ))}
          </svg>

          {/* tooltip HTML overlay */}
          {hoverPoint && (
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
                padding: "9px 13px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                zIndex: 5,
                whiteSpace: "nowrap",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#4F7DFF",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.1,
                }}
              >
                {fmtNum(hoverVal)}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--pc-sub, #8A8A92)",
                    marginLeft: 6,
                  }}
                >
                  ads
                </span>
              </div>
              {hoverDelta !== null && hoverDelta !== 0 && (
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: hoverDelta > 0 ? "#10B981" : "#F87171",
                  }}
                >
                  {hoverDelta > 0 ? "+" : ""}
                  {fmtNum(hoverDelta)} vs anterior
                </div>
              )}
              <div
                style={{
                  marginTop: 3,
                  fontSize: 10.5,
                  color: "var(--pc-sub, #8A8A92)",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                }}
              >
                {fmtLong(slice[hoverIdx!].t)}
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
        @keyframes plc-pulse {
          0% { r: 8; opacity: 0.5; }
          70% { r: 13; opacity: 0; }
          100% { r: 13; opacity: 0; }
        }
        .plc-pulse {
          transform-origin: center;
          animation: plc-pulse 2.2s ease-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .plc-line-draw, .plc-area-fade, .plc-pulse { animation: none; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
