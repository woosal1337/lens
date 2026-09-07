"use client";

import { useEffect, useId, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Icon, IconMark, type IconName } from "@/components/ui";
import { color, font, motion, shape, space, type } from "@/styles/tokens.stylex";

export type NavChild = { id: string; label: string; icon: IconName; detail: string };

const CLOSE_DELAY = 120;

const styles = stylex.create({
  root: { position: "relative", display: "inline-flex" },
  trigger: {
    display: "inline-flex",
    alignItems: "center",
    gap: space.s2,
    fontFamily: font.sans,
    fontSize: type.labelSize,
    letterSpacing: type.labelTracking,
    paddingBlock: space.s2,
    paddingInline: space.s3,
    borderRadius: shape.radiusPill,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: "transparent",
    cursor: "pointer",
    whiteSpace: "nowrap",
    color: { default: color.fgMuted, ":hover": color.fg },
    backgroundColor: { default: "transparent", ":hover": color.surfaceHover },
    transitionProperty: "background-color, color, border-color",
    transitionDuration: motion.hover,
    transitionTimingFunction: motion.ease,
    outline: { default: "none", ":focus-visible": `${shape.focusWidth} solid ${color.lineFocus}` },
    outlineOffset: shape.focusOffset
  },
  triggerActive: {
    color: color.fgOnAction,
    backgroundColor: { default: color.action, ":hover": color.action },
    borderColor: color.action
  },
  chevron: {
    display: "inline-flex",
    transitionProperty: "transform",
    transitionDuration: motion.swap,
    transitionTimingFunction: motion.ease
  },
  chevronOpen: { transform: "rotate(180deg)" },
  panel: {
    position: "absolute",
    insetBlockStart: "100%",
    insetInlineStart: 0,
    marginBlockStart: space.s2,
    zIndex: 4,
    width: shape.menuWidth,
    padding: space.s2,
    display: "flex",
    flexDirection: "column",
    gap: space.s1,
    borderRadius: shape.radiusL,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.line,
    backgroundColor: color.surfaceRaised,
    boxShadow: shape.shadowOverlay,
    transitionProperty: "opacity, transform",
    transitionDuration: {
      default: motion.panel,
      "@media (prefers-reduced-motion: reduce)": motion.press
    },
    transitionTimingFunction: motion.ease
  },
  item: {
    display: "flex",
    alignItems: "flex-start",
    gap: space.s3,
    textAlign: "start",
    width: "100%",
    padding: space.s2,
    borderWidth: 0,
    borderRadius: shape.radiusM,
    cursor: "pointer",
    backgroundColor: { default: "transparent", ":hover": color.surfaceHover },
    transitionProperty: "background-color",
    transitionDuration: motion.hover,
    transitionTimingFunction: motion.ease,
    outline: { default: "none", ":focus-visible": `${shape.focusWidth} solid ${color.lineFocus}` },
    outlineOffset: `-${shape.focusWidth}`
  },
  itemActive: { backgroundColor: { default: color.surfaceSunken, ":hover": color.surfaceHover } },
  stack: { display: "flex", flexDirection: "column", gap: space.s1, minWidth: 0 },
  label: {
    fontFamily: font.sans,
    fontSize: type.labelSize,
    letterSpacing: type.labelTracking,
    lineHeight: type.labelLine,
    color: color.fg
  },
  detail: {
    fontFamily: font.sans,
    fontSize: type.microSize,
    letterSpacing: "normal",
    lineHeight: type.microLine,
    color: color.fgSubtle
  }
});

export function NavMenu({
  label,
  icon,
  items,
  active,
  onSelect
}: {
  label: string;
  icon: IconName;
  items: readonly NavChild[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef<"first" | "last" | null>(null);
  const pointerType = useRef("");
  const holds = items.some((item) => item.id === active);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!open || focusOnOpen.current === null) return;
    const buttons = panel.current?.querySelectorAll<HTMLButtonElement>("button");
    const index = focusOnOpen.current === "last" ? (buttons?.length ?? 1) - 1 : 0;
    buttons?.[index]?.focus();
    focusOnOpen.current = null;
  }, [open]);

  function cancelClose() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }

  function scheduleClose() {
    cancelClose();
    timer.current = setTimeout(() => {
      setOpen(false);
    }, CLOSE_DELAY);
  }

  return (
    <div
      role="presentation"
      {...stylex.props(styles.root)}
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        cancelClose();
        setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") scheduleClose();
      }}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
          return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        cancelClose();
        if (!open) {
          focusOnOpen.current = event.key === "ArrowUp" || event.key === "End" ? "last" : "first";
          setOpen(true);
          return;
        }
        const buttons = Array.from(
          panel.current?.querySelectorAll<HTMLButtonElement>("button") ?? []
        );
        if (buttons.length === 0) return;
        const current = buttons.findIndex((button) => button === document.activeElement);
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : (current + (event.key === "ArrowUp" ? -1 : 1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={panelId}
        onPointerDown={(event) => {
          pointerType.current = event.pointerType;
        }}
        onClick={(event) => {
          cancelClose();
          if (event.detail === 0 && !open) focusOnOpen.current = "first";
          setOpen((current) => (event.detail > 0 && pointerType.current === "mouse") || !current);
        }}
        {...stylex.props(styles.trigger, holds && styles.triggerActive)}
      >
        <Icon name={icon} size="small" tone={holds ? "inherit" : "subtle"} />
        {label}
        <span {...stylex.props(styles.chevron, open && styles.chevronOpen)}>
          <Icon name="expand" size="small" tone={holds ? "inherit" : "subtle"} />
        </span>
      </button>

      {open ? (
        <div
          ref={panel}
          id={panelId}
          role="menu"
          aria-label={label}
          {...stylex.props(styles.panel)}
        >
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              tabIndex={-1}
              type="button"
              onClick={() => {
                onSelect(item.id);
                setOpen(false);
                trigger.current?.focus();
              }}
              {...stylex.props(styles.item, item.id === active && styles.itemActive)}
            >
              <IconMark name={item.icon} tone={item.id === active ? "signal" : "subtle"} />
              <span {...stylex.props(styles.stack)}>
                <span {...stylex.props(styles.label)}>{item.label}</span>
                <span {...stylex.props(styles.detail)}>{item.detail}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
