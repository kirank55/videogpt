import { describe, expect, it } from "vitest";
import {
  AnimatedValueSchema,
  BackgroundEventSchema,
  ParticleEventSchema,
  PathAnimationSchema,
  ShapeEventSchema,
  TextEventSchema,
  TimelineEventSchema,
  VideoProjectSchema,
} from "@/lib/others/schemas/timeline";
import { SupportedDurationSchema } from "@/lib/others/schemas/duration";

describe("timeline schemas", () => {
  it.each([5, 10, 15, 20])("accepts supported duration %s", (duration) => {
    expect(SupportedDurationSchema.parse(duration)).toBe(duration);
  });

  it("accepts classic and keyframed animation", () => {
    expect(AnimatedValueSchema.parse({ from: 0, to: 1, easing: "easeOut" })).toBeDefined();
    expect(AnimatedValueSchema.parse({
      keyframes: [
        { time: 0, value: 0, easing: "linear" },
        { time: 1, value: 1, easing: "easeOut" },
      ],
    })).toBeDefined();
  });

  it("accepts renderer background, text, shape, and particle events", () => {
    const events = [
      BackgroundEventSchema.parse({
        id: "bg", type: "background", start: 0, end: 5, layer: 0,
        background: { kind: "solid", color: "#000" },
      }),
      TextEventSchema.parse({
        id: "text", type: "text", start: 0, end: 5, layer: 8,
        text: "Label", x: 100, y: 100, maxWidth: 400, color: "#fff", fontSize: 32,
      }),
      ShapeEventSchema.parse({
        id: "shape", type: "shape", shapeType: "rect", start: 0, end: 5, layer: 2,
        x: 100, y: 200, width: 300, height: 200, fill: "#2563eb",
      }),
      ParticleEventSchema.parse({
        id: "particles", type: "particle", start: 0, end: 5, layer: 3,
        count: 10, seed: 1, origin: { x: 960, y: 540 }, spread: { x: 20, y: 20 },
        drift: { x: 2, y: -1 }, particleRadius: { min: 1, max: 3 }, color: "#fff",
      }),
    ];
    events.forEach((event) => expect(TimelineEventSchema.parse(event)).toEqual(event));
  });

  it.each([
    ["rect", { x: 20, y: 30, width: 100, height: 80, fill: "#fff" }],
    ["circle", { x: 100, y: 100, radius: 40, fill: "#fff" }],
    ["triangle", { x: 20, y: 30, width: 100, height: 80, fill: "#fff" }],
    ["line", { x1: 20, y1: 30, x2: 200, y2: 300, stroke: "#fff", lineWidth: 4 }],
    ["icon", { iconName: "foundation", cx: 100, cy: 100, size: 80, color: "#fff" }],
    ["badge", { cx: 100, cy: 100, text: "State", fill: "#111", textColor: "#fff" }],
    ["progress", { x: 20, y: 30, width: 200, height: 30, trackColor: "#111", fillColor: "#0ff" }],
  ] as const)("accepts the renderer %s shape", (shapeType, properties) => {
    expect(ShapeEventSchema.parse({
      id: `shape-${shapeType}`,
      type: "shape",
      shapeType,
      start: 0,
      end: 5,
      layer: 2,
      ...properties,
    })).toBeDefined();
  });

  it("validates paths and rejects unsupported event vocabulary", () => {
    expect(PathAnimationSchema.parse({
      points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      easing: "easeInOut",
    })).toBeDefined();
    expect(() => TimelineEventSchema.parse({
      id: "video", type: "video", start: 0, end: 5, layer: 0,
    })).toThrow();
  });

  it("accepts a complete VideoProject", () => {
    expect(VideoProjectSchema.parse({
      id: "project",
      name: "Direct timeline",
      width: 1920,
      height: 1080,
      duration: 5,
      events: [{
        id: "bg", type: "background", start: 0, end: 5, layer: 0,
        background: { kind: "solid", color: "#000" },
      }],
    }).name).toBe("Direct timeline");
  });
});
