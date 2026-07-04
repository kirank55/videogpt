import { describe, expect, it } from "vitest";
import {
  buildProjectFromBrief,
  buildProjectFromBriefWithDiagnostics,
  splitDurationAcrossScenes,
} from "@/lib/agent/brief/buildProjectFromBrief";
import { layoutGraph } from "@/lib/agent/brief/graphLayout";
import { layoutScene } from "@/lib/agent/brief/sceneLayout";
import { PALETTES } from "@/lib/others/catalog/palettes";
import { STYLES } from "@/lib/others/catalog/styles";
import type { SupportedDuration, VideoBrief } from "@/lib/agent/schemas/brief";
import type { ShapeEvent, TextEvent } from "@/lib/ui/renderer";

function sceneBrief(overrides: Partial<VideoBrief> = {}): VideoBrief {
  return {
    title: "Client Server Flow",
    subtitle: "From browser to data",
    closingLine: "That is the round trip.",
    palette: "midnight",
    style: "modern",
    particleIntensity: 1,
    scenes: [
      {
        heading: "Request Leaves The Browser",
        diagramLayout: "client-server",
        blocks: [
          { heading: "Client", description: "The browser prepares a request.", icon: "browser" },
          { heading: "Server", description: "The API receives and validates it.", icon: "server" },
        ],
        graph: {
          nodes: [
            { id: "client", label: "Client", icon: "browser" },
            { id: "server", label: "Server", icon: "server" },
          ],
          edges: [
            { from: "client", to: "server", label: "GET /api", animated: true, packetLabel: "GET" },
          ],
        },
        entryAnimation: "slide-up",
        blockStyle: "cards",
        transition: "fade",
        sceneWeight: 1,
      },
      {
        heading: "Response Comes Back",
        diagramLayout: "pipeline",
        blocks: [
          { heading: "Query", description: "The server reads the data.", icon: "database" },
          { heading: "Serialize", description: "The response is shaped for the client.", icon: "code" },
          { heading: "Render", description: "The browser updates the interface.", icon: "app" },
        ],
        graph: {
          nodes: [
            { id: "db", label: "Database", icon: "database" },
            { id: "api", label: "API", icon: "api" },
            { id: "ui", label: "UI", icon: "browser" },
          ],
          edges: [
            { from: "db", to: "api", label: "rows", animated: true },
            { from: "api", to: "ui", label: "json", animated: true },
          ],
        },
        entryAnimation: "scale-up",
        blockStyle: "timeline",
        transition: "slide-left",
        sceneWeight: 2,
      },
    ],
    ...overrides,
  };
}

