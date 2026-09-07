"use client";

import * as stylex from "@stylexjs/stylex";
import { Icon } from "@/components/ui/icon";
import { color, font, motion, shape, space, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  frame: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    flexShrink: 0
  },
  mark: {
    position: "absolute",
    insetInlineStart: space.s3,
    display: "flex",
    pointerEvents: "none"
  },
  root: {
    width: shape.fieldWidth,
    fontFamily: font.mono,
    fontSize: type.figureSSize,
    color: color.fg,
    backgroundColor: color.surfaceSunken,
    paddingBlock: space.s2,
    paddingInlineStart: space.s8,
    paddingInlineEnd: space.s3,
    borderRadius: shape.radiusM,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: { default: color.line, ":focus": color.lineStrong },
    outline: "none",
    transitionProperty: "border-color, background-color",
    transitionDuration: motion.hover,
    transitionTimingFunction: motion.ease,
    "::placeholder": { color: color.fgSubtle }
  }
});

export function SearchField({
  value,
  onChange,
  placeholder,
  label
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <span {...stylex.props(styles.frame)}>
      <span {...stylex.props(styles.mark)}>
        <Icon name="search" size="small" />
      </span>
      <input
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        {...stylex.props(styles.root)}
      />
    </span>
  );
}
