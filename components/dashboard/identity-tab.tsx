"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useMemo, useState } from "react";
import { ChartFrame } from "@/components/chart/chart-frame";
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
  Stat,
  Text,
  Toolbar,
  type Column,
  type FilterTab
} from "@/components/ui";
import type {
  DownloadRequest,
  ExportModel,
  ProfileChange,
  SearchRecord,
  StoredField
} from "@/lib/parser/model";
import { profileUrl } from "@/lib/format";
import { foldForSearch } from "@/lib/parser/text";

function createViews(t: Translator) {
  const VIEWS = [
    { id: "changes", label: t("Your version history") },
    { id: "about", label: t("What Meta stores") },
    { id: "searches", label: t("Searches") },
    { id: "exports", label: t("Exports you asked for") },
    { id: "notes", label: t("Notes and reposts") }
  ] as const;
  return VIEWS;
}

type ViewId = ReturnType<typeof createViews>[number]["id"];

function createLede(t: Translator) {
  const LEDE: Record<ViewId, string> = {
    changes: t(
      "Every name, username, bio and link you ever set, with the old value beside the new one. Instagram shows you none of this."
    ),
    about: t(
      "The fields Meta holds on your account, plus the address and phone it saved for forms. Every value sits in plain text in your folder."
    ),
    searches: t("The profiles and the words you searched, and the date of each one."),
    exports: t(
      "Every time you asked Meta for your data. Two of these let you diff a follower list and find who left."
    ),
    notes: t("The accounts whose note or repost you touched, ranked by how often.")
  };
  return LEDE;
}

type NoteRow = { username: string; name: string; touches: number };

function search<Row>(
  rows: readonly Row[],
  needle: string,
  haystack: (row: Row) => string
): readonly Row[] {
  if (needle.length === 0) return rows;
  return rows.filter((row) => foldForSearch(haystack(row)).includes(needle));
}

function shorten(value: string): string {
  if (value.length === 0) return "empty";
  return value.length > 80 ? `${value.slice(0, 79)}…` : value.replace(/\n/g, " ");
}

function createChangeColumns(t: Translator) {
  const CHANGE_COLUMNS: Column<ProfileChange>[] = [
    {
      id: "field",
      header: t("What you changed"),
      hint: t("the field Meta names"),
      width: "minmax(160px, 0.8fr)",
      sortValue: (row) => row.field,
      render: (row) => (
        <Chip tone={row.field === "Username" ? "signal" : "neutral"}>{row.field}</Chip>
      )
    },
    {
      id: "previous",
      header: t("Before"),
      hint: t("the value you replaced"),
      width: "minmax(240px, 1.6fr)",
      text: (row) => row.previous,
      render: (row) => (
        <Text size="label" tone={row.previous.length === 0 ? "subtle" : "muted"} as="span">
          {shorten(row.previous)}
        </Text>
      )
    },
    {
      id: "next",
      header: t("After"),
      hint: t("the value you set"),
      width: "minmax(240px, 1.6fr)",
      text: (row) => row.next,
      render: (row) => (
        <Text size="label" tone={row.next.length === 0 ? "subtle" : "primary"} as="span">
          {shorten(row.next)}
        </Text>
      )
    },
    {
      id: "at",
      header: t("When"),
      hint: t("the date Meta stamped"),
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
  return CHANGE_COLUMNS;
}

function createAboutColumns(t: Translator) {
  const ABOUT_COLUMNS: Column<StoredField>[] = [
    {
      id: "label",
      header: t("Field"),
      hint: t("as Meta names it"),
      width: "minmax(240px, 1fr)",
      sortValue: (row) => row.label,
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {row.label}
        </Text>
      )
    },
    {
      id: "value",
      header: t("What Meta holds"),
      hint: t("read from your folder"),
      width: "minmax(320px, 2fr)",
      sortValue: (row) => row.value,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {shorten(row.value)}
        </Text>
      )
    }
  ];
  return ABOUT_COLUMNS;
}

function createSearchColumns(t: Translator) {
  const SEARCH_COLUMNS: Column<SearchRecord>[] = [
    {
      id: "kind",
      header: t("Kind"),
      hint: t("profile or words"),
      width: "minmax(130px, 0.5fr)",
      sortValue: (row) => row.kind,
      render: (row) => <Chip>{row.kind === "profile" ? t("Profile") : t("Words")}</Chip>
    },
    {
      id: "term",
      header: t("What you typed"),
      hint: t("Meta kept it"),
      width: "minmax(320px, 2fr)",
      sortValue: (row) => row.term,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.term}
        </Text>
      )
    },
    {
      id: "at",
      header: t("When"),
      hint: t("the date you searched"),
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
  return SEARCH_COLUMNS;
}

