import type { Thread, ThreadFolder, ThreadMessage } from "@/lib/parser/model";

export type ThreadStat = {
  id: string;
  title: string;
  folder: ThreadFolder;
  people: number;
  messages: number;
  sent: number;
  received: number;
  yourShare: number;
  first: number;
  last: number;
  medianReply: number;
  shares: number;
  reactions: number;
};

export type MessageProfile = {
  threads: ThreadStat[];
  sent: number;
  received: number;
  replies: number;
  medianReply: number;
  slowReply: number;
  starts: number;
  shares: number;
  shareOwners: number;
  byHour: number[];
  byWeekday: number[];
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function quantile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction));
  return sorted[index] ?? 0;
}

function replyGaps(messages: readonly ThreadMessage[], you: string): number[] {
  const gaps: number[] = [];
  let waiting = 0;
  for (const message of messages) {
    if (message.sender === you) {
      if (waiting > 0) gaps.push(message.at - waiting);
      waiting = 0;
    } else {
      waiting = message.at;
    }
  }
  return gaps;
}

function statFor(thread: Thread, you: string): ThreadStat {
  let sent = 0;
  let shares = 0;
  let reactions = 0;
  for (const message of thread.messages) {
    if (message.sender === you) sent += 1;
    if (message.kind === "share") shares += 1;
    reactions += message.reactions.length;
  }
  const total = thread.messages.length;
  const gaps = replyGaps(thread.messages, you);
  return {
    id: thread.id,
    title: thread.title,
    folder: thread.folder,
    people: thread.participants.length,
    messages: total,
    sent,
    received: total - sent,
    yourShare: total === 0 ? 0 : sent / total,
    first: thread.messages[0]?.at ?? 0,
    last: thread.messages[total - 1]?.at ?? 0,
    medianReply: median(gaps),
    shares,
    reactions
  };
}

export function buildMessageProfile(threads: readonly Thread[], you: string): MessageProfile {
  const stats = threads.map((thread) => statFor(thread, you));
  const gaps: number[] = [];
  const byHour = Array.from({ length: 24 }, () => 0);
  const byWeekday = Array.from({ length: 7 }, () => 0);
  let sent = 0;
  let starts = 0;
  let shares = 0;
  const shareOwners = new Set<string>();

  for (const thread of threads) {
    gaps.push(...replyGaps(thread.messages, you));
    if (thread.messages[0]?.sender === you) starts += 1;
    for (const message of thread.messages) {
      if (message.sharedFrom.length > 0) {
        shares += 1;
        shareOwners.add(message.sharedFrom);
      }
      if (message.sender !== you) continue;
      sent += 1;
      const stamp = new Date(message.at * 1000);
      const hour = stamp.getHours();
      const weekday = stamp.getDay();
      byHour[hour] = (byHour[hour] ?? 0) + 1;
      byWeekday[weekday] = (byWeekday[weekday] ?? 0) + 1;
    }
  }

  const total = stats.reduce((sum, stat) => sum + stat.messages, 0);
  return {
    threads: stats,
    sent,
    received: total - sent,
    replies: gaps.length,
    medianReply: median(gaps),
    slowReply: quantile(gaps, 0.9),
    starts,
    shares,
    shareOwners: shareOwners.size,
    byHour,
    byWeekday
  };
}
