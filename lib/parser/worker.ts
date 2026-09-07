import { buildGraph } from "@/lib/analysis/graph";
import { buildPeople } from "@/lib/analysis/people";
import { messageEvents } from "@/lib/analysis/person";
import { buildMessageProfile } from "@/lib/analysis/threads";
import { toMonthly } from "@/lib/analysis/buckets";
import { dayMessages } from "@/lib/analysis/timeline";
import { isEmptyQuery, parseQuery } from "@/lib/analysis/message-query";
import { ExportFormatError, parseExport } from "@/lib/parser/parse";
import { ExportSource } from "@/lib/parser/source";
import { foldForSearch } from "@/lib/parser/text";
import type { ExportModel, Thread } from "@/lib/parser/model";
import type { SearchRow, ShareRow, WorkerReply, WorkerRequest } from "@/lib/parser/protocol";

const RESULT_CAP = 5000;

let model: ExportModel | null = null;
let threads: Thread[] = [];
let index: { row: SearchRow; haystack: string; threadFold: string; senderFold: string }[] = [];

function post(reply: WorkerReply) {
  self.postMessage(reply);
}

function buildIndex() {
  index = [];
  for (const thread of threads) {
    const title = thread.title.length > 0 ? thread.title : "Unnamed conversation";
    const threadFold = foldForSearch(title);
    thread.messages.forEach((message, step) => {
      const body = message.body.length > 0 ? message.body : message.shareText;
      index.push({
        row: {
          key: `${thread.id}-${step}`,
          thread: title,
          sender: message.sender,
          at: message.at,
          body,
          kind: message.kind,
          sharedFrom: message.sharedFrom
        },
        haystack: foldForSearch(`${body} ${message.shareText}`),
        threadFold,
        senderFold: foldForSearch(message.sender)
      });
    });
  }
}

function shareOwners(): ShareRow[] {
  const groups = new Map<string, { shares: number; senders: Set<string>; last: number }>();
  for (const thread of threads) {
    for (const message of thread.messages) {
      if (message.sharedFrom.length === 0) continue;
      const found = groups.get(message.sharedFrom) ?? { shares: 0, senders: new Set(), last: 0 };
      found.shares += 1;
      found.senders.add(message.sender);
      found.last = Math.max(found.last, message.at);
      groups.set(message.sharedFrom, found);
    }
  }
  return [...groups.entries()]
    .map(([owner, value]) => ({
      owner,
      shares: value.shares,
      senders: value.senders.size,
      last: value.last
    }))
    .sort((left, right) => right.shares - left.shares);
}

function search(query: string) {
  const parsed = parseQuery(query);
  if (isEmptyQuery(parsed)) {
    return { rows: index.slice(0, RESULT_CAP).map((entry) => entry.row), total: index.length };
  }
  const rows: SearchRow[] = [];
  let total = 0;
  for (const entry of index) {
    if (parsed.text.length > 0 && !entry.haystack.includes(parsed.text)) continue;
    if (parsed.from.length > 0 && !entry.senderFold.includes(parsed.from)) continue;
    if (parsed.thread.length > 0 && !entry.threadFold.includes(parsed.thread)) continue;
    if (parsed.shared.length > 0 && !entry.row.sharedFrom.includes(parsed.shared)) continue;
    if (parsed.kind.length > 0 && entry.row.kind !== parsed.kind) continue;
    total += 1;
    if (rows.length < RESULT_CAP) rows.push(entry.row);
  }
  return { rows, total };
}

function sourceFrom(files: readonly { path: string; file: File }[]): ExportSource {
  const source = new ExportSource();
  for (const entry of files) {
    if (entry.path.endsWith(".json") && entry.file.size > 128 * 1024 * 1024)
      throw new ExportFormatError(
        "A JSON file exceeds 128 MB. Request a smaller export from Meta."
      );
    source.add(entry.path, () => entry.file.text());
  }
  return source;
}

async function run(request: WorkerRequest) {
  const { id } = request;

  if (request.kind === "parse") {
    const source = sourceFrom(request.files);
    const parsed = await parseExport(source, (progress) => {
      post({ id, kind: "progress", progress });
    });
    model = parsed.model;
    threads = parsed.threads;
    buildIndex();
    post({ id, kind: "parse", model: parsed.model });
    return;
  }

  if (request.kind === "seed") {
    model = request.model;
    threads = request.threads;
    buildIndex();
    post({ id, kind: "seed" });
    return;
  }

  if (model === null) {
    post({ id, kind: "error", message: "No export is open in the worker.", format: false });
    return;
  }

  switch (request.kind) {
    case "messageProfile":
      post({
        id,
        kind: "messageProfile",
        profile: buildMessageProfile(threads, model.profile.name)
      });
      return;
    case "people":
      post({
        id,
        kind: "people",
        people: buildPeople(model, threads, buildGraph(model), Date.now() / 1000)
      });
      return;
    case "messageSearch": {
      const found = search(request.query);
      post({ id, kind: "messageSearch", rows: found.rows, total: found.total });
      return;
    }
    case "shareOwners":
      post({ id, kind: "shareOwners", rows: shareOwners() });
      return;
    case "messageMonths":
      post({
        id,
        kind: "messageMonths",
        months: toMonthly(threads.flatMap((thread) => thread.messages.map((row) => row.at)))
      });
      return;
    case "personTalk":
      post({
        id,
        kind: "personTalk",
        talk: messageEvents(threads, model.profile.name, request.username, request.name)
      });
      return;
    case "dayEntries":
      post({ id, kind: "dayEntries", entries: dayMessages(threads, request.day) });
      return;
    case "threadMessages": {
      const thread = threads.find((row) => row.id === request.threadId);
      post({
        id,
        kind: "threadMessages",
        page:
          thread === undefined
            ? null
            : {
                id: thread.id,
                title: thread.title,
                participants: thread.participants,
                total: thread.messages.length,
                you: model.profile.name,
                rows: thread.messages.slice(Math.max(0, thread.messages.length - request.limit))
              }
      });
    }
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  void run(event.data).catch((cause: unknown) => {
    post({
      id: event.data.id,
      kind: "error",
      message:
        cause instanceof ExportFormatError
          ? cause.message
          : "Lens could not read that folder. Choose the folder you unzipped from Meta.",
      format: cause instanceof ExportFormatError
    });
  });
};
