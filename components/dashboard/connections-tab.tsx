"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useMemo, useState } from "react";
import {
  AccountCell,
  csvColumns,
  DataPanel,
  ExportButton,
  FilterTabs,
  PageHead,
  SearchField,
  SectionLayout,
  StandingChip,
  Stat,
  Text,
  Toolbar,
  WindowNotice,
  type Column,
  type FilterTab
} from "@/components/ui";
import { accountsFor, type Account, type Graph } from "@/lib/analysis/graph";
import type { ExportModel } from "@/lib/parser/model";
import { profileUrl } from "@/lib/format";
import { foldForSearch } from "@/lib/parser/text";
import { ChartFrame } from "@/components/chart/chart-frame";
import { CumulativeLines, toCumulative } from "@/components/chart/cumulative-lines";
import { MonthlyBars, toMonthly } from "@/components/chart/monthly-bars";
import { series } from "@/styles/tokens.stylex";

function createViews(t: Translator) {
  const VIEWS = [
    { id: "noFollowBack", label: t("No follow back") },
    { id: "fans", label: t("Fans") },
    { id: "mutual", label: t("Mutuals") },
    { id: "following", label: t("Following") },
    { id: "followers", label: t("Followers") },
    { id: "unfollowed", label: t("You unfollowed") },
    { id: "blocked", label: t("Blocked") },
    { id: "closeFriends", label: t("Close friends") }
  ] as const;
  return VIEWS;
}

type ViewId = ReturnType<typeof createViews>[number]["id"];

function createLede(t: Translator) {
  const LEDE: Record<ViewId, string> = {
    noFollowBack: t(
      "You follow every account here. None of them follow you back. Instagram gives you no screen for this list, and every app that sells it asks for your password."
    ),
    fans: t(
      "These accounts follow you and you do not follow them back. Each row shows the attention you have sent them anyway."
    ),
    mutual: t(
      "You and these accounts follow each other. The like and story columns show whether the attention is mutual too."
    ),
    following: t(
      "Every account you follow, newest first, with the date you started and the attention you have sent since."
    ),
    followers: t("Every account that follows you, newest first, with the date they started."),
    unfollowed: t(
      "Accounts you stopped following. Meta keeps only the last 59 days of this file, so this is not your full history."
    ),
    blocked: t("Accounts you blocked, with the date you blocked them."),
    closeFriends: t(
      "Your close friends list. A close friend who does not follow you back is worth a look."
    )
  };
  return LEDE;
}

function usernamesFor(view: ViewId, model: ExportModel, graph: Graph): string[] {
  switch (view) {
    case "noFollowBack":
      return graph.noFollowBack;
    case "fans":
      return graph.fans;
    case "mutual":
      return graph.mutual;
    case "following":
      return model.following.map((row) => row.username);
    case "followers":
      return model.followers.map((row) => row.username);
    case "unfollowed":
      return model.unfollowed.map((row) => row.username);
    case "blocked":
      return model.blocked.map((row) => row.username);
    case "closeFriends":
      return model.closeFriends.map((row) => row.username);
  }
}

