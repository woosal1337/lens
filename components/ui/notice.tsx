import * as stylex from "@stylexjs/stylex";
import { Icon } from "@/components/ui/icon";
import { Heading, Text } from "@/components/ui/text";
import { Stack } from "@/components/ui/stack";
import { color, shape, space } from "@/styles/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "flex",
    alignItems: "flex-start",
    gap: space.s4,
    padding: space.s5,
    borderRadius: shape.radiusL,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.line,
    borderInlineStartWidth: shape.stripe,
    borderInlineStartColor: color.brand,
    backgroundColor: color.brandWash
  },
  quiet: { backgroundColor: "transparent", borderInlineStartColor: color.lineStrong },
  mark: { paddingBlockStart: space.s1 }
});

export function AbsentNotice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section {...stylex.props(styles.root)}>
      <span {...stylex.props(styles.mark)}>
        <Icon name="absent" tone="brand" />
      </span>
      <Stack gap={2}>
        <Heading level="title3">{title}</Heading>
        <Text tone="primary" measure>
          {children}
        </Text>
      </Stack>
    </section>
  );
}

export function WindowNotice({ children }: { children: React.ReactNode }) {
  return (
    <section {...stylex.props(styles.root, styles.quiet)}>
      <span {...stylex.props(styles.mark)}>
        <Icon name="window" tone="subtle" />
      </span>
      <Text size="label" tone="subtle" measure>
        {children}
      </Text>
    </section>
  );
}
