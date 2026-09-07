import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildGraph } from "@/lib/analysis/graph";
import { buildMessageProfile } from "@/lib/analysis/threads";
import { ExportSource } from "@/lib/parser/source";
import { parseExport } from "@/lib/parser/parse";
import type { FullExport } from "@/lib/parser/model";

const ROOT = process.env.LENS_EXPORT ?? "";
const ready = ROOT.length > 0 && fs.existsSync(ROOT);

function walk(dir: string, prefix: string, source: ExportSource) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix.length > 0 ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, rel, source);
    else source.add(rel, () => fs.promises.readFile(full, "utf8"));
  }
}

async function read(): Promise<FullExport> {
  const source = new ExportSource();
  walk(ROOT, "", source);
  return parseExport(source, () => undefined);
}

describe.skipIf(!ready)("a real export", () => {
  it("reports file coverage with nonnegative counts", async () => {
    const { model } = await read();
    expect(model.coverage.length).toBeGreaterThan(0);
    expect(model.coverage.every((row) => row.records >= 0)).toBe(true);
  });

  it("decodes a caption out of mojibake", async () => {
    const { model } = await read();
    const captions = model.likedPosts.map((row) => row.caption).join(" ");
    const mojibake =
      /\u00C3\u00BC|\u00C3\u00B6|\u00C3\u00A7|\u00C4\u00B0|\u00C5\u009E|\u00C4\u009F/;
    expect(mojibake.test(captions)).toBe(false);
  });

  it("holds a message count that matches the sum of its threads", async () => {
    const { model, threads } = await read();
    const profile = buildMessageProfile(threads, model.profile.name);
    const summed = model.threads.reduce((sum, row) => sum + row.messages, 0);
    expect(profile.sent + profile.received).toBe(summed);
  });

  it("splits the graph with no account in two buckets", async () => {
    const { model } = await read();
    const graph = buildGraph(model);
    const overlap = graph.noFollowBack.filter((name) => graph.fans.includes(name));
    expect(overlap).toEqual([]);
  });
});
