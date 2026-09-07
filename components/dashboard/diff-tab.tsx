"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useEffect, useMemo, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { ChartFrame } from "@/components/chart/chart-frame";
import { RankBars, toRanked } from "@/components/chart/rank-bars";
import {
  AbsentNotice,
  AccountCell,
  Button,
  Chip,
  csvColumns,
  DataPanel,
  EmptyState,
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
import {
  diffSnapshots,
  comparisonIssue,
  snapshotOf,
  type DiffChange,
  type DiffChangeKind,
  type Snapshot
} from "@/lib/analysis/diff";
import { detectBrowser } from "@/lib/parser/capability";
import type { ExportModel } from "@/lib/parser/model";
import { ExportClient, ExportFormatError } from "@/lib/parser/client";
import {
  filesFromDirectory,
  filesFromList,
  filesFromZips,
  type PickedFile
} from "@/lib/parser/source";
import { profileUrl } from "@/lib/format";
import { foldForSearch } from "@/lib/parser/text";

function createViews(t: Translator) {
  const VIEWS = [
    { id: "unfollowedYou", label: t("They unfollowed you") },
    { id: "followedYou", label: t("They followed you") },
    { id: "youUnfollowed", label: t("You unfollowed") },
    { id: "youFollowed", label: t("You followed") },
    { id: "requestAccepted", label: t("Requests accepted") },
    { id: "requestDropped", label: t("Requests dropped") }
  ] as const;
  return VIEWS;
}

type ViewId = DiffChangeKind;

function createLede(t: Translator) {
  const LEDE: Record<ViewId, string> = {
    unfollowedYou: t(
      "These accounts followed you in the older export and do not follow you in the newer one. No single export answers this."
    ),
    followedYou: t("These accounts joined your follower list between the two exports."),
    youUnfollowed: t(
      "You followed these accounts in the older export and you do not follow them now."
    ),
    youFollowed: t("You started following these accounts between the two exports."),
    requestAccepted: t(
      "You had a pending request in the older export, and you follow them in the newer one."
    ),
    requestDropped: t(
      "Your request left the pending list without becoming a follow. The export does not say why."
    )
  };
  return LEDE;
}

function createKindLabel(t: Translator) {
  const KIND_LABEL: Record<DiffChangeKind, string> = {
    unfollowedYou: t("Left"),
    followedYou: t("Joined"),
    youUnfollowed: t("You left"),
    youFollowed: t("You joined"),
    requestAccepted: t("Accepted"),
    requestDropped: t("Dropped")
  };
  return KIND_LABEL;
}

const styles = stylex.create({ hidden: { display: "none" } });

function matches(row: DiffChange, needle: string): boolean {
  if (needle.length === 0) return true;
  return foldForSearch(row.username).includes(needle) || foldForSearch(row.name).includes(needle);
}

function summarize(t: Translator, changes: readonly DiffChange[], view: ViewId, needle: string) {
  const tally = new Map<string, number>();
  for (const row of changes) {
    tally.set(createKindLabel(t)[row.kind], (tally.get(createKindLabel(t)[row.kind]) ?? 0) + 1);
  }
  const tabs: FilterTab[] = createViews(t).map((item) => ({
    id: item.id,
    label: item.label,
    count: changes.filter((row) => row.kind === item.id).length
  }));
  return {
    rows: changes.filter((row) => row.kind === view && matches(row, needle)),
    tally,
    tabs,
    left: tally.get(createKindLabel(t).unfollowedYou) ?? 0,
    joined: tally.get(createKindLabel(t).followedYou) ?? 0
  };
}

function createColumns(t: Translator) {
  const COLUMNS: Column<DiffChange>[] = [
    {
      id: "account",
      header: t("Account"),
      hint: t("opens on Instagram"),
      width: "minmax(260px, 1.8fr)",
      sortValue: (row) => row.username,
      text: (row) => row.username,
      render: (row) => (
        <AccountCell handle={row.username} name={row.name} href={profileUrl(row.username)} />
      )
    },
    {
      id: "kind",
      header: t("What changed"),
      hint: t("between the two folders"),
      width: "minmax(160px, 0.7fr)",
      sortValue: (row) => row.kind,
      text: (row) => createKindLabel(t)[row.kind],
      render: (row) => (
        <Chip tone={row.kind === "unfollowedYou" ? "signal" : "neutral"}>
          {createKindLabel(t)[row.kind]}
        </Chip>
      )
    },
    {
      id: "window",
      header: t("Window"),
      hint: t("older to newer"),
      align: "end",
      width: "minmax(220px, 1fr)",
      sortValue: (row) => row.to,
      text: (row) => t("{0} to {1}", [t.isoDate(row.from), t.isoDate(row.to)]),
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.rich("{0} to {1}", [t.isoDate(row.from), t.isoDate(row.to)])}
        </Text>
      )
    }
  ];
  return COLUMNS;
}

