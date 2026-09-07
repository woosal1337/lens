"use client";

import { useTranslation } from "@/lib/i18n/provider";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Icon, Stack, Text } from "@/components/ui";
import { isZip, type PickedFile } from "@/lib/parser/source";
import { color, motion, shape, space } from "@/styles/tokens.stylex";

type Build = () => Promise<PickedFile[]>;

const styles = stylex.create({
  root: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: space.s4,
    paddingBlock: space.s4,
    paddingInline: space.s5,
    borderRadius: shape.radiusL,
    borderWidth: shape.hairline,
    borderStyle: "dashed",
    borderColor: color.line,
    backgroundColor: "transparent",
    transitionProperty: "border-color, background-color",
    transitionDuration: motion.panel,
    transitionTimingFunction: motion.ease
  },
  over: { borderColor: color.action, backgroundColor: color.surfaceHover },
  text: { minWidth: 0, textAlign: "start" }
});

function zipsFrom(transfer: DataTransfer): File[] {
  return Array.from(transfer.files).filter(isZip);
}

async function directoryFrom(transfer: DataTransfer): Promise<FileSystemDirectoryHandle | null> {
  const item = transfer.items[0];
  const read = item?.getAsFileSystemHandle;
  if (read === undefined) return null;
  const handle = await read.call(item);
  if (handle?.kind !== "directory") return null;
  return handle;
}

export function DropZone({
  onDropped,
  onRefuse,
  fromZips,
  fromDirectory
}: {
  onDropped: (build: Build) => void;
  onRefuse: (message: string) => void;
  fromZips: (zips: readonly File[]) => Build;
  fromDirectory: (handle: FileSystemDirectoryHandle) => Build;
}) {
  const t = useTranslation();

  const [over, setOver] = useState(false);

  return (
    <div
      {...stylex.props(styles.root, over && styles.over)}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => {
        setOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const transfer = event.dataTransfer;
        const zips = zipsFrom(transfer);
        if (zips.length > 0) {
          onDropped(fromZips(zips));
          return;
        }
        void directoryFrom(transfer)
          .then((handle) => {
            if (handle === null) {
              onRefuse(t("Drop the zip files Meta sent, or use the button to choose the folder."));
              return;
            }
            onDropped(fromDirectory(handle));
          })
          .catch(() => {
            onRefuse(t("This browser could not open the drop. Use the folder or zip button."));
          });
      }}
    >
      <Icon name="folder" tone="subtle" />
      <div {...stylex.props(styles.text)}>
        <Stack gap={1}>
          <Text size="label" tone="primary" as="span">
            {t("Drop your export here")}
          </Text>
          <Text size="micro" tone="subtle" as="span">
            {t("The zip files Meta sent, or the folder you unzipped")}
          </Text>
        </Stack>
      </div>
    </div>
  );
}
