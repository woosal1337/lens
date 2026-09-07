"use client";

import { useEffect, useState } from "react";
import { exportClient } from "@/lib/parser/client";
import type { WorkerReply, WorkerRequest } from "@/lib/parser/protocol";

type Question = DistributiveOmit<WorkerRequest, "id">;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

type ReplyOf<Kind extends WorkerReply["kind"]> = Extract<WorkerReply, { kind: Kind }>;

export function useExportQuery<Kind extends WorkerReply["kind"]>(
  question: Question | null,
  key: string
): ReplyOf<Kind> | null {
  const [reply, setReply] = useState<ReplyOf<Kind> | null>(null);
  const serialized = JSON.stringify(question);

  useEffect(() => {
    const request = JSON.parse(serialized) as Question | null;
    setReply(null);
    if (request === null) {
      setReply(null);
      return;
    }
    let live = true;
    void exportClient()
      .ask(request)
      .then((answer) => {
        if (live) setReply(answer as ReplyOf<Kind>);
      })
      .catch(() => {
        if (live) setReply(null);
      });
    return () => {
      live = false;
    };
  }, [key, serialized]);

  return reply;
}
