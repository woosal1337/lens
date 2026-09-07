"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";
import * as stylex from "@stylexjs/stylex";
import { Heading, Stack, Surface, Text } from "@/components/ui";
import { color, font, motion, shape, space, type } from "@/styles/tokens.stylex";

function createAsked(t: Translator) {
  const ASKED = [
    {
      ask: t("How do I get my Instagram export?"),
      answer: t(
        "In Instagram settings, open Accounts Center, then Your information and permissions. Find the export or download option. Select your Instagram account, all available information, All time, and JSON. Export to your device and wait for Meta to send a download notice."
      )
    },
    {
      ask: t("Does Lens upload my data anywhere?"),
      answer: t(
        "No. Lens processes export files in your browser. The host receives page and asset requests, which can appear in access logs. Export contents are not sent. The production policy blocks connection APIs. For offline use, install Lens locally and serve the production build."
      )
    },
    {
      ask: t("Does Lens read my direct messages?"),
      answer: t(
        "Yes. The parser reads messages in a worker in your browser. The screen receives summaries and message results when a view needs them. Search results and conversation views can show message text. Lens does not store your export between visits."
      )
    },
    {
      ask: t("Which browsers work?"),
      answer: t(
        "Chrome and Edge open a folder directly, which is the smoothest route for a large export. Firefox and Safari have no File System Access API yet, so the button opens a file dialog instead. You can also drop the zip files as Meta sends them, in any browser."
      )
    },
    {
      ask: t("How large an export can Lens read?"),
      answer: t(
        "Available browser memory sets the limit. Zip imports stop after 512 MB of extracted files. For larger exports, extract the archives first and choose the folder. Folder imports keep media on disk and read it on demand. Large exports can still exceed memory on a phone."
      )
    },
    {
      ask: t("Does Lens handle Turkish, or any other language?"),
      answer: `${t("The interface is available in English and Turkish. Use the language control in the header.")} ${t(
        "Lens handles Unicode text and repairs the encoding errors found in Meta exports. It decodes names and captions during import. Usernames remain unchanged."
      )}`
    },
    {
      ask: t("Why does a view say 30 days when I have used Instagram for years?"),
      answer: t(
        "Meta keeps each file for its own window, from 30 days to 6 years. Stories you watched and your in-app browsing hold 30 days. Accounts you recently unfollowed hold 59 days. Lens states the window on every view that reads a short-window file, so you never read one month as a lifetime."
      )
    },
    {
      ask: t("Can Lens tell me who unfollowed me?"),
      answer: t(
        "Compare exports lists accounts that disappear from your follower list between two exports. Both exports need the same account, relationship files, and different completed export dates. A missing account can also mean a rename, deletion, or block."
      )
    },
    {
      ask: t("What does Lens cost?"),
      answer: t("Nothing. Lens is free and MIT licensed. Read the source, or run your own copy.")
    }
  ] as const;
  return ASKED;
}

const SIGN = "lens-sign";

function withSign(props: { className?: string }) {
  return { ...props, className: [props.className, SIGN].filter(Boolean).join(" ") };
}

const styles = stylex.create({
  root: { scrollMarginBlockStart: shape.navHeight },
  list: { display: "flex", flexDirection: "column" },
  item: {
    borderBlockEndWidth: shape.hairline,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.line
  },
  lastItem: { borderBlockEndWidth: 0 },
  summary: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s4,
    paddingBlock: space.s4,
    cursor: "pointer",
    listStyle: "none",
    fontFamily: font.sans,
    fontSize: type.title3Size,
    letterSpacing: type.title3Tracking,
    lineHeight: type.title3Line,
    color: { default: color.fgMuted, ":hover": color.fg },
    outline: { default: "none", ":focus-visible": `${shape.focusWidth} solid ${color.lineFocus}` },
    outlineOffset: shape.focusOffset,
    transitionProperty: "color",
    transitionDuration: motion.hover,
    transitionTimingFunction: motion.ease
  },
  sign: {
    fontFamily: font.mono,
    fontSize: type.figureSSize,
    color: color.fgSubtle,
    flexShrink: 0
  },
  answer: { paddingBlockEnd: space.s5, maxWidth: shape.readingMax }
});

export function Questions() {
  const t = useTranslation();

  return (
    <section id="questions" {...stylex.props(styles.root)}>
      <Stack gap={6}>
        <Stack gap={2}>
          <Heading level="title1" as="h2">
            {t("Questions")}
          </Heading>
          <Text measure>
            {t("What people ask before they hand a folder to a tool they have never run.")}
          </Text>
        </Stack>
        <Surface pad="loose">
          <div {...stylex.props(styles.list)}>
            {createAsked(t).map((item, index) => (
              <details
                key={item.ask}
                {...stylex.props(
                  styles.item,
                  index === createAsked(t).length - 1 && styles.lastItem
                )}
              >
                <summary {...stylex.props(styles.summary)}>
                  {item.ask}
                  <span aria-hidden {...withSign(stylex.props(styles.sign))} />
                </summary>
                <div {...stylex.props(styles.answer)}>
                  <Text size="label" tone="subtle">
                    {item.answer}
                  </Text>
                </div>
              </details>
            ))}
          </div>
        </Surface>
      </Stack>
    </section>
  );
}
