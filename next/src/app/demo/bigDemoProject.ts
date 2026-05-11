import type { VideoProject } from "@/lib/renderer";

/**
 * A dense, multi-act explainer of client–server architecture.
 * 10 seconds · 1920×1080 · ~42 events across 5 layers
 *
 * Acts:
 *   0–2.8s   Cold Open          – title + subtitle + decorative line
 *   1.5–3.2s The Stacks         – client layers (left) + server layers (right)
 *   3.2–5.5s The Request        – POST packet flies client → server
 *   5.0–5.8s Server Processing  – validate → hash → store
 *   5.8–7.8s The Response       – 201 packet flies server → client
 *   7.5–8.8s Full Picture       – overlay + round-trip summary
 *   8.3–10s  Outro              – closing line + corner accents
 */

// ── Layout constants ─────────────────────────────────────────────────────────
// Client stack: x=100, width=520  → spans 100–620
// Server stack: x=1300, width=520 → spans 1300–1820
// Center gap:   620–1300 = 680px (used for request/response paths)

const CL = 100;   // client stack left edge
const SW = 520;   // stack width
const SL = 1300;  // server stack left edge
const PAD = 40;   // text padding inside rects

// Rect heights
const R1H = 140;  // top rect height
const R2H = 115;  // middle rect height
const R3H = 115;  // bottom rect height
const RG = 20;    // gap between rects

// Rect y positions
const R1Y = 210;
const R2Y = R1Y + R1H + RG;  // 370
const R3Y = R2Y + R2H + RG;  // 505

// Label y (vertically centered): rect.y + (rect.height - fontSize) / 2
// fontSize=28 in R1: 210 + (140-28)/2 = 266
// fontSize=24 in R2: 370 + (115-24)/2 = 415.5 ≈ 416
// fontSize=24 in R3: 505 + (115-24)/2 = 550.5 ≈ 551

