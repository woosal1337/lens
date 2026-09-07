"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useEffect, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button, Row, Text, Wordmark } from "@/components/ui";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { useMode } from "@/components/layout/theme-provider";
import { color, font, motion, shape, space, type } from "@/styles/tokens.stylex";

const SCROLL_THRESHOLD = 8;
const GLASS = "lens-glass";

function withGlass(props: { className?: string }, on: boolean) {
  if (!on) return props;
  return { ...props, className: [props.className, GLASS].filter(Boolean).join(" ") };
}
const FRAME_FADE = 120;

function createLinks(t: Translator) {
  const LINKS = [
    { id: "shows", label: t("What it shows") },
    { id: "export", label: t("Get your export") },
    { id: "questions", label: t("Questions") }
  ] as const;
  return LINKS;
}

const REPOSITORY = "https://github.com/woosal1337/lens";

function createFooterGroups(t: Translator) {
  const FOOTER_GROUPS = [
    {
      heading: t("The product"),
      links: [
        { label: t("What it shows"), href: "#shows" },
        { label: t("Get your export"), href: "#export" },
        { label: t("Questions"), href: "#questions" },
        { label: t("See a demo"), href: "/preview/" }
      ]
    },
    {
      heading: t("Privacy"),
      links: [
        { label: t("How to verify it"), href: "#claim" },
        { label: t("No export uploads"), href: "#claim" },
        { label: t("No account"), href: "#claim" },
        { label: t("Self-hosted fonts"), href: "#claim" }
      ]
    },
    {
      heading: t("Your data"),
      links: [
        { label: t("Followers and following"), href: "#shows" },
        { label: t("Follow requests"), href: "#shows" },
        { label: t("Likes and stories"), href: "#shows" },
        { label: t("What Meta keeps"), href: "#shows" }
      ]
    },
    {
      heading: t("Open source"),
      links: [
        { label: t("Read the source"), href: REPOSITORY },
        { label: t("Run it locally"), href: `${REPOSITORY}#run-it` },
        { label: t("MIT licence"), href: `${REPOSITORY}/blob/main/LICENSE` },
        { label: t("Report an issue"), href: `${REPOSITORY}/issues` }
      ]
    }
  ] as const;
  return FOOTER_GROUPS;
}

