"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useMemo, useState } from "react";
import { ChartFrame } from "@/components/chart/chart-frame";
import { CumulativeLines, toCumulative } from "@/components/chart/cumulative-lines";
import { MonthlyBars, toMonthly } from "@/components/chart/monthly-bars";
import { RankBars, toRanked } from "@/components/chart/rank-bars";
import {
  AbsentNotice,
  AccountCell,
  Chip,
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
  type Column,
  type FilterTab
} from "@/components/ui";
import type { Account, Graph } from "@/lib/analysis/graph";
import type { ExportModel, LikedPost } from "@/lib/parser/model";
import { profileUrl } from "@/lib/format";
import { foldForSearch } from "@/lib/parser/text";
import { series } from "@/styles/tokens.stylex";

function createViews(t: Translator) {
  const VIEWS = [
    { id: "accounts", label: t("By account") },
    { id: "cold", label: t("Never liked") },
    { id: "oneSided", label: t("One-sided") },
    { id: "topics", label: t("Hashtags") },
    { id: "likes", label: t("Every like") }
  ] as const;
  return VIEWS;
}

type ViewId = ReturnType<typeof createViews>[number]["id"];

function createLede(t: Translator) {
  const LEDE: Record<ViewId, string> = {
    accounts: t(
      "Every account you ever liked, ranked by how much attention you sent. The standing column shows whether they follow you back."
    ),
    cold: t(
      "You and these accounts follow each other. You have never liked one post and never liked one story of theirs."
    ),
    oneSided: t(
      "You like these accounts and they do not follow you back. This is the attention you send in one direction."
    ),
    topics: t(
      "Every hashtag on a post you liked, ranked by how often it appears. This summarizes the likes present in this export."
    ),
    likes: t("Every single like, newest first. Search an account, a caption word, or a hashtag.")
  };
  return LEDE;
}

type TopicRow = { tag: string; uses: number; accounts: number };

function likeTally(model: ExportModel) {
  const tally = new Map<string, number>();
  for (const row of model.likedPosts) {
    if (row.owner.length === 0) continue;
    tally.set(row.owner, (tally.get(row.owner) ?? 0) + 1);
  }
  return tally;
}

function topicRows(model: ExportModel): TopicRow[] {
  const uses = new Map<string, number>();
  const owners = new Map<string, Set<string>>();
  for (const row of model.likedPosts) {
    for (const tag of row.hashtags) {
      uses.set(tag, (uses.get(tag) ?? 0) + 1);
      const set = owners.get(tag) ?? new Set<string>();
      set.add(row.owner);
      owners.set(tag, set);
    }
  }
  return [...uses.entries()]
    .map(([tag, total]) => ({ tag, uses: total, accounts: owners.get(tag)?.size ?? 0 }))
    .sort((left, right) => right.uses - left.uses);
}

function likedAccounts(graph: Graph): Account[] {
  return [...graph.accounts.values()].filter(
    (account) => account.postLikes + account.storyLikes + account.commentLikes > 0
  );
}

function accountsForView(view: ViewId, graph: Graph): Account[] {
  const liked = likedAccounts(graph);
  if (view === "cold") {
    return graph.coldMutuals
      .map((username) => graph.accounts.get(username))
      .filter((account): account is Account => account !== undefined);
  }
  if (view === "oneSided") {
    return liked.filter((account) => account.followerSince === 0 && account.followingSince > 0);
  }
  return liked;
}

function tabCount(view: ViewId, model: ExportModel, graph: Graph, topics: number): number {
  if (view === "topics") return topics;
  if (view === "likes") return model.likedPosts.length;
  return accountsForView(view, graph).length;
}

function accountColumns(t: Translator, view: ViewId): Column<Account>[] {
  return [
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
      id: "postLikes",
      header: t("Post likes"),
      hint: t("in this export"),
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
      id: "storyLikes",
      header: t("Story likes"),
      hint: t("in this export"),
      align: "end",
      width: "minmax(110px, 0.6fr)",
      sortValue: (row) => row.storyLikes,
      render: (row) => (
        <Text size="label" tone={row.storyLikes === 0 ? "subtle" : "primary"} as="span">
          {t.count(row.storyLikes)}
        </Text>
      )
    },
    {
      id: "commentLikes",
      header: t("Comment likes"),
      hint: view === "cold" ? t("still counts as nothing") : t("you liked their reply"),
      align: "end",
      width: "minmax(130px, 0.6fr)",
      sortValue: (row) => row.commentLikes,
      render: (row) => (
        <Text size="label" tone={row.commentLikes === 0 ? "subtle" : "primary"} as="span">
          {t.count(row.commentLikes)}
        </Text>
      )
    }
  ];
}

