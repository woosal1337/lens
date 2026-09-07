import * as stylex from "@stylexjs/stylex";
import { color, font, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  base: {
    fontFamily: font.script,
    fontWeight: 400,
    lineHeight: type.markLine,
    color: color.fg,
    whiteSpace: "nowrap",
    userSelect: "none"
  },
  regular: { fontSize: type.markSize },
  large: { fontSize: type.markLargeSize }
});

export function Wordmark({ size = "regular" }: { size?: "regular" | "large" }) {
  return (
    <span {...stylex.props(styles.base, size === "large" ? styles.large : styles.regular)}>
      Lens
    </span>
  );
}
