"use client";

import * as stylex from "@stylexjs/stylex";
import { Figure } from "@/components/ui/figure";
import { Icon, IconMark, type IconName } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { color, motion, shape, space } from "@/styles/tokens.stylex";

type Tone = "primary" | "signal" | "positive";

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space.s2,
    alignItems: "stretch",
    textAlign: "start",
    width: "100%",
    height: "100%",
    padding: space.s5,
    backgroundColor: color.surfaceRaised,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: { default: color.line, ":hover": color.lineStrong },
    borderRadius: shape.radiusL,
    transitionProperty: "border-color, background-color",
    transitionDuration: motion.hover,
    transitionTimingFunction: motion.ease
  },
  interactive: {
    cursor: "pointer",
    backgroundColor: { default: color.surfaceRaised, ":hover": color.surfaceHover },
    outline: { default: "none", ":focus-visible": `${shape.focusWidth} solid ${color.lineFocus}` },
    outlineOffset: shape.focusOffset
  },
  head: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.s3,
    minHeight: space.s8
  },
  key: { paddingBlockStart: space.s1 },
  foot: {
    marginBlockStart: "auto",
    paddingBlockStart: space.s2,
    display: "flex",
    alignItems: "center",
    gap: space.s2
  }
});

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  onOpen
}: {
  label: string;
  value: number;
  hint?: string;
  icon?: IconName;
  tone?: Tone;
  onOpen?: () => void;
}) {
  const markTone = tone === "primary" ? "subtle" : tone;
  const body = (
    <>
      <span {...stylex.props(styles.head)}>
        <span {...stylex.props(styles.key)}>
          <Text size="micro" tone="subtle" as="span">
            {label}
          </Text>
        </span>
        {icon === undefined ? null : <IconMark name={icon} tone={markTone} />}
      </span>
      <Figure value={value} tone={tone} />
      {hint === undefined ? null : (
        <span {...stylex.props(styles.foot)}>
          <Text size="label" tone="subtle" as="span">
            {hint}
          </Text>
          {onOpen === undefined ? null : <Icon name="open" size="small" tone="subtle" />}
        </span>
      )}
    </>
  );

  if (onOpen === undefined) return <div {...stylex.props(styles.root)}>{body}</div>;

  return (
    <button type="button" onClick={onOpen} {...stylex.props(styles.root, styles.interactive)}>
      {body}
    </button>
  );
}
