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
  Stat,
  Text,
  Toolbar,
  type Column,
  type FilterTab
} from "@/components/ui";
import type {
  Advertiser,
  ExpiredApp,
  ExportModel,
  LinkVisit,
  SuggestedProfile,
  SyncedContact
} from "@/lib/parser/model";
import { profileUrl } from "@/lib/format";
import { foldForSearch } from "@/lib/parser/text";

function createViews(t: Translator) {
  const VIEWS = [
    { id: "advertisers", label: t("Advertisers") },
    { id: "contacts", label: t("Your contacts") },
    { id: "categories", label: t("Categories") },
    { id: "suggested", label: t("Suggested to you") },
    { id: "browsing", label: t("In-app browsing") },
    { id: "apps", label: t("Apps") }
  ] as const;
  return VIEWS;
}

type ViewId = ReturnType<typeof createViews>[number]["id"];

function createLede(t: Translator) {
  const LEDE: Record<ViewId, string> = {
    advertisers: t(
      "Every advertiser that matched a record to your profile. Meta names each one, and names how the match happened."
    ),
    contacts: t(
      "The names and numbers Meta took from your phone address book. These are other people, and Meta still holds them."
    ),
    categories: t(
      "The interest categories Meta assigns you, so an advertiser can buy your attention by name."
    ),
    suggested: t(
      "Every profile Instagram put in front of you. Meta stopped writing this file, so it covers only the early years."
    ),
    browsing: t(
      "Every page you opened inside the Instagram browser, with the session start. Meta keeps 30 days."
    ),
    apps: t(
      "Third-party apps that once held an access token for your account, and the ID each one knew you by."
    )
  };
  return LEDE;
}

function createBuckets(t: Translator) {
  const BUCKETS: readonly [string, string][] = [
    [t("containing entries"), t("Matched from a list")],
    [t("interactions you may have had"), t("Matched from your activity")],
    [t("store you visited"), t("You visited their store")]
  ];
  return BUCKETS;
}

function bucketLabel(t: Translator, bucket: string): string {
  return (
    createBuckets(t).find(([needle]) => bucket.includes(needle))?.[1] ?? t("Matched some other way")
  );
}

function hostOf(url: string): string {
  const match = /^(?:https?:\/\/)?([^/?#]+)/.exec(url);
  return match?.[1]?.replace(/^www\./, "") ?? url;
}

function search<Row>(
  rows: readonly Row[],
  needle: string,
  haystack: (row: Row) => string
): readonly Row[] {
  if (needle.length === 0) return rows;
  return rows.filter((row) => foldForSearch(haystack(row)).includes(needle));
}

function createAdvertiserColumns(t: Translator) {
  const ADVERTISER_COLUMNS: Column<Advertiser>[] = [
    {
      id: "name",
      header: t("Advertiser"),
      hint: t("as Meta names it"),
      width: "minmax(280px, 2fr)",
      sortValue: (row) => row.name,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.name}
        </Text>
      )
    },
    {
      id: "bucket",
      header: t("How they matched you"),
      hint: t("Meta groups them"),
      width: "minmax(260px, 1.4fr)",
      sortValue: (row) => row.bucket,
      render: (row) => <Chip>{bucketLabel(t, row.bucket)}</Chip>
    }
  ];
  return ADVERTISER_COLUMNS;
}

function createContactColumns(t: Translator) {
  const CONTACT_COLUMNS: Column<SyncedContact>[] = [
    {
      id: "name",
      header: t("Name"),
      hint: t("from your address book"),
      width: "minmax(260px, 1.6fr)",
      sortValue: (row) => row.name,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.name.length === 0 ? t("no name") : row.name}
        </Text>
      )
    },
    {
      id: "detail",
      header: t("Contact detail"),
      hint: t("a number or an address"),
      width: "minmax(240px, 1.4fr)",
      sortValue: (row) => row.detail,
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {row.detail.length === 0 ? "—" : row.detail}
        </Text>
      )
    }
  ];
  return CONTACT_COLUMNS;
}

function createCategoryColumns(t: Translator) {
  const CATEGORY_COLUMNS: Column<{ name: string }>[] = [
    {
      id: "name",
      header: t("Category"),
      hint: t("Meta assigned it to you"),
      width: "minmax(320px, 1fr)",
      sortValue: (row) => row.name,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.name}
        </Text>
      )
    }
  ];
  return CATEGORY_COLUMNS;
}

function createSuggestedColumns(t: Translator) {
  const SUGGESTED_COLUMNS: Column<SuggestedProfile>[] = [
    {
      id: "username",
      header: t("Profile"),
      hint: t("opens on Instagram"),
      width: "minmax(280px, 1.8fr)",
      sortValue: (row) => row.username,
      render: (row) =>
        row.username.startsWith("__deleted__") ? (
          <Chip>{t("Account deleted")}</Chip>
        ) : (
          <AccountCell handle={row.username} href={profileUrl(row.username)} />
        )
    },
    {
      id: "at",
      header: t("Shown to you"),
      hint: t("the date it appeared"),
      align: "end",
      width: "minmax(140px, 0.6fr)",
      sortValue: (row) => row.at,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(row.at)}
        </Text>
      )
    }
  ];
  return SUGGESTED_COLUMNS;
}

