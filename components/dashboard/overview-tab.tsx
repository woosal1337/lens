"use client";

import { useTranslation } from "@/lib/i18n/provider";

import * as stylex from "@stylexjs/stylex";
import { ChartFrame } from "@/components/chart/chart-frame";
import { CumulativeLines, toCumulative } from "@/components/chart/cumulative-lines";
import { MonthlyBars, toMonthly } from "@/components/chart/monthly-bars";
import {
  AbsentNotice,
  Breakdown,
  PageHead,
  SectionLayout,
  Stat,
  Text,
  Verdict
} from "@/components/ui";
import type { Graph } from "@/lib/analysis/graph";
import { verdict } from "@/lib/analysis/verdict";
import type { ExportModel } from "@/lib/parser/model";

import { series, space } from "@/styles/tokens.stylex";

const panelStyles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(3, minmax(0, 1fr))",
      "@media (max-width: 1080px)": "repeat(2, minmax(0, 1fr))",
      "@media (max-width: 720px)": "minmax(0, 1fr)"
    },
    gap: space.s4,
    alignItems: "stretch",
    height: "100%"
  }
});

export function OverviewTab({
  model,
  graph,
  onOpen
}: {
  model: ExportModel;
  graph: Graph;
  onOpen: (tab: string) => void;
}) {
  const t = useTranslation();

  const summary = verdict(model, graph);
  const likeOwners = new Set(model.likedPosts.map((row) => row.owner)).size;
  const likesByMonth = toMonthly(model.likedPosts.map((row) => row.at));
  const ownStories = model.ownMedia.filter((row) => row.kind === "story");
  const storiesByMonth = toMonthly(ownStories.map((row) => row.at));

  const growth = [
    {
      id: "followers",
      label: t("Followers"),
      color: series.first,
      points: toCumulative(model.followers.map((row) => row.followedAt))
    },
    {
      id: "following",
      label: t("Following"),
      color: series.second,
      points: toCumulative(model.following.map((row) => row.followedAt))
    }
  ];

  return (
    <SectionLayout
      head={
        <PageHead
          title={t("Overview")}
          lede={t(
            "Every number below came from your folder, in this browser. Open one to see the rows behind it."
          )}
        />
      }
      verdict={<Verdict model={summary} />}
      stats={
        <>
          <Stat
            label={t("You follow, no follow back")}
            icon="noFollowBack"
            value={graph.noFollowBack.length}
            hint={t("they do not follow you back")}
            tone="signal"
            onOpen={() => {
              onOpen("connections");
            }}
          />
          <Stat
            label={t("Requests still pending")}
            icon="waiting"
            value={model.pendingOut.length}
            hint={t("you sent them")}
            tone="signal"
            onOpen={() => {
              onOpen("requests");
            }}
          />
          <Stat
            label={t("Mutuals you never liked")}
            icon="neverLiked"
            value={graph.coldMutuals.length}
            hint={t("of {0} mutual follows", [t.count(graph.mutual.length)])}
            tone="signal"
          />
          <Stat
            label={t("Likes you gave")}
            icon="likes"
            value={model.likedPosts.length}
            hint={t("across {0} accounts", [t.count(likeOwners)])}
          />
        </>
      }
      charts={
        <>
          <ChartFrame
            title={t("Likes you gave, per month")}
            caption={t("{0} likes across {1} months", [
              t.count(model.likedPosts.length),
              t.count(likesByMonth.length)
            ])}
          >
            <MonthlyBars unit={t("Likes")} data={likesByMonth} />
          </ChartFrame>
          <ChartFrame
            title={t("Followers against following")}
            caption={t("Current accounts, by the date each connection started.")}
          >
            <CumulativeLines series={growth} />
          </ChartFrame>
          <ChartFrame
            title={t("Stories you posted, per month")}
            caption={t("{0} stories in your archive", [t.count(ownStories.length)])}
          >
            <MonthlyBars unit={t("Followers")} data={storiesByMonth} tone="brand" />
          </ChartFrame>
        </>
      }
      toolbar={
        <Text size="label" tone="subtle">
          {t.rich("Read {0} data categories from your export.", [
            t.count(model.coverage.filter((row) => row.found).length)
          ])}
        </Text>
      }
      panel={
        <div {...stylex.props(panelStyles.grid)}>
          <Breakdown
            title={t("Your graph")}
            icon="connections"
            note={t("Mutual counts an account twice, once on each side.")}
            rows={[
              {
                id: "followers",
                label: t("Followers"),
                hint: t("they follow you"),
                value: model.followers.length,
                onOpen: () => {
                  onOpen("connections");
                }
              },
              {
                id: "following",
                label: t("Following"),
                hint: t("you follow them"),
                value: model.following.length,
                onOpen: () => {
                  onOpen("connections");
                }
              },
              {
                id: "mutual",
                label: t("Mutual"),
                hint: t("you follow each other"),
                value: graph.mutual.length,
                tone: "positive"
              },
              {
                id: "fans",
                label: t("Fans"),
                hint: t("they follow, you do not"),
                value: graph.fans.length
              }
            ]}
          />
          <Breakdown
            title={t("Your activity")}
            icon="likes"
            note={t(
              "Story views cover a short window. Other files have different retention periods."
            )}
            rows={[
              {
                id: "storyViews",
                label: t("Stories watched"),
                hint: t("the last 30 days only"),
                value: model.storyViews.length,
                tone: "signal",
                onOpen: () => {
                  onOpen("stories");
                }
              },
              {
                id: "storyLikes",
                label: t("Stories liked"),
                hint: t("you tapped the heart"),
                value: model.storyLikes.length,
                onOpen: () => {
                  onOpen("stories");
                }
              },
              {
                id: "comments",
                label: t("Comments written"),
                hint: t("under someone else's post"),
                value: model.comments.length
              },
              {
                id: "saved",
                label: t("Posts saved"),
                hint: t("kept for later"),
                value: model.saved.length,
                onOpen: () => {
                  onOpen("content");
                }
              }
            ]}
          />
          <Breakdown
            title={t("What Meta keeps")}
            icon="tracking"
            note={t("These records come from the files included in your export.")}
            rows={[
              {
                id: "advertisers",
                label: t("Advertisers"),
                hint: t("they hold a record of you"),
                value: model.advertisers.length,
                tone: "signal",
                onOpen: () => {
                  onOpen("tracking");
                }
              },
              {
                id: "contacts",
                label: t("Contacts from your phone"),
                hint: t("names and numbers of others"),
                value: model.contacts.length,
                tone: "signal",
                onOpen: () => {
                  onOpen("tracking");
                }
              },
              {
                id: "logins",
                label: t("Logins with your address"),
                hint: t("every session Meta kept"),
                value: model.logins.length,
                onOpen: () => {
                  onOpen("security");
                }
              },
              {
                id: "categories",
                label: t("Categories guessed about you"),
                hint: t("advertising interests in your export"),
                value: model.adCategories.length
              }
            ]}
          />
        </div>
      }
      notice={
        <AbsentNotice title={t("What the export cannot tell you")}>
          {t(
            "The export holds no record of who liked your posts, who viewed your story, or who visited your profile. Lens answers the reverse, which the data does support."
          )}
        </AbsentNotice>
      }
    />
  );
}
