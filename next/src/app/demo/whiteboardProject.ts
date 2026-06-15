import type { VideoProject } from "@/lib/renderer";

/**
 * Whiteboard — Minimal Sketch
 * Warm off-white bg, dark charcoal strokes, handwritten feel, slow deliberate pacing.
 * 15 seconds · 1920×1080
 */

const W = 1920;
const H = 1080;
const DUR = 15;

const CL = 130;
const SW = 470;
const SL = W - CL - SW;
const GAP_L = CL + SW;
const GAP_R = SL;
const GAP_CX = (GAP_L + GAP_R) / 2;
const PAD = 36;

const R1Y = 260;
const R1H = 140;
const RG = 28;
const R2Y = R1Y + R1H + RG;
const R2H = 120;
const R3Y = R2Y + R2H + RG;
const R3H = 120;

const L1_FS = 30;
const L2_FS = 24;
const L1Y = R1Y + (R1H - L1_FS) / 2 + 4;
const L2Y = R2Y + (R2H - L2_FS) / 2 + 4;
const L3Y = R3Y + (R3H - L2_FS) / 2 + 4;

const CHARCOAL  = "#2c2c2c";
const DARK      = "#1a1a1a";
const SLATE     = "#5a6072";
const WARM_MUTED = "#8a8a96";
const ORANGE    = "rgb(210 100 40)";
const ORANGE_D  = "rgb(210 100 40 / 0.5)";
const FOREST    = "rgb(55 120 70)";
const FOREST_D  = "rgb(55 120 70 / 0.5)";
const NAVY      = "rgb(40 60 120)";

