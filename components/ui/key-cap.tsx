import * as stylex from "@stylexjs/stylex";
import { color, font, shape, space, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: space.s5,
    paddingInline: space.s1,
    paddingBlock: space.s0,
    fontFamily: font.mono,
    fontSize: type.microSize,
    lineHeight: 1.6,
    color: color.fgSubtle,
    backgroundColor: color.surfaceSunken,
    borderRadius: shape.radiusS,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.line
  }
});

export function KeyCap({ children }: { children: string }) {
  return <kbd {...stylex.props(styles.root)}>{children}</kbd>;
}
