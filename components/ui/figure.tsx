"use client";

import { useLanguage, useTranslation } from "@/lib/i18n/provider";

import { useEffect, useState } from "react";
import NumberFlow from "@number-flow/react";
import * as stylex from "@stylexjs/stylex";

import { color, font, type } from "@/styles/tokens.stylex";

type Tone = "primary" | "signal" | "positive";
type Size = "large" | "medium" | "small";

const styles = stylex.create({
  base: {
    fontFamily: font.mono,
    fontVariantNumeric: "tabular-nums",
    fontWeight: 500,
    display: "block"
  },
  large: {
    fontSize: type.figureLSize,
    letterSpacing: type.figureLTracking,
    lineHeight: type.figureLLine
  },
  medium: {
    fontSize: type.figureMSize,
    letterSpacing: type.figureMTracking,
    lineHeight: type.figureMLine
  },
  small: { fontSize: type.figureSSize, lineHeight: type.figureSLine, fontWeight: 400 },
  primary: { color: color.fg },
  signal: { color: color.signal },
  positive: { color: color.positive },
  zero: { color: color.fgSubtle }
});

function supportsAnimatedNumber() {
  if (typeof window === "undefined") return false;
  const styleApi = window.CSS as { registerProperty?: unknown } | undefined;
  if (typeof styleApi?.registerProperty !== "function") return false;
  return typeof Element.prototype.animate === "function";
}

export function Figure({
  value,
  tone = "primary",
  size = "large",
  suffix = "",
  animate = true
}: {
  value: number;
  tone?: Tone;
  size?: Size;
  suffix?: string;
  animate?: boolean;
}) {
  const t = useTranslation();
  const { language } = useLanguage();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(supportsAnimatedNumber());
  }, []);

  const props = stylex.props(styles.base, styles[size], styles[tone], value === 0 && styles.zero);

  if (!ready || !animate) {
    return (
      <span {...props}>
        {t.count(value)}
        {suffix}
      </span>
    );
  }
  return (
    <NumberFlow
      value={value}
      locales={language === "tr" ? "tr-TR" : "en-US"}
      suffix={suffix}
      {...props}
    />
  );
}
