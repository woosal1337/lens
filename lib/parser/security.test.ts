import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { unpackArchives } from "@/lib/parser/archive";
import { ExportSource } from "@/lib/parser/source";
import { parseExport } from "@/lib/parser/parse";
import { toCsv } from "@/lib/export/csv";
import { comparisonIssue, diffSnapshots, snapshotOf } from "@/lib/analysis/diff";
import { syntheticExport } from "@/lib/fixture/synthetic";

function zipFile(entries: Record<string, Uint8Array>) {
  return new File([new Uint8Array(zipSync(entries))], "export.zip");
}

describe("untrusted imports", () => {
  it("reads zipped JSON and media while ignoring unrelated files", async () => {
    const files = await unpackArchives([
      zipFile({
        "connections/followers_1.json": strToU8("[]"),
        "media/photo.jpg": new Uint8Array([1, 2]),
        "program.exe": new Uint8Array([3])
      })
    ]);
    expect(files.map((file) => file.path)).toEqual([
      "connections/followers_1.json",
      "media/photo.jpg"
    ]);
    expect(await files[0]?.file.text()).toBe("[]");
  });

  it("refuses declared expansion above the memory limit", async () => {
    const bytes = zipSync({ "data.json": strToU8("[]") });
    new DataView(bytes.buffer).setUint32(22, 513 * 1024 * 1024, true);
    await expect(
      unpackArchives([new File([new Uint8Array(bytes)], "oversized.zip")])
    ).rejects.toThrow(/memory limit/);
  });

  it("does not replace duplicate files silently", () => {
    const source = new ExportSource();
    source.add("part-one/connections/followers_1.json", () => Promise.resolve("[]"));
    expect(() => {
      source.add("part-two/connections/followers_1.json", () => Promise.resolve("[]"));
    }).toThrow(/Duplicate/);
  });

  it("distinguishes an empty file from a malformed file", async () => {
    const source = new ExportSource();
    source.add("empty.json", () => Promise.resolve(" \n "));
    source.add("broken.json", () => Promise.resolve("{broken"));
    expect(await source.readJson(source.find("empty.json"))).toBeNull();
    await expect(source.readJson(source.find("broken.json"))).rejects.toThrow();
  });

  it("reports present empty relationship files as found", async () => {
    const source = new ExportSource();
    source.add("connections/followers_and_following/followers_1.json", () => Promise.resolve("[]"));
    source.add("connections/followers_and_following/following.json", () =>
      Promise.resolve('{"relationships_following":[]}')
    );
    const { model } = await parseExport(source, () => undefined);
    expect(
      model.coverage
        .filter((row) => ["Followers", "Following"].includes(row.label))
        .map((row) => [row.found, row.records])
    ).toEqual([
      [true, 0],
      [true, 0]
    ]);
  });
});

describe("spreadsheet exports", () => {
  it.each(["=1+1", "+1+1", "-1+1", "@SUM(1)", "  =1+1", "\t=1+1", "\n=1+1"])(
    "neutralizes a formula: %j",
    (value) => {
      expect(toCsv([{ header: "value", value: (row: string) => row }], [value])).toContain("'");
    }
  );
  it("preserves numeric negatives and escapes delimiters", () => {
    expect(toCsv([{ header: "value", value: (row: number) => row }], [-2])).toContain("\r\n-2\r\n");
    expect(toCsv([{ header: "value", value: (row: string) => row }], ['a,"b"'])).toContain(
      '"a,""b"""'
    );
  });
});

describe("export comparisons", () => {
  const { model } = syntheticExport();
  const from = {
    ...snapshotOf(model, "old"),
    account: "sample",
    complete: true,
    dated: true,
    at: 100,
    pending: new Set(["accepted", "dropped"])
  };
  const to = {
    ...from,
    at: 200,
    pending: new Set<string>(),
    following: new Set(["accepted"]),
    followers: new Set(["dropped"])
  };
  it("uses outgoing follows to identify accepted requests", () => {
    const changes = diffSnapshots(from, to).changes;
    expect(
      changes.filter((row) => row.kind === "requestAccepted").map((row) => row.username)
    ).toEqual(["accepted"]);
    expect(
      changes.filter((row) => row.kind === "requestDropped").map((row) => row.username)
    ).toEqual(["dropped"]);
  });
  it("rejects account, coverage, and date mismatches", () => {
    expect(comparisonIssue(from, to)).toBeNull();
    expect(comparisonIssue(from, { ...to, account: "other" })).toMatch(/same account/);
    expect(comparisonIssue(from, { ...to, complete: false })).toMatch(/Both exports/);
    expect(comparisonIssue(from, { ...to, dated: false })).toMatch(/dates/);
    expect(comparisonIssue(from, { ...to, at: from.at })).toMatch(/dates/);
  });
});
