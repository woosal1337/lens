"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useMemo, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { ChartFrame } from "@/components/chart/chart-frame";
import { MonthlyBars } from "@/components/chart/monthly-bars";
import { RankBars, toRanked } from "@/components/chart/rank-bars";
import { StreamBands } from "@/components/chart/stream-bands";
import {
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
  WindowNotice,
  type Column,
  type FilterTab
} from "@/components/ui";
import { buildTimeline, dayEntries, type DayEntry, type Stream } from "@/lib/analysis/timeline";
import type { ExportModel } from "@/lib/parser/model";
import { useExportQuery } from "@/lib/parser/use-query";

import { color, shape, space } from "@/styles/tokens.stylex";

function createViews(t: Translator) {
  const VIEWS = [
    { id: "streams", label: t("Every stream") },
    { id: "table", label: t("Stream totals") },
    { id: "day", label: t("One day") }
  ] as const;
  return VIEWS;
}

type ViewId = ReturnType<typeof createViews>[number]["id"];

function createWeekdays(t: Translator) {
  const WEEKDAYS = [
    t("Sunday"),
    t("Monday"),
    t("Tuesday"),
    t("Wednesday"),
    t("Thursday"),
    t("Friday"),
    t("Saturday")
  ];
  return WEEKDAYS;
}

function createLede(t: Translator) {
  const LEDE: Record<ViewId, string> = {
    streams: t(
      "Every timestamped stream on one axis. A darker block means a busier month. The orange row keeps 30 days only."
    ),
    table: t("The same streams as numbers, with the first and the last record in each one."),
    day: t("Pick a date. Lens then lists every action your export holds for that day, in order.")
  };
  return LEDE;
}

const styles = stylex.create({
  frame: {
    height: "100%",
    padding: space.s5,
    borderRadius: shape.radiusL,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.line,
    backgroundColor: color.surfaceRaised
  },
  field: {
    height: shape.rowHeight,
    display: "flex",
    alignItems: "center"
  }
});

function createStreamColumns(t: Translator) {
  const STREAM_COLUMNS: Column<Stream>[] = [
    {
      id: "label",
      header: t("Stream"),
      hint: t("one file or one join"),
      width: "minmax(220px, 1.4fr)",
      sortValue: (row) => row.label,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.label}
        </Text>
      )
    },
    {
      id: "total",
      header: t("Records"),
      hint: t("in your export"),
      align: "end",
      width: "minmax(130px, 0.6fr)",
      sortValue: (row) => row.total,
      render: (row) => (
        <Text size="label" tone={row.total === 0 ? "subtle" : "primary"} as="span">
          {t.count(row.total)}
        </Text>
      )
    },
    {
      id: "window",
      header: t("Window"),
      hint: t("what Meta keeps"),
      width: "minmax(160px, 0.7fr)",
      text: (row) => (row.short ? t("30 days") : t("full history")),
      render: (row) =>
        row.short ? <Chip tone="signal">{t("30 days")}</Chip> : <Chip>{t("Full history")}</Chip>
    },
    {
      id: "first",
      header: t("First record"),
      hint: t("the oldest row"),
      align: "end",
      width: "minmax(140px, 0.6fr)",
      sortValue: (row) => row.first,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(row.first)}
        </Text>
      )
    },
    {
      id: "last",
      header: t("Last record"),
      hint: t("the newest row"),
      align: "end",
      width: "minmax(140px, 0.6fr)",
      sortValue: (row) => row.last,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(row.last)}
        </Text>
      )
    }
  ];
  return STREAM_COLUMNS;
}

function createDayColumns(t: Translator) {
  const DAY_COLUMNS: Column<DayEntry & { key: string }>[] = [
    {
      id: "label",
      header: t("What happened"),
      hint: t("the stream it came from"),
      width: "minmax(180px, 0.8fr)",
      sortValue: (row) => row.label,
      render: (row) => <Chip>{t.known(row.label)}</Chip>
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
      header: t("Time"),
      hint: t("your local clock"),
      align: "end",
      width: "minmax(140px, 0.6fr)",
      sortValue: (row) => row.at,
      text: (row) => new Date(row.at * 1000).toISOString(),
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {new Date(row.at * 1000).toISOString().slice(11, 16)}
        </Text>
      )
    }
  ];
  return DAY_COLUMNS;
}

