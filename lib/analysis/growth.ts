import type { Connection, ExportModel } from "@/lib/parser/model";

export type FollowBackYear = {
  year: string;
  followed: number;
  followedBack: number;
  rate: number;
};

export type CurveYear = {
  year: string;
  followers: number;
  following: number;
  ratio: number;
};

export type ReciprocityBucket = { key: string; label: string; value: number };

export type FirstMoveYear = { year: string; you: number; them: number };

export type Growth = {
  followBack: FollowBackYear[];
  curve: CurveYear[];
  reciprocity: ReciprocityBucket[];
  firstMove: FirstMoveYear[];
  medianReciprocity: number;
  withinHour: number;
  mutualCount: number;
  bestMonth: { month: string; gained: number };
  quietMonths: number;
  oldestFollower: number;
  medianFollowerAge: number;
  recentShare: number;
};

const YEAR = 365.25 * 86400;
const HOUR = 3600;

const BUCKETS: readonly [number, string][] = [
  [60, "Under 1 min"],
  [HOUR, "Under 1 hour"],
  [86400, "Under 1 day"],
  [7 * 86400, "Under 1 week"],
  [30 * 86400, "Under 1 month"],
  [YEAR, "Under 1 year"],
  [Number.POSITIVE_INFINITY, "Over 1 year"]
];

function yearOf(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 4);
}

function monthOf(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 7);
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function dated(rows: readonly Connection[]): Connection[] {
  return rows.filter((row) => row.followedAt > 0);
}

function followBackByYear(model: ExportModel): FollowBackYear[] {
  const followers = new Set(model.followers.map((row) => row.username));
  const groups = new Map<string, { followed: number; followedBack: number }>();
  for (const row of dated(model.following)) {
    const year = yearOf(row.followedAt);
    const found = groups.get(year) ?? { followed: 0, followedBack: 0 };
    found.followed += 1;
    if (followers.has(row.username)) found.followedBack += 1;
    groups.set(year, found);
  }
  return [...groups.entries()]
    .map(([year, value]) => ({
      year,
      followed: value.followed,
      followedBack: value.followedBack,
      rate: value.followed === 0 ? 0 : value.followedBack / value.followed
    }))
    .sort((left, right) => left.year.localeCompare(right.year));
}

function curveByYear(model: ExportModel): CurveYear[] {
  const years = new Set<string>();
  for (const row of [...dated(model.followers), ...dated(model.following)]) {
    years.add(yearOf(row.followedAt));
  }
  return [...years].sort().map((year) => {
    const edge = Date.parse(`${year}-12-31T23:59:59Z`) / 1000;
    const followers = dated(model.followers).filter((row) => row.followedAt <= edge).length;
    const following = dated(model.following).filter((row) => row.followedAt <= edge).length;
    return { year, followers, following, ratio: following === 0 ? 0 : followers / following };
  });
}

function reciprocityGaps(model: ExportModel): number[] {
  const followers = new Map(model.followers.map((row) => [row.username, row.followedAt]));
  const gaps: number[] = [];
  for (const row of dated(model.following)) {
    const back = followers.get(row.username);
    if (back === undefined || back <= 0) continue;
    const gap = back - row.followedAt;
    if (gap >= 0) gaps.push(gap);
  }
  return gaps;
}

function bucketGaps(gaps: readonly number[]): ReciprocityBucket[] {
  return BUCKETS.map(([limit, label], index) => {
    const floor = index === 0 ? 0 : (BUCKETS[index - 1]?.[0] ?? 0);
    return {
      key: label,
      label,
      value: gaps.filter((gap) => gap >= floor && gap < limit).length
    };
  });
}

function firstMoveByYear(model: ExportModel): FirstMoveYear[] {
  const followers = new Map(model.followers.map((row) => [row.username, row.followedAt]));
  const groups = new Map<string, { you: number; them: number }>();
  for (const row of dated(model.following)) {
    const back = followers.get(row.username);
    if (back === undefined || back <= 0) continue;
    const first = Math.min(row.followedAt, back);
    const year = yearOf(first);
    const found = groups.get(year) ?? { you: 0, them: 0 };
    if (row.followedAt <= back) found.you += 1;
    else found.them += 1;
    groups.set(year, found);
  }
  return [...groups.entries()]
    .map(([year, value]) => ({ year, ...value }))
    .sort((left, right) => left.year.localeCompare(right.year));
}

function monthlyFollowers(model: ExportModel) {
  const months = new Map<string, number>();
  for (const row of dated(model.followers)) {
    const key = monthOf(row.followedAt);
    months.set(key, (months.get(key) ?? 0) + 1);
  }
  return months;
}

function spanMonths(model: ExportModel): number {
  const stamps = dated(model.followers).map((row) => row.followedAt);
  if (stamps.length === 0) return 0;
  const first = new Date(Math.min(...stamps) * 1000);
  const last = new Date(Math.max(...stamps) * 1000);
  return (last.getFullYear() - first.getFullYear()) * 12 + (last.getMonth() - first.getMonth()) + 1;
}

export function buildGrowth(model: ExportModel, now: number): Growth {
  const gaps = reciprocityGaps(model);
  const months = monthlyFollowers(model);
  const best = [...months.entries()].sort((left, right) => right[1] - left[1])[0];
  const ages = dated(model.followers).map((row) => (now - row.followedAt) / YEAR);
  const recent = dated(model.followers).filter((row) => now - row.followedAt <= YEAR).length;
  const oldest = dated(model.followers).reduce(
    (lowest, row) => (lowest === 0 ? row.followedAt : Math.min(lowest, row.followedAt)),
    0
  );

  return {
    followBack: followBackByYear(model),
    curve: curveByYear(model),
    reciprocity: bucketGaps(gaps),
    firstMove: firstMoveByYear(model),
    medianReciprocity: median(gaps),
    withinHour: gaps.filter((gap) => gap <= HOUR).length,
    mutualCount: gaps.length,
    bestMonth: { month: best?.[0] ?? "", gained: best?.[1] ?? 0 },
    quietMonths: Math.max(0, spanMonths(model) - months.size),
    oldestFollower: oldest,
    medianFollowerAge: median(ages),
    recentShare: model.followers.length === 0 ? 0 : recent / model.followers.length
  };
}
