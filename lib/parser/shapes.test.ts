import { describe, expect, it } from "vitest";
import { readHashtags, readLabels, readMap, readOwner, readVector } from "@/lib/parser/shapes";

function metaText(value: string): string {
  return Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join("");
}

const owner = {
  title: "Owner",
  dict: [
    {
      title: "",
      dict: [
        { label: "URL", value: "" },
        { label: "Name", value: metaText("Kemalizm Tarihi") },
        { label: "Username", value: "KemalizmTarihi" }
      ]
    }
  ]
};

describe("readLabels", () => {
  it("reads the label_values form and decodes every value", () => {
    const labels = readLabels({
      label_values: [
        { label: "Caption", value: metaText("keşfet") },
        { label: "Creation time", timestamp_value: 1700000000 },
        { label: "URL", href: "https://www.instagram.com/p/abc/" }
      ]
    });
    expect(labels.Caption).toBe("keşfet");
    expect(labels["Creation time"]).toBe("1700000000");
    expect(labels.URL).toBe("https://www.instagram.com/p/abc/");
  });
});

describe("readMap", () => {
  it("reads the string_map_data form", () => {
    const fields = readMap({
      string_map_data: {
        "IP Address": { value: "10.0.0.1" },
        Time: { timestamp: 1700000000 }
      }
    });
    expect(fields["IP Address"]).toBe("10.0.0.1");
    expect(fields.Time).toBe("1700000000");
  });
});

describe("readOwner", () => {
  it("reads an Owner at the top level", () => {
    expect(readOwner({ label_values: [owner] })).toEqual({
      username: "kemalizmtarihi",
      name: "Kemalizm Tarihi"
    });
  });

  it("reads an Owner nested inside a Media group", () => {
    const record = { label_values: [{ title: "Media", dict: [{ title: "", dict: [owner] }] }] };
    expect(readOwner(record)?.username).toBe("kemalizmtarihi");
  });

  it("reads an Owner nested inside another Owner", () => {
    const record = {
      label_values: [
        { title: "Owner", dict: [{ title: "", dict: [{ label: "Caption", value: "x" }, owner] }] }
      ]
    };
    expect(readOwner(record)?.username).toBe("kemalizmtarihi");
  });

  it("returns null when no group carries a username", () => {
    expect(readOwner({ label_values: [{ title: "Brand partner", dict: [] }] })).toBeNull();
  });
});

describe("readHashtags", () => {
  it("lowercases every tag and drops a repeat inside one post", () => {
    const record = {
      label_values: [
        {
          title: "Hashtags",
          dict: [
            { title: "", dict: [{ label: "Name", value: "Kesfet" }] },
            { title: "", dict: [{ label: "Name", value: "kesfet" }] },
            { title: "", dict: [{ label: "Name", value: "reels" }] }
          ]
        }
      ]
    };
    expect(readHashtags(record)).toEqual(["kesfet", "reels"]);
  });
});

describe("readVector", () => {
  it("reads a vec and decodes every entry", () => {
    const rows = readVector({
      label_values: [{ label: "Name", vec: [{ value: metaText("Öztürk") }, { value: "Shopify" }] }]
    });
    expect(rows).toEqual(["Öztürk", "Shopify"]);
  });
});
