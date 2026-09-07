"use client";

import { useTranslation } from "@/lib/i18n/provider";

import * as stylex from "@stylexjs/stylex";
import { Figure } from "@/components/ui/figure";
import { Heading, Text } from "@/components/ui/text";
import { Icon, type IconName } from "@/components/ui/icon";
import { Surface } from "@/components/ui/surface";

import { color, motion, shape, space } from "@/styles/tokens.stylex";

export type BreakdownRow = {
  id: string;
  label: string;
  hint: string;
  value: number;
  tone?: "primary" | "signal" | "positive";
  onOpen?: () => void;
};

const styles = stylex.create({
  panel: { display: "flex", flexDirection: "column", gap: space.s5, height: "100%" },
  head: { display: "flex", alignItems: "center", gap: space.s2 },
  list: { display: "flex", flexDirection: "column", gap: space.s4 },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: space.s2,
    alignItems: "stretch",
    textAlign: "start",
    width: "100%",
    paddingBlock: space.s1,
    paddingInline: 0,
    borderWidth: 0,
    backgroundColor: "transparent"
  },
  open: {
    cursor: "pointer",
    outline: { default: "none", ":focus-visible": `${shape.focusWidth} solid ${color.lineFocus}` },
    outlineOffset: shape.focusOffset
  },
  top: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: space.s3 },
  track: {
    height: shape.barHeight,
    borderRadius: shape.radiusPill,
    backgroundColor: color.surfaceSunken,
    overflow: "hidden"
  },
  fill: {
    display: "block",
    height: "100%",
    borderRadius: shape.radiusPill,
    backgroundColor: color.fg,
    transitionProperty: "width",
    transitionDuration: motion.panel,
    transitionTimingFunction: motion.ease
  },
  fillSignal: { backgroundColor: color.signal },
  fillPositive: { backgroundColor: color.positive },
  foot: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: space.s3 },
  note: {
    marginBlockStart: "auto",
    paddingBlockStart: space.s4,
    borderBlockStartWidth: shape.hairline,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.line
  }
});

export function Breakdown({
  title,
  icon,
  rows,
  note
}: {
  title: string;
  icon: IconName;
  rows: readonly BreakdownRow[];
  note: string;
}) {
  const t = useTranslation();

  const peak = Math.max(1, ...rows.map((row) => row.value));
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <Surface pad="loose">
      <div {...stylex.props(styles.panel)}>
        <div {...stylex.props(styles.head)}>
          <Icon name={icon} tone="subtle" />
          <Heading level="title3">{title}</Heading>
        </div>

        <div {...stylex.props(styles.list)}>
          {rows.map((row) => {
            const share = Math.round((row.value / peak) * 100);
            const tone = row.tone ?? "primary";
            const body = (
              <>
                <span {...stylex.props(styles.top)}>
                  <Text size="label" tone="muted" as="span">
                    {row.label}
                  </Text>
                  <Figure value={row.value} size="medium" tone={tone} />
                </span>
                <span {...stylex.props(styles.track)}>
                  <span
                    style={{ width: `${share}%` }}
                    {...stylex.props(
                      styles.fill,
                      tone === "signal" && styles.fillSignal,
                      tone === "positive" && styles.fillPositive
                    )}
                  />
                </span>
                <span {...stylex.props(styles.foot)}>
                  <Text size="micro" tone="subtle" as="span">
                    {row.hint}
                  </Text>
                  <Text size="micro" tone="subtle" as="span">
                    {t.percent(row.value, total)}
                  </Text>
                </span>
              </>
            );

            if (row.onOpen === undefined) {
              return (
                <div key={row.id} {...stylex.props(styles.row)}>
                  {body}
                </div>
              );
            }
            return (
              <button
                key={row.id}
                type="button"
                onClick={row.onOpen}
                {...stylex.props(styles.row, styles.open)}
              >
                {body}
              </button>
            );
          })}
        </div>

        <div {...stylex.props(styles.note)}>
          <Text size="label" tone="subtle">
            {t.rich("{0} Every bar reads against {1}, the largest number here.", [
              note,
              t.count(peak)
            ])}
          </Text>
        </div>
      </div>
    </Surface>
  );
}
