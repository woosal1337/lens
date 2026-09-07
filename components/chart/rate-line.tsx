"use client";

import { useTranslation } from "@/lib/i18n/provider";

import * as stylex from "@stylexjs/stylex";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { AxisTick } from "@/components/chart/axis-tick";
import { ChartTooltip } from "@/components/chart/chart-tooltip";
import { color, font, series as palette, type } from "@/styles/tokens.stylex";

export type RatePoint = { key: string; value: number };

const MARGIN = { top: 24, right: 22, bottom: 0, left: 14 };
const AXIS_HEIGHT = 22;
const DOT = 3.5;
const ACTIVE_DOT = 5.5;
const LABEL_LIFT = 12;
const GRID_DASH = "2 5";
const Y_DOMAIN = [0, 1] as const;
const AXIS_LINE = { stroke: color.line };
const CURSOR = { stroke: color.lineStrong, strokeWidth: 1 };
const BRAND_DOT = { r: DOT, fill: palette.brand, strokeWidth: 0 };
const BRAND_ACTIVE = { r: ACTIVE_DOT, fill: palette.brand, strokeWidth: 0 };
const FIRST_DOT = { r: DOT, fill: palette.first, strokeWidth: 0 };
const FIRST_ACTIVE = { r: ACTIVE_DOT, fill: palette.first, strokeWidth: 0 };

const styles = stylex.create({
  label: {
    fontFamily: font.mono,
    fontSize: type.microSize,
    fill: color.fg,
    fontVariantNumeric: "tabular-nums"
  }
});

function RateLabel({
  x = 0,
  y = 0,
  value
}: {
  x?: string | number;
  y?: string | number;
  value?: string | number;
}) {
  const t = useTranslation();
  return (
    <text
      x={Number(x)}
      y={Number(y) - LABEL_LIFT}
      textAnchor="middle"
      {...stylex.props(styles.label)}
    >
      {t.percent(Number(value ?? 0), 1)}
    </text>
  );
}

const TICK = <AxisTick />;

const RATE = <RateLabel />;

export function RateLine({
  data,
  tone = "brand"
}: {
  data: RatePoint[];
  tone?: "accent" | "brand";
}) {
  const t = useTranslation();
  const brand = tone === "brand";
  const stroke = brand ? palette.brand : palette.first;
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={MARGIN}>
        <CartesianGrid vertical={false} stroke={color.line} strokeDasharray={GRID_DASH} />
        <XAxis
          dataKey="key"
          height={AXIS_HEIGHT}
          tickLine={false}
          axisLine={AXIS_LINE}
          interval="preserveStartEnd"
          tick={TICK}
        />
        <YAxis hide domain={Y_DOMAIN} />
        <Tooltip
          cursor={CURSOR}
          animationDuration={0}
          content={<ChartTooltip format={(value) => t.percent(value, 1)} />}
        />
        <Line
          type="monotone"
          dataKey="value"
          name={t("Follow you back")}
          stroke={stroke}
          strokeWidth={2}
          dot={brand ? BRAND_DOT : FIRST_DOT}
          activeDot={brand ? BRAND_ACTIVE : FIRST_ACTIVE}
          isAnimationActive={false}
        >
          <LabelList dataKey="value" content={RATE} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}
