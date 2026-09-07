import type { BarPoint } from "@/lib/analysis/buckets";
import type { DisplayMessage, ExportModel, Thread } from "@/lib/parser/model";

export type StreamId =
  | "likes"
  | "stories"
  | "storyLikes"
  | "storyViews"
  | "saved"
  | "commentLikes"
  | "messages"
  | "followers"
  | "logins"
  | "profileChanges";

export type Stream = {
  id: StreamId;
  label: string;
  hint: string;
  short: boolean;
  months: Map<string, number>;
  total: number;
  first: number;
  last: number;
};

export type DayEntry = {
  stream: StreamId;
  label: string;
  at: number;
  detail: string;
  display?: DisplayMessage | undefined;
};

export type Timeline = {
  streams: Stream[];
  months: string[];
  first: number;
  last: number;
  longestGap: { days: number; from: number; to: number };
  byHour: number[];
  byWeekday: number[];
};

const SANE_FROM = Date.parse("2010-01-01T00:00:00Z") / 1000;
const SANE_TO = Date.parse("2030-01-01T00:00:00Z") / 1000;

function sane(at: number): boolean {
  return at > SANE_FROM && at < SANE_TO;
}

function monthOf(at: number): string {
  return new Date(at * 1000).toISOString().slice(0, 7);
}

type StreamSpec = { id: StreamId; label: string; hint: string; short?: boolean };

function collect(spec: StreamSpec, stamps: readonly number[]): Stream {
  const { id, label, hint, short = false } = spec;
  const clean = stamps.filter(sane).sort((left, right) => left - right);
  const months = new Map<string, number>();
  for (const at of clean) {
    const key = monthOf(at);
    months.set(key, (months.get(key) ?? 0) + 1);
  }
  return {
    id,
    label,
    hint,
    short,
    months,
    total: clean.length,
    first: clean[0] ?? 0,
    last: clean[clean.length - 1] ?? 0
  };
}

function longestGap(stamps: readonly number[]) {
  const clean = [...stamps].filter(sane).sort((left, right) => left - right);
  let widest = { days: 0, from: 0, to: 0 };
  for (let index = 1; index < clean.length; index += 1) {
    const from = clean[index - 1] ?? 0;
    const to = clean[index] ?? 0;
    const days = Math.round((to - from) / 86400);
    if (days > widest.days) widest = { days, from, to };
  }
  return widest;
}

function fromMonths(spec: StreamSpec, months: readonly BarPoint[]): Stream {
  const buckets = new Map(months.map((point) => [point.key, point.value] as const));
  const keys = [...buckets.keys()].sort();
  const first = keys[0];
  const last = keys[keys.length - 1];
  return {
    id: spec.id,
    label: spec.label,
    hint: spec.hint,
    short: spec.short ?? false,
    months: buckets,
    total: months.reduce((sum, point) => sum + point.value, 0),
    first: first === undefined ? 0 : Date.parse(`${first}-01T00:00:00Z`) / 1000,
    last: last === undefined ? 0 : Date.parse(`${last}-28T00:00:00Z`) / 1000
  };
}

export function buildTimeline(model: ExportModel, messageMonths: readonly BarPoint[]): Timeline {
  const streams: Stream[] = [
    collect(
      { id: "likes", label: "Likes you gave", hint: "every post you liked" },
      model.likedPosts.map((row) => row.at)
    ),
    fromMonths(
      { id: "messages", label: "Messages", hint: "both sides of every chat" },
      messageMonths
    ),
    collect(
      { id: "stories", label: "Stories you posted", hint: "your own archive" },
      model.ownMedia.filter((row) => row.kind === "story").map((row) => row.at)
    ),
    collect(
      { id: "storyLikes", label: "Stories you liked", hint: "the heart on a story" },
      model.storyLikes.map((row) => row.at)
    ),
    collect(
      { id: "storyViews", label: "Stories you watched", hint: "Meta keeps 30 days", short: true },
      model.storyViews.map((row) => row.at)
    ),
    collect(
      { id: "saved", label: "Posts you saved", hint: "your saved list" },
      model.saved.map((row) => row.at)
    ),
    collect(
      { id: "commentLikes", label: "Comment likes", hint: "you liked a reply" },
      model.likedComments.map((row) => row.at)
    ),
    collect(
      { id: "followers", label: "Followers gained", hint: "current followers only" },
      model.followers.map((row) => row.followedAt)
    ),
    collect(
      { id: "logins", label: "Logins", hint: "every session Meta kept" },
      model.logins.map((row) => row.at)
    ),
    collect(
      { id: "profileChanges", label: "Profile changes", hint: "every edit you made" },
      model.profileChanges.map((row) => row.at)
    )
  ];

  const months = [...new Set(streams.flatMap((stream) => [...stream.months.keys()]))].sort();
  const dated = streams.filter((stream) => stream.total > 0);
  const byHour = Array.from({ length: 24 }, () => 0);
  const byWeekday = Array.from({ length: 7 }, () => 0);

  for (const at of model.likedPosts.map((row) => row.at).filter(sane)) {
    const stamp = new Date(at * 1000);
    const hour = stamp.getHours();
    const weekday = stamp.getDay();
    byHour[hour] = (byHour[hour] ?? 0) + 1;
    byWeekday[weekday] = (byWeekday[weekday] ?? 0) + 1;
  }

  return {
    streams,
    months,
    first: Math.min(...dated.map((stream) => stream.first)),
    last: Math.max(...dated.map((stream) => stream.last)),
    longestGap: longestGap(model.likedPosts.map((row) => row.at)),
    byHour,
    byWeekday
  };
}

export function dayEntries(model: ExportModel, day: string): DayEntry[] {
  const from = Date.parse(`${day}T00:00:00Z`) / 1000;
  const to = from + 86400;
  if (Number.isNaN(from)) return [];

  const entries: DayEntry[] = [];
  const push = (
    stream: StreamId,
    label: string,
    at: number,
    detail: string | Pick<DayEntry, "detail" | "display">
  ) => {
    if (at >= from && at < to)
      entries.push({ stream, label, at, ...(typeof detail === "string" ? { detail } : detail) });
  };

  for (const row of model.likedPosts) push("likes", "Like", row.at, `@${row.owner}`);
  for (const row of model.storyLikes) push("storyLikes", "Story like", row.at, `@${row.owner}`);
  for (const row of model.storyViews) push("storyViews", "Story view", row.at, `@${row.owner}`);
  for (const row of model.saved) push("saved", "Saved", row.at, `@${row.owner}`);
  for (const row of model.logins) push("logins", "Login", row.at, row.ip);
  for (const row of model.profileChanges) {
    push("profileChanges", "Profile change", row.at, {
      detail: `${row.field} became ${row.next}`,
      display: {
        key: "{0} became {1}",
        values: [row.field, row.next]
      }
    });
  }
  for (const row of model.followers) {
    push("followers", "New follower", row.followedAt, `@${row.username}`);
  }
  return entries.sort((left, right) => left.at - right.at);
}

export function dayMessages(threads: readonly Thread[], day: string): DayEntry[] {
  const from = Date.parse(`${day}T00:00:00Z`) / 1000;
  const to = from + 86400;
  if (Number.isNaN(from)) return [];

  const entries: DayEntry[] = [];
  for (const thread of threads) {
    for (const message of thread.messages) {
      if (message.at < from || message.at >= to) continue;
      entries.push({
        stream: "messages",
        label: "Message",
        at: message.at,
        detail: `${message.sender} in ${thread.title}`,
        display: { key: "{0} in {1}", values: [message.sender, thread.title] }
      });
    }
  }
  return entries;
}
