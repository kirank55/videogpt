import { describe, expect, it } from "vitest";
import {
  ConclusionPartContentSchema,
  GraphSummaryPartContentSchema,
  MainDiagramPartContentSchema,
  PrimitiveSummaryPartContentSchema,
  SummaryPartContentSchema,
  TitlePartContentSchema,
} from "@/lib/agent/videoParts/schemas";
import { resolveVideoPartTheme } from "@/lib/agent/videoParts/theme";
import { buildVideoPartSystemPrompt } from "@/lib/agent/videoParts/prompts";
import { buildStandaloneVideoPartProject } from "@/lib/agent/videoParts/project";
import { VideoProjectSchema } from "@/lib/others/schemas/timeline";
import { generateVideoPart } from "@/lib/agent/videoParts/pipeline";
import {
  buildDirectTimelineProject,
  validateDirectTimelineContent,
} from "@/lib/agent/videoParts/directTimeline";
import {
  POST as postGenerateVideoPart,
  handleGenerateVideoPartRequest,
} from "@/app/api/dev/generate-part/route";

const prompt = "Explain how sunlight becomes electricity in a solar panel";
const theme = resolveVideoPartTheme(prompt);

const summaryContent = {
  diagramFamily: "graph-flow" as const,
  heading: "Summary: Capturing sunlight",
  diagramLayout: "pipeline" as const,
  blocks: [
    { heading: "Sunlight", description: "Photons arrive at the panel." },
    { heading: "Solar cells", description: "Semiconductor cells absorb their energy." },
  ],
  graph: {
    nodes: [
      { id: "sun", label: "Sunlight" },
      { id: "cell", label: "Solar cell" },
    ],
    edges: [{ from: "sun", to: "cell", animated: true }],
  },
};

const damSummaryContent = {
  diagramFamily: "build-up" as const,
  heading: "Dam Construction Overview",
  blocks: [
    { heading: "Prepare the site", description: "Survey and excavate down to stable bedrock." },
    { heading: "Build and seal", description: "Raise the dam body around a watertight core." },
  ],
  visualPrimitives: [
    { id: "bedrock", type: "terrain-layer", label: "Bedrock", drawingRole: "layer" as const },
    { id: "excavation", type: "foundation-cut", label: "Excavation", drawingRole: "container" as const },
    { id: "foundation", type: "concrete-foundation", label: "Foundation", drawingRole: "support" as const },
    { id: "dam-body", type: "concrete-dam", label: "Dam body", drawingRole: "mass" as const },
    { id: "seal-core", type: "watertight-core", label: "Sealing core", drawingRole: "support" as const },
    { id: "reservoir", type: "retained-water", label: "Reservoir", drawingRole: "flow" as const },
  ],
  primitiveRelationships: [
    { from: ["excavation"], to: ["bedrock"], relation: "exposes", motion: "excavate downward" },
    { from: ["bedrock"], to: ["foundation"], relation: "supports", motion: "place the foundation" },
    { from: ["foundation"], to: ["dam-body"], relation: "anchors", motion: "grow upward" },
    { from: ["seal-core"], to: ["dam-body"], relation: "seals", motion: "fill the center" },
    { from: ["dam-body"], to: ["reservoir"], relation: "retains", motion: "fill with water" },
  ],
  storyboard: {
    style: "line-drawing" as const,
    stages: [
      { label: "Excavate to stable bedrock", operation: "move" as const, primitiveIds: ["bedrock", "excavation"] },
      { label: "Lay the foundation", operation: "grow" as const, primitiveIds: ["foundation"] },
      { label: "Raise and seal the dam", operation: "grow" as const, primitiveIds: ["dam-body", "seal-core"] },
      { label: "Fill the reservoir", operation: "fill" as const, primitiveIds: ["reservoir"] },
    ],
  },
};

const mainDiagramContent = {
  mode: "direct-timeline" as const,
  name: "Charge separation inside a solar cell",
  visualIntent: "Reveal the electric field pushing electrons and holes in opposite directions.",
  events: [
    {
      id: "main-bg",
      type: "background" as const,
      start: 0,
      end: 10,
      layer: 0,
      background: { kind: "gradient" as const, from: "#07111f", to: "#122b46", angle: 135 },
    },
    {
      id: "main-title",
      type: "text" as const,
      start: 0.1,
      end: 10,
      layer: 8,
      text: "The junction's electric field separates charge",
      x: 180,
      y: 110,
      maxWidth: 1500,
      color: "#f8fafc",
      fontSize: 48,
      fontWeight: 800,
      opacity: { from: 0, to: 1, easing: "easeOut" as const },
    },
    {
      id: "p-layer",
      type: "shape" as const,
      shapeType: "rect" as const,
      start: 0.4,
      end: 10,
      layer: 2,
      x: 260,
      y: 330,
      width: 650,
      height: 360,
      radius: 28,
      fill: "#7c3aed",
      scaleX: { from: 0, to: 1, easing: "easeOut" as const },
    },
    {
      id: "n-layer",
      type: "shape" as const,
      shapeType: "rect" as const,
      start: 0.8,
      end: 10,
      layer: 2,
      x: 1010,
      y: 330,
      width: 650,
      height: 360,
      radius: 28,
      fill: "#0ea5e9",
    },
    {
      id: "field-arrow",
      type: "shape" as const,
      shapeType: "line" as const,
      start: 1.2,
      end: 10,
      layer: 4,
      x1: 1180,
      y1: 510,
      x2: 740,
      y2: 510,
      stroke: "#facc15",
      lineWidth: 12,
      arrowEnd: true,
      drawProgress: { from: 0, to: 1, easing: "easeInOut" as const },
    },
  ],
};

