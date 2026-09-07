"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useMemo, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { ChartFrame } from "@/components/chart/chart-frame";
import { MonthlyBars, toMonthly } from "@/components/chart/monthly-bars";
import { RankBars, toRanked } from "@/components/chart/rank-bars";
import { PlaceMap } from "@/components/chart/place-map";
import { toPlaces } from "@/lib/analysis/places";
import {
  AbsentNotice,
  AccountCell,
  Chip,
  csvColumns,
  MediaThumb,
  MediaViewer,
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
import type {
  ExportModel,
  OwnMedia,
  OwnMediaKind,
  SavedPost,
  SavedTrack
} from "@/lib/parser/model";
import { profileUrl } from "@/lib/format";
import { foldForSearch } from "@/lib/parser/text";
import { color, shape, space } from "@/styles/tokens.stylex";

const GRID_CAP = 600;
const EAGER_ROWS = 32;

function createViews(t: Translator) {
  const VIEWS = [
    { id: "grid", label: t("The grid") },
    { id: "stories", label: t("Your stories") },
    { id: "posts", label: t("Your posts") },
    { id: "archived", label: t("Archived") },
    { id: "located", label: t("With a location") },
    { id: "saved", label: t("You saved") },
    { id: "music", label: t("Saved music") }
  ] as const;
  return VIEWS;
}

type ViewId = ReturnType<typeof createViews>[number]["id"];

function createLede(t: Translator) {
  const LEDE: Record<ViewId, string> = {
    grid: t(
      "Every photo and video you posted, newest first. Each one loads from your folder when it scrolls into view."
    ),
    stories: t(
      "Every story you posted, newest first. Meta keeps the file long after the story left your profile."
    ),
    posts: t("Every post you published, with the device that took it and the caption you wrote."),
    archived: t("Posts you archived. They left your profile, and Meta still holds every one."),
    located: t(
      "These posts carry a latitude and a longitude inside the file. Anyone who reads the export reads the place."
    ),
    saved: t("Every post you saved, with the account that made it."),
    music: t("Every track you saved from a reel or a story.")
  };
  return LEDE;
}

function createKindLabel(t: Translator) {
  const KIND_LABEL: Record<OwnMediaKind, string> = {
    story: t("Story"),
    post: t("Post"),
    archived: t("Archived"),
    other: t("Reel"),
    repost: t("Repost")
  };
  return KIND_LABEL;
}

function search<Row>(
  rows: readonly Row[],
  needle: string,
  haystack: (row: Row) => string
): readonly Row[] {
  if (needle.length === 0) return rows;
  return rows.filter((row) => foldForSearch(haystack(row)).includes(needle));
}

function trim(caption: string): string {
  const line = caption.split("\n")[0] ?? caption;
  return line.length > 96 ? `${line.slice(0, 95)}…` : line;
}

function createMediaColumns(t: Translator) {
  const MEDIA_COLUMNS: Column<OwnMedia>[] = [
    {
      id: "kind",
      header: t("Kind"),
      hint: t("where it lived"),
      width: "minmax(110px, 0.4fr)",
      sortValue: (row) => row.kind,
      render: (row) => <Chip>{createKindLabel(t)[row.kind]}</Chip>
    },
    {
      id: "caption",
      header: t("Caption"),
      hint: t("the first line"),
      width: "minmax(300px, 2.2fr)",
      text: (row) => row.caption,
      render: (row) => (
        <Text size="label" tone={row.caption.length === 0 ? "subtle" : "muted"} as="span">
          {row.caption.length === 0 ? t("no caption") : trim(row.caption)}
        </Text>
      )
    },
    {
      id: "device",
      header: t("Device"),
      hint: t("read from the file"),
      width: "minmax(150px, 0.8fr)",
      sortValue: (row) => row.device,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {row.device.length === 0 ? "—" : row.device}
        </Text>
      )
    },
    {
      id: "files",
      header: t("Files"),
      hint: t("in this post"),
      align: "end",
      width: "minmax(90px, 0.3fr)",
      sortValue: (row) => row.files,
      render: (row) => (
        <Text size="label" tone={row.files > 1 ? "primary" : "subtle"} as="span">
          {t.count(row.files)}
        </Text>
      )
    },
    {
      id: "at",
      header: t("Posted"),
      hint: t("the creation time"),
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
  return MEDIA_COLUMNS;
}

function createLocatedColumns(t: Translator) {
  const LOCATED_COLUMNS: Column<OwnMedia>[] = [
    {
      id: "kind",
      header: t("Kind"),
      hint: t("where it lived"),
      width: "minmax(110px, 0.4fr)",
      sortValue: (row) => row.kind,
      render: (row) => <Chip tone="signal">{createKindLabel(t)[row.kind]}</Chip>
    },
    {
      id: "caption",
      header: t("Caption"),
      hint: t("the first line"),
      width: "minmax(260px, 1.8fr)",
      text: (row) => row.caption,
      render: (row) => (
        <Text size="label" tone={row.caption.length === 0 ? "subtle" : "muted"} as="span">
          {row.caption.length === 0 ? t("no caption") : trim(row.caption)}
        </Text>
      )
    },
    {
      id: "latitude",
      header: t("Latitude"),
      hint: t("from the photo file"),
      align: "end",
      width: "minmax(140px, 0.6fr)",
      sortValue: (row) => Number(row.latitude),
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.latitude}
        </Text>
      )
    },
    {
      id: "longitude",
      header: t("Longitude"),
      hint: t("from the photo file"),
      align: "end",
      width: "minmax(140px, 0.6fr)",
      sortValue: (row) => Number(row.longitude),
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.longitude}
        </Text>
      )
    },
    {
      id: "at",
      header: t("Posted"),
      hint: t("the creation time"),
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
  return LOCATED_COLUMNS;
}

