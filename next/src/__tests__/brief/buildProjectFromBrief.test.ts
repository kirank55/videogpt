import { describe, it, expect } from "vitest";
import { buildProjectFromBrief } from "@/lib/brief/buildProjectFromBrief";
import { validateProject } from "@/lib/renderer";
import { PALETTES } from "@/lib/catalog/palettes";
import { STYLES } from "@/lib/catalog/styles";
import type { VideoBrief, SupportedDuration } from "@/lib/schemas/brief";
import type { ShapeEvent, TextEvent } from "@/lib/renderer";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function twoColBrief(overrides: Partial<VideoBrief> = {}): VideoBrief {
  return {
    layout: "two-column",
    title: "Client vs Server",
    leftHeader: "Client",
    rightHeader: "Server",
    leftRows: ["Browser", "DNS"],
    rightRows: ["Load Balancer", "API"],
    flow: false,
    palette: "midnight",
    style: "modern",
    ...overrides,
  };
}

function singleColBrief(overrides: Partial<VideoBrief> = {}): VideoBrief {
  return {
    layout: "single-column",
    title: "The Water Cycle",
    blocks: [
      { heading: "Evaporation", description: "Water rises." },
      { heading: "Condensation", description: "Clouds form." },
      { heading: "Precipitation", description: "Rain falls." },
    ],
    palette: "midnight",
    style: "modern",
    ...overrides,
  };
}

const DUR: SupportedDuration = 15;

// ── Helper: get rect events from a project ────────────────────────────────────

function getRects(project: ReturnType<typeof buildProjectFromBrief>) {
  return project.events.filter(
    (e): e is ShapeEvent & { shapeType: "rect" } =>
      e.type === "shape" && e.shapeType === "rect",
  );
}

