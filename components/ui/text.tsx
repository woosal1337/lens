import * as stylex from "@stylexjs/stylex";
import { color, font, type } from "@/styles/tokens.stylex";

type Tone = "primary" | "muted" | "subtle" | "signal" | "positive";
type Size = "body" | "label" | "micro";

const styles = stylex.create({
  base: { fontFamily: font.sans, margin: 0, textWrap: "pretty" },
  body: {
    fontSize: type.bodySize,
    fontWeight: type.bodyWeight,
    letterSpacing: type.bodyTracking,
    lineHeight: type.bodyLine
  },
  label: {
    fontSize: type.labelSize,
    letterSpacing: type.labelTracking,
    lineHeight: type.labelLine
  },
  micro: {
    fontFamily: font.mono,
    fontSize: type.microSize,
    fontWeight: type.microWeight,
    letterSpacing: type.microTracking,
    lineHeight: type.microLine
  },
  primary: { color: color.fg },
  muted: { color: color.fgMuted },
  subtle: { color: color.fgSubtle },
  signal: { color: color.signal },
  positive: { color: color.positive },
  measure: { maxWidth: "68ch" }
});

export function Text({
  children,
  size = "body",
  tone = "muted",
  as: Tag = "p",
  measure = false
}: {
  children: React.ReactNode;
  size?: Size;
  tone?: Tone;
  as?: "p" | "span" | "div";
  measure?: boolean;
}) {
  return (
    <Tag {...stylex.props(styles.base, styles[size], styles[tone], measure && styles.measure)}>
      {children}
    </Tag>
  );
}

const headingStyles = stylex.create({
  base: { fontFamily: font.sans, color: color.fg, margin: 0, textWrap: "balance" },
  display: {
    fontSize: type.displaySize,
    fontWeight: type.displayWeight,
    letterSpacing: type.displayTracking,
    lineHeight: type.displayLine
  },
  title1: {
    fontSize: type.title1Size,
    fontWeight: type.title1Weight,
    letterSpacing: type.title1Tracking,
    lineHeight: type.title1Line
  },
  title2: {
    fontSize: type.title2Size,
    fontWeight: type.title2Weight,
    letterSpacing: type.title2Tracking,
    lineHeight: type.title2Line
  },
  title3: {
    fontSize: type.title3Size,
    fontWeight: type.title3Weight,
    letterSpacing: type.title3Tracking,
    lineHeight: type.title3Line
  }
});

export function Heading({
  children,
  level = "title2",
  as
}: {
  children: React.ReactNode;
  level?: "display" | "title1" | "title2" | "title3";
  as?: "h1" | "h2" | "h3" | "h4";
}) {
  const Tag = as ?? (level === "display" || level === "title1" ? "h1" : "h2");
  return <Tag {...stylex.props(headingStyles.base, headingStyles[level])}>{children}</Tag>;
}
