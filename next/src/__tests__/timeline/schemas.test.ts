import { describe, it, expect } from "vitest";
import {
  VideoProjectSchema,
  TimelineEventSchema,
  BackgroundEventSchema,
  TextEventSchema,
  ShapeEventSchema,
  ParticleEventSchema,
  AnimatedValueSchema,
  ShadowSchema,
  PathAnimationSchema,
  GradientFillSchema,
} from "@/lib/schemas/timeline";
import {
  SupportedDurationSchema,
  StylePresetSchema,
  TransitionPresetSchema,
} from "@/lib/schemas/brief";

// ── Helper ────────────────────────────────────────────────────────────────────

function valid<T>(schema: { parse: (x: unknown) => T }, input: unknown): T {
  return schema.parse(input);
}

function invalid(schema: { safeParse: (x: unknown) => { success: boolean } }, input: unknown) {
  const result = schema.safeParse(input);
  expect(result.success).toBe(false);
  return result;
}

// ── SupportedDurationSchema ───────────────────────────────────────────────────

describe("SupportedDurationSchema", () => {
  it.each([5, 10, 15, 20, 30])("accepts %d", (n) => {
    expect(SupportedDurationSchema.parse(n)).toBe(n);
  });

  it.each([0, 7, 11, 100, "5", null])("rejects %s", (v) => {
    invalid(SupportedDurationSchema, v);
  });
});

// ── StylePresetSchema ─────────────────────────────────────────────────────────

describe("StylePresetSchema", () => {
  it.each(["modern", "brutalist", "sketch", "neon-glow", "minimal"])(
    "accepts '%s'",
    (v) => expect(StylePresetSchema.parse(v)).toBe(v),
  );

  it.each(["fantasy", "", null, 42])("rejects %s", (v) => {
    invalid(StylePresetSchema, v);
  });
});

// ── TransitionPresetSchema ────────────────────────────────────────────────────

describe("TransitionPresetSchema", () => {
  it.each(["none", "fade", "slide-left", "slide-right", "zoom-in", "zoom-out"])(
    "accepts '%s'",
    (v) => expect(TransitionPresetSchema.parse(v)).toBe(v),
  );

  it.each(["dissolve", "", null])("rejects %s", (v) => {
    invalid(TransitionPresetSchema, v);
  });
});

// ── AnimatedValueSchema ───────────────────────────────────────────────────────

describe("AnimatedValueSchema", () => {
  it("accepts from/to/easing form", () => {
    const result = valid(AnimatedValueSchema, { from: 0, to: 1, easing: "easeOut" });
    expect(result).toEqual({ from: 0, to: 1, easing: "easeOut" });
  });

  it("accepts keyframes form", () => {
    const result = valid(AnimatedValueSchema, {
      keyframes: [
        { time: 0, value: 0, easing: "linear" },
        { time: 1, value: 1, easing: "easeOut" },
      ],
    });
    expect("keyframes" in result).toBe(true);
  });

  it("rejects invalid easing name in from/to form", () => {
    invalid(AnimatedValueSchema, { from: 0, to: 1, easing: "magic" });
  });

  it("rejects empty keyframes array", () => {
    invalid(AnimatedValueSchema, { keyframes: [] });
  });
});

// ── ShadowSchema ──────────────────────────────────────────────────────────────

describe("ShadowSchema", () => {
  it("accepts minimal shadow", () => {
    expect(ShadowSchema.parse({ color: "#fff", blur: 10 })).toEqual({
      color: "#fff",
      blur: 10,
    });
  });

  it("accepts shadow with offsets", () => {
    expect(
      ShadowSchema.parse({ color: "red", blur: 5, offsetX: 2, offsetY: -2 }),
    ).toEqual({ color: "red", blur: 5, offsetX: 2, offsetY: -2 });
  });

  it("rejects negative blur", () => {
    invalid(ShadowSchema, { color: "#fff", blur: -1 });
  });

  it("rejects missing required fields", () => {
    invalid(ShadowSchema, { blur: 10 });
  });
});

// ── GradientFillSchema ────────────────────────────────────────────────────────

