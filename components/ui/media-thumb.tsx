"use client";

import { useEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Icon } from "@/components/ui/icon";
import { useMedia } from "@/components/media/media-provider";
import { color, motion, shape } from "@/styles/tokens.stylex";

const VIDEO = /\.(mp4|mov|webm)$/i;
const LOOK_AHEAD = 300;

const styles = stylex.create({
  frame: {
    position: "relative",
    display: "grid",
    placeItems: "center",
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius: shape.radiusM,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.line,
    backgroundColor: color.surfaceSunken,
    overflow: "hidden"
  },
  button: {
    padding: 0,
    cursor: "pointer",
    outline: { default: "none", ":focus-visible": `${shape.focusWidth} solid ${color.lineFocus}` },
    outlineOffset: shape.focusOffset
  },
  media: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    opacity: { default: 1, ":hover": 0.86 },
    transitionProperty: "opacity",
    transitionDuration: motion.hover,
    transitionTimingFunction: motion.ease
  }
});

export function MediaThumb({
  path,
  alt,
  eager = false,
  onOpen
}: {
  path: string;
  alt: string;
  eager?: boolean;
  onOpen?: () => void;
}) {
  const media = useMedia();
  const frameRef = useRef<HTMLElement | null>(null);
  const setFrame = (node: HTMLElement | null) => {
    frameRef.current = node;
  };
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null) return;
    if (eager || typeof IntersectionObserver === "undefined") {
      setUrl(media.url(path));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setUrl(media.url(path));
        observer.disconnect();
      },
      { rootMargin: `${LOOK_AHEAD}px` }
    );
    observer.observe(frame);
    return () => {
      observer.disconnect();
    };
  }, [path, media, eager]);

  const body =
    url === null ? (
      <Icon name="content" tone="subtle" />
    ) : VIDEO.test(path) ? (
      <video src={url} muted playsInline preload="metadata" {...stylex.props(styles.media)} />
    ) : (
      <img src={url} alt={alt} {...stylex.props(styles.media)} />
    );

  if (onOpen === undefined) {
    return (
      <span ref={setFrame} {...stylex.props(styles.frame)}>
        {body}
      </span>
    );
  }

  return (
    <button
      ref={setFrame}
      type="button"
      aria-label={alt}
      onClick={onOpen}
      {...stylex.props(styles.frame, styles.button)}
    >
      {body}
    </button>
  );
}
