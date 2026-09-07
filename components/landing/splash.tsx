"use client";

import { useTranslation } from "@/lib/i18n/provider";

import { useEffect, useRef } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button, Stack, Text, Wordmark } from "@/components/ui";
import type { ParseProgress } from "@/lib/parser/model";
import { color, motion, shape, space } from "@/styles/tokens.stylex";

const styles = stylex.create({
  screen: {
    position: "fixed",
    inset: 0,
    zIndex: 20,
    display: "grid",
    placeItems: "center",
    paddingInline: space.s6,
    backgroundColor: color.ground
  },
  panel: {
    width: "100%",
    maxWidth: shape.splashMax,
    textAlign: "center",
    animationName: stylex.keyframes({
      from: { opacity: 0, transform: "translateY(10px)" },
      to: { opacity: 1, transform: "translateY(0)" }
    }),
    animationDuration: {
      default: motion.panel,
      "@media (prefers-reduced-motion: reduce)": motion.press
    },
    animationTimingFunction: motion.ease,
    animationFillMode: "both"
  },
  rail: {
    position: "relative",
    height: shape.railHeight,
    borderRadius: shape.radiusPill,
    backgroundColor: color.surfaceSunken,
    overflow: "hidden"
  },
  bar: {
    display: "block",
    height: "100%",
    borderRadius: shape.radiusPill,
    backgroundImage: color.brandGradient,
    transitionProperty: "width",
    transitionDuration: motion.panel,
    transitionTimingFunction: motion.ease
  },
  sheen: {
    position: "absolute",
    insetBlock: 0,
    insetInlineStart: 0,
    width: "40%",
    backgroundImage: `linear-gradient(90deg, transparent, ${color.surfaceHover}, transparent)`,
    animationName: stylex.keyframes({
      from: { transform: "translateX(-100%)" },
      to: { transform: "translateX(350%)" }
    }),
    animationDuration: motion.splash,
    animationIterationCount: {
      default: "infinite",
      "@media (prefers-reduced-motion: reduce)": 0
    },
    animationTimingFunction: "linear",
    opacity: { default: 1, "@media (prefers-reduced-motion: reduce)": 0 }
  },
  action: { display: "flex", justifyContent: "center", paddingBlockStart: space.s2 }
});

export function Splash({
  progress,
  error,
  onRetry
}: {
  progress: ParseProgress | null;
  error: string | null;
  onRetry: () => void;
}) {
  const t = useTranslation();

  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error !== null) alertRef.current?.focus();
  }, [error]);

  if (error !== null) {
    return (
      <div
        ref={alertRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={t("Lens could not read the export")}
        tabIndex={-1}
        {...stylex.props(styles.screen)}
      >
        <div {...stylex.props(styles.panel)}>
          <Stack gap={4}>
            <Wordmark size="large" />
            <Text tone="muted">{t.known(error)}</Text>
            <div {...stylex.props(styles.action)}>
              <Button label={t("Try another folder")} onClick={onRetry} />
            </div>
          </Stack>
        </div>
      </div>
    );
  }

  if (progress === null) return null;

  return (
    <div role="status" aria-live="polite" {...stylex.props(styles.screen)}>
      <div {...stylex.props(styles.panel)}>
        <Stack gap={4}>
          <Wordmark size="large" />
          <Text size="label" tone="subtle">
            {t.percent(progress.percent, 100)} · {t.known(progress.message)}
          </Text>
          <div {...stylex.props(styles.rail)}>
            <span style={{ width: `${progress.percent}%` }} {...stylex.props(styles.bar)} />
            <span aria-hidden {...stylex.props(styles.sheen)} />
          </div>
        </Stack>
      </div>
    </div>
  );
}
