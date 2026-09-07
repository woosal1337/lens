"use client";

import { useTranslation } from "@/lib/i18n/provider";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@/components/ui/button";
import { shape, space } from "@/styles/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: space.s6,
    alignContent: "start",
    minHeight: shape.sectionMin
  },
  head: {
    minHeight: shape.headMin,
    display: "flex",
    flexDirection: { default: "row", "@media (max-width: 720px)": "column" },
    alignItems: "flex-start",
    gap: space.s4
  },
  headInner: { flexGrow: 1, flexShrink: 1, flexBasis: "0%", minWidth: 0 },
  headAction: { flexShrink: 0, paddingBlockStart: space.s1 },
  stats: {
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(4, minmax(0, 1fr))",
      "@media (max-width: 1080px)": "repeat(2, minmax(0, 1fr))",
      "@media (max-width: 640px)": "minmax(0, 1fr)"
    },
    gap: space.s3
  },
  charts: {
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(3, minmax(0, 1fr))",
      "@media (max-width: 1080px)": "repeat(2, minmax(0, 1fr))",
      "@media (max-width: 720px)": "minmax(0, 1fr)"
    },
    gap: space.s4,
    alignItems: "stretch",
    height: shape.chartSlot
  },
  toolbar: { height: shape.toolbarMin, display: "flex", alignItems: "center", minWidth: 0 },
  panel: { height: shape.panelHeight, display: "grid", alignContent: "stretch", minWidth: 0 },
  notice: { height: shape.noticeSlot, overflow: "hidden" }
});

export function SectionLayout({
  head,
  verdict,
  stats,
  charts,
  toolbar,
  panel,
  notice
}: {
  head: React.ReactNode;
  verdict?: React.ReactNode;
  stats: React.ReactNode;
  charts?: React.ReactNode;
  toolbar?: React.ReactNode;
  panel: React.ReactNode;
  notice?: React.ReactNode;
}) {
  const t = useTranslation();

  const [chartsOnly, setChartsOnly] = useState(false);

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.head)}>
        <div {...stylex.props(styles.headInner)}>{head}</div>
        <div {...stylex.props(styles.headAction)}>
          <Button
            label={chartsOnly ? t("Show every panel") : t("Close every panel")}
            variant="quiet"
            size="small"
            onClick={() => {
              setChartsOnly(!chartsOnly);
            }}
          />
        </div>
      </div>

      {chartsOnly || verdict === undefined ? null : verdict}
      {chartsOnly ? null : <div {...stylex.props(styles.stats)}>{stats}</div>}
      {charts === undefined ? null : <div {...stylex.props(styles.charts)}>{charts}</div>}
      {chartsOnly ? null : (
        <>
          <div {...stylex.props(styles.toolbar)}>{toolbar}</div>
          <div {...stylex.props(styles.panel)}>{panel}</div>
          <div {...stylex.props(styles.notice)}>{notice}</div>
        </>
      )}
    </div>
  );
}
