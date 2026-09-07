"use client";

import { useTranslation } from "@/lib/i18n/provider";

import * as stylex from "@stylexjs/stylex";
import { Button, Heading, Stack, Text } from "@/components/ui";
import { color, font, shape, space, type } from "@/styles/tokens.stylex";

const STACK_LINES = 6;

const styles = stylex.create({
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: space.s6,
    backgroundColor: color.ground
  },
  panel: {
    width: "100%",
    maxWidth: shape.readingMax,
    padding: space.s6,
    borderRadius: shape.radiusL,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.line,
    borderInlineStartWidth: shape.stripe,
    borderInlineStartColor: color.signal,
    backgroundColor: color.surfaceRaised
  },
  trace: {
    display: "block",
    fontFamily: font.mono,
    fontSize: type.figureSSize,
    lineHeight: 1.6,
    color: color.fg,
    backgroundColor: color.surfaceSunken,
    borderRadius: shape.radiusM,
    padding: space.s4,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word"
  }
});

export default function RouteError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslation();

  const trace = error.stack?.split("\n").slice(0, STACK_LINES).join("\n") ?? "";

  return (
    <main {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.panel)}>
        <Stack gap={4}>
          <Heading level="title2">{t("Lens hit an error")}</Heading>
          <Text measure>
            {t(
              "Your data never left this browser. Copy the message below and send it with the browser name and version."
            )}
          </Text>
          <code {...stylex.props(styles.trace)}>
            {error.name}: {error.message}
            {error.digest === undefined ? "" : t("\ndigest {0}", [error.digest])}
            {trace.length === 0 ? "" : `\n\n${trace}`}
          </code>
          <Button label={t("Try again")} onClick={reset} />
        </Stack>
      </div>
    </main>
  );
}
