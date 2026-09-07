import { describe, expect, it } from "vitest";
import { buildGraph } from "@/lib/analysis/graph";
import { buildGrowth } from "@/lib/analysis/growth";
import { buildHandleMap, foldName, resolveName } from "@/lib/analysis/handles";
import { isEmptyQuery, parseQuery } from "@/lib/analysis/message-query";
import { buildPeople } from "@/lib/analysis/people";
import { buildMessageProfile } from "@/lib/analysis/threads";
import { buildTimeline, dayEntries } from "@/lib/analysis/timeline";
import { describeAgent } from "@/lib/analysis/agent";
import { diffSnapshots, snapshotOf } from "@/lib/analysis/diff";
import { verdict } from "@/lib/analysis/verdict";
import { toPlaces } from "@/lib/analysis/places";
import { syntheticExport } from "@/lib/fixture/synthetic";

const sample = syntheticExport();
const { model, threads } = sample;
const graph = buildGraph(model);
const NOW = 1787860000;

describe("buildGraph", () => {
  it("splits the follow graph into mutual, no-follow-back and fans", () => {
    const seen = new Set([...graph.mutual, ...graph.noFollowBack, ...graph.fans]);
    expect(graph.mutual.length + graph.noFollowBack.length).toBe(model.following.length);
    expect(graph.mutual.length + graph.fans.length).toBe(model.followers.length);
    expect(seen.size).toBe(graph.mutual.length + graph.noFollowBack.length + graph.fans.length);
  });

  it("counts a cold mutual as one with no post like and no story like", () => {
    for (const username of graph.coldMutuals) {
      const account = graph.accounts.get(username);
      expect(account?.postLikes).toBe(0);
      expect(account?.storyLikes).toBe(0);
    }
  });
});

describe("buildMessageProfile", () => {
  const profile = buildMessageProfile(threads, model.profile.name);

  it("counts every message once, on one side or the other", () => {
    const total = threads.reduce((sum, thread) => sum + thread.messages.length, 0);
    expect(profile.sent + profile.received).toBe(total);
  });

  it("measures a reply from their last message, not their first", () => {
    const gaps = buildMessageProfile(
      [
        {
          id: "t",
          title: "T",
          folder: "inbox",
          participants: ["You", "Them"],
          messages: [
            {
              sender: "Them",
              at: 0,
              body: "",
              kind: "text",
              sharedFrom: "",
              sharedProfile: "",
              shareText: "",
              link: "",
              reactions: []
            },
            {
              sender: "Them",
              at: 900,
              body: "",
              kind: "text",
              sharedFrom: "",
              sharedProfile: "",
              shareText: "",
              link: "",
              reactions: []
            },
            {
              sender: "You",
              at: 960,
              body: "",
              kind: "text",
              sharedFrom: "",
              sharedProfile: "",
              shareText: "",
              link: "",
              reactions: []
            }
          ]
        }
      ],
      "You"
    );
    expect(gaps.medianReply).toBe(60);
  });
});

describe("buildGrowth", () => {
  const growth = buildGrowth(model, NOW);

  it("counts each follow once, in the year you followed", () => {
    const dated = model.following.filter((row) => row.followedAt > 0).length;
    expect(growth.followBack.reduce((sum, row) => sum + row.followed, 0)).toBe(dated);
  });

  it("never reports a rate above one", () => {
    for (const row of growth.followBack) {
      expect(row.followedBack).toBeLessThanOrEqual(row.followed);
      expect(row.rate).toBeLessThanOrEqual(1);
    }
  });

  it("grows the curve every year, because the list is a survivor list", () => {
    for (let index = 1; index < growth.curve.length; index += 1) {
      expect(growth.curve[index]!.followers).toBeGreaterThanOrEqual(
        growth.curve[index - 1]!.followers
      );
    }
  });
});

describe("buildTimeline", () => {
  const timeline = buildTimeline(model, []);

  it("marks the 30-day stream as short and no other", () => {
    expect(timeline.streams.filter((row) => row.short).map((row) => row.id)).toEqual([
      "storyViews"
    ]);
  });

  it("drops a date outside 2010 to 2030", () => {
    const broken = { ...model, saved: [{ owner: "x", at: 4933699200, url: "", caption: "" }] };
    const built = buildTimeline(broken, []);
    expect(built.streams.find((row) => row.id === "saved")?.total).toBe(0);
  });

  it("lists a day in order", () => {
    const day = new Date(model.likedPosts[0]!.at * 1000).toISOString().slice(0, 10);
    const entries = dayEntries(model, day);
    for (let index = 1; index < entries.length; index += 1) {
      expect(entries[index]!.at).toBeGreaterThanOrEqual(entries[index - 1]!.at);
    }
  });
});

describe("buildHandleMap", () => {
  const handles = buildHandleMap(model);

  it("folds a name the same way whatever the case or the accent", () => {
    expect(foldName("Ayşe Öztürk")).toBe(foldName("ayse ozturk"));
  });

  it("resolves a name that maps to one account", () => {
    const match = resolveName(handles, "Aylin Demir");
    expect(match?.username).toBe("aylin.demir");
    expect(match?.ambiguous).toBe(false);
  });

  it("never guesses when a name maps to two accounts", () => {
    const twin = {
      ...model,
      followers: [
        ...model.followers,
        { username: "twin_one", name: "Same Name", url: "", followedAt: 1 },
        { username: "twin_two", name: "Same Name", url: "", followedAt: 2 }
      ]
    };
    const match = resolveName(buildHandleMap(twin), "Same Name");
    expect(match?.ambiguous).toBe(true);
    expect(match?.username).toBe("");
    expect(match?.candidates).toHaveLength(2);
  });
});

