"use client";

import { useEffect, useMemo, useState } from "react";
import { Dashboard } from "@/components/dashboard/dashboard";
import { syntheticExport } from "@/lib/fixture/synthetic";
import { exportClient } from "@/lib/parser/client";
import type { PickedFile } from "@/lib/parser/source";

const TILE = 160;

async function drawSample(path: string, seed: number): Promise<PickedFile | null> {
  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE;
  const context = canvas.getContext("2d");
  if (context === null) return null;

  const hue = (seed * 37) % 360;
  const gradient = context.createLinearGradient(0, 0, TILE, TILE);
  gradient.addColorStop(0, `hsl(${hue} 62% 46%)`);
  gradient.addColorStop(1, `hsl(${(hue + 48) % 360} 58% 28%)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, TILE, TILE);
  context.fillStyle = "rgba(255,255,255,0.9)";
  context.font = "600 22px ui-sans-serif, system-ui";
  context.fillText(String(seed).padStart(2, "0"), 14, TILE - 16);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (blob === null) return null;
  return { path, file: new File([blob], path, { type: "image/png" }) };
}

export default function PreviewPage() {
  const sample = useMemo(() => syntheticExport(), []);
  const [media, setMedia] = useState<PickedFile[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;

    async function open() {
      await exportClient().ask({
        kind: "seed",
        model: sample.model,
        threads: sample.threads
      });
      if (live) setReady(true);
    }

    async function draw() {
      const withUri = sample.model.ownMedia.filter((row) => row.uri.length > 0).slice(0, 48);
      const drawn = await Promise.all(withUri.map((row, index) => drawSample(row.uri, index + 1)));
      if (live) setMedia(drawn.filter((entry): entry is PickedFile => entry !== null));
    }

    void open().catch(() => {
      if (live) setReady(true);
    });
    void draw().catch(() => undefined);
    return () => {
      live = false;
    };
  }, [sample]);

  if (!ready) return null;
  return <Dashboard model={sample.model} media={media} isDemo />;
}
