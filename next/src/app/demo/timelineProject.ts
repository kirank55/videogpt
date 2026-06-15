import type { VideoProject } from "@/lib/renderer";

/**
 * Timeline — Sequential Filmstrip
 * A playhead sweeps left→right across a center timeline, events pop above/below.
 * 15 seconds · 1920×1080
 */

const W = 1920;
const H = 1080;
const DUR = 15;

const TL_Y = H / 2;       // timeline center Y
const TL_X1 = 120;
const TL_X2 = W - 120;
const TL_W = TL_X2 - TL_X1;

// Event X positions along timeline (evenly spaced at logical beats)
const E1X = TL_X1 + TL_W * 0.12;  // Browser sends request
const E2X = TL_X1 + TL_W * 0.28;  // HTTP encodes
const E3X = TL_X1 + TL_W * 0.42;  // Network transmits
const E4X = TL_X1 + TL_W * 0.55;  // API receives
const E5X = TL_X1 + TL_W * 0.67;  // Logic processes
const E6X = TL_X1 + TL_W * 0.78;  // DB writes
const E7X = TL_X1 + TL_W * 0.91;  // Response returns

// Labels above/below alternating
const ABOVE_Y = TL_Y - 90;
const BELOW_Y = TL_Y + 68;
const TIME_Y  = TL_Y + 120;

// Playhead arrives at each event beat (animation seconds)
const T1 = 4.5;
const T2 = 5.5;
const T3 = 6.5;
const T4 = 7.8;
const T5 = 9.0;
const T6 = 10.0;
const T7 = 11.2;

const BLUE    = "rgb(96 165 250)";
const BLUE_G  = "rgb(96 165 250 / 0.7)";
const BLUE_D  = "rgb(96 165 250 / 0.3)";
const GREEN   = "rgb(52 211 153)";
const GREEN_G = "rgb(52 211 153 / 0.7)";
const AMBER   = "rgb(251 191 36)";
const AMBER_G = "rgb(251 191 36 / 0.5)";
const WHITE   = "#f1f5f9";
const MUTED   = "rgb(178 190 205 / 0.85)";

