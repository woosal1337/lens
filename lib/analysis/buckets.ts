export type BarPoint = { key: string; value: number };
export type RankPoint = { key: string; label: string; value: number };
export type SeriesPoint = { at: number; value: number };

const MONTH_WIDTH = 7;
const DAY_WIDTH = 10;

function bucket(timestamps: readonly number[], width: number): BarPoint[] {
  const buckets = new Map<string, number>();
  for (const at of timestamps) {
    if (at <= 0) continue;
    const key = new Date(at * 1000).toISOString().slice(0, width);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .map(([key, value]) => ({ key, value }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

export function toMonthly(timestamps: readonly number[]): BarPoint[] {
  return bucket(timestamps, MONTH_WIDTH);
}

export function toDaily(timestamps: readonly number[]): BarPoint[] {
  return bucket(timestamps, DAY_WIDTH);
}

export function toRanked(tally: Map<string, number>, limit: number): RankPoint[] {
  return [...tally.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([key, value]) => ({ key, label: key, value }));
}

export function toCumulative(timestamps: readonly number[]): SeriesPoint[] {
  const sorted = [...timestamps].filter((at) => at > 0).sort((left, right) => left - right);
  return sorted.map((at, index) => ({ at, value: index + 1 }));
}