const legacyMainDiagramContent = {
  diagramFamily: "graph-flow",
  heading: "Electric current begins to flow",
  diagramLayout: "pipeline",
  blocks: [
    { heading: "Electron release", description: "Absorbed light frees charge carriers." },
    { heading: "Usable current", description: "The circuit guides the moving charge." },
  ],
  graph: {
    nodes: [{ id: "cell", label: "Solar cell" }],
    edges: [],
  },
};

const legacyPrimitiveMainDiagramContent = {
  diagramFamily: "build-up",
  heading: "Charge separation",
  diagramScript: {
    summary: "Show charge moving.",
    beats: ["Release", "Separate"],
    visualStory: "Electrons and holes move apart.",
    mustShow: ["Electron", "Hole", "Junction"],
  },
  diagramIntent: {
    subject: "Solar junction",
    signatureVisuals: ["Electron", "Hole", "Junction"],
    motionCues: ["Move apart"],
  },
  visualPrimitives: [
    { id: "electron", type: "electron", label: "Electron" },
    { id: "hole", type: "hole", label: "Hole" },
    { id: "junction", type: "junction", label: "Junction" },
  ],
  primitiveRelationships: [
    { from: ["junction"], to: ["electron"], relation: "pushes" },
    { from: ["junction"], to: ["hole"], relation: "pushes" },
  ],
  storyboard: {
    style: "line-drawing",
    stages: [{ label: "Separate", operation: "move", primitiveIds: ["electron", "hole"] }],
  },
};

const artifacts = [
  { part: "title" as const, content: { title: "Solar Power", subtitle: "From light to electricity" } },
  { part: "summary" as const, content: summaryContent },
  { part: "main-diagram" as const, content: mainDiagramContent },
  { part: "conclusion" as const, content: { closingLine: "Sunlight becomes useful electrical power." } },
];

