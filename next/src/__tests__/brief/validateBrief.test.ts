import { describe, it, expect } from "vitest";
import { validateBrief } from "@/lib/agent/brief/validateBrief";
import type { VideoBrief } from "@/lib/agent/schemas/brief";

// ── Helpers ──────────────────────────────────────────────────────────────────

function validTwoColumnBrief(overrides: Partial<VideoBrief> = {}): VideoBrief {
  return {
    layout: "two-column",
    title: "Client–Server Architecture",
    subtitle: "How requests travel",
    leftHeader: "Client",
    rightHeader: "Server",
    leftRows: ["Browser", "DNS", "TLS"],
    rightRows: ["Load Balancer", "API", "Database"],
    flow: true,
    requestLabel: "REQUEST",
    responseLabel: "RESPONSE",
    processingSteps: ["Parse", "Query", "Cache"],
    palette: "midnight",
    style: "modern",
    ...overrides,
  };
}

function validSingleColumnBrief(overrides: Partial<VideoBrief> = {}): VideoBrief {
  return {
    layout: "single-column",
    title: "The Water Cycle",
    blocks: [
      { heading: "Evaporation", description: "Water heats up and rises." },
      { heading: "Condensation", description: "Vapour cools and forms clouds." },
      { heading: "Precipitation", description: "Water falls back to Earth." },
    ],
    palette: "midnight",
    style: "modern",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("validateBrief", () => {
  // ── 1. Valid brief passes through unchanged ────────────────────────────────

  it("passes a valid two-column brief through unchanged", () => {
    const brief = validTwoColumnBrief();
    const result = validateBrief(brief);
    expect(result.title).toBe("Client–Server Architecture");
    expect(result.layout).toBe("two-column");
    expect(result.palette).toBe("midnight");
    expect(result.style).toBe("modern");
    expect(result.leftRows).toEqual(["Browser", "DNS", "TLS"]);
    expect(result.rightRows).toEqual(["Load Balancer", "API", "Database"]);
  });

  it("passes a valid single-column brief through unchanged", () => {
    const brief = validSingleColumnBrief();
    const result = validateBrief(brief);
    expect(result.layout).toBe("single-column");
    expect(result.title).toBe("The Water Cycle");
    expect(result.blocks).toHaveLength(3);
    expect(result.blocks![0].heading).toBe("Evaporation");
  });

  // ── 2. Unknown palette / style fall back to defaults ──────────────────────

  it("replaces unknown palette with 'midnight'", () => {
    const result = validateBrief(validTwoColumnBrief({ palette: "does-not-exist" }));
    expect(result.palette).toBe("midnight");
  });

  it("replaces unknown style with 'modern'", () => {
    const result = validateBrief(validTwoColumnBrief({ style: "fantasy-wizard" }));
    expect(result.style).toBe("modern");
  });

  it("keeps valid palette unchanged", () => {
    const result = validateBrief(validTwoColumnBrief({ palette: "neon" }));
    expect(result.palette).toBe("neon");
  });

  it("keeps valid style unchanged", () => {
    const result = validateBrief(validTwoColumnBrief({ style: "brutalist" }));
    expect(result.style).toBe("brutalist");
  });

  // ── 3. leftRows with 7 items → truncated to 4 ────────────────────────────

  it("truncates leftRows with 7 items to 4", () => {
    const result = validateBrief(
      validTwoColumnBrief({
        leftRows: ["A", "B", "C", "D", "E", "F", "G"],
      }),
    );
    expect(result.leftRows).toHaveLength(4);
    expect(result.leftRows).toEqual(["A", "B", "C", "D"]);
  });

  it("truncates rightRows with 5 items to 4", () => {
    const result = validateBrief(
      validTwoColumnBrief({
        rightRows: ["X1", "X2", "X3", "X4", "X5"],
      }),
    );
    expect(result.rightRows).toHaveLength(4);
  });

  // ── 4. Missing title → defaults to "Untitled" ─────────────────────────────

  it("defaults missing title to 'Untitled'", () => {
    const result = validateBrief({ ...validTwoColumnBrief(), title: "" });
    expect(result.title).toBe("Untitled");
  });

  it("defaults absent title field to 'Untitled'", () => {
    const { title: _removed, ...rest } = validTwoColumnBrief();
    const result = validateBrief(rest);
    expect(result.title).toBe("Untitled");
  });

  // ── 5. Pads leftRows to minimum of 2 ──────────────────────────────────────

  it("pads leftRows shorter than 2 to minimum 2", () => {
    const result = validateBrief(validTwoColumnBrief({ leftRows: ["OnlyOne"] }));
    expect(result.leftRows).toHaveLength(2);
  });

  it("pads empty leftRows to 2 with placeholder labels", () => {
    const result = validateBrief(validTwoColumnBrief({ leftRows: [] }));
    expect(result.leftRows).toHaveLength(2);
    expect(result.leftRows![0]).toMatch(/Layer/);
  });

  // ── 6. Completely garbage input → returns a valid default brief ───────────

  it("handles null input gracefully", () => {
    const result = validateBrief(null);
    expect(result.title).toBe("Untitled");
    expect(result.palette).toBe("midnight");
    expect(result.style).toBe("modern");
    expect(["two-column", "single-column"]).toContain(result.layout);
  });

  it("handles a number as input", () => {
    const result = validateBrief(42);
    expect(result.title).toBe("Untitled");
    expect(result.palette).toBe("midnight");
  });

  it("handles an empty object", () => {
    const result = validateBrief({});
    expect(result.title).toBe("Untitled");
    expect(result.palette).toBe("midnight");
    expect(result.style).toBe("modern");
  });

  it("handles an array as input", () => {
    const result = validateBrief(["garbage", 123, null]);
    expect(result.title).toBe("Untitled");
  });

  it("handles a string as input", () => {
    const result = validateBrief("not a brief");
    expect(result.title).toBe("Untitled");
  });

  // ── 7. Blocks validation ──────────────────────────────────────────────────

  it("truncates blocks to 5", () => {
    const result = validateBrief(
      validSingleColumnBrief({
        blocks: [
          { heading: "A", description: "1" },
          { heading: "B", description: "2" },
          { heading: "C", description: "3" },
          { heading: "D", description: "4" },
          { heading: "E", description: "5" },
          { heading: "F", description: "6" },
        ],
      }),
    );
    expect(result.blocks).toHaveLength(5);
  });

  it("pads missing blocks to 2 with defaults", () => {
    const result = validateBrief(
      validSingleColumnBrief({ blocks: [{ heading: "One", description: "Only" }] }),
    );
    expect(result.blocks).toHaveLength(2);
  });

  it("single-column with no blocks field gets default 2 blocks", () => {
    const { blocks: _removed, ...rest } = validSingleColumnBrief();
    const result = validateBrief(rest);
    expect(result.blocks).toHaveLength(2);
  });
});
