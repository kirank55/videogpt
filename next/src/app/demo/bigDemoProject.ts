import type { VideoProject } from "@/lib/renderer";

/**
 * Client–Server Architecture — Rebuilt v3
 * 15 seconds · 1920×1080 · stress-tests all 8 renderer capabilities
 *
 * Fixes from v2:
 *   ✓ Vertically centered layout (stacks at Y:270–690, not crammed at top)
 *   ✓ Brighter rect fills with visible contrast
 *   ✓ Larger text (labels 30–34px, body 24px)
 *   ✓ Coherent request/response — no conflicting diagonal lines
 *   ✓ Visible particles (larger radius, higher opacity)
 */

// ── Canvas ───────────────────────────────────────────────────────────────────
const W = 1920;
const H = 1080;
const DUR = 15;

// ── Stack layout ─────────────────────────────────────────────────────────────
const CL = 100;                      // client stack left edge
const SW = 500;                      // stack width
const SL = W - CL - SW;             // server stack left edge = 1320
const GAP_L = CL + SW;              // gap left = 600
const GAP_R = SL;                    // gap right = 1320
const GAP_CX = (GAP_L + GAP_R) / 2; // gap center X = 960
const PAD = 44;                      // text padding inside rects

// ── Row layout (vertically centered) ─────────────────────────────────────────
const HEADER_Y = 240;
const R1Y = 270;
const R1H = 140;
const RG = 20;                       // gap between rows
const R2Y = R1Y + R1H + RG;         // 430
const R2H = 120;
const R3Y = R2Y + R2H + RG;         // 570
const R3H = 120;
const STACK_BOTTOM = R3Y + R3H;     // 690

// ── Label Y positions (vertically centered in each rect) ─────────────────────
const L1_FS = 32;  // row 1 font size
const L2_FS = 26;  // row 2/3 font size
const L1Y = R1Y + (R1H - L1_FS) / 2;   // 324
const L2Y = R2Y + (R2H - L2_FS) / 2;   // 477
const L3Y = R3Y + (R3H - L2_FS) / 2;   // 617

// ── Request/response anchors (from/to the correct layers) ────────────────────
const REQ_START_Y = R1Y + R1H / 2;     // 340 — Browser layer center (client)
const REQ_END_Y = R1Y + R1H / 2;       // 340 — API layer center (server)
const RES_START_Y = R1Y + R1H / 2;     // 340 — API layer center (server)
const RES_END_Y = R1Y + R1H / 2;       // 340 — Browser layer center (client)

// ── Colors ───────────────────────────────────────────────────────────────────
const BLUE = "rgb(96 165 250)";
const BLUE_DIM = "rgb(96 165 250 / 0.45)";
const BLUE_GLOW = "rgb(96 165 250 / 0.7)";
const GREEN = "rgb(52 211 153)";
const GREEN_DIM = "rgb(52 211 153 / 0.4)";
const GREEN_GLOW = "rgb(52 211 153 / 0.7)";
const AMBER = "rgb(251 191 36)";
const WHITE = "#f1f5f9";
const MUTED = "rgb(178 190 205 / 0.95)";
const MUTED_DIM = "rgb(160 175 195 / 0.8)";

