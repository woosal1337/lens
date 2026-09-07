"use client";

import { useTranslation } from "@/lib/i18n/provider";

import { useMemo } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { AxisTick } from "@/components/chart/axis-tick";
import { TipCard } from "@/components/chart/tip-card";
import { type PlacePoint } from "@/lib/analysis/places";

import { color, series } from "@/styles/tokens.stylex";

const MARGIN = { top: 8, right: 14, bottom: 0, left: 6 };
const AXIS_HEIGHT = 22;
const AXIS_WIDTH = 46;
const PAD = 0.18;
const MIN_SPAN = 1.5;
const CAPTION_MAX = 40;
const GRID_DASH = "2 5";
const AXIS_LINE = { stroke: color.line };
const CURSOR = { strokeDasharray: "3 3", stroke: color.lineStrong };
const PLACE_DIGITS = 4;
const DEGREE_DIGITS = 1;

function bounds(values: readonly number[], floor: number, ceiling: number): [number, number] {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = Math.max(MIN_SPAN, high - low);
  const pad = span * PAD;
  return [Math.max(floor, low - pad), Math.min(ceiling, high + pad)];
}

function degree(value: string): string {
  return `${Number(value).toFixed(DEGREE_DIGITS)}°`;
}

function shorten(caption: string): string {
  if (caption.length <= CAPTION_MAX) return caption;
  return `${caption.slice(0, CAPTION_MAX - 1)}…`;
}

function PlaceTip({ active, payload }: { active?: boolean; payload?: { payload?: unknown }[] }) {
  const t = useTranslation();

  const point = payload?.[0]?.payload as PlacePoint | undefined;
  if (active !== true || point === undefined) return null;
  return (
    <TipCard
      head={t.isoDate(point.at)}
      rows={[
        { label: t("Latitude"), value: point.lat.toFixed(PLACE_DIGITS), color: series.brand },
        { label: t("Longitude"), value: point.lon.toFixed(PLACE_DIGITS) },
        ...(point.caption.length === 0
          ? []
          : [{ label: t("Caption"), value: shorten(point.caption) }])
      ]}
    />
  );
}

const X_TICK = <AxisTick formatter={degree} />;
const Y_TICK = <AxisTick textAnchor="end" dy={4} formatter={degree} />;
const TIP = <PlaceTip />;

export function PlaceMap({ points }: { points: readonly PlacePoint[] }) {
  const rows = useMemo(() => [...points], [points]);
  const x = useMemo(
    () =>
      points.length === 0
        ? ([-180, 180] as [number, number])
        : bounds(
            points.map((point) => point.lon),
            -180,
            180
          ),
    [points]
  );
  const y = useMemo(
    () =>
      points.length === 0
        ? ([-90, 90] as [number, number])
        : bounds(
            points.map((point) => point.lat),
            -90,
            90
          ),
    [points]
  );

  if (points.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={MARGIN}>
        <CartesianGrid stroke={color.line} strokeDasharray={GRID_DASH} />
        <XAxis
          type="number"
          dataKey="lon"
          domain={x}
          height={AXIS_HEIGHT}
          tickLine={false}
          axisLine={AXIS_LINE}
          tick={X_TICK}
        />
        <YAxis
          type="number"
          dataKey="lat"
          domain={y}
          width={AXIS_WIDTH}
          tickLine={false}
          axisLine={AXIS_LINE}
          tick={Y_TICK}
        />
        <ReferenceLine x={0} stroke={color.lineStrong} />
        <ReferenceLine y={0} stroke={color.lineStrong} />
        <Tooltip cursor={CURSOR} animationDuration={0} content={TIP} />
        <Scatter data={rows} fill={series.brand} shape="circle" legendType="none" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
