import type { VideoProject } from "@/lib/renderer";

/**
 * Blueprint — Technical Schematic
 * Crisp cyan outlines, no fills, strict horizontal data flow, grid background.
 * 15 seconds · 1920×1080
 */

const W = 1920;
const H = 1080;
const DUR = 15;

const CL = 120;
const SW = 480;
const SL = W - CL - SW;
const GAP_L = CL + SW;
const GAP_R = SL;
const GAP_CX = (GAP_L + GAP_R) / 2;
const PAD = 36;

const R1Y = 280;
const R1H = 130;
const RG = 24;
const R2Y = R1Y + R1H + RG;
const R2H = 110;
const R3Y = R2Y + R2H + RG;
const R3H = 110;
const STACK_BOTTOM = R3Y + R3H;
const MID_Y = R1Y + R1H / 2; // horizontal packet travels at this Y

const L1_FS = 28;
const L2_FS = 22;
const L1Y = R1Y + (R1H - L1_FS) / 2 + 4;
const L2Y = R2Y + (R2H - L2_FS) / 2 + 4;
const L3Y = R3Y + (R3H - L2_FS) / 2 + 4;

const CYAN   = "rgb(0 255 255)";
const CYAN_D = "rgb(0 255 255 / 0.35)";
const CYAN_G = "rgb(0 255 255 / 0.6)";
const WHITE  = "#f0f8ff";
const MUTED  = "rgb(160 220 240 / 0.7)";

