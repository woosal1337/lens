"use client";

import { type TooltipContentProps } from "recharts";
import { TipCard, type TipRow } from "@/components/chart/tip-card";

export type TipFormat = (value: number) => string;

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

export function ChartTooltip({
  active,
  payload,
  label,
  head,
  format
}: Partial<TooltipContentProps> & {
  head?: (label: string | number | undefined) => string;
  format?: TipFormat;
}) {
  if (active !== true || payload === undefined || payload.length === 0) return null;

  const rows: TipRow[] = payload.map((entry, index) => ({
    label: String(entry.name ?? entry.dataKey ?? index),
    value: format === undefined ? String(entry.value) : format(asNumber(entry.value)),
    ...(entry.color === undefined ? {} : { color: entry.color })
  }));

  return <TipCard head={head === undefined ? String(label ?? "") : head(label)} rows={rows} />;
}