function createSavedColumns(t: Translator) {
  const SAVED_COLUMNS: Column<SavedPost>[] = [
    {
      id: "owner",
      header: t("Account"),
      hint: t("who made the post"),
      width: "minmax(220px, 1.4fr)",
      sortValue: (row) => row.owner,
      render: (row) =>
        row.owner.length === 0 ? (
          <Chip>{t("Deleted")}</Chip>
        ) : (
          <AccountCell handle={row.owner} href={profileUrl(row.owner)} />
        )
    },
    {
      id: "caption",
      header: t("Caption"),
      hint: t("the first line"),
      width: "minmax(320px, 2.4fr)",
      text: (row) => row.caption,
      render: (row) => (
        <Text size="label" tone={row.caption.length === 0 ? "subtle" : "muted"} as="span">
          {row.caption.length === 0 ? t("no caption") : trim(row.caption)}
        </Text>
      )
    },
    {
      id: "at",
      header: t("Saved"),
      hint: t("the date you tapped"),
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
  return SAVED_COLUMNS;
}

function createMusicColumns(t: Translator) {
  const MUSIC_COLUMNS: Column<SavedTrack>[] = [
    {
      id: "title",
      header: t("Track"),
      hint: t("as the artist named it"),
      width: "minmax(260px, 1.6fr)",
      sortValue: (row) => row.title,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.title.length === 0 ? t("no title") : row.title}
        </Text>
      )
    },
    {
      id: "artist",
      header: t("Artist"),
      hint: t("who made it"),
      width: "minmax(220px, 1.2fr)",
      sortValue: (row) => row.artist,
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {row.artist.length === 0 ? "—" : row.artist}
        </Text>
      )
    },
    {
      id: "at",
      header: t("Saved"),
      hint: t("the date you tapped"),
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
  return MUSIC_COLUMNS;
}

const gridStyles = stylex.create({
  frame: {
    height: "100%",
    padding: space.s4,
    borderRadius: shape.radiusL,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.line,
    backgroundColor: color.surfaceRaised,
    overflowY: "auto"
  },
  note: { paddingBlockStart: space.s4, textAlign: "center" },
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(8, minmax(0, 1fr))",
      "@media (max-width: 1080px)": "repeat(5, minmax(0, 1fr))",
      "@media (max-width: 720px)": "repeat(3, minmax(0, 1fr))"
    },
    gap: space.s2
  }
});

