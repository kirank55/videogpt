import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from "@/lib/renderer";
import type { VideoProject } from "@/lib/renderer";

/**
 * Returns a deterministic seed project used by stub API routes and in
 * tests / demo sections where a real LLM-generated brief is not available.
 *
 * Structure: background gradient → 2 accent circles → 1 dashed divider line →
 *            title text → subtitle text.
 *
 * All timing is derived from the `duration` parameter — nothing is hardcoded.
 */
export function createSeedProject(name: string, duration: number): VideoProject {
  const d = duration;

  // ── Timing helpers ───────────────────────────────────────────────────────
  const t = (fraction: number) => parseFloat((fraction * d).toFixed(3));

  return {
    id: `seed-${Date.now()}`,
    name,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    duration: d,
    events: [
      // ── Background gradient ─────────────────────────────────────────────
      {
        id: "bg",
        type: "background",
        start: 0,
        end: d,
        layer: 0,
        background: { kind: "gradient", from: "#0f172a", to: "#1e3a5f", angle: 145 },
      },

      // ── Accent circle — left ────────────────────────────────────────────
      {
        id: "accent-left",
        type: "shape",
        shapeType: "circle",
        start: 0,
        end: d,
        layer: 1,
        x: 200,
        y: 540,
        radius: 260,
        fill: "rgb(99 102 241 / 0.18)",
        opacity: { from: 0, to: 1, easing: "easeOut" },
        scale: { from: 0.6, to: 1, easing: "easeOut" },
      },

      // ── Accent circle — right ───────────────────────────────────────────
      {
        id: "accent-right",
        type: "shape",
        shapeType: "circle",
        start: t(0.04),
        end: d,
        layer: 1,
        x: 1720,
        y: 540,
        radius: 320,
        fill: "rgb(45 212 191 / 0.14)",
        opacity: { from: 0, to: 1, easing: "easeOut" },
        scale: { from: 0.6, to: 1, easing: "easeInOut" },
      },

      // ── Vertical divider line ───────────────────────────────────────────
      {
        id: "divider",
        type: "shape",
        shapeType: "line",
        start: t(0.08),
        end: d,
        layer: 2,
        x1: 960,
        y1: 200,
        x2: 960,
        y2: 880,
        stroke: "rgb(148 163 184 / 0.25)",
        lineWidth: 2,
        lineDash: [12, 8],
        opacity: { from: 0, to: 1, easing: "easeOut" },
      },

      // ── Title text ──────────────────────────────────────────────────────
      {
        id: "title",
        type: "text",
        start: t(0.02),
        end: d,
        layer: 3,
        text: name,
        x: 120,
        y: 400,
        maxWidth: 780,
        color: "#f8fafc",
        fontSize: 96,
        fontWeight: 700,
        lineHeight: 108,
        opacity: { from: 0, to: 1, easing: "easeOut" },
        translateY: { from: 48, to: 0, easing: "easeOut" },
      },

      // ── Subtitle text ───────────────────────────────────────────────────
      {
        id: "subtitle",
        type: "text",
        start: t(0.10),
        end: d,
        layer: 3,
        text: "Generated with VideoGPT",
        x: 120,
        y: 640,
        maxWidth: 720,
        color: "rgb(148 163 184 / 0.9)",
        fontSize: 48,
        fontWeight: 400,
        lineHeight: 64,
        opacity: { from: 0, to: 1, easing: "easeInOut" },
        translateY: { from: 32, to: 0, easing: "easeOut" },
      },
    ],
  };
}