function createTopicColumns(t: Translator) {
  const TOPIC_COLUMNS: Column<TopicRow>[] = [
    {
      id: "tag",
      header: t("Hashtag"),
      hint: t("on a post you liked"),
      width: "minmax(240px, 2fr)",
      sortValue: (row) => row.tag,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          #{row.tag}
        </Text>
      )
    },
    {
      id: "uses",
      header: t("Posts"),
      hint: t("you liked"),
      align: "end",
      width: "minmax(120px, 0.6fr)",
      sortValue: (row) => row.uses,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {t.count(row.uses)}
        </Text>
      )
    },
    {
      id: "accounts",
      header: t("Accounts"),
      hint: t("posted under it"),
      align: "end",
      width: "minmax(120px, 0.6fr)",
      sortValue: (row) => row.accounts,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.count(row.accounts)}
        </Text>
      )
    }
  ];
  return TOPIC_COLUMNS;
}

function createLikeColumns(t: Translator) {
  const LIKE_COLUMNS: Column<LikedPost>[] = [
    {
      id: "owner",
      header: t("Account"),
      hint: t("who posted it"),
      width: "minmax(200px, 1.2fr)",
      sortValue: (row) => row.owner,
      render: (row) =>
        row.owner.length === 0 ? (
          <Chip>{t("Deleted")}</Chip>
        ) : (
          <AccountCell handle={row.owner} name={row.ownerName} href={profileUrl(row.owner)} />
        )
    },
    {
      id: "caption",
      header: t("Caption"),
      hint: t("the first line"),
      width: "minmax(280px, 2.4fr)",
      text: (row) => row.caption,
      render: (row) => (
        <Text size="label" tone={row.caption.length === 0 ? "subtle" : "muted"} as="span">
          {row.caption.length === 0 ? t("no caption") : firstLine(row.caption)}
        </Text>
      )
    },
    {
      id: "tags",
      header: t("Hashtags"),
      hint: t("the first two"),
      width: "minmax(180px, 1fr)",
      text: (row) => row.hashtags.join(" "),
      sortValue: (row) => row.hashtags.length,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {row.hashtags.length === 0 ? "—" : row.hashtags.slice(0, 2).map(withHash).join("  ")}
        </Text>
      )
    },
    {
      id: "at",
      header: t("Liked"),
      hint: t("the date you tapped"),
      align: "end",
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => row.at,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(row.at)}
        </Text>
      )
    }
  ];
  return LIKE_COLUMNS;
}

function withHash(tag: string) {
  return `#${tag}`;
}

function firstLine(caption: string) {
  const line = caption.split("\n")[0] ?? caption;
  return line.length > 96 ? `${line.slice(0, 95)}…` : line;
}

