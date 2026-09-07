import * as stylex from "@stylexjs/stylex";
import { color, font, motion, shape, space, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  root: { display: "flex", alignItems: "center", gap: space.s3, minWidth: 0 },
  mark: {
    flexShrink: 0,
    width: space.s8,
    height: space.s8,
    borderRadius: shape.radiusPill,
    display: "grid",
    placeItems: "center",
    fontFamily: font.mono,
    fontSize: type.microSize,
    textTransform: "capitalize",
    color: color.fgSubtle,
    backgroundColor: color.surfaceSunken,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.line
  },
  stack: { display: "flex", flexDirection: "column", minWidth: 0 },
  handle: {
    fontFamily: font.mono,
    fontSize: type.figureSSize,
    color: { default: color.fg, ":hover": color.fgMuted },
    textDecoration: "none",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    transitionProperty: "color",
    transitionDuration: motion.hover,
    transitionTimingFunction: motion.ease
  },
  name: {
    fontFamily: font.sans,
    fontSize: type.microSize,
    letterSpacing: "normal",
    color: color.fgSubtle,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  }
});

function monogram(handle: string) {
  const letters = handle.replace(/[^a-z0-9]/gi, "");
  return letters.slice(0, 2) || "??";
}

export function AccountCell({
  handle,
  name,
  href
}: {
  handle: string;
  name?: string;
  href?: string;
}) {
  return (
    <span {...stylex.props(styles.root)}>
      <span aria-hidden {...stylex.props(styles.mark)}>
        {monogram(handle)}
      </span>
      <span {...stylex.props(styles.stack)}>
        {href === undefined ? (
          <span {...stylex.props(styles.handle)}>{handle}</span>
        ) : (
          <a href={href} target="_blank" rel="noopener noreferrer" {...stylex.props(styles.handle)}>
            {handle}
          </a>
        )}
        {name !== undefined && name.length > 0 ? (
          <span {...stylex.props(styles.name)}>{name}</span>
        ) : null}
      </span>
    </span>
  );
}
