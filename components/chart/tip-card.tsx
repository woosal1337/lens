"use client";

import * as stylex from "@stylexjs/stylex";
import { color, font, shape, space, type } from "@/styles/tokens.stylex";

export type TipRow = { label: string; value: string; color?: string };

const styles = stylex.create({
  root: {
    minWidth: shape.tipWidth,
    padding: space.s3,
    borderRadius: shape.radiusM,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.lineStrong,
    backgroundColor: color.surfaceRaised,
    boxShadow: shape.shadowOverlay,
    pointerEvents: "none"
  },
  head: {
    fontFamily: font.mono,
    fontSize: type.microSize,
    letterSpacing: type.microTracking,
    color: color.fgSubtle,
    display: "block",
    paddingBlockEnd: space.s2
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s4,
    paddingBlockStart: space.s1
  },
  key: { display: "flex", alignItems: "center", gap: space.s2, minWidth: 0 },
  swatch: {
    width: space.s2,
    height: space.s2,
    borderRadius: shape.radiusPill,
    flexShrink: 0
  },
  label: {
    fontFamily: font.sans,
    fontSize: type.microSize,
    letterSpacing: "normal",
    color: color.fgMuted,
    whiteSpace: "nowrap"
  },
  value: {
    fontFamily: font.mono,
    fontSize: type.figureSSize,
    fontVariantNumeric: "tabular-nums",
    color: color.fg
  }
});

export function TipCard({ head, rows }: { head: string; rows: readonly TipRow[] }) {
  return (
    <div {...stylex.props(styles.root)}>
      {head.length === 0 ? null : <span {...stylex.props(styles.head)}>{head}</span>}
      {rows.map((row) => (
        <span key={row.label} {...stylex.props(styles.row)}>
          <span {...stylex.props(styles.key)}>
            {row.color === undefined ? null : (
              <span style={{ backgroundColor: row.color }} {...stylex.props(styles.swatch)} />
            )}
            <span {...stylex.props(styles.label)}>{row.label}</span>
          </span>
          <span {...stylex.props(styles.value)}>{row.value}</span>
        </span>
      ))}
    </div>
  );
}
