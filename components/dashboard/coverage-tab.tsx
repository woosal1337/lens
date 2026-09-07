"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useMemo, useState } from "react";
import { ChartFrame } from "@/components/chart/chart-frame";
import { RankBars, toRanked } from "@/components/chart/rank-bars";
import {
  AbsentNotice,
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
import type { CoverageEntry, ExportModel } from "@/lib/parser/model";

import { foldForSearch } from "@/lib/parser/text";

function createViews(t: Translator) {
  const VIEWS = [
    { id: "all", label: t("Every file") },
    { id: "loaded", label: t("Loaded") },
    { id: "empty", label: t("Empty") },
    { id: "absent", label: t("Absent") }
  ] as const;
  return VIEWS;
}

type ViewId = ReturnType<typeof createViews>[number]["id"];

function createLede(t: Translator) {
  const LEDE: Record<ViewId, string> = {
    all: t(
      "Every file Lens looked for, and what each one gave. A tool that hides a miss is a tool you cannot check."
    ),
    loaded: t("These files opened and gave at least one record."),
    empty: t(
      "These files opened and held nothing. Meta writes an empty file when it has no data for you."
    ),
    absent: t(
      "Lens looked for these and your folder does not hold them. A missing file disables its view, and never breaks the parse."
    )
  };
  return LEDE;
}

function createColumns(t: Translator) {
  const COLUMNS: Column<CoverageEntry>[] = [
    {
      id: "label",
      header: t("What it holds"),
      hint: t("the view it feeds"),
      width: "minmax(260px, 1.6fr)",
      sortValue: (row) => row.label,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.label}
        </Text>
      )
    },
    {
      id: "file",
      header: t("File"),
      hint: t("the path Lens matched"),
      width: "minmax(280px, 1.6fr)",
      sortValue: (row) => row.file,
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {row.file}
        </Text>
      )
    },
    {
      id: "state",
      header: t("Result"),
      hint: t("what the read gave"),
      width: "minmax(150px, 0.6fr)",
      sortValue: (row) => (row.found ? (row.records > 0 ? 2 : 1) : 0),
      text: (row) => (row.found ? (row.records > 0 ? t("Loaded") : t("Empty")) : t("Absent")),
      render: (row) =>
        !row.found ? (
          <Chip tone="signal">{t("Absent")}</Chip>
        ) : row.records === 0 ? (
          <Chip>{t("Empty")}</Chip>
        ) : (
          <Chip tone="positive">{t("Loaded")}</Chip>
        )
    },
    {
      id: "records",
      header: t("Records"),
      hint: t("rows Lens read"),
      align: "end",
      width: "minmax(130px, 0.5fr)",
      sortValue: (row) => row.records,
      render: (row) => (
        <Text size="label" tone={row.records === 0 ? "subtle" : "primary"} as="span">
          {t.count(row.records)}
        </Text>
      )
    }
  ];
  return COLUMNS;
}

export function CoverageTab({ model }: { model: ExportModel }) {
  const t = useTranslation();

  const [view, setView] = useState<ViewId>("all");
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const all = model.coverage.map((row) => ({ ...row, label: t.known(row.label) }));
    return {
      all,
      loaded: all.filter((row) => row.found && row.records > 0),
      empty: all.filter((row) => row.found && row.records === 0),
      absent: all.filter((row) => !row.found)
    };
  }, [model.coverage, t]);

  const needle = foldForSearch(query.trim());
  const rows = useMemo(() => {
    const source = groups[view];
    if (needle.length === 0) return source;
    return source.filter((row) => foldForSearch(`${row.label} ${row.file}`).includes(needle));
  }, [groups, view, needle]);

  const tabs: FilterTab[] = createViews(t).map((item) => ({
    id: item.id,
    label: item.label,
    count: groups[item.id].length
  }));

  const records = groups.loaded.reduce((sum, row) => sum + row.records, 0);
  const biggest = new Map(
    [...groups.loaded]
      .sort((left, right) => right.records - left.records)
      .slice(0, 6)
      .map((row) => [row.label, row.records] as const)
  );
  const states = new Map<string, number>([
    [t("Loaded"), groups.loaded.length],
    [t("Empty"), groups.empty.length],
    [t("Absent"), groups.absent.length]
  ]);

  return (
    <SectionLayout
      head={<PageHead title={t("What Lens read")} lede={createLede(t)[view]} />}
      stats={
        <>
          <Stat
            label={t("Files Lens looked for")}
            icon="saved"
            value={model.coverage.length}
            hint={t("{0} gave records", [t.percent(groups.loaded.length, model.coverage.length)])}
          />
          <Stat
            label={t("Records read")}
            icon="overview"
            value={records}
            hint={t("every row in every view")}
          />
          <Stat
            label={t("Files that held nothing")}
            icon="absent"
            value={groups.empty.length}
            hint={t("Meta writes an empty file")}
          />
          <Stat
            label={t("Files not in your folder")}
            icon="noResult"
            value={groups.absent.length}
            hint={t("their views stay empty")}
            tone="signal"
          />
        </>
      }
      charts={
        <>
          <ChartFrame
            title={t("What each read gave")}
            caption={t("{0} files, grouped by the result.", [t.count(model.coverage.length)])}
          >
            <RankBars data={toRanked(states, 3)} />
          </ChartFrame>
          <ChartFrame
            title={t("Which file holds the most")}
            caption={t("{0} records over {1} files.", [
              t.count(records),
              t.count(groups.loaded.length)
            ])}
          >
            <RankBars data={toRanked(biggest, 6)} />
          </ChartFrame>
          <ChartFrame
            title={t("Nothing was skipped")}
            caption={t(
              "Lens reads every file it names here. A miss shows as absent, never as a zero."
            )}
          >
            <RankBars
              data={[{ key: t("Files skipped"), label: t("Files skipped"), value: 0 }]}
              tone="brand"
            />
          </ChartFrame>
        </>
      }
      toolbar={
        <Toolbar
          rows={rows.length}
          unit={t("Files")}
          action={
            <ExportButton name="lens-coverage" columns={csvColumns(createColumns(t))} rows={rows} />
          }
        >
          <FilterTabs
            tabs={tabs}
            active={view}
            onSelect={(id) => {
              setView(id as ViewId);
            }}
            label={t("Coverage views")}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={t("Search a file or a view")}
            label={t("Search the coverage")}
          />
        </Toolbar>
      }
      panel={
        <DataPanel
          columns={createColumns(t)}
          rows={rows}
          rowKey={(row) => `${row.label}-${row.file}`}
          emptyTitle={t("No file matches")}
          emptyDetail={t("Clear the search, or pick another view above.")}
          initialSort={{ id: "records", direction: "desc" }}
          isFlagged={(row) => !row.found}
        />
      }
      notice={
        <AbsentNotice title={t("A miss is a row, not a silence")}>
          {t(
            "Meta changes the export format, and a file you had last year can vanish. Lens names every file it looked for, so a zero on another view always has a reason you can read here."
          )}
        </AbsentNotice>
      }
    />
  );
}
