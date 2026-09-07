"use client";

import type { ParseProgress } from "@/lib/parser/model";
import type { WorkerReply, WorkerRequest } from "@/lib/parser/protocol";

type Pending = {
  resolve: (reply: WorkerReply) => void;
  reject: (cause: Error) => void;
  onProgress?: ((progress: ParseProgress) => void) | undefined;
};

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export class ExportFormatError extends Error {}

export class ExportClient {
  private worker: Worker | null = null;
  private readonly pending = new Map<number, Pending>();
  private next = 1;

  private open(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("./worker.ts", import.meta.url));
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const reply = event.data;
      const waiting = this.pending.get(reply.id);
      if (!waiting) return;
      if (reply.kind === "progress") {
        waiting.onProgress?.(reply.progress);
        return;
      }
      this.pending.delete(reply.id);
      if (reply.kind === "error") {
        waiting.reject(
          reply.format ? new ExportFormatError(reply.message) : new Error(reply.message)
        );
        return;
      }
      waiting.resolve(reply);
    };
    worker.onerror = (event: ErrorEvent) => {
      this.fail(event.message.length > 0 ? event.message : "The worker failed to start.");
    };
    worker.onmessageerror = () => {
      this.fail("The worker sent a reply the page cannot read.");
    };
    this.worker = worker;
    return worker;
  }

  private fail(message: string) {
    this.worker?.terminate();
    this.worker = null;
    for (const waiting of this.pending.values()) waiting.reject(new Error(message));
    this.pending.clear();
  }

  dispose() {
    this.fail("The export was closed. Open a folder to continue.");
  }

  ask(
    request: DistributiveOmit<WorkerRequest, "id">,
    onProgress?: (progress: ParseProgress) => void
  ): Promise<WorkerReply> {
    const id = this.next;
    this.next += 1;
    const worker = this.open();
    return new Promise<WorkerReply>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress });
      try {
        worker.postMessage({ ...request, id });
      } catch {
        this.fail("The browser could not send the files to the worker. Open a smaller export.");
      }
    });
  }
}

let shared: ExportClient | null = null;

export function exportClient(): ExportClient {
  shared ??= new ExportClient();
  return shared;
}
