"use client";

import { useTranslation } from "@/lib/i18n/provider";
import * as stylex from "@stylexjs/stylex";
import { Text } from "@/components/ui/text";

import { space } from "@/styles/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "flex",
    flexWrap: "nowrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s3,
    width: "100%",
    minWidth: 0
  },
  lead: { display: "flex", flexWrap: "nowrap", alignItems: "center", gap: space.s3, minWidth: 0 },
  tail: { display: "flex", flexWrap: "nowrap", alignItems: "center", gap: space.s3, flexShrink: 0 }
});

export function Toolbar({
  children,
  rows,
  unit,
  action
}: {
  children: React.ReactNode;
  rows: number;
  unit: string;
  action?: React.ReactNode;
}) {
  const t = useTranslation();

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.lead)}>{children}</div>
      <div {...stylex.props(styles.tail)}>
        <Text size="label" tone="subtle" as="span">
          {t.count(rows)} {t.known(unit)}
        </Text>
        {action}
      </div>
    </div>
  );
}