export function DiffTab({ model }: { model: ExportModel }) {
  const t = useTranslation();

  const [view, setView] = useState<ViewId>("unfollowedYou");
  const [query, setQuery] = useState("");
  const [other, setOther] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const active = useRef<ExportClient | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(
    () => () => {
      const client = active.current;
      active.current = null;
      client?.dispose();
    },
    []
  );

  const here = useMemo(() => snapshotOf(model, t("this export")), [model, t]);
  const diff = useMemo(() => {
    if (other === null) return null;
    const [older, newer] = other.at <= here.at ? [other, here] : [here, other];
    return diffSnapshots(older, newer);
  }, [other, here]);

  async function load(build: () => Promise<PickedFile[]>) {
    if (active.current !== null) return;
    const client = new ExportClient();
    active.current = client;
    setBusy(true);
    setStatus(t("Reading the second folder"));
    try {
      const files = await build();
      if (active.current !== client) return;
      const reply = await client.ask({ kind: "parse", files });
      if (reply.kind !== "parse") throw new Error(t("The worker gave an unexpected answer."));
      const snapshot = snapshotOf(reply.model, t("second export"));
      const issue = comparisonIssue(here, snapshot);
      if (issue !== null) throw new ExportFormatError(issue);
      setOther(snapshot);
      setStatus(null);
    } catch (cause) {
      setStatus(
        cause instanceof ExportFormatError
          ? cause.message
          : t("Lens could not read that folder. Choose a second export you unzipped from Meta.")
      );
    } finally {
      client.dispose();
      active.current = null;
      setBusy(false);
    }
  }

  async function choose() {
    if (detectBrowser().picker === "phone") {
      zipRef.current?.click();
      return;
    }
    if (detectBrowser().picker === "input") {
      inputRef.current?.click();
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: "read" });
      await load(() => filesFromDirectory(handle));
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setStatus(t("This browser blocked the folder picker. Reload the page and try again."));
    }
  }

  const summary = summarize(t, diff?.changes ?? [], view, foldForSearch(query.trim()));
  const { rows, tally, tabs, left, joined } = summary;

  return (
    <SectionLayout
      head={
        <PageHead
          title={t("Compare two exports")}
          lede={
            diff === null
              ? t(
                  "One export is a snapshot. Two exports are a history. Open a second folder, and Lens names everybody who left."
                )
              : createLede(t)[view]
          }
        />
      }
      stats={
        <>
          <Stat
            label={t("They unfollowed you")}
            icon="noFollowBack"
            value={left}
            hint={diff === null ? t("open a second folder") : t("gone from the newer list")}
            tone="signal"
          />
          <Stat
            label={t("They followed you")}
            icon="followBack"
            value={joined}
            hint={t("new in the newer list")}
            tone="positive"
          />
          <Stat
            label={t("Net followers")}
            icon="connections"
            value={diff?.netFollowers ?? 0}
            hint={t("the change between the two")}
          />
          <Stat
            label={t("Exports you asked for")}
            icon="link"
            value={model.downloadRequests.length}
            hint={t("recorded download requests")}
          />
        </>
      }
      charts={
        <>
          <ChartFrame
            title={t("What changed between the two")}
            caption={
              diff === null
                ? t("Open a second export folder to fill this chart.")
                : t("{0} changes from {1} to {2}", [
                    t.count(diff.changes.length),
                    t.isoDate(diff.from.at),
                    t.isoDate(diff.to.at)
                  ])
            }
          >
            <RankBars data={toRanked(tally, 6)} tone="brand" />
          </ChartFrame>
          <ChartFrame
            title={t("The loaded export")}
            caption={t("{0} followers and {1} accounts you follow.", [
              t.count(model.followers.length),
              t.count(model.following.length)
            ])}
          >
            <RankBars
              data={[
                { key: t("Followers"), label: t("Followers"), value: model.followers.length },
                { key: t("Following"), label: t("Following"), value: model.following.length },
                { key: t("Pending"), label: t("Pending"), value: model.pendingOut.length }
              ]}
            />
          </ChartFrame>
          <ChartFrame
            title={t("Nothing is stored")}
            caption={t(
              "Lens keeps neither folder. Pick both again next time, and nothing survives the tab."
            )}
          >
            <RankBars
              data={[{ key: t("Folders kept"), label: t("Folders kept"), value: 0 }]}
              tone="brand"
            />
          </ChartFrame>
        </>
      }
      toolbar={
        <Toolbar
          rows={rows.length}
          unit={t("Accounts")}
          action={
            diff === null ? null : (
              <ExportButton
                name={`lens-diff-${view}`}
                columns={csvColumns(createColumns(t))}
                rows={rows}
              />
            )
          }
        >
          <Button
            label={diff === null ? t("Open a second export") : t("Open another export")}
            variant={diff === null ? "primary" : "quiet"}
            size="small"
            disabled={busy}
            onClick={() => {
              void choose();
            }}
          />
          <Button
            label={t("Open zip files")}
            variant="quiet"
            size="small"
            disabled={busy}
            onClick={() => zipRef.current?.click()}
          />
          {diff === null ? null : (
            <FilterTabs
              tabs={tabs}
              active={view}
              onSelect={(id) => {
                setView(id as ViewId);
              }}
              label={t("Diff views")}
            />
          )}
          {diff === null ? null : (
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder={t("Search an account")}
              label={t("Search the diff")}
            />
          )}
        </Toolbar>
      }
      panel={
        diff === null ? (
          <EmptyState
            icon="connections"
            title={t("Open a second export folder")}
            detail={t(
              "Request a new export from Instagram today. In three months, open both folders here and Lens names everybody who left."
            )}
          />
        ) : (
          <DataPanel
            columns={createColumns(t)}
            rows={rows}
            rowKey={(row) => `${row.kind}-${row.username}`}
            emptyTitle={t("Nothing changed in this view")}
            emptyDetail={t("Pick another view above, or clear the search.")}
            isFlagged={(row) => row.kind === "unfollowedYou"}
          />
        )
      }
      notice={
        <AbsentNotice title={t("Lens stores neither folder")}>
          {t.rich(
            "The comparison runs in memory. Open both folders again next time. Downloaded CSV files stay on your disk. A missing account can also mean a rename, deletion, or block. {0} {1} {2}",
            [
              <p key="value-0" role="status">
                {status === null ? null : t.known(status)}
              </p>,
              <input
                key="value-1"
                ref={zipRef}
                type="file"
                multiple
                accept=".zip"
                aria-label="Choose a second Instagram export as zip files"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length > 0) void load(() => filesFromZips(files));
                  event.target.value = "";
                }}
                {...stylex.props(styles.hidden)}
              />,
              <input
                key="value-2"
                ref={inputRef}
                type="file"
                multiple
                aria-label="Choose a second Instagram export folder"
                {...{ webkitdirectory: "", directory: "" }}
                onChange={(event) => {
                  const list = event.target.files;
                  if (list && list.length > 0) {
                    const files = filesFromList(list);
                    void load(() => Promise.resolve(files));
                  }
                  event.target.value = "";
                }}
                {...stylex.props(styles.hidden)}
              />
            ]
          )}
        </AbsentNotice>
      }
    />
  );
}