function MediaGrid({ rows }: { rows: readonly OwnMedia[] }) {
  const t = useTranslation();

  const [open, setOpen] = useState<number | null>(null);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="content"
        title={t("No media reached this browser")}
        detail={t(
          "Open the folder itself, not only the JSON files, and Lens draws every photo here."
        )}
      />
    );
  }

  const shown = rows.slice(0, GRID_CAP);

  return (
    <div {...stylex.props(gridStyles.frame)}>
      <div {...stylex.props(gridStyles.grid)}>
        {shown.map((row, index) => (
          <MediaThumb
            key={row.uri}
            path={row.uri}
            eager={index < EAGER_ROWS}
            alt={
              row.caption.length > 0
                ? row.caption
                : t("{0} from {1}", [row.kind, t.isoDate(row.at)])
            }
            onOpen={() => {
              setOpen(index);
            }}
          />
        ))}
      </div>
      <div {...stylex.props(gridStyles.note)}>
        <Text size="micro" tone="subtle" as="span">
          {rows.length > GRID_CAP
            ? t(
                "The newest {0} of {1} files. Open one to read its date, its caption and its device.",
                [t.count(GRID_CAP), t.count(rows.length)]
              )
            : t("{0} files. Open one to read its date, its caption and its device.", [
                t.count(rows.length)
              ])}
        </Text>
      </div>
      {open === null ? null : (
        <MediaViewer
          rows={shown}
          index={open}
          onMove={setOpen}
          onClose={() => {
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}

function shownCounts(
  view: ViewId,
  totals: Record<ViewId, number>,
  sizes: { media: number; saved: number; music: number }
): Record<ViewId, number> {
  if (view === "grid") return totals;
  if (view === "saved") return { ...totals, saved: sizes.saved };
  if (view === "music") return { ...totals, music: sizes.music };
  return { ...totals, [view]: sizes.media };
}

export function ContentTab({ model }: { model: ExportModel }) {
  const t = useTranslation();

  const [view, setView] = useState<ViewId>("grid");
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const empty: Record<"stories" | "posts" | "archived" | "located", OwnMedia[]> = {
      stories: [],
      posts: [],
      archived: [],
      located: []
    };
    for (const row of model.ownMedia) {
      if (row.kind === "story") empty.stories.push(row);
      if (row.kind === "post") empty.posts.push(row);
      if (row.kind === "archived") empty.archived.push(row);
      if (row.latitude.length > 0) empty.located.push(row);
    }
    return empty;
  }, [model.ownMedia]);

  const { stories, posts, archived, located } = groups;

  const needle = foldForSearch(query.trim());

  const mediaRows = useMemo(() => {
    const source =
      view === "posts"
        ? posts
        : view === "archived"
          ? archived
          : view === "located"
            ? located
            : stories;
    return search(source, needle, (row) => `${row.caption} ${row.device}`);
  }, [view, needle, posts, archived, located, stories]);
  const savedRows = useMemo(
    () => search(model.saved, needle, (row) => `${row.owner} ${row.caption}`),
    [model.saved, needle]
  );
  const musicRows = useMemo(
    () => search(model.savedMusic, needle, (row) => `${row.title} ${row.artist}`),
    [model.savedMusic, needle]
  );

  const gridRows = useMemo(
    () => model.ownMedia.filter((row) => row.uri.length > 0),
    [model.ownMedia]
  );

  const places = useMemo(() => toPlaces(located), [located]);

  const totals: Record<ViewId, number> = {
    grid: gridRows.length,
    stories: stories.length,
    posts: posts.length,
    archived: archived.length,
    located: located.length,
    saved: model.saved.length,
    music: model.savedMusic.length
  };
  const shown = shownCounts(view, totals, {
    media: mediaRows.length,
    saved: savedRows.length,
    music: musicRows.length
  });
  const units: Record<ViewId, string> = {
    grid: "files",
    stories: "stories",
    posts: "posts",
    archived: "posts",
    located: "posts",
    saved: "posts",
    music: "tracks"
  };

  const tabs: FilterTab[] = createViews(t).map((item) => ({
    id: item.id,
    label: item.label,
    count: totals[item.id]
  }));

  const deviceTally = new Map<string, number>();
  for (const row of model.ownMedia) {
    if (row.device.length === 0) continue;
    deviceTally.set(row.device, (deviceTally.get(row.device) ?? 0) + 1);
  }

  const storyMonths = toMonthly(stories.map((row) => row.at));
  const postMonths = toMonthly([...posts, ...archived].map((row) => row.at));

  const exportAction =
    view === "saved" ? (
      <ExportButton
        name="lens-saved"
        columns={csvColumns(createSavedColumns(t))}
        rows={savedRows}
      />
    ) : view === "music" ? (
      <ExportButton
        name="lens-saved-music"
        columns={csvColumns(createMusicColumns(t))}
        rows={musicRows}
      />
    ) : (
      <ExportButton
        name={`lens-${view}`}
        columns={csvColumns(view === "located" ? createLocatedColumns(t) : createMediaColumns(t))}
        rows={mediaRows}
      />
    );

  return (
    <SectionLayout
      head={<PageHead title={t("Your content")} lede={createLede(t)[view]} />}
      stats={
        <>
          <Stat
            label={t("Stories you posted")}
            icon="stories"
            value={stories.length}
            hint={t("across {0} months", [t.count(storyMonths.length)])}
          />
          <Stat
            label={t("Posts you published")}
            icon="content"
            value={posts.length}
            hint={t("plus {0} you archived", [t.count(archived.length)])}
          />
          <Stat
            label={t("Posts you saved")}
            icon="saved"
            value={model.saved.length}
            hint={t("in {0} collections", [t.count(model.savedCollections.length)])}
          />
          <Stat
            label={t("Posts that carry a place")}
            icon="address"
            value={located.length}
            hint={t("a latitude and a longitude")}
            tone="signal"
          />
        </>
      }
      charts={
        <>
          <ChartFrame
            title={t("Stories you posted, per month")}
            caption={t("{0} stories across {1} months", [
              t.count(stories.length),
              t.count(storyMonths.length)
            ])}
          >
            <MonthlyBars unit={t("Stories")} data={storyMonths} />
          </ChartFrame>
          <ChartFrame
            title={t("Posts you published, per month")}
            caption={t("{0} posts, archived ones included", [
              t.count(posts.length + archived.length)
            ])}
          >
            <MonthlyBars unit={t("Posts")} data={postMonths} tone="brand" />
          </ChartFrame>
          {view === "located" && places.length > 0 ? (
            <ChartFrame
              title={t("Where you posted from")}
              caption={t(
                "{0} posts carry a coordinate. Lens draws no base map, because it makes no network call.",
                [t.count(places.length)]
              )}
            >
              <PlaceMap points={places} />
            </ChartFrame>
          ) : (
            <ChartFrame
              title={t("Which device took them")}
              caption={t("{0} devices named inside your own files.", [t.count(deviceTally.size)])}
            >
              <RankBars data={toRanked(deviceTally, 6)} />
            </ChartFrame>
          )}
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
            label={t("Content views")}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={t("Search a caption or an account")}
            label={t("Search your content")}
          />
        </Toolbar>
      }
      panel={
        view === "grid" ? (
          <MediaGrid rows={gridRows} />
        ) : view === "saved" ? (
          <DataPanel
            columns={createSavedColumns(t)}
            rows={savedRows}
            rowKey={(row) => `${row.at}-${row.url}`}
            emptyTitle={t("No saved post matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            initialSort={{ id: "at", direction: "desc" }}
          />
        ) : view === "music" ? (
          <DataPanel
            columns={createMusicColumns(t)}
            rows={musicRows}
            rowKey={(row) => `${row.at}-${row.title}`}
            emptyTitle={t("No track matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            initialSort={{ id: "at", direction: "desc" }}
          />
        ) : (
          <DataPanel
            columns={view === "located" ? createLocatedColumns(t) : createMediaColumns(t)}
            rows={mediaRows}
            rowKey={(row) => `${row.kind}-${row.at}-${row.uri}`}
            emptyTitle={t("No post matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            initialSort={{ id: "at", direction: "desc" }}
            isFlagged={(row) => row.latitude.length > 0}
          />
        )
      }
      notice={
        <AbsentNotice title={t("Your own files name the place and the phone")}>
          {t.rich(
            "{0} of your posts carry a latitude and a longitude inside the image file, and {1} name the phone that took them. Instagram never shows you this. Anyone who opens your export reads it.",
            [t.count(located.length), t.count(deviceTally.size)]
          )}
        </AbsentNotice>
      }
    />
  );
}
