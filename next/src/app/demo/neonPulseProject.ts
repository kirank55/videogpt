import type { VideoProject } from "@/lib/renderer";

/**
 * Neon Pulse — Cyberpunk
 * Near-black bg, hot-pink + electric-cyan outlines, glowing particles, packet trails.
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
const PAD = 40;

const R1Y = 270;
const R1H = 140;
const RG = 20;
const R2Y = R1Y + R1H + RG;
const R2H = 120;
const R3Y = R2Y + R2H + RG;
const R3H = 120;

const L1_FS = 30;
const L2_FS = 24;
const L1Y = R1Y + (R1H - L1_FS) / 2 + 4;
const L2Y = R2Y + (R2H - L2_FS) / 2 + 4;
const L3Y = R3Y + (R3H - L2_FS) / 2 + 4;

const PINK      = "rgb(255 0 170)";
const PINK_D    = "rgb(255 0 170 / 0.4)";
const PINK_G    = "rgb(255 0 170 / 0.8)";
const ELEC      = "rgb(0 200 255)";
const ELEC_D    = "rgb(0 200 255 / 0.4)";
const ELEC_G    = "rgb(0 200 255 / 0.8)";
const PURPLE    = "rgb(180 0 255)";
const PURPLE_G  = "rgb(180 0 255 / 0.7)";
const WHITE     = "#f0eaff";

export const neonPulseProject: VideoProject = {
  id: "neon-pulse-cyberpunk-v1",
  name: "Neon Pulse — Cyberpunk",
  width: W,
  height: H,
  duration: DUR,
  events: [

    // Near-black background
    {
      id: "bg",
      type: "background",
      start: 0, end: DUR, layer: 0,
      background: { kind: "gradient", from: "#050510", to: "#0a0520", angle: 140 },
    },

    // Dense ambient particles — digital rain feel
    {
      id: "ambient-a",
      type: "particle",
      start: 0, end: DUR, layer: 1,
      count: 60, seed: 11,
      origin: { x: W / 2, y: H / 2 },
      spread: { x: W / 2, y: H / 2 },
      drift: { x: 0, y: 8 },
      particleRadius: { min: 1, max: 3 },
      color: PINK_G,
      particleOpacity: { min: 0.1, max: 0.5 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "ambient-b",
      type: "particle",
      start: 0, end: DUR, layer: 1,
      count: 60, seed: 22,
      origin: { x: W / 2, y: H / 2 },
      spread: { x: W / 2, y: H / 2 },
      drift: { x: 0, y: -6 },
      particleRadius: { min: 1, max: 3 },
      color: ELEC_G,
      particleOpacity: { min: 0.1, max: 0.45 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── Title ──────────────────────────────────────────────────────────────
    {
      id: "title",
      type: "text",
      start: 0, end: 2.6, layer: 5,
      text: "JACK IN.",
      x: W / 2 - 260, y: 390, maxWidth: 600,
      fontSize: 100, fontWeight: 900, color: PINK,
      shadow: { color: PINK_G, blur: 60 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0.85, to: 1, easing: "easeOut" },
    },
    {
      id: "subtitle",
      type: "text",
      start: 0.6, end: 2.6, layer: 5,
      text: "CLIENT  ⟶  SERVER  ⟶  RESPONSE",
      x: W / 2 - 370, y: 510, maxWidth: 800,
      fontSize: 32, fontWeight: 400, color: ELEC,
      shadow: { color: ELEC_G, blur: 20 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── CLIENT STACK — pink theme ──────────────────────────────────────────
    {
      id: "client-header",
      type: "text",
      start: 2.6, end: 14.5, layer: 5,
      text: "CLIENT",
      x: CL + PAD, y: 225, maxWidth: 200,
      fontSize: 16, fontWeight: 800, color: PINK,
      shadow: { color: PINK_G, blur: 18 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Browser — pulsing outline
    {
      id: "browser-rect",
      type: "shape", shapeType: "rect",
      start: 2.8, end: 14.5, layer: 2,
      x: CL, y: R1Y, width: SW, height: R1H, radius: 8,
      fill: "rgb(255 0 170 / 0.05)",
      stroke: PINK, strokeWidth: 2,
      shadow: { color: PINK_G, blur: 30 },
      opacity: {
        keyframes: [
          { time: 2.8, value: 0, easing: "easeOut" },
          { time: 3.4, value: 1, easing: "easeOut" },
          { time: 4.0, value: 0.5, easing: "easeInOut" },
          { time: 4.5, value: 1, easing: "easeOut" },
          { time: 5.0, value: 0.7, easing: "easeInOut" },
          { time: 5.5, value: 1, easing: "easeOut" },
        ],
      },
    },
    {
      id: "browser-label",
      type: "text",
      start: 3.0, end: 14.5, layer: 4,
      text: "Browser",
      x: CL + PAD, y: L1Y, maxWidth: SW - PAD * 2,
      fontSize: L1_FS, fontWeight: 700, color: WHITE,
      shadow: { color: PINK_G, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    {
      id: "http-rect",
      type: "shape", shapeType: "rect",
      start: 3.1, end: 14.5, layer: 2,
      x: CL, y: R2Y, width: SW, height: R2H, radius: 6,
      fill: "rgb(255 0 170 / 0.03)",
      stroke: PINK_D, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "http-label",
      type: "text",
      start: 3.3, end: 14.5, layer: 4,
      text: "HTTP Layer",
      x: CL + PAD, y: L2Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 600, color: "rgb(255 150 220 / 0.9)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    {
      id: "network-rect",
      type: "shape", shapeType: "rect",
      start: 3.3, end: 14.5, layer: 2,
      x: CL, y: R3Y, width: SW, height: R3H, radius: 6,
      fill: "rgb(255 0 170 / 0.02)",
      stroke: PINK_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "network-label",
      type: "text",
      start: 3.5, end: 14.5, layer: 4,
      text: "Network",
      x: CL + PAD, y: L3Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 600, color: "rgb(255 120 200 / 0.7)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    {
      id: "client-conn-1",
      type: "shape", shapeType: "line",
      start: 3.7, end: 14.5, layer: 1,
      x1: CL + SW / 2, y1: R1Y + R1H,
      x2: CL + SW / 2, y2: R2Y,
      stroke: PINK_D, lineWidth: 1,
      lineDash: [4, 4],
      arrowEnd: true, arrowSize: 7,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "client-conn-2",
      type: "shape", shapeType: "line",
      start: 3.8, end: 14.5, layer: 1,
      x1: CL + SW / 2, y1: R2Y + R2H,
      x2: CL + SW / 2, y2: R3Y,
      stroke: PINK_D, lineWidth: 1,
      lineDash: [4, 4],
      arrowEnd: true, arrowSize: 7,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── SERVER STACK — electric cyan theme ────────────────────────────────
    {
      id: "server-header",
      type: "text",
      start: 3.0, end: 14.5, layer: 5,
      text: "SERVER",
      x: SL + PAD, y: 225, maxWidth: 200,
      fontSize: 16, fontWeight: 800, color: ELEC,
      shadow: { color: ELEC_G, blur: 18 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    {
      id: "api-rect",
      type: "shape", shapeType: "rect",
      start: 3.1, end: 14.5, layer: 2,
      x: SL, y: R1Y, width: SW, height: R1H, radius: 8,
      fill: "rgb(0 200 255 / 0.05)",
      stroke: ELEC, strokeWidth: 2,
      shadow: { color: ELEC_G, blur: 30 },
      opacity: {
        keyframes: [
          { time: 3.1, value: 0, easing: "easeOut" },
          { time: 3.7, value: 1, easing: "easeOut" },
          { time: 4.3, value: 0.5, easing: "easeInOut" },
          { time: 4.8, value: 1, easing: "easeOut" },
          { time: 5.3, value: 0.7, easing: "easeInOut" },
          { time: 5.8, value: 1, easing: "easeOut" },
        ],
      },
    },
    {
      id: "api-label",
      type: "text",
      start: 3.3, end: 14.5, layer: 4,
      text: "REST API",
      x: SL + PAD, y: L1Y, maxWidth: SW - PAD * 2,
      fontSize: L1_FS, fontWeight: 700, color: WHITE,
      shadow: { color: ELEC_G, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    {
      id: "logic-rect",
      type: "shape", shapeType: "rect",
      start: 3.3, end: 14.5, layer: 2,
      x: SL, y: R2Y, width: SW, height: R2H, radius: 6,
      fill: "rgb(0 200 255 / 0.03)",
      stroke: ELEC_D, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "logic-label",
      type: "text",
      start: 3.5, end: 14.5, layer: 4,
      text: "Business Logic",
      x: SL + PAD, y: L2Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 600, color: "rgb(100 220 255 / 0.9)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    {
      id: "db-rect",
      type: "shape", shapeType: "rect",
      start: 3.5, end: 14.5, layer: 2,
      x: SL, y: R3Y, width: SW, height: R3H, radius: 6,
      fill: "rgb(0 200 255 / 0.02)",
      stroke: ELEC_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "db-label",
      type: "text",
      start: 3.7, end: 14.5, layer: 4,
      text: "PostgreSQL",
      x: SL + PAD, y: L3Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 600, color: "rgb(80 200 255 / 0.7)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    {
      id: "server-conn-1",
      type: "shape", shapeType: "line",
      start: 3.9, end: 14.5, layer: 1,
      x1: SL + SW / 2, y1: R1Y + R1H,
      x2: SL + SW / 2, y2: R2Y,
      stroke: ELEC_D, lineWidth: 1,
      lineDash: [4, 4],
      arrowEnd: true, arrowSize: 7,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "server-conn-2",
      type: "shape", shapeType: "line",
      start: 4.0, end: 14.5, layer: 1,
      x1: SL + SW / 2, y1: R2Y + R2H,
      x2: SL + SW / 2, y2: R3Y,
      stroke: ELEC_D, lineWidth: 1,
      lineDash: [4, 4],
      arrowEnd: true, arrowSize: 7,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── ACT 3: REQUEST — packet + ghost trail ─────────────────────────────
    {
      id: "req-label",
      type: "text",
      start: 4.5, end: 7.5, layer: 5,
      text: "POST /api/users",
      x: GAP_CX - 160, y: R1Y - 65, maxWidth: 400,
      fontSize: 28, fontWeight: 700, color: PINK,
      shadow: { color: PINK_G, blur: 28 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Main packet
    {
      id: "req-packet",
      type: "shape", shapeType: "circle",
      start: 5.0, end: 7.0, layer: 4,
      x: GAP_CX, y: R1Y, radius: 24,
      fill: PINK,
      shadow: { color: PINK_G, blur: 40 },
      path: {
        points: [
          { x: GAP_L, y: R1Y + R1H / 2 },
          { x: GAP_CX, y: R1Y - 50 },
          { x: GAP_R, y: R1Y + R1H / 2 },
        ],
        easing: "easeInOut",
      },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0.4, to: 1.3, easing: "easeInOut" },
    },

    // Ghost trail — delayed + smaller + dimmer
    {
      id: "req-ghost-1",
      type: "shape", shapeType: "circle",
      start: 5.15, end: 7.0, layer: 3,
      x: GAP_CX, y: R1Y, radius: 18,
      fill: "rgb(255 0 170 / 0.4)",
      shadow: { color: PINK_G, blur: 20 },
      path: {
        points: [
          { x: GAP_L, y: R1Y + R1H / 2 },
          { x: GAP_CX, y: R1Y - 50 },
          { x: GAP_R, y: R1Y + R1H / 2 },
        ],
        easing: "easeInOut",
      },
      opacity: { from: 0, to: 0.6, easing: "easeOut" },
    },
    {
      id: "req-ghost-2",
      type: "shape", shapeType: "circle",
      start: 5.3, end: 7.0, layer: 3,
      x: GAP_CX, y: R1Y, radius: 12,
      fill: "rgb(255 0 170 / 0.2)",
      path: {
        points: [
          { x: GAP_L, y: R1Y + R1H / 2 },
          { x: GAP_CX, y: R1Y - 50 },
          { x: GAP_R, y: R1Y + R1H / 2 },
        ],
        easing: "easeInOut",
      },
      opacity: { from: 0, to: 0.35, easing: "easeOut" },
    },

    // Burst on launch
    {
      id: "req-burst",
      type: "particle",
      start: 5.0, end: 6.5, layer: 3,
      count: 35, seed: 55,
      origin: { x: GAP_L, y: R1Y + R1H / 2 },
      spread: { x: 50, y: 40 },
      drift: { x: 60, y: -25 },
      particleRadius: { min: 2, max: 6 },
      color: PINK_G,
      particleOpacity: { min: 0.4, max: 0.9 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Laser sweep line when packet transfers
    {
      id: "laser-sweep",
      type: "shape", shapeType: "line",
      start: 5.8, end: 6.4, layer: 3,
      x1: GAP_L, y1: R1Y + R1H / 2,
      x2: GAP_R, y2: R1Y + R1H / 2,
      stroke: "rgb(255 0 170 / 0.5)", lineWidth: 3,
      opacity: {
        keyframes: [
          { time: 5.8, value: 0, easing: "easeOut" },
          { time: 6.0, value: 1, easing: "easeOut" },
          { time: 6.4, value: 0, easing: "easeIn" },
        ],
      },
    },

    // ── ACT 4: PROCESSING — glowing server ────────────────────────────────
    {
      id: "proc-glow",
      type: "shape", shapeType: "rect",
      start: 7.5, end: 10.5, layer: 1,
      x: SL - 10, y: R1Y - 10,
      width: SW + 20, height: R1H + R2H + R3H + RG * 2 + 20,
      radius: 14,
      fill: "rgb(0 200 255 / 0.06)",
      shadow: { color: ELEC_G, blur: 50 },
      opacity: {
        keyframes: [
          { time: 7.5, value: 0, easing: "easeOut" },
          { time: 8.0, value: 1, easing: "easeOut" },
          { time: 9.0, value: 0.5, easing: "easeInOut" },
          { time: 10.0, value: 1, easing: "easeOut" },
          { time: 10.5, value: 0, easing: "easeIn" },
        ],
      },
    },

    {
      id: "step-validate",
      type: "text",
      start: 7.8, end: 10.2, layer: 5,
      text: "⟶ VALIDATE",
      x: SL + PAD, y: L1Y + 40, maxWidth: 200,
      fontSize: 18, fontWeight: 700, color: ELEC,
      shadow: { color: ELEC_G, blur: 14 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: -20, to: 0, easing: "easeOut" },
    },
    {
      id: "step-hash",
      type: "text",
      start: 8.3, end: 10.2, layer: 5,
      text: "⟶ HASH PASSWORD",
      x: SL + PAD, y: L2Y + 38, maxWidth: 260,
      fontSize: 18, fontWeight: 700, color: ELEC,
      shadow: { color: ELEC_G, blur: 14 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: -20, to: 0, easing: "easeOut" },
    },
    {
      id: "step-store",
      type: "text",
      start: 8.8, end: 10.2, layer: 5,
      text: "⟶ INSERT INTO users",
      x: SL + PAD, y: L3Y + 38, maxWidth: 280,
      fontSize: 18, fontWeight: 700, color: ELEC,
      shadow: { color: ELEC_G, blur: 14 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: -20, to: 0, easing: "easeOut" },
    },

    // DB burst — purple
    {
      id: "db-burst",
      type: "particle",
      start: 9.0, end: 10.5, layer: 3,
      count: 30, seed: 77,
      origin: { x: SL + SW / 2, y: R3Y + R3H / 2 },
      spread: { x: 80, y: 50 },
      drift: { x: 3, y: -18 },
      particleRadius: { min: 2, max: 5 },
      color: PURPLE_G,
      particleOpacity: { min: 0.3, max: 0.8 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── ACT 5: RESPONSE ───────────────────────────────────────────────────
    {
      id: "res-label",
      type: "text",
      start: 10.0, end: 12.5, layer: 5,
      text: "201 CREATED",
      x: GAP_CX - 120, y: R1Y - 65, maxWidth: 320,
      fontSize: 28, fontWeight: 700, color: ELEC,
      shadow: { color: ELEC_G, blur: 28 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    {
      id: "res-packet",
      type: "shape", shapeType: "circle",
      start: 10.3, end: 12.0, layer: 4,
      x: GAP_CX, y: R1Y, radius: 24,
      fill: ELEC,
      shadow: { color: ELEC_G, blur: 40 },
      path: {
        points: [
          { x: GAP_R, y: R1Y + R1H / 2 },
          { x: GAP_CX, y: R1Y - 50 },
          { x: GAP_L, y: R1Y + R1H / 2 },
        ],
        easing: "easeInOut",
      },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0.4, to: 1.3, easing: "easeInOut" },
    },

    // Ghost trail for response
    {
      id: "res-ghost-1",
      type: "shape", shapeType: "circle",
      start: 10.45, end: 12.0, layer: 3,
      x: GAP_CX, y: R1Y, radius: 18,
      fill: "rgb(0 200 255 / 0.4)",
      shadow: { color: ELEC_G, blur: 20 },
      path: {
        points: [
          { x: GAP_R, y: R1Y + R1H / 2 },
          { x: GAP_CX, y: R1Y - 50 },
          { x: GAP_L, y: R1Y + R1H / 2 },
        ],
        easing: "easeInOut",
      },
      opacity: { from: 0, to: 0.6, easing: "easeOut" },
    },

    // Response laser sweep
    {
      id: "res-laser",
      type: "shape", shapeType: "line",
      start: 10.8, end: 11.4, layer: 3,
      x1: GAP_R, y1: R1Y + R1H / 2,
      x2: GAP_L, y2: R1Y + R1H / 2,
      stroke: "rgb(0 200 255 / 0.5)", lineWidth: 3,
      opacity: {
        keyframes: [
          { time: 10.8, value: 0, easing: "easeOut" },
          { time: 11.0, value: 1, easing: "easeOut" },
          { time: 11.4, value: 0, easing: "easeIn" },
        ],
      },
    },

    // Response burst on client side
    {
      id: "res-burst",
      type: "particle",
      start: 11.8, end: 13.0, layer: 3,
      count: 40, seed: 99,
      origin: { x: GAP_L, y: R1Y + R1H / 2 },
      spread: { x: 60, y: 50 },
      drift: { x: -40, y: -30 },
      particleRadius: { min: 2, max: 7 },
      color: ELEC_G,
      particleOpacity: { min: 0.4, max: 0.9 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── OUTRO ─────────────────────────────────────────────────────────────
    {
      id: "closing",
      type: "text",
      start: 12.5, end: DUR, layer: 5,
      text: "CONNECTED.",
      x: W / 2 - 200, y: 800, maxWidth: 500,
      fontSize: 72, fontWeight: 900, color: PURPLE,
      shadow: { color: PURPLE_G, blur: 60 },
      opacity: {
        keyframes: [
          { time: 12.5, value: 0, easing: "easeOut" },
          { time: 13.2, value: 1, easing: "easeOut" },
          { time: 14.3, value: 1, easing: "easeInOut" },
          { time: DUR, value: 0, easing: "easeIn" },
        ],
      },
      scale: { from: 0.8, to: 1, easing: "easeOut" },
    },

    {
      id: "celebration",
      type: "particle",
      start: 12.6, end: DUR, layer: 3,
      count: 50, seed: 123,
      origin: { x: W / 2, y: 800 },
      spread: { x: 500, y: 120 },
      drift: { x: 5, y: -20 },
      particleRadius: { min: 2, max: 6 },
      color: "rgb(180 0 255 / 0.6)",
      particleOpacity: { min: 0.2, max: 0.7 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
  ],
};
