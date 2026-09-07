"use client";

import { useTranslation } from "@/lib/i18n/provider";

import { useEffect, useMemo, useState } from "react";
import { SectionTransition, Stack } from "@/components/ui";
import { ConnectionsTab } from "@/components/dashboard/connections-tab";
import { ContentTab } from "@/components/dashboard/content-tab";
import { CoverageTab } from "@/components/dashboard/coverage-tab";
import { DiffTab } from "@/components/dashboard/diff-tab";
import { GrowthTab } from "@/components/dashboard/growth-tab";
import { IdentityTab } from "@/components/dashboard/identity-tab";
import { LikesTab } from "@/components/dashboard/likes-tab";
import { MessagesTab } from "@/components/dashboard/messages-tab";
import { OverviewTab } from "@/components/dashboard/overview-tab";
import { PeopleTab } from "@/components/dashboard/people-tab";
import { PersonTab } from "@/components/dashboard/person-tab";
import { StoriesTab } from "@/components/dashboard/stories-tab";
import { TimelineTab } from "@/components/dashboard/timeline-tab";
import { RequestsTab } from "@/components/dashboard/requests-tab";
import { SecurityTab } from "@/components/dashboard/security-tab";
import { ShareTab } from "@/components/dashboard/share-tab";
import { TrackingTab } from "@/components/dashboard/tracking-tab";
import { AppFrame, type FrameItem } from "@/components/layout/app-frame";
import { MediaProvider } from "@/components/media/media-provider";
import { buildGraph, type Graph } from "@/lib/analysis/graph";
import type { ExportModel } from "@/lib/parser/model";
import type { PickedFile } from "@/lib/parser/source";

const SECTIONS: Record<string, (props: SectionProps) => React.ReactNode> = {
  overview: ({ model, graph, onOpen }) => (
    <OverviewTab model={model} graph={graph} onOpen={onOpen} />
  ),
  connections: ({ model, graph }) => <ConnectionsTab model={model} graph={graph} />,
  requests: ({ model }) => <RequestsTab model={model} />,
  likes: ({ model, graph }) => <LikesTab model={model} graph={graph} />,
  stories: ({ model, graph }) => <StoriesTab model={model} graph={graph} />,
  messages: () => <MessagesTab />,
  content: ({ model }) => <ContentTab model={model} />,
  person: ({ model, graph }) => <PersonTab model={model} graph={graph} />,
  people: () => <PeopleTab />,
  growth: ({ model }) => <GrowthTab model={model} />,
  security: ({ model }) => <SecurityTab model={model} />,
  tracking: ({ model }) => <TrackingTab model={model} />,
  identity: ({ model }) => <IdentityTab model={model} />,
  timeline: ({ model }) => <TimelineTab model={model} />,
  diff: ({ model }) => <DiffTab model={model} />,
  share: ({ model, graph }) => <ShareTab model={model} graph={graph} />,
  coverage: ({ model }) => <CoverageTab model={model} />
};

type SectionProps = {
  model: ExportModel;
  graph: Graph;
  onOpen: (tab: string) => void;
};

function Section({ tab, ...props }: SectionProps & { tab: string }) {
  const render = SECTIONS[tab] ?? SECTIONS.overview;
  return render === undefined ? null : render(props);
}

export function Dashboard({
  model,
  media = [],
  isDemo = false,
  onClose
}: {
  model: ExportModel;
  media?: readonly PickedFile[];
  isDemo?: boolean;
  onClose?: () => void;
}) {
  const t = useTranslation();

  const [tab, setTab] = useState("overview");
  const graph = useMemo(() => buildGraph(model), [model]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  const items: FrameItem[] = [
    { id: "overview", label: t("Overview"), icon: "overview" },
    { id: "timeline", label: t("Timeline"), icon: "waiting" },
    {
      id: "people",
      label: t("People"),
      icon: "connections",
      items: [
        {
          id: "connections",
          label: t("Connections"),
          icon: "connections",
          detail: t("Who follows back, and who does not")
        },
        {
          id: "requests",
          label: t("Requests"),
          icon: "requests",
          detail: t("The follow requests nobody answered")
        },
        {
          id: "messages",
          label: t("Messages"),
          icon: "messages",
          detail: t("Every conversation, with a real search")
        },
        {
          id: "people",
          label: t("People"),
          icon: "connections",
          detail: t("One score for everybody you message")
        },
        {
          id: "person",
          label: t("Person"),
          icon: "person",
          detail: t("One account, every record about them")
        },
        {
          id: "growth",
          label: t("Growth"),
          icon: "followBack",
          detail: t("The follow-back rate by year")
        }
      ]
    },
    {
      id: "activity",
      label: t("Activity"),
      icon: "likes",
      items: [
        {
          id: "likes",
          label: t("Likes"),
          icon: "likes",
          detail: t("Whom you like, and whom you never like")
        },
        {
          id: "stories",
          label: t("Stories"),
          icon: "stories",
          detail: t("Whose stories you watch and like")
        },
        {
          id: "content",
          label: t("Your content"),
          icon: "content",
          detail: t("Your posts, stories and saved list")
        }
      ]
    },
    {
      id: "meta",
      label: t("What Meta keeps"),
      icon: "security",
      items: [
        {
          id: "security",
          label: t("Security"),
          icon: "security",
          detail: t("Every login, address and client")
        },
        {
          id: "tracking",
          label: t("Tracking"),
          icon: "tracking",
          detail: t("Advertisers, contacts and browsing")
        },
        {
          id: "identity",
          label: t("Identity"),
          icon: "handle",
          detail: t("Profile changes in your export")
        },
        {
          id: "diff",
          label: t("Compare exports"),
          icon: "open",
          detail: t("Two folders name everybody who left")
        },
        {
          id: "share",
          label: t("Share a card"),
          icon: "content",
          detail: t("One image, with no name on it")
        },
        {
          id: "coverage",
          label: t("What Lens read"),
          icon: "search",
          detail: t("Every file, and what each one gave")
        }
      ]
    }
  ];

  const lastLogin = model.logins.reduce((latest, row) => Math.max(latest, row.at), 0);

  return (
    <MediaProvider files={media}>
      <AppFrame
        items={items}
        active={tab}
        onSelect={setTab}
        handle={
          model.profile.username.length > 0 ? `@${model.profile.username}` : t("your account")
        }
        detail={isDemo ? t("sample data, not yours") : t("last login {0}", [t.isoDate(lastLogin)])}
        {...(onClose === undefined ? {} : { onClose })}
      >
        <SectionTransition id={tab}>
          <Stack gap={6}>
            <Section tab={tab} model={model} graph={graph} onOpen={setTab} />
          </Stack>
        </SectionTransition>
      </AppFrame>
    </MediaProvider>
  );
}
