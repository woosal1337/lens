"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useMemo, useState } from "react";
import { ChartFrame } from "@/components/chart/chart-frame";
import { MonthlyBars } from "@/components/chart/monthly-bars";
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
import { type MessageProfile, type ThreadStat } from "@/lib/analysis/threads";
import { useExportQuery } from "@/lib/parser/use-query";
import { Conversation } from "@/components/dashboard/conversation";
import type { SearchRow, ShareRow } from "@/lib/parser/protocol";
import type { MessageKind } from "@/lib/parser/model";
import { profileUrl } from "@/lib/format";
import { foldForSearch } from "@/lib/parser/text";

function createViews(t: Translator) {
  const VIEWS = [
    { id: "threads", label: t("Conversations") },
    { id: "search", label: t("Search every message") },
    { id: "shares", label: t("Shared with you") },
    { id: "oneSided", label: t("One-sided") },
    { id: "quiet", label: t("Gone quiet") }
  ] as const;
  return VIEWS;
}

type ViewId = ReturnType<typeof createViews>[number]["id"];

function createLede(t: Translator) {
  const LEDE: Record<ViewId, string> = {
    threads: t(
      "Every conversation Meta kept, ranked by size. The share column shows how much of each one you wrote."
    ),
    search: t(
      "Search every message body and every shared caption. Add from: in: has: or shared: to narrow it."
    ),
    shares: t(
      "Every account whose post somebody sent you. Instagram gives you no way to find these again."
    ),
    oneSided: t(
      "One person writes most of these. Your share runs over 72 per cent or under 28 per cent."
    ),
    quiet: t(
      "Nobody wrote in these for over a year. The date is the last message either side sent."
    )
  };
  return LEDE;
}

function createKindLabel(t: Translator) {
  const KIND_LABEL: Record<MessageKind, string> = {
    text: t("Text"),
    share: t("Share"),
    photo: t("Photo"),
    video: t("Video"),
    audio: t("Voice"),
    call: t("Call")
  };
  return KIND_LABEL;
}

const EMPTY_PROFILE: MessageProfile = {
  threads: [],
  sent: 0,
  received: 0,
  replies: 0,
  medianReply: 0,
  slowReply: 0,
  starts: 0,
  shares: 0,
  shareOwners: 0,
  byHour: Array.from({ length: 24 }, () => 0),
  byWeekday: Array.from({ length: 7 }, () => 0)
};

const ONE_SIDED_MIN = 20;
const HIGH_SHARE = 0.72;
const LOW_SHARE = 0.28;
const YEAR = 365 * 86400;

function threadLabel(t: Translator, stat: ThreadStat): string {
  return stat.title.length > 0 ? stat.title : t("Unnamed conversation");
}

function createThreadColumns(t: Translator) {
  const THREAD_COLUMNS: Column<ThreadStat>[] = [
    {
      id: "title",
      header: t("Conversation"),
      hint: t("the name Meta stored"),
      width: "minmax(240px, 1.8fr)",
      sortValue: (row) => row.title,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {threadLabel(t, row)}
        </Text>
      )
    },
    {
      id: "people",
      header: t("People"),
      hint: t("you included"),
      align: "end",
      width: "minmax(100px, 0.4fr)",
      sortValue: (row) => row.people,
      render: (row) => (
        <Text size="label" tone={row.people > 2 ? "primary" : "subtle"} as="span">
          {t.count(row.people)}
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
      render: (row) => (
        <Text
          size="label"
          tone={row.yourShare > HIGH_SHARE || row.yourShare < LOW_SHARE ? "signal" : "muted"}
          as="span"
        >
          {t.percent(row.sent, row.messages)}
        </Text>
      )
    },
    {
      id: "reply",
      header: t("Your reply"),
      hint: t("the median gap"),
      align: "end",
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => row.medianReply,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {row.medianReply === 0 ? "—" : t("{0} min", [Math.round(row.medianReply / 60)])}
        </Text>
      )
    },
    {
      id: "last",
      header: t("Last message"),
      hint: t("either side"),
      align: "end",
      width: "minmax(130px, 0.6fr)",
      sortValue: (row) => row.last,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(row.last)}
        </Text>
      )
    }
  ];
  return THREAD_COLUMNS;
}

