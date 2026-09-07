"use client";

import * as stylex from "@stylexjs/stylex";
import { DropdownMenu, DropdownMenuItem } from "@astryxdesign/core";
import { Icon } from "@/components/ui/icon";
import { useLanguage } from "@/lib/i18n/provider";
import { color, font, shape, space, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "inline-flex",
    flexShrink: 0,
    maxWidth: "100%"
  },
  trigger: {
    height: space.s10,
    minHeight: space.s10,
    maxWidth: "100%",
    margin: 0,
    paddingInline: space.s4,
    paddingBlock: 0,
    fontFamily: font.sans,
    fontSize: type.labelSize,
    fontWeight: 500,
    lineHeight: type.bodyLine,
    color: color.fg,
    backgroundColor: color.surfaceRaised,
    borderColor: color.line,
    borderStyle: "solid",
    borderWidth: shape.hairline,
    borderRadius: shape.radiusPill,
    cursor: "pointer",
    outline: { default: "none", ":focus-visible": `${shape.focusWidth} solid ${color.lineFocus}` },
    outlineOffset: shape.focusOffset
  },
  menu: {
    padding: space.s1,
    borderRadius: shape.radiusL,
    backgroundColor: color.surfaceRaised
  },
  option: {
    minHeight: space.s10,
    paddingInline: space.s3,
    borderRadius: shape.radiusM,
    fontFamily: font.sans,
    fontSize: type.labelSize,
    color: color.fg,
    outline: { default: "none", ":focus-visible": `${shape.focusWidth} solid ${color.lineFocus}` },
    outlineOffset: `-${shape.focusWidth}`
  }
});

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return (
    <span {...stylex.props(styles.root)}>
      <DropdownMenu
        button={{
          label: language === "tr" ? "Türkçe" : "English",
          "aria-label": `Language / Dil: ${language === "tr" ? "Türkçe" : "English"}`,
          variant: "secondary",
          size: "sm",
          endContent: <Icon name="expand" size="small" tone="muted" />,
          xstyle: styles.trigger
        }}
        alignment="end"
        menuWidth={shape.languageMenuWidth}
        xstyle={styles.menu}
      >
        <DropdownMenuItem
          label={<span lang="en">English</span>}
          onClick={() => {
            setLanguage("en");
          }}
          xstyle={styles.option}
        />
        <DropdownMenuItem
          label={<span lang="tr">Türkçe</span>}
          onClick={() => {
            setLanguage("tr");
          }}
          xstyle={styles.option}
        />
      </DropdownMenu>
    </span>
  );
}