const styles = stylex.create({
  page: { minHeight: "100vh", backgroundColor: color.ground, position: "relative" },
  frame: {
    position: "fixed",
    inset: space.s3,
    borderRadius: shape.radiusL,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.line,
    pointerEvents: "none",
    zIndex: 2,
    transitionProperty: "opacity",
    transitionDuration: motion.panel,
    transitionTimingFunction: motion.ease
  },
  nav: {
    position: "sticky",
    insetBlockStart: 0,
    zIndex: 3,
    minHeight: shape.navHeight,
    display: "flex",
    alignItems: "center",
    paddingBlockStart: space.s3,
    paddingBlockEnd: { default: 0, "@media (max-width: 720px)": space.s2 },
    paddingInline: { default: space.s6, "@media (max-width: 720px)": space.s4 },
    borderBlockEndWidth: shape.hairline,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: "transparent",
    transitionProperty: "background-color, border-color",
    transitionDuration: motion.panel,
    transitionTimingFunction: motion.ease
  },
  navSolid: {
    backgroundColor: color.surfaceGlass,
    borderBlockEndColor: color.line
  },
  navInner: {
    width: "100%",
    maxWidth: shape.contentMax,
    marginInline: "auto",
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr) auto minmax(0, 1fr)",
      "@media (max-width: 1080px)": "auto minmax(0, 1fr)"
    },
    alignItems: "center",
    gap: space.s4
  },
  navStart: { display: "flex", alignItems: "center", justifyContent: "flex-start", minWidth: 0 },
  navEnd: { display: "flex", alignItems: "center", justifyContent: "flex-end", minWidth: 0 },
  wordmark: { display: "inline-flex", textDecoration: "none" },
  links: { display: "flex", justifyContent: "center", gap: space.s5 },
  link: {
    fontFamily: font.sans,
    fontSize: type.labelSize,
    letterSpacing: type.labelTracking,
    color: { default: color.fgMuted, ":hover": color.fg },
    textDecoration: "none",
    transitionProperty: "color",
    transitionDuration: motion.hover,
    transitionTimingFunction: motion.ease
  },
  hideOnNarrow: { display: { default: "flex", "@media (max-width: 1080px)": "none" } },
  main: {
    width: "100%",
    maxWidth: shape.contentMax,
    marginInline: "auto",
    paddingInline: { default: space.s6, "@media (max-width: 720px)": space.s4 },
    paddingBlockEnd: space.s16,
    display: "flex",
    flexDirection: "column",
    gap: space.s16
  },
  footer: {
    borderBlockStartWidth: shape.hairline,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.line,
    backgroundColor: color.surfaceSunken
  },
  footerInner: {
    width: "100%",
    maxWidth: shape.contentMax,
    marginInline: "auto",
    paddingInline: { default: space.s6, "@media (max-width: 720px)": space.s4 },
    paddingBlock: space.s12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: space.s12
  },
  footerGrid: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(4, minmax(0, 1fr))",
      "@media (max-width: 720px)": "repeat(2, minmax(0, 1fr))"
    },
    justifyItems: "center",
    gap: space.s8
  },
  footerColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space.s3
  },
  footerLink: {
    fontFamily: font.sans,
    fontSize: type.labelSize,
    letterSpacing: type.labelTracking,
    color: { default: color.fgMuted, ":hover": color.fg },
    textDecoration: "none"
  },
  bigmark: {
    fontFamily: font.script,
    fontSize: "clamp(72px, 18vw, 220px)",
    fontWeight: 350,
    letterSpacing: type.displayTracking,
    lineHeight: type.markLine,
    color: color.line,
    userSelect: "none",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textAlign: "center"
  }
});

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const t = useTranslation();

  const [scrolled, setScrolled] = useState(0);
  const { mode, toggle } = useMode();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const stuck = scrolled > SCROLL_THRESHOLD;
  const frameOpacity = Math.max(0, 1 - scrolled / FRAME_FADE);

  return (
    <div {...stylex.props(styles.page)}>
      <div aria-hidden style={{ opacity: frameOpacity }} {...stylex.props(styles.frame)} />

      <nav {...withGlass(stylex.props(styles.nav, stuck && styles.navSolid), stuck)}>
        <div {...stylex.props(styles.navInner)}>
          <div {...stylex.props(styles.navStart)}>
            <a href="/" {...stylex.props(styles.wordmark)}>
              <Wordmark />
            </a>
          </div>
          <div {...stylex.props(styles.links, styles.hideOnNarrow)}>
            {createLinks(t).map((link) => (
              <a key={link.id} href={`#${link.id}`} {...stylex.props(styles.link)}>
                {link.label}
              </a>
            ))}
          </div>
          <div {...stylex.props(styles.navEnd)}>
            <Row gap={2}>
              <LanguageSwitch />
              <Button
                label={mode === "dark" ? t("Light") : t("Dark")}
                variant="quiet"
                size="small"
                onClick={toggle}
              />
              <Button label={t("See a demo")} variant="primary" size="small" href="/preview/" />
            </Row>
          </div>
        </div>
      </nav>

      <main {...stylex.props(styles.main)}>{children}</main>

      <footer {...stylex.props(styles.footer)}>
        <div {...stylex.props(styles.footerInner)}>
          <div {...stylex.props(styles.footerGrid)}>
            {createFooterGroups(t).map((group) => (
              <div key={group.heading} {...stylex.props(styles.footerColumn)}>
                <Text size="micro" tone="subtle" as="span">
                  {group.heading}
                </Text>
                {group.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    rel="noreferrer"
                    {...stylex.props(styles.footerLink)}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
          <div aria-hidden {...stylex.props(styles.bigmark)}>
            Lens
          </div>
          <Text size="label" tone="subtle">
            {t("Lens reads your Instagram export in your browser. Nothing uploads. MIT licensed.")}
          </Text>
        </div>
      </footer>
    </div>
  );
}