export const blueprintProject: VideoProject = {
  id: "blueprint-schematic-v1",
  name: "Blueprint — Technical Schematic",
  width: W,
  height: H,
  duration: DUR,
  events: [

    // Background — deep navy
    {
      id: "bg",
      type: "background",
      start: 0, end: DUR, layer: 0,
      background: { kind: "solid", color: "#03060f" },
    },

    // ── Grid lines (horizontal) ────────────────────────────────────────────
    ...Array.from({ length: 9 }, (_, i) => ({
      id: `grid-h-${i}`,
      type: "shape" as const, shapeType: "line" as const,
      start: 0.5, end: DUR, layer: 0,
      x1: 0, y1: 120 * (i + 1), x2: W, y2: 120 * (i + 1),
      stroke: "rgb(0 200 255 / 0.06)", lineWidth: 1,
    })),

    // ── Grid lines (vertical) ──────────────────────────────────────────────
    ...Array.from({ length: 11 }, (_, i) => ({
      id: `grid-v-${i}`,
      type: "shape" as const, shapeType: "line" as const,
      start: 0.5, end: DUR, layer: 0,
      x1: 160 * (i + 1), y1: 0, x2: 160 * (i + 1), y2: H,
      stroke: "rgb(0 200 255 / 0.06)", lineWidth: 1,
    })),

    // ── Title ──────────────────────────────────────────────────────────────
    {
      id: "title",
      type: "text",
      start: 0, end: 2.5, layer: 5,
      text: "SYSTEM ARCHITECTURE",
      x: W / 2 - 440, y: 420, maxWidth: 900,
      fontSize: 80, fontWeight: 700, color: CYAN,
      shadow: { color: CYAN_G, blur: 30 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "subtitle",
      type: "text",
      start: 0.4, end: 2.5, layer: 5,
      text: "CLIENT — NETWORK — SERVER",
      x: W / 2 - 340, y: 520, maxWidth: 700,
      fontSize: 28, fontWeight: 400, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── CLIENT HEADER ──────────────────────────────────────────────────────
    {
      id: "client-header",
      type: "text",
      start: 2.5, end: 14.5, layer: 5,
      text: "[CLIENT]",
      x: CL, y: 230, maxWidth: 200,
      fontSize: 18, fontWeight: 700, color: CYAN,
      shadow: { color: CYAN_G, blur: 10 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Browser rect — sharp corners, no fill
    {
      id: "browser-rect",
      type: "shape", shapeType: "rect",
      start: 2.8, end: 14.5, layer: 2,
      x: CL, y: R1Y, width: SW, height: R1H, radius: 0,
      fill: "rgb(0 255 255 / 0.03)",
      stroke: CYAN, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "browser-label",
      type: "text",
      start: 3.0, end: 14.5, layer: 4,
      text: "BROWSER",
      x: CL + PAD, y: L1Y, maxWidth: SW - PAD * 2,
      fontSize: L1_FS, fontWeight: 700, color: WHITE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // HTTP rect
    {
      id: "http-rect",
      type: "shape", shapeType: "rect",
      start: 3.1, end: 14.5, layer: 2,
      x: CL, y: R2Y, width: SW, height: R2H, radius: 0,
      fill: "rgb(0 255 255 / 0.02)",
      stroke: CYAN_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "http-label",
      type: "text",
      start: 3.2, end: 14.5, layer: 4,
      text: "HTTP LAYER",
      x: CL + PAD, y: L2Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 600, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Network rect
    {
      id: "network-rect",
      type: "shape", shapeType: "rect",
      start: 3.3, end: 14.5, layer: 2,
      x: CL, y: R3Y, width: SW, height: R3H, radius: 0,
      fill: "rgb(0 255 255 / 0.01)",
      stroke: CYAN_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "network-label",
      type: "text",
      start: 3.4, end: 14.5, layer: 4,
      text: "NETWORK",
      x: CL + PAD, y: L3Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 600, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Client vertical connectors — right-angle style
    {
      id: "client-conn-1",
      type: "shape", shapeType: "line",
      start: 3.6, end: 14.5, layer: 1,
      x1: CL + SW / 2, y1: R1Y + R1H,
      x2: CL + SW / 2, y2: R2Y,
      stroke: CYAN_D, lineWidth: 1,
      arrowEnd: true, arrowSize: 7,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "client-conn-2",
      type: "shape", shapeType: "line",
      start: 3.7, end: 14.5, layer: 1,
      x1: CL + SW / 2, y1: R2Y + R2H,
      x2: CL + SW / 2, y2: R3Y,
      stroke: CYAN_D, lineWidth: 1,
      arrowEnd: true, arrowSize: 7,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── SERVER HEADER ──────────────────────────────────────────────────────
    {
      id: "server-header",
      type: "text",
      start: 2.8, end: 14.5, layer: 5,
      text: "[SERVER]",
      x: SL, y: 230, maxWidth: 200,
      fontSize: 18, fontWeight: 700, color: "rgb(0 255 160)",
      shadow: { color: "rgb(0 255 160 / 0.5)", blur: 10 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // REST API rect
    {
      id: "api-rect",
      type: "shape", shapeType: "rect",
      start: 3.0, end: 14.5, layer: 2,
      x: SL, y: R1Y, width: SW, height: R1H, radius: 0,
      fill: "rgb(0 255 160 / 0.03)",
      stroke: "rgb(0 255 160)", strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "api-label",
      type: "text",
      start: 3.2, end: 14.5, layer: 4,
      text: "REST API",
      x: SL + PAD, y: L1Y, maxWidth: SW - PAD * 2,
      fontSize: L1_FS, fontWeight: 700, color: WHITE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Business Logic rect
    {
      id: "logic-rect",
      type: "shape", shapeType: "rect",
      start: 3.2, end: 14.5, layer: 2,
      x: SL, y: R2Y, width: SW, height: R2H, radius: 0,
      fill: "rgb(0 255 160 / 0.02)",
      stroke: "rgb(0 255 160 / 0.35)", strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "logic-label",
      type: "text",
      start: 3.4, end: 14.5, layer: 4,
      text: "BUSINESS LOGIC",
      x: SL + PAD, y: L2Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 600, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // PostgreSQL rect
    {
      id: "db-rect",
      type: "shape", shapeType: "rect",
      start: 3.4, end: 14.5, layer: 2,
      x: SL, y: R3Y, width: SW, height: R3H, radius: 0,
      fill: "rgb(0 255 160 / 0.01)",
      stroke: "rgb(0 255 160 / 0.25)", strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "db-label",
      type: "text",
      start: 3.6, end: 14.5, layer: 4,
      text: "POSTGRESQL",
      x: SL + PAD, y: L3Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 600, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Server vertical connectors
    {
      id: "server-conn-1",
      type: "shape", shapeType: "line",
      start: 3.8, end: 14.5, layer: 1,
      x1: SL + SW / 2, y1: R1Y + R1H,
      x2: SL + SW / 2, y2: R2Y,
      stroke: "rgb(0 255 160 / 0.4)", lineWidth: 1,
      arrowEnd: true, arrowSize: 7,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "server-conn-2",
      type: "shape", shapeType: "line",
      start: 3.9, end: 14.5, layer: 1,
      x1: SL + SW / 2, y1: R2Y + R2H,
      x2: SL + SW / 2, y2: R3Y,
      stroke: "rgb(0 255 160 / 0.3)", lineWidth: 1,
      arrowEnd: true, arrowSize: 7,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── ACT 3: REQUEST — strict horizontal line ────────────────────────────

    // Horizontal guide line at MID_Y
    {
      id: "req-guide",
      type: "shape", shapeType: "line",
      start: 4.3, end: 7.5, layer: 1,
      x1: CL + SW, y1: MID_Y, x2: SL, y2: MID_Y,
      stroke: "rgb(0 255 255 / 0.2)", lineWidth: 1,
      lineDash: [8, 6],
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Request label
    {
      id: "req-label",
      type: "text",
      start: 4.3, end: 7.0, layer: 5,
      text: "POST /api/users",
      x: GAP_CX - 140, y: MID_Y - 55, maxWidth: 380,
      fontSize: 26, fontWeight: 700, color: CYAN,
      shadow: { color: CYAN_G, blur: 18 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Packet — straight horizontal, no arc
    {
      id: "req-packet",
      type: "shape", shapeType: "circle",
      start: 4.8, end: 7.0, layer: 3,
      x: GAP_L, y: MID_Y, radius: 18,
      fill: CYAN,
      shadow: { color: CYAN_G, blur: 20 },
      path: {
        points: [
          { x: GAP_L, y: MID_Y },
          { x: GAP_CX, y: MID_Y },
          { x: GAP_R, y: MID_Y },
        ],
        easing: "linear",
      },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Data label
    {
      id: "req-data",
      type: "text",
      start: 5.2, end: 7.0, layer: 4,
      text: "{ name, email, password }",
      x: GAP_CX - 160, y: MID_Y + 30, maxWidth: 400,
      fontSize: 20, fontWeight: 400, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── ACT 4: PROCESSING ─────────────────────────────────────────────────

    {
      id: "step-validate",
      type: "text",
      start: 7.5, end: 10.0, layer: 5,
      text: "> VALIDATE",
      x: SL + PAD, y: L1Y + 40, maxWidth: SW - PAD,
      fontSize: 18, fontWeight: 600, color: "rgb(0 255 160)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: -20, to: 0, easing: "easeOut" },
    },
    {
      id: "step-hash",
      type: "text",
      start: 8.0, end: 10.0, layer: 5,
      text: "> HASH PASSWORD",
      x: SL + PAD, y: L2Y + 40, maxWidth: SW - PAD,
      fontSize: 18, fontWeight: 600, color: "rgb(0 255 160)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: -20, to: 0, easing: "easeOut" },
    },
    {
      id: "step-store",
      type: "text",
      start: 8.5, end: 10.0, layer: 5,
      text: "> INSERT INTO users",
      x: SL + PAD, y: L3Y + 40, maxWidth: SW - PAD,
      fontSize: 18, fontWeight: 600, color: "rgb(0 255 160)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: -20, to: 0, easing: "easeOut" },
    },

    // ── ACT 5: RESPONSE — strict horizontal ───────────────────────────────

    {
      id: "res-guide",
      type: "shape", shapeType: "line",
      start: 10.0, end: 12.5, layer: 1,
      x1: SL, y1: MID_Y, x2: CL + SW, y2: MID_Y,
      stroke: "rgb(0 255 160 / 0.2)", lineWidth: 1,
      lineDash: [8, 6],
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "res-label",
      type: "text",
      start: 10.0, end: 12.5, layer: 5,
      text: "201 CREATED",
      x: GAP_CX - 100, y: MID_Y - 55, maxWidth: 300,
      fontSize: 26, fontWeight: 700, color: "rgb(0 255 160)",
      shadow: { color: "rgb(0 255 160 / 0.6)", blur: 18 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "res-packet",
      type: "shape", shapeType: "circle",
      start: 10.3, end: 12.0, layer: 3,
      x: GAP_R, y: MID_Y, radius: 18,
      fill: "rgb(0 255 160)",
      shadow: { color: "rgb(0 255 160 / 0.8)", blur: 20 },
      path: {
        points: [
          { x: GAP_R, y: MID_Y },
          { x: GAP_CX, y: MID_Y },
          { x: GAP_L, y: MID_Y },
        ],
        easing: "linear",
      },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── OUTRO ─────────────────────────────────────────────────────────────
    {
      id: "closing",
      type: "text",
      start: 12.5, end: DUR, layer: 5,
      text: "REQUEST COMPLETE // LATENCY ~200ms",
      x: W / 2 - 360, y: 820, maxWidth: 800,
      fontSize: 36, fontWeight: 700, color: CYAN,
      shadow: { color: CYAN_G, blur: 25 },
      opacity: {
        keyframes: [
          { time: 12.5, value: 0, easing: "easeOut" },
          { time: 13.0, value: 1, easing: "easeOut" },
          { time: 14.2, value: 1, easing: "easeInOut" },
          { time: DUR, value: 0, easing: "easeIn" },
        ],
      },
    },
  ],
};
