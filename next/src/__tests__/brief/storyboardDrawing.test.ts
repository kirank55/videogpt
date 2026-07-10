import { describe, expect, it } from "vitest";
import { validateBrief } from "@/lib/agent/brief/validateBrief";
import { compileStoryboardScene } from "@/lib/agent/brief/storyboardDrawing";
import { PALETTES } from "@/lib/others/catalog/palettes";
import { STYLES } from "@/lib/others/catalog/styles";
import type { DiagramFamily, Scene } from "@/lib/agent/schemas/brief";
import type { ShapeEvent } from "@/lib/ui/renderer";

type RectShapeEvent = Extract<ShapeEvent, { shapeType: "rect" }>;
type CircleShapeEvent = Extract<ShapeEvent, { shapeType: "circle" }>;
type LineShapeEvent = Extract<ShapeEvent, { shapeType: "line" }>;

const REGION = { x: 220, y: 285, width: 1480, height: 560 };
const SLICE = { start: 2, end: 8, duration: 6 };
const PALETTE = PALETTES.slate;
const STYLE = STYLES.modern;

function sceneFrom(rawScene: Record<string, unknown>): Scene {
  return validateBrief({
    title: "Storyboard Test",
    palette: "slate",
    style: "modern",
    scenes: [rawScene],
  }).scenes[0];
}

function baseScene(family: DiagramFamily, overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    heading: `${family} scene`,
    diagramScript: {
      summary: `Draw a ${family} storyboard.`,
      beats: ["A", "B", "C"],
      visualStory: "A clean line drawing reveals the requested mechanism.",
      mustShow: ["A", "B", "C"],
    },
    diagramIntent: {
      family,
      subject: `${family} drawing`,
      signatureVisuals: ["A", "B", "C"],
      motionCues: ["draw in stages"],
    },
    diagramLayout: "stack",
    blocks: [
      { heading: "A", description: "First stage." },
      { heading: "B", description: "Second stage." },
    ],
    ...overrides,
  };
}

function shapeEvents(scene: Scene): ShapeEvent[] {
  return compileStoryboardScene(scene, SLICE, REGION, PALETTE, STYLE, 0)
    .events
    .filter((event): event is ShapeEvent => event.type === "shape");
}