function createSearchColumns(t: Translator) {
  const SEARCH_COLUMNS: Column<SearchRow>[] = [
    {
      id: "thread",
      header: t("Conversation"),
      hint: t("where it sits"),
      width: "minmax(180px, 1fr)",
      sortValue: (row) => row.thread,
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {row.thread}
        </Text>
      )
    },
    {
      id: "sender",
      header: t("From"),
      hint: t("who wrote it"),
      width: "minmax(150px, 0.8fr)",
      sortValue: (row) => row.sender,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.sender}
        </Text>
      )
    },
    {
      id: "body",
      header: t("Message"),
      hint: t("body or shared caption"),
      width: "minmax(320px, 2.4fr)",
      text: (row) => row.body,
      render: (row) => (
        <Text size="label" tone={row.body.length === 0 ? "subtle" : "muted"} as="span">
          {row.body.length === 0 ? t("no text") : trim(row.body)}
        </Text>
      )
    },
    {
      id: "kind",
      header: t("Kind"),
      hint: t("what it carried"),
      width: "minmax(110px, 0.4fr)",
      sortValue: (row) => row.kind,
      render: (row) => <Chip>{createKindLabel(t)[row.kind]}</Chip>
    },
    {
      id: "at",
      header: t("Sent"),
      hint: t("the date it landed"),
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
  return SEARCH_COLUMNS;
}

function createShareColumns(t: Translator) {
  const SHARE_COLUMNS: Column<ShareRow>[] = [
    {
      id: "owner",
      header: t("Account"),
      hint: t("who made the post"),
      width: "minmax(240px, 1.6fr)",
      sortValue: (row) => row.owner,
      render: (row) => <AccountCell handle={row.owner} href={profileUrl(row.owner)} />
    },
    {
      id: "shares",
      header: t("Posts sent"),
      hint: t("into your inbox"),
      align: "end",
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => row.shares,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {t.count(row.shares)}
        </Text>
      )
    },
    {
      id: "senders",
      header: t("People"),
      hint: t("who sent them"),
      align: "end",
      width: "minmax(110px, 0.4fr)",
      sortValue: (row) => row.senders,
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {t.count(row.senders)}
        </Text>
      )
    },
    {
      id: "last",
      header: t("Last one"),
      hint: t("the newest share"),
      align: "end",
      width: "minmax(130px, 0.6fr)",
      sortValue: (row) => row.last,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(row.last)}
        </Text>
      )
    }
  ];
  return SHARE_COLUMNS;
}

function trim(body: string): string {
  const line = body.split("\n")[0] ?? body;
  return line.length > 110 ? `${line.slice(0, 109)}…` : line;
}

const UNITS: Record<ViewId, string> = {
  threads: "conversations",
  search: "messages",
  shares: "accounts",
  oneSided: "conversations",
  quiet: "conversations"
};

function tallies(
  profile: MessageProfile,
  searched: number,
  shares: number,
  pools: { oneSided: ThreadStat[]; quiet: ThreadStat[] }
): Record<ViewId, number> {
  return {
    threads: profile.threads.length,
    search: searched > 0 ? searched : profile.sent + profile.received,
    shares,
    oneSided: pools.oneSided.length,
    quiet: pools.quiet.length
  };
}

function oldestAt(profile: MessageProfile): number {
  return profile.threads.reduce(
    (old, row) => (row.first > 0 ? Math.min(old, row.first) : old),
    Date.now() / 1000
  );
}

function charts(t: Translator, profile: MessageProfile) {
  return {
    hours: profile.byHour.map((value, hour) => ({ key: String(hour).padStart(2, "0"), value })),
    busiest: new Map(profile.threads.slice(0, 6).map((row) => [threadLabel(t, row), row.messages]))
  };
}

