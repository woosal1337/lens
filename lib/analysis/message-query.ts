import type { MessageKind } from "@/lib/parser/model";
import { foldForSearch } from "@/lib/parser/text";

export type MessageQuery = {
  text: string;
  from: string;
  thread: string;
  kind: MessageKind | "";
  shared: string;
};

export type QueryField = "from" | "in" | "has" | "shared";

const KINDS: readonly MessageKind[] = ["text", "share", "photo", "video", "audio", "call"];

const EMPTY: MessageQuery = { text: "", from: "", thread: "", kind: "", shared: "" };

export function parseQuery(input: string): MessageQuery {
  const query = { ...EMPTY };
  const free: string[] = [];

  for (const token of input.trim().split(/\s+/)) {
    if (token.length === 0) continue;
    const split = token.indexOf(":");
    const field = split > 0 ? token.slice(0, split).toLowerCase() : "";
    const value = split > 0 ? token.slice(split + 1) : "";

    if (field === "from" && value.length > 0) query.from = foldForSearch(value);
    else if (field === "in" && value.length > 0) query.thread = foldForSearch(value);
    else if (field === "shared" && value.length > 0) query.shared = foldForSearch(value);
    else if (field === "has" && KINDS.includes(value.toLowerCase() as MessageKind)) {
      query.kind = value.toLowerCase() as MessageKind;
    } else free.push(token);
  }

  query.text = foldForSearch(free.join(" "));
  return query;
}

export function isEmptyQuery(query: MessageQuery): boolean {
  return (
    query.text.length === 0 &&
    query.from.length === 0 &&
    query.thread.length === 0 &&
    query.shared.length === 0 &&
    query.kind.length === 0
  );
}
