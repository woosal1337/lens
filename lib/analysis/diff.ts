import type { Connection, ExportModel } from "@/lib/parser/model";

export type Snapshot = {
  id: string;
  label: string;
  at: number;
  account: string;
  complete: boolean;
  dated: boolean;
  followers: Set<string>;
  following: Set<string>;
  pending: Set<string>;
  names: Map<string, string>;
};

export type DiffChangeKind =
  | "unfollowedYou"
  | "followedYou"
  | "youUnfollowed"
  | "youFollowed"
  | "requestAccepted"
  | "requestDropped";

export type DiffChange = {
  kind: DiffChangeKind;
  username: string;
  name: string;
  from: number;
  to: number;
};

export type Diff = {
  from: Snapshot;
  to: Snapshot;
  changes: DiffChange[];
  netFollowers: number;
  netFollowing: number;
};

function names(model: ExportModel): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of [...model.followers, ...model.following, ...model.pendingOut]) {
    if (row.name.length > 0 && !map.has(row.username)) map.set(row.username, row.name);
  }
  return map;
}

function usernames(rows: readonly Connection[]): Set<string> {
  return new Set(rows.map((row) => row.username).filter((username) => username.length > 0));
}

export function snapshotOf(model: ExportModel, id: string): Snapshot {
  const requested = model.downloadRequests
    .map((row) => row.completedAt)
    .filter((at) => at > 0)
    .sort((left, right) => right - left);
  const latestFollow = [...model.followers, ...model.following].reduce(
    (newest, row) => Math.max(newest, row.followedAt),
    0
  );
  const at = requested[0] ?? latestFollow;
  return {
    id,
    label: model.profile.username.length > 0 ? `@${model.profile.username}` : id,
    at,
    account: model.profile.username.toLowerCase(),
    complete: ["Followers", "Following", "Requests you sent, unanswered"].every((label) =>
      model.coverage.some((row) => row.label === label && row.found)
    ),
    dated: requested.length > 0,
    followers: usernames(model.followers),
    following: usernames(model.following),
    pending: usernames(model.pendingOut),
    names: names(model)
  };
}

const RULES: readonly [DiffChangeKind, (from: Snapshot, to: Snapshot) => Set<string>][] = [
  [
    "unfollowedYou",
    (from, to) => new Set([...from.followers].filter((name) => !to.followers.has(name)))
  ],
  [
    "followedYou",
    (from, to) => new Set([...to.followers].filter((name) => !from.followers.has(name)))
  ],
  [
    "youUnfollowed",
    (from, to) => new Set([...from.following].filter((name) => !to.following.has(name)))
  ],
  [
    "youFollowed",
    (from, to) => new Set([...to.following].filter((name) => !from.following.has(name)))
  ],
  [
    "requestAccepted",
    (from, to) =>
      new Set([...from.pending].filter((name) => !to.pending.has(name) && to.following.has(name)))
  ],
  [
    "requestDropped",
    (from, to) =>
      new Set([...from.pending].filter((name) => !to.pending.has(name) && !to.following.has(name)))
  ]
];

export function comparisonIssue(from: Snapshot, to: Snapshot): string | null {
  if (!from.account || !to.account || from.account !== to.account)
    return "Choose two exports from the same account. Both must include profile information.";
  if (!from.complete || !to.complete)
    return "Both exports need followers, following, and pending requests. Request all account information from Meta.";
  if (!from.dated || !to.dated || from.at === to.at)
    return "The export dates are missing or equal. Choose two exports with different completed download dates.";
  return null;
}

export function diffSnapshots(from: Snapshot, to: Snapshot): Diff {
  const changes: DiffChange[] = [];
  for (const [kind, select] of RULES) {
    for (const username of select(from, to)) {
      changes.push({
        kind,
        username,
        name: to.names.get(username) ?? from.names.get(username) ?? "",
        from: from.at,
        to: to.at
      });
    }
  }
  return {
    from,
    to,
    changes: changes.sort((left, right) => left.username.localeCompare(right.username)),
    netFollowers: to.followers.size - from.followers.size,
    netFollowing: to.following.size - from.following.size
  };
}
