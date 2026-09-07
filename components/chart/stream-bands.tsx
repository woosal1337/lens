"use client";

import { useTranslation } from "@/lib/i18n/provider";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { ParentSize } from "@visx/responsive";
import { scaleBand } from "@visx/scale";
import { Group } from "@visx/group";
import { AxisTick } from "@/components/chart/axis-tick";
import { TipCard } from "@/components/chart/tip-card";

import { color, series } from "@/styles/tokens.stylex";

export type BandRow = {
  id: string;
  label: string;
  short: boolean;
  months: Map<string, number>;
  total: number;
};

type Hover = {
  left: number;
  top: number;
  head: string;
  label: string;
  value: number;
  tone: string;
};

const LABEL_WIDTH = 168;
const AXIS = 22;
const GAP = 10;
const YEAR_STEP = 12;
const TIP_LIFT = 12;
const TIP_EDGE = 84;

const styles = stylex.create({
  frame: { position: "relative", width: "100%", height: "100%" },
  floater: { position: "absolute", zIndex: 5, pointerEvents: "none" }
});

export function StreamBands({
  rows,
  months
}: {
  rows: readonly BandRow[];
  months: readonly string[];
}) {
  return (
    <ParentSize>
      {({ width, height }) => {
        if (width < 1 || height < 1 || rows.length === 0 || months.length === 0) return null;
        return <Bands rows={rows} months={months} width={width} height={height} />;
      }}
    </ParentSize>
  );
}

function Bands({
  rows,
  months,
  width,
  height
}: {
  rows: readonly BandRow[];
  months: readonly string[];
  width: number;
  height: number;
}) {
  const t = useTranslation();

  const [hover, setHover] = useState<Hover | null>(null);

  const plotStart = Math.min(LABEL_WIDTH, width * 0.3);
  const plotWidth = Math.max(1, width - plotStart - GAP);
  const plotHeight = Math.max(1, height - AXIS);

  const yScale = scaleBand<string>({
    domain: rows.map((row) => row.id),
    range: [0, plotHeight],
    padding: 0.22
  });
  const cell = plotWidth / months.length;
  const band = yScale.bandwidth();
  const ticks = months.filter((_, index) => index % YEAR_STEP === 0);

  const track = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const index = Math.floor((x - plotStart) / cell);
    const month = months[index];
    const row = rows.find((entry) => {
      const top = yScale(entry.id) ?? 0;
      return y >= top && y <= top + band;
    });
    if (month === undefined || row === undefined || index < 0) {
      setHover(null);
      return;
    }
    setHover({
      left: Math.min(Math.max(plotStart + index * cell + cell / 2, TIP_EDGE), width - TIP_EDGE),
      top: (yScale(row.id) ?? 0) - TIP_LIFT,
      head: month,
      label: row.label,
      value: row.months.get(month) ?? 0,
      tone: row.short ? series.brand : series.first
    });
  };

  return (
    <div {...stylex.props(styles.frame)}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={t("Every stream, per month")}
        onPointerMove={track}
        onPointerLeave={() => {
          setHover(null);
        }}
      >
        <Group>
          {rows.map((row) => {
            const top = yScale(row.id) ?? 0;
            const peak = Math.max(1, ...row.months.values());
            const fill = row.short ? series.brand : series.first;
            const lit = hover !== null && hover.label === row.label;
            return (
              <Group key={row.id}>
                <rect
                  x={plotStart}
                  y={top}
                  width={plotWidth}
                  height={band}
                  fill={lit ? color.surfaceHover : "transparent"}
                />
                {months.map((month, index) => {
                  const value = row.months.get(month) ?? 0;
                  if (value === 0) return null;
                  return (
                    <rect
                      key={month}
                      x={plotStart + index * cell}
                      y={top}
                      width={Math.max(1, cell - 1)}
                      height={band}
                      rx={1}
                      fill={fill}
                      opacity={(0.22 + 0.78 * (value / peak)) * (hover === null || lit ? 1 : 0.42)}
                    />
                  );
                })}
              </Group>
            );
          })}
          {rows.map((row) => (
            <AxisTick
              key={row.id}
              x={plotStart - GAP}
              y={(yScale(row.id) ?? 0) + band / 2}
              dy={4}
              textAnchor="end"
              strong={hover !== null && hover.label === row.label}
              payload={{ value: row.label }}
            />
          ))}
          {ticks.map((month) => (
            <AxisTick
              key={month}
              x={plotStart + months.indexOf(month) * cell}
              y={plotHeight}
              dy={15}
              textAnchor="start"
              payload={{ value: month.slice(0, 4) }}
            />
          ))}
        </Group>
      </svg>
      {hover === null ? null : (
        <div
          style={{ left: hover.left, top: hover.top, transform: "translate(-50%, -100%)" }}
          {...stylex.props(styles.floater)}
        >
          <TipCard
            head={hover.head}
            rows={[{ label: hover.label, value: t.count(hover.value), color: hover.tone }]}
          />
        </div>
      )}
    </div>
  );
}