describe("compileStoryboardScene", () => {
  it("emits progressive skyscraper drawing shapes for build-up scenes", () => {
    const scene = sceneFrom(baseScene("build-up", {
      heading: "Skyscraper Build",
      visualPrimitives: [
        { id: "foundation", type: "foundation mat", label: "Foundation", drawingRole: "layer" },
        { id: "core", type: "concrete core", label: "Core", drawingRole: "support" },
        { id: "tower", type: "tower mass", label: "Tower Body", drawingRole: "mass" },
        { id: "windows", type: "window panels", label: "Windows", drawingRole: "panel" },
      ],
      primitiveRelationships: [
        { from: ["foundation"], to: ["core"], relation: "supports" },
        { from: ["core"], to: ["tower"], relation: "stiffens" },
      ],
      storyboard: {
        style: "line-drawing",
        continuityKey: "skyscraper",
        stages: [
          { label: "Foundation", operation: "reveal", primitiveIds: ["foundation"] },
          { label: "Core rises", operation: "grow", primitiveIds: ["core"] },
          { label: "Floors stack", operation: "grow", primitiveIds: ["tower"] },
          { label: "Windows", operation: "fill", primitiveIds: ["windows"] },
        ],
      },
    }));

    const result = compileStoryboardScene(scene, SLICE, REGION, PALETTE, STYLE, 0);
    const shapes = result.events.filter((event): event is ShapeEvent => event.type === "shape");

    expect(result.diagnostics.used).toBe(true);
    expect(result.diagnostics.stageCount).toBe(4);
    expect(result.diagnostics.boundsCoverage).toBeGreaterThan(0.3);
    expect(result.diagnostics.layoutFamily).toBe("build-up");
    expect(shapes.some((event) => event.id.includes("foundation") && event.shapeType === "rect")).toBe(true);
    expect(shapes.some((event) => event.id.includes("core") && event.shapeType === "line")).toBe(true);
    expect(shapes.filter((event) => event.id.includes("windows-pane") && event.shapeType === "rect").length)
      .toBeGreaterThanOrEqual(9);
    expect(shapes.some((event) => event.id.includes("stage-"))).toBe(true);
    expect(shapes.some((event) => event.id.includes("node-"))).toBe(false);
  });

  it("emits receiver pins and emitter-centered range rings for field-range scenes", () => {
    const scene = sceneFrom(baseScene("field-range", {
      visualPrimitives: [
        { id: "satA", type: "satellite", label: "Satellite A", drawingRole: "pin" },
        { id: "satB", type: "satellite", label: "Satellite B", drawingRole: "pin" },
        { id: "rangeA", type: "range circle", label: "Range A", drawingRole: "ring" },
        { id: "rangeB", type: "range circle", label: "Range B", drawingRole: "ring" },
        { id: "receiver", type: "receiver pin", label: "Receiver", drawingRole: "pin" },
      ],
      primitiveRelationships: [
        { from: ["satA"], to: ["rangeA"], relation: "broadcasts" },
        { from: ["satB"], to: ["rangeB"], relation: "broadcasts" },
        { from: ["rangeA", "rangeB"], to: ["receiver"], relation: "intersects at receiver" },
      ],
      storyboard: {
        style: "line-drawing",
        stages: [
          { label: "Satellites", operation: "reveal", primitiveIds: ["satA", "satB"] },
          { label: "Range", operation: "trace", primitiveIds: ["rangeA", "rangeB"] },
          { label: "Receiver", operation: "pulse", primitiveIds: ["receiver"] },
        ],
      },
    }));

    const shapes = shapeEvents(scene);
    const circles = shapes.filter((event): event is CircleShapeEvent => event.shapeType === "circle");
    const rings = circles.filter((event) => event.id.includes("range") && event.fill === "transparent");
    const satellites = circles.filter((event) => event.id.includes("sat") && !event.id.includes("signal"));
    const receiver = circles.find((event) => event.id.includes("receiver") && !event.id.includes("pulse"));
    const center = { x: REGION.x + REGION.width / 2, y: REGION.y + REGION.height / 2 };

    expect(rings.length).toBeGreaterThanOrEqual(2);
    expect(satellites.length).toBeGreaterThanOrEqual(2);
    expect(rings.every((event) => Math.hypot(event.x - center.x, event.y - center.y) > 40)).toBe(true);
    expect(receiver).toBeDefined();
    expect(Math.hypot(receiver!.x - center.x, receiver!.y - center.y)).toBeGreaterThan(20);
    expect(shapes.some((event) => event.shapeType === "line" && event.id.includes("field-link"))).toBe(true);
  });

  it("emits circular positions and traced connectors for cycle scenes", () => {
    const scene = sceneFrom(baseScene("cycle", {
      visualPrimitives: [
        { id: "evaporation", type: "evaporation", label: "Evaporation", drawingRole: "pin" },
        { id: "cloud", type: "cloud", label: "Cloud", drawingRole: "pin" },
        { id: "rain", type: "rainfall", label: "Rainfall", drawingRole: "pin" },
      ],
      primitiveRelationships: [
        { from: ["evaporation"], to: ["cloud"], relation: "condenses" },
        { from: ["cloud"], to: ["rain"], relation: "falls" },
      ],
      storyboard: {
        style: "line-drawing",
        stages: [
          { label: "Evaporate", operation: "reveal", primitiveIds: ["evaporation"] },
          { label: "Trace cycle", operation: "trace", primitiveIds: ["evaporation", "cloud", "rain"] },
        ],
      },
    }));

    const shapes = shapeEvents(scene);
    const connectors = shapes.filter((event): event is LineShapeEvent =>
      event.shapeType === "line" && event.id.includes("connector")
    );

    expect(shapes.filter((event) => event.shapeType === "circle").length).toBeGreaterThanOrEqual(3);
    expect(connectors.length).toBeGreaterThanOrEqual(3);
    expect(shapes.some((event) => event.id.includes("cycle-guide") && event.shapeType === "circle")).toBe(true);
    expect(shapes.some((event) => /-(rain|cloud|water|ray)-/.test(event.id))).toBe(true);
  });

  it("emits stronger cross-section detail for spatial cutaway scenes", () => {
    const scene = sceneFrom(baseScene("spatial-cutaway", {
      visualPrimitives: [
        { id: "soil", type: "soil layer", label: "Soil Layer", drawingRole: "layer" },
        { id: "vessel", type: "container shell", label: "Tank Shell", drawingRole: "container" },
        { id: "pier", type: "support pier", label: "Support Pier", drawingRole: "support" },
        { id: "liner", type: "inner panel liner", label: "Liner Panels", drawingRole: "panel" },
      ],
      primitiveRelationships: [
        { from: ["pier"], to: ["vessel"], relation: "supports" },
        { from: ["liner"], to: ["vessel"], relation: "lines interior" },
      ],
      storyboard: {
        style: "line-drawing",
        stages: [
          { label: "Ground", operation: "reveal", primitiveIds: ["soil"] },
          { label: "Shell", operation: "trace", primitiveIds: ["vessel"] },
          { label: "Pier", operation: "grow", primitiveIds: ["pier"] },
          { label: "Liner", operation: "fill", primitiveIds: ["liner"] },
        ],
      },
    }));

    const shapes = shapeEvents(scene);

    expect(shapes.some((event) => event.id.includes("soil-hatch") && event.shapeType === "line")).toBe(true);
    expect(shapes.some((event) => event.id.includes("vessel-inner") && event.shapeType === "rect")).toBe(true);
    expect(shapes.some((event) => event.id.includes("vessel-trace") && event.shapeType === "line")).toBe(true);
    expect(shapes.some((event) => event.id.includes("liner-fill-sweep") && event.shapeType === "rect")).toBe(true);
  });

  it("makes generic storyboard operations visibly distinct", () => {
    const scene = sceneFrom(baseScene("build-up", {
      visualPrimitives: [
        { id: "base", type: "base layer", label: "Base Layer", drawingRole: "layer" },
        { id: "frame", type: "modular beam frame", label: "Beam Frame", drawingRole: "support" },
        { id: "skin", type: "outer panel skin", label: "Outer Skin", drawingRole: "panel" },
        { id: "finish", type: "finish slab plate", label: "Finish Plate", drawingRole: "panel" },
        { id: "sensor", type: "inspection pin", label: "Inspection Point", drawingRole: "pin" },
      ],
      primitiveRelationships: [
        { from: ["frame"], to: ["skin"], relation: "connects to" },
        { from: ["sensor"], to: ["finish"], relation: "checks" },
      ],
      storyboard: {
        style: "line-drawing",
        stages: [
          { label: "Base", operation: "reveal", primitiveIds: ["base"] },
          { label: "Frame grows", operation: "grow", primitiveIds: ["frame"] },
          { label: "Trace skin", operation: "trace", primitiveIds: ["skin"] },
          { label: "Fill finish", operation: "fill", primitiveIds: ["finish"] },
          { label: "Inspect", operation: "pulse", primitiveIds: ["sensor"] },
          { label: "Connect", operation: "connect", primitiveIds: ["frame", "sensor"] },
        ],
      },
    }));

    const shapes = shapeEvents(scene);

    expect(shapes.some((event) => event.id.includes("base-hatch") && event.shapeType === "line")).toBe(true);
    expect(shapes.some((event) => event.id.includes("frame-beam") && event.shapeType === "line")).toBe(true);
    expect(shapes.some((event) => event.id.includes("skin-trace") && event.shapeType === "line")).toBe(true);
    expect(shapes.some((event) => event.id.includes("finish-fill-sweep") && event.shapeType === "rect")).toBe(true);
    expect(shapes.some((event) => event.id.includes("storyboard-pulse") && event.shapeType === "circle")).toBe(true);
    expect(shapes.some((event) => event.id.includes("storyboard-connector") && event.shapeType === "line")).toBe(true);
  });

  it("places comparison storyboard primitives into two drawing regions", () => {
    const scene = sceneFrom(baseScene("comparison", {
      visualPrimitives: [
        { id: "before", type: "before panel", label: "Before", drawingRole: "panel" },
        { id: "after", type: "after panel", label: "After", drawingRole: "panel" },
      ],
      primitiveRelationships: [
        { from: ["before"], to: ["after"], relation: "changes into" },
        { from: ["after"], to: ["before"], relation: "contrasts with" },
      ],
      storyboard: {
        style: "line-drawing",
        stages: [
          { label: "Before", operation: "reveal", primitiveIds: ["before"] },
          { label: "After", operation: "reveal", primitiveIds: ["after"] },
        ],
      },
    }));

    const panels = shapeEvents(scene).filter((event): event is RectShapeEvent =>
      event.shapeType === "rect" &&
      (event.id.includes("before") || event.id.includes("after")) &&
      !event.id.includes("pane")
    );

    expect(panels).toHaveLength(2);
    expect(Math.abs(panels[0].x - panels[1].x)).toBeGreaterThan(REGION.width * 0.35);
    expect(shapeEvents(scene).some((event) => event.id.includes("pane"))).toBe(false);
    expect(shapeEvents(scene).some((event) => event.id.includes("comparison-arrow"))).toBe(true);
  });
});
