"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Row } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { useMedia } from "@/components/media/media-provider";

import type { OwnMedia } from "@/lib/parser/model";
import { color, font, shape, space, type } from "@/styles/tokens.stylex";

const VIDEO = /\.(mp4|mov|webm)$/i;

function createKindLabel(t: Translator) {
  const KIND_LABEL: Record<string, string> = {
    story: t("Story"),
    post: t("Post"),
    archived: t("Archived"),
    repost: t("Repost"),
    other: t("Other")
  };
  return KIND_LABEL;
}

const styles = stylex.create({
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 20,
    outline: "none",
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr) auto",
    gap: space.s4,
    padding: space.s6,
    backgroundColor: color.surfaceOverlay
  },
  bar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s4,
    width: "100%",
    maxWidth: shape.contentMax,
    marginInline: "auto"
  },
  stage: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
    width: "100%",
    maxWidth: shape.contentMax,
    marginInline: "auto"
  },
  media: {
    display: "block",
    maxWidth: "100%",
    maxHeight: "100%",
    width: "auto",
    height: "auto",
    objectFit: "contain",
    borderRadius: shape.radiusM,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.line,
    backgroundColor: color.surfaceSunken
  },
  foot: {
    width: "100%",
    maxWidth: shape.readingMax,
    marginInline: "auto",
    display: "flex",
    flexDirection: "column",
    gap: space.s2,
    textAlign: "center"
  },
  meta: {
    fontFamily: font.mono,
    fontSize: type.microSize,
    letterSpacing: type.microTracking,
    color: color.fgSubtle
  }
});

export function MediaViewer({
  rows,
  index,
  onMove,
  onClose
}: {
  rows: readonly OwnMedia[];
  index: number;
  onMove: (next: number) => void;
  onClose: () => void;
}) {
  const t = useTranslation();

  const media = useMedia();
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const row = rows[index];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const opener = document.activeElement;
    const held = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = held;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [mounted]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onMove(Math.min(rows.length - 1, index + 1));
      if (event.key === "ArrowLeft") onMove(Math.max(0, index - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [index, rows.length, onMove, onClose]);

  if (row === undefined || !mounted) return null;

  const url = media.url(row.uri);
  const place =
    row.latitude.length > 0
      ? `${Number(row.latitude).toFixed(4)}, ${Number(row.longitude).toFixed(4)}`
      : "";

  const panel = (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("Your media")}
      tabIndex={-1}
      {...stylex.props(styles.backdrop)}
    >
      <div {...stylex.props(styles.bar)}>
        <Row gap={3}>
          <Chip>{createKindLabel(t)[row.kind] ?? t("Media")}</Chip>
          <Text size="label" tone="subtle" as="span">
            {t.rich("{0} of {1}", [index + 1, rows.length])}
          </Text>
        </Row>
        <Row gap={2}>
          <Button
            label={t("Previous")}
            variant="quiet"
            size="small"
            onClick={() => {
              onMove(Math.max(0, index - 1));
            }}
          />
          <Button
            label={t("Next")}
            variant="quiet"
            size="small"
            onClick={() => {
              onMove(Math.min(rows.length - 1, index + 1));
            }}
          />
          <Button label={t("Close")} variant="secondary" size="small" onClick={onClose} />
        </Row>
      </div>

      <div {...stylex.props(styles.stage)}>
        {url === null ? (
          <Text tone="subtle">
            {t("Lens has no file for this row. Open the folder, not only the JSON.")}
          </Text>
        ) : VIDEO.test(row.uri) ? (
          <video src={url} controls playsInline {...stylex.props(styles.media)}>
            <track kind="captions" />
          </video>
        ) : (
          <img
            src={url}
            alt={
              row.caption.length > 0
                ? row.caption
                : t("{0} from {1}", [row.kind, t.isoDate(row.at)])
            }
            {...stylex.props(styles.media)}
          />
        )}
      </div>

      <div {...stylex.props(styles.foot)}>
        {row.caption.length === 0 ? null : <Text size="label">{row.caption}</Text>}
        <span {...stylex.props(styles.meta)}>
          {t.isoDate(row.at)}
          {row.device.length === 0 ? "" : ` · ${row.device}`}
          {row.lens.length === 0 ? "" : ` · ${row.lens}`}
          {place.length === 0 ? "" : ` · ${place}`}
        </span>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