export function LikesTab({ model, graph }: { model: ExportModel; graph: Graph }) {
  const t = useTranslation();

  const [view, setView] = useState<ViewId>("accounts");
  const [query, setQuery] = useState("");

  const topics = useMemo(() => topicRows(model), [model]);
  const tally = useMemo(() => likeTally(model), [model]);

  const likeIndex = useMemo(
    () =>
      model.likedPosts.map((row) => ({
        row,
        haystack: foldForSearch(
          `${row.owner} ${row.ownerName} ${row.caption} ${row.hashtags.join(" ")}`
        )
      })),
    [model]
  );

  const tabs: FilterTab[] = useMemo(
    () =>
      createViews(t).map((item) => ({
        id: item.id,
        label: item.label,
        count: tabCount(item.id, model, graph, topics.length)
      })),
    [model, graph, topics, t]
  );

  const needle = foldForSearch(query.trim());

  const accountRows = useMemo(() => {
    const rows = accountsForView(view, graph);
    const filtered =
      needle.length === 0
        ? rows
        : rows.filter(
            (row) =>
              foldForSearch(row.username).includes(needle) ||
              foldForSearch(row.name).includes(needle)
          );
    return [...filtered].sort(
      (left, right) =>
        right.postLikes + right.storyLikes - (left.postLikes + left.storyLikes) ||
        left.username.localeCompare(right.username)
    );
  }, [view, graph, needle]);

  const topicMatches = useMemo(
    () => (needle.length === 0 ? topics : topics.filter((row) => row.tag.includes(needle))),
    [topics, needle]
  );

  const likeMatches = useMemo(() => {
    const rows =
      needle.length === 0
        ? likeIndex.map((entry) => entry.row)
        : likeIndex.filter((entry) => entry.haystack.includes(needle)).map((entry) => entry.row);
    return [...rows].sort((left, right) => right.at - left.at);
  }, [likeIndex, needle]);

  const shownRows =
    view === "topics"
      ? topicMatches.length
      : view === "likes"
        ? likeMatches.length
        : accountRows.length;
  const unit = view === "topics" ? "hashtags" : view === "likes" ? "likes" : "accounts";

  const monthly = toMonthly(model.likedPosts.map((row) => row.at));
  const ranked = toRanked(tally, 6);
  const attention = [
    {
      id: "posts",
      label: t("Post likes"),
      color: series.first,
      points: toCumulative(model.likedPosts.map((row) => row.at))
    },
    {
      id: "stories",
      label: t("Story likes"),
      color: series.second,
      points: toCumulative(model.storyLikes.map((row) => row.at))
    }
  ];

  const exportAction =
    view === "topics" ? (
      <ExportButton
        name="lens-hashtags"
        columns={csvColumns(createTopicColumns(t))}
        rows={topicMatches}
      />
    ) : view === "likes" ? (
      <ExportButton
        name="lens-likes"
        columns={csvColumns(createLikeColumns(t))}
        rows={likeMatches}
      />
    ) : (
      <ExportButton
        name={`lens-${view}`}
        columns={csvColumns(accountColumns(t, view))}
        rows={accountRows}
      />
    );

  return (
    <SectionLayout
      head={<PageHead title={t("Likes")} lede={createLede(t)[view]} />}
      stats={
        <>
          <Stat
            label={t("Likes you gave")}
            icon="likes"
            value={model.likedPosts.length}
            hint={t("across {0} accounts", [t.count(tally.size)])}
          />
          <Stat
            label={t("In this view")}
            icon="search"
            value={shownRows}
            hint={t("{0}, after the search", [unit])}
          />
          <Stat
            label={t("Mutuals you never like")}
            icon="neverLiked"
            value={graph.coldMutuals.length}
            hint={t("of {0} mutual follows", [t.count(graph.mutual.length)])}
            tone="signal"
          />
          <Stat
            label={t("Comment likes")}
            icon="messages"
            value={model.likedComments.length}
            hint={t("counted apart from posts")}
          />
        </>
      }
      charts={
        <>
          <ChartFrame
            title={t("Likes you gave, per month")}
            caption={t("{0} likes across {1} months", [
              t.count(model.likedPosts.length),
              t.count(monthly.length)
            ])}
          >
            <MonthlyBars unit={t("Likes")} data={monthly} />
          </ChartFrame>
          <ChartFrame
            title={t("Who you like most")}
            caption={t("The top {0} accounts, by the number of posts you liked.", [
              t.count(ranked.length)
            ])}
          >
            <RankBars data={ranked} />
          </ChartFrame>
          <ChartFrame
            title={t("Post likes against story likes")}
            caption={t("Both counts run from your first like to your last.")}
          >
            <CumulativeLines series={attention} />
          </ChartFrame>
        </>
      }
      toolbar={
        <Toolbar rows={shownRows} unit={unit} action={exportAction}>
          <FilterTabs
            tabs={tabs}
            active={view}
            onSelect={(id) => {
              setView(id as ViewId);
            }}
            label={t("Like views")}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={view === "topics" ? t("Search a hashtag") : t("Search account or caption")}
            label={t("Search likes")}
          />
        </Toolbar>
      }
      panel={
        view === "topics" ? (
          <DataPanel
            columns={createTopicColumns(t)}
            rows={topicMatches}
            rowKey={(row) => row.tag}
            emptyTitle={t("No hashtag matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            initialSort={{ id: "uses", direction: "desc" }}
          />
        ) : view === "likes" ? (
          <DataPanel
            columns={createLikeColumns(t)}
            rows={likeMatches}
            rowKey={(row) => `${row.at}-${row.url}`}
            emptyTitle={t("No like matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            initialSort={{ id: "at", direction: "desc" }}
          />
        ) : (
          <DataPanel
            columns={accountColumns(t, view)}
            rows={accountRows}
            rowKey={(row) => row.username}
            emptyTitle={t("No accounts match")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            isFlagged={(row) => row.followerSince === 0 && row.postLikes > 0}
          />
        )
      }
      notice={
        <AbsentNotice title={t("What the export does not hold")}>
          {t(
            "No file names the people who liked your posts. Meta never writes it, so no tool can read it. Lens measures the other direction: whom you like, and whom you never like."
          )}
        </AbsentNotice>
      }
    />
  );
}
