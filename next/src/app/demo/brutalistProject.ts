import type { VideoProject } from "@/lib/renderer";

/**
 * Brutalist — Raw & Sharp
 * Pure black bg, flat colors, zero easing (linear), hard snaps, single red accent.
 * 15 seconds · 1920×1080
 */

const W = 1920;
const H = 1080;
const DUR = 15;

const CL = 100;
const SW = 500;
const SL = W - CL - SW;
const GAP_L = CL + SW;
const GAP_R = SL;
const GAP_CX = (GAP_L + GAP_R) / 2;
const PAD = 36;

const R1Y = 270;
const R1H = 140;
const RG = 20;
const R2Y = R1Y + R1H + RG;
const R2H = 120;
const R3Y = R2Y + R2H + RG;
const R3H = 120;

const MID_Y = R1Y + R1H / 2;  // packet travels at browser/API center Y

const L1_FS = 32;
const L2_FS = 26;
const L1Y = R1Y + (R1H - L1_FS) / 2 + 4;
const L2Y = R2Y + (R2H - L2_FS) / 2 + 4;
const L3Y = R3Y + (R3H - L2_FS) / 2 + 4;

const WHITE  = "#ffffff";
const GRAY1  = "#c0c0c0";
const GRAY2  = "#808080";
const GRAY3  = "#404040";
const RED    = "rgb(220 30 30)";

// Hard snap: opacity goes 0→1 in a near-instant keyframe
function snap(startTime: number) {
  return {
    keyframes: [
      { time: startTime, value: 0, easing: "linear" as const },
      { time: startTime + 0.04, value: 1, easing: "linear" as const },
    ],
  };
}

function snapOut(startTime: number, endTime: number) {
  return {
    keyframes: [
      { time: startTime, value: 0, easing: "linear" as const },
      { time: startTime + 0.04, value: 1, easing: "linear" as const },
      { time: endTime - 0.04, value: 1, easing: "linear" as const },
      { time: endTime, value: 0, easing: "linear" as const },
    ],
  };
}

