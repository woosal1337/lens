"use client";

import { useTranslation } from "@/lib/i18n/provider";

import * as stylex from "@stylexjs/stylex";
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AxisTick } from "@/components/chart/axis-tick";
import { ChartTooltip } from "@/components/chart/chart-tooltip";
import { type RankPoint, toRanked } from "@/lib/analysis/buckets";

import { color, font, series, type } from "@/styles/tokens.stylex";

export { toRanked };
export type { RankPoint };

const LABEL_WIDTH = 132;
const VALUE_WIDTH = 54;
const LABEL_MAX = 17;
const ROW_MAX = 26;
const STUB = 2;
const RADIUS: [number, number, number, number] = [0, 3, 3, 0];
const MARGIN = { top: 2, right: VALUE_WIDTH, bottom: 2, left: 0 };
const X_DOMAIN = [0, "dataMax"] as const;
const LABEL_GAP = 8;
const CURSOR = { fill: color.surfaceHover };
const ACTIVE_BAR = { fill: color.brand };

const styles = stylex.create({
  value: {
    fontFamily: font.mono,
    fontSize: type.microSize,
    fill: color.fg,
    fontVariantNumeric: "tabular-nums"
  }
});

function trim(label: string) {
  if (label.length <= LABEL_MAX) return label;
  return `${label.slice(0, LABEL_MAX - 1)}…`;
}

function stub(): number {
  return STUB;
}

function ValueLabel({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  value
}: {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  height?: string | number;
  value?: string | number;
}) {
  const t = useTranslation();

  return (
    <text
      x={Number(x) + Number(width) + LABEL_GAP}
      y={Number(y) + Number(height) / 2}
      dominantBaseline="middle"
      {...stylex.props(styles.value)}
    >
      {t.count(Number(value ?? 0))}
    </text>
  );
}

const TICK = <AxisTick textAnchor="end" dy={4} formatter={trim} />;

const VALUE = <ValueLabel />;

export function RankBars({
  data,
  tone = "accent"
}: {
  data: RankPoint[];
  tone?: "accent" | "brand";
}) {
  const t = useTranslation();
  const fill = tone === "brand" ? series.brand : series.first;
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart layout="vertical" data={data} margin={MARGIN} barCategoryGap="30%">
        <XAxis type="number" hide domain={X_DOMAIN} />
        <YAxis
          type="category"
          dataKey="label"
          width={LABEL_WIDTH}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={TICK}
        />
        <Tooltip
          cursor={CURSOR}
          animationDuration={0}
          content={<ChartTooltip format={t.count} />}
        />
        <Bar
          dataKey="value"
          name={t("Total")}
          fill={fill}
          radius={RADIUS}
          maxBarSize={ROW_MAX}
          minPointSize={stub}
          isAnimationActive={false}
          activeBar={ACTIVE_BAR}
        >
          <LabelList dataKey="value" content={VALUE} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