export const whiteboardProject: VideoProject = {
  id: "whiteboard-minimal-v1",
  name: "Whiteboard — Minimal Sketch",
  width: W,
  height: H,
  duration: DUR,
  events: [

    // Warm off-white background
    {
      id: "bg",
      type: "background",
      start: 0, end: DUR, layer: 0,
      background: { kind: "gradient", from: "#faf9f6", to: "#f4f2ee", angle: 160 },
    },

    // Faint ruled lines — like notebook paper
    ...Array.from({ length: 7 }, (_, i) => ({
      id: `rule-${i}`,
      type: "shape" as const, shapeType: "line" as const,
      start: 0, end: DUR, layer: 0,
      x1: 60, y1: 150 + i * 120, x2: W - 60, y2: 150 + i * 120,
      stroke: "rgb(180 175 165 / 0.3)", lineWidth: 1,
    })),

    // ── Title — charcoal, center ───────────────────────────────────────────
    {
      id: "title",
      type: "text",
      start: 0, end: 2.6, layer: 5,
      text: "How the Web Works",
      x: W / 2 - 420, y: 380, maxWidth: 860,
      fontSize: 80, fontWeight: 800, color: DARK,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 16, to: 0, easing: "easeOut" },
    },
    {
      id: "subtitle",
      type: "text",
      start: 0.5, end: 2.6, layer: 5,
      text: "Client  →  Server  →  Response",
      x: W / 2 - 330, y: 490, maxWidth: 700,
      fontSize: 32, fontWeight: 400, color: SLATE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── CLIENT STACK — orange accents ──────────────────────────────────────
    {
      id: "client-header",
      type: "text",
      start: 2.6, end: 14.5, layer: 5,
      text: "Client",
      x: CL, y: 215, maxWidth: 180,
      fontSize: 20, fontWeight: 700, color: ORANGE,
      opacity: { from: 0, to: 1, easing: "linear" },
    },
    // Divider under header
    {
      id: "client-header-line",
      type: "shape", shapeType: "line",
      start: 2.7, end: 14.5, layer: 1,
      x1: CL, y1: 242, x2: CL + SW, y2: 242,
      stroke: ORANGE_D, lineWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "linear" },
    },

    // Browser — thick dark border, light fill
    {
      id: "browser-rect",
      type: "shape", shapeType: "rect",
      start: 2.8, end: 14.5, layer: 2,
      x: CL, y: R1Y, width: SW, height: R1H, radius: 6,
      fill: "rgb(210 100 40 / 0.06)",
      stroke: ORANGE, strokeWidth: 3,
      opacity: { from: 0, to: 1, easing: "linear" },
      translateY: { from: 20, to: 0, easing: "easeOut" },
    },
    {
      id: "browser-label",
      type: "text",
      start: 3.0, end: 14.5, layer: 4,
      text: "Browser",
      x: CL + PAD, y: L1Y, maxWidth: SW - PAD * 2,
      fontSize: L1_FS, fontWeight: 700, color: CHARCOAL,
      opacity: { from: 0, to: 1, easing: "linear" },
    },

    {
      id: "http-rect",
      type: "shape", shapeType: "rect",
      start: 3.1, end: 14.5, layer: 2,
      x: CL, y: R2Y, width: SW, height: R2H, radius: 4,
      fill: "rgb(210 100 40 / 0.03)",
      stroke: ORANGE_D, strokeWidth: 2,
      opacity: { from: 0, to: 1, easing: "linear" },
      translateY: { from: 20, to: 0, easing: "easeOut" },
    },
    {
      id: "http-label",
      type: "text",
      start: 3.3, end: 14.5, layer: 4,
      text: "HTTP Layer",
      x: CL + PAD, y: L2Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 600, color: SLATE,
      opacity: { from: 0, to: 1, easing: "linear" },
    },

    {
      id: "network-rect",
      type: "shape", shapeType: "rect",
      start: 3.3, end: 14.5, layer: 2,
      x: CL, y: R3Y, width: SW, height: R3H, radius: 4,
      fill: "rgb(210 100 40 / 0.02)",
      stroke: "rgb(210 100 40 / 0.3)", strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "linear" },
      translateY: { from: 20, to: 0, easing: "easeOut" },
    },
    {
      id: "network-label",
      type: "text",
      start: 3.5, end: 14.5, layer: 4,
      text: "Network",
      x: CL + PAD, y: L3Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 600, color: WARM_MUTED,
      opacity: { from: 0, to: 1, easing: "linear" },
    },

    // Connector arrows — hand-drawn style (thicker, no dash)
    {
      id: "client-conn-1",
      type: "shape", shapeType: "line",
      start: 3.7, end: 14.5, layer: 1,
      x1: CL + SW / 2, y1: R1Y + R1H,
      x2: CL + SW / 2, y2: R2Y,
      stroke: ORANGE_D, lineWidth: 2,
      arrowEnd: true, arrowSize: 9,
      opacity: { from: 0, to: 1, easing: "linear" },
    },
    {
      id: "client-conn-2",
      type: "shape", shapeType: "line",
      start: 3.8, end: 14.5, layer: 1,
      x1: CL + SW / 2, y1: R2Y + R2H,
      x2: CL + SW / 2, y2: R3Y,
      stroke: ORANGE_D, lineWidth: 2,
      arrowEnd: true, arrowSize: 9,
      opacity: { from: 0, to: 1, easing: "linear" },
    },

    // ── SERVER STACK — forest green accents ───────────────────────────────
    {
      id: "server-header",
      type: "text",
      start: 3.0, end: 14.5, layer: 5,
      text: "Server",
      x: SL, y: 215, maxWidth: 180,
      fontSize: 20, fontWeight: 700, color: FOREST,
      opacity: { from: 0, to: 1, easing: "linear" },
    },
    {
      id: "server-header-line",
      type: "shape", shapeType: "line",
      start: 3.1, end: 14.5, layer: 1,
      x1: SL, y1: 242, x2: SL + SW, y2: 242,
      stroke: FOREST_D, lineWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "linear" },
    },

    {
      id: "api-rect",
      type: "shape", shapeType: "rect",
      start: 3.1, end: 14.5, layer: 2,
      x: SL, y: R1Y, width: SW, height: R1H, radius: 6,
      fill: "rgb(55 120 70 / 0.07)",
      stroke: FOREST, strokeWidth: 3,
      opacity: { from: 0, to: 1, easing: "linear" },
      translateY: { from: 20, to: 0, easing: "easeOut" },
    },
    {
      id: "api-label",
      type: "text",
      start: 3.3, end: 14.5, layer: 4,
      text: "REST API",
      x: SL + PAD, y: L1Y, maxWidth: SW - PAD * 2,
      fontSize: L1_FS, fontWeight: 700, color: CHARCOAL,
      opacity: { from: 0, to: 1, easing: "linear" },
    },

    {
      id: "logic-rect",
      type: "shape", shapeType: "rect",
      start: 3.3, end: 14.5, layer: 2,
      x: SL, y: R2Y, width: SW, height: R2H, radius: 4,
      fill: "rgb(55 120 70 / 0.04)",
      stroke: FOREST_D, strokeWidth: 2,
      opacity: { from: 0, to: 1, easing: "linear" },
      translateY: { from: 20, to: 0, easing: "easeOut" },
    },
    {
      id: "logic-label",
      type: "text",
      start: 3.5, end: 14.5, layer: 4,
      text: "Business Logic",
      x: SL + PAD, y: L2Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 600, color: SLATE,
      opacity: { from: 0, to: 1, easing: "linear" },
    },

    {
      id: "db-rect",
      type: "shape", shapeType: "rect",
      start: 3.5, end: 14.5, layer: 2,
      x: SL, y: R3Y, width: SW, height: R3H, radius: 4,
      fill: "rgb(55 120 70 / 0.02)",
      stroke: "rgb(55 120 70 / 0.3)", strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "linear" },
      translateY: { from: 20, to: 0, easing: "easeOut" },
    },
    {
      id: "db-label",
      type: "text",
      start: 3.7, end: 14.5, layer: 4,
      text: "PostgreSQL",
      x: SL + PAD, y: L3Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 600, color: WARM_MUTED,
      opacity: { from: 0, to: 1, easing: "linear" },
    },

    {
      id: "server-conn-1",
      type: "shape", shapeType: "line",
      start: 3.9, end: 14.5, layer: 1,
      x1: SL + SW / 2, y1: R1Y + R1H,
      x2: SL + SW / 2, y2: R2Y,
      stroke: FOREST_D, lineWidth: 2,
      arrowEnd: true, arrowSize: 9,
      opacity: { from: 0, to: 1, easing: "linear" },
    },
    {
      id: "server-conn-2",
      type: "shape", shapeType: "line",
      start: 4.0, end: 14.5, layer: 1,
      x1: SL + SW / 2, y1: R2Y + R2H,
      x2: SL + SW / 2, y2: R3Y,
      stroke: FOREST_D, lineWidth: 2,
      arrowEnd: true, arrowSize: 9,
      opacity: { from: 0, to: 1, easing: "linear" },
    },

    // ── ACT 3: REQUEST ────────────────────────────────────────────────────

    // Annotation arrow in gap — hand-drawn feel
    {
      id: "req-arrow",
      type: "shape", shapeType: "line",
      start: 4.5, end: 7.0, layer: 3,
      x1: GAP_L + 20, y1: R1Y + R1H / 2,
      x2: GAP_R - 20, y2: R1Y + R1H / 2,
      stroke: NAVY, lineWidth: 2,
      arrowEnd: true, arrowSize: 10,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "req-label",
      type: "text",
      start: 4.5, end: 7.0, layer: 5,
      text: "POST /api/users",
      x: GAP_CX - 130, y: R1Y + R1H / 2 - 44, maxWidth: 360,
      fontSize: 26, fontWeight: 700, color: NAVY,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Packet — small, dark circle, linear movement
    {
      id: "req-packet",
      type: "shape", shapeType: "circle",
      start: 5.0, end: 7.0, layer: 4,
      x: GAP_CX, y: R1Y + R1H / 2, radius: 16,
      fill: NAVY,
      path: {
        points: [
          { x: GAP_L + 20, y: R1Y + R1H / 2 },
          { x: GAP_CX, y: R1Y + R1H / 2 },
          { x: GAP_R - 20, y: R1Y + R1H / 2 },
        ],
        easing: "easeInOut",
      },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    {
      id: "req-annotation",
      type: "text",
      start: 5.3, end: 7.0, layer: 4,
      text: "{ name, email, password }",
      x: GAP_CX - 160, y: R1Y + R1H / 2 + 26, maxWidth: 380,
      fontSize: 20, fontWeight: 400, color: SLATE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── ACT 4: PROCESSING ─────────────────────────────────────────────────
    {
      id: "step-validate",
      type: "text",
      start: 7.5, end: 10.2, layer: 5,
      text: "→ Validate",
      x: SL + PAD, y: L1Y + 40, maxWidth: 200,
      fontSize: 20, fontWeight: 600, color: FOREST,
      opacity: { from: 0, to: 1, easing: "linear" },
    },
    {
      id: "step-hash",
      type: "text",
      start: 8.0, end: 10.2, layer: 5,
      text: "→ Hash Password",
      x: SL + PAD, y: L2Y + 38, maxWidth: 260,
      fontSize: 20, fontWeight: 600, color: FOREST,
      opacity: { from: 0, to: 1, easing: "linear" },
    },
    {
      id: "step-store",
      type: "text",
      start: 8.5, end: 10.2, layer: 5,
      text: "→ INSERT INTO users",
      x: SL + PAD, y: L3Y + 38, maxWidth: 280,
      fontSize: 20, fontWeight: 600, color: FOREST,
      opacity: { from: 0, to: 1, easing: "linear" },
    },

    // ── ACT 5: RESPONSE ───────────────────────────────────────────────────
    {
      id: "res-arrow",
      type: "shape", shapeType: "line",
      start: 10.0, end: 12.5, layer: 3,
      x1: GAP_R - 20, y1: R1Y + R1H / 2,
      x2: GAP_L + 20, y2: R1Y + R1H / 2,
      stroke: FOREST, lineWidth: 2,
      arrowEnd: true, arrowSize: 10,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "res-label",
      type: "text",
      start: 10.0, end: 12.5, layer: 5,
      text: "201 Created",
      x: GAP_CX - 95, y: R1Y + R1H / 2 - 44, maxWidth: 280,
      fontSize: 26, fontWeight: 700, color: FOREST,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "res-packet",
      type: "shape", shapeType: "circle",
      start: 10.3, end: 12.0, layer: 4,
      x: GAP_CX, y: R1Y + R1H / 2, radius: 16,
      fill: FOREST,
      path: {
        points: [
          { x: GAP_R - 20, y: R1Y + R1H / 2 },
          { x: GAP_CX, y: R1Y + R1H / 2 },
          { x: GAP_L + 20, y: R1Y + R1H / 2 },
        ],
        easing: "easeInOut",
      },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "res-body",
      type: "text",
      start: 10.8, end: 12.2, layer: 4,
      text: "ok",
      x: GAP_CX - 25, y: R1Y + R1H / 2 + 26, maxWidth: 160,
      fontSize: 20, fontWeight: 400, color: SLATE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── OUTRO ─────────────────────────────────────────────────────────────
    {
      id: "closing",
      type: "text",
      start: 13.0, end: DUR, layer: 5,
      text: "Every request tells a story.",
      x: W / 2 - 360, y: 820, maxWidth: 780,
      fontSize: 48, fontWeight: 700, color: CHARCOAL,
      opacity: {
        keyframes: [
          { time: 13.0, value: 0, easing: "easeOut" },
          { time: 13.7, value: 1, easing: "easeOut" },
          { time: 14.3, value: 1, easing: "easeInOut" },
          { time: DUR, value: 0, easing: "easeIn" },
        ],
      },
      translateY: { from: 16, to: 0, easing: "easeOut" },
    },
  ],
};
