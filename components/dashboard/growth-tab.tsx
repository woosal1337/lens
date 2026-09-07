"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useMemo, useState } from "react";
import { ChartFrame } from "@/components/chart/chart-frame";
import { MonthlyBars } from "@/components/chart/monthly-bars";
import { RankBars } from "@/components/chart/rank-bars";
import { RateLine } from "@/components/chart/rate-line";
import {
  csvColumns,
  DataPanel,
  ExportButton,
  FilterTabs,
  PageHead,
  SectionLayout,
  Stat,
  Text,
  Toolbar,
  WindowNotice,
  type Column,
  type FilterTab
} from "@/components/ui";
import {
  buildGrowth,
  type CurveYear,
  type FirstMoveYear,
  type FollowBackYear,
  type ReciprocityBucket
} from "@/lib/analysis/growth";
import type { ExportModel } from "@/lib/parser/model";

function createViews(t: Translator) {
  const VIEWS = [
    { id: "decay", label: t("Follow-back by year") },
    { id: "curve", label: t("The curve") },
    { id: "first", label: t("Who moved first") },
    { id: "clock", label: t("Reciprocity clock") }
  ] as const;
  return VIEWS;
}

type ViewId = ReturnType<typeof createViews>[number]["id"];

function createLede(t: Translator) {
  const LEDE: Record<ViewId, string> = {
    decay: t(
      "Of the accounts you followed in each year, how many follow you back today. Each row uses the current follower list."
    ),
    curve: t(
      "Your follower and following count at the end of each year, read from the date each current connection started."
    ),
    first: t("For each current mutual follow, compare the two recorded connection dates."),
    clock: t(
      "The gap between recorded follow dates for current mutuals. Earlier connections that ended are absent."
    )
  };
  return LEDE;
}

function createDecayColumns(t: Translator) {
  const DECAY_COLUMNS: Column<FollowBackYear>[] = [
    {
      id: "year",
      header: t("Year you followed"),
      hint: t("the date you started"),
      width: "minmax(180px, 1fr)",
      sortValue: (row) => row.year,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.year}
        </Text>
      )
    },
    {
      id: "followed",
      header: t("Accounts"),
      hint: t("you followed that year"),
      align: "end",
      width: "minmax(140px, 0.6fr)",
      sortValue: (row) => row.followed,
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {t.count(row.followed)}
        </Text>
      )
    },
    {
      id: "back",
      header: t("Follow you back"),
      hint: t("as of this export"),
      align: "end",
      width: "minmax(160px, 0.7fr)",
      sortValue: (row) => row.followedBack,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {t.count(row.followedBack)}
        </Text>
      )
    },
    {
      id: "rate",
      header: t("Rate"),
      hint: t("back over followed"),
      align: "end",
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => row.rate,
      text: (row) => `${Math.round(row.rate * 100)}%`,
      render: (row) => (
        <Text size="label" tone={row.rate < 0.7 ? "signal" : "positive"} as="span">
          {t.percent(row.followedBack, row.followed)}
        </Text>
      )
    }
  ];
  return DECAY_COLUMNS;
}

function createCurveColumns(t: Translator) {
  const CURVE_COLUMNS: Column<CurveYear>[] = [
    {
      id: "year",
      header: t("Year end"),
      hint: t("31 December"),
      width: "minmax(160px, 1fr)",
      sortValue: (row) => row.year,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.year}
        </Text>
      )
    },
    {
      id: "followers",
      header: t("Followers"),
      hint: t("who still follow you"),
      align: "end",
      width: "minmax(150px, 0.7fr)",
      sortValue: (row) => row.followers,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {t.count(row.followers)}
        </Text>
      )
    },
    {
      id: "following",
      header: t("Following"),
      hint: t("you still follow"),
      align: "end",
      width: "minmax(150px, 0.7fr)",
      sortValue: (row) => row.following,
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {t.count(row.following)}
        </Text>
      )
    },
    {
      id: "ratio",
      header: t("Ratio"),
      hint: t("followers over following"),
      align: "end",
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => row.ratio,
      text: (row) => t.decimal(row.ratio, 2),
      render: (row) => (
        <Text size="label" tone={row.ratio < 0.85 ? "signal" : "positive"} as="span">
          {t.decimal(row.ratio, 2)}
        </Text>
      )
    }
  ];
  return CURVE_COLUMNS;
}

