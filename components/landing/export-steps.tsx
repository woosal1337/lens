"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import * as stylex from "@stylexjs/stylex";
import { Button, Heading, Row, Stack, Surface, Text } from "@/components/ui";
import { color, font, shape, space, type } from "@/styles/tokens.stylex";

function createSteps(t: Translator) {
  const STEPS = [
    {
      title: t("Open Accounts Center"),
      body: t(
        "In Instagram settings, open Accounts Center, then Your information and permissions. Find the export or download option."
      )
    },
    {
      title: t("Choose all information in JSON"),
      body: t(
        "Select your Instagram account, all available information, and the All time date range. Choose JSON and export to your device."
      )
    },
    {
      title: t("Wait for the download"),
      body: t("Meta prepares the files and sends a download notice. The wait varies by account.")
    },
    {
      title: t("Unzip every part into one folder"),
      body: t(
        "Download every archive part. Extract all parts into the same folder and preserve their subfolders."
      )
    },
    {
      title: t("Choose that folder here"),
      body: t("Nothing uploads. The page reads it and stops.")
    }
  ] as const;
  return STEPS;
}

const styles = stylex.create({
  root: { scrollMarginBlockStart: shape.navHeight },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" },
  step: {
    display: "grid",
    gridTemplateColumns: `${space.s8} 1fr`,
    gap: space.s4,
    alignItems: "start",
    paddingBlock: space.s4,
    borderBlockEndWidth: shape.hairline,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.line
  },
  lastStep: { borderBlockEndWidth: 0 },
  index: {
    fontFamily: font.mono,
    fontSize: type.figureSSize,
    color: color.fgSubtle,
    paddingBlockStart: space.s1
  }
});

export function ExportSteps({
  onChoose,
  onChooseZips
}: {
  onChoose: () => void;
  onChooseZips: () => void;
}) {
  const t = useTranslation();

  return (
    <section id="export" {...stylex.props(styles.root)}>
      <Stack gap={6}>
        <Stack gap={2}>
          <Heading level="title1" as="h2">
            {t("Get your export first")}
          </Heading>
          <Text measure>
            {t(
              "Request the available account data from Meta. Choose all information so Lens can compare the records across files. Some data may still be absent."
            )}
          </Text>
        </Stack>
        <Surface pad="loose">
          <Stack gap={5}>
            <ol {...stylex.props(styles.list)}>
              {createSteps(t).map((step, index) => (
                <li
                  key={step.title}
                  {...stylex.props(
                    styles.step,
                    index === createSteps(t).length - 1 && styles.lastStep
                  )}
                >
                  <span {...stylex.props(styles.index)}>{index + 1}</span>
                  <Stack gap={1}>
                    <Text tone="primary">{step.title}</Text>
                    <Text size="label" tone="subtle">
                      {step.body}
                    </Text>
                  </Stack>
                </li>
              ))}
            </ol>
            <Row gap={3}>
              <Button label={t("Choose export folder")} onClick={onChoose} />
              <Button
                label={t("Or open the zip files")}
                variant="secondary"
                onClick={onChooseZips}
              />
            </Row>
          </Stack>
        </Surface>
      </Stack>
    </section>
  );
}
