import * as stylex from "@stylexjs/stylex";
import { space } from "@/styles/tokens.stylex";

type Gap = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10;

const gaps = stylex.create({
  1: { gap: space.s1 },
  2: { gap: space.s2 },
  3: { gap: space.s3 },
  4: { gap: space.s4 },
  5: { gap: space.s5 },
  6: { gap: space.s6 },
  8: { gap: space.s8 },
  10: { gap: space.s10 }
});

const styles = stylex.create({
  column: { display: "flex", flexDirection: "column", minWidth: 0 },
  row: { display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  between: { justifyContent: "space-between" },
  center: { justifyContent: "center" },
  grow: { flexGrow: 1 }
});

export function Stack({ children, gap = 4 }: { children: React.ReactNode; gap?: Gap }) {
  return <div {...stylex.props(styles.column, gaps[gap])}>{children}</div>;
}

export function Row({
  children,
  gap = 3,
  between = false,
  center = false,
  grow = false
}: {
  children: React.ReactNode;
  gap?: Gap;
  between?: boolean;
  center?: boolean;
  grow?: boolean;
}) {
  return (
    <div
      {...stylex.props(
        styles.row,
        gaps[gap],
        between && styles.between,
        center && styles.center,
        grow && styles.grow
      )}
    >
      {children}
    </div>
  );
}