describe("GradientFillSchema", () => {
  it("accepts a valid gradient fill", () => {
    const g = valid(GradientFillSchema, { kind: "gradient", from: "#000", to: "#fff", angle: 90 });
    expect(g.kind).toBe("gradient");
  });

  it("rejects missing 'kind'", () => {
    invalid(GradientFillSchema, { from: "#000", to: "#fff", angle: 90 });
  });
});

// ── PathAnimationSchema ───────────────────────────────────────────────────────

describe("PathAnimationSchema", () => {
  it("accepts a valid path animation", () => {
    valid(PathAnimationSchema, {
      points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      easing: "easeInOut",
    });
  });

  it("rejects path with fewer than 2 points", () => {
    invalid(PathAnimationSchema, {
      points: [{ x: 0, y: 0 }],
      easing: "linear",
    });
  });
});

// ── BackgroundEventSchema ─────────────────────────────────────────────────────

describe("BackgroundEventSchema", () => {
  const solidBg = {
    id: "bg", type: "background", start: 0, end: 10, layer: 0,
    background: { kind: "solid", color: "#000" },
  };

  const gradientBg = {
    id: "bg", type: "background", start: 0, end: 10, layer: 0,
    background: { kind: "gradient", from: "#000", to: "#fff", angle: 45 },
  };

  it("accepts a solid background event", () => {
    const result = valid(BackgroundEventSchema, solidBg);
    expect(result.type).toBe("background");
    if (result.background.kind === "solid") {
      expect(result.background.color).toBe("#000");
    }
  });

  it("accepts a gradient background event", () => {
    const result = valid(BackgroundEventSchema, gradientBg);
    expect(result.background.kind).toBe("gradient");
  });

  it("rejects unknown background kind", () => {
    invalid(BackgroundEventSchema, {
      ...solidBg,
      background: { kind: "image", url: "http://x.com" },
    });
  });

  it("rejects negative start", () => {
    invalid(BackgroundEventSchema, { ...solidBg, start: -1 });
  });
});

// ── TextEventSchema ───────────────────────────────────────────────────────────

describe("TextEventSchema", () => {
  const baseText = {
    id: "title", type: "text", start: 0, end: 5, layer: 1,
    text: "Hello", x: 100, y: 200, maxWidth: 800, color: "#fff", fontSize: 48,
  };

  it("accepts a valid text event", () => {
    const result = valid(TextEventSchema, baseText);
    expect(result.text).toBe("Hello");
    expect(result.type).toBe("text");
  });

  it("accepts optional fontWeight, fontFamily, lineHeight, align", () => {
    const result = valid(TextEventSchema, {
      ...baseText,
      fontWeight: 700,
      fontFamily: "Inter",
      lineHeight: 1.5,
      align: "center",
    });
    expect(result.fontWeight).toBe(700);
    expect(result.align).toBe("center");
  });

  it("rejects zero or negative fontSize", () => {
    invalid(TextEventSchema, { ...baseText, fontSize: 0 });
    invalid(TextEventSchema, { ...baseText, fontSize: -8 });
  });

  it("rejects invalid align value", () => {
    invalid(TextEventSchema, { ...baseText, align: "justify" });
  });

  it("rejects missing required text field", () => {
    const { text: _rm, ...rest } = baseText;
    invalid(TextEventSchema, rest);
  });
});

// ── ShapeEventSchema ──────────────────────────────────────────────────────────

describe("ShapeEventSchema", () => {
  const base = { start: 0, end: 5, layer: 1, type: "shape" };

  it("accepts a rect shape", () => {
    const result = valid(ShapeEventSchema, {
      ...base, id: "r1", shapeType: "rect", x: 0, y: 0, width: 100, height: 50, fill: "#f00",
    });
    expect(result.shapeType).toBe("rect");
  });

  it("accepts a circle shape", () => {
    const result = valid(ShapeEventSchema, {
      ...base, id: "c1", shapeType: "circle", x: 500, y: 300, radius: 80, fill: "#00f",
    });
    expect(result.shapeType).toBe("circle");
  });

  it("accepts a triangle shape", () => {
    valid(ShapeEventSchema, {
      ...base, id: "t1", shapeType: "triangle", x: 0, y: 0, width: 100, height: 80, fill: "#0f0",
    });
  });

  it("accepts a line shape", () => {
    valid(ShapeEventSchema, {
      ...base, id: "l1", shapeType: "line", x1: 0, y1: 0, x2: 100, y2: 100, stroke: "#fff", lineWidth: 2,
    });
  });

  it("rejects unknown shapeType", () => {
    invalid(ShapeEventSchema, { ...base, id: "x1", shapeType: "hexagon", x: 0, y: 0, fill: "#fff" });
  });

  it("rejects rect with non-positive width", () => {
    invalid(ShapeEventSchema, {
      ...base, id: "r2", shapeType: "rect", x: 0, y: 0, width: 0, height: 100, fill: "#f00",
    });
  });
});