function createBrowsingColumns(t: Translator) {
  const BROWSING_COLUMNS: Column<LinkVisit>[] = [
    {
      id: "title",
      header: t("Page"),
      hint: t("the page title"),
      width: "minmax(300px, 2fr)",
      sortValue: (row) => row.title,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.title.length === 0 ? t("no title") : row.title}
        </Text>
      )
    },
    {
      id: "host",
      header: t("Site"),
      hint: t("read from the link"),
      width: "minmax(200px, 1fr)",
      sortValue: (row) => hostOf(row.url),
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {hostOf(row.url)}
        </Text>
      )
    },
    {
      id: "at",
      header: t("Opened"),
      hint: t("last 30 days only"),
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
  return BROWSING_COLUMNS;
}

function createAppColumns(t: Translator) {
  const APP_COLUMNS: Column<ExpiredApp>[] = [
    {
      id: "name",
      header: t("App"),
      hint: t("as the app named itself"),
      width: "minmax(260px, 1.6fr)",
      sortValue: (row) => row.name,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.name.length === 0 ? t("unnamed app") : row.name}
        </Text>
      )
    },
    {
      id: "yourId",
      header: t("Your ID there"),
      hint: t("how the app knew you"),
      width: "minmax(200px, 1fr)",
      sortValue: (row) => row.yourId,
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {row.yourId.length === 0 ? "—" : row.yourId}
        </Text>
      )
    },
    {
      id: "addedAt",
      header: t("Added"),
      hint: t("when you allowed it"),
      align: "end",
      width: "minmax(130px, 0.5fr)",
      sortValue: (row) => row.addedAt,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(row.addedAt)}
        </Text>
      )
    },
    {
      id: "lastActiveAt",
      header: t("Last active"),
      hint: t("the final call it made"),
      align: "end",
      width: "minmax(130px, 0.5fr)",
      sortValue: (row) => row.lastActiveAt,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(row.lastActiveAt)}
        </Text>
      )
    }
  ];
  return APP_COLUMNS;
}

