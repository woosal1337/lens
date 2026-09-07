import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExportClient } from "@/lib/parser/client";
import { type WorkerReply } from "@/lib/parser/protocol";

class TestWorker {
  static instances: TestWorker[] = [];
  onmessage: ((event: MessageEvent<WorkerReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor() {
    TestWorker.instances.push(this);
  }
}

beforeEach(() => {
  TestWorker.instances = [];
  vi.stubGlobal("Worker", TestWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("export worker lifetime", () => {
  it("terminates the worker and rejects pending reads when an export closes", async () => {
    const client = new ExportClient();
    const rejected = expect(client.ask({ kind: "people" })).rejects.toThrow(/export was closed/);
    client.dispose();
    await rejected;
    expect(TestWorker.instances[0]?.terminate).toHaveBeenCalledOnce();
  });

  it("replaces a worker after an unreadable reply", async () => {
    const client = new ExportClient();
    const rejected = expect(client.ask({ kind: "people" })).rejects.toThrow(/cannot read/);
    TestWorker.instances[0]?.onmessageerror?.();
    await rejected;
    expect(TestWorker.instances[0]?.terminate).toHaveBeenCalledOnce();
    const next = client.ask({ kind: "people" });
    expect(TestWorker.instances).toHaveLength(2);
    const closed = expect(next).rejects.toThrow(/export was closed/);
    client.dispose();
    await closed;
  });

  it("clears the worker if a request cannot be copied", async () => {
    const client = new ExportClient();
    const first = expect(client.ask({ kind: "people" })).rejects.toThrow(/could not send/);
    TestWorker.instances[0]?.postMessage.mockImplementation(() => {
      throw new Error("DataCloneError");
    });
    const second = expect(client.ask({ kind: "people" })).rejects.toThrow(/could not send/);
    await Promise.all([first, second]);
    expect(TestWorker.instances[0]?.terminate).toHaveBeenCalledOnce();
  });
});
