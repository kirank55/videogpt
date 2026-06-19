import { describe, it, expect } from "vitest";
import {
  checkBackgroundPresence,
  checkTimingBoundaries,
  checkLayerOrdering,
  checkTextReadability,
  checkContentDensity,
  calculateScore,
  runQualityGate,
} from "@/lib/renderer";
import type { VideoProject, QualityIssue } from "@/lib/renderer";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE: VideoProject = {
  id: "test",
  name: "Test",
  width: 1920,
  height: 1080,
  duration: 10,
  events: [
    {
      id: "bg",
      type: "background",
      start: 0,
      end: 10,
      layer: 0,
      background: { kind: "solid", color: "#000" },
    },
    {
      id: "title",
      type: "text",
      start: 0,
      end: 10,
      layer: 1,
      text: "Hello World",
      x: 200,
      y: 200,
      maxWidth: 800,
      color: "#fff",
      fontSize: 64,
    },
  ],
};

function project(overrides: Partial<VideoProject> = {}): VideoProject {
  return { ...BASE, ...overrides };
}

function withoutBackground(): VideoProject {
  return project({
    events: BASE.events.filter((e) => e.type !== "background"),
  });
}

// ── checkBackgroundPresence ───────────────────────────────────────────────────

describe("checkBackgroundPresence", () => {
  it("returns no issues when a background event exists", () => {
    expect(checkBackgroundPresence(BASE)).toHaveLength(0);
  });

  it("returns a NO_BACKGROUND error when no background event", () => {
    const issues = checkBackgroundPresence(withoutBackground());
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("NO_BACKGROUND");
    expect(issues[0].severity).toBe("error");
  });
});

// ── checkTimingBoundaries ─────────────────────────────────────────────────────

