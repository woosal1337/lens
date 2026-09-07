import type { Graph } from "@/lib/analysis/graph";
import { buildHandleMap, resolveName, type HandleMap } from "@/lib/analysis/handles";
import type { ExportModel, Thread } from "@/lib/parser/model";

export type Person = {
  key: string;
  name: string;
  username: string;
  ambiguous: boolean;
  candidates: string[];
  messages: number;
  sent: number;
  yourShare: number;
  theirReply: number;
  yourReply: number;
  youOpen: number;
  activeDays: number;
  firstAt: number;
  lastAt: number;
  shares: number;
  voice: number;
  reactionsFromThem: number;
  postLikes: number;
  storyLikes: number;
  mutual: boolean;
  score: number;
  lifetime: number;
};

export type People = {
  rows: Person[];
  handles: HandleMap;
  resolved: number;
  partners: number;
  placeholderMessages: number;
};

const PLACEHOLDER = "instagram user";
const MIN_MESSAGES = 30;
const DAY = 86400;
const HALF_LIFE = 180 * DAY;

const WEIGHTS = {
  volume: 28,
  activeDays: 18,
  recency: 14,
  reciprocity: 12,
  outbound: 10,
  inbound: 8,
  voice: 6,
  standing: 4
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function replyGaps(thread: Thread, answerer: string): number[] {
  const gaps: number[] = [];
  let waiting = 0;
  for (const message of thread.messages) {
    if (message.sender === answerer) {
      if (waiting > 0) gaps.push(message.at - waiting);
      waiting = 0;
    } else {
      waiting = message.at;
    }
  }
  return gaps;
}

function openings(thread: Thread, you: string): { total: number; yours: number } {
  let total = 0;
  let yours = 0;
  let previous = 0;
  for (const message of thread.messages) {
    if (previous === 0 || message.at - previous > 6 * 3600) {
      total += 1;
      if (message.sender === you) yours += 1;
    }
    previous = message.at;
  }
  return { total, yours };
}

function scoreOf(
  person: Person,
  peak: { messages: number; days: number },
  now: number,
  decay: boolean
): number {
  const volume = Math.log1p(person.messages) / Math.log1p(Math.max(1, peak.messages));
  const days = person.activeDays / Math.max(1, peak.days);
  const recency = decay ? Math.pow(0.5, (now - person.lastAt) / HALF_LIFE) : 1;
  const balance = 1 - Math.abs(person.yourShare - 0.5) * 2;
  const outbound = Math.min(1, Math.log1p(person.postLikes + person.storyLikes) / Math.log1p(200));
  const inbound = Math.min(1, Math.log1p(person.reactionsFromThem) / Math.log1p(500));
  const voice = Math.min(1, Math.log1p(person.voice) / Math.log1p(100));
  const standing = person.mutual ? 1 : 0;

  return Math.round(
    volume * WEIGHTS.volume +
      days * WEIGHTS.activeDays +
      recency * WEIGHTS.recency +
      balance * WEIGHTS.reciprocity +
      outbound * WEIGHTS.outbound +
      inbound * WEIGHTS.inbound +
      voice * WEIGHTS.voice +
      standing * WEIGHTS.standing
  );
}

function partnerOf(thread: Thread, you: string): string {
  const others = thread.participants.filter((name) => name !== you);
  return others.length === 1 ? (others[0] ?? "") : "";
}

function blank(name: string): Person {
  return {
    key: name,
    name,
    username: "",
    ambiguous: false,
    candidates: [],
    messages: 0,
    sent: 0,
    yourShare: 0,
    theirReply: 0,
    yourReply: 0,
    youOpen: 0,
    activeDays: 0,
    firstAt: 0,
    lastAt: 0,
    shares: 0,
    voice: 0,
    reactionsFromThem: 0,
    postLikes: 0,
    storyLikes: 0,
    mutual: false,
    score: 0,
    lifetime: 0
  };
}

function fill(person: Person, thread: Thread, you: string) {
  const days = new Set<string>();
  for (const message of thread.messages) {
    person.messages += 1;
    if (message.sender === you) person.sent += 1;
    if (message.kind === "share") person.shares += 1;
    if (message.kind === "audio") person.voice += 1;
    for (const reaction of message.reactions) {
      if (reaction.actor !== you) person.reactionsFromThem += 1;
    }
    if (message.at > 0) {
      days.add(new Date(message.at * 1000).toISOString().slice(0, 10));
      person.firstAt = person.firstAt === 0 ? message.at : Math.min(person.firstAt, message.at);
      person.lastAt = Math.max(person.lastAt, message.at);
    }
  }
  person.activeDays = days.size;
  person.yourShare = person.messages === 0 ? 0 : person.sent / person.messages;
  person.theirReply = median(replyGaps(thread, person.name));
  person.yourReply = median(replyGaps(thread, you));
  const opens = openings(thread, you);
  person.youOpen = opens.total === 0 ? 0 : opens.yours / opens.total;
}

export function buildPeople(
  model: ExportModel,
  threads: readonly Thread[],
  graph: Graph,
  now: number
): People {
  const you = model.profile.name;
  const handles = buildHandleMap(model);
  const rows: Person[] = [];
  let partners = 0;
  let placeholderMessages = 0;

  for (const thread of threads) {
    if (thread.participants.length > 2) continue;
    const name = partnerOf(thread, you);
    if (name.length === 0) continue;
    if (name.toLowerCase() === PLACEHOLDER) {
      placeholderMessages += thread.messages.length;
      continue;
    }
    partners += 1;
    if (thread.messages.length < MIN_MESSAGES) continue;

    const person = blank(name);
    fill(person, thread, you);

    const match = resolveName(handles, name);
    if (match) {
      person.username = match.username;
      person.ambiguous = match.ambiguous;
      person.candidates = match.candidates;
    }
    const account = person.username.length > 0 ? graph.accounts.get(person.username) : undefined;
    if (account) {
      person.postLikes = account.postLikes;
      person.storyLikes = account.storyLikes;
      person.mutual = account.followerSince > 0 && account.followingSince > 0;
    }
    rows.push(person);
  }

  const peak = {
    messages: Math.max(1, ...rows.map((row) => row.messages)),
    days: Math.max(1, ...rows.map((row) => row.activeDays))
  };
  for (const row of rows) {
    row.score = scoreOf(row, peak, now, true);
    row.lifetime = scoreOf(row, peak, now, false);
  }

  return {
    rows: rows.sort((left, right) => right.score - left.score),
    handles,
    resolved: rows.filter((row) => row.username.length > 0).length,
    partners,
    placeholderMessages
  };
}