function skyscraperBrief(): VideoBrief {
  return {
    title: "How Skyscrapers Are Built",
    subtitle: "From bedrock to skyline",
    closingLine: "From foundation to skyline - engineering that touches the clouds.",
    palette: "midnight",
    style: "modern",
    particleIntensity: 1,
    titleSize: "large",
    titleAlign: "center",
    closingStyle: "fade-up",
    scenes: [
      {
        heading: "1. Deep Foundations",
        diagramLayout: "stack",
        blocks: [
          { heading: "Bedrock Anchors", description: "Piles driven deep into bedrock support immense weight.", icon: "gear" },
          { heading: "Concrete Mat", description: "A thick concrete slab distributes loads evenly.", icon: "server" },
          { heading: "Waterproofing", description: "Membranes and drainage protect against groundwater.", icon: "shield" },
        ],
        graph: {
          nodes: [
            { id: "bedrock", label: "Bedrock", icon: "gear", layoutRole: "step" },
            { id: "mat", label: "Concrete Mat", icon: "server", layoutRole: "step" },
            { id: "waterproof", label: "Waterproofing", icon: "shield", layoutRole: "step" },
          ],
          edges: [
            { from: "bedrock", to: "mat", animated: true },
            { from: "mat", to: "waterproof", animated: true },
          ],
        },
        entryAnimation: "slide-up",
        blockStyle: "stacked",
        emphasizeIndex: 0,
        transition: "fade",
      },
      {
        heading: "2. Steel Superstructure",
        diagramLayout: "pipeline",
        blocks: [
          { heading: "Steel Frame", description: "Columns and beams form the skeleton of the tower.", icon: "cpu" },
          { heading: "Floor Decks", description: "Concrete slabs on metal decking create each floor.", icon: "app" },
          { heading: "Core & Elevators", description: "Central core houses elevators, stairs, and utilities.", icon: "api" },
        ],
        graph: {
          nodes: [
            { id: "frame", label: "Steel Frame", icon: "cpu", layoutRole: "source" },
            { id: "decks", label: "Floor Decks", icon: "app", layoutRole: "step" },
            { id: "core", label: "Core & Elevators", icon: "api", layoutRole: "sink" },
          ],
          edges: [
            { from: "frame", to: "decks", animated: true, label: "erect" },
            { from: "decks", to: "core", animated: true, label: "install" },
          ],
        },
        entryAnimation: "slide-left",
        blockStyle: "numbered",
        emphasizeIndex: -1,
        transition: "slide-left",
      },
      {
        heading: "3. Facade & Finishing",
        diagramLayout: "hub-spoke",
        blocks: [
          { heading: "Curtain Wall", description: "Glass panels are installed from top to bottom.", icon: "browser" },
          { heading: "MEP Systems", description: "Mechanical, electrical, and plumbing networks.", icon: "gear" },
          { heading: "Interior Fit-Out", description: "Walls, ceilings, and finishes complete each space.", icon: "code" },
        ],
        graph: {
          nodes: [
            { id: "building", label: "Building Shell", icon: "app", layoutRole: "hub" },
            { id: "curtain", label: "Curtain Wall", icon: "browser", layoutRole: "spoke" },
            { id: "mep", label: "MEP Systems", icon: "gear", layoutRole: "spoke" },
            { id: "interior", label: "Interior Fit-Out", icon: "code", layoutRole: "spoke" },
          ],
          edges: [
            { from: "building", to: "curtain", animated: true },
            { from: "building", to: "mep", animated: true },
            { from: "building", to: "interior", animated: true },
          ],
        },
        entryAnimation: "fade-only",
        blockStyle: "cards",
        emphasizeIndex: 1,
        transition: "fade",
      },
    ],
  };
}

function generatedSkyscraperBrief(): VideoBrief {
  return {
    title: "How Skyscrapers Are Built",
    subtitle: "From bedrock to skyline",
    closingLine: "Engineering that reaches the sky.",
    palette: "slate",
    style: "modern",
    particleIntensity: 0.5,
    titleSize: "large",
    titleAlign: "center",
    closingStyle: "fade-up",
    decorations: {
      cornerBrackets: true,
      scanLines: false,
      pulseRings: false,
      gapDivider: true,
      decoBaseline: true,
    },
    scenes: [
      {
        heading: "Deep Foundations",
        diagramLayout: "stack",
        blocks: [
          { heading: "Bedrock Anchors", description: "Piles driven deep into stable rock to support immense weight.", icon: "foundation" },
          { heading: "Concrete Mat", description: "Thick reinforced slab spreads load across the ground.", icon: "floor" },
        ],
        graph: {
          nodes: [
            { id: "bedrock", label: "Bedrock", icon: "foundation", layoutRole: "step" },
            { id: "piles", label: "Piles", icon: "beam", layoutRole: "step" },
            { id: "mat", label: "Concrete Mat", icon: "floor", layoutRole: "step" },
          ],
          edges: [
            { from: "bedrock", to: "piles", animated: true, label: "driven in" },
            { from: "piles", to: "mat", animated: true, label: "poured over" },
          ],
        },
        entryAnimation: "slide-up",
        blockStyle: "stacked",
        emphasizeIndex: 0,
        transition: "fade",
      },
      {
        heading: "Steel Core & Floors",
        diagramLayout: "pipeline",
        blocks: [
          { heading: "Steel Frame", description: "Vertical columns and horizontal beams form the skeleton.", icon: "beam" },
          { heading: "Concrete Core", description: "Central reinforced shaft resists wind and houses elevators.", icon: "wall" },
          { heading: "Floor Slabs", description: "Precast concrete decks added level by level.", icon: "floor" },
        ],
        graph: {
          nodes: [
            { id: "columns", label: "Columns & Beams", icon: "beam", layoutRole: "source" },
            { id: "core", label: "Concrete Core", icon: "wall", layoutRole: "step" },
            { id: "floors", label: "Floor Slabs", icon: "floor", layoutRole: "sink" },
          ],
          edges: [
            { from: "columns", to: "core", animated: true, label: "erected" },
            { from: "core", to: "floors", animated: true, label: "poured" },
          ],
        },
        entryAnimation: "scale-up",
        blockStyle: "numbered",
        emphasizeIndex: -1,
        transition: "slide-left",
      },
      {
        heading: "Facade & Finishing",
        diagramLayout: "hub-spoke",
        blocks: [
          { heading: "Glass Curtain Wall", description: "Lightweight panels enclose the building, allowing natural light.", icon: "building" },
          { heading: "Interior Fit-Out", description: "MEP systems, elevators, and interior walls complete the space.", icon: "wrench" },
        ],
        graph: {
          nodes: [
            { id: "building", label: "Skyscraper", icon: "building", layoutRole: "hub" },
            { id: "facade", label: "Curtain Wall", icon: "wall", layoutRole: "spoke" },
            { id: "interior", label: "Interior Systems", icon: "wrench", layoutRole: "spoke" },
          ],
          edges: [
            { from: "facade", to: "building", animated: true, label: "installed" },
            { from: "interior", to: "building", animated: true, label: "fitted" },
          ],
        },
        entryAnimation: "fade-only",
        blockStyle: "cards",
        emphasizeIndex: 0,
        transition: "zoom-in",
      },
    ],
  };
}