function createFirstColumns(t: Translator) {
  const FIRST_COLUMNS: Column<FirstMoveYear>[] = [
    {
      id: "year",
      header: t("Year the pair started"),
      hint: t("the earlier of the two dates"),
      width: "minmax(200px, 1fr)",
      sortValue: (row) => row.year,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.year}
        </Text>
      )
    },
    {
      id: "you",
      header: t("You went first"),
      hint: t("you followed, they answered"),
      align: "end",
      width: "minmax(170px, 0.8fr)",
      sortValue: (row) => row.you,
      render: (row) => (
        <Text size="label" tone="signal" as="span">
          {t.count(row.you)}
        </Text>
      )
    },
    {
      id: "them",
      header: t("They went first"),
      hint: t("they followed, you answered"),
      align: "end",
      width: "minmax(180px, 0.8fr)",
      sortValue: (row) => row.them,
      render: (row) => (
        <Text size="label" tone="positive" as="span">
          {t.count(row.them)}
        </Text>
      )
    }
  ];
  return FIRST_COLUMNS;
}

function createClockColumns(t: Translator) {
  const CLOCK_COLUMNS: Column<ReciprocityBucket>[] = [
    {
      id: "label",
      header: t("Time to follow back"),
      hint: t("after you followed them"),
      width: "minmax(240px, 1.4fr)",
      sortValue: (row) => row.label,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {t.known(row.label)}
        </Text>
      )
    },
    {
      id: "value",
      header: t("Accounts"),
      hint: t("in this window"),
      align: "end",
      width: "minmax(140px, 0.6fr)",
      sortValue: (row) => row.value,
      render: (row) => (
        <Text size="label" tone={row.value === 0 ? "subtle" : "primary"} as="span">
          {t.count(row.value)}
        </Text>
      )
    }
  ];
  return CLOCK_COLUMNS;
}