// ── ParticleEventSchema ───────────────────────────────────────────────────────

describe("ParticleEventSchema", () => {
  const baseParticle = {
    id: "particles", type: "particle", start: 0, end: 5, layer: 2,
    count: 40, seed: 42,
    origin: { x: 960, y: 540 },
    spread: { x: 200, y: 200 },
    drift: { x: 5, y: -3 },
    particleRadius: { min: 2, max: 6 },
    color: "rgba(255,255,255,0.5)",
  };

  it("accepts a valid particle event", () => {
    const result = valid(ParticleEventSchema, baseParticle);
    expect(result.type).toBe("particle");
    expect(result.count).toBe(40);
  });

  it("rejects zero count", () => {
    invalid(ParticleEventSchema, { ...baseParticle, count: 0 });
  });

  it("accepts optional particleOpacity", () => {
    valid(ParticleEventSchema, {
      ...baseParticle,
      particleOpacity: { min: 0.2, max: 0.8 },
    });
  });
});

// ── TimelineEventSchema ───────────────────────────────────────────────────────

describe("TimelineEventSchema", () => {
  it("accepts each valid event type", () => {
    const events = [
      { id: "bg", type: "background", start: 0, end: 5, layer: 0, background: { kind: "solid", color: "#000" } },
      { id: "txt", type: "text", start: 0, end: 5, layer: 1, text: "Hi", x: 100, y: 100, maxWidth: 400, color: "#fff", fontSize: 32 },
      { id: "sh", type: "shape", shapeType: "rect", start: 0, end: 5, layer: 2, x: 0, y: 0, width: 100, height: 50, fill: "#f00" },
      { id: "pt", type: "particle", start: 0, end: 5, layer: 3, count: 10, seed: 1, origin: { x: 0, y: 0 }, spread: { x: 10, y: 10 }, drift: { x: 1, y: 1 }, particleRadius: { min: 1, max: 3 }, color: "#fff" },
    ];
    for (const ev of events) {
      expect(() => TimelineEventSchema.parse(ev)).not.toThrow();
    }
  });

  it("rejects an unknown event type", () => {
    invalid(TimelineEventSchema, { id: "x", type: "video", start: 0, end: 5, layer: 0 });
  });
});

// ── VideoProjectSchema ────────────────────────────────────────────────────────

describe("VideoProjectSchema", () => {
  const validProject = {
    id: "proj1",
    name: "My Video",
    width: 1920,
    height: 1080,
    duration: 10,
    events: [
      { id: "bg", type: "background", start: 0, end: 10, layer: 0, background: { kind: "solid", color: "#000" } },
    ],
  };

  it("accepts a valid project", () => {
    const result = valid(VideoProjectSchema, validProject);
    expect(result.name).toBe("My Video");
    expect(result.events).toHaveLength(1);
  });

  it("rejects project with no id", () => {
    const { id: _rm, ...rest } = validProject;
    invalid(VideoProjectSchema, rest);
  });

  it("rejects project with non-positive width", () => {
    invalid(VideoProjectSchema, { ...validProject, width: 0 });
  });

  it("rejects project with non-positive duration", () => {
    invalid(VideoProjectSchema, { ...validProject, duration: 0 });
  });

  it("accepts an empty events array", () => {
    const result = valid(VideoProjectSchema, { ...validProject, events: [] });
    expect(result.events).toHaveLength(0);
  });

  it("rejects project with an invalid event inside events array", () => {
    invalid(VideoProjectSchema, {
      ...validProject,
      events: [{ type: "unknown", id: "x", start: 0, end: 5, layer: 0 }],
    });
  });
});
