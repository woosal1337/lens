"use client";

import { useState } from "react";
import { Dashboard } from "@/components/dashboard/dashboard";
import { Landing } from "@/components/landing/landing";
import { exportClient } from "@/lib/parser/client";
import type { ExportModel } from "@/lib/parser/model";
import type { PickedFile } from "@/lib/parser/source";

type Opened = { model: ExportModel; media: PickedFile[] };

export default function Page() {
  const [opened, setOpened] = useState<Opened | null>(null);

  if (opened === null) {
    return (
      <Landing
        onLoaded={(model, media) => {
          setOpened({ model, media });
        }}
      />
    );
  }
  return (
    <Dashboard
      model={opened.model}
      media={opened.media}
      onClose={() => {
        exportClient().dispose();
        setOpened(null);
      }}
    />
  );
}
