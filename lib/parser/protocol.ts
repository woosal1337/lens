import type { DayEntry } from "@/lib/analysis/timeline";
import type { People } from "@/lib/analysis/people";
import type { PersonEvent } from "@/lib/analysis/person";
import type { MessageProfile } from "@/lib/analysis/threads";
import type { BarPoint } from "@/lib/analysis/buckets";
import type {
  ExportModel,
  MessageKind,
  ParseProgress,
  Thread,
  ThreadMessage
} from "@/lib/parser/model";
import type { PickedFile } from "@/lib/parser/source";

export type SearchRow = {
  key: string;
  thread: string;
  sender: string;
  at: number;
  body: string;
  kind: MessageKind;
  sharedFrom: string;
};

export type ShareRow = { owner: string; shares: number; senders: number; last: number };

export type ThreadPage = {
  id: string;
  title: string;
  participants: string[];
  total: number;
  you: string;
  rows: ThreadMessage[];
};

export type PersonTalk = {
  events: PersonEvent[];
  messages: number;
  sent: number;
  threads: number;
  sharesFromThem: number;
};

export type WorkerRequest =
  | { id: number; kind: "parse"; files: PickedFile[] }
  | { id: number; kind: "seed"; model: ExportModel; threads: Thread[] }
  | { id: number; kind: "messageProfile" }
  | { id: number; kind: "people" }
  | { id: number; kind: "messageSearch"; query: string }
  | { id: number; kind: "shareOwners" }
  | { id: number; kind: "messageMonths" }
  | { id: number; kind: "personTalk"; username: string; name: string }
  | { id: number; kind: "dayEntries"; day: string }
  | { id: number; kind: "threadMessages"; threadId: string; limit: number };

export type WorkerReply =
  | { id: number; kind: "progress"; progress: ParseProgress }
  | { id: number; kind: "parse"; model: ExportModel }
  | { id: number; kind: "seed" }
  | { id: number; kind: "messageProfile"; profile: MessageProfile }
  | { id: number; kind: "people"; people: People }
  | { id: number; kind: "messageSearch"; rows: SearchRow[]; total: number }
  | { id: number; kind: "shareOwners"; rows: ShareRow[] }
  | { id: number; kind: "messageMonths"; months: BarPoint[] }
  | { id: number; kind: "personTalk"; talk: PersonTalk }
  | { id: number; kind: "dayEntries"; entries: DayEntry[] }
  | { id: number; kind: "threadMessages"; page: ThreadPage | null }
  | { id: number; kind: "error"; message: string; format: boolean };
