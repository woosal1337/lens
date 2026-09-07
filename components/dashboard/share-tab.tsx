"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useEffect, useMemo, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  AbsentNotice,
  Button,
  Chip,
  DataPanel,
  FilterTabs,
  PageHead,
  SectionLayout,
  Stat,
  Text,
  Toolbar,
  type Column,
  type FilterTab
} from "@/components/ui";
import { cardSize, drawCard, saveCard, type CardShape, type CardStat } from "@/lib/export/card";
import { buildGrowth } from "@/lib/analysis/growth";
import { type MessageProfile } from "@/lib/analysis/threads";
import { useExportQuery } from "@/lib/parser/use-query";
import type { Graph } from "@/lib/analysis/graph";
import type { ExportModel } from "@/lib/parser/model";

import { color, font, shape as shapes, space } from "@/styles/tokens.stylex";

function createShapes(t: Translator) {
  const SHAPES = [
    { id: "square", label: t("Square, 1080 by 1080") },
    { id: "story", label: t("Story, 1080 by 1920") }
  ] as const;
  return SHAPES;
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

const YEAR = 365 * 86400;
const PICK_MAX = 4;

type Choice = CardStat & { id: string; safe: boolean };

const styles = stylex.create({
  stage: {
    height: "100%",
    display: "grid",
    gridTemplateColumns: { default: "1fr 1fr", "@media (max-width: 900px)": "1fr" },
    gap: space.s4,
    minWidth: 0
  },
  frame: {
    display: "grid",
    placeItems: "center",
    padding: space.s4,
    borderRadius: shapes.radiusL,
    borderWidth: shapes.hairline,
    borderStyle: "solid",
    borderColor: color.line,
    backgroundColor: color.surfaceSunken,
    overflow: "hidden"
  },
  canvas: { maxWidth: "100%", maxHeight: "100%", borderRadius: shapes.radiusM },
  probe: {
    position: "absolute",
    width: 0,
    height: 0,
    overflow: "hidden",
    color: color.fg,
    backgroundColor: color.ground,
    fontFamily: font.sans
  },
  probeMuted: { color: color.fgMuted },
  probeSubtle: { color: color.fgSubtle },
  probeLine: { color: color.lineStrong },
  probeSignal: { color: color.signal },
  probeMono: { fontFamily: font.mono }
});

function readColor(node: HTMLElement | null): string {
  return node === null ? "" : getComputedStyle(node).color;
}

export function ShareTab({ model, graph }: { model: ExportModel; graph: Graph }) {
  const t = useTranslation();

  const [shape, setShape] = useState<CardShape>("square");
  const [picked, setPicked] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const mutedRef = useRef<HTMLSpanElement>(null);
  const subtleRef = useRef<HTMLSpanElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const signalRef = useRef<HTMLSpanElement>(null);
  const monoRef = useRef<HTMLSpanElement>(null);

  const reply = useExportQuery<"messageProfile">({ kind: "messageProfile" }, "messageProfile");
  const talk = reply?.profile ?? EMPTY_PROFILE;
  const growth = useMemo(() => buildGrowth(model, Date.now() / 1000), [model]);

  const choices: Choice[] = useMemo(() => {
    const now = Date.now() / 1000;
    const total = talk.sent + talk.received;
    const owners = new Set(model.likedPosts.map((row) => row.owner)).size;
    const quiet = talk.threads.filter((row) => row.last > 0 && now - row.last > 3 * YEAR).length;
    const recent = talk.threads.filter((row) => now - row.last <= 30 * 86400).length;
    const first = growth.followBack[0];
    const last = growth.followBack[growth.followBack.length - 1];
    const busiest = talk.byHour.indexOf(Math.max(...talk.byHour));

    return [
      {
        id: "messages",
        label: t("Messages Meta kept"),
        value: t.count(total),
        hint: t("across {0} conversations", [t.count(talk.threads.length)]),
        safe: true
      },
      {
        id: "share",
        label: t("My share of every message"),
        value: t.percent(talk.sent, total),
        hint: t("{0} of them are mine", [t.count(talk.sent)]),
        safe: true
      },
      {
        id: "likes",
        label: t("Likes I gave"),
        value: t.count(model.likedPosts.length),
        hint: t("across {0} accounts", [t.count(owners)]),
        safe: true
      },
      {
        id: "followBack",
        label: t("Follow-back rate"),
        value: t("{0}% to {1}%", [
          Math.round((first?.rate ?? 0) * 100),
          Math.round((last?.rate ?? 0) * 100)
        ]),
        hint: t("from {0} to {1}", [first?.year ?? "", last?.year ?? ""]),
        safe: true
      },
      {
        id: "cold",
        label: t("Mutuals I never like"),
        value: t.count(graph.coldMutuals.length),
        hint: t("of {0} mutual follows", [t.count(graph.mutual.length)]),
        safe: true
      },
      {
        id: "quiet",
        label: t("Conversations silent 3 years"),
        value: t.count(quiet),
        hint: t("of {0} conversations", [t.count(talk.threads.length)]),
        safe: true
      },
      {
        id: "recent",
        label: t("People I wrote to this month"),
        value: t.count(recent),
        hint: t("in the last 30 days"),
        safe: true
      },
      {
        id: "advertisers",
        label: t("Advertisers holding my data"),
        value: t.count(model.advertisers.length),
        hint: t("and {0} guessed categories", [t.count(model.adCategories.length)]),
        safe: true
      },
      {
        id: "hour",
        label: t("My busiest hour"),
        value: `${String(busiest).padStart(2, "0")}:00`,
        hint: t("when I write the most"),
        safe: true
      },
      {
        id: "contacts",
        label: t("Contacts Meta holds"),
        value: t.count(model.contacts.length),
        hint: t("names and numbers of other people"),
        safe: false
      }
    ];
  }, [model, graph, talk, growth, t]);

  const stats = choices.filter((row) => picked.includes(row.id));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    drawCard(canvas, {
      shape,
      footer: t("Read on my own machine with Lens. Nothing uploaded."),
      stats: stats.length > 0 ? stats : choices.slice(0, 2),
      palette: {
        ground:
          groundRef.current === null ? "" : getComputedStyle(groundRef.current).backgroundColor,
        ink: readColor(groundRef.current),
        muted: readColor(mutedRef.current),
        subtle: readColor(subtleRef.current),
        line: readColor(lineRef.current),
        signal: readColor(signalRef.current)
      },
      sans:
        groundRef.current === null ? "sans-serif" : getComputedStyle(groundRef.current).fontFamily,
      mono: monoRef.current === null ? "monospace" : getComputedStyle(monoRef.current).fontFamily
    });
  }, [shape, stats, choices, t]);

  const columns: Column<Choice>[] = [
    {
      id: "label",
      header: t("Card"),
      hint: t("one line on the image"),
      width: "minmax(260px, 1.4fr)",
      sortValue: (row) => row.label,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.label}
        </Text>
      )
    },
    {
      id: "value",
      header: t("Value"),
      hint: t("read from your folder"),
      width: "minmax(180px, 0.8fr)",
      sortValue: (row) => row.value,
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {row.value}
        </Text>
      )
    },
    {
      id: "safe",
      header: t("Safe to post"),
      hint: t("does it name a person"),
      width: "minmax(160px, 0.6fr)",
      sortValue: (row) => (row.safe ? 1 : 0),
      render: (row) =>
        row.safe ? (
          <Chip tone="positive">{t("No names")}</Chip>
        ) : (
          <Chip tone="signal">{t("About others")}</Chip>
        )
    },
    {
      id: "picked",
      header: t("On the card"),
      hint: t("pick up to four"),
      align: "end",
      width: "minmax(150px, 0.6fr)",
      sortValue: (row) => (picked.includes(row.id) ? 1 : 0),
      render: (row) => (
        <Text size="label" tone={picked.includes(row.id) ? "positive" : "subtle"} as="span">
          {picked.includes(row.id) ? t("Picked") : t("Tap to add")}
        </Text>
      )
    }
  ];

  const size = cardSize(shape);
  const tabs: FilterTab[] = createShapes(t).map((item) => ({ id: item.id, label: item.label }));

  return (
    <SectionLayout
      head={
        <PageHead
          title={t("Share a card")}
          lede={t(
            "Pick up to four numbers. Lens draws the image in this browser, and you save it. No name reaches the card."
          )}
        />
      }
      stats={
        <>
          <Stat
            label={t("Numbers on the card")}
            icon="content"
            value={stats.length}
            hint={t("of {0}, tap a row to add one", [t.count(PICK_MAX)])}
          />
          <Stat
            label={t("Cards you can pick")}
            icon="saved"
            value={choices.length}
            hint={t("every one reads from your folder")}
          />
          <Stat
            label={t("Names on the image")}
            icon="absent"
            value={0}
            hint={t("Lens draws counts and dates only")}
            tone="positive"
          />
          <Stat
            label={t("Bytes uploaded")}
            icon="link"
            value={0}
            hint={t("the canvas never leaves the page")}
            tone="positive"
          />
        </>
      }
      charts={
        <>
          <div {...stylex.props(styles.frame)}>
            <Text size="label" tone="subtle">
              {t("Pick a shape and up to four numbers. The preview redraws as you tap.")}
            </Text>
          </div>
          <div {...stylex.props(styles.frame)}>
            <Text size="label" tone="subtle">
              {t.rich("The image saves as a {0} by {1} PNG file.", [size.width, size.height])}
            </Text>
          </div>
          <div {...stylex.props(styles.frame)}>
            <Text size="label" tone="subtle">
              {t("A card states a number and its window. It never states a feeling.")}
            </Text>
          </div>
        </>
      }
      toolbar={
        <Toolbar
          rows={stats.length}
          unit={t("Numbers")}
          action={
            <Button
              label={t("Save the card")}
              size="small"
              onClick={() => {
                if (canvasRef.current) saveCard(canvasRef.current, `lens-card-${shape}`);
              }}
            />
          }
        >
          <FilterTabs
            tabs={tabs}
            active={shape}
            onSelect={(id) => {
              setShape(id as CardShape);
            }}
            label={t("Card shapes")}
          />
        </Toolbar>
      }
      panel={
        <div {...stylex.props(styles.stage)}>
          <DataPanel
            columns={columns}
            rows={choices}
            rowKey={(row) => row.id}
            emptyTitle={t("No card to pick")}
            emptyDetail={t("Your export carries none of these numbers.")}
            isFlagged={(row) => !row.safe}
            onOpen={(row) => {
              setPicked((current) =>
                current.includes(row.id)
                  ? current.filter((id) => id !== row.id)
                  : [...current, row.id].slice(-PICK_MAX)
              );
            }}
          />
          <div {...stylex.props(styles.frame)}>
            <canvas ref={canvasRef} {...stylex.props(styles.canvas)} />
          </div>
        </div>
      }
      notice={
        <AbsentNotice title={t("No name reaches the image")}>
          {t.rich(
            "Every card draws a count, a percentage or a date. Lens never puts a username, a display name, an address or a coordinate on the canvas. One card counts other people, and it carries a warning stripe. {0}",
            [
              <span key="value-0" aria-hidden ref={groundRef} {...stylex.props(styles.probe)}>
                <span ref={mutedRef} {...stylex.props(styles.probeMuted)} />
                <span ref={subtleRef} {...stylex.props(styles.probeSubtle)} />
                <span ref={lineRef} {...stylex.props(styles.probeLine)} />
                <span ref={signalRef} {...stylex.props(styles.probeSignal)} />
                <span ref={monoRef} {...stylex.props(styles.probeMono)} />
              </span>
            ]
          )}
        </AbsentNotice>
      }
    />
  );
}
