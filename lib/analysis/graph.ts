import type { Connection, ExportModel } from "@/lib/parser/model";

export type AccountFlag =
  | "pendingOut"
  | "pendingIn"
  | "recentRequests"
  | "unfollowed"
  | "blocked"
  | "closeFriends"
  | "restricted";

export type Account = {
  username: string;
  name: string;
  followerSince: number;
  followingSince: number;
  postLikes: number;
  commentLikes: number;
  storyLikes: number;
  storyViews: number;
  storyAnswers: number;
  comments: number;
  saves: number;
  flags: Partial<Record<AccountFlag, number>>;
};

export type Graph = {
  accounts: Map<string, Account>;
  mutual: string[];
  noFollowBack: string[];
  fans: string[];
  coldMutuals: string[];
};

const LIST_KEYS: readonly AccountFlag[] = [
  "pendingOut",
  "pendingIn",
  "recentRequests",
  "unfollowed",
  "blocked",
  "closeFriends",
  "restricted"
];

function blankAccount(username: string): Account {
  return {
    username,
    name: "",
    followerSince: 0,
    followingSince: 0,
    postLikes: 0,
    commentLikes: 0,
    storyLikes: 0,
    storyViews: 0,
    storyAnswers: 0,
    comments: 0,
    saves: 0,
    flags: {}
  };
}

function applyConnections(accounts: Map<string, Account>, model: ExportModel) {
  const upsert = upsertInto(accounts);

  for (const row of model.followers) {
    const account = upsert(row.username);
    if (!account) continue;
    account.followerSince = row.followedAt;
    if (account.name.length === 0) account.name = row.name;
  }

  for (const row of model.following) {
    const account = upsert(row.username);
    if (account) account.followingSince = row.followedAt;
  }

  const lists: Record<AccountFlag, Connection[]> = {
    pendingOut: model.pendingOut,
    pendingIn: model.pendingIn,
    recentRequests: model.recentRequests,
    unfollowed: model.unfollowed,
    blocked: model.blocked,
    closeFriends: model.closeFriends,
    restricted: model.restricted
  };

  for (const flag of LIST_KEYS) {
    for (const row of lists[flag]) {
      const account = upsert(row.username);
      if (!account) continue;
      account.flags[flag] = row.followedAt;
      if (account.name.length === 0) account.name = row.name;
    }
  }
}

type Counter = Exclude<
  {
    [Key in keyof Account]: Account[Key] extends number ? Key : never;
  }[keyof Account],
  "followerSince" | "followingSince"
>;

const ACTIVITY_STREAMS: readonly [Counter, (model: ExportModel) => { owner: string }[]][] = [
  ["commentLikes", (model) => model.likedComments],
  ["storyLikes", (model) => model.storyLikes],
  ["storyViews", (model) => model.storyViews],
  ["storyAnswers", (model) => model.storyAnswers],
  ["comments", (model) => model.comments.map((row) => ({ owner: row.mediaOwner }))],
  ["saves", (model) => model.saved]
];

function applyActivity(accounts: Map<string, Account>, model: ExportModel) {
  const upsert = upsertInto(accounts);

  for (const row of model.likedPosts) {
    const account = upsert(row.owner);
    if (!account) continue;
    account.postLikes += 1;
    if (account.name.length === 0) account.name = row.ownerName;
  }

  for (const [key, select] of ACTIVITY_STREAMS) {
    for (const row of select(model)) {
      const account = upsert(row.owner);
      if (account) account[key] += 1;
    }
  }
}

function upsertInto(accounts: Map<string, Account>) {
  return (username: string): Account | null => {
    if (username.length === 0) return null;
    const existing = accounts.get(username);
    if (existing) return existing;
    const created = blankAccount(username);
    accounts.set(username, created);
    return created;
  };
}

export function buildGraph(model: ExportModel): Graph {
  const accounts = new Map<string, Account>();
  applyConnections(accounts, model);
  applyActivity(accounts, model);

  const followerSet = new Set(model.followers.map((row) => row.username));
  const followingSet = new Set(model.following.map((row) => row.username));

  const mutual = [...followingSet].filter((username) => followerSet.has(username));
  const noFollowBack = [...followingSet].filter((username) => !followerSet.has(username));
  const fans = [...followerSet].filter((username) => !followingSet.has(username));
  const coldMutuals = mutual.filter((username) => {
    const account = accounts.get(username);
    return account?.postLikes === 0 && account.storyLikes === 0;
  });

  return { accounts, mutual, noFollowBack, fans, coldMutuals };
}

export function accountsFor(graph: Graph, usernames: readonly string[]): Account[] {
  return usernames
    .map((username) => graph.accounts.get(username))
    .filter((account): account is Account => account !== undefined);
}
