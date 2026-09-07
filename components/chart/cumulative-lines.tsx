"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { AxisTick } from "@/components/chart/axis-tick";
import { ChartTooltip } from "@/components/chart/chart-tooltip";
import { type SeriesPoint, toCumulative } from "@/lib/analysis/buckets";

import { color } from "@/styles/tokens.stylex";

export { toCumulative };
export type { SeriesPoint };

export type Series = { id: string; label: string; color: string; points: SeriesPoint[] };

type Frame = Record<string, number>;

const MARGIN = { top: 8, right: 6, bottom: 0, left: 6 };
const AXIS_HEIGHT = 22;
const MIN_TICK_GAP = 56;
const SAMPLES = 220;
const DOT = 4;
const GRID_DASH = "2 5";
const X_DOMAIN = ["dataMin", "dataMax"] as const;
const Y_DOMAIN = [0, "dataMax"] as const;
const AXIS_LINE = { stroke: color.line };
const CURSOR = { stroke: color.lineStrong, strokeWidth: 1 };
const PLAIN_DOT = { r: DOT, strokeWidth: 0 };

function frames(lines: readonly Series[], from: number, to: number): Frame[] {
  const cursor = lines.map(() => 0);
  const held = lines.map(() => 0);
  const span = Math.max(1, to - from);
  const steps = Math.min(SAMPLES, span);
  const rows: Frame[] = [];

  for (let step = 0; step <= steps; step += 1) {
    const at = Math.round(from + (span * step) / steps);
    const row: Frame = { at };
    lines.forEach((line, index) => {
      let seen = cursor[index] ?? 0;
      let value = held[index] ?? 0;
      while (seen < line.points.length && (line.points[seen]?.at ?? 0) <= at) {
        value = line.points[seen]?.value ?? value;
        seen += 1;
      }
      cursor[index] = seen;
      held[index] = value;
      row[line.id] = value;
    });
    rows.push(row);
  }
  return rows;
}

function monthOf(value: string): string {
  return new Date(Number(value) * 1000).toISOString().slice(0, 7);
}

function headDate(t: Translator, label: string | number | undefined): string {
  return t.isoDate(Number(label ?? 0));
}

const TICK = <AxisTick formatter={monthOf} />;

export function CumulativeLines({ series }: { series: readonly Series[] }) {
  const t = useTranslation();

  const all = series.flatMap((line) => line.points);
  const from = all.length === 0 ? 0 : Math.min(...all.map((point) => point.at));
  const to = all.length === 0 ? 0 : Math.max(...all.map((point) => point.at));
  const size = all.length;
  const data = useMemo(
    () => (size === 0 ? [] : frames(series, from, to)),
    [series, from, to, size]
  );
  const dots = useMemo(
    () => new Map(series.map((line) => [line.id, { r: DOT, strokeWidth: 0, fill: line.color }])),
    [series]
  );
  const ticks = Array.from({ length: 6 }, (_, index) => from + ((to - from) * index) / 5).filter(
    (at, index, values) => index === 0 || monthOf(String(at)) !== monthOf(String(values[index - 1]))
  );

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={MARGIN}>
        <CartesianGrid vertical={false} stroke={color.line} strokeDasharray={GRID_DASH} />
        <XAxis
          dataKey="at"
          type="number"
          scale="linear"
          ticks={ticks}
          domain={X_DOMAIN}
          height={AXIS_HEIGHT}
          tickLine={false}
          axisLine={AXIS_LINE}
          minTickGap={MIN_TICK_GAP}
          tick={TICK}
        />
        <YAxis hide domain={Y_DOMAIN} />
        <Tooltip
          cursor={CURSOR}
          animationDuration={0}
          content={<ChartTooltip head={(value) => headDate(t, value)} format={t.count} />}
        />
        {series.map((line) => (
          <Line
            key={line.id}
            type="monotone"
            dataKey={line.id}
            name={line.label}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
            activeDot={dots.get(line.id) ?? PLAIN_DOT}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