function splitThreads(threads: readonly ThreadStat[]) {
  const now = Date.now() / 1000;
  return {
    all: [...threads],
    oneSided: threads.filter(
      (row) =>
        row.messages >= ONE_SIDED_MIN && (row.yourShare > HIGH_SHARE || row.yourShare < LOW_SHARE)
    ),
    quiet: threads.filter((row) => row.last > 0 && now - row.last > YEAR)
  };
}

function panelFor(
  t: Translator,
  view: ViewId,
  rows: { messageMatches: SearchRow[]; shareMatches: ShareRow[]; threadMatches: ThreadStat[] },
  onOpenThread: (id: string) => void
) {
  if (view === "search") {
    return (
      <DataPanel
        columns={createSearchColumns(t)}
        rows={rows.messageMatches}
        rowKey={(row) => row.key}
        emptyTitle={t("No message matches")}
        emptyDetail={t("Try plain words, or from: in: has: shared: with one value each.")}
        initialSort={{ id: "at", direction: "desc" }}
      />
    );
  }
  if (view === "shares") {
    return (
      <DataPanel
        columns={createShareColumns(t)}
        rows={rows.shareMatches}
        rowKey={(row) => row.owner}
        emptyTitle={t("No account matches")}
        emptyDetail={t("Clear the search, or pick another view above.")}
        initialSort={{ id: "shares", direction: "desc" }}
      />
    );
  }
  return (
    <DataPanel
      columns={createThreadColumns(t)}
      rows={rows.threadMatches}
      rowKey={(row) => row.id}
      emptyTitle={t("No conversation matches")}
      emptyDetail={t("Pick another view above, or clear the search.")}
      initialSort={{ id: "messages", direction: "desc" }}
      isFlagged={(row) => row.yourShare > HIGH_SHARE || row.yourShare < LOW_SHARE}
      onOpen={(row) => {
        onOpenThread(row.id);
      }}
    />
  );
}

function exportFor(
  t: Translator,
  view: ViewId,
  rows: { messageMatches: SearchRow[]; shareMatches: ShareRow[]; threadMatches: ThreadStat[] }
) {
  if (view === "search") {
    return (
      <ExportButton
        name="lens-messages"
        columns={csvColumns(createSearchColumns(t))}
        rows={rows.messageMatches}
      />
    );
  }
  if (view === "shares") {
    return (
      <ExportButton
        name="lens-shares"
        columns={csvColumns(createShareColumns(t))}
        rows={rows.shareMatches}
      />
    );
  }
  return (
    <ExportButton
      name={`lens-${view}`}
      columns={csvColumns(createThreadColumns(t))}
      rows={rows.threadMatches}
    />
  );
}

function viewRows(
  t: Translator,
  view: ViewId,
  pools: { all: ThreadStat[]; oneSided: ThreadStat[]; quiet: ThreadStat[] },
  needle: string
): ThreadStat[] {
  const source = view === "oneSided" ? pools.oneSided : view === "quiet" ? pools.quiet : pools.all;
  if (needle.length === 0) return source;
  return source.filter((row) => foldForSearch(threadLabel(t, row)).includes(needle));
}

