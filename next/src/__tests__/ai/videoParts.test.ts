import { describe, expect, it } from "vitest";
import { handleGenerateVideoPartRequest } from "@/app/api/dev/generate-part/route";
import {
  validateDirectSummaryContent,
  validateDirectTimelineContent,
} from "@/lib/agent/videoParts/directTimeline";
import { generateVideoPart } from "@/lib/agent/videoParts/pipeline";
import { buildStandaloneVideoPartProject } from "@/lib/agent/videoParts/project";
import {
  BookendsContentSchema,
  MainDiagramPartContentSchema,
  SummaryPartContentSchema,
} from "@/lib/agent/videoParts/schemas";
import { resolveVideoPartTheme } from "@/lib/agent/videoParts/theme";

function timeline(mode: "direct-summary-timeline" | "direct-timeline", duration = 5) {
  return {
    mode,
    name: mode === "direct-summary-timeline" ? "Overview" : "Mechanism",
    visualIntent: "Show one topic-specific visual relationship.",
    events: [
      {
        id: "background",
        type: "background" as const,
        start: 0,
        end: duration,
        layer: 0,
        background: { kind: "solid" as const, color: "#07111f" },
      },
      {
        id: "heading",
        type: "text" as const,
        start: 0,
        end: duration,
        layer: 8,
        text: "Readable heading",
        x: 160,
        y: 100,
        maxWidth: 1500,
        color: "#ffffff",
        fontSize: 40,
        fontWeight: 800,
      },
      {
        id: "shape-one",
        type: "shape" as const,
        shapeType: "rect" as const,
        start: 0.1,
        end: duration,
        layer: 2,
        x: 300,
        y: 350,
        width: 420,
        height: 260,
        fill: "#2563eb",
        opacity: { from: 0, to: 1, easing: "easeOut" as const },
      },
      {
        id: "shape-two",
        type: "shape" as const,
        shapeType: "circle" as const,
        start: 0.25,
        end: duration,
        layer: 2,
        x: 1280,
        y: 480,
        radius: 140,
        fill: "#f59e0b",
      },
      ...(mode === "direct-timeline"
        ? [{
            id: "shape-three",
            type: "shape" as const,
            shapeType: "line" as const,
            start: 0.4,
            end: duration,
            layer: 4,
            x1: 740,
            y1: 480,
            x2: 1080,
            y2: 480,
            stroke: "#ffffff",
            lineWidth: 8,
            drawProgress: { from: 0, to: 1, easing: "easeInOut" as const },
          }]
        : []),
    ],
  };
}