describe("checkTimingBoundaries", () => {
  it("returns no issues for a valid project", () => {
    expect(checkTimingBoundaries(BASE)).toHaveLength(0);
  });

  it("returns EVENT_NEGATIVE_START for an event with start < 0", () => {
    const p = project({
      events: [
        { ...BASE.events[0], id: "bad-neg", start: -1, end: 5 },
      ],
    });
    const issues = checkTimingBoundaries(p);
    expect(issues.some((i) => i.code === "EVENT_NEGATIVE_START")).toBe(true);
  });

  it("returns EVENT_EXCEEDS_DURATION for an event with end > duration", () => {
    const p = project({
      duration: 5,
      events: [
        { ...BASE.events[0], id: "bad-end", start: 0, end: 9 },
      ],
    });
    const issues = checkTimingBoundaries(p);
    expect(issues.some((i) => i.code === "EVENT_EXCEEDS_DURATION")).toBe(true);
  });

  it("reports error when start >= end", () => {
    const p = project({
      events: [
        { ...BASE.events[0], id: "bad-order", start: 5, end: 5 },
      ],
    });
    const issues = checkTimingBoundaries(p);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("can report multiple issues per project", () => {
    const p = project({
      duration: 5,
      events: [
        { ...BASE.events[0], id: "ev1", start: -1, end: 9 }, // two issues
      ],
    });
    const issues = checkTimingBoundaries(p);
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });
});

// ── checkLayerOrdering ────────────────────────────────────────────────────────

describe("checkLayerOrdering", () => {
  it("returns no issues when background is on layer 0", () => {
    expect(checkLayerOrdering(BASE)).toHaveLength(0);
  });

  it("returns BACKGROUND_WRONG_LAYER when background is not on layer 0", () => {
    const p = project({
      events: [
        { ...BASE.events[0], layer: 3 }, // background on layer 3
        BASE.events[1],
      ],
    });
    const issues = checkLayerOrdering(p);
    expect(issues.some((i) => i.code === "BACKGROUND_WRONG_LAYER")).toBe(true);
    expect(issues[0].severity).toBe("warning");
  });
});

// ── checkTextReadability ──────────────────────────────────────────────────────

describe("checkTextReadability", () => {
  it("returns no issues for adequately-sized text in safe zone", () => {
    expect(checkTextReadability(BASE)).toHaveLength(0);
  });

  it("returns TEXT_TOO_SMALL for fontSize < 16", () => {
    const p = project({
      events: [
        BASE.events[0],
        {
          ...BASE.events[1],
          id: "small-text",
          fontSize: 10,
          x: 200,
          y: 200,
        } as typeof BASE.events[1],
      ],
    });
    const issues = checkTextReadability(p);
    expect(issues.some((i) => i.code === "TEXT_TOO_SMALL")).toBe(true);
    expect(issues[0].severity).toBe("warning");
  });

  it("returns TEXT_OUT_OF_SAFE_ZONE for text near edge", () => {
    const p = project({
      events: [
        BASE.events[0],
        {
          ...BASE.events[1],
          id: "edge-text",
          x: 10, // within 80px safe zone margin
          y: 200,
        } as typeof BASE.events[1],
      ],
    });
    const issues = checkTextReadability(p);
    expect(issues.some((i) => i.code === "TEXT_OUT_OF_SAFE_ZONE")).toBe(true);
  });
});

// ── checkContentDensity ───────────────────────────────────────────────────────

describe("checkContentDensity", () => {
  it("returns no issues for a project with title text", () => {
    expect(checkContentDensity(BASE)).toHaveLength(0);
  });

  it("returns NO_TEXT_CONTENT when there are no text events", () => {
    const p = project({
      events: [BASE.events[0]], // only background
    });
    const issues = checkContentDensity(p);
    expect(issues.some((i) => i.code === "NO_TEXT_CONTENT")).toBe(true);
    expect(issues[0].severity).toBe("error");
  });

  it("returns NO_TITLE when no text event has id='title'", () => {
    const p = project({
      events: [
        BASE.events[0],
        { ...BASE.events[1], id: "not-title" },
      ],
    });
    const issues = checkContentDensity(p);
    expect(issues.some((i) => i.code === "NO_TITLE")).toBe(true);
    expect(
      issues.find((i) => i.code === "NO_TITLE")!.severity,
    ).toBe("warning");
  });

  it("returns TOO_MANY_TEXT_EVENTS when > 20 text events", () => {
    const manyTextEvents = Array.from({ length: 21 }, (_, k) => ({
      ...BASE.events[1],
      id: `text-${k}`,
    }));
    const p = project({
      events: [BASE.events[0], ...manyTextEvents],
    });
    const issues = checkContentDensity(p);
    expect(issues.some((i) => i.code === "TOO_MANY_TEXT_EVENTS")).toBe(true);
    expect(
      issues.find((i) => i.code === "TOO_MANY_TEXT_EVENTS")!.severity,
    ).toBe("info");
  });
});

// ── calculateScore ────────────────────────────────────────────────────────────

describe("calculateScore", () => {
  it("returns 100 for no issues", () => {
    expect(calculateScore([])).toBe(100);
  });

  it("deducts 20 per error", () => {
    const issues: QualityIssue[] = [
      { eventId: "a", severity: "error", code: "X", message: "e1" },
      { eventId: "b", severity: "error", code: "X", message: "e2" },
    ];
    expect(calculateScore(issues)).toBe(100 - 40);
  });

  it("deducts 8 per warning", () => {
    const issues: QualityIssue[] = [
      { eventId: "a", severity: "warning", code: "X", message: "w1" },
      { eventId: "b", severity: "warning", code: "X", message: "w2" },
    ];
    expect(calculateScore(issues)).toBe(100 - 16);
  });

  it("deducts 2 per info", () => {
    const issues: QualityIssue[] = [
      { eventId: "a", severity: "info", code: "X", message: "i1" },
    ];
    expect(calculateScore(issues)).toBe(98);
  });

  it("floors at 0", () => {
    const issues: QualityIssue[] = Array.from({ length: 10 }, (_, k) => ({
      eventId: `e${k}`,
      severity: "error" as const,
      code: "X",
      message: "err",
    }));
    expect(calculateScore(issues)).toBe(0);
  });

  it("mixes error + warning + info correctly", () => {
    const issues: QualityIssue[] = [
      { eventId: "a", severity: "error",   code: "X", message: "" }, // -20
      { eventId: "b", severity: "warning", code: "X", message: "" }, // -8
      { eventId: "c", severity: "info",    code: "X", message: "" }, // -2
    ];
    expect(calculateScore(issues)).toBe(100 - 20 - 8 - 2);
  });
});

// ── runQualityGate ────────────────────────────────────────────────────────────

describe("runQualityGate", () => {
  it("returns passed:true and score:100 for a clean project", () => {
    const result = runQualityGate(BASE);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  it("excludes visual diagram elements starting with 'vis-' from layer collisions", () => {
    const p = project({
      events: [
        BASE.events[0], // background
        BASE.events[1], // title
        {
          id: "vis-shape-0",
          type: "shape",
          shapeType: "rect",
          start: 0,
          end: 10,
          layer: 2,
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          fill: "#ff0000",
        },
        {
          id: "vis-shape-1",
          type: "shape",
          shapeType: "rect",
          start: 0,
          end: 10,
          layer: 2,
          x: 120, // overlapping X
          y: 120, // overlapping Y
          width: 100,
          height: 100,
          fill: "#00ff00",
        },
      ],
    });
    const result = runQualityGate(p);
    expect(result.passed).toBe(true);
    const collisions = result.issues.filter((i) => i.code === "LAYER_COLLISION");
    expect(collisions).toHaveLength(0);
  });

  it("excludes block column layout elements from layer collisions", () => {
    const p = project({
      events: [
        BASE.events[0], // background
        {
          id: "block-heading-0",
          type: "text",
          start: 0,
          end: 10,
          layer: 4,
          text: "Heading",
          x: 100,
          y: 100,
          maxWidth: 500,
          color: "#fff",
          fontSize: 32,
        },
        {
          id: "block-desc-0",
          type: "text",
          start: 0,
          end: 10,
          layer: 4,
          text: "Description description description",
          x: 100,
          y: 120, // overlapping Y
          maxWidth: 500,
          color: "#fff",
          fontSize: 24,
        },
      ],
    });
    const result = runQualityGate(p);
    expect(result.passed).toBe(true);
    const collisions = result.issues.filter((i) => i.code === "LAYER_COLLISION");
    expect(collisions).toHaveLength(0);
  });

  it("returns passed:false when there are errors", () => {
    const p = withoutBackground();
    const result = runQualityGate(p);
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(100);
  });

  it("result includes all issue codes from all checks", () => {
    // Project missing background AND no text events → two different errors
    const p = project({ events: [] });
    const result = runQualityGate(p);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain("NO_BACKGROUND");
    expect(codes).toContain("NO_TEXT_CONTENT");
  });

  it("score is consistent with calculateScore(issues)", () => {
    const result = runQualityGate(BASE);
    expect(result.score).toBe(calculateScore(result.issues));
  });

  it("passes a well-formed project built by buildProjectFromBrief", async () => {
    const { buildProjectFromBrief } = await import("@/lib/brief/buildProjectFromBrief");
    const brief = {
      layout: "single-column" as const,
      title: "Test Brief",
      blocks: [
        { heading: "A", description: "Alpha" },
        { heading: "B", description: "Beta" },
      ],
      palette: "midnight",
      style: "modern",
    };
    const p = buildProjectFromBrief(brief, 10);
    const result = runQualityGate(p);
    expect(result.passed).toBe(true);
  });
});
