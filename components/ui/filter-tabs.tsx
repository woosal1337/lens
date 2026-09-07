"use client";

import { useTranslation } from "@/lib/i18n/provider";

import * as stylex from "@stylexjs/stylex";

import { color, font, motion, shape, space, type } from "@/styles/tokens.stylex";

export type FilterTab = { id: string; label: string; count?: number };

const styles = stylex.create({
  root: {
    display: "flex",
    flexWrap: "nowrap",
    gap: space.s1,
    overflowX: "auto",
    minWidth: 0,
    scrollbarWidth: "none"
  },
  tab: {
    display: "inline-flex",
    alignItems: "center",
    gap: space.s2,
    fontFamily: font.sans,
    fontSize: type.labelSize,
    letterSpacing: type.labelTracking,
    paddingBlock: space.s2,
    paddingInline: space.s3,
    borderRadius: shape.radiusPill,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: "transparent",
    cursor: "pointer",
    whiteSpace: "nowrap",
    color: { default: color.fgMuted, ":hover": color.fg },
    backgroundColor: { default: "transparent", ":hover": color.surfaceHover },
    transitionProperty: "background-color, color, border-color",
    transitionDuration: motion.hover,
    transitionTimingFunction: motion.ease,
    outline: { default: "none", ":focus-visible": `${shape.focusWidth} solid ${color.lineFocus}` },
    outlineOffset: shape.focusOffset
  },
  active: {
    color: color.fgOnAction,
    backgroundColor: { default: color.action, ":hover": color.action },
    borderColor: color.action
  },
  tally: { fontFamily: font.mono, fontSize: type.microSize, fontVariantNumeric: "tabular-nums" }
});

export function FilterTabs({
  tabs,
  active,
  onSelect,
  label
}: {
  tabs: readonly FilterTab[];
  active: string;
  onSelect: (id: string) => void;
  label: string;
}) {
  const t = useTranslation();

  return (
    <div role="tablist" aria-label={label} {...stylex.props(styles.root)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={tab.id === active}
          onClick={() => {
            onSelect(tab.id);
          }}
          {...stylex.props(styles.tab, tab.id === active && styles.active)}
        >
          {tab.label}
          {tab.count === undefined ? null : (
            <span {...stylex.props(styles.tally)}>{t.count(tab.count)}</span>
          )}
        </button>
      ))}
    </div>
  );
}
