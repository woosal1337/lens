"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useMemo, useState } from "react";
import { ChartFrame } from "@/components/chart/chart-frame";
import { MonthlyBars } from "@/components/chart/monthly-bars";
import { RankBars } from "@/components/chart/rank-bars";
import {
  AbsentNotice,
  AccountCell,
  Button,
  Chip,
  csvColumns,
  DataPanel,
  ExportButton,
  PageHead,
  SearchField,
  SectionLayout,
  StandingChip,
  Stat,
  Text,
  Toolbar,
  type Column
} from "@/components/ui";
import { accountsFor, type Account, type Graph } from "@/lib/analysis/graph";
import { type BarPoint, toMonthly } from "@/components/chart/monthly-bars";
import { type RankPoint, toRanked } from "@/components/chart/rank-bars";
import {
  buildPersonRecord,
  type PersonEvent,
  type PersonEventKind,
  type PersonRecord
} from "@/lib/analysis/person";
import type { ExportModel } from "@/lib/parser/model";
import type { PersonTalk } from "@/lib/parser/protocol";
import { useExportQuery } from "@/lib/parser/use-query";

import { foldForSearch } from "@/lib/parser/text";

function createKindLabel(t: Translator) {
  const KIND_LABEL: Record<PersonEventKind, string> = {
    follow: t("Follow"),
    follower: t("Follower"),
    request: t("Request"),
    postLike: t("Post like"),
    storyLike: t("Story like"),
    storyView: t("Story view"),
    storyAnswer: t("Sticker"),
    comment: t("Comment"),
    save: t("Saved"),
    message: t("Message"),
    share: t("Share")
  };
  return KIND_LABEL;
}

const PICK_LIMIT = 400;

const EMPTY_TALK: PersonTalk = {
  events: [],
  messages: 0,
  sent: 0,
  threads: 0,
  sharesFromThem: 0
};

function createNoPickLede(t: Translator) {
  const NO_PICK_LEDE = t(
    "Search a username, then open one row. Lens then shows every record your export holds about that account."
  );
  return NO_PICK_LEDE;
}

type Summary = {
  lede: string;
  postLikes: number;
  storyLikes: number;
  messages: number;
  threads: number;
  shares: number;
  monthly: BarPoint[];
  attention: RankPoint[];
  kinds: RankPoint[];
};

function createAttentionFields(t: Translator) {
  const ATTENTION_FIELDS: readonly [string, keyof Account][] = [
    [t("Post likes"), "postLikes"],
    [t("Story views"), "storyViews"],
    [t("Story likes"), "storyLikes"],
    [t("Comments"), "comments"],
    [t("Saves"), "saves"],
    [t("Stickers"), "storyAnswers"]
  ];
  return ATTENTION_FIELDS;
}

function attentionOf(t: Translator, account: Account | undefined): RankPoint[] {
  if (!account) return [];
  return createAttentionFields(t)
    .map(([label, field]) => ({
      key: label,
      label,
      value: Number(account[field])
    }))
    .filter((row) => row.value > 0);
}

function summarize(
  t: Translator,
  record: PersonRecord | null,
  events: readonly PersonEvent[],
  talk: PersonTalk
): Summary {
  const kindTally = new Map<string, number>();
  for (const row of events) {
    const label = createKindLabel(t)[row.kind];
    kindTally.set(label, (kindTally.get(label) ?? 0) + 1);
  }
  if (record === null) {
    return {
      lede: createNoPickLede(t),
      postLikes: 0,
      storyLikes: 0,
      messages: 0,
      threads: 0,
      shares: 0,
      monthly: [],
      attention: [],
      kinds: []
    };
  }
  return {
    lede: t("Every record about @{0}, newest first. Each row came from a file in your folder.", [
      record.account.username
    ]),
    postLikes: record.account.postLikes,
    storyLikes: record.account.storyLikes,
    messages: talk.messages,
    threads: talk.threads,
    shares: talk.sharesFromThem,
    monthly: toMonthly(events.map((row) => row.at)),
    attention: attentionOf(t, record.account),
    kinds: toRanked(kindTally, 6)
  };
}

function createEventColumns(t: Translator) {
  const EVENT_COLUMNS: Column<PersonEvent & { key: string }>[] = [
    {
      id: "kind",
      header: t("What happened"),
      hint: t("the kind of record"),
      width: "minmax(140px, 0.6fr)",
      sortValue: (row) => row.kind,
      render: (row) => (
        <Chip tone={row.kind === "request" ? "signal" : "neutral"}>
          {createKindLabel(t)[row.kind]}
        </Chip>
      )
    },
    {
      id: "detail",
      header: t("Detail"),
      hint: t("what the file holds"),
      width: "minmax(380px, 2.6fr)",
      text: (row) => (row.display ? t.known(row.display.key, row.display.values) : row.detail),
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {row.display ? t.known(row.display.key, row.display.values) : row.detail}
        </Text>
      )
    },
    {
      id: "at",
      header: t("When"),
      hint: t("the date Meta stamped"),
      align: "end",
      width: "minmax(130px, 0.6fr)",
      sortValue: (row) => row.at,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(row.at)}
        </Text>
      )
    }
  ];
  return EVENT_COLUMNS;
}

