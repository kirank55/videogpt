import { describe, it, expect } from "vitest";
import {
  isKeyframed,
  resolveAnimatedBounds,
  isLowOpacityFill,
  getShapeCenter,
  getEventCenter,
  getStaticEventBounds,
  getEventBounds,
  boundsOverlap,
  timeOverlap,
} from "@/lib/ui/renderer/geometry";
import type { TimelineEvent, ShapeEvent, TextEvent, AnimatedValue } from "@/lib/ui/renderer/types";

// ── Event builders ────────────────────────────────────────────────────────────

function rectEvent(overrides: Partial<ShapeEvent & { shapeType: "rect" }> = {}): ShapeEvent & { shapeType: "rect" } {
  return {
    type: "shape",
    shapeType: "rect",
    id: "r1",
    start: 0,
    end: 5,
    layer: 1,
    x: 100,
    y: 100,
    width: 200,
    height: 50,
    fill: "#1e293b",
    ...overrides,
  };
}

function textEvent(overrides: Partial<TextEvent> = {}): TextEvent {
  return {
    type: "text",
    id: "t1",
    start: 0,
    end: 5,
    layer: 2,
    text: "Hello",
    x: 50,
    y: 60,
    maxWidth: 300,
    color: "#fff",
    fontSize: 24,
    ...overrides,
  };
}

const base = { id: "e", start: 0, end: 5, layer: 1 };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("geometry seam", () => {
  // ── isKeyframed ──────────────────────────────────────────────────────────

  it("isKeyframed distinguishes the keyframe variant", () => {
    const classic: AnimatedValue = { from: 0, to: 10, easing: "linear" };
    const keyed: AnimatedValue = { keyframes: [{ time: 0, value: 0, easing: "linear" }] };
    expect(isKeyframed(classic)).toBe(false);
    expect(isKeyframed(keyed)).toBe(true);
  });

  // ── resolveAnimatedBounds ────────────────────────────────────────────────

  it("resolveAnimatedBounds returns the fallback for undefined", () => {
    expect(resolveAnimatedBounds(undefined, 7)).toEqual({ min: 7, max: 7 });
  });

  it("resolveAnimatedBounds spans from/to for the classic variant", () => {
    const av: AnimatedValue = { from: 10, to: -5, easing: "linear" };
    expect(resolveAnimatedBounds(av, 0)).toEqual({ min: -5, max: 10 });
  });

  it("resolveAnimatedBounds spans keyframe extremes", () => {
    const av: AnimatedValue = {
      keyframes: [
        { time: 0, value: 3, easing: "linear" },
        { time: 1, value: -2, easing: "linear" },
        { time: 2, value: 8, easing: "linear" },
      ],
    };
    expect(resolveAnimatedBounds(av, 0)).toEqual({ min: -2, max: 8 });
  });

  // ── isLowOpacityFill ─────────────────────────────────────────────────────

  it("isLowOpacityFill treats transparent and very-low-alpha as low", () => {
    expect(isLowOpacityFill("transparent")).toBe(true);
    expect(isLowOpacityFill("rgb(0 0 0 / 0.1)")).toBe(true);
    expect(isLowOpacityFill("rgb(0 0 0 / 0.15)")).toBe(true);
    expect(isLowOpacityFill("rgb(0 0 0 / 0.5)")).toBe(false);
    expect(isLowOpacityFill("#1e293b")).toBe(false);
  });

  // ── getShapeCenter / getEventCenter ──────────────────────────────────────

  it("getShapeCenter returns the rect centre", () => {
    expect(getShapeCenter(rectEvent())).toEqual({ x: 200, y: 125 });
  });

  it("getEventCenter dispatches text vs shape", () => {
    expect(getEventCenter(textEvent())).toEqual({ x: 50, y: 60 });
    expect(getEventCenter(rectEvent())).toEqual({ x: 200, y: 125 });
  });

  // ── getStaticEventBounds ─────────────────────────────────────────────────

  it("getStaticEventBounds returns null for background/particle", () => {
    const bg = { ...base, type: "background", background: { kind: "solid", color: "#000" } } as TimelineEvent;
    const pt = {
      ...base,
      type: "particle",
      count: 5, seed: 1,
      origin: { x: 0, y: 0 }, spread: { x: 1, y: 1 }, drift: { x: 0, y: 0 },
      particleRadius: { min: 1, max: 2 }, color: "#fff",
    } as TimelineEvent;
    expect(getStaticEventBounds(bg)).toBeNull();
    expect(getStaticEventBounds(pt)).toBeNull();
  });

  it("getStaticEventBounds honours text align", () => {
    const left = getStaticEventBounds(textEvent({ align: "left" }))!;
    expect(left.left).toBe(50);
    expect(left.top).toBe(60);
    expect(left.right).toBe(350);
    expect(left.bottom).toBeCloseTo(87.6);
    const centered = getStaticEventBounds(textEvent({ align: "center" }))!;
    expect(centered.left).toBe(50 - 150);
    expect(centered.right).toBe(50 + 150);
  });

  // ── getEventBounds (animated extremes) ───────────────────────────────────

  it("getEventBounds expands a rect by its translate range", () => {
    const e = rectEvent({
      translateX: { from: 0, to: 100, easing: "linear" },
    });
    const b = getEventBounds(e)!;
    expect(b.left).toBe(100);   // x + txMin(0)
    expect(b.right).toBe(400);  // x(100) + width(200) + txMax(100)
  });

  // ── overlap tests ────────────────────────────────────────────────────────

  it("boundsOverlap detects intersecting and disjoint boxes", () => {
    const a = { left: 0, top: 0, right: 10, bottom: 10 };
    expect(boundsOverlap(a, { left: 5, top: 5, right: 15, bottom: 15 })).toBe(true);
    expect(boundsOverlap(a, { left: 20, top: 20, right: 30, bottom: 30 })).toBe(false);
  });

  it("timeOverlap detects overlapping and disjoint intervals", () => {
    const a = { ...base, type: "text", text: "a", x: 0, y: 0, maxWidth: 1, color: "#fff", fontSize: 1 } as TimelineEvent;
    const b = { ...base, type: "text", text: "b", x: 0, y: 0, maxWidth: 1, color: "#fff", fontSize: 1, start: 3, end: 7 } as TimelineEvent;
    expect(timeOverlap(a, b)).toBe(true);
    const c = { ...b, start: 6, end: 9 } as TimelineEvent;
    expect(timeOverlap(a, c)).toBe(false);
  });
});
