"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useMemo, useState } from "react";
import { ChartFrame } from "@/components/chart/chart-frame";
import { MonthlyBars, toDaily, toMonthly } from "@/components/chart/monthly-bars";
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
import type { ExportModel, StoryAnswer, StoryAnswerKind } from "@/lib/parser/model";
import { profileUrl } from "@/lib/format";
import { foldForSearch } from "@/lib/parser/text";

function createViews(t: Translator) {
  const VIEWS = [
    { id: "watched", label: t("You watch") },
    { id: "liked", label: t("You like") },
    { id: "gap", label: t("Watched, never liked") },
    { id: "unseen", label: t("Mutuals you skip") },
    { id: "replies", label: t("You answered") }
  ] as const;
  return VIEWS;
}

type ViewId = ReturnType<typeof createViews>[number]["id"];

function createLede(t: Translator) {
  const LEDE: Record<ViewId, string> = {
    watched: t(
      "Whose stories you opened, ranked by how many you watched. Meta keeps 30 days of this file and no more."
    ),
    liked: t(
      "Whose stories you tapped the heart on. This file reaches back years, so it is your long record of story attention."
    ),
    gap: t(
      "You open these stories and you never like one. This is the clearest one-sided attention in the whole export."
    ),
    unseen: t(
      "You and these accounts follow each other. You opened none of their stories in the last 30 days."
    ),
    replies: t(
      "Every quiz, poll, countdown, question and sticker you answered. Meta keeps the prompt, not always your answer."
    )
  };
  return LEDE;
}

function createKindLabel(t: Translator) {
  const KIND_LABEL: Record<StoryAnswerKind, string> = {
    quiz: t("Quiz"),
    poll: t("Poll"),
    countdown: t("Countdown"),
    question: t("Question"),
    reaction: t("Sticker")
  };
  return KIND_LABEL;
}

function accountsForView(view: ViewId, graph: Graph): Account[] {
  const all = [...graph.accounts.values()];
  if (view === "liked") return all.filter((account) => account.storyLikes > 0);
  if (view === "gap") {
    return all.filter((account) => account.storyViews > 0 && account.storyLikes === 0);
  }
  if (view === "unseen") {
    return graph.mutual
      .map((username) => graph.accounts.get(username))
      .filter((account): account is Account => account?.storyViews === 0);
  }
  return all.filter((account) => account.storyViews > 0);
}

function spanDays(timestamps: readonly number[]): number {
  const valid = timestamps.filter((at) => at > 0);
  if (valid.length === 0) return 0;
  return Math.round((Math.max(...valid) - Math.min(...valid)) / 86400);
}

function createAccountColumns(t: Translator) {
  const ACCOUNT_COLUMNS: Column<Account>[] = [
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
      id: "views",
      header: t("Stories watched"),
      hint: t("last 30 days"),
      align: "end",
      width: "minmax(140px, 0.7fr)",
      sortValue: (row) => row.storyViews,
      render: (row) => (
        <Text size="label" tone={row.storyViews === 0 ? "subtle" : "primary"} as="span">
          {t.count(row.storyViews)}
        </Text>
      )
    },
    {
      id: "likes",
      header: t("Stories liked"),
      hint: t("the full record"),
      align: "end",
      width: "minmax(130px, 0.6fr)",
      sortValue: (row) => row.storyLikes,
      render: (row) => (
        <Text size="label" tone={row.storyLikes === 0 ? "subtle" : "primary"} as="span">
          {t.count(row.storyLikes)}
        </Text>
      )
    },
    {
      id: "answers",
      header: t("Answers"),
      hint: t("quiz, poll, sticker"),
      align: "end",
      width: "minmax(110px, 0.5fr)",
      sortValue: (row) => row.storyAnswers,
      render: (row) => (
        <Text size="label" tone={row.storyAnswers === 0 ? "subtle" : "primary"} as="span">
          {t.count(row.storyAnswers)}
        </Text>
      )
    }
  ];
  return ACCOUNT_COLUMNS;
}

