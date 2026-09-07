"use client";

import { useTranslation } from "@/lib/i18n/provider";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AxisTick } from "@/components/chart/axis-tick";
import { ChartTooltip } from "@/components/chart/chart-tooltip";
import { type BarPoint, toDaily, toMonthly } from "@/lib/analysis/buckets";

import { color, series } from "@/styles/tokens.stylex";

export { toDaily, toMonthly };
export type { BarPoint };

const MARGIN = { top: 8, right: 2, bottom: 0, left: 2 };
const RADIUS: [number, number, number, number] = [3, 3, 0, 0];
const Y_DOMAIN = [0, "dataMax"] as const;
const AXIS_HEIGHT = 22;
const STUB = 1;
const MIN_TICK_GAP = 28;
const GRID_DASH = "2 5";
const AXIS_LINE = { stroke: color.line };
const CURSOR = { fill: color.surfaceHover };
const ACTIVE_BAR = { fill: color.brand };

function shortKey(key: string): string {
  return key.length > 7 ? key.slice(5) : key;
}

function stub(): number {
  return STUB;
}

const TICK = <AxisTick formatter={shortKey} />;

export function MonthlyBars({
  data,
  tone = "accent",
  unit
}: {
  data: BarPoint[];
  tone?: "accent" | "brand";
  unit?: string;
}) {
  const t = useTranslation();
  const fill = tone === "brand" ? series.brand : series.first;
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={MARGIN} barCategoryGap="18%">
        <CartesianGrid vertical={false} stroke={color.line} strokeDasharray={GRID_DASH} />
        <XAxis
          dataKey="key"
          height={AXIS_HEIGHT}
          tickLine={false}
          axisLine={AXIS_LINE}
          interval="preserveStartEnd"
          minTickGap={MIN_TICK_GAP}
          tick={TICK}
        />
        <YAxis hide domain={Y_DOMAIN} />
        <Tooltip
          cursor={CURSOR}
          animationDuration={0}
          content={<ChartTooltip format={t.count} />}
        />
        <Bar
          dataKey="value"
          name={unit ?? t("Records")}
          fill={fill}
          radius={RADIUS}
          minPointSize={stub}
          isAnimationActive={false}
          activeBar={ACTIVE_BAR}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
