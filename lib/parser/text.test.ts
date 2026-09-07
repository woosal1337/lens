import { describe, expect, it } from "vitest";
import { decodeReaction, demojibake, foldForSearch, normalizeEmoji } from "@/lib/parser/text";

function asMetaWritesIt(value: string): string {
  return Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join("");
}

describe("demojibake", () => {
  it("decodes UTF-8 that Meta escaped as Latin-1", () => {
    for (const value of ["EĞER BİR GÜN BAŞINIZA GELİRSE 🤭", "keşfet", "𝓲𝓭𝓲𝓵 ⋆", "Öztürk"]) {
      expect(demojibake(asMetaWritesIt(value))).toBe(value);
    }
  });

  it("leaves plain ASCII untouched", () => {
    expect(demojibake("hello world")).toBe("hello world");
  });

  it("returns the input when the bytes are not valid UTF-8", () => {
    expect(demojibake("ÿþ")).toBe("ÿþ");
  });
});

describe("decodeReaction", () => {
  it("decodes the hex form Meta uses for 39 of the reactions", () => {
    expect(decodeReaction("e29da4")).toBe("❤");
  });

  it("decodes the mojibake form Meta uses for the rest", () => {
    expect(decodeReaction(asMetaWritesIt("❤️"))).toBe("❤️");
  });
});

describe("normalizeEmoji", () => {
  it("folds the variation selector, so one heart stays one heart", () => {
    expect(normalizeEmoji("❤️")).toBe(normalizeEmoji("❤"));
  });
});

describe("foldForSearch", () => {
  it("strips the case and the accents", () => {
    expect(foldForSearch("Gördün MÜ")).toBe("gordun mu");
  });
});
