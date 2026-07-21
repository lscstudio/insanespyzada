import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Snapshot } from "../lib/types";
import { dayLabel, hourBR, num } from "../lib/format";
import { useStore } from "../lib/store";

function useChartColors() {
  const { theme } = useStore();
  const dark = theme === "dark";
  return {
    brand: "#0F52BA",
    brandBright: "#296CD8",
    grid: dark ? "#1e1e2c" : "#e3e3dc",
    tick: dark ? "#63636f" : "#8a8a92",
    tooltipBg: dark ? "#0d0d15" : "#ffffff",
    tooltipBorder: dark ? "#1e1e2c" : "#e3e3dc",
    tooltipText: dark ? "#ededf2" : "#101014",
  };
}

type TooltipProps = {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    name?: string;
    value?: number;
    color?: string;
    stroke?: string;
  }>;
  label?: string | number;
  colors: Record<string, string>;
  formatter?: (v: string | number) => string;
};

function ChartTooltip({ active, payload, label, colors, formatter }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="border px-3 py-2 font-mono text-xs"
      style={{
        background: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        color: colors.tooltipText,
      }}
    >
      <div className="mb-1 text-[10px] uppercase tracking-widest opacity-60">
        {formatter ? formatter(label) : label}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2" style={{ background: p.color || p.stroke }} />
          <span className="uppercase tracking-wider opacity-70">{p.name}:</span>
          <span className="font-bold tabular-nums">{num(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function EvolutionChart({
  data,
  labelFormat = "day",
  height = 260,
}: {
  data: Snapshot[];
  labelFormat?: "day" | "hour";
  height?: number;
}) {
  const colors = useChartColors();
  const fmt = labelFormat === "day" ? dayLabel : hourBR;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="gAds" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.brand} stopOpacity={0.35} />
            <stop offset="100%" stopColor={colors.brand} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={colors.grid} strokeDasharray="2 6" vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={fmt}
          tick={{ fill: colors.tick, fontSize: 10, fontFamily: "inherit" }}
          axisLine={{ stroke: colors.grid }}
          tickLine={false}
          minTickGap={32}
        />
        <YAxis
          tick={{ fill: colors.tick, fontSize: 10, fontFamily: "inherit" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          content={<ChartTooltip colors={colors} formatter={fmt} />}
          cursor={{ stroke: colors.brand, strokeDasharray: "3 3" }}
        />
        <Area
          type="stepAfter"
          dataKey="activeAds"
          name="anúncios ativos"
          stroke={colors.brand}
          strokeWidth={2}
          fill="url(#gAds)"
        />
        <Line
          type="monotone"
          dataKey="uniqueCreatives"
          name="criativos únicos"
          stroke={colors.tick}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data, height = 44 }: { data: number[]; height?: number }) {
  const colors = useChartColors();
  const points = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <Line type="monotone" dataKey="v" stroke={colors.brand} strokeWidth={1.5} dot={false} />
        <YAxis hide domain={["dataMin", "dataMax"]} />
      </LineChart>
    </ResponsiveContainer>
  );
}
