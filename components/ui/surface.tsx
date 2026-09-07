import * as stylex from "@stylexjs/stylex";
import { color, shape, space } from "@/styles/tokens.stylex";

type Level = "card" | "raised" | "flat";
type Pad = "none" | "tight" | "regular" | "loose";

const styles = stylex.create({
  base: { borderRadius: shape.radiusL, minWidth: 0 },
  flat: { backgroundColor: "transparent" },
  card: {
    backgroundColor: color.surfaceRaised,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.line
  },
  raised: {
    backgroundColor: color.surfaceRaised,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.lineStrong,
    boxShadow: shape.shadowSoft
  },
  none: { padding: space.s0 },
  tight: { padding: space.s3 },
  regular: { padding: space.s5 },
  loose: { padding: space.s6 }
});

export function Surface({
  children,
  level = "card",
  pad = "regular"
}: {
  children: React.ReactNode;
  level?: Level;
  pad?: Pad;
}) {
  return <div {...stylex.props(styles.base, styles[level], styles[pad])}>{children}</div>;
}
