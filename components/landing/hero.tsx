"use client";

import { useTranslation } from "@/lib/i18n/provider";

import * as stylex from "@stylexjs/stylex";
import { Button, Heading, Row, Stack, Text } from "@/components/ui";
import { color, shape, space } from "@/styles/tokens.stylex";

const COLUMNS = 6;

const styles = stylex.create({
  drop: { maxWidth: shape.splashMax, marginInline: "auto", width: "100%" },
  root: {
    position: "relative",
    paddingBlockStart: space.s16,
    paddingBlockEnd: space.s12,
    display: "grid",
    placeItems: "center",
    textAlign: "center"
  },
  rules: {
    position: "absolute",
    inset: 0,
    display: "grid",
    gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
    pointerEvents: "none",
    zIndex: 0
  },
  rule: {
    borderInlineStartWidth: shape.hairline,
    borderInlineStartStyle: "solid",
    borderInlineStartColor: color.line
  },
  content: {
    position: "relative",
    zIndex: 1,
    maxWidth: shape.readingMax,
    width: "100%",
    minWidth: 0
  },
  headline: { maxWidth: shape.displayMax, marginInline: "auto", overflowWrap: "anywhere" },
  lede: { maxWidth: "52ch", marginInline: "auto" }
});

export function Hero({
  onChoose,
  browserNote,
  drop
}: {
  onChoose: () => void;
  browserNote: string;
  drop?: React.ReactNode;
}) {
  const t = useTranslation();

  return (
    <section {...stylex.props(styles.root)}>
      <div aria-hidden {...stylex.props(styles.rules)}>
        {Array.from({ length: COLUMNS }, (_, index) => (
          <div key={index} {...stylex.props(styles.rule)} />
        ))}
      </div>
      <div {...stylex.props(styles.content)}>
        <Stack gap={6}>
          <Stack gap={4}>
            <div {...stylex.props(styles.headline)}>
              <Heading level="display">
                {t("Read your Instagram export on your own machine.")}
              </Heading>
            </div>
            <div {...stylex.props(styles.lede)}>
              <Text>
                {t(
                  "Instagram shows you who you follow. It hides who does not follow back, which request has waited five years, and which friends never once got a like from you."
                )}
              </Text>
            </div>
          </Stack>
          <Row gap={3} center>
            <Button label={t("Choose export folder")} onClick={onChoose} />
            <Button label={t("See a demo")} variant="secondary" href="/preview/" />
          </Row>
          <Text size="label" tone="subtle">
            {browserNote}
          </Text>
          {drop === undefined ? null : <div {...stylex.props(styles.drop)}>{drop}</div>}
        </Stack>
      </div>
    </section>
  );
}
