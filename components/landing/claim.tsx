"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";
import * as stylex from "@stylexjs/stylex";
import { Heading, KeyCap, Row, Stack, Surface, Text } from "@/components/ui";
import { color, font, shape, space, type } from "@/styles/tokens.stylex";

function createSteps(t: Translator) {
  const STEPS = [
    t("Open DevTools and watch the Network tab during import. No export data is sent."),
    t("For offline use, install Lens locally and serve the production build."),
    t("Read the Content Security Policy in the page source.")
  ];
  return STEPS;
}

const styles = stylex.create({
  root: { scrollMarginBlockStart: shape.navHeight },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" },
  step: {
    display: "grid",
    gridTemplateColumns: `${space.s6} 1fr`,
    gap: space.s3,
    alignItems: "start",
    paddingBlock: space.s3,
    borderBlockEndWidth: shape.hairline,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.line
  },
  lastStep: { borderBlockEndWidth: 0 },
  index: {
    fontFamily: font.mono,
    fontSize: type.microSize,
    color: color.brand,
    paddingBlockStart: space.s1
  }
});

export function Claim() {
  const t = useTranslation();

  return (
    <section id="claim" {...stylex.props(styles.root)}>
      <Surface pad="loose">
        <Stack gap={5}>
          <Stack gap={2}>
            <Heading level="title2">{t("Your data never leaves this browser.")}</Heading>
            <Text measure>
              {t(
                "There is no account or upload service. The page reads the folder, computes every number locally, and forgets it when you close the tab. You do not have to take that on trust."
              )}
            </Text>
          </Stack>
          <ol {...stylex.props(styles.list)}>
            {createSteps(t).map((step, index) => (
              <li
                key={step}
                {...stylex.props(
                  styles.step,
                  index === createSteps(t).length - 1 && styles.lastStep
                )}
              >
                <span {...stylex.props(styles.index)}>{index + 1}</span>
                <Text size="label">{step}</Text>
              </li>
            ))}
          </ol>
          <Row gap={2}>
            <KeyCap>connect-src</KeyCap>
            <Text size="label" tone="subtle" as="span">
              {t("is set to none in the production build to block connection APIs.")}
            </Text>
          </Row>
        </Stack>
      </Surface>
    </section>
  );
}
