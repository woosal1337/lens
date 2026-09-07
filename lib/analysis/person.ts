import type { Account, Graph } from "@/lib/analysis/graph";
import type { DisplayMessage, ExportModel, Thread } from "@/lib/parser/model";

export type PersonEventKind =
  | "follow"
  | "follower"
  | "request"
  | "postLike"
  | "storyLike"
  | "storyView"
  | "storyAnswer"
  | "comment"
  | "save"
  | "message"
  | "share";

export type PersonEvent = {
  kind: PersonEventKind;
  at: number;
  detail: string;
  display?: DisplayMessage | undefined;
};

export type PersonRecord = {
  account: Account;
  name: string;
  events: PersonEvent[];
};

function displayName(model: ExportModel, username: string): string {
  const lower = username.toLowerCase();
  for (const row of [...model.followers, ...model.following]) {
    if (row.username === lower && row.name.length > 0) return row.name;
  }
  return "";
}

export function buildPersonRecord(
  model: ExportModel,
  graph: Graph,
  username: string
): PersonRecord | null {
  const account = graph.accounts.get(username.toLowerCase());
  if (!account) return null;

  const lower = username.toLowerCase();
  const name = displayName(model, lower);
  const events = [...standingEvents(account), ...activityEvents(model, lower)].sort(
    (left, right) => right.at - left.at
  );

  return {
    account: { ...account, name: account.name.length > 0 ? account.name : name },
    name,
    events
  };
}

function standingEvents(account: Account): PersonEvent[] {
  const events: PersonEvent[] = [];
  if (account.followingSince > 0) {
    events.push({
      kind: "follow",
      at: account.followingSince,
      detail: "You followed them",
      display: { key: "You followed them" }
    });
  }
  if (account.followerSince > 0) {
    events.push({
      kind: "follower",
      at: account.followerSince,
      detail: "They followed you",
      display: { key: "They followed you" }
    });
  }
  for (const [flag, at] of Object.entries(account.flags)) {
    events.push({
      kind: "request",
      at,
      detail: flagLabel(flag),
      display: { key: flagLabel(flag) }
    });
  }
  return events;
}

const ACTIVITY_SOURCES: readonly [
  PersonEventKind,
  (
    model: ExportModel
  ) => { owner: string; at: number; detail: string; display?: DisplayMessage | undefined }[]
][] = [
  [
    "postLike",
    (model) =>
      model.likedPosts.map((row) => ({
        owner: row.owner,
        at: row.at,
        detail: firstLine(row.caption),
        display: row.caption.length === 0 ? { key: "no caption" } : undefined
      }))
  ],
  [
    "storyLike",
    (model) =>
      model.storyLikes.map((row) => ({
        owner: row.owner,
        at: row.at,
        detail: "You liked a story",
        display: { key: "You liked a story" }
      }))
  ],
  [
    "storyView",
    (model) =>
      model.storyViews.map((row) => ({
        owner: row.owner,
        at: row.at,
        detail: "You watched a story",
        display: { key: "You watched a story" }
      }))
  ],
  [
    "storyAnswer",
    (model) =>
      model.storyAnswers.map((row) => ({
        owner: row.owner,
        at: row.at,
        detail: row.prompt.length > 0 ? row.prompt : "You answered a sticker",
        display: row.prompt.length > 0 ? undefined : { key: "You answered a sticker" }
      }))
  ],
  [
    "comment",
    (model) =>
      model.comments.map((row) => ({
        owner: row.mediaOwner,
        at: row.at,
        detail: firstLine(row.body),
        display: row.body.length === 0 ? { key: "no caption" } : undefined
      }))
  ],
  [
    "save",
    (model) =>
      model.saved.map((row) => ({
        owner: row.owner,
        at: row.at,
        detail: firstLine(row.caption),
        display: row.caption.length === 0 ? { key: "no caption" } : undefined
      }))
  ]
];

function activityEvents(model: ExportModel, lower: string): PersonEvent[] {
  const events: PersonEvent[] = [];
  for (const [kind, select] of ACTIVITY_SOURCES) {
    for (const row of select(model)) {
      if (row.owner === lower)
        events.push({ kind, at: row.at, detail: row.detail, display: row.display });
    }
  }
  return events;
}

export function messageEvents(
  threads: readonly Thread[],
  you: string,
  lower: string,
  name: string
) {
  const events: PersonEvent[] = [];
  let messages = 0;
  let sent = 0;
  let shared = 0;
  let sharesFromThem = 0;

  for (const thread of threads) {
    for (const message of thread.messages) {
      if (message.sharedFrom !== lower) continue;
      sharesFromThem += 1;
      events.push({
        kind: "share",
        at: message.at,
        detail: `${message.sender} sent you their post`,
        display: { key: "{0} sent you their post", values: [message.sender] }
      });
    }
    if (name.length === 0 || !thread.participants.includes(name)) continue;
    shared += 1;
    messages += thread.messages.length;
    for (const message of thread.messages) {
      if (message.sender === you) sent += 1;
    }
    const last = thread.messages[thread.messages.length - 1];
    if (last) {
      events.push({
        kind: "message",
        at: last.at,
        detail: `Your last message in ${threadName(thread.title)}`,
        display: { key: "Your last message in {0}", values: [threadName(thread.title)] }
      });
    }
  }

  return { events, messages, sent, threads: shared, sharesFromThem };
}

function threadName(title: string): string {
  return title.length > 0 ? title : "an unnamed conversation";
}

function firstLine(text: string): string {
  const line = text.split("\n")[0] ?? text;
  if (line.length === 0) return "no caption";
  return line.length > 90 ? `${line.slice(0, 89)}…` : line;
}

function flagLabel(flag: string): string {
  const labels: Record<string, string> = {
    pendingOut: "You sent a follow request",
    pendingIn: "They sent you a follow request",
    recentRequests: "You sent a recent follow request",
    unfollowed: "You unfollowed them",
    blocked: "You blocked them",
    closeFriends: "You added them to close friends",
    restricted: "You restricted them"
  };
  return labels[flag] ?? flag;
}