export const timelineProject: VideoProject = {
  id: "timeline-filmstrip-v1",
  name: "Timeline — Sequential Filmstrip",
  width: W,
  height: H,
  duration: DUR,
  events: [

    // Background
    {
      id: "bg",
      type: "background",
      start: 0, end: DUR, layer: 0,
      background: { kind: "gradient", from: "#020617", to: "#0c1428", angle: 170 },
    },

    // Ambient slow drift
    {
      id: "ambient",
      type: "particle",
      start: 0, end: DUR, layer: 1,
      count: 25, seed: 5,
      origin: { x: W / 2, y: H / 2 },
      spread: { x: W / 2, y: H / 3 },
      drift: { x: 4, y: 0 },
      particleRadius: { min: 1, max: 3 },
      color: BLUE_G,
      particleOpacity: { min: 0.08, max: 0.3 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── Title ──────────────────────────────────────────────────────────────
    {
      id: "title",
      type: "text",
      start: 0, end: 2.6, layer: 5,
      text: "Request Timeline",
      x: W / 2 - 360, y: 380, maxWidth: 760,
      fontSize: 88, fontWeight: 800, color: WHITE,
      shadow: { color: BLUE_G, blur: 50 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "subtitle",
      type: "text",
      start: 0.5, end: 2.6, layer: 5,
      text: "From click to response",
      x: W / 2 - 240, y: 500, maxWidth: 520,
      fontSize: 30, fontWeight: 400, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── TIMELINE SPINE ────────────────────────────────────────────────────
    {
      id: "tl-line",
      type: "shape", shapeType: "line",
      start: 2.6, end: 14.5, layer: 2,
      x1: TL_X1, y1: TL_Y, x2: TL_X2, y2: TL_Y,
      stroke: "rgb(148 163 184 / 0.25)", lineWidth: 2,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Timeline label left
    {
      id: "tl-start-label",
      type: "text",
      start: 2.8, end: 14.5, layer: 4,
      text: "0ms",
      x: TL_X1, y: TL_Y + 140, maxWidth: 80,
      fontSize: 18, fontWeight: 500, color: "rgb(148 163 184 / 0.6)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "tl-end-label",
      type: "text",
      start: 2.8, end: 14.5, layer: 4,
      text: "~200ms",
      x: TL_X2 - 80, y: TL_Y + 140, maxWidth: 100,
      fontSize: 18, fontWeight: 500, color: "rgb(148 163 184 / 0.6)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── PLAYHEAD — sweeps from left to right ─────────────────────────────
    {
      id: "playhead",
      type: "shape", shapeType: "line",
      start: 3.5, end: 12.5, layer: 5,
      x1: TL_X1, y1: TL_Y - 180,
      x2: TL_X1, y2: TL_Y + 180,
      stroke: AMBER, lineWidth: 3,
      shadow: { color: AMBER_G, blur: 20 },
      path: {
        points: [
          { x: TL_X1, y: TL_Y },
          { x: (TL_X1 + E4X) / 2, y: TL_Y },
          { x: TL_X2, y: TL_Y },
        ],
        easing: "linear",
      },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Playhead top triangle
    {
      id: "playhead-tip",
      type: "shape", shapeType: "triangle",
      start: 3.5, end: 12.5, layer: 5,
      x: TL_X1, y: TL_Y - 190, width: 18, height: 16,
      fill: AMBER,
      shadow: { color: AMBER_G, blur: 12 },
      path: {
        points: [
          { x: TL_X1, y: TL_Y },
          { x: (TL_X1 + E4X) / 2, y: TL_Y },
          { x: TL_X2, y: TL_Y },
        ],
        easing: "linear",
      },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── EVENT MARKERS + LABELS ────────────────────────────────────────────

    // Event 1: Browser sends
    {
      id: "e1-dot",
      type: "shape", shapeType: "circle",
      start: T1, end: 14.5, layer: 3,
      x: E1X, y: TL_Y, radius: 12,
      fill: BLUE,
      shadow: { color: BLUE_G, blur: 22 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0, to: 1, easing: "bounce" },
    },
    {
      id: "e1-stem",
      type: "shape", shapeType: "line",
      start: T1, end: 14.5, layer: 2,
      x1: E1X, y1: TL_Y - 12, x2: E1X, y2: ABOVE_Y + 22,
      stroke: BLUE_D, lineWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "e1-label",
      type: "text",
      start: T1, end: 14.5, layer: 4,
      text: "Browser",
      x: E1X - 50, y: ABOVE_Y - 28, maxWidth: 120,
      fontSize: 20, fontWeight: 700, color: BLUE,
      shadow: { color: BLUE_G, blur: 10 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: -8, to: 0, easing: "easeOut" },
    },
    {
      id: "e1-sub",
      type: "text",
      start: T1 + 0.2, end: 14.5, layer: 4,
      text: "sends request",
      x: E1X - 60, y: ABOVE_Y - 4, maxWidth: 140,
      fontSize: 16, fontWeight: 400, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "e1-time",
      type: "text",
      start: T1 + 0.2, end: 14.5, layer: 4,
      text: "0ms",
      x: E1X - 25, y: TIME_Y, maxWidth: 60,
      fontSize: 15, fontWeight: 500, color: AMBER,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Event 2: HTTP encodes
    {
      id: "e2-dot",
      type: "shape", shapeType: "circle",
      start: T2, end: 14.5, layer: 3,
      x: E2X, y: TL_Y, radius: 10,
      fill: BLUE_D,
      stroke: BLUE, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0, to: 1, easing: "bounce" },
    },
    {
      id: "e2-stem",
      type: "shape", shapeType: "line",
      start: T2, end: 14.5, layer: 2,
      x1: E2X, y1: TL_Y + 12, x2: E2X, y2: BELOW_Y - 20,
      stroke: BLUE_D, lineWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "e2-label",
      type: "text",
      start: T2, end: 14.5, layer: 4,
      text: "HTTP",
      x: E2X - 30, y: BELOW_Y, maxWidth: 100,
      fontSize: 20, fontWeight: 700, color: BLUE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 8, to: 0, easing: "easeOut" },
    },
    {
      id: "e2-sub",
      type: "text",
      start: T2 + 0.2, end: 14.5, layer: 4,
      text: "encodes",
      x: E2X - 34, y: BELOW_Y + 24, maxWidth: 100,
      fontSize: 16, fontWeight: 400, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Event 3: Network transmits
    {
      id: "e3-dot",
      type: "shape", shapeType: "circle",
      start: T3, end: 14.5, layer: 3,
      x: E3X, y: TL_Y, radius: 10,
      fill: BLUE_D,
      stroke: BLUE, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0, to: 1, easing: "bounce" },
    },
    {
      id: "e3-stem",
      type: "shape", shapeType: "line",
      start: T3, end: 14.5, layer: 2,
      x1: E3X, y1: TL_Y - 12, x2: E3X, y2: ABOVE_Y + 22,
      stroke: BLUE_D, lineWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "e3-label",
      type: "text",
      start: T3, end: 14.5, layer: 4,
      text: "Network",
      x: E3X - 48, y: ABOVE_Y - 28, maxWidth: 120,
      fontSize: 20, fontWeight: 700, color: BLUE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: -8, to: 0, easing: "easeOut" },
    },
    {
      id: "e3-sub",
      type: "text",
      start: T3 + 0.2, end: 14.5, layer: 4,
      text: "transmits",
      x: E3X - 44, y: ABOVE_Y - 4, maxWidth: 110,
      fontSize: 16, fontWeight: 400, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Event 4: API receives (midpoint — biggest dot)
    {
      id: "e4-dot",
      type: "shape", shapeType: "circle",
      start: T4, end: 14.5, layer: 3,
      x: E4X, y: TL_Y, radius: 16,
      fill: GREEN,
      shadow: { color: GREEN_G, blur: 28 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0, to: 1, easing: "bounce" },
    },
    {
      id: "e4-stem",
      type: "shape", shapeType: "line",
      start: T4, end: 14.5, layer: 2,
      x1: E4X, y1: TL_Y + 16, x2: E4X, y2: BELOW_Y - 20,
      stroke: GREEN_G, lineWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "e4-label",
      type: "text",
      start: T4, end: 14.5, layer: 4,
      text: "REST API",
      x: E4X - 55, y: BELOW_Y, maxWidth: 130,
      fontSize: 20, fontWeight: 700, color: GREEN,
      shadow: { color: GREEN_G, blur: 10 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 8, to: 0, easing: "easeOut" },
    },
    {
      id: "e4-sub",
      type: "text",
      start: T4 + 0.2, end: 14.5, layer: 4,
      text: "receives",
      x: E4X - 42, y: BELOW_Y + 24, maxWidth: 110,
      fontSize: 16, fontWeight: 400, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "e4-time",
      type: "text",
      start: T4 + 0.2, end: 14.5, layer: 4,
      text: "~80ms",
      x: E4X - 30, y: TIME_Y, maxWidth: 80,
      fontSize: 15, fontWeight: 500, color: AMBER,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Event 5: Logic processes
    {
      id: "e5-dot",
      type: "shape", shapeType: "circle",
      start: T5, end: 14.5, layer: 3,
      x: E5X, y: TL_Y, radius: 10,
      fill: "rgb(52 211 153 / 0.3)",
      stroke: GREEN, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0, to: 1, easing: "bounce" },
    },
    {
      id: "e5-stem",
      type: "shape", shapeType: "line",
      start: T5, end: 14.5, layer: 2,
      x1: E5X, y1: TL_Y - 12, x2: E5X, y2: ABOVE_Y + 22,
      stroke: GREEN_G, lineWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "e5-label",
      type: "text",
      start: T5, end: 14.5, layer: 4,
      text: "Logic",
      x: E5X - 30, y: ABOVE_Y - 28, maxWidth: 100,
      fontSize: 20, fontWeight: 700, color: GREEN,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: -8, to: 0, easing: "easeOut" },
    },
    {
      id: "e5-sub",
      type: "text",
      start: T5 + 0.2, end: 14.5, layer: 4,
      text: "processes",
      x: E5X - 43, y: ABOVE_Y - 4, maxWidth: 110,
      fontSize: 16, fontWeight: 400, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Event 6: DB writes
    {
      id: "e6-dot",
      type: "shape", shapeType: "circle",
      start: T6, end: 14.5, layer: 3,
      x: E6X, y: TL_Y, radius: 10,
      fill: "rgb(251 191 36 / 0.3)",
      stroke: AMBER, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0, to: 1, easing: "bounce" },
    },
    {
      id: "e6-stem",
      type: "shape", shapeType: "line",
      start: T6, end: 14.5, layer: 2,
      x1: E6X, y1: TL_Y + 12, x2: E6X, y2: BELOW_Y - 20,
      stroke: AMBER_G, lineWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "e6-label",
      type: "text",
      start: T6, end: 14.5, layer: 4,
      text: "PostgreSQL",
      x: E6X - 65, y: BELOW_Y, maxWidth: 150,
      fontSize: 20, fontWeight: 700, color: AMBER,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 8, to: 0, easing: "easeOut" },
    },
    {
      id: "e6-sub",
      type: "text",
      start: T6 + 0.2, end: 14.5, layer: 4,
      text: "writes row",
      x: E6X - 50, y: BELOW_Y + 24, maxWidth: 120,
      fontSize: 16, fontWeight: 400, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Event 7: Response returns (final big green dot)
    {
      id: "e7-dot",
      type: "shape", shapeType: "circle",
      start: T7, end: 14.5, layer: 3,
      x: E7X, y: TL_Y, radius: 16,
      fill: GREEN,
      shadow: { color: GREEN_G, blur: 32 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0, to: 1.2, easing: "bounce" },
    },
    {
      id: "e7-stem",
      type: "shape", shapeType: "line",
      start: T7, end: 14.5, layer: 2,
      x1: E7X, y1: TL_Y - 16, x2: E7X, y2: ABOVE_Y + 22,
      stroke: GREEN_G, lineWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "e7-label",
      type: "text",
      start: T7, end: 14.5, layer: 4,
      text: "201 Created",
      x: E7X - 72, y: ABOVE_Y - 28, maxWidth: 180,
      fontSize: 22, fontWeight: 800, color: GREEN,
      shadow: { color: GREEN_G, blur: 14 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: -8, to: 0, easing: "easeOut" },
    },
    {
      id: "e7-sub",
      type: "text",
      start: T7 + 0.2, end: 14.5, layer: 4,
      text: "response to browser",
      x: E7X - 90, y: ABOVE_Y - 4, maxWidth: 200,
      fontSize: 16, fontWeight: 400, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "e7-time",
      type: "text",
      start: T7 + 0.2, end: 14.5, layer: 4,
      text: "~200ms",
      x: E7X - 38, y: TIME_Y, maxWidth: 100,
      fontSize: 15, fontWeight: 500, color: AMBER,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Celebration burst at final event
    {
      id: "e7-burst",
      type: "particle",
      start: T7, end: T7 + 1.5, layer: 3,
      count: 30, seed: 88,
      origin: { x: E7X, y: TL_Y },
      spread: { x: 60, y: 60 },
      drift: { x: 3, y: -20 },
      particleRadius: { min: 2, max: 5 },
      color: GREEN_G,
      particleOpacity: { min: 0.4, max: 0.9 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── OUTRO ─────────────────────────────────────────────────────────────
    {
      id: "closing",
      type: "text",
      start: 12.5, end: DUR, layer: 5,
      text: "Every click. Every scroll. Every tap.",
      x: W / 2 - 450, y: 850, maxWidth: 940,
      fontSize: 48, fontWeight: 700, color: WHITE,
      shadow: { color: BLUE_G, blur: 40 },
      opacity: {
        keyframes: [
          { time: 12.5, value: 0, easing: "easeOut" },
          { time: 13.2, value: 1, easing: "easeOut" },
          { time: 14.3, value: 1, easing: "easeInOut" },
          { time: DUR, value: 0, easing: "easeIn" },
        ],
      },
      translateY: { from: 16, to: 0, easing: "easeOut" },
    },
  ],
};
