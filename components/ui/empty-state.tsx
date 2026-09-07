import * as stylex from "@stylexjs/stylex";
import { IconMark, type IconName } from "@/components/ui/icon";
import { Heading, Text } from "@/components/ui/text";
import { Stack } from "@/components/ui/stack";
import { space } from "@/styles/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    paddingBlock: space.s16,
    paddingInline: space.s6
  },
  mark: { display: "grid", placeItems: "center", paddingBlockEnd: space.s2 }
});

export function EmptyState({
  title,
  detail,
  icon = "noResult"
}: {
  title: string;
  detail: string;
  icon?: IconName;
}) {
  return (
    <div {...stylex.props(styles.root)}>
      <Stack gap={2}>
        <span {...stylex.props(styles.mark)}>
          <IconMark name={icon} />
        </span>
        <Heading level="title3">{title}</Heading>
        <Text size="label" tone="subtle">
          {detail}
        </Text>
      </Stack>
    </div>
  );
}
