import * as stylex from "@stylexjs/stylex";
import { color, font, shape, space, type } from "@/styles/tokens.stylex";

type Tone = "neutral" | "signal" | "positive";

const styles = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    fontFamily: font.mono,
    fontSize: type.microSize,
    lineHeight: type.microLine,
    letterSpacing: type.microTracking,
    paddingBlock: space.s1,
    paddingInline: space.s2,
    borderRadius: shape.radiusS,
    whiteSpace: "nowrap",
    borderWidth: shape.hairline,
    borderStyle: "solid"
  },
  neutral: { color: color.fgSubtle, borderColor: color.line, backgroundColor: "transparent" },
  signal: { color: color.signal, borderColor: "transparent", backgroundColor: color.signalWash },
  positive: {
    color: color.positive,
    borderColor: "transparent",
    backgroundColor: color.positiveWash
  }
});

export function Chip({ children, tone = "neutral" }: { children: string; tone?: Tone }) {
  return <span {...stylex.props(styles.base, styles[tone])}>{children}</span>;
}