function textEvents(project: ReturnType<typeof buildProjectFromBrief>) {
  return project.events.filter((event): event is TextEvent => event.type === "text");
}

function shapeEvents(project: ReturnType<typeof buildProjectFromBrief>) {
  return project.events.filter((event): event is ShapeEvent => event.type === "shape");
}

type IconShapeEvent = Extract<ShapeEvent, { shapeType: "icon" }>;

describe("splitDurationAcrossScenes", () => {
  it("splits duration evenly when weights are absent", () => {
    expect(splitDurationAcrossScenes(20, [undefined, undefined, undefined, undefined])).toEqual([
      { start: 0, end: 5, duration: 5 },
      { start: 5, end: 10, duration: 5 },
      { start: 10, end: 15, duration: 5 },
      { start: 15, end: 20, duration: 5 },
    ]);
  });

  it("normalizes scene weights", () => {
    const slices = splitDurationAcrossScenes(15, [1, 2]);
    expect(slices[0].duration).toBeCloseTo(5, 2);
    expect(slices[1].duration).toBeCloseTo(10, 2);
    expect(slices[1].end).toBe(15);
  });
});

describe("layoutGraph", () => {
  const graph = sceneBrief().scenes[1].graph;
  const blocks = sceneBrief().scenes[1].blocks;

  it("pipeline lays nodes left-to-right", () => {
    const layout = layoutGraph(graph, blocks, "pipeline", { width: 1920, height: 1080 });
    expect(layout.nodes[0].cx).toBeLessThan(layout.nodes[1].cx);
    expect(layout.nodes[1].cx).toBeLessThan(layout.nodes[2].cx);
  });

  it("client-server puts groups on opposite sides", () => {
    const layout = layoutGraph(graph, blocks, "client-server", { width: 1920, height: 1080 });
    expect(layout.nodes[0].cx).toBeLessThan(960);
    expect(layout.nodes[2].cx).toBeGreaterThan(960);
  });

  it("hub-spoke keeps the first node in the center", () => {
    const layout = layoutGraph(graph, blocks, "hub-spoke", { width: 1920, height: 1080 });
    expect(layout.nodes[0].cx).toBe(960);
    expect(layout.nodes[0].cy).toBe(530);
  });

  it("stack lays nodes vertically", () => {
    const layout = layoutGraph(graph, blocks, "stack", { width: 1920, height: 1080 });
    expect(layout.nodes[0].cy).toBeLessThan(layout.nodes[1].cy);
    expect(layout.nodes[1].cy).toBeLessThan(layout.nodes[2].cy);
  });
});

describe("layoutScene", () => {
  it("uses layoutRole to place client-server nodes semantically", () => {
    const scene = {
      ...sceneBrief().scenes[0],
      graph: {
        nodes: [
          { id: "server", label: "Server", icon: "server" as const, layoutRole: "server" as const },
          { id: "client", label: "Client", icon: "browser" as const, layoutRole: "client" as const },
        ],
        edges: [{ from: "client", to: "server", animated: true }],
      },
    };

    const plan = layoutScene(scene, { width: 1920, height: 1080 });
    const client = plan.nodes.find((node) => node.id === "client");
    const server = plan.nodes.find((node) => node.id === "server");

    expect(client?.cx).toBeLessThan(960);
    expect(server?.cx).toBeGreaterThan(960);
    expect(plan.diagnostics.attempts.length).toBeGreaterThan(0);
  });

  it("returns dev-only layout diagnostics outside the renderable project", () => {
    const result = buildProjectFromBriefWithDiagnostics(sceneBrief(), 15);

    expect(result.diagnostics.layout).toHaveLength(2);
    expect(result.diagnostics.layout[0].requestedStrategy).toBe("client-server");
    expect(result.project).not.toHaveProperty("diagnostics");
  });
});

