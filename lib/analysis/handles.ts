import type { ExportModel } from "@/lib/parser/model";

export type HandleMatch = {
  username: string;
  name: string;
  ambiguous: boolean;
  candidates: string[];
};

export type HandleMap = {
  byName: Map<string, HandleMatch>;
  size: number;
  ambiguous: number;
};

export function foldName(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function add(index: Map<string, Set<string>>, name: string, username: string) {
  const key = foldName(name);
  if (key.length === 0 || username.length === 0) return;
  const found = index.get(key) ?? new Set<string>();
  found.add(username);
  index.set(key, found);
}

export function buildHandleMap(model: ExportModel): HandleMap {
  const index = new Map<string, Set<string>>();
  const display = new Map<string, string>();

  const remember = (name: string, username: string) => {
    add(index, name, username);
    if (name.length > 0 && !display.has(foldName(name))) display.set(foldName(name), name);
  };

  for (const row of [
    ...model.followers,
    ...model.following,
    ...model.pendingOut,
    ...model.pendingIn,
    ...model.recentRequests,
    ...model.unfollowed,
    ...model.blocked,
    ...model.closeFriends,
    ...model.restricted
  ]) {
    remember(row.name, row.username);
    remember(row.username, row.username);
  }

  for (const row of model.likedPosts) remember(row.ownerName, row.owner);
  for (const row of model.storyLikes) remember(row.ownerName, row.owner);
  for (const row of model.storyViews) remember(row.ownerName, row.owner);
  for (const row of model.storyAnswers) remember(row.ownerName, row.owner);
  for (const row of model.noteInteractions) remember(row.name, row.username);

  const byName = new Map<string, HandleMatch>();
  let ambiguous = 0;
  for (const [key, usernames] of index) {
    const candidates = [...usernames];
    const first = candidates[0] ?? "";
    if (candidates.length > 1) ambiguous += 1;
    byName.set(key, {
      username: candidates.length === 1 ? first : "",
      name: display.get(key) ?? key,
      ambiguous: candidates.length > 1,
      candidates
    });
  }

  return { byName, size: byName.size, ambiguous };
}

export function resolveName(map: HandleMap, name: string): HandleMatch | null {
  return map.byName.get(foldName(name)) ?? null;
}