describe("buildPeople", () => {
  const people = buildPeople(model, threads, graph, NOW);

  it("scores every person between 0 and 100", () => {
    for (const row of people.rows) {
      expect(row.score).toBeGreaterThanOrEqual(0);
      expect(row.score).toBeLessThanOrEqual(100);
    }
  });

  it("never scores a person above their lifetime score", () => {
    for (const row of people.rows) expect(row.score).toBeLessThanOrEqual(row.lifetime);
  });

  it("drops the Instagram User placeholder", () => {
    expect(people.rows.some((row) => row.name.toLowerCase() === "instagram user")).toBe(false);
  });
});

describe("parseQuery", () => {
  it("reads every typed field", () => {
    const query = parseQuery("from:Ayda in:Friends has:share shared:bpthaber kahve");
    expect(query.from).toBe("ayda");
    expect(query.thread).toBe("friends");
    expect(query.kind).toBe("share");
    expect(query.shared).toBe("bpthaber");
    expect(query.text).toBe("kahve");
  });

  it("treats an unknown field as free text", () => {
    expect(parseQuery("colour:red").text).toBe("colour:red");
  });

  it("knows an empty query", () => {
    expect(isEmptyQuery(parseQuery("   "))).toBe(true);
    expect(isEmptyQuery(parseQuery("has:audio"))).toBe(false);
  });
});

describe("describeAgent", () => {
  it("reads every user agent form in the export", () => {
    expect(describeAgent("C++/THttpClient").client).toBe("Meta internal client");
    expect(describeAgent("").client).toBe("Not recorded");
    expect(
      describeAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"
      )
    ).toEqual({ client: "Chrome 146", platform: "macOS", device: "" });
    expect(
      describeAgent(
        "Instagram 169.0.0.21.133 (iPhone10,6; iOS 14_2; en_TR; en-TR; scale=3.00; 1125x2436; 261791898) AppleWebKit/420+"
      )
    ).toEqual({ client: "Instagram 169.0", platform: "iOS 14.2", device: "iPhone10,6" });
    expect(
      describeAgent(
        "Instagram 136.0.0.34.124 Android (29/10; 408dpi; 1080x2259; HUAWEI; POT-LX1; HWPOT-H; kirin710; en_TR; 208061732)"
      )
    ).toEqual({ client: "Instagram 136.0", platform: "Android 10", device: "HUAWEI POT-LX1" });
  });
});

describe("diffSnapshots", () => {
  it("names everybody who left, and nobody who stayed", () => {
    const older = snapshotOf(model, "older");
    const newer = snapshotOf({ ...model, followers: model.followers.slice(1) }, "newer");
    const gone = model.followers[0]!.username;
    const diff = diffSnapshots(older, newer);
    const left = diff.changes.filter((row) => row.kind === "unfollowedYou");
    expect(left.map((row) => row.username)).toEqual([gone]);
    expect(diff.netFollowers).toBe(-1);
  });

  it("reports no change when the two snapshots match", () => {
    const snapshot = snapshotOf(model, "same");
    expect(diffSnapshots(snapshot, snapshot).changes).toEqual([]);
  });
});

describe("verdict", () => {
  it("opens with the count of accounts you follow", () => {
    const said = verdict(model, graph);
    expect(said.segments[0]).toEqual({ kind: "text", text: "You follow " });
    expect(said.segments[1]).toEqual({
      kind: "figure",
      value: model.following.length,
      tone: "primary"
    });
  });

  it("names every finding that holds a value above zero", () => {
    const said = verdict(model, graph);
    const figures = said.segments.filter((part) => part.kind === "figure");
    const expected = [
      graph.noFollowBack.length,
      model.pendingOut.length,
      graph.coldMutuals.length
    ].filter((value) => value > 0);
    expect(figures.length).toBe(expected.length + 1);
  });

  it("writes one sentence that ends with a full stop", () => {
    const said = verdict(model, graph);
    expect(said.sentence.split(".").filter((part) => part.trim().length > 0).length).toBe(1);
    expect(said.sentence.endsWith(".")).toBe(true);
  });

  it("says everybody follows back when no finding holds a value", () => {
    const clean = { ...model, following: model.followers, pendingOut: [] };
    const cleanGraph = { ...graph, noFollowBack: [], coldMutuals: [] };
    const said = verdict(clean, cleanGraph);
    expect(said.hasFindings).toBe(false);
    expect(said.sentence).toContain("every one of them follows you back");
  });
});

describe("toPlaces", () => {
  const rows = [
    { latitude: "41.0082", longitude: "28.9784", at: 100, caption: "istanbul" },
    { latitude: "", longitude: "", at: 200, caption: "no place" },
    { latitude: "0", longitude: "0", at: 300, caption: "null island" },
    { latitude: "999", longitude: "12", at: 400, caption: "out of range" },
    { latitude: "-33.8688", longitude: "151.2093", at: 500, caption: "sydney" }
  ];

  it("keeps only a row that carries a real coordinate", () => {
    const points = toPlaces(rows);
    expect(points.length).toBe(2);
    expect(points.map((point) => point.caption)).toEqual(["istanbul", "sydney"]);
  });

  it("drops null island, a blank field and a value out of range", () => {
    const captions = toPlaces(rows).map((point) => point.caption);
    expect(captions).not.toContain("null island");
    expect(captions).not.toContain("no place");
    expect(captions).not.toContain("out of range");
  });

  it("reads the coordinate as a number", () => {
    const first = toPlaces(rows)[0];
    expect(first?.lat).toBeCloseTo(41.0082);
    expect(first?.lon).toBeCloseTo(28.9784);
  });
});
