"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";
import * as stylex from "@stylexjs/stylex";
import { Figure, Heading, Stack, Surface, Text } from "@/components/ui";
import { shape, space } from "@/styles/tokens.stylex";

function createCards(t: Translator) {
  const CARDS = [
    {
      label: t("Who does not follow back"),
      value: 7,
      title: t("The list Instagram hides"),
      body: t(
        "Compare the accounts you follow with the accounts that follow you. Lens lists those that do not follow you back."
      )
    },
    {
      label: t("Requests nobody answered"),
      value: 9,
      title: t("Requests still pending"),
      body: t(
        "Every follow request you sent that nobody accepted, oldest first. The list shows how long each request has waited."
      )
    },
    {
      label: t("Mutuals you never like"),
      value: 4,
      title: t("Mutuals you never liked"),
      body: t(
        "In this example, four mutuals received no likes from you in the export. Instagram has no screen for that."
      )
    }
  ] as const;
  return CARDS;
}

const styles = stylex.create({
  root: { scrollMarginBlockStart: shape.navHeight },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: space.s4
  }
});

export function Shows() {
  const t = useTranslation();

  return (
    <section id="shows" {...stylex.props(styles.root)}>
      <Stack gap={6}>
        <Stack gap={2}>
          <Heading level="title1" as="h2">
            {t("What Lens shows you")}
          </Heading>
          <Text measure>
            {t(
              "These figures are invented examples. Your own numbers replace them the moment you choose your folder."
            )}
          </Text>
        </Stack>
        <div {...stylex.props(styles.grid)}>
          {createCards(t).map((card) => (
            <Surface key={card.label} pad="loose">
              <Stack gap={4}>
                <Text size="micro" tone="subtle" as="span">
                  {card.label}
                </Text>
                <Figure value={card.value} tone="signal" animate={false} />
                <Stack gap={2}>
                  <Heading level="title3" as="h3">
                    {card.title}
                  </Heading>
                  <Text size="label">{card.body}</Text>
                </Stack>
              </Stack>
            </Surface>
          ))}
        </div>
      </Stack>
    </section>
  );
}
