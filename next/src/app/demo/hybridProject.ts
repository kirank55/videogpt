import type { VideoProject } from "@/lib/renderer";

/**
 * Hybrid Project
 * - Title/subtitle      → isometricProject
 * - Stack visuals       → brutalistProject (sharp corners, flat fills, white/gray/red)
 * - Stack animation     → blueprintProject (easeOut fade-in, staggered)
 * - Request/response    → bigDemoProject   (arc packets, processing glow, particles)
 * 15 seconds · 1920×1080
 */

// ── Canvas ────────────────────────────────────────────────────────────────────
const W = 1920;
const H = 1080;
const DUR = 15;

// ── Stack layout (matches bigDemo / brutalist) ────────────────────────────────
const CL = 100;
const SW = 500;
const SL = W - CL - SW;           // 1320
const GAP_L = CL + SW;            // 600
const GAP_R = SL;                  // 1320
const GAP_CX = (GAP_L + GAP_R) / 2; // 960
const PAD = 44;

const HEADER_Y = 240;
const R1Y = 270;
const R1H = 140;
const RG  = 20;
const R2Y = R1Y + R1H + RG;       // 430
const R2H = 120;
const R3Y = R2Y + R2H + RG;       // 570
const R3H = 120;
const STACK_BOTTOM = R3Y + R3H;   // 690

const L1_FS = 32;
const L2_FS = 26;
const L1Y = R1Y + (R1H - L1_FS) / 2;   // ~324
const L2Y = R2Y + (R2H - L2_FS) / 2;   // ~477
const L3Y = R3Y + (R3H - L2_FS) / 2;   // ~617

const REQ_Y = R1Y + R1H / 2;      // 340 — horizontal packet travel Y

// ── Colors ────────────────────────────────────────────────────────────────────

// Brutalist stack palette
const WHITE  = "#ffffff";
const GRAY1  = "#c0c0c0";
const GRAY2  = "#808080";
const GRAY3  = "#404040";
const RED    = "rgb(220 30 30)";

// Isometric title palette
const ISO_WHITE = "#f1f5f9";
const ISO_MUTED = "rgb(178 190 205 / 0.9)";

// BigDemo request/response palette
const BLUE      = "rgb(96 165 250)";
const BLUE_GLOW = "rgb(96 165 250 / 0.7)";
const BLUE_DIM  = "rgb(96 165 250 / 0.45)";
const GREEN      = "rgb(52 211 153)";
const GREEN_GLOW = "rgb(52 211 153 / 0.7)";
const MUTED      = "rgb(178 190 205 / 0.95)";

