"use client";

import { useTranslation } from "@/lib/i18n/provider";

import * as stylex from "@stylexjs/stylex";
import { Icon } from "@/components/ui/icon";

import type { Verdict as VerdictModel } from "@/lib/analysis/verdict";
import { color, font, shape, space, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "flex",
    alignItems: "flex-start",
    gap: space.s4,
    padding: space.s5,
    borderRadius: shape.radiusL,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.line,
    backgroundColor: color.surfaceSunken
  },
  mark: { paddingBlockStart: space.s1, flexShrink: 0 },
  sentence: {
    fontFamily: font.sans,
    fontSize: type.title2Size,
    lineHeight: type.title2Line,
    letterSpacing: type.title2Tracking,
    color: color.fgMuted,
    margin: 0
  },
  figure: {
    fontFamily: font.mono,
    fontVariantNumeric: "tabular-nums",
    fontWeight: 500,
    color: color.fg
  },
  signal: { color: color.signal }
});

export function Verdict({ model }: { model: VerdictModel }) {
  const t = useTranslation();

  return (
    <div {...stylex.props(styles.root)}>
      <span {...stylex.props(styles.mark)}>
        <Icon name={model.hasFindings ? "noFollowBack" : "followBack"} tone="subtle" />
      </span>
      <p {...stylex.props(styles.sentence)}>
        {t.rich("You follow {0} accounts.", [
          <span key="following" {...stylex.props(styles.figure)}>
            {t.count(model.following)}
          </span>
        ])}{" "}
        {model.findings.map((finding) => (
          <span key={finding.kind}>
            {t.rich(
              finding.kind === "noFollowBack"
                ? "{0} do not follow you back."
                : finding.kind === "pending"
                  ? "{0} of your requests still wait."
                  : "{0} mutuals have no recorded likes from you.",
              [
                <span key="count" {...stylex.props(styles.figure, styles.signal)}>
                  {t.count(finding.value)}
                </span>
              ]
            )}{" "}
          </span>
        ))}
        {model.hasFindings ? null : t("Every one of them follows you back.")}
      </p>
    </div>
  );
}