function getTextEvents(project: ReturnType<typeof buildProjectFromBrief>) {
  return project.events.filter((e): e is TextEvent => e.type === "text");
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("buildProjectFromBrief", () => {
  // ── 1. Two-Column: rect count, labels, connectors, particles ──────────────

  it("two-column brief produces left and right rects for each row", () => {
    const brief = twoColBrief();
    const project = buildProjectFromBrief(brief, DUR);
    const rects = getRects(project);
    // 2 left + 2 right = 4 stack rects
    const leftRects = rects.filter((r) => r.id.startsWith("left-rect"));
    const rightRects = rects.filter((r) => r.id.startsWith("right-rect"));
    expect(leftRects).toHaveLength(2);
    expect(rightRects).toHaveLength(2);
  });

  it("produces label text events for each row", () => {
    const project = buildProjectFromBrief(twoColBrief(), DUR);
    const labels = getTextEvents(project).filter(
      (e) => e.id.startsWith("left-label") || e.id.startsWith("right-label"),
    );
    expect(labels).toHaveLength(4); // 2 left + 2 right
  });

  it("produces connector lines between stacked rows (n-1 per stack)", () => {
    const brief = twoColBrief({
      leftRows: ["A", "B", "C"],  // 3 rows → 2 connectors
      rightRows: ["X", "Y"],      // 2 rows → 1 connector
    });
    const project = buildProjectFromBrief(brief, DUR);
    const leftConns = project.events.filter((e) => e.id.startsWith("left-conn"));
    const rightConns = project.events.filter((e) => e.id.startsWith("right-conn"));
    expect(leftConns).toHaveLength(2);
    expect(rightConns).toHaveLength(1);
  });

  it("produces ambient particles for styles with particleDensity > 0", () => {
    const project = buildProjectFromBrief(
      twoColBrief({ style: "modern" }), // modern has density 40
      DUR,
    );
    const particles = project.events.filter((e) => e.id === "ambient-particles");
    expect(particles).toHaveLength(1);
  });

  // ── 2. Single-Column: block count and Y positions ─────────────────────────

  it("single-column produces heading+description for each block", () => {
    const project = buildProjectFromBrief(singleColBrief(), DUR);
    const headings = getTextEvents(project).filter((e) =>
      e.id.startsWith("block-heading"),
    );
    const descs = getTextEvents(project).filter((e) =>
      e.id.startsWith("block-desc"),
    );
    expect(headings).toHaveLength(3);
    expect(descs).toHaveLength(3);
  });

  it("single-column block headings have increasing Y positions", () => {
    const project = buildProjectFromBrief(singleColBrief(), DUR);
    const headings = getTextEvents(project)
      .filter((e) => e.id.startsWith("block-heading"))
      .sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 1; i < headings.length; i++) {
      expect(headings[i].y).toBeGreaterThan(headings[i - 1].y);
    }
  });

  it("single-column has a closing-line text event", () => {
    const project = buildProjectFromBrief(singleColBrief(), DUR);
    const closing = getTextEvents(project).find((e) => e.id === "closing-line");
    expect(closing).toBeDefined();
  });

  // ── 3. Variable row counts: non-overlapping rects ─────────────────────────

  it.each([[2], [3], [4]] as const)(
    "%i-row left stack rects do not overlap vertically",
    (count) => {
      const rows = Array.from({ length: count }, (_, i) => `Row ${i + 1}`);
      const project = buildProjectFromBrief(twoColBrief({ leftRows: rows }), DUR);
      const leftRects = getRects(project)
        .filter((r) => r.id.startsWith("left-rect"))
        .sort((a, b) => a.y - b.y);

      for (let i = 1; i < leftRects.length; i++) {
        const above = leftRects[i - 1];
        const below = leftRects[i];
        // Above rect bottom must be <= below rect top
        expect(above.y + above.height).toBeLessThanOrEqual(below.y + 1); // +1 for gap tolerance
      }
    },
  );

  // ── 4. flow: true/false ───────────────────────────────────────────────────

  it("flow:true adds req-packet, req-burst, processing-glow events", () => {
    const brief = twoColBrief({
      flow: true,
      requestLabel: "REQUEST",
      responseLabel: "RESPONSE",
      processingSteps: ["Parse", "Validate"],
    });
    const project = buildProjectFromBrief(brief, DUR);
    const ids = project.events.map((e) => e.id);
    expect(ids).toContain("req-packet");
    expect(ids).toContain("req-burst");
    expect(ids).toContain("processing-glow");
  });

  it("flow:false omits req-packet, req-burst, processing-glow events", () => {
    const project = buildProjectFromBrief(twoColBrief({ flow: false }), DUR);
    const ids = project.events.map((e) => e.id);
    expect(ids).not.toContain("req-packet");
    expect(ids).not.toContain("req-burst");
    expect(ids).not.toContain("processing-glow");
  });

  // ── 5. Every expanded project passes validateProject ─────────────────────

  it.each([5, 10, 15, 20, 30] as SupportedDuration[])(
    "two-column flow:false %ds project has no errors",
    (dur) => {
      const project = buildProjectFromBrief(twoColBrief({ flow: false }), dur);
      const errors = validateProject(project).filter(
        (r) => r.severity === "error",
      );
      expect(errors).toHaveLength(0);
    },
  );

  it.each([5, 10, 15, 20, 30] as SupportedDuration[])(
    "two-column flow:true %ds project has no errors",
    (dur) => {
      const project = buildProjectFromBrief(twoColBrief({ flow: true, requestLabel: "REQ", responseLabel: "RES", processingSteps: ["Step 1"] }), dur);
      const errors = validateProject(project).filter(
        (r) => r.severity === "error",
      );
      expect(errors).toHaveLength(0);
    },
  );

  it.each([5, 10, 15, 20, 30] as SupportedDuration[])(
    "single-column %ds project has no errors",
    (dur) => {
      const project = buildProjectFromBrief(singleColBrief(), dur);
      const errors = validateProject(project).filter(
        (r) => r.severity === "error",
      );
      expect(errors).toHaveLength(0);
    },
  );

  // ── 6. Different palettes produce different colors ────────────────────────

  it("different palettes produce different background gradient colors", () => {
    const pMidnight = buildProjectFromBrief(twoColBrief({ palette: "midnight" }), DUR);
    const pNeon = buildProjectFromBrief(twoColBrief({ palette: "neon" }), DUR);
    const bgMidnight = pMidnight.events.find((e) => e.type === "background");
    const bgNeon = pNeon.events.find((e) => e.type === "background");
    expect(bgMidnight).not.toEqual(bgNeon);
  });

  it("all named palettes produce distinct background gradients", () => {
    const paletteKeys = Object.keys(PALETTES);
    const froms = new Set<string>();
    for (const key of paletteKeys) {
      const project = buildProjectFromBrief(twoColBrief({ palette: key }), DUR);
      const bg = project.events.find((e) => e.type === "background");
      if (bg?.type === "background" && bg.background.kind === "gradient") {
        froms.add(bg.background.from);
      }
    }
    // At least as many distinct colors as palettes (all have unique bgFrom)
    expect(froms.size).toBe(paletteKeys.length);
  });

  // ── 7. Different styles produce different radii / easing ─────────────────

  it("brutalist style produces radius:0 on stack rects", () => {
    const project = buildProjectFromBrief(twoColBrief({ style: "brutalist" }), DUR);
    const rects = getRects(project).filter((r) => r.id.startsWith("left-rect"));
    expect(rects.length).toBeGreaterThan(0);
    for (const r of rects) {
      expect(r.radius).toBe(0);
    }
  });

  it("modern style produces non-zero radius on stack rects", () => {
    const project = buildProjectFromBrief(twoColBrief({ style: "modern" }), DUR);
    const rects = getRects(project).filter((r) => r.id.startsWith("left-rect"));
    for (const r of rects) {
      expect((r.radius ?? 0)).toBeGreaterThan(0);
    }
  });

  it("neon-glow style produces ambient particles with high count", () => {
    const neonDensity = STYLES["neon-glow"].particleDensity;
    const project = buildProjectFromBrief(
      twoColBrief({ style: "neon-glow", particleIntensity: 1 }),
      DUR,
    );
    const ambient = project.events.find((e) => e.id === "ambient-particles");
    expect(ambient).toBeDefined();
    if (ambient?.type === "particle") {
      expect(ambient.count).toBe(neonDensity);
    }
  });

  it("minimal style produces no ambient particles", () => {
    const project = buildProjectFromBrief(twoColBrief({ style: "minimal" }), DUR);
    const ambient = project.events.find((e) => e.id === "ambient-particles");
    expect(ambient).toBeUndefined();
  });

  // ── 8. Output structure ───────────────────────────────────────────────────

  it("always includes a background event", () => {
    const project = buildProjectFromBrief(singleColBrief(), DUR);
    const bg = project.events.find((e) => e.type === "background");
    expect(bg).toBeDefined();
  });

  it("project duration matches the requested duration", () => {
    for (const dur of [5, 10, 15, 20, 30] as SupportedDuration[]) {
      const project = buildProjectFromBrief(singleColBrief(), dur);
      expect(project.duration).toBe(dur);
    }
  });

  it("project name matches brief title", () => {
    const brief = singleColBrief({ title: "My Custom Title" });
    const project = buildProjectFromBrief(brief, DUR);
    expect(project.name).toBe("My Custom Title");
  });

  // ── 9. Single-Column visualElements ───────────────────────────────────────

  it("correctly handles visualElements and adjusts text column layout", () => {
    const brief = singleColBrief({
      visualElements: [
        {
          type: "rect",
          blockIndex: 1,
          x: 50,
          y: 60,
          width: 200,
          height: 100,
          color: "accent2",
          fillType: "outline",
          label: "Level 1",
          entry: "slide-up"
        },
        {
          type: "circle",
          blockIndex: 2,
          x: 150,
          y: 200,
          radius: 40,
          color: "accent1",
          fillType: "solid"
        },
        {
          type: "line",
          blockIndex: 0,
          x1: 10,
          y1: 20,
          x2: 100,
          y2: 200,
          color: "muted",
          fillType: "dashed"
        }
      ]
    });

    const project = buildProjectFromBrief(brief, DUR);

    // Verify title and subtitle max width are constrained to 750 (shifted left)
    const titleEvent = project.events.find((e) => e.id === "title");
    expect(titleEvent).toBeDefined();
    if (titleEvent?.type === "text") {
      expect(titleEvent.maxWidth).toBe(750);
    }

    // Verify visual element shape events are generated
    const rectShape = project.events.find((e) => e.id === "vis-shape-0");
    const circleShape = project.events.find((e) => e.id === "vis-shape-1");
    const lineShape = project.events.find((e) => e.id === "vis-shape-2");

    expect(rectShape).toBeDefined();
    expect(circleShape).toBeDefined();
    expect(lineShape).toBeDefined();

    // Verify absolute coordinate offset application (relative to diagram box center x=1060, y=320)
    if (rectShape && rectShape.type === "shape" && rectShape.shapeType === "rect") {
      expect(rectShape.x).toBe(1060 + 50);
      expect(rectShape.y).toBe(320 + 60);
      expect(rectShape.width).toBe(200);
      expect(rectShape.height).toBe(100);
      expect(rectShape.stroke).toBeDefined(); // outline should populate stroke
    }

    if (circleShape && circleShape.type === "shape" && circleShape.shapeType === "circle") {
      expect(circleShape.x).toBe(1060 + 150);
      expect(circleShape.y).toBe(320 + 200);
      expect(circleShape.radius).toBe(40);
    }

    if (lineShape && lineShape.type === "shape" && lineShape.shapeType === "line") {
      expect(lineShape.x1).toBe(1060 + 10);
      expect(lineShape.y1).toBe(320 + 20);
      expect(lineShape.x2).toBe(1060 + 100);
      expect(lineShape.y2).toBe(320 + 200);
      expect(lineShape.lineDash).toEqual([6, 6]); // dashed fillType should populate lineDash
    }

    // Verify visual element label text event is generated
    const labelEvent = project.events.find((e) => e.id === "vis-label-0");
    expect(labelEvent).toBeDefined();
    if (labelEvent?.type === "text") {
      expect(labelEvent.text).toBe("Level 1");
      expect(labelEvent.align).toBe("center");
      // rect center X = 1060 + 50 + 100 = 1210
      expect(labelEvent.x).toBe(1210);
    }
  });
});