export const bigDemoProject: VideoProject = {
  id: "big-demo-client-server-v3",
  name: "Client–Server Architecture",
  width: W,
  height: H,
  duration: DUR,
  events: [

    // ══════════════════════════════════════════════════════════════════════════
    // BACKGROUND
    // ══════════════════════════════════════════════════════════════════════════
    {
      id: "bg",
      type: "background",
      start: 0, end: DUR, layer: 0,
      background: { kind: "gradient", from: "#020617", to: "#0f172a", angle: 160 },
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ACT 1: COLD OPEN (0–3s)
    // ══════════════════════════════════════════════════════════════════════════

    // Ambient particles — visible, slow drift
    {
      id: "ambient-particles",
      type: "particle",
      start: 0.2, end: DUR, layer: 1,
      count: 40,
      seed: 42,
      origin: { x: W / 2, y: H / 2 },
      spread: { x: W / 2 - 80, y: H / 2 - 80 },
      drift: { x: 6, y: -2 },
      particleRadius: { min: 2, max: 6 },
      color: "rgb(96 165 250 / 0.6)",
      particleOpacity: { min: 0.25, max: 0.65 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Title — fades in, holds, fades out BEFORE stacks arrive
    {
      id: "title",
      type: "text",
      start: 0.0, end: 2.8, layer: 5,
      text: "How the Web Works",
      x: 320, y: 420, maxWidth: 1300,
      fontSize: 96, fontWeight: 800, color: WHITE,
      shadow: { color: "rgb(96 165 250 / 0.8)", blur: 50 },
      opacity: {
        keyframes: [
          { time: 0.0, value: 0, easing: "easeOut" },
          { time: 0.6, value: 1, easing: "easeOut" },
          { time: 1.8, value: 1, easing: "easeInOut" },
          { time: 2.8, value: 0, easing: "easeIn" },
        ],
      },
      translateY: { from: 40, to: 0, easing: "easeOut" },
    },

    // Subtitle — words appear one by one
    {
      id: "sub-client",
      type: "text",
      start: 0.5, end: 2.8, layer: 5,
      text: "Client",
      x: 545, y: 570, maxWidth: 200,
      fontSize: 36, fontWeight: 400, color: MUTED,
      opacity: {
        keyframes: [
          { time: 0.5, value: 0, easing: "easeOut" },
          { time: 0.8, value: 1, easing: "easeOut" },
          { time: 1.8, value: 1, easing: "easeInOut" },
          { time: 2.8, value: 0, easing: "easeIn" },
        ],
      },
      translateY: { from: 12, to: 0, easing: "easeOut" },
    },
    {
      id: "sub-arrow-1",
      type: "text",
      start: 0.8, end: 2.8, layer: 5,
      text: "→",
      x: 665, y: 570, maxWidth: 60,
      fontSize: 36, fontWeight: 400, color: MUTED,
      opacity: {
        keyframes: [
          { time: 0.8, value: 0, easing: "easeOut" },
          { time: 1.0, value: 1, easing: "easeOut" },
          { time: 1.8, value: 1, easing: "easeInOut" },
          { time: 2.8, value: 0, easing: "easeIn" },
        ],
      },
      translateX: { from: -10, to: 0, easing: "easeOut" },
    },
    {
      id: "sub-server",
      type: "text",
      start: 1.0, end: 2.8, layer: 5,
      text: "Server",
      x: 720, y: 570, maxWidth: 200,
      fontSize: 36, fontWeight: 400, color: MUTED,
      opacity: {
        keyframes: [
          { time: 1.0, value: 0, easing: "easeOut" },
          { time: 1.2, value: 1, easing: "easeOut" },
          { time: 1.8, value: 1, easing: "easeInOut" },
          { time: 2.8, value: 0, easing: "easeIn" },
        ],
      },
      translateY: { from: 12, to: 0, easing: "easeOut" },
    },
    {
      id: "sub-arrow-2",
      type: "text",
      start: 1.2, end: 2.8, layer: 5,
      text: "→",
      x: 840, y: 570, maxWidth: 60,
      fontSize: 36, fontWeight: 400, color: MUTED,
      opacity: {
        keyframes: [
          { time: 1.2, value: 0, easing: "easeOut" },
          { time: 1.4, value: 1, easing: "easeOut" },
          { time: 1.8, value: 1, easing: "easeInOut" },
          { time: 2.8, value: 0, easing: "easeIn" },
        ],
      },
      translateX: { from: -10, to: 0, easing: "easeOut" },
    },
    {
      id: "sub-response",
      type: "text",
      start: 1.4, end: 2.8, layer: 5,
      text: "Response",
      x: 895, y: 570, maxWidth: 250,
      fontSize: 36, fontWeight: 400, color: MUTED,
      opacity: {
        keyframes: [
          { time: 1.4, value: 0, easing: "easeOut" },
          { time: 1.6, value: 1, easing: "easeOut" },
          { time: 1.8, value: 1, easing: "easeInOut" },
          { time: 2.8, value: 0, easing: "easeIn" },
        ],
      },
      translateY: { from: 12, to: 0, easing: "easeOut" },
    },

    // Decorative dashed baseline with arrowheads
    {
      id: "deco-line",
      type: "shape", shapeType: "line",
      start: 0.3, end: 14.5, layer: 1,
      x1: 100, y1: 750, x2: 1820, y2: 750,
      stroke: BLUE_DIM, lineWidth: 2,
      lineDash: [14, 10],
      arrowStart: true, arrowEnd: true, arrowSize: 10,
      opacity: { from: 0, to: 0.7, easing: "easeOut" },
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ACT 2: THE STACKS (2–5s)
    // ══════════════════════════════════════════════════════════════════════════

    // ── CLIENT STACK ──────────────────────────────────────────────────────────

    // Client header with glow
    {
      id: "client-header",
      type: "text",
      start: 2.8, end: 14.5, layer: 5,
      text: "CLIENT",
      x: CL + PAD, y: HEADER_Y, maxWidth: 300,
      fontSize: 18, fontWeight: 700, color: BLUE,
      shadow: { color: BLUE_GLOW, blur: 15 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Browser rect — bright gradient fill + visible stroke + keyframed pulse
    {
      id: "browser-rect",
      type: "shape", shapeType: "rect",
      start: 2.9, end: 14.5, layer: 2,
      x: CL, y: R1Y, width: SW, height: R1H, radius: 16,
      fill: { kind: "gradient", from: "rgb(38 52 78 / 0.95)", to: "rgb(25 38 60 / 0.9)", angle: 180 },
      stroke: "rgb(96 165 250 / 0.5)", strokeWidth: 1.5,
      opacity: {
        keyframes: [
          { time: 2.9, value: 0, easing: "easeOut" },
          { time: 3.5, value: 1, easing: "easeOut" },
          { time: 3.9, value: 0.7, easing: "easeInOut" },
          { time: 4.3, value: 1, easing: "easeOut" },
        ],
      },
      translateY: { from: 40, to: 0, easing: "easeOut" },
    },
    {
      id: "browser-label",
      type: "text",
      start: 3.0, end: 14.5, layer: 4,
      text: "Browser",
      x: CL + PAD, y: L1Y, maxWidth: SW - PAD * 2,
      fontSize: L1_FS, fontWeight: 600, color: "#e2e8f0",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 24, to: 0, easing: "easeOut" },
    },

    // HTTP Layer rect + label
    {
      id: "http-rect",
      type: "shape", shapeType: "rect",
      start: 3.2, end: 14.5, layer: 2,
      x: CL, y: R2Y, width: SW, height: R2H, radius: 14,
      fill: { kind: "gradient", from: "rgb(32 45 70 / 0.9)", to: "rgb(22 32 55 / 0.85)", angle: 180 },
      stroke: "rgb(96 165 250 / 0.3)", strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeInOut" },
      translateY: { from: 40, to: 0, easing: "easeInOut" },
    },
    {
      id: "http-label",
      type: "text",
      start: 3.3, end: 14.5, layer: 4,
      text: "HTTP Layer",
      x: CL + PAD, y: L2Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 600, color: "rgb(210 220 235 / 0.95)",
      opacity: { from: 0, to: 1, easing: "easeInOut" },
    },

    // Network rect + label
    {
      id: "network-rect",
      type: "shape", shapeType: "rect",
      start: 3.4, end: 14.5, layer: 2,
      x: CL, y: R3Y, width: SW, height: R3H, radius: 14,
      fill: { kind: "gradient", from: "rgb(28 40 62 / 0.8)", to: "rgb(18 28 48 / 0.75)", angle: 180 },
      stroke: "rgb(96 165 250 / 0.2)", strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 40, to: 0, easing: "easeOut" },
    },
    {
      id: "network-label",
      type: "text",
      start: 3.5, end: 14.5, layer: 4,
      text: "Network",
      x: CL + PAD, y: L3Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 600, color: MUTED_DIM,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Client vertical connectors — dashed with arrowheads
    {
      id: "client-conn-1",
      type: "shape", shapeType: "line",
      start: 3.8, end: 14.5, layer: 1,
      x1: CL + SW / 2, y1: R1Y + R1H,
      x2: CL + SW / 2, y2: R2Y,
      stroke: "rgb(96 165 250 / 0.4)", lineWidth: 2,
      lineDash: [6, 5],
      arrowEnd: true, arrowSize: 8,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "client-conn-2",
      type: "shape", shapeType: "line",
      start: 3.9, end: 14.5, layer: 1,
      x1: CL + SW / 2, y1: R2Y + R2H,
      x2: CL + SW / 2, y2: R3Y,
      stroke: "rgb(96 165 250 / 0.3)", lineWidth: 2,
      lineDash: [6, 5],
      arrowEnd: true, arrowSize: 8,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── SERVER STACK ──────────────────────────────────────────────────────────

    // Server header with glow
    {
      id: "server-header",
      type: "text",
      start: 3.1, end: 14.5, layer: 5,
      text: "SERVER",
      x: SL + PAD, y: HEADER_Y, maxWidth: 300,
      fontSize: 18, fontWeight: 700, color: GREEN,
      shadow: { color: GREEN_GLOW, blur: 15 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // REST API rect — bright gradient fill + stroke + keyframed pulse
    {
      id: "api-rect",
      type: "shape", shapeType: "rect",
      start: 3.2, end: 14.5, layer: 2,
      x: SL, y: R1Y, width: SW, height: R1H, radius: 16,
      fill: { kind: "gradient", from: "rgb(38 52 78 / 0.95)", to: "rgb(25 38 60 / 0.9)", angle: 180 },
      stroke: "rgb(52 211 153 / 0.5)", strokeWidth: 1.5,
      opacity: {
        keyframes: [
          { time: 3.2, value: 0, easing: "easeOut" },
          { time: 3.8, value: 1, easing: "easeOut" },
          { time: 4.2, value: 0.7, easing: "easeInOut" },
          { time: 4.6, value: 1, easing: "easeOut" },
        ],
      },
      translateY: { from: 40, to: 0, easing: "easeOut" },
    },
    {
      id: "api-label",
      type: "text",
      start: 3.3, end: 14.5, layer: 4,
      text: "REST API",
      x: SL + PAD, y: L1Y, maxWidth: SW - PAD * 2,
      fontSize: L1_FS, fontWeight: 600, color: "#e2e8f0",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 24, to: 0, easing: "easeOut" },
    },

    // Business Logic rect + label
    {
      id: "logic-rect",
      type: "shape", shapeType: "rect",
      start: 3.4, end: 14.5, layer: 2,
      x: SL, y: R2Y, width: SW, height: R2H, radius: 14,
      fill: { kind: "gradient", from: "rgb(32 45 70 / 0.9)", to: "rgb(22 32 55 / 0.85)", angle: 180 },
      stroke: "rgb(52 211 153 / 0.3)", strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeInOut" },
      translateY: { from: 40, to: 0, easing: "easeInOut" },
    },
    {
      id: "logic-label",
      type: "text",
      start: 3.5, end: 14.5, layer: 4,
      text: "Business Logic",
      x: SL + PAD, y: L2Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 600, color: "rgb(210 220 235 / 0.95)",
      opacity: { from: 0, to: 1, easing: "easeInOut" },
    },

    // PostgreSQL rect + label
    {
      id: "db-rect",
      type: "shape", shapeType: "rect",
      start: 3.6, end: 14.5, layer: 2,
      x: SL, y: R3Y, width: SW, height: R3H, radius: 14,
      fill: { kind: "gradient", from: "rgb(28 40 62 / 0.8)", to: "rgb(18 28 48 / 0.75)", angle: 180 },
      stroke: "rgb(52 211 153 / 0.2)", strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 40, to: 0, easing: "easeOut" },
    },
    {
      id: "db-label",
      type: "text",
      start: 3.7, end: 14.5, layer: 4,
      text: "PostgreSQL",
      x: SL + PAD, y: L3Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 600, color: MUTED_DIM,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Server vertical connectors — dashed with arrowheads
    {
      id: "server-conn-1",
      type: "shape", shapeType: "line",
      start: 4.0, end: 14.5, layer: 1,
      x1: SL + SW / 2, y1: R1Y + R1H,
      x2: SL + SW / 2, y2: R2Y,
      stroke: "rgb(52 211 153 / 0.4)", lineWidth: 2,
      lineDash: [6, 5],
      arrowEnd: true, arrowSize: 8,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "server-conn-2",
      type: "shape", shapeType: "line",
      start: 4.1, end: 14.5, layer: 1,
      x1: SL + SW / 2, y1: R2Y + R2H,
      x2: SL + SW / 2, y2: R3Y,
      stroke: "rgb(52 211 153 / 0.3)", lineWidth: 2,
      lineDash: [6, 5],
      arrowEnd: true, arrowSize: 8,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ACT 3: THE REQUEST (4.5–8s)
    // ══════════════════════════════════════════════════════════════════════════

    // "POST /api/users" label with glow — centered above the gap
    {
      id: "req-label",
      type: "text",
      start: 4.5, end: 7.5, layer: 5,
      text: "POST /api/users",
      x: GAP_CX - 150, y: R1Y - 60, maxWidth: 450,
      fontSize: 30, fontWeight: 700, color: BLUE,
      shadow: { color: BLUE_GLOW, blur: 25 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: -15, to: 0, easing: "easeOut" },
    },

    // Request packet — arcs from client Browser → above stacks → server API
    {
      id: "req-packet",
      type: "shape", shapeType: "circle",
      start: 5.0, end: 7.2, layer: 3,
      x: GAP_CX, y: R1Y, radius: 22,
      fill: "rgb(96 165 250 / 0.95)",
      shadow: { color: "rgb(96 165 250 / 0.9)", blur: 24 },
      path: {
        points: [
          { x: GAP_L, y: REQ_START_Y },           // client Browser center
          { x: GAP_CX, y: R1Y - 40 },             // arc UP above stacks
          { x: GAP_R, y: REQ_END_Y },              // server API center
        ],
        easing: "easeInOut",
      },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0.5, to: 1.2, easing: "easeInOut" },
    },

    // Request body text — in the gap, vertically centered
    {
      id: "req-body",
      type: "text",
      start: 5.5, end: 7.2, layer: 4,
      text: "{ name, email, password }",
      x: GAP_CX - 140, y: R2Y + 15, maxWidth: 420,
      fontSize: 24, fontWeight: 500, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeInOut" },
    },

    // Particle burst at launch point (blue, visible)
    {
      id: "req-burst",
      type: "particle",
      start: 5.0, end: 6.8, layer: 3,
      count: 25,
      seed: 101,
      origin: { x: GAP_L, y: REQ_START_Y },
      spread: { x: 40, y: 35 },
      drift: { x: 50, y: -20 },
      particleRadius: { min: 2, max: 5 },
      color: "rgb(96 165 250 / 0.8)",
      particleOpacity: { min: 0.4, max: 0.85 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ACT 4: SERVER PROCESSING (7.5–10.5s)
    // ══════════════════════════════════════════════════════════════════════════

    // Processing glow rect — keyframed scale pulse
    {
      id: "processing-glow",
      type: "shape", shapeType: "rect",
      start: 7.5, end: 10.5, layer: 1,
      x: SL - 8, y: R1Y - 8,
      width: SW + 16,
      height: R1H + R2H + R3H + RG * 2 + 16,
      radius: 22,
      fill: "rgb(52 211 153 / 0.08)",
      shadow: { color: "rgb(52 211 153 / 0.5)", blur: 30 },
      opacity: { from: 0, to: 1, easing: "easeIn" },
      scale: {
        keyframes: [
          { time: 7.5, value: 0.97, easing: "easeOut" },
          { time: 8.3, value: 1.03, easing: "easeInOut" },
          { time: 9.2, value: 0.99, easing: "easeInOut" },
          { time: 10.0, value: 1.02, easing: "easeInOut" },
          { time: 10.5, value: 1.0, easing: "easeOut" },
        ],
      },
    },

    // Step: Validate — arrow slides in from left, then text appears
    {
      id: "step-validate-arrow",
      type: "text",
      start: 7.8, end: 10.2, layer: 5,
      text: "→",
      x: SL + SW - 180, y: L1Y, maxWidth: 30,
      fontSize: 22, fontWeight: 600, color: GREEN,
      shadow: { color: GREEN_GLOW, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: -24, to: 0, easing: "easeOut" },
    },
    {
      id: "step-validate-text",
      type: "text",
      start: 8.1, end: 10.2, layer: 5,
      text: "Validate",
      x: SL + SW - 150, y: L1Y, maxWidth: 130,
      fontSize: 22, fontWeight: 600, color: GREEN,
      shadow: { color: GREEN_GLOW, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Step: Hash Password — arrow slides in from left, then text appears
    {
      id: "step-hash-arrow",
      type: "text",
      start: 8.3, end: 10.2, layer: 5,
      text: "→",
      x: SL + SW - 220, y: L2Y, maxWidth: 30,
      fontSize: 22, fontWeight: 600, color: GREEN,
      shadow: { color: GREEN_GLOW, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: -24, to: 0, easing: "easeOut" },
    },
    {
      id: "step-hash-text",
      type: "text",
      start: 8.6, end: 10.2, layer: 5,
      text: "Hash Password",
      x: SL + SW - 190, y: L2Y, maxWidth: 170,
      fontSize: 22, fontWeight: 600, color: GREEN,
      shadow: { color: GREEN_GLOW, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Step: INSERT INTO users — arrow slides in from left, then text appears
    {
      id: "step-store-arrow",
      type: "text",
      start: 8.8, end: 10.2, layer: 5,
      text: "→",
      x: SL + SW - 255, y: L3Y, maxWidth: 30,
      fontSize: 22, fontWeight: 600, color: GREEN,
      shadow: { color: GREEN_GLOW, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: -24, to: 0, easing: "easeOut" },
    },
    {
      id: "step-store-text",
      type: "text",
      start: 9.1, end: 10.2, layer: 5,
      text: "INSERT INTO users",
      x: SL + SW - 225, y: L3Y, maxWidth: 205,
      fontSize: 22, fontWeight: 600, color: GREEN,
      shadow: { color: GREEN_GLOW, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Particle burst on DB write (amber, visible)
    {
      id: "db-burst",
      type: "particle",
      start: 9.0, end: 10.5, layer: 3,
      count: 20,
      seed: 202,
      origin: { x: SL + SW / 2, y: R3Y + R3H / 2 },
      spread: { x: 70, y: 40 },
      drift: { x: 5, y: -15 },
      particleRadius: { min: 2, max: 5 },
      color: "rgb(251 191 36 / 0.7)",
      particleOpacity: { min: 0.3, max: 0.8 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ACT 5: THE RESPONSE + OUTRO (10–15s)
    // ══════════════════════════════════════════════════════════════════════════

    // "201 Created" label — in the gap, between stacks
    {
      id: "res-label",
      type: "text",
      start: 10.0, end: 12.5, layer: 5,
      text: "201 Created",
      x: GAP_CX - 110, y: R3Y + 15, maxWidth: 400,
      fontSize: 30, fontWeight: 700, color: GREEN,
      shadow: { color: GREEN_GLOW, blur: 25 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 15, to: 0, easing: "easeOut" },
    },

    // Response packet — arcs from server API → above stacks → client Browser
    {
      id: "res-packet",
      type: "shape", shapeType: "circle",
      start: 10.3, end: 12.0, layer: 3,
      x: GAP_CX, y: R1Y, radius: 22,
      fill: "rgb(52 211 153 / 0.95)",
      shadow: { color: "rgb(52 211 153 / 0.9)", blur: 24 },
      path: {
        points: [
          { x: GAP_R, y: RES_START_Y },             // server API center
          { x: GAP_CX, y: R1Y - 40 },               // arc UP above stacks
          { x: GAP_L, y: RES_END_Y },               // client Browser center
        ],
        easing: "easeInOut",
      },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0.5, to: 1.2, easing: "easeInOut" },
    },

    // Response body text
    {
      id: "res-body",
      type: "text",
      start: 10.8, end: 12.2, layer: 4,
      text: "ok",
      x: GAP_CX - 30, y: R1Y - 60, maxWidth: 200,
      fontSize: 24, fontWeight: 500, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeInOut" },
    },

    // Round-trip overlay — gradient rect with stroke
    {
      id: "roundtrip-overlay",
      type: "shape", shapeType: "rect",
      start: 12.0, end: 13.8, layer: 3,
      x: 70, y: HEADER_Y - 10,
      width: W - 140,
      height: STACK_BOTTOM - HEADER_Y + 50,
      radius: 24,
      fill: { kind: "gradient", from: "rgb(10 18 35 / 0.7)", to: "rgb(10 18 35 / 0.5)", angle: 90 },
      stroke: "rgb(148 163 184 / 0.25)", strokeWidth: 1,
      opacity: { from: 0, to: 0.9, easing: "easeInOut" },
    },

    // Round-trip summary labels
    {
      id: "rt-req-label",
      type: "text",
      start: 12.3, end: 13.8, layer: 5,
      text: "Request  →",
      x: GAP_CX - 70, y: R1Y + 30, maxWidth: 300,
      fontSize: 26, fontWeight: 600, color: "rgb(96 165 250 / 0.95)",
      shadow: { color: BLUE_GLOW, blur: 10 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: -10, to: 0, easing: "easeOut" },
    },
    {
      id: "rt-latency",
      type: "text",
      start: 12.5, end: 13.8, layer: 5,
      text: "~200ms round trip",
      x: GAP_CX - 70, y: R2Y + 15, maxWidth: 300,
      fontSize: 22, fontWeight: 500, color: "rgb(251 191 36 / 0.95)",
      shadow: { color: "rgb(251 191 36 / 0.5)", blur: 14 },
      opacity: { from: 0, to: 1, easing: "easeInOut" },
    },
    {
      id: "rt-res-label",
      type: "text",
      start: 12.7, end: 13.8, layer: 5,
      text: "←  Response",
      x: GAP_CX - 70, y: R3Y, maxWidth: 300,
      fontSize: 26, fontWeight: 600, color: "rgb(52 211 153 / 0.95)",
      shadow: { color: GREEN_GLOW, blur: 10 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 10, to: 0, easing: "easeOut" },
    },

    // Closing line — big text with strong glow
    {
      id: "closing-line",
      type: "text",
      start: 13.0, end: DUR, layer: 5,
      text: "Every click. Every scroll. Every tap.",
      x: 570, y: 800, maxWidth: 1000,
      fontSize: 48, fontWeight: 700, color: WHITE,
      shadow: { color: "rgb(96 165 250 / 0.6)", blur: 40 },
      opacity: {
        keyframes: [
          { time: 13.0, value: 0, easing: "easeOut" },
          { time: 13.6, value: 1, easing: "easeOut" },
          { time: 14.5, value: 1, easing: "easeInOut" },
          { time: DUR, value: 0, easing: "easeIn" },
        ],
      },
      translateY: { from: 20, to: 0, easing: "easeOut" },
    },

    // Accent triangles — stroke + gradient
    {
      id: "accent-left",
      type: "shape", shapeType: "triangle",
      start: 13.5, end: DUR, layer: 1,
      x: 80, y: 890, width: 120, height: 100,
      fill: { kind: "gradient", from: "rgb(59 130 246 / 0.5)", to: "rgb(96 165 250 / 0.15)", angle: 135 },
      stroke: "rgb(96 165 250 / 0.5)", strokeWidth: 2,
      opacity: {
        keyframes: [
          { time: 13.5, value: 0, easing: "easeOut" },
          { time: 14.0, value: 0.9, easing: "easeOut" },
          { time: 14.5, value: 0.9, easing: "easeInOut" },
          { time: DUR, value: 0, easing: "easeIn" },
        ],
      },
      rotate: { from: -15, to: 0, easing: "easeOut" },
    },
    {
      id: "accent-right",
      type: "shape", shapeType: "triangle",
      start: 13.6, end: DUR, layer: 1,
      x: W - 200, y: 890, width: 120, height: 100,
      fill: { kind: "gradient", from: "rgb(52 211 153 / 0.5)", to: "rgb(52 211 153 / 0.15)", angle: 45 },
      stroke: "rgb(52 211 153 / 0.5)", strokeWidth: 2,
      opacity: {
        keyframes: [
          { time: 13.6, value: 0, easing: "easeOut" },
          { time: 14.1, value: 0.9, easing: "easeOut" },
          { time: 14.5, value: 0.9, easing: "easeInOut" },
          { time: DUR, value: 0, easing: "easeIn" },
        ],
      },
      rotate: { from: 15, to: 0, easing: "easeOut" },
    },

    // Final celebration particles (gold, wide, visible)
    {
      id: "celebration-burst",
      type: "particle",
      start: 13.2, end: DUR, layer: 3,
      count: 35,
      seed: 303,
      origin: { x: W / 2, y: 820 },
      spread: { x: 450, y: 100 },
      drift: { x: 3, y: -15 },
      particleRadius: { min: 2.5, max: 6 },
      color: "rgb(251 191 36 / 0.6)",
      particleOpacity: { min: 0.3, max: 0.7 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
  ],
};