export const bigDemoProject: VideoProject = {
  id: "big-demo-client-server",
  name: "Client–Server Architecture",
  width: 1920,
  height: 1080,
  duration: 10,
  events: [

    // ── Background ────────────────────────────────────────────────────────────
    {
      id: "bg",
      type: "background",
      start: 0, end: 10, layer: 0,
      background: { kind: "gradient", from: "#020617", to: "#0f1d3a", angle: 160 },
    },

    // ── Decorative baseline (persists all scene) ──────────────────────────────
    {
      id: "deco-line",
      type: "shape", shapeType: "line",
      start: 0.2, end: 9.5, layer: 1,
      x1: 100, y1: 700, x2: 1820, y2: 700,
      stroke: "rgb(59 130 246 / 0.35)", lineWidth: 3,
      opacity: { from: 0, to: 0.8, easing: "linear" },
      translateX: { from: -120, to: 0, easing: "easeOut" },
    },

    // ── Act 1: Cold Open (0–2.8s) ────────────────────────────────────────────
    {
      id: "title",
      type: "text",
      start: 0.0, end: 2.8, layer: 4,
      text: "How the Web Works",
      x: 360, y: 380, maxWidth: 1200,
      fontSize: 88, fontWeight: 800, color: "#f1f5f9",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 30, to: 0, easing: "easeOut" },
    },
    {
      id: "subtitle",
      type: "text",
      start: 0.4, end: 2.8, layer: 4,
      text: "Client  →  Server  →  Response",
      x: 560, y: 490, maxWidth: 800,
      fontSize: 32, fontWeight: 400, color: "rgb(148 163 184 / 0.9)",
      opacity: { from: 0, to: 1, easing: "easeInOut" },
      translateY: { from: 16, to: 0, easing: "easeOut" },
    },

    // ── Act 2: The Stacks (1.5–3.2s) ─────────────────────────────────────────
    // CLIENT header
    {
      id: "client-header",
      type: "text",
      start: 1.5, end: 9.5, layer: 4,
      text: "CLIENT",
      x: CL + PAD, y: 170, maxWidth: 300,
      fontSize: 18, fontWeight: 700, color: "rgb(96 165 250 / 0.9)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Browser rect + label
    {
      id: "browser-rect",
      type: "shape", shapeType: "rect",
      start: 1.6, end: 9.5, layer: 2,
      x: CL, y: R1Y, width: SW, height: R1H, radius: 16,
      fill: "rgb(30 41 59 / 0.85)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 40, to: 0, easing: "easeOut" },
    },
    {
      id: "browser-label",
      type: "text",
      start: 1.7, end: 9.5, layer: 4,
      text: "Browser",
      x: CL + PAD, y: 266, maxWidth: SW - PAD * 2,
      fontSize: 28, fontWeight: 600, color: "#e2e8f0",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 24, to: 0, easing: "easeOut" },
    },

    // HTTP rect + label
    {
      id: "http-rect",
      type: "shape", shapeType: "rect",
      start: 1.9, end: 9.5, layer: 2,
      x: CL, y: R2Y, width: SW, height: R2H, radius: 14,
      fill: "rgb(30 41 59 / 0.65)",
      opacity: { from: 0, to: 1, easing: "easeInOut" },
      translateY: { from: 40, to: 0, easing: "easeInOut" },
    },
    {
      id: "http-label",
      type: "text",
      start: 2.0, end: 9.5, layer: 4,
      text: "HTTP Layer",
      x: CL + PAD, y: 416, maxWidth: SW - PAD * 2,
      fontSize: 24, fontWeight: 600, color: "rgb(203 213 225 / 0.9)",
      opacity: { from: 0, to: 1, easing: "easeInOut" },
    },

    // Network rect + label
    {
      id: "network-rect",
      type: "shape", shapeType: "rect",
      start: 2.1, end: 9.5, layer: 2,
      x: CL, y: R3Y, width: SW, height: R3H, radius: 14,
      fill: "rgb(30 41 59 / 0.45)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 40, to: 0, easing: "easeOut" },
    },
    {
      id: "network-label",
      type: "text",
      start: 2.2, end: 9.5, layer: 4,
      text: "Network",
      x: CL + PAD, y: 551, maxWidth: SW - PAD * 2,
      fontSize: 24, fontWeight: 600, color: "rgb(203 213 225 / 0.65)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Client vertical connector
    {
      id: "client-connector",
      type: "shape", shapeType: "line",
      start: 2.6, end: 9.5, layer: 1,
      x1: CL + SW / 2, y1: R1Y + R1H,
      x2: CL + SW / 2, y2: R2Y,
      stroke: "rgb(96 165 250 / 0.3)", lineWidth: 2,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "client-connector-2",
      type: "shape", shapeType: "line",
      start: 2.7, end: 9.5, layer: 1,
      x1: CL + SW / 2, y1: R2Y + R2H,
      x2: CL + SW / 2, y2: R3Y,
      stroke: "rgb(96 165 250 / 0.2)", lineWidth: 2,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // SERVER header
    {
      id: "server-header",
      type: "text",
      start: 1.8, end: 9.5, layer: 4,
      text: "SERVER",
      x: SL + PAD, y: 170, maxWidth: 300,
      fontSize: 18, fontWeight: 700, color: "rgb(52 211 153 / 0.9)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // REST API rect + label
    {
      id: "api-rect",
      type: "shape", shapeType: "rect",
      start: 1.9, end: 9.5, layer: 2,
      x: SL, y: R1Y, width: SW, height: R1H, radius: 16,
      fill: "rgb(30 41 59 / 0.85)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 40, to: 0, easing: "easeOut" },
    },
    {
      id: "api-label",
      type: "text",
      start: 2.0, end: 9.5, layer: 4,
      text: "REST API",
      x: SL + PAD, y: 266, maxWidth: SW - PAD * 2,
      fontSize: 28, fontWeight: 600, color: "#e2e8f0",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 24, to: 0, easing: "easeOut" },
    },

    // Business Logic rect + label
    {
      id: "logic-rect",
      type: "shape", shapeType: "rect",
      start: 2.1, end: 9.5, layer: 2,
      x: SL, y: R2Y, width: SW, height: R2H, radius: 14,
      fill: "rgb(30 41 59 / 0.65)",
      opacity: { from: 0, to: 1, easing: "easeInOut" },
      translateY: { from: 40, to: 0, easing: "easeInOut" },
    },
    {
      id: "logic-label",
      type: "text",
      start: 2.2, end: 9.5, layer: 4,
      text: "Business Logic",
      x: SL + PAD, y: 416, maxWidth: SW - PAD * 2,
      fontSize: 24, fontWeight: 600, color: "rgb(203 213 225 / 0.9)",
      opacity: { from: 0, to: 1, easing: "easeInOut" },
    },

    // PostgreSQL rect + label
    {
      id: "db-rect",
      type: "shape", shapeType: "rect",
      start: 2.3, end: 9.5, layer: 2,
      x: SL, y: R3Y, width: SW, height: R3H, radius: 14,
      fill: "rgb(30 41 59 / 0.45)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 40, to: 0, easing: "easeOut" },
    },
    {
      id: "db-label",
      type: "text",
      start: 2.4, end: 9.5, layer: 4,
      text: "PostgreSQL",
      x: SL + PAD, y: 551, maxWidth: SW - PAD * 2,
      fontSize: 24, fontWeight: 600, color: "rgb(203 213 225 / 0.65)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Server vertical connectors
    {
      id: "server-connector",
      type: "shape", shapeType: "line",
      start: 2.9, end: 9.5, layer: 1,
      x1: SL + SW / 2, y1: R1Y + R1H,
      x2: SL + SW / 2, y2: R2Y,
      stroke: "rgb(52 211 153 / 0.3)", lineWidth: 2,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "server-connector-2",
      type: "shape", shapeType: "line",
      start: 3.0, end: 9.5, layer: 1,
      x1: SL + SW / 2, y1: R2Y + R2H,
      x2: SL + SW / 2, y2: R3Y,
      stroke: "rgb(52 211 153 / 0.2)", lineWidth: 2,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── Act 3: The Request (3.2–5.5s) ────────────────────────────────────────
    {
      id: "req-label",
      type: "text",
      start: 3.2, end: 5.5, layer: 4,
      text: "POST /api/users",
      x: 700, y: 295, maxWidth: 520,
      fontSize: 28, fontWeight: 700, color: "rgb(96 165 250 / 1)",
      opacity: { from: 0, to: 1, easing: "easeIn" },
      translateY: { from: -16, to: 0, easing: "easeOut" },
    },
    {
      id: "req-line",
      type: "shape", shapeType: "line",
      start: 3.4, end: 5.5, layer: 3,
      x1: CL + SW, y1: 340, x2: SL, y2: 340,
      stroke: "rgb(96 165 250 / 0.7)", lineWidth: 4,
      opacity: { from: 0, to: 1, easing: "linear" },
      translateX: { from: -220, to: 0, easing: "easeOut" },
    },
    {
      id: "req-body",
      type: "text",
      start: 3.7, end: 5.3, layer: 4,
      text: "{ name, email, password }",
      x: 720, y: 360, maxWidth: 480,
      fontSize: 22, fontWeight: 500, color: "rgb(148 163 184 / 0.8)",
      opacity: { from: 0, to: 1, easing: "easeInOut" },
    },
    {
      id: "req-packet",
      type: "shape", shapeType: "circle",
      start: 3.5, end: 5.0, layer: 3,
      x: 960, y: 340, radius: 20,
      fill: "rgb(96 165 250 / 0.95)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: -340, to: 340, easing: "linear" },
      scale: { from: 0.6, to: 1.1, easing: "easeInOut" },
    },

    // ── Act 4: Server Processing (5.0–5.8s) ──────────────────────────────────
    {
      id: "processing-glow",
      type: "shape", shapeType: "rect",
      start: 5.0, end: 5.8, layer: 3,   // layer 3 — renders ABOVE stack rects
      x: SL - 8, y: R1Y - 8, width: SW + 16, height: R1H + R2H + R3H + RG * 2 + 16, radius: 22,
      fill: "rgb(52 211 153 / 0.1)",
      opacity: { from: 0, to: 1, easing: "easeIn" },
      scale: { from: 0.97, to: 1.02, easing: "bounce" },
    },
    {
      id: "step-validate",
      type: "text",
      start: 4.5, end: 5.8, layer: 4,
      text: "→ Validate",
      x: SL - 180, y: 266, maxWidth: 200,
      fontSize: 20, fontWeight: 600, color: "rgb(52 211 153 / 0.95)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: -24, to: 0, easing: "easeOut" },
    },
    {
      id: "step-hash",
      type: "text",
      start: 4.7, end: 5.8, layer: 4,
      text: "→ Hash Password",
      x: SL - 210, y: 416, maxWidth: 230,
      fontSize: 20, fontWeight: 600, color: "rgb(52 211 153 / 0.95)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: -24, to: 0, easing: "easeOut" },
    },
    {
      id: "step-store",
      type: "text",
      start: 4.9, end: 5.8, layer: 4,
      text: "→ INSERT INTO users",
      x: SL - 240, y: 551, maxWidth: 260,
      fontSize: 20, fontWeight: 600, color: "rgb(52 211 153 / 0.95)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: -24, to: 0, easing: "easeOut" },
    },
    {
      id: "db-indicator",
      type: "shape", shapeType: "circle",
      start: 5.0, end: 6.0, layer: 3,
      x: SL + SW - 50, y: R3Y + R3H / 2, radius: 22,
      fill: "rgb(251 191 36 / 0.8)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0.5, to: 1, easing: "bounce" },
    },

    // ── Act 5: The Response (5.8–7.8s) ───────────────────────────────────────
    {
      id: "res-label",
      type: "text",
      start: 5.8, end: 7.8, layer: 4,
      text: "201 Created",
      x: 710, y: 430, maxWidth: 500,
      fontSize: 28, fontWeight: 700, color: "rgb(52 211 153 / 1)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 16, to: 0, easing: "easeOut" },
    },
    {
      id: "res-line",
      type: "shape", shapeType: "line",
      start: 6.0, end: 7.8, layer: 3,
      x1: SL, y1: 475, x2: CL + SW, y2: 475,
      stroke: "rgb(52 211 153 / 0.65)", lineWidth: 3,
      opacity: { from: 0, to: 1, easing: "linear" },
      translateX: { from: 220, to: 0, easing: "easeOut" },
    },
    {
      id: "res-body",
      type: "text",
      start: 6.3, end: 7.6, layer: 4,
      text: '{ id: 42, status: "ok" }',
      x: 720, y: 495, maxWidth: 480,
      fontSize: 22, fontWeight: 500, color: "rgb(148 163 184 / 0.8)",
      opacity: { from: 0, to: 1, easing: "easeInOut" },
    },
    {
      id: "res-packet",
      type: "shape", shapeType: "circle",
      start: 6.1, end: 7.6, layer: 3,
      x: 960, y: 475, radius: 20,
      fill: "rgb(52 211 153 / 0.95)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: 340, to: -340, easing: "linear" },
      scale: { from: 1.2, to: 0.8, easing: "easeOut" },   // shrinks = delivered
    },

    // ── Act 6: Full Picture (7.5–8.8s) ───────────────────────────────────────
    {
      id: "roundtrip-overlay",
      type: "shape", shapeType: "rect",
      start: 7.5, end: 8.8, layer: 1,
      x: 80, y: 150, width: 1760, height: 560, radius: 28,
      fill: "rgb(15 23 42 / 0.55)",
      opacity: { from: 0, to: 0.75, easing: "easeInOut" },
    },
    {
      id: "roundtrip-req-label",
      type: "text",
      start: 7.8, end: 8.8, layer: 4,
      text: "Request  →",
      x: 790, y: 290, maxWidth: 340,
      fontSize: 24, fontWeight: 600, color: "rgb(96 165 250 / 0.9)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: -10, to: 0, easing: "easeOut" },
    },
    {
      id: "latency-label",
      type: "text",
      start: 8.0, end: 8.8, layer: 4,
      text: "~200ms round trip",
      x: 790, y: 390, maxWidth: 340,
      fontSize: 20, fontWeight: 500, color: "rgb(251 191 36 / 0.9)",
      opacity: { from: 0, to: 1, easing: "easeInOut" },
    },
    {
      id: "roundtrip-res-label",
      type: "text",
      start: 8.2, end: 8.8, layer: 4,
      text: "←  Response",
      x: 790, y: 490, maxWidth: 340,
      fontSize: 24, fontWeight: 600, color: "rgb(52 211 153 / 0.9)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 10, to: 0, easing: "easeOut" },
    },

    // ── Act 7: Outro (8.3–10s) ───────────────────────────────────────────────
    {
      id: "closing-line",
      type: "text",
      start: 8.3, end: 10, layer: 4,
      text: "Every click. Every scroll. Every tap.",
      x: 460, y: 750, maxWidth: 1000,
      fontSize: 42, fontWeight: 700, color: "#f1f5f9",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 20, to: 0, easing: "easeOut" },
    },
    {
      id: "accent-tri-left",
      type: "shape", shapeType: "triangle",
      start: 8.5, end: 10, layer: 1,
      x: 80, y: 850, width: 120, height: 100,
      fill: "rgb(59 130 246 / 0.55)",
      opacity: { from: 0, to: 0.8, easing: "easeOut" },
      rotate: { from: -15, to: 0, easing: "easeOut" },
    },
    {
      id: "accent-tri-right",
      type: "shape", shapeType: "triangle",
      start: 8.6, end: 10, layer: 1,
      x: 1720, y: 850, width: 120, height: 100,
      fill: "rgb(52 211 153 / 0.55)",
      opacity: { from: 0, to: 0.8, easing: "easeOut" },
      rotate: { from: 15, to: 0, easing: "easeOut" },
    },
  ],
};