function createExportColumns(t: Translator) {
  const EXPORT_COLUMNS: Column<DownloadRequest>[] = [
    {
      id: "requestedAt",
      header: t("You asked"),
      hint: t("the request date"),
      width: "minmax(150px, 0.7fr)",
      sortValue: (row) => row.requestedAt,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {t.isoDate(row.requestedAt)}
        </Text>
      )
    },
    {
      id: "completedAt",
      header: t("Meta finished"),
      hint: t("the completion date"),
      width: "minmax(150px, 0.7fr)",
      sortValue: (row) => row.completedAt,
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {t.isoDate(row.completedAt)}
        </Text>
      )
    },
    {
      id: "window",
      header: t("The window it covered"),
      hint: t("start to end"),
      width: "minmax(260px, 1.4fr)",
      text: (row) => t("{0} to {1}", [t.isoDate(row.windowStart), t.isoDate(row.windowEnd)]),
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.rich("{0} to {1}", [t.isoDate(row.windowStart), t.isoDate(row.windowEnd)])}
        </Text>
      )
    },
    {
      id: "quality",
      header: t("Media quality"),
      hint: t("what you picked"),
      align: "end",
      width: "minmax(140px, 0.5fr)",
      sortValue: (row) => row.quality,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {row.quality.length === 0 ? "—" : row.quality}
        </Text>
      )
    }
  ];
  return EXPORT_COLUMNS;
}

function createNoteColumns(t: Translator) {
  const NOTE_COLUMNS: Column<NoteRow>[] = [
    {
      id: "account",
      header: t("Account"),
      hint: t("opens on Instagram"),
      width: "minmax(280px, 1.8fr)",
      sortValue: (row) => row.username,
      render: (row) => (
        <AccountCell handle={row.username} name={row.name} href={profileUrl(row.username)} />
      )
    },
    {
      id: "touches",
      header: t("Notes and reposts"),
      hint: t("you touched theirs"),
      align: "end",
      width: "minmax(180px, 0.7fr)",
      sortValue: (row) => row.touches,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {t.count(row.touches)}
        </Text>
      )
    }
  ];
  return NOTE_COLUMNS;
}

