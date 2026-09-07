"use client";

import { useTranslation } from "@/lib/i18n/provider";

import * as stylex from "@stylexjs/stylex";
import { Button, Icon, Text, Wordmark, type IconName } from "@/components/ui";
import { NavMenu, type NavChild } from "@/components/layout/nav-menu";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { useMode } from "@/components/layout/theme-provider";
import { color, font, motion, shape, space, type } from "@/styles/tokens.stylex";

const GLASS = "lens-glass";

function withGlass(props: { className?: string }) {
  return { ...props, className: [props.className, GLASS].filter(Boolean).join(" ") };
}

export type FrameItem = {
  id: string;
  label: string;
  icon: IconName;
  detail?: string;
  items?: NavChild[];
};

const styles = stylex.create({
  page: { minHeight: "100vh", backgroundColor: color.ground },
  nav: {
    position: "sticky",
    insetBlockStart: 0,
    zIndex: 3,
    minHeight: shape.navHeight,
    display: "flex",
    alignItems: "center",
    paddingBlockStart: space.s3,
    paddingBlockEnd: { default: 0, "@media (max-width: 1180px)": space.s2 },
    paddingInline: { default: space.s6, "@media (max-width: 720px)": space.s4 },
    backgroundColor: color.surfaceGlass,
    borderBlockEndWidth: shape.hairline,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.line
  },
  navInner: {
    width: "100%",
    marginInline: "auto",
    display: "grid",
    gridTemplateColumns: {
      default: "1fr auto 1fr",
      "@media (max-width: 1180px)": "minmax(0, 1fr) minmax(0, 2fr)"
    },
    gridAutoFlow: { default: "row", "@media (max-width: 1180px)": "dense" },
    alignItems: "center",
    gap: { default: space.s4, "@media (max-width: 1180px)": space.s2 }
  },
  tabsRow: { gridColumn: { default: "auto", "@media (max-width: 1180px)": "1 / -1" } },
  navStart: { display: "flex", alignItems: "center", justifyContent: "flex-start", minWidth: 0 },
  brand: { display: "flex", alignItems: "baseline", gap: space.s3, minWidth: 0 },
  handle: {
    fontFamily: font.mono,
    fontSize: type.microSize,
    color: color.fgSubtle,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  tabs: {
    display: "flex",
    alignItems: "center",
    gap: space.s1,
    minWidth: 0,
    flexShrink: 0,
    overflowX: { default: "visible", "@media (max-width: 1180px)": "auto" },
    maxWidth: "100%",
    paddingBlock: { default: 0, "@media (max-width: 1180px)": space.s2 },
    scrollbarWidth: "none"
  },
  tab: {
    display: "inline-flex",
    alignItems: "center",
    gap: space.s2,
    fontFamily: font.sans,
    fontSize: type.labelSize,
    letterSpacing: type.labelTracking,
    paddingBlock: space.s2,
    paddingInline: space.s3,
    borderRadius: shape.radiusPill,
    borderWidth: 0,
    cursor: "pointer",
    whiteSpace: "nowrap",
    color: { default: color.fgMuted, ":hover": color.fg },
    backgroundColor: { default: "transparent", ":hover": color.surfaceHover },
    transitionProperty: "background-color, color",
    transitionDuration: motion.hover,
    transitionTimingFunction: motion.ease,
    outline: { default: "none", ":focus-visible": `${shape.focusWidth} solid ${color.lineFocus}` },
    outlineOffset: shape.focusOffset
  },
  tabActive: {
    color: color.fgOnAction,
    backgroundColor: { default: color.action, ":hover": color.action }
  },
  hideOnNarrow: { display: { default: "inline", "@media (max-width: 1180px)": "none" } },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: space.s2,
    flexWrap: "wrap",
    minWidth: 0
  },
  main: {
    width: "100%",
    maxWidth: shape.contentMax,
    marginInline: "auto",
    paddingInline: { default: space.s6, "@media (max-width: 720px)": space.s4 },
    paddingBlock: space.s8,
    paddingBlockEnd: space.s16
  }
});

export function AppFrame({
  items,
  active,
  onSelect,
  handle,
  detail,
  onClose,
  children
}: {
  items: readonly FrameItem[];
  active: string;
  onSelect: (id: string) => void;
  handle: string;
  detail: string;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslation();

  const { mode, toggle } = useMode();

  return (
    <div {...stylex.props(styles.page)}>
      <nav {...withGlass(stylex.props(styles.nav))}>
        <div {...stylex.props(styles.navInner)}>
          <div {...stylex.props(styles.navStart, styles.brand)}>
            <Wordmark />
            <span {...stylex.props(styles.handle)}>{handle}</span>
          </div>

          <div aria-label={t("Sections")} {...stylex.props(styles.tabs, styles.tabsRow)}>
            {items.map((item) =>
              item.items === undefined ? (
                <button
                  key={item.id}
                  type="button"
                  aria-current={item.id === active ? "page" : undefined}
                  onClick={() => {
                    onSelect(item.id);
                  }}
                  {...stylex.props(styles.tab, item.id === active && styles.tabActive)}
                >
                  <Icon
                    name={item.icon}
                    size="small"
                    tone={item.id === active ? "inherit" : "subtle"}
                  />
                  {item.label}
                </button>
              ) : (
                <NavMenu
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  items={item.items}
                  active={active}
                  onSelect={onSelect}
                />
              )
            )}
          </div>

          <div {...stylex.props(styles.actions)}>
            <LanguageSwitch />
            <span {...stylex.props(styles.hideOnNarrow)}>
              <Text size="micro" tone="subtle" as="span">
                {detail}
              </Text>
            </span>
            <Button
              label={mode === "dark" ? t("Light") : t("Dark")}
              variant="quiet"
              size="small"
              onClick={toggle}
            />
            {onClose === undefined ? null : (
              <Button
                label={t("Open another")}
                variant="secondary"
                size="small"
                onClick={onClose}
              />
            )}
          </div>
        </div>
      </nav>
      <main {...stylex.props(styles.main)}>{children}</main>
    </div>
  );
}
