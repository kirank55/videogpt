import { describe, expect, it } from "vitest";
import {
  buildProjectFromBrief,
  splitDurationAcrossScenes,
} from "@/lib/agent/brief/buildProjectFromBrief";
import { layoutGraph } from "@/lib/agent/brief/graphLayout";
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

function textEvents(project: ReturnType<typeof buildProjectFromBrief>) {
  return project.events.filter((event): event is TextEvent => event.type === "text");
}

function shapeEvents(project: ReturnType<typeof buildProjectFromBrief>) {
  return project.events.filter((event): event is ShapeEvent => event.type === "shape");
}

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
    expect(layout.nodes[0].cy).toBe(485);
  });

  it("stack lays nodes vertically", () => {
    const layout = layoutGraph(graph, blocks, "stack", { width: 1920, height: 1080 });
    expect(layout.nodes[0].cy).toBeLessThan(layout.nodes[1].cy);
    expect(layout.nodes[1].cy).toBeLessThan(layout.nodes[2].cy);
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