function createPickColumns(t: Translator) {
  const PICK_COLUMNS: Column<Account>[] = [
    {
      id: "account",
      header: t("Account"),
      hint: t("pick one to open it"),
      width: "minmax(240px, 1.8fr)",
      sortValue: (row) => row.username,
      render: (row) => <AccountCell handle={row.username} name={row.name} />
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
      id: "records",
      header: t("Records"),
      hint: t("every trace of them"),
      align: "end",
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => traceCount(row),
      render: (row) => (
        <Text size="label" tone={traceCount(row) === 0 ? "subtle" : "primary"} as="span">
          {t.count(traceCount(row))}
        </Text>
      )
    }
  ];
  return PICK_COLUMNS;
}

function traceCount(row: Account): number {
  return (
    row.postLikes +
    row.storyLikes +
    row.storyViews +
    row.commentLikes +
    row.comments +
    row.saves +
    row.storyAnswers
  );
}

export function PersonTab({ model, graph }: { model: ExportModel; graph: Graph }) {
  const t = useTranslation();

  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState("");

  const needle = foldForSearch(query.trim());
  const record = useMemo(
    () => (picked.length === 0 ? null : buildPersonRecord(model, graph, picked)),
    [model, graph, picked]
  );
  const talkReply = useExportQuery<"personTalk">(
    record === null ? null : { kind: "personTalk", username: picked, name: record.name },
    record === null ? "idle-talk" : `talk:${picked}`
  );
  const talk = talkReply?.talk ?? EMPTY_TALK;

  const candidates = useMemo(() => {
    const all = accountsFor(graph, [...graph.accounts.keys()]);
    const filtered =
      needle.length === 0
        ? all
        : all.filter(
            (row) =>
              foldForSearch(row.username).includes(needle) ||
              foldForSearch(row.name).includes(needle)
          );
    return [...filtered]
      .sort((left, right) => traceCount(right) - traceCount(left))
      .slice(0, PICK_LIMIT);
  }, [graph, needle]);

  const events = useMemo(
    () =>
      [...(record?.events ?? []), ...talk.events]
        .sort((left, right) => right.at - left.at)
        .map((row, index) => ({ ...row, key: `${row.kind}-${index}` })),
    [record, talk]
  );

  const summary = summarize(t, record, events, talk);
  const chosen = record !== null;

  return (
    <SectionLayout
      head={<PageHead title={t("Person")} lede={summary.lede} />}
      stats={
        <>
          <Stat
            label={t("Records about them")}
            icon="person"
            value={events.length}
            hint={chosen ? t("every file counted") : t("pick an account first")}
          />
          <Stat
            label={t("Likes you gave them")}
            icon="likes"
            value={summary.postLikes}
            hint={t("plus {0} story likes", [t.count(summary.storyLikes)])}
          />
          <Stat
            label={t("Messages with them")}
            icon="messages"
            value={summary.messages}
            hint={t("in {0} conversations", [t.count(summary.threads)])}
          />
          <Stat
            label={t("Their posts sent to you")}
            icon="link"
            value={summary.shares}
            hint={t("by anyone, in any conversation")}
            tone="signal"
          />
        </>
      }
      charts={
        <>
          <ChartFrame
            title={t("Every record, per month")}
            caption={
              chosen
                ? t("{0} records across {1} months", [
                    t.count(events.length),
                    t.count(summary.monthly.length)
                  ])
                : t("Pick an account to fill this chart.")
            }
          >
            <MonthlyBars unit={t("Records")} data={summary.monthly} />
          </ChartFrame>
          <ChartFrame
            title={t("What you sent them")}
            caption={t("Your outbound attention, by kind.")}
          >
            <RankBars data={summary.attention} />
          </ChartFrame>
          <ChartFrame
            title={t("Which files hold them")}
            caption={t("{0} kinds of record in your export.", [t.count(summary.kinds.length)])}
          >
            <RankBars data={summary.kinds} tone="brand" />
          </ChartFrame>
        </>
      }
      toolbar={
        <Toolbar
          rows={chosen ? events.length : candidates.length}
          unit={chosen ? "records" : "accounts"}
          action={
            chosen ? (
              <ExportButton
                name={`lens-person-${picked}`}
                columns={csvColumns(createEventColumns(t))}
                rows={events}
              />
            ) : null
          }
        >
          {chosen ? (
            <Button
              label={t("Pick another account")}
              variant="quiet"
              size="small"
              onClick={() => {
                setPicked("");
              }}
            />
          ) : null}
          <SearchField
            value={query}
            onChange={(next) => {
              setQuery(next);
              setPicked("");
            }}
            placeholder={t("Search a username or a name")}
            label={t("Search a person")}
          />
        </Toolbar>
      }
      panel={
        chosen ? (
          <DataPanel
            columns={createEventColumns(t)}
            rows={events}
            rowKey={(row) => row.key}
            emptyTitle={t("No record for this account")}
            emptyDetail={t("Your export holds the follow, and nothing else.")}
            initialSort={{ id: "at", direction: "desc" }}
          />
        ) : (
          <DataPanel
            columns={createPickColumns(t)}
            rows={candidates}
            rowKey={(row) => row.username}
            emptyTitle={t("No account matches")}
            emptyDetail={t("Type part of a username, or clear the search.")}
            onOpen={(row) => {
              setPicked(row.username);
            }}
          />
        )
      }
      notice={
        <AbsentNotice title={t("One direction only")}>
          {t(
            "Every row here is something you did, or something Meta wrote about the connection. The export holds no record of what they did to you: no like on your post, no view of your story, no visit to your profile."
          )}
        </AbsentNotice>
      }
    />
  );
}