export function TrackingTab({ model }: { model: ExportModel }) {
  const t = useTranslation();

  const [view, setView] = useState<ViewId>("advertisers");
  const [query, setQuery] = useState("");

  const categories = useMemo(
    () => model.adCategories.map((name) => ({ name })),
    [model.adCategories]
  );
  const needle = foldForSearch(query.trim());

  const advertisers = useMemo(
    () => search(model.advertisers, needle, (row) => `${row.name} ${bucketLabel(t, row.bucket)}`),
    [model.advertisers, needle, t]
  );
  const contacts = useMemo(
    () => search(model.contacts, needle, (row) => `${row.name} ${row.detail}`),
    [model.contacts, needle]
  );
  const categoryRows = useMemo(
    () => search(categories, needle, (row) => row.name),
    [categories, needle]
  );
  const suggested = useMemo(
    () => search(model.suggestedProfiles, needle, (row) => row.username),
    [model.suggestedProfiles, needle]
  );
  const browsing = useMemo(
    () => search(model.linkHistory, needle, (row) => `${row.title} ${row.url}`),
    [model.linkHistory, needle]
  );
  const apps = useMemo(
    () => search(model.expiredApps, needle, (row) => `${row.name} ${row.yourId}`),
    [model.expiredApps, needle]
  );

  const totals: Record<ViewId, number> = {
    advertisers: model.advertisers.length,
    contacts: model.contacts.length,
    categories: categories.length,
    suggested: model.suggestedProfiles.length,
    browsing: model.linkHistory.length,
    apps: model.expiredApps.length
  };
  const shown: Record<ViewId, number> = {
    advertisers: advertisers.length,
    contacts: contacts.length,
    categories: categoryRows.length,
    suggested: suggested.length,
    browsing: browsing.length,
    apps: apps.length
  };
  const units: Record<ViewId, string> = {
    advertisers: "advertisers",
    contacts: "contacts",
    categories: "categories",
    suggested: "profiles",
    browsing: "pages",
    apps: "apps"
  };

  const tabs: FilterTab[] = createViews(t).map((item) => ({
    id: item.id,
    label: item.label,
    count: totals[item.id]
  }));

  const bucketTally = new Map<string, number>();
  for (const row of model.advertisers) {
    const key = bucketLabel(t, row.bucket);
    bucketTally.set(key, (bucketTally.get(key) ?? 0) + 1);
  }

  const browsingDays = toDaily(model.linkHistory.map((row) => row.at));
  const suggestedMonths = toMonthly(model.suggestedProfiles.map((row) => row.at));

  const exportAction =
    view === "contacts" ? (
      <ExportButton
        name="lens-contacts"
        columns={csvColumns(createContactColumns(t))}
        rows={contacts}
      />
    ) : view === "categories" ? (
      <ExportButton
        name="lens-categories"
        columns={csvColumns(createCategoryColumns(t))}
        rows={categoryRows}
      />
    ) : view === "suggested" ? (
      <ExportButton
        name="lens-suggested"
        columns={csvColumns(createSuggestedColumns(t))}
        rows={suggested}
      />
    ) : view === "browsing" ? (
      <ExportButton
        name="lens-browsing"
        columns={csvColumns(createBrowsingColumns(t))}
        rows={browsing}
      />
    ) : view === "apps" ? (
      <ExportButton name="lens-apps" columns={csvColumns(createAppColumns(t))} rows={apps} />
    ) : (
      <ExportButton
        name="lens-advertisers"
        columns={csvColumns(createAdvertiserColumns(t))}
        rows={advertisers}
      />
    );

  return (
    <SectionLayout
      head={<PageHead title={t("Tracking")} lede={createLede(t)[view]} />}
      stats={
        <>
          <Stat
            label={t("Advertisers holding you")}
            icon="advertiser"
            value={model.advertisers.length}
            hint={t("in {0} match groups", [t.count(bucketTally.size)])}
          />
          <Stat
            label={t("Contacts Meta holds")}
            icon="contact"
            value={model.contacts.length}
            hint={t("names and numbers of other people")}
            tone="signal"
          />
          <Stat
            label={t("Profiles it pushed at you")}
            icon="suggested"
            value={model.suggestedProfiles.length}
            hint={t("every suggestion Meta logged")}
          />
          <Stat
            label={t("Pages in its browser")}
            icon="link"
            value={model.linkHistory.length}
            hint={t("the last 30 days")}
          />
        </>
      }
      charts={
        <>
          <ChartFrame
            title={t("How each advertiser matched you")}
            caption={t("{0} advertisers, grouped as Meta groups them.", [
              t.count(model.advertisers.length)
            ])}
          >
            <RankBars data={toRanked(bucketTally, 3)} />
          </ChartFrame>
          <ChartFrame
            title={t("In-app browsing, per day")}
            caption={t("{0} pages across {1} days", [
              t.count(model.linkHistory.length),
              t.count(browsingDays.length)
            ])}
          >
            <MonthlyBars unit={t("Records")} data={browsingDays} tone="brand" />
          </ChartFrame>
          <ChartFrame
            title={t("Profiles suggested to you, per month")}
            caption={t("{0} suggestions Meta kept a record of", [
              t.count(model.suggestedProfiles.length)
            ])}
          >
            <MonthlyBars unit={t("Profiles")} data={suggestedMonths} />
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
            label={t("Tracking views")}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={t("Search a name or a site")}
            label={t("Search tracking rows")}
          />
        </Toolbar>
      }
      panel={
        view === "contacts" ? (
          <DataPanel
            columns={createContactColumns(t)}
            rows={contacts}
            rowKey={(row) => `${row.name}-${row.detail}`}
            emptyTitle={t("No contact matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
          />
        ) : view === "categories" ? (
          <DataPanel
            columns={createCategoryColumns(t)}
            rows={categoryRows}
            rowKey={(row) => row.name}
            emptyTitle={t("No category matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
          />
        ) : view === "suggested" ? (
          <DataPanel
            columns={createSuggestedColumns(t)}
            rows={suggested}
            rowKey={(row) => `${row.username}-${row.at}`}
            emptyTitle={t("No profile matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            initialSort={{ id: "at", direction: "desc" }}
          />
        ) : view === "browsing" ? (
          <DataPanel
            columns={createBrowsingColumns(t)}
            rows={browsing}
            rowKey={(row) => `${row.at}-${row.url}`}
            emptyTitle={t("No page matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            initialSort={{ id: "at", direction: "desc" }}
          />
        ) : view === "apps" ? (
          <DataPanel
            columns={createAppColumns(t)}
            rows={apps}
            rowKey={(row) => `${row.name}-${row.addedAt}`}
            emptyTitle={t("No app matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            initialSort={{ id: "lastActiveAt", direction: "desc" }}
          />
        ) : (
          <DataPanel
            columns={createAdvertiserColumns(t)}
            rows={advertisers}
            rowKey={(row) => `${row.bucket}-${row.name}`}
            emptyTitle={t("No advertiser matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
          />
        )
      }
      notice={
        <AbsentNotice title={t("Take your address book back")}>
          {t.rich(
            "Meta holds {0} names and numbers from your phone. Open Instagram. Go to Settings, then Account Centre, then Your information and permissions, then Upload contacts. Turn it off there, and delete what Meta already took.",
            [t.count(model.contacts.length)]
          )}
        </AbsentNotice>
      }
    />
  );
}
