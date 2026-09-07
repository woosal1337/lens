import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator, isLanguage } from "@/lib/i18n/translate";
import { turkish } from "@/lib/i18n/messages";
import { buildPersonRecord } from "@/lib/analysis/person";
import { buildGraph } from "@/lib/analysis/graph";
import { syntheticExport } from "@/lib/fixture/synthetic";
import { foldForSearch } from "@/lib/parser/text";

const english = createTranslator("en");
const turkishText = createTranslator("tr");
const placeholders = (value: string) =>
  [...value.matchAll(/\{\d+\}/g)].map((match) => match[0]).sort();

describe("translations", () => {
  it("keeps all variables in every Turkish message", () => {
    for (const [source, translated] of Object.entries(turkish)) {
      expect(translated.trim().length, source).toBeGreaterThan(0);
      expect(placeholders(translated), source).toEqual(placeholders(source));
    }
  });

  it("changes word order without changing the supplied data", () => {
    expect(english("{0} likes across {1} months", [12, 3])).toBe("12 likes across 3 months");
    expect(turkishText("{0} likes across {1} months", [12, 3])).toBe("3 ayda 12 beğeni");
    expect(
      turkishText(
        "Every record about @{0}, newest first. Each row came from a file in your folder.",
        ["İpek_ışık"]
      )
    ).toContain("@İpek_ışık");
  });

  it("keeps interpolated text escaped and supports rich values", () => {
    const content = turkishText.rich("You follow {0} accounts.", [
      createElement("strong", null, "<private>")
    ]);
    expect(renderToStaticMarkup(createElement("p", null, content))).toBe(
      "<p><strong>&lt;private&gt;</strong> hesabı takip ediyorsunuz.</p>"
    );
  });

  it("formats numbers and dates without changing the stored values", () => {
    expect(english.count(12345)).toBe("12,345");
    expect(turkishText.count(12345)).toBe("12.345");
    expect(turkishText.decimal(12.5, 2)).toBe("12,50");
    expect(english.decimal(12.5, 2)).toBe("12.50");
    expect(turkishText.percent(1, 4)).toBe("%25");
    expect(turkishText.isoDate(1704067200)).toBe("01.01.2024");
    expect(english.isoDate(1704067200)).toBe("2024-01-01");
    expect(turkishText.isoDate(0)).toBe("—");
  });

  it("rejects unsupported language preferences", () => {
    expect(isLanguage("tr")).toBe(true);
    expect(isLanguage("en")).toBe(true);
    expect(isLanguage("TR")).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });

  it("keeps a caption that matches interface text as account data", () => {
    const { model } = syntheticExport();
    const owner = model.following[0]?.username ?? "sample";
    const original = "You liked a story";
    model.likedPosts = [
      { owner, caption: original, at: 1704067200, url: "", ownerName: "", hashtags: [] }
    ];
    const record = buildPersonRecord(model, buildGraph(model), owner);
    const event = record?.events.find((row) => row.kind === "postLike");
    expect(event?.detail).toBe(original);
    expect(event?.display).toBeUndefined();
    expect(model.likedPosts[0]?.caption).toBe(original);
  });

  it("finds Turkish words with either dotted or dotless search letters", () => {
    expect(foldForSearch("Bağlantılar IŞIK İstanbul")).toBe("baglantilar isik istanbul");
  });
});