export function IdentityTab({ model }: { model: ExportModel }) {
  const t = useTranslation();

  const [view, setView] = useState<ViewId>("changes");
  const [query, setQuery] = useState("");

  const about = useMemo(
    () => [...model.storedAbout, ...model.autofill],
    [model.storedAbout, model.autofill]
  );
  const notes = useMemo(() => {
    const groups = new Map<string, NoteRow>();
    for (const row of model.noteInteractions) {
      const found = groups.get(row.username) ?? { ...row, touches: 0 };
      found.touches += 1;
      groups.set(row.username, found);
    }
    return [...groups.values()].sort((left, right) => right.touches - left.touches);
  }, [model.noteInteractions]);

  const needle = foldForSearch(query.trim());
  const changeRows = useMemo(
    () => search(model.profileChanges, needle, (row) => `${row.field} ${row.previous} ${row.next}`),
    [model.profileChanges, needle]
  );
  const aboutRows = useMemo(
    () => search(about, needle, (row) => `${row.label} ${row.value}`),
    [about, needle]
  );
  const searchRows = useMemo(
    () => search(model.searches, needle, (row) => row.term),
    [model.searches, needle]
  );
  const noteRows = useMemo(
    () => search(notes, needle, (row) => `${row.username} ${row.name}`),
    [notes, needle]
  );

  const totals: Record<ViewId, number> = {
    changes: model.profileChanges.length,
    about: about.length,
    searches: model.searches.length,
    exports: model.downloadRequests.length,
    notes: notes.length
  };
  const shown: Record<ViewId, number> = {
    changes: changeRows.length,
    about: aboutRows.length,
    searches: searchRows.length,
    exports: model.downloadRequests.length,
    notes: noteRows.length
  };
  const units: Record<ViewId, string> = {
    changes: "changes",
    about: "fields",
    searches: "searches",
    exports: "requests",
    notes: "accounts"
  };
  const tabs: FilterTab[] = createViews(t).map((item) => ({
    id: item.id,
    label: item.label,
    count: totals[item.id]
  }));

  const fieldTally = new Map<string, number>();
  for (const row of model.profileChanges) {
    fieldTally.set(row.field, (fieldTally.get(row.field) ?? 0) + 1);
  }
  const changeMonths = toMonthly(model.profileChanges.map((row) => row.at));
  const exportMonths = toMonthly(model.downloadRequests.map((row) => row.requestedAt));
  const usernameChanges = fieldTally.get(t("Username")) ?? 0;

  const exportAction =
    view === "about" ? (
      <ExportButton
        name="lens-stored-about"
        columns={csvColumns(createAboutColumns(t))}
        rows={aboutRows}
      />
    ) : view === "searches" ? (
      <ExportButton
        name="lens-searches"
        columns={csvColumns(createSearchColumns(t))}
        rows={searchRows}
      />
    ) : view === "exports" ? (
      <ExportButton
        name="lens-export-requests"
        columns={csvColumns(createExportColumns(t))}
        rows={model.downloadRequests}
      />
    ) : view === "notes" ? (
      <ExportButton name="lens-notes" columns={csvColumns(createNoteColumns(t))} rows={noteRows} />
    ) : (
      <ExportButton
        name="lens-profile-changes"
        columns={csvColumns(createChangeColumns(t))}
        rows={changeRows}
      />
    );

  return (
    <SectionLayout
      head={<PageHead title={t("Identity")} lede={createLede(t)[view]} />}
      stats={
        <>
          <Stat
            label={t("Profile changes")}
            icon="person"
            value={model.profileChanges.length}
            hint={t("across {0} months", [t.count(changeMonths.length)])}
          />
          <Stat
            label={t("Usernames you held")}
            icon="handle"
            value={usernameChanges}
            hint={t("every rename Meta kept")}
            tone="signal"
          />
          <Stat
            label={t("Fields Meta stores")}
            icon="saved"
            value={about.length}
            hint={t("your profile plus autofill")}
          />
          <Stat
            label={t("Exports you asked for")}
            icon="link"
            value={model.downloadRequests.length}
            hint={t("two of them make a diff")}
          />
        </>
      }
      charts={
        <>
          <ChartFrame
            title={t("Profile changes, per month")}
            caption={t("{0} edits over {1} months", [
              t.count(model.profileChanges.length),
              t.count(changeMonths.length)
            ])}
          >
            <MonthlyBars unit={t("Changes")} data={changeMonths} />
          </ChartFrame>
          <ChartFrame
            title={t("Which field you changed most")}
            caption={t("{0} fields carry an edit in your export.", [t.count(fieldTally.size)])}
          >
            <RankBars data={toRanked(fieldTally, 6)} />
          </ChartFrame>
          <ChartFrame
            title={t("Exports you requested, per month")}
            caption={t("{0} requests since your first one", [
              t.count(model.downloadRequests.length)
            ])}
          >
            <MonthlyBars unit={t("Exports")} data={exportMonths} tone="brand" />
          </ChartFrame>
        </>
      }
      toolbar={
        <Toolbar rows={shown[view]} unit={units[view]} action={exportAction}>
          <FilterTabs
            tabs={tabs}
            active={view}
            onSelect={(id) => {
              setView(id as ViewId);
            }}
            label={t("Identity views")}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={t("Search a value or a field")}
            label={t("Search identity rows")}
          />
        </Toolbar>
      }
      panel={
        view === "about" ? (
          <DataPanel
            columns={createAboutColumns(t)}
            rows={aboutRows}
            rowKey={(row) => `${row.label}-${row.value}`}
            emptyTitle={t("No field matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
          />
        ) : view === "searches" ? (
          <DataPanel
            columns={createSearchColumns(t)}
            rows={searchRows}
            rowKey={(row) => `${row.kind}-${row.at}-${row.term}`}
            emptyTitle={t("No search matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            initialSort={{ id: "at", direction: "desc" }}
          />
        ) : view === "exports" ? (
          <DataPanel
            columns={createExportColumns(t)}
            rows={model.downloadRequests}
            rowKey={(row) => String(row.requestedAt)}
            emptyTitle={t("No export requests")}
            emptyDetail={t("This export holds no record of an earlier request.")}
            initialSort={{ id: "requestedAt", direction: "desc" }}
          />
        ) : view === "notes" ? (
          <DataPanel
            columns={createNoteColumns(t)}
            rows={noteRows}
            rowKey={(row) => row.username}
            emptyTitle={t("No account matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            initialSort={{ id: "touches", direction: "desc" }}
          />
        ) : (
          <DataPanel
            columns={createChangeColumns(t)}
            rows={changeRows}
            rowKey={(row) => `${row.at}-${row.field}-${row.next}`}
            emptyTitle={t("No change matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            initialSort={{ id: "at", direction: "desc" }}
            isFlagged={(row) => row.field === "Username"}
          />
        )
      }
      notice={
        <AbsentNotice title={t("Your folder holds this in plain text")}>
          {t(
            "Meta writes your email address, your phone number and your date of birth into the export with no protection. Store the folder where you would store a password, and delete it when you finish."
          )}
        </AbsentNotice>
      }
    />
  );
}
