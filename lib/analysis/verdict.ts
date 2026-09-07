import type { Graph } from "@/lib/analysis/graph";
import type { ExportModel } from "@/lib/parser/model";
import { count } from "@/lib/format";

export type VerdictTone = "primary" | "signal";

export type VerdictSegment =
  { kind: "text"; text: string } | { kind: "figure"; value: number; tone: VerdictTone };

export type Verdict = {
  segments: VerdictSegment[];
  sentence: string;
  hasFindings: boolean;
  following: number;
  findings: Finding[];
};

type Finding = { kind: "noFollowBack" | "pending" | "coldMutuals"; value: number; text: string };

const MAX_FINDINGS = 3;

function findings(model: ExportModel, graph: Graph): Finding[] {
  const all: Finding[] = [
    { kind: "noFollowBack", value: graph.noFollowBack.length, text: "do not follow you back" },
    { kind: "pending", value: model.pendingOut.length, text: "of your requests still wait" },
    {
      kind: "coldMutuals",
      value: graph.coldMutuals.length,
      text: "mutuals have no recorded likes from you"
    }
  ];
  return all.filter((row) => row.value > 0).slice(0, MAX_FINDINGS);
}

function join(rows: readonly Finding[]): VerdictSegment[] {
  const segments: VerdictSegment[] = [];
  rows.forEach((row, index) => {
    const last = index === rows.length - 1;
    const lead = index === 0 ? ", " : last ? ", and " : ", ";
    segments.push({ kind: "text", text: lead });
    segments.push({ kind: "figure", value: row.value, tone: "signal" });
    segments.push({ kind: "text", text: ` ${row.text}` });
  });
  return segments;
}

function flatten(segments: readonly VerdictSegment[]): string {
  return segments
    .map((part) => (part.kind === "text" ? part.text : count(part.value)))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function verdict(model: ExportModel, graph: Graph): Verdict {
  const following = model.following.length;
  const rows = findings(model, graph);

  const opening: VerdictSegment[] = [
    { kind: "text", text: "You follow " },
    { kind: "figure", value: following, tone: "primary" },
    { kind: "text", text: " accounts" }
  ];

  const closing: VerdictSegment[] =
    rows.length === 0
      ? [{ kind: "text", text: ", and every one of them follows you back." }]
      : [{ kind: "text", text: "." }];

  const segments = [...opening, ...join(rows), ...closing];
  return {
    segments,
    sentence: flatten(segments),
    hasFindings: rows.length > 0,
    following,
    findings: rows
  };
}
