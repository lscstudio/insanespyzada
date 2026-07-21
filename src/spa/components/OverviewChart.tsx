import type { Snapshot } from "../lib/types";
import { useStore } from "../lib/store";
import { dayLabel } from "../lib/format";

const W = 800;
const H = 260;
const PAD_X = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 30;

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

interface Pt {
  x: number;
  y: number;
}

/** Catmull-Rom → Bézier cúbica: linha única suave passando por todos os pontos */
function smoothPath(pts: Pt[]): string {
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

export function OverviewAreaChart({ data }: { data: Snapshot[] }) {
  const { theme } = useStore();
  const brand = theme === "dark" ? "#296CD8" : "#0F52BA";

  if (data.length < 2) {
    return (
      <div className="flex h-[260px] items-center justify-center text-xs text-ink-3 dark:text-dink-3">
        Dados insuficientes para o período.
      </div>
    );
  }

  const values = data.map((d) => d.activeAds);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const pts: Pt[] = values.map((v, i) => ({
    x: PAD_X + (i / (values.length - 1)) * innerW,
    y: PAD_TOP + (1 - (v - min) / span) * innerH,
  }));

  const line = smoothPath(pts);
  const baseline = H - PAD_BOTTOM;
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(2)} ${baseline} L ${pts[0].x.toFixed(2)} ${baseline} Z`;
  const last = pts[pts.length - 1];

  /* 3 linhas de grade horizontais hairline */
  const gridYs = [0.25, 0.5, 0.75].map((f) => PAD_TOP + f * innerH);

  /* rótulos de data (até 6, uniformemente espaçados) */
  const labelCount = Math.min(6, data.length);
  const labelIdxs = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i * (data.length - 1)) / (labelCount - 1)),
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Evolução de anúncios ativos"
    >
      <defs>
        <linearGradient id="ovAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={brand} stopOpacity={0.26} />
          <stop offset="100%" stopColor={brand} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* grade hairline */}
      {gridYs.map((y) => (
        <line
          key={y}
          x1={PAD_X}
          x2={W - PAD_X}
          y1={y}
          y2={y}
          stroke="currentColor"
          strokeWidth={0.75}
          className="text-line dark:text-dline"
        />
      ))}

      {/* preenchimento em degradê que some para baixo */}
      <path d={area} fill="url(#ovAreaFill)" className="chart-area-fade" />

      {/* linha única azul suave com animação de traçado */}
      <path
        d={line}
        fill="none"
        stroke={brand}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="chart-line-draw"
      />

      {/* ponto do valor atual */}
      <circle cx={last.x} cy={last.y} r={4} fill={brand} className="chart-area-fade" />
      <circle
        cx={last.x}
        cy={last.y}
        r={8}
        fill="none"
        stroke={brand}
        strokeOpacity={0.35}
        strokeWidth={1.5}
        className="chart-area-fade"
      />

      {/* rótulos de data em fonte mono */}
      {labelIdxs.map((i) => (
        <text
          key={i}
          x={pts[i].x}
          y={H - 8}
          textAnchor="middle"
          fontSize={10.5}
          fontFamily={MONO}
          fill="currentColor"
          className="text-ink-3 dark:text-dink-3"
        >
          {dayLabel(data[i].t)}
        </text>
      ))}
    </svg>
  );
}
