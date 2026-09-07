"use client";

import { useTranslation } from "@/lib/i18n/provider";
import * as stylex from "@stylexjs/stylex";
import { Button, Heading, Stack, Text, Wordmark } from "@/components/ui";
import { color, shape, space } from "@/styles/tokens.stylex";

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
    maxWidth: shape.displayMax,
    padding: space.s6,
    borderRadius: shape.radiusL,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.line,
    backgroundColor: color.surfaceRaised,
    textAlign: "center"
  },
  mark: { display: "flex", justifyContent: "center" },
  actions: { display: "flex", justifyContent: "center", gap: space.s3 }
});

export function NotFoundScreen() {
  const t = useTranslation();

  return (
    <main {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.panel)}>
        <Stack gap={5}>
          <span {...stylex.props(styles.mark)}>
            <Wordmark size="large" />
          </span>
          <Heading level="title2">{t("This page does not exist")}</Heading>
          <Text measure>
            {t(
              "Lens holds two pages: the landing page, and the demo. Your data never left this browser."
            )}
          </Text>
          <span {...stylex.props(styles.actions)}>
            <Button label={t("Go to the start")} href="/" />
            <Button label={t("See a demo")} variant="quiet" href="/preview/" />
          </span>
        </Stack>
      </div>
    </main>
  );
}
