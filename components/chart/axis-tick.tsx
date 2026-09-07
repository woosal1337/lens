"use client";

import * as stylex from "@stylexjs/stylex";
import { color, font, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  tick: {
    fontFamily: font.mono,
    fontSize: type.microSize,
    fill: color.fgSubtle,
    userSelect: "none"
  },
  strong: { fill: color.fg }
});

export type TickProps = {
  x?: number;
  y?: number;
  dy?: number;
  dx?: number;
  textAnchor?: "start" | "middle" | "end";
  strong?: boolean;
  payload?: { value?: string | number };
  formatter?: (value: string) => string;
};

export function AxisTick({
  x = 0,
  y = 0,
  dy = 12,
  dx = 0,
  textAnchor = "middle",
  strong = false,
  payload,
  formatter
}: TickProps) {
  const raw = String(payload?.value ?? "");
  const shown = formatter === undefined ? raw : formatter(raw);
  return (
    <text
      x={x}
      y={y}
      dy={dy}
      dx={dx}
      textAnchor={textAnchor}
      {...stylex.props(styles.tick, strong && styles.strong)}
    >
      {shown}
    </text>
  );
}