export function ConnectionsTab({ model, graph }: { model: ExportModel; graph: Graph }) {
  const t = useTranslation();

  const [view, setView] = useState<ViewId>("noFollowBack");
  const [query, setQuery] = useState("");

  const tabs: FilterTab[] = useMemo(
    () =>
      createViews(t).map((item) => ({
        id: item.id,
        label: item.label,
        count: new Set(usernamesFor(item.id, model, graph)).size
      })),
    [model, graph, t]
  );

  const rows = useMemo(() => {
    const unique = [...new Set(usernamesFor(view, model, graph))];
    const accounts = accountsFor(graph, unique);
    const needle = foldForSearch(query.trim());
    const filtered =
      needle.length === 0
        ? accounts
        : accounts.filter(
            (account) =>
              foldForSearch(account.username).includes(needle) ||
              foldForSearch(account.name).includes(needle)
          );
    return filtered.sort(
      (left, right) =>
        Math.max(right.followingSince, right.followerSince) -
        Math.max(left.followingSince, left.followerSince)
    );
  }, [view, query, model, graph]);

  const followersByMonth = toMonthly(model.followers.map((row) => row.followedAt));
  const followingByMonth = toMonthly(model.following.map((row) => row.followedAt));
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

  const silent = rows.filter((row) => row.postLikes === 0 && row.storyLikes === 0).length;
  const given = rows.reduce((total, row) => total + row.postLikes, 0);

  const columns: Column<Account>[] = [
    {
      id: "account",
      header: t("Account"),
      hint: t("opens on Instagram"),
      width: "minmax(220px, 1.8fr)",
      sortValue: (row) => row.username,
      render: (row) => (
        <AccountCell handle={row.username} name={row.name} href={profileUrl(row.username)} />
      )
    },
    {
      id: "standing",
      header: t("Standing"),
      hint: t("who follows whom"),
      width: "minmax(170px, 1fr)",
      sortValue: (row) => (row.followerSince > 0 ? 1 : 0),
      render: (row) => (
        <StandingChip follower={row.followerSince > 0} following={row.followingSince > 0} />
      )
    },
    {
      id: "likes",
      header: t("Post likes"),
      hint: t("you gave them"),
      align: "end",
      width: "minmax(110px, 0.6fr)",
      sortValue: (row) => row.postLikes,
      render: (row) => (
        <Text size="label" tone={row.postLikes === 0 ? "subtle" : "primary"} as="span">
          {t.count(row.postLikes)}
        </Text>
      )
    },
    {
      id: "views",
      header: t("Story views"),
      hint: t("last 30 days"),
      align: "end",
      width: "minmax(110px, 0.6fr)",
      sortValue: (row) => row.storyViews,
      render: (row) => (
        <Text size="label" tone={row.storyViews === 0 ? "subtle" : "primary"} as="span">
          {t.count(row.storyViews)}
        </Text>
      )
    },
    {
      id: "since",
      header: t("Connected"),
      hint: t("the follow date"),
      align: "end",
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => Math.max(row.followingSince, row.followerSince),
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(Math.max(row.followingSince, row.followerSince))}
        </Text>
      )
    }
  ];

  return (
    <SectionLayout
      head={<PageHead title={t("Connections")} lede={createLede(t)[view]} />}
      stats={
        <>
          <Stat
            label={t("In this view")}
            icon="connections"
            value={rows.length}
            hint={t("after the search filter")}
          />
          <Stat
            label={t("You never liked")}
            icon="neverLiked"
            value={silent}
            hint={t("no post like, no story like")}
            tone="signal"
          />
          <Stat
            label={t("Likes you gave")}
            icon="likes"
            value={given}
            hint={t("to accounts in this view")}
          />
          <Stat
            label={t("Mutuals overall")}
            icon="followBack"
            value={graph.mutual.length}
            hint={t("you follow each other")}
            tone="positive"
          />
        </>
      }
      charts={
        <>
          <ChartFrame
            title={t("Followers gained, per month")}
            caption={t("{0} current followers, by the month they started", [
              t.count(model.followers.length)
            ])}
          >
            <MonthlyBars unit={t("Followers")} data={followersByMonth} />
          </ChartFrame>
          <ChartFrame
            title={t("Accounts you followed, per month")}
            caption={t("{0} accounts you follow now", [t.count(model.following.length)])}
          >
            <MonthlyBars unit={t("Records")} data={followingByMonth} tone="brand" />
          </ChartFrame>
          <ChartFrame
            title={t("Followers against following")}
            caption={t("Anyone who left is absent, so this runs below your real past count.")}
          >
            <CumulativeLines series={growth} />
          </ChartFrame>
        </>
      }
      toolbar={
        <Toolbar
          rows={rows.length}
          unit={t("Accounts")}
          action={<ExportButton name={`lens-${view}`} columns={csvColumns(columns)} rows={rows} />}
        >
          <FilterTabs
            tabs={tabs}
            active={view}
            onSelect={(id) => {
              setView(id as ViewId);
            }}
            label={t("Connection views")}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={t("Search username or name")}
            label={t("Search connections")}
          />
        </Toolbar>
      }
      panel={
        <DataPanel
          columns={columns}
          rows={rows}
          rowKey={(row) => row.username}
          emptyTitle={t("No accounts match")}
          emptyDetail={t("Clear the search, or pick another view above.")}
          isFlagged={(row) => view === "noFollowBack" && row.followerSince === 0}
        />
      }
      notice={
        view === "unfollowed" ? (
          <WindowNotice>
            {t(
              "Meta keeps only the most recent 59 days of unfollows. Your full unfollow history is not in the export."
            )}
          </WindowNotice>
        ) : (
          <WindowNotice>
            {t(
              "The story-view column covers the last 30 days only. Meta keeps no longer history for it, so a zero there means no view this month, not no view ever."
            )}
          </WindowNotice>
        )
      }
    />
  );
}