export const hybridProject: VideoProject = {
  id: "hybrid-iso-brutal-blueprint-bigdemo-v1",
  name: "Hybrid — Iso Title · Brutalist Stacks · BigDemo Flow",
  width: W,
  height: H,
  duration: DUR,
  events: [

    // ══════════════════════════════════════════════════════════════════════════
    // BACKGROUND — dark like bigDemo / isometric
    // ══════════════════════════════════════════════════════════════════════════
    {
      id: "bg",
      type: "background",
      start: 0, end: DUR, layer: 0,
      background: { kind: "gradient", from: "#010a15", to: "#061020", angle: 150 },
    },

    // Ambient particles (bigDemo style)
    {
      id: "ambient-particles",
      type: "particle",
      start: 0.2, end: DUR, layer: 1,
      count: 40, seed: 42,
      origin: { x: W / 2, y: H / 2 },
      spread: { x: W / 2 - 80, y: H / 2 - 80 },
      drift: { x: 6, y: -2 },
      particleRadius: { min: 2, max: 6 },
      color: "rgb(96 165 250 / 0.6)",
      particleOpacity: { min: 0.25, max: 0.65 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ACT 1: TITLE — from isometricProject
    // ══════════════════════════════════════════════════════════════════════════
    {
      id: "title",
      type: "text",
      start: 0, end: 2.5, layer: 5,
      text: "Layers of the Web",
      x: W / 2 - 400, y: 380, maxWidth: 850,
      fontSize: 88, fontWeight: 800, color: ISO_WHITE,
      shadow: { color: "rgb(96 165 250 / 0.7)", blur: 50 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 30, to: 0, easing: "easeOut" },
    },
    {
      id: "subtitle",
      type: "text",
      start: 0.5, end: 2.5, layer: 5,
      text: "A 3D view of client–server communication",
      x: W / 2 - 370, y: 498, maxWidth: 800,
      fontSize: 28, fontWeight: 400, color: ISO_MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Deco baseline (bigDemo)
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
    // ACT 2: STACKS — brutalist visuals + blueprint easeOut animation
    // ══════════════════════════════════════════════════════════════════════════

    // ── CLIENT HEADER (brutalist style) ──────────────────────────────────────
    {
      id: "client-header",
      type: "text",
      start: 2.5, end: 14.5, layer: 5,
      text: "CLIENT",
      x: CL, y: HEADER_Y - 10, maxWidth: 200,
      fontSize: 16, fontWeight: 900, color: WHITE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "client-header-line",
      type: "shape", shapeType: "line",
      start: 2.6, end: 14.5, layer: 1,
      x1: CL, y1: HEADER_Y + 14, x2: CL + SW, y2: HEADER_Y + 14,
      stroke: WHITE, lineWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Browser — brutalist flat fill + sharp corners, blueprint easeOut timing
    {
      id: "browser-rect",
      type: "shape", shapeType: "rect",
      start: 2.7, end: 14.5, layer: 2,
      x: CL, y: R1Y, width: SW, height: R1H, radius: 0,
      fill: "#111111",
      stroke: WHITE, strokeWidth: 2,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 40, to: 0, easing: "easeOut" },
    },
    {
      id: "browser-label",
      type: "text",
      start: 2.9, end: 14.5, layer: 4,
      text: "BROWSER",
      x: CL + PAD, y: L1Y, maxWidth: SW - PAD * 2,
      fontSize: L1_FS, fontWeight: 900, color: WHITE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // HTTP Layer
    {
      id: "http-rect",
      type: "shape", shapeType: "rect",
      start: 3.0, end: 14.5, layer: 2,
      x: CL, y: R2Y, width: SW, height: R2H, radius: 0,
      fill: "#0e0e0e",
      stroke: GRAY1, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 40, to: 0, easing: "easeOut" },
    },
    {
      id: "http-label",
      type: "text",
      start: 3.2, end: 14.5, layer: 4,
      text: "HTTP LAYER",
      x: CL + PAD, y: L2Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 700, color: GRAY1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Network
    {
      id: "network-rect",
      type: "shape", shapeType: "rect",
      start: 3.2, end: 14.5, layer: 2,
      x: CL, y: R3Y, width: SW, height: R3H, radius: 0,
      fill: "#0a0a0a",
      stroke: GRAY2, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 40, to: 0, easing: "easeOut" },
    },
    {
      id: "network-label",
      type: "text",
      start: 3.4, end: 14.5, layer: 4,
      text: "NETWORK",
      x: CL + PAD, y: L3Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 700, color: GRAY2,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Client connectors (blueprint style — dashed, arrowEnd)
    {
      id: "client-conn-1",
      type: "shape", shapeType: "line",
      start: 3.6, end: 14.5, layer: 1,
      x1: CL + SW / 2, y1: R1Y + R1H,
      x2: CL + SW / 2, y2: R2Y,
      stroke: GRAY3, lineWidth: 1,
      lineDash: [6, 5],
      arrowEnd: true, arrowSize: 7,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "client-conn-2",
      type: "shape", shapeType: "line",
      start: 3.7, end: 14.5, layer: 1,
      x1: CL + SW / 2, y1: R2Y + R2H,
      x2: CL + SW / 2, y2: R3Y,
      stroke: GRAY3, lineWidth: 1,
      lineDash: [6, 5],
      arrowEnd: true, arrowSize: 7,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── SERVER HEADER (brutalist style) ──────────────────────────────────────
    {
      id: "server-header",
      type: "text",
      start: 2.6, end: 14.5, layer: 5,
      text: "SERVER",
      x: SL, y: HEADER_Y - 10, maxWidth: 200,
      fontSize: 16, fontWeight: 900, color: WHITE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "server-header-line",
      type: "shape", shapeType: "line",
      start: 2.7, end: 14.5, layer: 1,
      x1: SL, y1: HEADER_Y + 14, x2: SL + SW, y2: HEADER_Y + 14,
      stroke: WHITE, lineWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // REST API
    {
      id: "api-rect",
      type: "shape", shapeType: "rect",
      start: 2.8, end: 14.5, layer: 2,
      x: SL, y: R1Y, width: SW, height: R1H, radius: 0,
      fill: "#111111",
      stroke: WHITE, strokeWidth: 2,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 40, to: 0, easing: "easeOut" },
    },
    {
      id: "api-label",
      type: "text",
      start: 3.0, end: 14.5, layer: 4,
      text: "REST API",
      x: SL + PAD, y: L1Y, maxWidth: SW - PAD * 2,
      fontSize: L1_FS, fontWeight: 900, color: WHITE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Business Logic
    {
      id: "logic-rect",
      type: "shape", shapeType: "rect",
      start: 3.1, end: 14.5, layer: 2,
      x: SL, y: R2Y, width: SW, height: R2H, radius: 0,
      fill: "#0e0e0e",
      stroke: GRAY1, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 40, to: 0, easing: "easeOut" },
    },
    {
      id: "logic-label",
      type: "text",
      start: 3.3, end: 14.5, layer: 4,
      text: "BUSINESS LOGIC",
      x: SL + PAD, y: L2Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 700, color: GRAY1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // PostgreSQL
    {
      id: "db-rect",
      type: "shape", shapeType: "rect",
      start: 3.3, end: 14.5, layer: 2,
      x: SL, y: R3Y, width: SW, height: R3H, radius: 0,
      fill: "#0a0a0a",
      stroke: GRAY2, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 40, to: 0, easing: "easeOut" },
    },
    {
      id: "db-label",
      type: "text",
      start: 3.5, end: 14.5, layer: 4,
      text: "POSTGRESQL",
      x: SL + PAD, y: L3Y, maxWidth: SW - PAD * 2,
      fontSize: L2_FS, fontWeight: 700, color: GRAY2,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Server connectors
    {
      id: "server-conn-1",
      type: "shape", shapeType: "line",
      start: 3.8, end: 14.5, layer: 1,
      x1: SL + SW / 2, y1: R1Y + R1H,
      x2: SL + SW / 2, y2: R2Y,
      stroke: GRAY3, lineWidth: 1,
      lineDash: [6, 5],
      arrowEnd: true, arrowSize: 7,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "server-conn-2",
      type: "shape", shapeType: "line",
      start: 3.9, end: 14.5, layer: 1,
      x1: SL + SW / 2, y1: R2Y + R2H,
      x2: SL + SW / 2, y2: R3Y,
      stroke: GRAY3, lineWidth: 1,
      lineDash: [6, 5],
      arrowEnd: true, arrowSize: 7,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Red gap divider (brutalist signature)
    {
      id: "gap-divider",
      type: "shape", shapeType: "line",
      start: 4.0, end: 14.5, layer: 1,
      x1: GAP_CX, y1: R1Y - 30,
      x2: GAP_CX, y2: R3Y + R3H + 30,
      stroke: RED, lineWidth: 1,
      lineDash: [6, 6],
      opacity: { from: 0, to: 0.5, easing: "easeOut" },
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ACT 3: REQUEST — from bigDemoProject (arcing packet)
    // ══════════════════════════════════════════════════════════════════════════
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

    // Request packet — arcs client Browser → server API
    {
      id: "req-packet",
      type: "shape", shapeType: "circle",
      start: 5.0, end: 7.2, layer: 3,
      x: GAP_CX, y: R1Y, radius: 22,
      fill: "rgb(96 165 250 / 0.95)",
      shadow: { color: "rgb(96 165 250 / 0.9)", blur: 24 },
      path: {
        points: [
          { x: GAP_L, y: REQ_Y },
          { x: GAP_CX, y: R1Y - 40 },
          { x: GAP_R, y: REQ_Y },
        ],
        easing: "easeInOut",
      },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0.5, to: 1.2, easing: "easeInOut" },
    },

    {
      id: "req-body",
      type: "text",
      start: 5.5, end: 7.2, layer: 4,
      text: "{ name, email, password }",
      x: GAP_CX - 140, y: R2Y + 15, maxWidth: 420,
      fontSize: 24, fontWeight: 500, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeInOut" },
    },

    // Particle burst at launch
    {
      id: "req-burst",
      type: "particle",
      start: 5.0, end: 6.8, layer: 3,
      count: 25, seed: 101,
      origin: { x: GAP_L, y: REQ_Y },
      spread: { x: 40, y: 35 },
      drift: { x: 50, y: -20 },
      particleRadius: { min: 2, max: 5 },
      color: "rgb(96 165 250 / 0.8)",
      particleOpacity: { min: 0.4, max: 0.85 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ACT 4: SERVER PROCESSING — from bigDemoProject
    // ══════════════════════════════════════════════════════════════════════════
    {
      id: "processing-glow",
      type: "shape", shapeType: "rect",
      start: 7.5, end: 10.5, layer: 1,
      x: SL - 8, y: R1Y - 8,
      width: SW + 16,
      height: R1H + R2H + R3H + RG * 2 + 16,
      radius: 0,
      fill: "rgb(52 211 153 / 0.08)",
      shadow: { color: "rgb(52 211 153 / 0.5)", blur: 30 },
      opacity: { from: 0, to: 1, easing: "easeIn" },
      scale: {
        keyframes: [
          { time: 7.5,  value: 0.97, easing: "easeOut" },
          { time: 8.3,  value: 1.03, easing: "easeInOut" },
          { time: 9.2,  value: 0.99, easing: "easeInOut" },
          { time: 10.0, value: 1.02, easing: "easeInOut" },
          { time: 10.5, value: 1.0,  easing: "easeOut" },
        ],
      },
    },

    // Step: Validate
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
      text: "VALIDATE",
      x: SL + SW - 150, y: L1Y, maxWidth: 140,
      fontSize: 20, fontWeight: 900, color: GREEN,
      shadow: { color: GREEN_GLOW, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Step: Hash Password
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
      text: "HASH PASSWORD",
      x: SL + SW - 190, y: L2Y, maxWidth: 185,
      fontSize: 20, fontWeight: 900, color: GREEN,
      shadow: { color: GREEN_GLOW, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Step: INSERT INTO users
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
      x: SL + SW - 225, y: L3Y, maxWidth: 210,
      fontSize: 20, fontWeight: 900, color: GREEN,
      shadow: { color: GREEN_GLOW, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // DB write particles (amber)
    {
      id: "db-burst",
      type: "particle",
      start: 9.0, end: 10.5, layer: 3,
      count: 20, seed: 202,
      origin: { x: SL + SW / 2, y: R3Y + R3H / 2 },
      spread: { x: 70, y: 40 },
      drift: { x: 5, y: -15 },
      particleRadius: { min: 2, max: 5 },
      color: "rgb(251 191 36 / 0.7)",
      particleOpacity: { min: 0.3, max: 0.8 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ACT 5: RESPONSE + OUTRO — from bigDemoProject
    // ══════════════════════════════════════════════════════════════════════════
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

    // Response packet — arcs server API → client Browser
    {
      id: "res-packet",
      type: "shape", shapeType: "circle",
      start: 10.3, end: 12.0, layer: 3,
      x: GAP_CX, y: R1Y, radius: 22,
      fill: "rgb(52 211 153 / 0.95)",
      shadow: { color: "rgb(52 211 153 / 0.9)", blur: 24 },
      path: {
        points: [
          { x: GAP_R, y: REQ_Y },
          { x: GAP_CX, y: R1Y - 40 },
          { x: GAP_L, y: REQ_Y },
        ],
        easing: "easeInOut",
      },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0.5, to: 1.2, easing: "easeInOut" },
    },

    // Round-trip overlay
    {
      id: "roundtrip-overlay",
      type: "shape", shapeType: "rect",
      start: 12.0, end: 13.8, layer: 3,
      x: 70, y: HEADER_Y - 10,
      width: W - 140,
      height: STACK_BOTTOM - HEADER_Y + 50,
      radius: 0,
      fill: { kind: "gradient", from: "rgb(10 18 35 / 0.7)", to: "rgb(10 18 35 / 0.5)", angle: 90 },
      stroke: "rgb(148 163 184 / 0.25)", strokeWidth: 1,
      opacity: { from: 0, to: 0.9, easing: "easeInOut" },
    },

    // Round-trip labels
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

    // Red separator (brutalist outro signature)
    {
      id: "outro-separator",
      type: "shape", shapeType: "line",
      start: 13.0, end: DUR, layer: 4,
      x1: 100, y1: 760, x2: W - 100, y2: 760,
      stroke: RED, lineWidth: 2,
      opacity: {
        keyframes: [
          { time: 13.0, value: 0, easing: "easeOut" },
          { time: 13.6, value: 1, easing: "easeOut" },
          { time: 14.5, value: 1, easing: "easeInOut" },
          { time: DUR,  value: 0, easing: "easeIn" },
        ],
      },
    },

    // Closing line
    {
      id: "closing-line",
      type: "text",
      start: 13.0, end: DUR, layer: 5,
      text: "Every click. Every scroll. Every tap.",
      x: 480, y: 790, maxWidth: 1000,
      fontSize: 48, fontWeight: 700, color: ISO_WHITE,
      shadow: { color: "rgb(96 165 250 / 0.6)", blur: 40 },
      opacity: {
        keyframes: [
          { time: 13.0, value: 0, easing: "easeOut" },
          { time: 13.6, value: 1, easing: "easeOut" },
          { time: 14.5, value: 1, easing: "easeInOut" },
          { time: DUR,  value: 0, easing: "easeIn" },
        ],
      },
      translateY: { from: 20, to: 0, easing: "easeOut" },
    },

    // Celebration particles
    {
      id: "celebration-burst",
      type: "particle",
      start: 13.2, end: DUR, layer: 3,
      count: 35, seed: 303,
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
