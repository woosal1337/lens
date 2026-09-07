"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useMemo, useState } from "react";
import { ChartFrame } from "@/components/chart/chart-frame";
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
  Stat,
  Text,
  Toolbar,
  type Column,
  type FilterTab
} from "@/components/ui";
import { type People, type Person } from "@/lib/analysis/people";
import { useExportQuery } from "@/lib/parser/use-query";
import { profileUrl } from "@/lib/format";
import { foldForSearch } from "@/lib/parser/text";

function createViews(t: Translator) {
  const VIEWS = [
    { id: "closest", label: t("Your closest people") },
    { id: "drifting", label: t("Drifting") },
    { id: "youGive", label: t("You write more") },
    { id: "theyGive", label: t("They write more") },
    { id: "unresolved", label: t("No username") }
  ] as const;
  return VIEWS;
}

type ViewId = ReturnType<typeof createViews>[number]["id"];

function createLede(t: Translator) {
  const LEDE: Record<ViewId, string> = {
    closest: t(
      "One row for each person you message. The score reads message volume, active days, recency, balance and attention."
    ),
    drifting: t(
      "You wrote a lot to these people once, and little lately. The gap between the lifetime score and the score today is the signal."
    ),
    youGive: t("You write over 70 per cent of the messages in these conversations."),
    theyGive: t("They write over 70 per cent of the messages in these conversations."),
    unresolved: t(
      "Meta writes a display name in a message and a username everywhere else. These names never resolved, or they resolved to two accounts."
    )
  };
  return LEDE;
}

const EMPTY_PEOPLE: People = {
  rows: [],
  handles: { byName: new Map(), size: 0, ambiguous: 0 },
  resolved: 0,
  partners: 0,
  placeholderMessages: 0
};

const HIGH = 0.7;
const LOW = 0.3;
const DRIFT = 8;

function minutes(t: Translator, seconds: number): string {
  if (seconds <= 0) return "—";
  if (seconds < 3600) return t("{0} min", [t.decimal(seconds / 60, 1)]);
  if (seconds < 86400) return t("{0} h", [t.decimal(seconds / 3600, 1)]);
  return t("{0} d", [Math.round(seconds / 86400)]);
}

function createColumns(t: Translator) {
  const COLUMNS: Column<Person>[] = [
    {
      id: "person",
      header: t("Person"),
      hint: t("the name Meta wrote"),
      width: "minmax(220px, 1.6fr)",
      sortValue: (row) => row.name,
      text: (row) => row.name,
      render: (row) =>
        row.username.length > 0 ? (
          <AccountCell handle={row.username} name={row.name} href={profileUrl(row.username)} />
        ) : (
          <AccountCell handle={row.name} />
        )
    },
    {
      id: "score",
      header: t("Score"),
      hint: t("0 to 100, right now"),
      align: "end",
      width: "minmax(100px, 0.4fr)",
      sortValue: (row) => row.score,
      render: (row) => (
        <Text size="label" tone={row.score >= 60 ? "positive" : "primary"} as="span">
          {t.count(row.score)}
        </Text>
      )
    },
    {
      id: "messages",
      header: t("Messages"),
      hint: t("both sides"),
      align: "end",
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => row.messages,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {t.count(row.messages)}
        </Text>
      )
    },
    {
      id: "share",
      header: t("Your share"),
      hint: t("of every message"),
      align: "end",
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => row.yourShare,
      text: (row) => `${Math.round(row.yourShare * 100)}%`,
      render: (row) => (
        <Text
          size="label"
          tone={row.yourShare > HIGH || row.yourShare < LOW ? "signal" : "muted"}
          as="span"
        >
          {t.percent(row.sent, row.messages)}
        </Text>
      )
    },
    {
      id: "theirReply",
      header: t("They answer in"),
      hint: t("the median gap"),
      align: "end",
      width: "minmax(140px, 0.6fr)",
      sortValue: (row) => row.theirReply,
      text: (row) => minutes(t, row.theirReply),
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {minutes(t, row.theirReply)}
        </Text>
      )
    },
    {
      id: "activeDays",
      header: t("Days together"),
      hint: t("with a message"),
      align: "end",
      width: "minmax(130px, 0.5fr)",
      sortValue: (row) => row.activeDays,
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {t.count(row.activeDays)}
        </Text>
      )
    },
    {
      id: "lastAt",
      header: t("Last message"),
      hint: t("either side"),
      align: "end",
      width: "minmax(130px, 0.6fr)",
      sortValue: (row) => row.lastAt,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(row.lastAt)}
        </Text>
      )
    }
  ];
  return COLUMNS;
}

function createUnresolvedColumns(t: Translator) {
  const UNRESOLVED_COLUMNS: Column<Person>[] = [
    {
      id: "name",
      header: t("Name in the messages"),
      hint: t("Meta writes no username"),
      width: "minmax(240px, 1.4fr)",
      sortValue: (row) => row.name,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.name}
        </Text>
      )
    },
    {
      id: "state",
      header: t("Why it failed"),
      hint: t("the bridge result"),
      width: "minmax(200px, 0.9fr)",
      sortValue: (row) => (row.ambiguous ? 1 : 0),
      text: (row) => (row.ambiguous ? t("two accounts") : t("no match")),
      render: (row) =>
        row.ambiguous ? (
          <Chip tone="signal">{t("Two accounts")}</Chip>
        ) : (
          <Chip>{t("No match")}</Chip>
        )
    },
    {
      id: "candidates",
      header: t("Possible accounts"),
      hint: t("Lens will not guess"),
      width: "minmax(280px, 1.6fr)",
      text: (row) => row.candidates.join(" "),
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {row.candidates.length === 0 ? t("none in your export") : row.candidates.join(", ")}
        </Text>
      )
    },
    {
      id: "messages",
      header: t("Messages"),
      hint: t("you would lose"),
      align: "end",
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => row.messages,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {t.count(row.messages)}
        </Text>
      )
    }
  ];
  return UNRESOLVED_COLUMNS;
}

