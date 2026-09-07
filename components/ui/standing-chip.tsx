"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { Chip } from "@/components/ui/chip";

export function StandingChip({ follower, following }: { follower: boolean; following: boolean }) {
  const t = useTranslation();

  if (follower && following) return <Chip tone="positive">{t("Mutual")}</Chip>;
  if (following) return <Chip tone="signal">{t("No follow back")}</Chip>;
  if (follower) return <Chip>{t("Fan")}</Chip>;
  return <Chip>{t("No follow")}</Chip>;
}
