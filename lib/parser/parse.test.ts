import { describe, expect, it } from "vitest";
import { ExportSource, normalizePath } from "@/lib/parser/source";
import { ExportFormatError, parseExport } from "@/lib/parser/parse";

function sourceOf(files: Record<string, unknown>): ExportSource {
  const source = new ExportSource();
  for (const [path, body] of Object.entries(files)) {
    source.add(path, () => Promise.resolve(JSON.stringify(body)));
  }
  return source;
}

function follower(username: string, at: number) {
  return { title: "", string_list_data: [{ value: username, timestamp: at }] };
}

function message(sender: string, at: number, extra: Record<string, unknown> = {}) {
  return { sender_name: sender, timestamp_ms: at * 1000, content: "hi", ...extra };
}

const BASE = {
  "personal_information/personal_information.json": {
    profile_user: [{ string_map_data: { Username: { value: "you" }, Name: { value: "You" } } }]
  }
};

describe("parseExport", () => {
  it("refuses an HTML export by name", async () => {
    const source = new ExportSource();
    source.add("your_instagram_activity/likes/liked_posts.html", () => Promise.resolve("<html>"));
    await expect(parseExport(source, () => undefined)).rejects.toBeInstanceOf(ExportFormatError);
    await expect(parseExport(source, () => undefined)).rejects.toThrow(/HTML export/);
  });

  it("refuses a folder with no JSON", async () => {
    await expect(parseExport(new ExportSource(), () => undefined)).rejects.toThrow(/No Instagram/);
  });

  it("merges every numbered follower file", async () => {
    const parsed = await parseExport(
      sourceOf({
        ...BASE,
        "connections/followers_and_following/followers_1.json": [follower("one", 100)],
        "connections/followers_and_following/followers_2.json": [follower("two", 200)],
        "connections/followers_and_following/followers_3.json": [follower("three", 300)]
      }),
      () => undefined
    );
    expect(parsed.model.followers.map((row) => row.username)).toEqual(["one", "two", "three"]);
  });

  it("groups a thread that continues in message_2.json", async () => {
    const parsed = await parseExport(
      sourceOf({
        ...BASE,
        "your_instagram_activity/messages/inbox/friend_123/message_1.json": {
          title: "Friend",
          participants: [{ name: "You" }, { name: "Friend" }],
          messages: [message("You", 300), message("Friend", 400)]
        },
        "your_instagram_activity/messages/inbox/friend_123/message_2.json": {
          title: "Friend",
          participants: [{ name: "You" }, { name: "Friend" }],
          messages: [message("You", 100), message("Friend", 200)]
        }
      }),
      () => undefined
    );
    expect(parsed.threads).toHaveLength(1);
    expect(parsed.threads[0]?.messages).toHaveLength(4);
    expect(parsed.threads[0]?.messages.map((row) => row.at)).toEqual([100, 200, 300, 400]);
  });

  it("reads the kind of every message", async () => {
    const parsed = await parseExport(
      sourceOf({
        ...BASE,
        "your_instagram_activity/messages/inbox/friend_123/message_1.json": {
          title: "Friend",
          participants: [{ name: "You" }, { name: "Friend" }],
          messages: [
            message("You", 1),
            message("You", 2, { share: { link: "x", original_content_owner: "OWNER" } }),
            message("You", 3, { photos: [{}] }),
            message("You", 4, { videos: [{}] }),
            message("You", 5, { audio_files: [{}] }),
            message("You", 6, { call_duration: 42 })
          ]
        }
      }),
      () => undefined
    );
    expect(parsed.threads[0]?.messages.map((row) => row.kind)).toEqual([
      "text",
      "share",
      "photo",
      "video",
      "audio",
      "call"
    ]);
    expect(parsed.threads[0]?.messages[1]?.sharedFrom).toBe("owner");
  });

  it("reports a missing file as absent, and never throws on one", async () => {
    const parsed = await parseExport(sourceOf(BASE), () => undefined);
    const absent = parsed.model.coverage.filter((row) => !row.found);
    expect(absent.length).toBeGreaterThan(5);
    expect(parsed.model.likedPosts).toEqual([]);
  });

  it("reports the progress with a running file count", async () => {
    const seen: number[] = [];
    await parseExport(sourceOf(BASE), (progress) => {
      seen.push(progress.percent);
    });
    expect(seen.length).toBeGreaterThan(5);
    expect(seen[0] ?? 0).toBeLessThan(seen[seen.length - 1] ?? 0);
    expect(seen[seen.length - 1]).toBe(100);
  });
});

describe("normalizePath", () => {
  it("cuts everything above the export root", () => {
    expect(normalizePath("meta-2026/your_instagram_activity/likes/liked_posts.json")).toBe(
      "your_instagram_activity/likes/liked_posts.json"
    );
  });

  it("turns a Windows separator into a slash", () => {
    expect(normalizePath("media\\stories.json")).toBe("media/stories.json");
  });
});