describe("buildProjectFromBrief", () => {
  const DUR: SupportedDuration = 15;

  it("produces a flat timeline with global background, title, scenes, and closing", () => {
    const project = buildProjectFromBrief(sceneBrief(), DUR);
    const ids = project.events.map((event) => event.id);

    expect(project.duration).toBe(DUR);
    expect(ids).toContain("bg");
    expect(ids).toContain("title");
    expect(ids).toContain("scene-0-heading");
    expect(ids).toContain("scene-1-heading");
    expect(ids).toContain("closing-line");
  });

  it("brackets scenes between separate title and closing beats", () => {
    const project = buildProjectFromBrief(skyscraperBrief(), DUR);
    const title = textEvents(project).find((event) => event.id === "title");
    const subtitle = textEvents(project).find((event) => event.id === "subtitle");
    const firstSceneHeading = textEvents(project).find((event) => event.id === "scene-0-heading");
    const closing = textEvents(project).find((event) => event.id === "closing-line");
    const sceneEvents = project.events.filter((event) => event.id.startsWith("scene-"));

    expect(title).toBeDefined();
    expect(subtitle).toBeDefined();
    expect(firstSceneHeading).toBeDefined();
    expect(closing).toBeDefined();
    expect(title!.end).toBeLessThanOrEqual(firstSceneHeading!.start);
    expect(subtitle!.end).toBeLessThanOrEqual(firstSceneHeading!.start);
    expect(Math.max(...sceneEvents.map((event) => event.end))).toBeLessThanOrEqual(closing!.start);
  });

  it("centers title-only intro compositions vertically", () => {
    const project = buildProjectFromBrief(generatedSkyscraperBrief(), DUR);
    const title = textEvents(project).find((event) => event.id === "title");
    const subtitle = textEvents(project).find((event) => event.id === "subtitle");

    expect(title).toBeDefined();
    expect(subtitle).toBeDefined();
    expect(title!.y).toBeGreaterThan(360);
    expect(title!.y).toBeLessThan(500);
    expect(subtitle!.y).toBeGreaterThan(title!.y);
  });

  it("keeps numbered block icons clear of the ordinal labels", () => {
    const project = buildProjectFromBrief(generatedSkyscraperBrief(), DUR);
    const numbers = textEvents(project).filter((event) => event.id.includes("scene-1-block-num"));
    const icons = shapeEvents(project).filter((event): event is IconShapeEvent =>
      event.shapeType === "icon" && event.id.includes("scene-1-block-icon")
    );

    expect(numbers).toHaveLength(3);
    expect(icons).toHaveLength(3);
    for (const number of numbers) {
      const icon = icons.find((candidate) =>
        candidate.id.endsWith(number.id.at(-1) ?? "")
      );
      expect(icon).toBeDefined();
      expect(icon!.cx).toBeGreaterThan(number.x + number.maxWidth + 16);
    }
  });

  it("does not shadow every un-emphasized diagram rectangle", () => {
    const project = buildProjectFromBrief(generatedSkyscraperBrief(), DUR);
    const steelNodes = shapeEvents(project).filter((event) =>
      event.shapeType === "rect" && event.id.startsWith("scene-1-node-")
    );

    expect(steelNodes).toHaveLength(3);
    expect(steelNodes.every((event) => event.shadow === undefined)).toBe(true);
  });

  it("keeps concise construction card descriptions and edge labels visible", () => {
    const result = buildProjectFromBriefWithDiagnostics(skyscraperBrief(), DUR);
    const finalScene = result.diagnostics.layout.find((diagnostic) =>
      diagnostic.sceneHeading === "3. Facade & Finishing"
    );
    const steelScene = result.diagnostics.layout.find((diagnostic) =>
      diagnostic.sceneHeading === "2. Steel Superstructure"
    );

    expect(finalScene?.messages.filter((message) => message.code === "text-fit")).toEqual([]);
    expect(steelScene?.chosenVariant).toBe("roomy-labels-on");
    expect(steelScene?.attempts.find((attempt) => attempt.variant === "roomy-labels-on")?.collisions).toBe(0);
  });

  it("does not keep generic tech icons for construction labels", () => {
    const project = buildProjectFromBrief(skyscraperBrief(), DUR);
    const icons = shapeEvents(project).filter((event) => event.shapeType === "icon");
    const iconById = new Map(icons.map((event) => [event.id, event.iconName]));

    expect(iconById.get("scene-1-block-icon-0")).not.toBe("cpu");
    expect(iconById.get("scene-1-block-icon-1")).not.toBe("app");
    expect(iconById.get("scene-1-block-icon-2")).not.toBe("api");
    expect(iconById.get("scene-2-block-icon-0")).not.toBe("browser");
    expect(iconById.get("scene-2-block-icon-2")).not.toBe("code");
  });

  it("emits block heading and description text for every scene block", () => {
    const project = buildProjectFromBrief(sceneBrief(), DUR);
    const headings = textEvents(project).filter((event) => event.id.includes("block-heading"));
    const descs = textEvents(project).filter((event) => event.id.includes("block-desc"));

    expect(headings).toHaveLength(5);
    expect(descs).toHaveLength(5);
  });

  it("emits node rectangles, edge lines, and animated packets", () => {
    const project = buildProjectFromBrief(sceneBrief(), DUR);
    const shapes = shapeEvents(project);

    expect(shapes.some((event) => event.id === "scene-0-node-client")).toBe(true);
    expect(shapes.some((event) => event.id === "scene-0-edge-0" && event.shapeType === "line")).toBe(true);
    expect(shapes.some((event) => event.id === "scene-0-packet-0" && event.shapeType === "circle")).toBe(true);
  });

  it("uses scene weights to give later scenes more time", () => {
    const project = buildProjectFromBrief(sceneBrief(), DUR);
    const scene0Heading = textEvents(project).find((event) => event.id === "scene-0-heading");
    const scene1Heading = textEvents(project).find((event) => event.id === "scene-1-heading");

    expect(scene0Heading).toBeDefined();
    expect(scene1Heading).toBeDefined();
    expect(scene0Heading!.end - scene0Heading!.start).toBeLessThan(
      scene1Heading!.end - scene1Heading!.start,
    );
  });

  it("different palettes produce different background gradients", () => {
    const midnight = buildProjectFromBrief(sceneBrief({ palette: "midnight" }), DUR);
    const neon = buildProjectFromBrief(sceneBrief({ palette: "neon" }), DUR);
    const midnightBg = midnight.events.find((event) => event.type === "background");
    const neonBg = neon.events.find((event) => event.type === "background");

    expect(midnightBg).not.toEqual(neonBg);
  });

  it("all named palettes produce distinct background starts", () => {
    const froms = new Set<string>();
    for (const palette of Object.keys(PALETTES)) {
      const project = buildProjectFromBrief(sceneBrief({ palette }), DUR);
      const bg = project.events.find((event) => event.type === "background");
      if (bg?.type === "background" && bg.background.kind === "gradient") {
        froms.add(bg.background.from);
      }
    }
    expect(froms.size).toBe(Object.keys(PALETTES).length);
  });

  it("minimal style omits ambient particles", () => {
    const project = buildProjectFromBrief(sceneBrief({ style: "minimal" }), DUR);
    expect(project.events.find((event) => event.id === "ambient-particles")).toBeUndefined();
  });

  it("neon-glow style uses its particle density", () => {
    const project = buildProjectFromBrief(sceneBrief({ style: "neon-glow", particleIntensity: 1 }), DUR);
    const ambient = project.events.find((event) => event.id === "ambient-particles");
    expect(ambient).toBeDefined();
    if (ambient?.type === "particle") {
      expect(ambient.count).toBe(STYLES["neon-glow"].particleDensity);
    }
  });

  it.each([5, 10, 15, 20] as SupportedDuration[])(
    "%ds project has events inside the requested duration",
    (duration) => {
      const project = buildProjectFromBrief(sceneBrief(), duration);
      expect(project.duration).toBe(duration);
      expect(project.events.length).toBeGreaterThan(0);
      for (const event of project.events) {
        expect(event.start).toBeGreaterThanOrEqual(0);
        expect(event.end).toBeLessThanOrEqual(duration);
        expect(event.end).toBeGreaterThan(event.start);
      }
    },
  );
});
