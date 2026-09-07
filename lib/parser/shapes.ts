import { demojibake } from "@/lib/parser/text";

export type LabelValue = {
  label?: string;
  value?: string;
  href?: string;
  timestamp_value?: number;
  title?: string;
  dict?: { title?: string; dict?: LabelValue[] }[];
  vec?: { value?: string }[];
};

export type LabelRecord = {
  timestamp?: number;
  fbid?: string;
  label_values?: LabelValue[];
};

export type MapEntry = { value?: string; href?: string; timestamp?: number };

export type MapRecord = {
  title?: string;
  string_map_data?: Record<string, MapEntry>;
  string_list_data?: { value?: string; href?: string; timestamp?: number }[];
};

export type Owner = { username: string; name: string };

export function readLabels(record: LabelRecord): Record<string, string> {
  const output: Record<string, string> = {};
  for (const entry of record.label_values ?? []) {
    if (entry.label === undefined) continue;
    if (entry.value !== undefined) {
      output[entry.label] = demojibake(entry.value);
    } else if (entry.timestamp_value !== undefined) {
      output[entry.label] = String(entry.timestamp_value);
    } else if (entry.href !== undefined) {
      output[entry.label] = entry.href;
    }
  }
  return output;
}

export function readNestedGroup(record: LabelRecord, groupTitle: string): Record<string, string>[] {
  const groups: Record<string, string>[] = [];
  for (const entry of record.label_values ?? []) {
    if (entry.title !== groupTitle) continue;
    for (const member of entry.dict ?? []) {
      const fields: Record<string, string> = {};
      for (const field of member.dict ?? []) {
        if (field.label !== undefined && field.value !== undefined) {
          fields[field.label] = demojibake(field.value);
        }
      }
      if (Object.keys(fields).length > 0) groups.push(fields);
    }
  }
  return groups;
}

function ownerAtLevel(entries: readonly LabelValue[]): Owner | null {
  for (const entry of entries) {
    if (entry.title !== "Owner") continue;
    for (const member of entry.dict ?? []) {
      const fields: Record<string, string> = {};
      for (const field of member.dict ?? []) {
        if (field.label !== undefined && field.value !== undefined) {
          fields[field.label] = demojibake(field.value);
        }
      }
      const username = fields.Username;
      if (username !== undefined && username.length > 0) {
        return { username: username.toLowerCase(), name: fields.Name ?? "" };
      }
    }
  }
  return null;
}

function ownerBelow(entries: readonly LabelValue[], depth: number): Owner | null {
  if (depth === 0) return null;
  const here = ownerAtLevel(entries);
  if (here) return here;
  for (const entry of entries) {
    for (const member of entry.dict ?? []) {
      const found = ownerBelow(member.dict ?? [], depth - 1);
      if (found) return found;
    }
  }
  return null;
}

export function readOwner(record: LabelRecord): Owner | null {
  return ownerBelow(record.label_values ?? [], 4);
}

export function readHashtags(record: LabelRecord): string[] {
  const tags = readNestedGroup(record, "Hashtags")
    .map((group) => group.Name?.toLowerCase())
    .filter((tag): tag is string => tag !== undefined && tag.length > 0);
  return [...new Set(tags)];
}

export function readVector(record: { label_values?: LabelValue[] | undefined }): string[] {
  const values: string[] = [];
  for (const entry of record.label_values ?? []) {
    for (const item of entry.vec ?? []) {
      if (item.value !== undefined) values.push(demojibake(item.value));
    }
  }
  return values;
}

export function readMap(record: MapRecord): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, entry] of Object.entries(record.string_map_data ?? {})) {
    if (entry.value !== undefined) {
      output[key] = demojibake(entry.value);
    } else if (entry.timestamp !== undefined) {
      output[key] = String(entry.timestamp);
    }
  }
  return output;
}

export function readMapTimestamp(record: MapRecord, key: string): number {
  return record.string_map_data?.[key]?.timestamp ?? 0;
}
