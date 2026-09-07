"use client";

import * as stylex from "@stylexjs/stylex";
import { Heading, Stack, Surface, Text } from "@/components/ui";
import { shape } from "@/styles/tokens.stylex";

const styles = stylex.create({
  plot: { width: "100%" },
  caption: { minHeight: shape.captionMin },
  title: { minHeight: shape.chartTitleMin }
});

export function ChartFrame({
  title,
  caption,
  height = 180,
  children
}: {
  title: string;
  caption: string;
  height?: number;
  children: React.ReactNode;
}) {
  return (
    <Surface pad="loose">
      <Stack gap={4}>
        <Stack gap={1}>
          <span {...stylex.props(styles.title)}>
            <Heading level="title3">{title}</Heading>
          </span>
          <span {...stylex.props(styles.caption)}>
            <Text size="label" tone="subtle" as="span">
              {caption}
            </Text>
          </span>
        </Stack>
        <div style={{ height }} {...stylex.props(styles.plot)}>
          {children}
        </div>
      </Stack>
    </Surface>
  );
}
