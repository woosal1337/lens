"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button, EmptyState, Icon, Row, Text } from "@/components/ui";
import { useExportQuery } from "@/lib/parser/use-query";

import type { MessageKind, ThreadMessage } from "@/lib/parser/model";
import { color, font, shape, space, type } from "@/styles/tokens.stylex";

const FIRST_PAGE = 250;
const NEXT_PAGE = 1000;

function createKindLabel(t: Translator) {
  const KIND_LABEL: Record<MessageKind, string> = {
    text: "",
    share: t("Shared a post"),
    photo: t("Sent a photo"),
    video: t("Sent a video"),
    audio: t("Sent a voice message"),
    call: t("Call")
  };
  return KIND_LABEL;
}

const styles = stylex.create({
  root: { display: "flex", flexDirection: "column", height: "100%", minHeight: 0 },
  head: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s4,
    paddingBlockEnd: space.s3,
    borderBlockEndWidth: shape.hairline,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.line
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    minHeight: 0,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: space.s3,
    paddingBlock: space.s4,
    paddingInline: space.s2
  },
  line: { display: "flex", flexDirection: "column", maxWidth: "72%" },
  mine: { alignSelf: "flex-end", alignItems: "flex-end" },
  theirs: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: {
    paddingBlock: space.s2,
    paddingInline: space.s3,
    borderRadius: shape.radiusM,
    fontFamily: font.sans,
    fontSize: type.bodySize,
    lineHeight: type.bodyLine,
    letterSpacing: type.bodyTracking,
    overflowWrap: "anywhere"
  },
  bubbleMine: { backgroundColor: color.action, color: color.fgOnAction },
  bubbleTheirs: { backgroundColor: color.surfaceSunken, color: color.fg },
  meta: {
    fontFamily: font.mono,
    fontSize: type.microSize,
    letterSpacing: type.microTracking,
    color: color.fgSubtle,
    paddingBlockStart: space.s1
  },
  kind: {
    fontFamily: font.sans,
    fontSize: type.microSize,
    fontStyle: "italic",
    color: color.fgMuted,
    display: "block",
    paddingBlockEnd: space.s1
  },
  reactions: { fontSize: type.microSize, color: color.fgSubtle, paddingBlockStart: space.s1 },
  older: { display: "flex", justifyContent: "center", paddingBlockEnd: space.s2 }
});

function bodyOf(row: ThreadMessage): string {
  if (row.body.length > 0) return row.body;
  if (row.shareText.length > 0) return row.shareText;
  if (row.sharedProfile.length > 0) return `@${row.sharedProfile}`;
  if (row.link.length > 0) return row.link;
  return "";
}

export function Conversation({ threadId, onClose }: { threadId: string; onClose: () => void }) {
  const t = useTranslation();

  const [limit, setLimit] = useState(FIRST_PAGE);
  const reply = useExportQuery<"threadMessages">(
    { kind: "threadMessages", threadId, limit },
    `thread:${threadId}:${limit}`
  );
  const page = reply?.page ?? null;

  if (page === null) {
    return (
      <EmptyState
        title={t("Opening the conversation")}
        detail={t("Lens reads the messages in the worker, so nothing leaves this page.")}
        icon="messages"
      />
    );
  }

  const older = page.total - page.rows.length;

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.head)}>
        <Row gap={3}>
          <Icon name="messages" tone="subtle" />
          <Text size="body" as="span">
            {page.title}
          </Text>
          <Text size="label" tone="subtle" as="span">
            {t.rich("{0} messages, {1} people", [
              t.count(page.total),
              t.count(page.participants.length)
            ])}
          </Text>
        </Row>
        <Button label={t("Close")} variant="quiet" size="small" onClick={onClose} />
      </div>

      <div {...stylex.props(styles.scroll)}>
        {older > 0 ? (
          <div {...stylex.props(styles.older)}>
            <Button
              label={t("Show {0} older", [t.count(Math.min(NEXT_PAGE, older))])}
              variant="quiet"
              size="small"
              onClick={() => {
                setLimit(limit + NEXT_PAGE);
              }}
            />
          </div>
        ) : null}
        {page.rows.map((row, index) => {
          const mine = row.sender === page.you;
          const text = bodyOf(row);
          const label = createKindLabel(t)[row.kind];
          return (
            <div
              key={`${String(row.at)}:${String(index)}`}
              {...stylex.props(styles.line, mine ? styles.mine : styles.theirs)}
            >
              <span
                {...stylex.props(styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs)}
              >
                {label.length === 0 ? null : <span {...stylex.props(styles.kind)}>{label}</span>}
                {text}
              </span>
              {row.reactions.length === 0 ? null : (
                <span {...stylex.props(styles.reactions)}>
                  {row.reactions.map((entry) => entry.emoji).join(" ")}
                </span>
              )}
              <span {...stylex.props(styles.meta)}>
                {mine ? t("You") : row.sender} · {t.isoDate(row.at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
