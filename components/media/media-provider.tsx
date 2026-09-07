"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { isMedia, normalizePath, type PickedFile } from "@/lib/parser/source";

export type MediaStore = {
  count: number;
  has: (path: string) => boolean;
  url: (path: string) => string | null;
};

const EMPTY: MediaStore = { count: 0, has: () => false, url: () => null };

const MediaContext = createContext<MediaStore>(EMPTY);

export function useMedia(): MediaStore {
  return useContext(MediaContext);
}

export function MediaProvider({
  files,
  children
}: {
  files: readonly PickedFile[];
  children: React.ReactNode;
}) {
  const store = useMemo(() => {
    const urls = new Map<string, string>();

    const kept = new Map<string, File>();
    for (const entry of files) {
      if (isMedia(entry.path)) kept.set(normalizePath(entry.path), entry.file);
    }

    return {
      dispose: () => {
        for (const url of urls.values()) URL.revokeObjectURL(url);
        urls.clear();
      },
      count: kept.size,
      has: (path: string) => kept.has(normalizePath(path)),
      url: (path: string) => {
        const key = normalizePath(path);
        const held = urls.get(key);
        if (held !== undefined) return held;
        const file = kept.get(key);
        if (file === undefined) return null;
        const made = URL.createObjectURL(file);
        urls.set(key, made);
        return made;
      }
    };
  }, [files]);

  useEffect(
    () => () => {
      store.dispose();
    },
    [store]
  );

  return <MediaContext.Provider value={store}>{children}</MediaContext.Provider>;
}
