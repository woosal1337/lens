import { Heading, Text } from "@/components/ui/text";
import { Stack } from "@/components/ui/stack";

export function PageHead({ title, lede }: { title: string; lede?: string }) {
  return (
    <Stack gap={2}>
      <Heading level="title1">{title}</Heading>
      {lede === undefined ? null : <Text measure>{lede}</Text>}
    </Stack>
  );
}