export function GrowthTab({ model }: { model: ExportModel }) {
  const t = useTranslation();

  const [view, setView] = useState<ViewId>("decay");
  const growth = useMemo(() => buildGrowth(model, Date.now() / 1000), [model]);

  const totals: Record<ViewId, number> = {
    decay: growth.followBack.length,
    curve: growth.curve.length,
    first: growth.firstMove.length,
    clock: growth.reciprocity.length
  };
  const units: Record<ViewId, string> = {
    decay: "years",
    curve: "years",
    first: "years",
    clock: "windows"
  };
  const tabs: FilterTab[] = createViews(t).map((item) => ({
    id: item.id,
    label: item.label,
    count: totals[item.id]
  }));

  const latest = growth.followBack[growth.followBack.length - 1];
  const peak = growth.followBack.reduce(
    (best, row) => (row.rate > best.rate ? row : best),
    growth.followBack[0] ?? { year: "", followed: 0, followedBack: 0, rate: 0 }
  );
  const followerMonths = growth.curve.map((row) => ({ key: row.year, value: row.followers }));
  const firstTally = new Map<string, number>([
    [t("You went first"), growth.firstMove.reduce((sum, row) => sum + row.you, 0)],
    [t("They went first"), growth.firstMove.reduce((sum, row) => sum + row.them, 0)]
  ]);

  const exportAction =
    view === "curve" ? (
      <ExportButton
        name="lens-growth-curve"
        columns={csvColumns(createCurveColumns(t))}
        rows={growth.curve}
      />
    ) : view === "first" ? (
      <ExportButton
        name="lens-first-move"
        columns={csvColumns(createFirstColumns(t))}
        rows={growth.firstMove}
      />
    ) : view === "clock" ? (
      <ExportButton
        name="lens-reciprocity"
        columns={csvColumns(createClockColumns(t))}
        rows={growth.reciprocity}
      />
    ) : (
      <ExportButton
        name="lens-follow-back"
        columns={csvColumns(createDecayColumns(t))}
        rows={growth.followBack}
      />
    );

  return (
    <SectionLayout
      head={<PageHead title={t("Growth")} lede={createLede(t)[view]} />}
      stats={
        <>
          <Stat
            label={t("Follow-back rate now")}
            icon="noFollowBack"
            value={Math.round((latest?.rate ?? 0) * 100)}
            hint={t("per cent, highest cohort {0} in {1}", [
              Math.round(peak.rate * 100),
              peak.year
            ])}
            tone="signal"
          />
          <Stat
            label={t("Best follower month")}
            icon="followBack"
            value={growth.bestMonth.gained}
            hint={t("new followers in {0}", [growth.bestMonth.month])}
            tone="positive"
          />
          <Stat
            label={t("Median follower age")}
            icon="waiting"
            value={Math.round(growth.medianFollowerAge * 10) / 10}
            hint={t("years, oldest since {0}", [t.isoDate(growth.oldestFollower)])}
          />
          <Stat
            label={t("Arrived this year")}
            icon="connections"
            value={Math.round(growth.recentShare * 100)}
            hint={t("per cent of your followers")}
          />
        </>
      }
      charts={
        <>
          <ChartFrame
            title={t("Follow-back rate, by the year you followed")}
            caption={t(
              "Of the accounts you followed that year, the share that follow you back today."
            )}
          >
            <RateLine data={growth.followBack.map((row) => ({ key: row.year, value: row.rate }))} />
          </ChartFrame>
          <ChartFrame
            title={t("Current followers, by the year they joined")}
            caption={t("Anybody who left leaves no row, so this runs below your real past count.")}
          >
            <MonthlyBars unit={t("Followers")} data={followerMonths} />
          </ChartFrame>
          <ChartFrame
            title={t("Who went first")}
            caption={t("Across {0} mutual follows with two dates.", [t.count(growth.mutualCount)])}
          >
            <RankBars
              data={[...firstTally.entries()].map(([key, value]) => ({ key, label: key, value }))}
            />
          </ChartFrame>
        </>
      }
      toolbar={
        <Toolbar rows={totals[view]} unit={units[view]} action={exportAction}>
          <FilterTabs
            tabs={tabs}
            active={view}
            onSelect={(id) => {
              setView(id as ViewId);
            }}
            label={t("Growth views")}
          />
        </Toolbar>
      }
      panel={
        view === "curve" ? (
          <DataPanel
            columns={createCurveColumns(t)}
            rows={growth.curve}
            rowKey={(row) => row.year}
            emptyTitle={t("No follow dates")}
            emptyDetail={t("Your export carries no date on any follow.")}
            initialSort={{ id: "year", direction: "desc" }}
          />
        ) : view === "first" ? (
          <DataPanel
            columns={createFirstColumns(t)}
            rows={growth.firstMove}
            rowKey={(row) => row.year}
            emptyTitle={t("No mutual follows")}
            emptyDetail={t("A first move needs two dates on one pair.")}
            initialSort={{ id: "year", direction: "desc" }}
          />
        ) : view === "clock" ? (
          <DataPanel
            columns={createClockColumns(t)}
            rows={growth.reciprocity}
            rowKey={(row) => row.key}
            emptyTitle={t("No reciprocity data")}
            emptyDetail={t("A gap needs a follow date on both sides.")}
          />
        ) : (
          <DataPanel
            columns={createDecayColumns(t)}
            rows={growth.followBack}
            rowKey={(row) => row.year}
            emptyTitle={t("No follow dates")}
            emptyDetail={t("Your export carries no date on any follow.")}
            initialSort={{ id: "year", direction: "desc" }}
            isFlagged={(row) => row.rate < 0.7}
          />
        )
      }
      notice={
        <WindowNotice>
          {t.rich(
            "The follower list is a survivor list, not a history. It holds the  {0} accounts that follow you today, with the date each one started. Anybody who followed you in 2021 and left leaves no row anywhere in the export.",
            [t.count(model.followers.length)]
          )}
        </WindowNotice>
      }
    />
  );
}
