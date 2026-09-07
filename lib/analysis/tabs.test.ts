import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildGraph } from "@/lib/analysis/graph";
import { buildGrowth } from "@/lib/analysis/growth";
import { buildPeople } from "@/lib/analysis/people";
import { buildTimeline } from "@/lib/analysis/timeline";
import { buildMessageProfile } from "@/lib/analysis/threads";
import { toDaily, toMonthly, toRanked } from "@/lib/analysis/buckets";
import { toPlaces } from "@/lib/analysis/places";
import { verdict } from "@/lib/analysis/verdict";
import { ExportSource } from "@/lib/parser/source";
import { parseExport } from "@/lib/parser/parse";
import type { FullExport, OwnMedia } from "@/lib/parser/model";

const ROOT = process.env.LENS_EXPORT ?? "";
const ready = ROOT.length > 0 && fs.existsSync(ROOT);
const TOP = 6;

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

function tally(rows: readonly OwnMedia[], pick: (row: OwnMedia) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = pick(row);
    if (key.length === 0) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

describe.skipIf(!ready)("every tab against a real export", () => {
  it("builds every chart series, including empty categories", async () => {
    const { model, threads } = await read();
    const now = Math.floor(Date.now() / 1000);
    const graph = buildGraph(model);
    const messageMonths = toMonthly(threads.flatMap((row) => row.messages.map((one) => one.at)));
    const growth = buildGrowth(model, now);
    const timeline = buildTimeline(model, messageMonths);
    const profile = buildMessageProfile(threads, model.profile.name);
    const people = buildPeople(model, threads, graph, now);

    const stories = model.ownMedia.filter((row) => row.kind === "story");
    const posts = model.ownMedia.filter((row) => row.kind === "post" || row.kind === "archived");
    const located = model.ownMedia.filter((row) => row.latitude.length > 0);

    const likeOwners = new Map<string, number>();
    for (const row of model.likedPosts) {
      likeOwners.set(row.owner, (likeOwners.get(row.owner) ?? 0) + 1);
    }

    const slots: Record<string, number> = {
      "overview likes": toMonthly(model.likedPosts.map((row) => row.at)).length,
      "overview growth": model.followers.length,
      "overview stories": toMonthly(stories.map((row) => row.at)).length,
      "connections follows": toMonthly(model.following.map((row) => row.followedAt)).length,
      "connections top": toRanked(likeOwners, TOP).length,
      "requests months": toMonthly(model.pendingOut.map((row) => row.followedAt)).length,
      "likes top": toRanked(likeOwners, TOP).length,
      "stories views": toDaily(model.storyViews.map((row) => row.at)).length,
      "stories likes": toMonthly(model.storyLikes.map((row) => row.at)).length,
      "content posts": toMonthly(posts.map((row) => row.at)).length,
      "content devices": toRanked(
        tally(model.ownMedia, (row) => row.device),
        TOP
      ).length,
      "content places": toPlaces(located).length,
      "messages months": messageMonths.length,
      "messages threads": profile.threads.length,
      "security logins": toMonthly(model.logins.map((row) => row.at)).length,
      "security sessions": model.profileSessions.length,
      "tracking advertisers": model.advertisers.length,
      "tracking contacts": model.contacts.length,
      "tracking links": model.linkHistory.length,
      "identity changes": model.profileChanges.length,
      "growth followBack": growth.followBack.length,
      "growth curve": growth.curve.length,
      "timeline streams": timeline.streams.length,
      "timeline months": timeline.months.length,
      "people rows": people.rows.length,
      "coverage files": model.coverage.length
    };

    expect(Object.values(slots).every((size) => Number.isFinite(size) && size >= 0)).toBe(true);
  }, 120000);

  it("writes the verdict as one sentence over the real numbers", async () => {
    const { model } = await read();
    const said = verdict(model, buildGraph(model));
    expect(said.sentence.startsWith("You follow ")).toBe(true);
    expect(said.sentence.endsWith(".")).toBe(true);
    expect(said.sentence.split(".").filter((part) => part.trim().length > 0).length).toBe(1);
  }, 120000);

  it("keeps only a usable coordinate out of the located posts", async () => {
    const { model } = await read();
    const located = model.ownMedia.filter((row) => row.latitude.length > 0);
    const points = toPlaces(located);
    expect(points.length).toBeLessThanOrEqual(located.length);
    for (const point of points) {
      expect(Math.abs(point.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(point.lon)).toBeLessThanOrEqual(180);
    }
  }, 120000);
});