export function PeopleTab() {
  const t = useTranslation();

  const [view, setView] = useState<ViewId>("closest");
  const [query, setQuery] = useState("");

  const reply = useExportQuery<"people">({ kind: "people" }, "people");
  const people: People = reply?.people ?? EMPTY_PEOPLE;

  const groups = useMemo(() => {
    const rows = people.rows;
    return {
      closest: rows,
      drifting: rows
        .filter((row) => row.lifetime - row.score >= DRIFT)
        .sort((left, right) => right.lifetime - right.score - (left.lifetime - left.score)),
      youGive: rows.filter((row) => row.yourShare > HIGH),
      theyGive: rows.filter((row) => row.yourShare < LOW),
      unresolved: rows.filter((row) => row.username.length === 0)
    };
  }, [people]);

  const needle = foldForSearch(query.trim());
  const rows = useMemo(() => {
    const source = groups[view];
    if (needle.length === 0) return source;
    return source.filter(
      (row) => foldForSearch(row.name).includes(needle) || row.username.includes(needle)
    );
  }, [groups, view, needle]);

  const tabs: FilterTab[] = createViews(t).map((item) => ({
    id: item.id,
    label: item.label,
    count: groups[item.id].length
  }));

  const columns = view === "unresolved" ? createUnresolvedColumns(t) : createColumns(t);
  const topScores = new Map(people.rows.slice(0, 6).map((row) => [row.name, row.score] as const));
  const topVolume = new Map(
    [...people.rows]
      .sort((left, right) => right.messages - left.messages)
      .slice(0, 6)
      .map((row) => [row.name, row.messages] as const)
  );
  const topDays = new Map(
    [...people.rows]
      .sort((left, right) => right.activeDays - left.activeDays)
      .slice(0, 6)
      .map((row) => [row.name, row.activeDays] as const)
  );

  return (
    <SectionLayout
      head={<PageHead title={t("People")} lede={createLede(t)[view]} />}
      stats={
        <>
          <Stat
            label={t("People scored")}
            icon="connections"
            value={people.rows.length}
            hint={t("of {0} one-to-one partners", [t.count(people.partners)])}
          />
          <Stat
            label={t("Matched to a username")}
            icon="handle"
            value={people.resolved}
            hint={t("{0} of the scored rows", [t.percent(people.resolved, people.rows.length)])}
          />
          <Stat
            label={t("Drifting")}
            icon="waiting"
            value={groups.drifting.length}
            hint={t("high lifetime score, low score today")}
            tone="signal"
          />
          <Stat
            label={t("One-sided")}
            icon="neverLiked"
            value={groups.youGive.length + groups.theyGive.length}
            hint={t("one side writes over 70 per cent")}
          />
        </>
      }
      charts={
        <>
          <ChartFrame
            title={t("Your highest scores")}
            caption={t("Volume, days, recency, balance and attention, weighted.")}
          >
            <RankBars data={toRanked(topScores, 6)} />
          </ChartFrame>
          <ChartFrame
            title={t("Who you message most")}
            caption={t("{0} conversations with 30 messages or more.", [
              t.count(people.rows.length)
            ])}
          >
            <RankBars data={toRanked(topVolume, 6)} tone="brand" />
          </ChartFrame>
          <ChartFrame
            title={t("Longest running conversations")}
            caption={t("Distinct days with at least one message either way.")}
          >
            <RankBars data={toRanked(topDays, 6)} />
          </ChartFrame>
        </>
      }
      toolbar={
        <Toolbar
          rows={rows.length}
          unit={t("People")}
          action={
            <ExportButton name={`lens-people-${view}`} columns={csvColumns(columns)} rows={rows} />
          }
        >
          <FilterTabs
            tabs={tabs}
            active={view}
            onSelect={(id) => {
              setView(id as ViewId);
            }}
            label={t("People views")}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={t("Search a name")}
            label={t("Search people")}
          />
        </Toolbar>
      }
      panel={
        <DataPanel
          columns={columns}
          rows={rows}
          rowKey={(row) => row.key}
          emptyTitle={t("Nobody matches")}
          emptyDetail={t("Clear the search, or pick another view above.")}
          initialSort={
            view === "unresolved"
              ? { id: "messages", direction: "desc" }
              : { id: "score", direction: "desc" }
          }
          isFlagged={(row) => row.yourShare > HIGH || row.yourShare < LOW}
        />
      }
      notice={
        <AbsentNotice title={t("Lens never guesses a username")}>
          {t.rich(
            "Meta writes a display name in a message and a username in every other file.  {0} names bridge the two, and {1}  map to more than one account. Lens shows both and asks. It also drops  {2} messages under Instagram User, because that name is a deleted account, not a person.",
            [
              t.count(people.handles.size),
              t.count(people.handles.ambiguous),
              t.count(people.placeholderMessages)
            ]
          )}
        </AbsentNotice>
      }
    />
  );
}