describe("video part contracts", () => {
  it("uses one visual theme for equivalent prompts", () => {
    const expected = resolveVideoPartTheme("How does a solar panel work?");

    expect(resolveVideoPartTheme("  HOW   does a SOLAR panel work?  ")).toEqual(expected);
  });

  it("accepts only the authored fields needed by simple parts", () => {
    expect(TitlePartContentSchema.parse({ title: "Solar Power", subtitle: "From light to electricity" })).toEqual({
      title: "Solar Power",
      subtitle: "From light to electricity",
    });
    expect(ConclusionPartContentSchema.parse({ closingLine: "Clean energy starts with sunlight." })).toEqual({
      closingLine: "Clean energy starts with sunlight.",
    });
    expect(() => TitlePartContentSchema.parse({
      title: "Solar Power",
      scenes: [],
    })).toThrow();
    expect(() => TitlePartContentSchema.parse({
      projectName: "Solar Power",
      summary: "A full response envelope",
      brief: { title: "Solar Power", scenes: [] },
    })).toThrow();
  });

  it("rejects setup graphs whose edges reference missing nodes", () => {
    expect(() => SummaryPartContentSchema.parse({
      heading: "Summary: Capturing sunlight",
      diagramLayout: "pipeline",
      blocks: [
        { heading: "Sunlight", description: "Photons reach the panel." },
        { heading: "Solar cells", description: "Cells absorb the incoming energy." },
      ],
      graph: {
        nodes: [{ id: "sun", label: "Sunlight" }],
        edges: [{ from: "sun", to: "missing" }],
      },
    })).toThrow();
    expect(() => GraphSummaryPartContentSchema.parse({
      ...summaryContent,
      graph: {
        nodes: [
          { id: "duplicate", label: "First" },
          { id: "duplicate", label: "Second" },
        ],
        edges: [],
      },
    })).toThrow();
  });

  it("keeps graph and primitive summary contracts mutually exclusive", () => {
    expect(GraphSummaryPartContentSchema.parse(summaryContent)).toEqual(summaryContent);
    expect(PrimitiveSummaryPartContentSchema.parse(damSummaryContent)).toEqual(damSummaryContent);
    expect(SummaryPartContentSchema.parse(damSummaryContent)).toEqual(damSummaryContent);
    expect(() => SummaryPartContentSchema.parse({
      ...summaryContent,
      visualPrimitives: damSummaryContent.visualPrimitives,
    })).toThrow();
    expect(() => SummaryPartContentSchema.parse({
      ...damSummaryContent,
      diagramLayout: "stack",
      graph: summaryContent.graph,
    })).toThrow();
  });

  it("keeps summary authorship compact while allowing detailed direct main timelines", () => {
    expect(() => GraphSummaryPartContentSchema.parse({
      ...summaryContent,
      blocks: [
        ...summaryContent.blocks,
        { heading: "Third", description: "Allowed final summary block." },
        { heading: "Fourth", description: "Too detailed for a summary." },
      ],
    })).toThrow();
    expect(() => PrimitiveSummaryPartContentSchema.parse({
      ...damSummaryContent,
      storyboard: {
        ...damSummaryContent.storyboard,
        stages: [
          ...damSummaryContent.storyboard.stages,
          { label: "Extra detail", operation: "pulse", primitiveIds: ["dam-body"] },
        ],
      },
    })).toThrow();
    expect(() => MainDiagramPartContentSchema.parse(mainDiagramContent)).not.toThrow();
  });

  it("rejects summary storyboards whose relationships or stages reference missing primitives", () => {
    expect(() => PrimitiveSummaryPartContentSchema.parse({
      ...damSummaryContent,
      primitiveRelationships: [
        ...damSummaryContent.primitiveRelationships,
        { from: ["missing"], to: ["dam-body"], relation: "supports" },
      ],
    })).toThrow();
    expect(() => PrimitiveSummaryPartContentSchema.parse({
      ...damSummaryContent,
      visualPrimitives: [
        ...damSummaryContent.visualPrimitives,
        { id: "foundation", type: "duplicate", label: "Duplicate foundation" },
      ],
    })).toThrow();
    expect(() => PrimitiveSummaryPartContentSchema.parse({
      ...damSummaryContent,
      storyboard: {
        ...damSummaryContent.storyboard,
        stages: [{ label: "Draw unknown", operation: "reveal", primitiveIds: ["missing"] }],
      },
    })).toThrow();
  });

  it("accepts every renderer event kind in a direct main timeline", () => {
    const parsed = MainDiagramPartContentSchema.parse({
      ...mainDiagramContent,
      events: [
        mainDiagramContent.events[0],
        mainDiagramContent.events[1],
        mainDiagramContent.events[2],
        { id: "circle", type: "shape", shapeType: "circle", start: 1, end: 10, layer: 3, x: 500, y: 500, radius: 40, fill: "#fff" },
        { id: "triangle", type: "shape", shapeType: "triangle", start: 1, end: 10, layer: 3, x: 600, y: 420, width: 80, height: 90, fill: "#fff" },
        { id: "line", type: "shape", shapeType: "line", start: 1, end: 10, layer: 3, x1: 700, y1: 500, x2: 900, y2: 500, stroke: "#fff", lineWidth: 4 },
        { id: "icon", type: "shape", shapeType: "icon", start: 1, end: 10, layer: 4, iconName: "cpu", cx: 1000, cy: 500, size: 80, color: "#fff" },
        { id: "badge", type: "shape", shapeType: "badge", start: 1, end: 10, layer: 5, cx: 1150, cy: 500, text: "Charge", fill: "#111", textColor: "#fff" },
        { id: "progress", type: "shape", shapeType: "progress", start: 1, end: 10, layer: 4, x: 1250, y: 490, width: 300, height: 20, trackColor: "#333", fillColor: "#fff" },
        { id: "particles", type: "particle", start: 1, end: 10, layer: 2, count: 20, seed: 7, origin: { x: 960, y: 540 }, spread: { x: 120, y: 80 }, drift: { x: 40, y: -20 }, particleRadius: { min: 2, max: 5 }, color: "#fff" },
      ],
    });

    expect(parsed.mode).toBe("direct-timeline");
    expect(parsed.events).toHaveLength(10);
  });

  it("asks the model for only the selected part contract", () => {
    const prompts = [
      buildVideoPartSystemPrompt("title", 5),
      buildVideoPartSystemPrompt("summary", 5),
      buildVideoPartSystemPrompt("main-diagram", 10),
      buildVideoPartSystemPrompt("conclusion", 10),
    ];

    expect(prompts[0]).toContain('"required":["title"]');
    expect(prompts[3]).toContain('"required":["closingLine"]');
    prompts.forEach((partPrompt) => {
      expect(partPrompt).not.toContain('"projectName"');
      expect(partPrompt).not.toContain('"brief"');
      expect(partPrompt).not.toContain('"scenes"');
    });
    [prompts[0], prompts[1], prompts[3]].forEach((partPrompt) => {
      expect(partPrompt).not.toContain('"summary"');
    });
  });

  it("asks for topic-shaped summary motion instead of generic construction graphs", () => {
    const summaryPrompt = buildVideoPartSystemPrompt("summary", 10);

    expect(summaryPrompt).toContain("A dam construction summary");
    expect(summaryPrompt).toContain("build-up or spatial-cutaway");
    expect(summaryPrompt).toContain("Software request routing");
    expect(summaryPrompt).toContain("Do not use connected boxes merely because steps are chronological");
    expect(summaryPrompt).toContain("simple, clean, and precise visual overview");
    expect(summaryPrompt).toContain("The Main Diagram will explain the detailed mechanism");
    expect(summaryPrompt).toContain("only 2-4 storyboard stages");
  });

  it("asks the main model for a deeper direct timeline instead of another overview pipeline", () => {
    const mainPrompt = buildVideoPartSystemPrompt("main-diagram", 10);

    expect(mainPrompt).toContain("one underlying mechanism");
    expect(mainPrompt).toContain("1920x1080");
    expect(mainPrompt).toContain("absolute coordinates");
    expect(mainPrompt).toContain("generic card rows");
    expect(mainPrompt).toContain("left-to-right pipelines");
    expect(mainPrompt).toContain("at least 24px");
    expect(mainPrompt).toContain("0.7 opacity");
    expect(mainPrompt).toContain("at least 8px away");
    expect(mainPrompt).toContain('"direct-timeline"');
  });

  it("rejects the legacy graph and primitive main-diagram contracts", () => {
    expect(() => MainDiagramPartContentSchema.parse(legacyMainDiagramContent)).toThrow();
    expect(() => MainDiagramPartContentSchema.parse(legacyPrimitiveMainDiagramContent)).toThrow();
  });

  it.each([
    {
      part: "title" as const,
      content: { title: "Solar Power", subtitle: "From light to electricity" },
      requiredId: "title",
      forbiddenPrefixes: ["scene-", "closing-line"],
    },
    {
      part: "summary" as const,
      content: summaryContent,
      requiredId: "scene-0-heading",
      forbiddenPrefixes: ["title", "scene-1-", "closing-line"],
    },
    {
      part: "main-diagram" as const,
      content: mainDiagramContent,
      requiredId: "main-title",
      forbiddenPrefixes: ["title", "scene-", "closing-line"],
    },
    {
      part: "conclusion" as const,
      content: { closingLine: "Sunlight becomes useful electrical power." },
      requiredId: "closing-line",
      forbiddenPrefixes: ["title", "scene-"],
    },
  ])("renders an isolated $part project", ({ part, content, requiredId, forbiddenPrefixes }) => {
    const project = buildStandaloneVideoPartProject({ part, content } as never, 10, theme);
    const ids = project.events.map((event) => event.id);

    expect(ids).toContain(requiredId);
    forbiddenPrefixes.forEach((prefix) => {
      expect(ids.some((id) => id.startsWith(prefix))).toBe(false);
    });
    expect(project.events.every((event) => event.start >= 0 && event.end <= 10)).toBe(true);
    expect(() => VideoProjectSchema.parse(project)).not.toThrow();
  });

  it("passes validated main timeline events directly into a deterministic project", () => {
    const content = validateDirectTimelineContent(mainDiagramContent, 10);
    const first = buildDirectTimelineProject(content, 10);
    const second = buildDirectTimelineProject(content, 10);

    expect(first.id).toBe(second.id);
    expect(first.name).toBe(mainDiagramContent.name);
    expect(first.width).toBe(1920);
    expect(first.height).toBe(1080);
    expect(first.events).toEqual(mainDiagramContent.events);
    expect(first.events.some((event) => event.id.startsWith("scene-"))).toBe(false);
  });

  it.each([
    {
      failure: "duplicate ids",
      content: {
        ...mainDiagramContent,
        events: mainDiagramContent.events.map((event, index) => index === 1 ? { ...event, id: "main-bg" } : event),
      },
      message: "unique",
    },
    {
      failure: "events beyond the requested duration",
      content: {
        ...mainDiagramContent,
        events: mainDiagramContent.events.map((event, index) => index === 1 ? { ...event, end: 11 } : event),
      },
      message: "requested duration",
    },
    {
      failure: "invisible geometry",
      content: {
        ...mainDiagramContent,
        events: mainDiagramContent.events.map((event) => event.id === "p-layer" ? { ...event, x: 4000 } : event),
      },
      message: "canvas",
    },
    {
      failure: "geometry translated entirely away from the canvas",
      content: {
        ...mainDiagramContent,
        events: mainDiagramContent.events.map((event) => event.id === "p-layer"
          ? { ...event, scaleX: undefined, translateX: { from: 4000, to: 4000, easing: "linear" } }
          : event),
      },
      message: "canvas",
    },
    {
      failure: "an unsupported event property",
      content: {
        ...mainDiagramContent,
        events: mainDiagramContent.events.map((event) => event.id === "p-layer"
          ? { ...event, bezierCurve: true }
          : event),
      },
      message: "unsupported properties",
    },
    {
      failure: "more than 80 events",
      content: {
        ...mainDiagramContent,
        events: [
          ...mainDiagramContent.events,
          ...Array.from({ length: 76 }, (_, index) => ({
            ...mainDiagramContent.events[2],
            id: `extra-${index}`,
          })),
        ],
      },
      message: "80",
    },
    {
      failure: "a missing full-duration background",
      content: {
        ...mainDiagramContent,
        events: mainDiagramContent.events.filter((event) => event.type !== "background"),
      },
      message: "background",
    },
    {
      failure: "a missing text label",
      content: {
        ...mainDiagramContent,
        events: mainDiagramContent.events.filter((event) => event.type !== "text"),
      },
      message: "text",
    },
    {
      failure: "an unreadably small and transparent text label",
      content: {
        ...mainDiagramContent,
        events: mainDiagramContent.events.map((event) => event.type === "text"
          ? { ...event, fontSize: 1, maxWidth: 1, color: "transparent", opacity: { from: 0, to: 0, easing: "linear" } }
          : event),
      },
      message: "readable text",
    },
    {
      failure: "fewer than three shapes",
      content: {
        ...mainDiagramContent,
        events: mainDiagramContent.events.filter((event) => event.id !== "field-arrow"),
      },
      message: "three shape",
    },
    {
      failure: "a static timeline",
      content: {
        ...mainDiagramContent,
        events: mainDiagramContent.events.map((event) => {
          const copy = { ...event, start: 0 } as Record<string, unknown>;
          delete copy.opacity;
          delete copy.scaleX;
          delete copy.drawProgress;
          return copy;
        }),
      },
      message: "animation",
    },
    {
      failure: "a timeline with only a no-op animation",
      content: {
        ...mainDiagramContent,
        events: mainDiagramContent.events.map((event, index) => {
          const copy = { ...event, start: 0 } as Record<string, unknown>;
          delete copy.opacity;
          delete copy.scaleX;
          delete copy.drawProgress;
          if (index === 1) {
            copy.opacity = { from: 1, to: 1, easing: "linear" };
          }
          return copy;
        }),
      },
      message: "animation",
    },
    {
      failure: "a timeline animated only through a renderer-ignored text property",
      content: {
        ...mainDiagramContent,
        events: mainDiagramContent.events.map((event) => {
          const copy = { ...event, start: 0 } as Record<string, unknown>;
          delete copy.opacity;
          delete copy.scaleX;
          delete copy.drawProgress;
          if (event.type === "text") {
            copy.drawProgress = { from: 0, to: 1, easing: "linear" };
          }
          return copy;
        }),
      },
      message: "animation",
    },
  ])("rejects $failure", ({ content, message }) => {
    expect(() => validateDirectTimelineContent(content, 10)).toThrow(message);
  });

  it("accepts off-canvas base geometry when its authored path visibly enters the canvas", () => {
    const movingContent = {
      ...mainDiagramContent,
      events: mainDiagramContent.events.map((event) => event.id === "p-layer"
        ? {
            ...event,
            x: 4000,
            scaleX: undefined,
            path: {
              points: [{ x: 500, y: 500 }, { x: 900, y: 500 }],
              easing: "linear" as const,
            },
          }
        : event),
    };

    expect(() => validateDirectTimelineContent(movingContent, 10)).not.toThrow();
  });

  it("recognizes particle drift and stagger as visible animation", () => {
    const staticEvents = mainDiagramContent.events.map((event) => {
      const copy = { ...event, start: 0 } as Record<string, unknown>;
      delete copy.opacity;
      delete copy.scaleX;
      delete copy.drawProgress;
      return copy;
    });
    const particleContent = {
      ...mainDiagramContent,
      events: [
        ...staticEvents,
        {
          id: "charge-particles",
          type: "particle",
          start: 0,
          end: 10,
          layer: 5,
          count: 12,
          seed: 42,
          origin: { x: 960, y: 540 },
          spread: { x: 120, y: 80 },
          drift: { x: 50, y: 0 },
          particleRadius: { min: 2, max: 5 },
          color: "#facc15",
        },
      ],
    };

    expect(() => validateDirectTimelineContent(particleContent, 10)).not.toThrow();
  });

  it("rejects a small unprotected secondary label even when the title is readable", () => {
    const content = {
      ...mainDiagramContent,
      events: [
        ...mainDiagramContent.events,
        {
          id: "bedrock-label",
          type: "text" as const,
          start: 0,
          end: 10,
          layer: 8,
          text: "BEDROCK",
          x: 960,
          y: 980,
          maxWidth: 400,
          color: "#8888aa",
          fontSize: 20,
          align: "center" as const,
          verticalAlign: "middle" as const,
        },
      ],
    };

    expect(() => validateDirectTimelineContent(content, 10)).toThrow("bedrock-label");
  });

  it("rejects a secondary label whose backdrop is too transparent", () => {
    const content = {
      ...mainDiagramContent,
      events: [
        ...mainDiagramContent.events,
        {
          id: "floor-slab-label",
          type: "text" as const,
          start: 0,
          end: 10,
          layer: 8,
          text: "FLOOR SLABS",
          x: 400,
          y: 340,
          maxWidth: 240,
          color: "#ffffff",
          fontSize: 24,
          fontWeight: 700,
          align: "center" as const,
          verticalAlign: "middle" as const,
          backdrop: {
            fill: "rgba(0,0,0,0.4)",
            paddingX: 8,
            paddingY: 5,
            radius: 5,
          },
        },
      ],
    };

    expect(() => validateDirectTimelineContent(content, 10)).toThrow("backdrop opacity");
  });

  it("rejects readable labels whose occupied areas overlap", () => {
    const sharedLabel = {
      type: "text" as const,
      start: 1,
      end: 10,
      layer: 8,
      x: 720,
      y: 300,
      maxWidth: 360,
      color: "#ffffff",
      fontSize: 24,
      fontWeight: 700,
      align: "center" as const,
      verticalAlign: "middle" as const,
      backdrop: {
        fill: "rgba(0,0,0,0.85)",
        paddingX: 12,
        paddingY: 8,
        radius: 6,
      },
    };
    const content = {
      ...mainDiagramContent,
      events: [
        ...mainDiagramContent.events,
        { ...sharedLabel, id: "concrete-pouring", text: "Concrete pouring" },
        { ...sharedLabel, id: "climbing-formwork", text: "Climbing formwork", y: 315 },
      ],
    };

    expect(() => validateDirectTimelineContent(content, 10)).toThrow("overlaps");
  });

  it("rejects labels that collide only after authored motion", () => {
    const movingContent = {
      ...mainDiagramContent,
      events: [
        ...mainDiagramContent.events,
        {
          id: "moving-callout",
          type: "text" as const,
          start: 1,
          end: 10,
          layer: 8,
          text: "Moving load",
          x: 500,
          y: 850,
          maxWidth: 260,
          color: "#ffffff",
          fontSize: 24,
          fontWeight: 700,
          translateX: { from: 0, to: 500, easing: "linear" as const },
          backdrop: { fill: "rgba(0,0,0,0.85)", paddingX: 12, paddingY: 8 },
        },
        {
          id: "fixed-callout",
          type: "text" as const,
          start: 1,
          end: 10,
          layer: 8,
          text: "Fixed support",
          x: 1000,
          y: 850,
          maxWidth: 260,
          color: "#ffffff",
          fontSize: 24,
          fontWeight: 700,
          backdrop: { fill: "rgba(0,0,0,0.85)", paddingX: 12, paddingY: 8 },
        },
      ],
    };

    expect(() => validateDirectTimelineContent(movingContent, 10)).toThrow("moving-callout");
  });

  it("allows labels to reuse the same space at disjoint times", () => {
    const sharedLabel = {
      type: "text" as const,
      layer: 8,
      x: 720,
      y: 820,
      maxWidth: 300,
      color: "#ffffff",
      fontSize: 24,
      fontWeight: 700,
      backdrop: { fill: "rgba(0,0,0,0.85)", paddingX: 12, paddingY: 8 },
    };
    const sequentialContent = {
      ...mainDiagramContent,
      events: [
        ...mainDiagramContent.events,
        { ...sharedLabel, id: "stage-one", text: "Stage one", start: 1, end: 4 },
        { ...sharedLabel, id: "stage-two", text: "Stage two", start: 4, end: 8 },
      ],
    };

    expect(() => validateDirectTimelineContent(sequentialContent, 10)).not.toThrow();
  });

  it("allows minor label edge contact without rejecting the timeline", () => {
    const label = {
      type: "text" as const,
      start: 1,
      end: 10,
      layer: 8,
      x: 720,
      maxWidth: 300,
      color: "#ffffff",
      fontSize: 24,
      fontWeight: 700,
      backdrop: { fill: "rgba(0,0,0,0.85)", paddingX: 12, paddingY: 8 },
    };
    const content = {
      ...mainDiagramContent,
      events: [
        ...mainDiagramContent.events,
        { ...label, id: "upper-label", text: "Upper label", y: 820 },
        { ...label, id: "lower-label", text: "Lower label", y: 860 },
      ],
    };

    expect(() => validateDirectTimelineContent(content, 10)).not.toThrow();
  });

  it.each([5, 10, 15, 20] as const)("keeps every standalone part inside a %ss duration", (duration) => {
    const durationArtifacts = artifacts.map((artifact) => artifact.part === "main-diagram"
      ? {
          ...artifact,
          content: {
            ...artifact.content,
            events: artifact.content.events.map((event) => ({ ...event, end: duration })),
          },
        }
      : artifact);
    [...durationArtifacts, { part: "summary" as const, content: damSummaryContent }].forEach((artifact) => {
      const project = buildStandaloneVideoPartProject(artifact, duration, theme);
      expect(project.duration).toBe(duration);
      expect(project.events.every((event) => event.start >= 0 && event.end <= duration)).toBe(true);
      expect(() => VideoProjectSchema.parse(project)).not.toThrow();
    });
  });

  it("retains compact graph rendering when graph flow fits the summary", () => {
    const project = buildStandaloneVideoPartProject(
      { part: "summary", content: summaryContent },
      10,
      theme,
    );
    const ids = project.events.map((event) => event.id);

    expect(ids.some((id) => id.startsWith("scene-0-block-"))).toBe(true);
    expect(ids).toContain("scene-0-node-sun");
    expect(ids).toContain("scene-0-edge-0");
    expect(ids).toContain("scene-0-packet-0");
    expect(ids.some((id) => id.startsWith("scene-0-storyboard-"))).toBe(false);
  });

  it("renders a dam summary as a compact storyboard without graph packets", () => {
    const project = buildStandaloneVideoPartProject(
      { part: "summary", content: damSummaryContent },
      10,
      theme,
    );
    const ids = project.events.map((event) => event.id);

    expect(ids.some((id) => id.startsWith("scene-0-block-"))).toBe(true);
    expect(ids.some((id) => id.startsWith("scene-0-storyboard-"))).toBe(true);
    expect(ids.some((id) => id.startsWith("scene-0-storyboard-stage-caption-"))).toBe(true);
    expect(ids.some((id) => id.startsWith("scene-0-storyboard-primitive-foundation"))).toBe(true);
    expect(ids.some((id) => id.startsWith("scene-0-storyboard-primitive-seal-core"))).toBe(true);
    expect(ids.some((id) => id.startsWith("scene-0-storyboard-primitive-reservoir"))).toBe(true);
    expect(ids.some((id) => id.startsWith("scene-0-node-"))).toBe(false);
    expect(ids.some((id) => id.startsWith("scene-0-edge-"))).toBe(false);
    expect(ids.some((id) => id.startsWith("scene-0-packet-"))).toBe(false);
    const captionStarts = project.events
      .filter((event) => event.id.startsWith("scene-0-storyboard-stage-caption-"))
      .map((event) => event.start);
    expect(captionStarts).toHaveLength(4);
    captionStarts.slice(1).forEach((start, index) => {
      expect(start).toBeGreaterThan(captionStarts[index]);
    });
    expect(() => VideoProjectSchema.parse(project)).not.toThrow();
  });

  it("creates deterministic project ids and renders configured decorations", () => {
    const decoratedTheme = {
      ...theme,
      decorations: { cornerBrackets: true, scanLines: true, pulseRings: true },
    };
    const first = buildStandaloneVideoPartProject(artifacts[0], 5, decoratedTheme);
    const second = buildStandaloneVideoPartProject(artifacts[0], 5, decoratedTheme);

    expect(second.id).toBe(first.id);
    expect(first.events.some((event) => event.id.startsWith("decoration-corner-"))).toBe(true);
    expect(first.events.some((event) => event.id.startsWith("decoration-scan-line-"))).toBe(true);
    expect(first.events.some((event) => event.id.startsWith("decoration-pulse-ring-"))).toBe(true);
  });

  it("repairs invalid model JSON once before returning a generated part", async () => {
    const responses: unknown[] = [
      { title: "", scenes: [] },
      { title: "Solar Power", subtitle: "From light to electricity" },
    ];
    let calls = 0;

    const result = await generateVideoPart(
      { part: "title", prompt, duration: 5 },
      {
        callModel: async () => {
          const response = responses[calls];
          calls += 1;
          return response;
        },
      },
    );

    expect(calls).toBe(2);
    expect(result.part).toBe("title");
    expect(result.content).toEqual({ title: "Solar Power", subtitle: "From light to electricity" });
    expect(result.project.events.some((event) => event.id === "title")).toBe(true);
  });

  it("repairs a spatially invalid direct timeline before rendering it", async () => {
    const invalid = {
      ...mainDiagramContent,
      events: mainDiagramContent.events.map((event) => event.id === "p-layer"
        ? { ...event, x: 4000 }
        : event),
    };
    const userPrompts: string[] = [];
    const modelOptions: Array<{
      maxTokens?: number;
      temperature?: number;
      reasoning?: { enabled: boolean };
    } | undefined> = [];
    let calls = 0;

    const result = await generateVideoPart(
      { part: "main-diagram", prompt, duration: 10 },
      {
        callModel: async (_systemPrompt, userPrompt, options) => {
          userPrompts.push(userPrompt);
          modelOptions.push(options);
          calls += 1;
          return calls === 1 ? invalid : mainDiagramContent;
        },
      },
    );

    expect(calls).toBe(2);
    expect(userPrompts[1]).toContain("canvas");
    expect(modelOptions[0]).toMatchObject({
      maxTokens: 16384,
      temperature: 0.8,
      reasoning: { enabled: false },
    });
    expect(modelOptions[1]).toMatchObject({ temperature: 0.2 });
    expect(result.part).toBe("main-diagram");
    expect(result.project.events).toEqual(mainDiagramContent.events);
  });

  it("gives the repair model the rejected timeline when labels collide", async () => {
    const collidingLabel = {
      type: "text" as const,
      start: 1,
      end: 10,
      layer: 8,
      x: 720,
      y: 300,
      maxWidth: 320,
      color: "#ffffff",
      fontSize: 24,
      fontWeight: 700,
      backdrop: { fill: "rgba(0,0,0,0.85)", paddingX: 12, paddingY: 8 },
    };
    const invalid = {
      ...mainDiagramContent,
      events: [
        ...mainDiagramContent.events,
        { ...collidingLabel, id: "core_label", text: "Concrete core" },
        { ...collidingLabel, id: "floor_label", text: "Floor slab", y: 312 },
      ],
    };
    const userPrompts: string[] = [];
    let calls = 0;

    const result = await generateVideoPart(
      { part: "main-diagram", prompt, duration: 10 },
      {
        callModel: async (_systemPrompt, userPrompt) => {
          userPrompts.push(userPrompt);
          calls += 1;
          if (calls === 1) return invalid;
          return userPrompt.includes('"id": "core_label"')
            ? mainDiagramContent
            : invalid;
        },
      },
    );

    expect(calls).toBe(2);
    expect(userPrompts[1]).toContain('"id": "core_label"');
    expect(userPrompts[1]).toContain('"id": "floor_label"');
    expect(result.project.events).toEqual(mainDiagramContent.events);
  });

  it("repairs truncated provider JSON instead of failing before schema validation", async () => {
    const truncatedContent = `{
      "diagramFamily": "spatial-cutaway",
      "heading": "Dam Construction Overview",
      "blocks": [{ "heading": "Site Preparation", "description": "Excavate terrain"`;
    const parseError = Object.assign(
      new Error(`OpenRouter content is not valid JSON: ${truncatedContent}`),
      {
        name: "OpenRouterJsonParseError",
        content: truncatedContent,
        finishReason: "length",
      },
    );
    const userPrompts: string[] = [];
    const modelOptions: Array<{
      maxTokens?: number;
      temperature?: number;
      reasoning?: { enabled: boolean };
    } | undefined> = [];
    let calls = 0;

    const result = await generateVideoPart(
      { part: "summary", prompt: "How are dams built?", duration: 10 },
      {
        callModel: async (_systemPrompt, userPrompt, options) => {
          userPrompts.push(userPrompt);
          modelOptions.push(options);
          calls += 1;
          if (calls === 1) throw parseError;
          return damSummaryContent;
        },
      },
    );

    expect(calls).toBe(2);
    expect(userPrompts[1]).toContain("PREVIOUS INVALID, TRUNCATED, OR MALFORMED OUTPUT");
    expect(userPrompts[1]).toContain(truncatedContent);
    expect(modelOptions[0]).toMatchObject({
      maxTokens: 4096,
      temperature: 0.65,
      reasoning: { enabled: false },
    });
    expect(modelOptions[1]).toMatchObject({
      maxTokens: 4096,
      temperature: 0.2,
      reasoning: { enabled: false },
    });
    expect(result.part).toBe("summary");
    expect(result.content).toEqual(damSummaryContent);
  });

  it("retries when the provider exhausts its budget before emitting JSON content", async () => {
    const lengthError = Object.assign(
      new Error("OpenRouter returned empty content (finish_reason=length)."),
      {
        name: "OpenRouterLengthError",
        finishReason: "length",
      },
    );
    const userPrompts: string[] = [];
    let calls = 0;

    const result = await generateVideoPart(
      { part: "summary", prompt: "How are dams built?", duration: 10 },
      {
        callModel: async (_systemPrompt, userPrompt) => {
          userPrompts.push(userPrompt);
          calls += 1;
          if (calls === 1) throw lengthError;
          return damSummaryContent;
        },
      },
    );

    expect(calls).toBe(2);
    expect(userPrompts[1]).toContain("finish_reason=length");
    expect(result.part).toBe("summary");
  });

  it("does not retry provider failures unrelated to JSON parsing", async () => {
    let calls = 0;

    await expect(generateVideoPart(
      { part: "summary", prompt: "How are dams built?", duration: 10 },
      {
        callModel: async () => {
          calls += 1;
          throw new Error("OpenRouter HTTP 503 Service Unavailable");
        },
      },
    )).rejects.toThrow("OpenRouter HTTP 503 Service Unavailable");
    expect(calls).toBe(1);
  });

  it("fails after the single repair attempt is also invalid", async () => {
    await expect(generateVideoPart(
      { part: "conclusion", prompt, duration: 5 },
      { callModel: async () => ({ title: "Wrong contract" }) },
    )).rejects.toThrow("could not be validated");
  });

  it("rejects malformed and invalid part requests at the HTTP seam", async () => {
    const malformed = await postGenerateVideoPart(new Request("http://localhost/api/dev/generate-part", {
      method: "POST",
      body: "not-json",
    }) as never);
    expect(malformed.status).toBe(400);

    const invalid = await postGenerateVideoPart(new Request("http://localhost/api/dev/generate-part", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ part: "full-video", prompt, duration: 5 }),
    }) as never);
    expect(invalid.status).toBe(422);
  });

  it("returns 502 when generation fails at the HTTP seam", async () => {
    const request = new Request("http://localhost/api/dev/generate-part", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ part: "title", prompt, duration: 5 }),
    });
    const response = await handleGenerateVideoPartRequest(
      request as never,
      async () => { throw new Error("Provider unavailable"); },
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Provider unavailable" });
  });
});