describe("direct video parts", () => {
  it("uses distinct strict contracts for compact summaries and main diagrams", () => {
    expect(SummaryPartContentSchema.parse(timeline("direct-summary-timeline"))).toBeDefined();
    expect(MainDiagramPartContentSchema.parse(timeline("direct-timeline"))).toBeDefined();
    expect(() => SummaryPartContentSchema.parse(timeline("direct-timeline"))).toThrow();
    expect(() => MainDiagramPartContentSchema.parse({ diagramFamily: "graph-flow" })).toThrow();
    expect(BookendsContentSchema.parse({
      title: "Solar Power",
      closingLine: "Light becomes current.",
    })).toEqual({ title: "Solar Power", closingLine: "Light becomes current." });
  });

  it("applies the smaller summary profile and the deeper main profile", () => {
    expect(validateDirectSummaryContent(timeline("direct-summary-timeline"), 5).events).toHaveLength(4);
    expect(validateDirectTimelineContent(timeline("direct-timeline"), 5).events).toHaveLength(5);
    expect(() => validateDirectTimelineContent(timeline("direct-summary-timeline"), 5)).toThrow();
  });

  it.each([
    [
      "duplicate IDs",
      () => ({
        ...timeline("direct-timeline"),
        events: timeline("direct-timeline").events.map((event) =>
          event.id === "shape-two" ? { ...event, id: "shape-one" } : event
        ),
      }),
      "ids must be unique",
    ],
    [
      "invalid timing",
      () => ({
        ...timeline("direct-timeline"),
        events: timeline("direct-timeline").events.map((event) =>
          event.id === "shape-one" ? { ...event, end: 6 } : event
        ),
      }),
      "start/end must satisfy",
    ],
    [
      "invisible geometry",
      () => ({
        ...timeline("direct-timeline"),
        events: timeline("direct-timeline").events.map((event) =>
          event.id === "shape-one" ? { ...event, x: 4000 } : event
        ),
      }),
      "does not intersect",
    ],
    [
      "missing background",
      () => ({
        ...timeline("direct-timeline"),
        events: timeline("direct-timeline").events.filter((event) => event.type !== "background"),
      }),
      "background spanning",
    ],
    [
      "missing label",
      () => ({
        ...timeline("direct-timeline"),
        events: timeline("direct-timeline").events.filter((event) => event.type !== "text"),
      }),
      "readable text label",
    ],
    [
      "static output",
      () => ({
        ...timeline("direct-timeline"),
        events: timeline("direct-timeline").events.map((event) => ({
          ...event,
          start: 0,
          ...(event.id === "shape-one" ? { opacity: undefined } : {}),
          ...(event.id === "shape-three" ? { drawProgress: undefined } : {}),
        })),
      }),
      "visible animation or staggered reveals",
    ],
    [
      "off-canvas path",
      () => ({
        ...timeline("direct-timeline"),
        events: timeline("direct-timeline").events.map((event) =>
          event.id === "shape-one"
            ? {
                ...event,
                path: {
                  points: [{ x: -1000, y: -1000 }, { x: -900, y: -900 }],
                  easing: "linear" as const,
                },
              }
            : event
        ),
      }),
      "path entirely outside",
    ],
    [
      "unsupported fields",
      () => ({
        ...timeline("direct-timeline"),
        events: timeline("direct-timeline").events.map((event) =>
          event.id === "shape-one" ? { ...event, canvasCommand: "fillRect" } : event
        ),
      }),
      "unsupported properties",
    ],
    [
      "out-of-window keyframes",
      () => ({
        ...timeline("direct-timeline"),
        events: timeline("direct-timeline").events.map((event) =>
          event.id === "shape-one"
            ? {
                ...event,
                translateX: {
                  keyframes: [
                    { time: -1, value: -20, easing: "linear" as const },
                    { time: 1, value: 0, easing: "linear" as const },
                  ],
                },
              }
            : event
        ),
      }),
      "time must stay within event interval",
    ],
    [
      "unordered keyframes",
      () => ({
        ...timeline("direct-timeline"),
        events: timeline("direct-timeline").events.map((event) =>
          event.id === "shape-one"
            ? {
                ...event,
                translateX: {
                  keyframes: [
                    { time: 1, value: -20, easing: "linear" as const },
                    { time: 0.5, value: 0, easing: "linear" as const },
                  ],
                },
              }
            : event
        ),
      }),
      "times must be strictly increasing",
    ],
    [
      "transparent label colors",
      () => ({
        ...timeline("direct-timeline"),
        events: timeline("direct-timeline").events.map((event) =>
          event.id === "heading" ? { ...event, color: "rgba(255,255,255,0)" } : event
        ),
      }),
      "visible text color",
    ],
  ])("rejects %s", (_name, build, finding) => {
    expect(() => validateDirectTimelineContent(build(), 5)).toThrow(finding);
  });

  it("enforces summary text and event budgets", () => {
    const summary = timeline("direct-summary-timeline");
    const labels = Array.from({ length: 6 }, (_, index) => ({
      id: `extra-label-${index}`,
      type: "text" as const,
      start: 0,
      end: 5,
      layer: 8,
      text: `Label ${index}`,
      x: 80 + index * 280,
      y: 900,
      maxWidth: 180,
      color: "#ffffff",
      fontSize: 32,
      fontWeight: 700,
    }));
    expect(() => validateDirectSummaryContent({
      ...summary,
      events: [...summary.events, ...labels],
    }, 5)).toThrow("no more than 6 text events");

    const tooManyEvents = {
      ...summary,
      events: [
        ...summary.events,
        ...Array.from({ length: 37 }, (_, index) => ({
          ...summary.events[2],
          id: `extra-shape-${index}`,
          x: 300 + index,
        })),
      ],
    };
    expect(() => validateDirectSummaryContent(tooManyEvents, 5)).toThrow();
  });

  it("rejects unreadable badge text and backdrop colors", () => {
    const main = timeline("direct-timeline");
    const badge = {
      id: "status-badge",
      type: "shape" as const,
      shapeType: "badge" as const,
      start: 0.25,
      end: 5,
      layer: 8,
      cx: 1280,
      cy: 480,
      text: "State",
      fontSize: 24,
      fill: "rgba(0,0,0,0.2)",
      textColor: "rgba(255,255,255,0)",
    };
    const withBadge = {
      ...main,
      events: main.events.map((event) => event.id === "shape-two" ? badge : event),
    };
    expect(() => validateDirectTimelineContent(withBadge, 5)).toThrow("visible textColor");
    expect(() => validateDirectTimelineContent(withBadge, 5)).toThrow("fill opacity");
  });

  it("rejects significant label stacking but tolerates minor edge contact", () => {
    const baseLabel = {
      type: "text" as const,
      start: 0,
      end: 5,
      layer: 8,
      x: 800,
      maxWidth: 300,
      color: "#ffffff",
      fontSize: 24,
      fontWeight: 700,
      backdrop: { fill: "rgba(0,0,0,0.85)", paddingX: 12, paddingY: 8 },
    };
    const minor = {
      ...timeline("direct-summary-timeline"),
      events: [
        ...timeline("direct-summary-timeline").events,
        { ...baseLabel, id: "upper", text: "Upper", y: 820 },
        { ...baseLabel, id: "lower", text: "Lower", y: 860 },
      ],
    };
    expect(() => validateDirectSummaryContent(minor, 5)).not.toThrow();
    const stacked = {
      ...minor,
      events: minor.events.map((event) => event.id === "lower" ? { ...event, y: 825 } : event),
    };
    expect(() => validateDirectSummaryContent(stacked, 5)).toThrow("overlaps significantly");
  });

  it("includes rejected JSON in the single targeted repair", async () => {
    const invalid = {
      ...timeline("direct-timeline"),
      events: timeline("direct-timeline").events.map((event) =>
        event.id === "shape-one" ? { ...event, x: 4000 } : event
      ),
    };
    const prompts: string[] = [];
    let calls = 0;
    const result = await generateVideoPart(
      { part: "main-diagram", prompt: "Explain solar power", duration: 5 },
      {
        callModel: async (_system, prompt) => {
          prompts.push(prompt);
          calls += 1;
          return calls === 1 ? invalid : timeline("direct-timeline");
        },
      },
    );
    expect(calls).toBe(2);
    expect(prompts[1]).toContain('"id": "shape-one"');
    expect(result.part).toBe("main-diagram");
  });

  it("renders title and conclusion with deterministic timeline events", () => {
    const theme = resolveVideoPartTheme("Solar power");
    const title = buildStandaloneVideoPartProject({
      part: "title",
      content: { title: "Solar Power", subtitle: "From light to electricity" },
    }, 5, theme);
    const conclusion = buildStandaloneVideoPartProject({
      part: "conclusion",
      content: { closingLine: "Light becomes current." },
    }, 5, theme);
    expect(title.events.some((event) => event.id === "title")).toBe(true);
    expect(conclusion.events.some((event) => event.id === "closing-line")).toBe(true);
  });

  it("keeps the dev HTTP adapter strict", async () => {
    const malformed = await handleGenerateVideoPartRequest(
      new Request("http://localhost/api/dev/generate-part", {
        method: "POST",
        body: "not-json",
      }) as never,
    );
    expect(malformed.status).toBe(400);
  });
});