export function MessagesTab() {
  const t = useTranslation();

  const [view, setView] = useState<ViewId>("threads");
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const profileReply = useExportQuery<"messageProfile">(
    { kind: "messageProfile" },
    "messageProfile"
  );
  const shareReply = useExportQuery<"shareOwners">(
    view === "shares" ? { kind: "shareOwners" } : null,
    view === "shares" ? "shareOwners" : "idle-shares"
  );
  const monthsReply = useExportQuery<"messageMonths">({ kind: "messageMonths" }, "messageMonths");
  const searchReply = useExportQuery<"messageSearch">(
    view === "search" ? { kind: "messageSearch", query } : null,
    view === "search" ? `search:${query}` : "idle-search"
  );

  const profile = profileReply?.profile ?? EMPTY_PROFILE;
  const shareRows = useMemo(() => shareReply?.rows ?? [], [shareReply]);
  const messageMatches = searchReply?.rows ?? [];
  const monthly = monthsReply?.months ?? [];

  const needle = foldForSearch(query.trim());

  const pools = useMemo(() => splitThreads(profile.threads), [profile]);

  const threadMatches = useMemo(() => viewRows(t, view, pools, needle), [view, pools, needle, t]);

  const shareMatches = useMemo(
    () =>
      needle.length === 0
        ? shareRows
        : shareRows.filter((row: ShareRow) => row.owner.includes(needle)),
    [shareRows, needle]
  );

  const totals = tallies(profile, searchReply?.total ?? 0, shareRows.length, pools);
  const shown: Record<ViewId, number> = {
    ...totals,
    threads: threadMatches.length,
    search: messageMatches.length,
    shares: shareMatches.length,
    oneSided: threadMatches.length,
    quiet: threadMatches.length
  };
  const tabs: FilterTab[] = createViews(t).map((item) => ({
    id: item.id,
    label: item.label,
    count: totals[item.id]
  }));

  const total = profile.sent + profile.received;
  const { hours, busiest } = charts(t, profile);

  const exportAction = exportFor(t, view, { messageMatches, shareMatches, threadMatches });

  return (
    <SectionLayout
      head={<PageHead title={t("Messages")} lede={createLede(t)[view]} />}
      stats={
        <>
          <Stat
            label={t("Messages Meta kept")}
            icon="messages"
            value={total}
            hint={t("across {0} conversations", [t.count(profile.threads.length)])}
          />
          <Stat
            label={t("You wrote")}
            icon="handle"
            value={profile.sent}
            hint={t("{0} of every message", [t.percent(profile.sent, total)])}
          />
          <Stat
            label={t("Posts shared with you")}
            icon="link"
            value={profile.shares}
            hint={t("from {0} accounts", [t.count(profile.shareOwners)])}
          />
          <Stat
            label={t("Conversations gone quiet")}
            icon="waiting"
            value={pools.quiet.length}
            hint={t("no message for over a year")}
            tone="signal"
          />
        </>
      }
      charts={
        <>
          <ChartFrame
            title={t("Messages, per month")}
            caption={t("{0} messages across {1} months", [t.count(total), t.count(monthly.length)])}
          >
            <MonthlyBars unit={t("Messages")} data={monthly} />
          </ChartFrame>
          <ChartFrame
            title={t("When you write")}
            caption={t("Your {0} messages, by the hour of the day.", [t.count(profile.sent)])}
          >
            <MonthlyBars unit={t("Records")} data={hours} tone="brand" />
          </ChartFrame>
          <ChartFrame
            title={t("Your biggest conversations")}
            caption={t("Your median reply takes {0} minutes.", [
              Math.round(profile.medianReply / 60)
            ])}
          >
            <RankBars data={toRanked(busiest, 6)} />
          </ChartFrame>
        </>
      }
      toolbar={
        <Toolbar rows={shown[view]} unit={UNITS[view]} action={exportAction}>
          <FilterTabs
            tabs={tabs}
            active={view}
            onSelect={(id) => {
              setView(id as ViewId);
            }}
            label={t("Message views")}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={view === "search" ? t("text, from: in: has: shared:") : t("Search a name")}
            label={t("Search messages")}
          />
        </Toolbar>
      }
      panel={
        openThread === null ? (
          panelFor(t, view, { messageMatches, shareMatches, threadMatches }, setOpenThread)
        ) : (
          <Conversation
            threadId={openThread}
            onClose={() => {
              setOpenThread(null);
            }}
          />
        )
      }
      notice={
        <AbsentNotice title={t("Read the placeholder, not a person")}>
          {t.rich(
            "A conversation named Instagram User is a deleted account, not one person. Meta reuses that name for every account that left, so never add those rows together. Your oldest conversation started {0} ago.",
            [t.elapsed(oldestAt(profile))]
          )}
        </AbsentNotice>
      }
    />
  );
}