function createReplyColumns(t: Translator) {
  const REPLY_COLUMNS: Column<StoryAnswer>[] = [
    {
      id: "kind",
      header: t("Kind"),
      hint: t("the sticker type"),
      width: "minmax(130px, 0.6fr)",
      sortValue: (row) => row.kind,
      render: (row) => <Chip>{createKindLabel(t)[row.kind]}</Chip>
    },
    {
      id: "owner",
      header: t("Account"),
      hint: t("who posted the story"),
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
      id: "prompt",
      header: t("What it asked"),
      hint: t("the sticker text"),
      width: "minmax(260px, 2fr)",
      text: (row) => row.prompt,
      render: (row) => (
        <Text size="label" tone={row.prompt.length === 0 ? "subtle" : "muted"} as="span">
          {row.prompt.length === 0 ? t("no prompt saved") : row.prompt}
        </Text>
      )
    },
    {
      id: "answer",
      header: t("Your answer"),
      hint: t("when Meta kept it"),
      width: "minmax(160px, 1fr)",
      text: (row) => row.answer,
      render: (row) => (
        <Text size="label" tone={row.answer.length === 0 ? "subtle" : "primary"} as="span">
          {row.answer.length === 0 ? t("not kept") : row.answer}
        </Text>
      )
    },
    {
      id: "at",
      header: t("Answered"),
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
  return REPLY_COLUMNS;
}

export function StoriesTab({ model, graph }: { model: ExportModel; graph: Graph }) {
  const t = useTranslation();

  const [view, setView] = useState<ViewId>("watched");
  const [query, setQuery] = useState("");

  const viewTally = useMemo(() => {
    const tally = new Map<string, number>();
    for (const row of model.storyViews) {
      if (row.owner.length === 0) continue;
      tally.set(row.owner, (tally.get(row.owner) ?? 0) + 1);
    }
    return tally;
  }, [model]);

  const tabs: FilterTab[] = useMemo(
    () =>
      createViews(t).map((item) => ({
        id: item.id,
        label: item.label,
        count:
          item.id === "replies" ? model.storyAnswers.length : accountsForView(item.id, graph).length
      })),
    [model, graph, t]
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
    const rank =
      view === "liked" ? (row: Account) => row.storyLikes : (row: Account) => row.storyViews;
    return [...filtered].sort(
      (left, right) => rank(right) - rank(left) || left.username.localeCompare(right.username)
    );
  }, [view, graph, needle]);

  const replyRows = useMemo(() => {
    if (needle.length === 0) return model.storyAnswers;
    return model.storyAnswers.filter((row) =>
      foldForSearch(`${row.owner} ${row.ownerName} ${row.prompt} ${row.answer}`).includes(needle)
    );
  }, [model, needle]);

  const shownRows = view === "replies" ? replyRows.length : accountRows.length;
  const unit = view === "replies" ? "answers" : "accounts";

  const watchWindow = spanDays(model.storyViews.map((row) => row.at));
  const likeWindow = spanDays(model.storyLikes.map((row) => row.at));
  const gapCount = accountsForView("gap", graph).length;
  const daily = toDaily(model.storyViews.map((row) => row.at));
  const likeMonths = toMonthly(model.storyLikes.map((row) => row.at));
  const ranked = toRanked(viewTally, 6);

  return (
    <SectionLayout
      head={<PageHead title={t("Stories")} lede={createLede(t)[view]} />}
      stats={
        <>
          <Stat
            label={t("Stories you watched")}
            icon="stories"
            value={model.storyViews.length}
            hint={t("over {0} days, all Meta keeps", [t.count(watchWindow)])}
          />
          <Stat
            label={t("Accounts you watched")}
            icon="connections"
            value={viewTally.size}
            hint={t("inside the same window")}
          />
          <Stat
            label={t("Watched, never liked")}
            icon="neverLiked"
            value={gapCount}
            hint={t("you open, you never tap")}
            tone="signal"
          />
          <Stat
            label={t("Stickers you answered")}
            icon="messages"
            value={model.storyAnswers.length}
            hint={t("quiz, poll, countdown, question")}
          />
        </>
      }
      charts={
        <>
          <ChartFrame
            title={t("Stories you watched, per day")}
            caption={t("{0} views across {1} days", [
              t.count(model.storyViews.length),
              t.count(daily.length)
            ])}
          >
            <MonthlyBars unit={t("Stories")} data={daily} />
          </ChartFrame>
          <ChartFrame
            title={t("Whose stories you watch most")}
            caption={t("The top {0} accounts of the last 30 days.", [t.count(ranked.length)])}
          >
            <RankBars data={ranked} />
          </ChartFrame>
          <ChartFrame
            title={t("Stories you liked, per month")}
            caption={t("{0} story likes over {1} days", [
              t.count(model.storyLikes.length),
              t.count(likeWindow)
            ])}
          >
            <MonthlyBars unit={t("Stories")} data={likeMonths} tone="brand" />
          </ChartFrame>
        </>
      }
      toolbar={
        <Toolbar
          rows={shownRows}
          unit={unit}
          action={
            view === "replies" ? (
              <ExportButton
                name="lens-story-answers"
                columns={csvColumns(createReplyColumns(t))}
                rows={replyRows}
              />
            ) : (
              <ExportButton
                name={`lens-stories-${view}`}
                columns={csvColumns(createAccountColumns(t))}
                rows={accountRows}
              />
            )
          }
        >
          <FilterTabs
            tabs={tabs}
            active={view}
            onSelect={(id) => {
              setView(id as ViewId);
            }}
            label={t("Story views")}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={
              view === "replies" ? t("Search a prompt or account") : t("Search an account")
            }
            label={t("Search stories")}
          />
        </Toolbar>
      }
      panel={
        view === "replies" ? (
          <DataPanel
            columns={createReplyColumns(t)}
            rows={replyRows}
            rowKey={(row) => `${row.kind}-${row.at}-${row.owner}`}
            emptyTitle={t("No answer matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            initialSort={{ id: "at", direction: "desc" }}
          />
        ) : (
          <DataPanel
            columns={createAccountColumns(t)}
            rows={accountRows}
            rowKey={(row) => row.username}
            emptyTitle={t("No accounts match")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            isFlagged={(row) => row.storyViews > 0 && row.storyLikes === 0}
          />
        )
      }
      notice={
        <AbsentNotice title={t("What the export does not hold")}>
          {t.rich(
            "No file says who watched your story. Your own view history holds {0}  days, because Meta deletes the rest. Your story likes reach back {1} days.",
            [t.count(watchWindow), t.count(likeWindow)]
          )}
        </AbsentNotice>
      }
    />
  );
}