export function TimelineTab({ model }: { model: ExportModel }) {
  const t = useTranslation();

  const [view, setView] = useState<ViewId>("streams");
  const [day, setDay] = useState("");

  const monthsReply = useExportQuery<"messageMonths">({ kind: "messageMonths" }, "messageMonths");
  const dayReply = useExportQuery<"dayEntries">(
    view === "day" && day.length > 0 ? { kind: "dayEntries", day } : null,
    view === "day" ? `day:${day}` : "idle-day"
  );

  const timeline = useMemo(() => {
    const data = buildTimeline(model, monthsReply?.months ?? []);
    return {
      ...data,
      streams: data.streams.map((row) => ({
        ...row,
        label: t.known(row.label),
        hint: t.known(row.hint)
      }))
    };
  }, [model, monthsReply, t]);
  const entries = useMemo(
    () =>
      [...dayEntries(model, day), ...(dayReply?.entries ?? [])]
        .sort((left, right) => left.at - right.at)
        .map((row, index) => ({ ...row, key: `${row.stream}-${index}` })),
    [model, day, dayReply]
  );

  const dated = timeline.streams.filter((row) => row.total > 0);
  const total = dated.reduce((sum, row) => sum + row.total, 0);
  const years = Math.max(1, Math.round((timeline.last - timeline.first) / (365.25 * 86400)));

  const hours = timeline.byHour.map((value, hour) => ({
    key: String(hour).padStart(2, "0"),
    value
  }));
  const weekdays = new Map(
    timeline.byWeekday.map((value, index) => [createWeekdays(t)[index] ?? "", value] as const)
  );
  const totals = new Map(dated.map((row) => [row.label, row.total] as const));

  const shown: Record<ViewId, number> = {
    streams: dated.length,
    table: timeline.streams.length,
    day: entries.length
  };
  const units: Record<ViewId, string> = { streams: "streams", table: "streams", day: "events" };
  const tabs: FilterTab[] = createViews(t).map((item) => ({
    id: item.id,
    label: item.label,
    count: item.id === "day" ? entries.length : timeline.streams.length
  }));

  return (
    <SectionLayout
      head={<PageHead title={t("Timeline")} lede={createLede(t)[view]} />}
      stats={
        <>
          <Stat
            label={t("Records on one axis")}
            icon="overview"
            value={total}
            hint={t("across {0} streams", [t.count(dated.length)])}
          />
          <Stat
            label={t("Years your export covers")}
            icon="waiting"
            value={years}
            hint={t("{0} to {1}", [t.isoDate(timeline.first), t.isoDate(timeline.last)])}
          />
          <Stat
            label={t("Longest quiet run")}
            icon="neverLiked"
            value={timeline.longestGap.days}
            hint={t("days with no like, from {0}", [t.isoDate(timeline.longestGap.from)])}
            tone="signal"
          />
          <Stat
            label={t("Months with a record")}
            icon="content"
            value={timeline.months.length}
            hint={t("at least one action in each")}
          />
        </>
      }
      charts={
        <>
          <ChartFrame
            title={t("When you tap, by the hour")}
            caption={t("Your likes, over 24 hours of your own clock.")}
          >
            <MonthlyBars unit={t("Records")} data={hours} />
          </ChartFrame>
          <ChartFrame
            title={t("When you tap, by the weekday")}
            caption={t("The same likes, grouped by the day of the week.")}
          >
            <RankBars data={toRanked(weekdays, 7)} tone="brand" />
          </ChartFrame>
          <ChartFrame
            title={t("Which stream holds the most")}
            caption={t("{0} records across {1} streams.", [t.count(total), t.count(dated.length)])}
          >
            <RankBars data={toRanked(totals, 6)} />
          </ChartFrame>
        </>
      }
      toolbar={
        <Toolbar
          rows={shown[view]}
          unit={units[view]}
          action={
            view === "day" ? (
              <ExportButton
                name={`lens-day-${day}`}
                columns={csvColumns(createDayColumns(t))}
                rows={entries}
              />
            ) : (
              <ExportButton
                name="lens-streams"
                columns={csvColumns(createStreamColumns(t))}
                rows={timeline.streams}
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
            label={t("Timeline views")}
          />
          {view === "day" ? (
            <SearchField
              value={day}
              onChange={setDay}
              placeholder="2026-08-20"
              label={t("Pick a date")}
            />
          ) : null}
        </Toolbar>
      }
      panel={
        view === "streams" ? (
          <div {...stylex.props(styles.frame)}>
            <StreamBands rows={dated} months={timeline.months} />
          </div>
        ) : view === "day" ? (
          <DataPanel
            columns={createDayColumns(t)}
            rows={entries}
            rowKey={(row) => row.key}
            emptyTitle={day.length === 0 ? t("Pick a date") : t("Nothing happened that day")}
            emptyDetail={
              day.length === 0
                ? t("Type a date as 2026-08-20 in the field above.")
                : t("Your export holds no record for that date.")
            }
            initialSort={{ id: "at", direction: "asc" }}
          />
        ) : (
          <DataPanel
            columns={createStreamColumns(t)}
            rows={timeline.streams}
            rowKey={(row) => row.id}
            emptyTitle={t("No stream carries a date")}
            emptyDetail={t("Every file in your export is empty.")}
            initialSort={{ id: "total", direction: "desc" }}
            isFlagged={(row) => row.short}
          />
        )
      }
      notice={
        <WindowNotice>
          {t(
            "Every stream reaches back as far as Meta keeps it, and no further. Stories you watched holds 30 days, so its row is a block at the right edge, not a gap in your life. Lens also drops any date outside 2010 to 2030, because one repost row carries the year 2126."
          )}
        </WindowNotice>
      }
    />
  );
}
