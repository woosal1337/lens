"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useMemo, useState } from "react";
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
import type { Connection, ExportModel } from "@/lib/parser/model";
import { profileUrl } from "@/lib/format";
import { foldForSearch } from "@/lib/parser/text";
import { ChartFrame } from "@/components/chart/chart-frame";
import { CumulativeLines, toCumulative } from "@/components/chart/cumulative-lines";
import { MonthlyBars, toMonthly } from "@/components/chart/monthly-bars";
import { series } from "@/styles/tokens.stylex";

const THREE_YEARS = 94608000;

function createViews(t: Translator) {
  const VIEWS = [
    { id: "out", label: t("You sent, unanswered") },
    { id: "in", label: t("Waiting on you") },
    { id: "recent", label: t("Recent, you sent") }
  ] as const;
  return VIEWS;
}

type ViewId = ReturnType<typeof createViews>[number]["id"];

function isStale(row: Connection) {
  return Date.now() / 1000 - row.followedAt > THREE_YEARS;
}

export function RequestsTab({ model }: { model: ExportModel }) {
  const t = useTranslation();

  const [view, setView] = useState<ViewId>("out");
  const [query, setQuery] = useState("");

  const source: Record<ViewId, Connection[]> = useMemo(
    () => ({ out: model.pendingOut, in: model.pendingIn, recent: model.recentRequests }),
    [model]
  );

  const tabs: FilterTab[] = createViews(t).map((item) => ({
    id: item.id,
    label: item.label,
    count: source[item.id].length
  }));

  const rows = useMemo(() => {
    const needle = foldForSearch(query.trim());
    const filtered =
      needle.length === 0
        ? source[view]
        : source[view].filter(
            (row) =>
              foldForSearch(row.username).includes(needle) ||
              foldForSearch(row.name).includes(needle)
          );
    return [...filtered].sort((left, right) => left.followedAt - right.followedAt);
  }, [view, query, source]);

  const sentByMonth = toMonthly(model.pendingOut.map((row) => row.followedAt));
  const recentByMonth = toMonthly(model.recentRequests.map((row) => row.followedAt));
  const sentCumulative = [
    {
      id: "sent",
      label: t("Requests sent"),
      color: series.signal,
      points: toCumulative(model.pendingOut.map((row) => row.followedAt))
    }
  ];

  const oldest = rows[0];
  const stale = rows.filter(isStale).length;

  const lede =
    view === "out" && oldest
      ? t("{0} requests you sent are still unanswered. The oldest went out on {1}, {2} ago.", [
          t.count(model.pendingOut.length),
          t.isoDate(oldest.followedAt),
          t.elapsed(oldest.followedAt)
        ])
      : view === "in"
        ? t("These people asked to follow you. You never answered.")
        : t("Requests you sent recently. Meta keeps only the last 87 days of this file.");

  const columns: Column<Connection>[] = [
    {
      id: "account",
      header: t("Account"),
      hint: t("opens on Instagram"),
      width: "minmax(240px, 2fr)",
      sortValue: (row) => row.username,
      render: (row) => (
        <AccountCell handle={row.username} name={row.name} href={profileUrl(row.username)} />
      )
    },
    {
      id: "state",
      header: t("State"),
      hint: t("how long it has waited"),
      width: "minmax(150px, 1fr)",
      render: (row) =>
        isStale(row) ? <Chip tone="signal">{t("Over 3 years")}</Chip> : <Chip>{t("Waiting")}</Chip>
    },
    {
      id: "sent",
      header: t("Sent"),
      hint: t("the request date"),
      align: "end",
      width: "minmax(120px, 0.6fr)",
      sortValue: (row) => row.followedAt,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(row.followedAt)}
        </Text>
      )
    },
    {
      id: "waiting",
      header: t("Waiting"),
      hint: t("since you sent it"),
      align: "end",
      width: "minmax(110px, 0.5fr)",
      sortValue: (row) => -row.followedAt,
      render: (row) => (
        <Text size="label" tone={isStale(row) ? "signal" : "primary"} as="span">
          {t.elapsed(row.followedAt)}
        </Text>
      )
    }
  ];

  return (
    <SectionLayout
      head={<PageHead title={t("Follow requests")} lede={lede} />}
      stats={
        <>
          <Stat
            label={t("Unanswered")}
            icon="requests"
            value={model.pendingOut.length}
            hint={t("you sent, nobody accepted")}
            tone="signal"
          />
          <Stat
            label={t("Waiting on you")}
            icon="handle"
            value={model.pendingIn.length}
            hint={t("you never answered")}
          />
          <Stat
            label={t("Older than 3 years")}
            icon="waiting"
            value={stale}
            hint={t("in the current view")}
            tone="signal"
          />
          <Stat
            label={t("Sent in 87 days")}
            icon="window"
            value={model.recentRequests.length}
            hint={t("the retention window")}
          />
        </>
      }
      charts={
        <>
          <ChartFrame
            title={t("Unanswered requests, per month")}
            caption={t("{0} requests nobody accepted", [t.count(model.pendingOut.length)])}
          >
            <MonthlyBars unit={t("Requests")} data={sentByMonth} tone="brand" />
          </ChartFrame>
          <ChartFrame
            title={t("Recent requests, per month")}
            caption={t("Meta keeps only the last 87 days of this file.")}
          >
            <MonthlyBars unit={t("Requests")} data={recentByMonth} />
          </ChartFrame>
          <ChartFrame
            title={t("Unanswered requests, cumulative")}
            caption={t("Every request you sent that is still waiting, oldest first.")}
          >
            <CumulativeLines series={sentCumulative} />
          </ChartFrame>
        </>
      }
      toolbar={
        <Toolbar
          rows={rows.length}
          unit={t("Requests")}
          action={<ExportButton name={`lens-${view}`} columns={csvColumns(columns)} rows={rows} />}
        >
          <FilterTabs
            tabs={tabs}
            active={view}
            onSelect={(id) => {
              setView(id as ViewId);
            }}
            label={t("Request views")}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={t("Search username or name")}
            label={t("Search requests")}
          />
        </Toolbar>
      }
      panel={
        <DataPanel
          columns={columns}
          rows={rows}
          rowKey={(row) => `${row.username}-${row.followedAt}`}
          emptyTitle={t("No requests here")}
          emptyDetail={t("Clear the search, or pick another view above.")}
          isFlagged={isStale}
        />
      }
      notice={
        <AbsentNotice title={t("Lens cannot cancel a request")}>
          {t(
            "The page never touches the network, so it cannot act on your account. Open a profile on Instagram and cancel the request there."
          )}
        </AbsentNotice>
      }
    />
  );
}