export const brutalistProject: VideoProject = {
  id: "brutalist-sharp-v1",
  name: "Brutalist — Raw & Sharp",
  width: W,
  height: H,
  duration: DUR,
  events: [

    // Pure black background
    {
      id: "bg",
      type: "background",
      start: 0, end: DUR, layer: 0,
      background: { kind: "solid", color: "#000000" },
    },

    // ── Title — slams in ──────────────────────────────────────────────────
    {
      id: "title",
      type: "text",
      start: 0, end: 2.5, layer: 5,
      text: "HOW THE WEB WORKS",
      x: W / 2 - 560, y: 380, maxWidth: 1140,
      fontSize: 90, fontWeight: 900, color: WHITE,
      opacity: snap(0),
    },
    {
      id: "title-underline",
      type: "shape", shapeType: "line",
      start: 0.1, end: 2.5, layer: 4,
      x1: W / 2 - 560, y1: 488, x2: W / 2 + 570, y2: 488,
      stroke: RED, lineWidth: 4,
      opacity: snap(0.1),
    },
    {
      id: "subtitle",
      type: "text",
      start: 0.2, end: 2.5, layer: 5,
      text: "CLIENT — SERVER — RESPONSE",
      x: W / 2 - 380, y: 510, maxWidth: 800,
      fontSize: 32, fontWeight: 700, color: GRAY1,
      opacity: snap(0.2),
    },

    // ── CLIENT STACK — white strokes, no radius ────────────────────────────
    {
      id: "client-header",
      type: "text",
      start: 2.5, end: 14.5, layer: 5,
      text: "CLIENT",
      x: CL, y: 230, maxWidth: 200,
      fontSize: 16, fontWeight: 900, color: WHITE,
      opacity: snap(2.5),
    },
    {
      id: "client-header-line",
      type: "shape", shapeType: "line",
      start: 2.5, end: 14.5, layer: 1,
      x1: CL, y1: 252, x2: CL + SW, y2: 252,
      stroke: WHITE, lineWidth: 1,
      opacity: snap(2.5),
    },

    // Browser — flat dark gray fill, white border
    {
      id: "browser-rect",
      type: "shape", shapeType: "rect",
      start: 2.6, end: 14.5, layer: 2,
      x: CL, y: R1Y, width: SW, height: R1H, radius: 0,
      fill: "#111111",
      stroke: WHITE, strokeWidth: 2,
      opacity: snap(2.6),
    },
    {
      id: "browser-label",
      type: "text",
      start: 2.7, end: 14.5, layer: 4,
      text: "BROWSER",
      x: CL + PAD, y: L1Y, maxWidth: SW - PAD * 2,
      fontSize: L1_FS, fontWeight: 900, color: WHITE,
      opacity: snap(2.7),
    },

    {
      id: "http-rect",
      type: "shape", shapeType: "rect",
      start: 2.8, end: 14.5, layer: 2,
      x: CL, y: R2Y, width: SW, height: R2H, radius: 0,
      fill: "#0e0e0e",
      stroke: GRAY1, strokeWidth: 1.5,
      opacity: snap(2.8),
    },
    {
      id: "http-label",
      type: "text",
      start: 2.9, end: 14.5, layer: 4,
      text: "HTTP LAYER",
      x: CL + PAD, y: L2Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 700, color: GRAY1,
      opacity: snap(2.9),
    },

    {
      id: "network-rect",
      type: "shape", shapeType: "rect",
      start: 3.0, end: 14.5, layer: 2,
      x: CL, y: R3Y, width: SW, height: R3H, radius: 0,
      fill: "#0a0a0a",
      stroke: GRAY2, strokeWidth: 1,
      opacity: snap(3.0),
    },
    {
      id: "network-label",
      type: "text",
      start: 3.1, end: 14.5, layer: 4,
      text: "NETWORK",
      x: CL + PAD, y: L3Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 700, color: GRAY2,
      opacity: snap(3.1),
    },

    // Client connectors — hard lines
    {
      id: "client-conn-1",
      type: "shape", shapeType: "line",
      start: 3.2, end: 14.5, layer: 1,
      x1: CL + SW / 2, y1: R1Y + R1H,
      x2: CL + SW / 2, y2: R2Y,
      stroke: GRAY2, lineWidth: 1,
      arrowEnd: true, arrowSize: 8,
      opacity: snap(3.2),
    },
    {
      id: "client-conn-2",
      type: "shape", shapeType: "line",
      start: 3.3, end: 14.5, layer: 1,
      x1: CL + SW / 2, y1: R2Y + R2H,
      x2: CL + SW / 2, y2: R3Y,
      stroke: GRAY3, lineWidth: 1,
      arrowEnd: true, arrowSize: 8,
      opacity: snap(3.3),
    },

    // ── SERVER STACK ───────────────────────────────────────────────────────
    {
      id: "server-header",
      type: "text",
      start: 2.6, end: 14.5, layer: 5,
      text: "SERVER",
      x: SL, y: 230, maxWidth: 200,
      fontSize: 16, fontWeight: 900, color: WHITE,
      opacity: snap(2.6),
    },
    {
      id: "server-header-line",
      type: "shape", shapeType: "line",
      start: 2.6, end: 14.5, layer: 1,
      x1: SL, y1: 252, x2: SL + SW, y2: 252,
      stroke: WHITE, lineWidth: 1,
      opacity: snap(2.6),
    },

    {
      id: "api-rect",
      type: "shape", shapeType: "rect",
      start: 2.7, end: 14.5, layer: 2,
      x: SL, y: R1Y, width: SW, height: R1H, radius: 0,
      fill: "#111111",
      stroke: WHITE, strokeWidth: 2,
      opacity: snap(2.7),
    },
    {
      id: "api-label",
      type: "text",
      start: 2.8, end: 14.5, layer: 4,
      text: "REST API",
      x: SL + PAD, y: L1Y, maxWidth: SW - PAD * 2,
      fontSize: L1_FS, fontWeight: 900, color: WHITE,
      opacity: snap(2.8),
    },

    {
      id: "logic-rect",
      type: "shape", shapeType: "rect",
      start: 2.9, end: 14.5, layer: 2,
      x: SL, y: R2Y, width: SW, height: R2H, radius: 0,
      fill: "#0e0e0e",
      stroke: GRAY1, strokeWidth: 1.5,
      opacity: snap(2.9),
    },
    {
      id: "logic-label",
      type: "text",
      start: 3.0, end: 14.5, layer: 4,
      text: "BUSINESS LOGIC",
      x: SL + PAD, y: L2Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 700, color: GRAY1,
      opacity: snap(3.0),
    },

    {
      id: "db-rect",
      type: "shape", shapeType: "rect",
      start: 3.1, end: 14.5, layer: 2,
      x: SL, y: R3Y, width: SW, height: R3H, radius: 0,
      fill: "#0a0a0a",
      stroke: GRAY2, strokeWidth: 1,
      opacity: snap(3.1),
    },
    {
      id: "db-label",
      type: "text",
      start: 3.2, end: 14.5, layer: 4,
      text: "POSTGRESQL",
      x: SL + PAD, y: L3Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 700, color: GRAY2,
      opacity: snap(3.2),
    },

    {
      id: "server-conn-1",
      type: "shape", shapeType: "line",
      start: 3.3, end: 14.5, layer: 1,
      x1: SL + SW / 2, y1: R1Y + R1H,
      x2: SL + SW / 2, y2: R2Y,
      stroke: GRAY2, lineWidth: 1,
      arrowEnd: true, arrowSize: 8,
      opacity: snap(3.3),
    },
    {
      id: "server-conn-2",
      type: "shape", shapeType: "line",
      start: 3.4, end: 14.5, layer: 1,
      x1: SL + SW / 2, y1: R2Y + R2H,
      x2: SL + SW / 2, y2: R3Y,
      stroke: GRAY3, lineWidth: 1,
      arrowEnd: true, arrowSize: 8,
      opacity: snap(3.4),
    },

    // Separator between stacks
    {
      id: "gap-divider",
      type: "shape", shapeType: "line",
      start: 3.5, end: 14.5, layer: 1,
      x1: GAP_CX, y1: R1Y - 30, x2: GAP_CX, y2: R3Y + R3H + 30,
      stroke: GRAY3, lineWidth: 1,
      lineDash: [6, 6],
      opacity: snap(3.5),
    },

    // ── ACT 3: REQUEST — strict horizontal, linear ─────────────────────────

    // Request label snaps in
    {
      id: "req-label",
      type: "text",
      start: 4.5, end: 7.0, layer: 5,
      text: "POST /api/users",
      x: GAP_CX - 150, y: MID_Y - 54, maxWidth: 360,
      fontSize: 28, fontWeight: 900, color: RED,
      opacity: snap(4.5),
    },

    // Horizontal guide line
    {
      id: "req-guide",
      type: "shape", shapeType: "line",
      start: 4.6, end: 7.0, layer: 1,
      x1: GAP_L, y1: MID_Y, x2: GAP_R, y2: MID_Y,
      stroke: GRAY3, lineWidth: 1,
      opacity: snap(4.6),
    },

    // Packet — red circle, perfectly horizontal, linear speed
    {
      id: "req-packet",
      type: "shape", shapeType: "circle",
      start: 5.0, end: 7.0, layer: 3,
      x: GAP_L, y: MID_Y, radius: 20,
      fill: RED,
      path: {
        points: [
          { x: GAP_L, y: MID_Y },
          { x: GAP_CX, y: MID_Y },
          { x: GAP_R, y: MID_Y },
        ],
        easing: "linear",
      },
      opacity: snapOut(5.0, 7.0),
    },

    // Data label
    {
      id: "req-data",
      type: "text",
      start: 5.5, end: 7.0, layer: 4,
      text: "{ name, email, password }",
      x: GAP_CX - 170, y: MID_Y + 32, maxWidth: 400,
      fontSize: 22, fontWeight: 400, color: GRAY2,
      opacity: snap(5.5),
    },

    // ── ACT 4: PROCESSING — text slams in one by one ──────────────────────
    {
      id: "step-validate",
      type: "text",
      start: 7.5, end: 10.0, layer: 5,
      text: "→ VALIDATE",
      x: SL + PAD, y: L1Y + 42, maxWidth: 220,
      fontSize: 20, fontWeight: 900, color: WHITE,
      opacity: snap(7.5),
    },
    {
      id: "step-hash",
      type: "text",
      start: 8.2, end: 10.0, layer: 5,
      text: "→ HASH PASSWORD",
      x: SL + PAD, y: L2Y + 38, maxWidth: 300,
      fontSize: 20, fontWeight: 900, color: WHITE,
      opacity: snap(8.2),
    },
    {
      id: "step-store",
      type: "text",
      start: 8.9, end: 10.0, layer: 5,
      text: "→ INSERT INTO users",
      x: SL + PAD, y: L3Y + 38, maxWidth: 320,
      fontSize: 20, fontWeight: 900, color: WHITE,
      opacity: snap(8.9),
    },

    // Processing highlight rect — hard snap on/off
    {
      id: "proc-highlight",
      type: "shape", shapeType: "rect",
      start: 7.5, end: 10.0, layer: 1,
      x: SL - 2, y: R1Y - 2,
      width: SW + 4, height: R1H + R2H + R3H + RG * 2 + 4,
      radius: 0,
      fill: "rgb(255 255 255 / 0.03)",
      stroke: WHITE, strokeWidth: 1,
      opacity: snap(7.5),
    },

    // ── ACT 5: RESPONSE — straight horizontal, linear ────────────────────
    {
      id: "res-label",
      type: "text",
      start: 10.0, end: 12.5, layer: 5,
      text: "201 CREATED",
      x: GAP_CX - 130, y: MID_Y - 54, maxWidth: 320,
      fontSize: 28, fontWeight: 900, color: WHITE,
      opacity: snap(10.0),
    },
    {
      id: "res-guide",
      type: "shape", shapeType: "line",
      start: 10.1, end: 12.5, layer: 1,
      x1: GAP_R, y1: MID_Y, x2: GAP_L, y2: MID_Y,
      stroke: GRAY3, lineWidth: 1,
      opacity: snap(10.1),
    },
    {
      id: "res-packet",
      type: "shape", shapeType: "circle",
      start: 10.3, end: 12.0, layer: 3,
      x: GAP_R, y: MID_Y, radius: 20,
      fill: WHITE,
      path: {
        points: [
          { x: GAP_R, y: MID_Y },
          { x: GAP_CX, y: MID_Y },
          { x: GAP_L, y: MID_Y },
        ],
        easing: "linear",
      },
      opacity: snapOut(10.3, 12.0),
    },

    // ── OUTRO ─────────────────────────────────────────────────────────────
    {
      id: "separator",
      type: "shape", shapeType: "line",
      start: 12.5, end: DUR, layer: 4,
      x1: 100, y1: 760, x2: W - 100, y2: 760,
      stroke: RED, lineWidth: 2,
      opacity: snap(12.5),
    },
    {
      id: "closing",
      type: "text",
      start: 12.5, end: DUR, layer: 5,
      text: "EVERY REQUEST. EVERY TIME.",
      x: W / 2 - 440, y: 790, maxWidth: 920,
      fontSize: 64, fontWeight: 900, color: WHITE,
      opacity: snapOut(12.5, DUR),
    },
  ],
};
