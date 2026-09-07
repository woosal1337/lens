"use client";

import * as stylex from "@stylexjs/stylex";
import { color, font, motion, shape, space, type } from "@/styles/tokens.stylex";

type Variant = "primary" | "secondary" | "quiet";
type Size = "regular" | "small";

const styles = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: space.s2,
    fontFamily: font.sans,
    fontWeight: 500,
    letterSpacing: type.bodyTracking,
    textDecoration: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
    borderWidth: shape.hairline,
    borderStyle: "solid",
    transitionProperty: "background-color, border-color, color",
    transitionDuration: motion.hover,
    transitionTimingFunction: motion.ease,
    outline: { default: "none", ":focus-visible": `${shape.focusWidth} solid ${color.lineFocus}` },
    outlineOffset: shape.focusOffset
  },
  regular: {
    fontSize: type.bodySize,
    paddingBlock: space.s3,
    paddingInline: space.s5,
    borderRadius: shape.radiusPill
  },
  small: {
    fontSize: type.labelSize,
    paddingBlock: space.s2,
    paddingInline: space.s4,
    borderRadius: shape.radiusPill
  },
  primary: {
    color: color.fgOnAction,
    borderColor: { default: color.action, ":hover": color.actionHover },
    backgroundColor: { default: color.action, ":hover": color.actionHover }
  },
  secondary: {
    color: color.fg,
    borderColor: { default: color.lineStrong, ":hover": color.fgSubtle },
    backgroundColor: { default: "transparent", ":hover": color.surfaceHover }
  },
  quiet: {
    color: { default: color.fgMuted, ":hover": color.fg },
    borderColor: "transparent",
    backgroundColor: { default: "transparent", ":hover": color.surfaceHover }
  }
});

export function Button({
  label,
  onClick,
  href,
  variant = "primary",
  size = "regular",
  disabled = false,
  endContent
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  endContent?: React.ReactNode;
}) {
  const props = stylex.props(styles.base, styles[size], styles[variant]);

  if (href !== undefined) {
    return (
      <a href={href} {...props}>
        {label}
        {endContent}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {label}
      {endContent}
    </button>
  );
}
