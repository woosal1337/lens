"use client";

import { useTranslation } from "@/lib/i18n/provider";

import { useEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Claim } from "@/components/landing/claim";
import { ExportSteps } from "@/components/landing/export-steps";
import { Hero } from "@/components/landing/hero";
import { Questions } from "@/components/landing/questions";
import { DropZone } from "@/components/landing/drop-zone";
import { Shows } from "@/components/landing/shows";
import { Splash } from "@/components/landing/splash";
import { SiteFrame } from "@/components/layout/site-frame";
import { detectBrowser, type BrowserProfile } from "@/lib/parser/capability";
import { ExportFormatError, exportClient } from "@/lib/parser/client";
import type { ExportModel, ParseProgress } from "@/lib/parser/model";
import {
  filesFromDirectory,
  filesFromList,
  filesFromZips,
  isZip,
  isMedia,
  type PickedFile
} from "@/lib/parser/source";

const MINIMUM_SPLASH = 900;

const styles = stylex.create({
  hidden: { display: "none" }
});

export function Landing({
  onLoaded
}: {
  onLoaded: (model: ExportModel, media: PickedFile[]) => void;
}) {
  const t = useTranslation();

  const inputRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const running = useRef(false);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [browser, setBrowser] = useState<BrowserProfile>({
    name: t("your browser"),
    picker: "input"
  });

  useEffect(() => {
    setBrowser(detectBrowser());
  }, []);

  async function run(build: () => Promise<{ path: string; file: File }[]>) {
    if (running.current) return;
    running.current = true;
    setError(null);
    setProgress({ percent: 2, message: t("Reading your folder"), files: 0, records: 0 });
    const opened = performance.now();
    try {
      const files = await build();
      const reply = await exportClient().ask({ kind: "parse", files }, setProgress);
      if (reply.kind !== "parse") throw new Error(t("The worker gave an unexpected answer."));
      const held = performance.now() - opened;
      if (held < MINIMUM_SPLASH) {
        await new Promise((resolve) => setTimeout(resolve, MINIMUM_SPLASH - held));
      }
      onLoaded(
        reply.model,
        files.filter((entry) => isMedia(entry.path))
      );
    } catch (cause) {
      exportClient().dispose();
      setError(
        cause instanceof ExportFormatError
          ? cause.message
          : t(
              "Lens could not read the files, or the zip exceeds 512 MB when extracted. Extract it and choose the folder."
            )
      );
    } finally {
      running.current = false;
    }
  }

  function fromList(list: FileList): () => Promise<{ path: string; file: File }[]> {
    const zips = Array.from(list).filter(isZip);
    if (zips.length > 0) return () => filesFromZips(zips);
    return () => Promise.resolve(filesFromList(list));
  }

  async function choose() {
    if (browser.picker === "phone") {
      zipRef.current?.click();
      return;
    }
    if (browser.picker === "input") {
      inputRef.current?.click();
      return;
    }
    let handle: FileSystemDirectoryHandle;
    try {
      handle = await window.showDirectoryPicker({ mode: "read" });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(t("This browser blocked the folder picker. Reload the page and try again."));
      return;
    }
    await run(() => filesFromDirectory(handle));
  }

  const note =
    browser.picker === "directory"
      ? t("{0} opens a folder picker. Choose the folder you unzipped.", [t.known(browser.name)])
      : browser.picker === "phone"
        ? t("On a phone, pick the zip files Meta sent you. Lens reads them as they are.")
        : t(
            "{0} has no folder picker, so the button opens a file dialog. Select the folder there.",
            [t.known(browser.name)]
          );

  return (
    <SiteFrame>
      <Hero
        drop={
          <DropZone
            onDropped={(build) => {
              void run(build);
            }}
            onRefuse={setError}
            fromZips={(zips) => () => filesFromZips(zips)}
            fromDirectory={(handle) => () => filesFromDirectory(handle)}
          />
        }
        onChoose={() => {
          void choose();
        }}
        browserNote={note}
      />
      <Claim />
      <Shows />
      <ExportSteps
        onChoose={() => {
          void choose();
        }}
        onChooseZips={() => {
          zipRef.current?.click();
        }}
      />
      <Questions />

      <input
        ref={inputRef}
        type="file"
        multiple
        aria-label={t("Choose your Instagram export folder")}
        {...{ webkitdirectory: "", directory: "" }}
        onChange={(event) => {
          const list = event.target.files;
          if (list !== null && list.length > 0) void run(fromList(list));
          event.target.value = "";
        }}
        {...stylex.props(styles.hidden)}
      />

      <input
        ref={zipRef}
        type="file"
        multiple
        accept=".zip"
        aria-label={t("Choose the zip files Meta sent you")}
        onChange={(event) => {
          const list = event.target.files;
          if (list !== null && list.length > 0) void run(fromList(list));
          event.target.value = "";
        }}
        {...stylex.props(styles.hidden)}
      />

      {progress === null && error === null ? null : (
        <Splash
          progress={progress}
          error={error}
          onRetry={() => {
            setError(null);
            setProgress(null);
          }}
        />
      )}
    </SiteFrame>
  );
}
