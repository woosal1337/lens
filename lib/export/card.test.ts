import { describe, expect, it, vi } from "vitest";
import { drawCard } from "@/lib/export/card";

describe("share card privacy", () => {
  it("draws the translated footer and never draws a legacy account handle", () => {
    const fillText = vi.fn();
    const context = {
      fillText,
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn()
    };
    const canvas = { getContext: () => context } as unknown as HTMLCanvasElement;
    const plan = {
      shape: "square" as const,
      handle: "@private_account",
      footer: "Hiçbir veri yüklenmedi.",
      stats: [{ label: "Verdiğim beğeniler", value: "42", hint: "Bu dışa aktarımda" }],
      palette: {
        ground: "transparent",
        ink: "transparent",
        muted: "transparent",
        subtle: "transparent",
        line: "transparent",
        signal: "transparent"
      },
      sans: "Inter",
      mono: "monospace"
    };
    drawCard(canvas, plan);
    const drawn = fillText.mock.calls.map((call) => String(call[0]));
    expect(drawn).toContain(plan.footer);
    expect(drawn).not.toContain(plan.handle);
    expect(drawn.join(" ")).not.toContain("private_account");
  });
});
