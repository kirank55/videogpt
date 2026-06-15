import type { VideoProject } from "@/lib/renderer";

/**
 * Isometric 3D — Depth Illusion
 * Stacked-card depth effect using diagonal offsets, parallelogram-style rects.
 * Packet follows diagonal isometric path. Each layer darker to suggest depth.
 * 15 seconds · 1920×1080
 */

const W = 1920;
const H = 1080;
const DUR = 15;

// Isometric tilt — X offset per unit of "depth"
const ISO_DX = 28;  // horizontal shift between card layers
const ISO_DY = 16;  // vertical shift between card layers

// Base card dimensions
const CARD_W = 480;
const CARD_H = 120;
const CARD_R = 10;

// Client stack — base position (front face)
const CL_X = 80;
const CL_Y = 340;

// Server stack — base position (front face)
const SR_X = W - CL_X - CARD_W;
const SR_Y = 340;

// Gap
const GAP_L = CL_X + CARD_W;
const GAP_R = SR_X;
const GAP_CX = (GAP_L + GAP_R) / 2;

// Y positions for each layer (3 layers, going down with gap)
const L_GAP = 28;
const L1Y = CL_Y;
const L2Y = L1Y + CARD_H + L_GAP;
const L3Y = L2Y + CARD_H + L_GAP;

// Colors — progressively lighter = closer to viewer
const BLUE_F  = "rgb(96 165 250)";          // front stroke
const BLUE_D  = "rgb(60 110 190 / 0.5)";    // depth face
const BLUE_BG_1 = "rgb(38 55 90 / 0.95)";  // layer 1 fill (brightest)
const BLUE_BG_2 = "rgb(28 42 72 / 0.9)";   // layer 2
const BLUE_BG_3 = "rgb(18 30 55 / 0.85)";  // layer 3 (darkest)

const GREEN_F  = "rgb(52 211 153)";
const GREEN_D  = "rgb(32 140 100 / 0.5)";
const GREEN_BG_1 = "rgb(30 60 50 / 0.95)";
const GREEN_BG_2 = "rgb(22 48 40 / 0.9)";
const GREEN_BG_3 = "rgb(14 36 30 / 0.85)";

const WHITE  = "#f1f5f9";
const MUTED  = "rgb(178 190 205 / 0.9)";
const DIM    = "rgb(148 163 184 / 0.7)";
const AMBER_G = "rgb(251 191 36 / 0.7)";

// Packet diagonal travel path: iso slope matches card depth offsets
const ISO_PATH_SLOPE_X = ISO_DX * 3;
const ISO_PATH_SLOPE_Y = ISO_DY * 3;

export const isometricProject: VideoProject = {
  id: "isometric-3d-depth-v1",
  name: "Isometric 3D — Depth Illusion",
  width: W,
  height: H,
  duration: DUR,
  events: [

    // Background
    {
      id: "bg",
      type: "background",
      start: 0, end: DUR, layer: 0,
      background: { kind: "gradient", from: "#010a15", to: "#061020", angle: 150 },
    },

    // Ambient particles — slow diagonal drift matching iso direction
    {
      id: "ambient",
      type: "particle",
      start: 0, end: DUR, layer: 1,
      count: 35, seed: 9,
      origin: { x: W / 2, y: H / 2 },
      spread: { x: W / 2, y: H / 2 - 80 },
      drift: { x: 4, y: -2 },
      particleRadius: { min: 1, max: 4 },
      color: "rgb(96 165 250 / 0.5)",
      particleOpacity: { min: 0.1, max: 0.4 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── Title ──────────────────────────────────────────────────────────────
    {
      id: "title",
      type: "text",
      start: 0, end: 2.5, layer: 5,
      text: "Layers of the Web",
      x: W / 2 - 400, y: 380, maxWidth: 850,
      fontSize: 88, fontWeight: 800, color: WHITE,
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
      fontSize: 28, fontWeight: 400, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── CLIENT STACK — 3 depth layers ─────────────────────────────────────

    // Layer 1 — Browser (front, brightest)
    // Drop shadow card (depth illusion — offset rect behind)
    {
      id: "cl1-shadow",
      type: "shape", shapeType: "rect",
      start: 2.5, end: 14.5, layer: 1,
      x: CL_X + ISO_DX, y: L1Y + ISO_DY, width: CARD_W, height: CARD_H, radius: CARD_R,
      fill: BLUE_BG_3,
      stroke: BLUE_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 30, to: 0, easing: "easeOut" },
    },
    {
      id: "cl1-rect",
      type: "shape", shapeType: "rect",
      start: 2.6, end: 14.5, layer: 2,
      x: CL_X, y: L1Y, width: CARD_W, height: CARD_H, radius: CARD_R,
      fill: BLUE_BG_1,
      stroke: BLUE_F, strokeWidth: 2,
      shadow: { color: "rgb(96 165 250 / 0.5)", blur: 20 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 30, to: 0, easing: "easeOut" },
    },
    {
      id: "cl1-label",
      type: "text",
      start: 2.8, end: 14.5, layer: 4,
      text: "Browser",
      x: CL_X + 28, y: L1Y + (CARD_H - 30) / 2 + 4, maxWidth: CARD_W - 56,
      fontSize: 30, fontWeight: 700, color: WHITE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    // Depth tag
    {
      id: "cl1-depth-tag",
      type: "text",
      start: 3.0, end: 14.5, layer: 4,
      text: "LAYER 1",
      x: CL_X + ISO_DX + CARD_W - 90, y: L1Y + ISO_DY + 8, maxWidth: 100,
      fontSize: 13, fontWeight: 600, color: BLUE_D,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Layer 2 — HTTP
    {
      id: "cl2-shadow",
      type: "shape", shapeType: "rect",
      start: 2.8, end: 14.5, layer: 1,
      x: CL_X + ISO_DX, y: L2Y + ISO_DY, width: CARD_W, height: CARD_H, radius: CARD_R,
      fill: BLUE_BG_3,
      stroke: BLUE_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 30, to: 0, easing: "easeOut" },
    },
    {
      id: "cl2-rect",
      type: "shape", shapeType: "rect",
      start: 2.9, end: 14.5, layer: 2,
      x: CL_X, y: L2Y, width: CARD_W, height: CARD_H, radius: CARD_R,
      fill: BLUE_BG_2,
      stroke: "rgb(96 165 250 / 0.5)", strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 30, to: 0, easing: "easeOut" },
    },
    {
      id: "cl2-label",
      type: "text",
      start: 3.1, end: 14.5, layer: 4,
      text: "HTTP Layer",
      x: CL_X + 28, y: L2Y + (CARD_H - 26) / 2 + 4, maxWidth: CARD_W - 56,
      fontSize: 26, fontWeight: 600, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "cl2-depth-tag",
      type: "text",
      start: 3.3, end: 14.5, layer: 4,
      text: "LAYER 2",
      x: CL_X + ISO_DX + CARD_W - 90, y: L2Y + ISO_DY + 8, maxWidth: 100,
      fontSize: 13, fontWeight: 600, color: BLUE_D,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Layer 3 — Network (darkest)
    {
      id: "cl3-shadow",
      type: "shape", shapeType: "rect",
      start: 3.1, end: 14.5, layer: 1,
      x: CL_X + ISO_DX, y: L3Y + ISO_DY, width: CARD_W, height: CARD_H, radius: CARD_R,
      fill: "rgb(8 14 28 / 0.9)",
      stroke: BLUE_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 30, to: 0, easing: "easeOut" },
    },
    {
      id: "cl3-rect",
      type: "shape", shapeType: "rect",
      start: 3.2, end: 14.5, layer: 2,
      x: CL_X, y: L3Y, width: CARD_W, height: CARD_H, radius: CARD_R,
      fill: BLUE_BG_3,
      stroke: "rgb(96 165 250 / 0.25)", strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 30, to: 0, easing: "easeOut" },
    },
    {
      id: "cl3-label",
      type: "text",
      start: 3.4, end: 14.5, layer: 4,
      text: "Network",
      x: CL_X + 28, y: L3Y + (CARD_H - 26) / 2 + 4, maxWidth: CARD_W - 56,
      fontSize: 26, fontWeight: 600, color: DIM,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "cl3-depth-tag",
      type: "text",
      start: 3.6, end: 14.5, layer: 4,
      text: "LAYER 3",
      x: CL_X + ISO_DX + CARD_W - 90, y: L3Y + ISO_DY + 8, maxWidth: 100,
      fontSize: 13, fontWeight: 600, color: BLUE_D,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // CLIENT header
    {
      id: "client-header",
      type: "text",
      start: 2.5, end: 14.5, layer: 5,
      text: "CLIENT",
      x: CL_X, y: L1Y - 44, maxWidth: 160,
      fontSize: 16, fontWeight: 700, color: BLUE_F,
      shadow: { color: "rgb(96 165 250 / 0.6)", blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── SERVER STACK — 3 depth layers ─────────────────────────────────────

    // Layer 1 — REST API
    {
      id: "sr1-shadow",
      type: "shape", shapeType: "rect",
      start: 2.7, end: 14.5, layer: 1,
      x: SR_X + ISO_DX, y: L1Y + ISO_DY, width: CARD_W, height: CARD_H, radius: CARD_R,
      fill: GREEN_BG_3,
      stroke: GREEN_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 30, to: 0, easing: "easeOut" },
    },
    {
      id: "sr1-rect",
      type: "shape", shapeType: "rect",
      start: 2.8, end: 14.5, layer: 2,
      x: SR_X, y: L1Y, width: CARD_W, height: CARD_H, radius: CARD_R,
      fill: GREEN_BG_1,
      stroke: GREEN_F, strokeWidth: 2,
      shadow: { color: "rgb(52 211 153 / 0.5)", blur: 20 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 30, to: 0, easing: "easeOut" },
    },
    {
      id: "sr1-label",
      type: "text",
      start: 3.0, end: 14.5, layer: 4,
      text: "REST API",
      x: SR_X + 28, y: L1Y + (CARD_H - 30) / 2 + 4, maxWidth: CARD_W - 56,
      fontSize: 30, fontWeight: 700, color: WHITE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "sr1-depth-tag",
      type: "text",
      start: 3.2, end: 14.5, layer: 4,
      text: "LAYER 1",
      x: SR_X + ISO_DX + CARD_W - 90, y: L1Y + ISO_DY + 8, maxWidth: 100,
      fontSize: 13, fontWeight: 600, color: GREEN_D,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Layer 2 — Business Logic
    {
      id: "sr2-shadow",
      type: "shape", shapeType: "rect",
      start: 3.0, end: 14.5, layer: 1,
      x: SR_X + ISO_DX, y: L2Y + ISO_DY, width: CARD_W, height: CARD_H, radius: CARD_R,
      fill: GREEN_BG_3,
      stroke: GREEN_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 30, to: 0, easing: "easeOut" },
    },
    {
      id: "sr2-rect",
      type: "shape", shapeType: "rect",
      start: 3.1, end: 14.5, layer: 2,
      x: SR_X, y: L2Y, width: CARD_W, height: CARD_H, radius: CARD_R,
      fill: GREEN_BG_2,
      stroke: "rgb(52 211 153 / 0.5)", strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 30, to: 0, easing: "easeOut" },
    },
    {
      id: "sr2-label",
      type: "text",
      start: 3.3, end: 14.5, layer: 4,
      text: "Business Logic",
      x: SR_X + 28, y: L2Y + (CARD_H - 26) / 2 + 4, maxWidth: CARD_W - 56,
      fontSize: 26, fontWeight: 600, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "sr2-depth-tag",
      type: "text",
      start: 3.5, end: 14.5, layer: 4,
      text: "LAYER 2",
      x: SR_X + ISO_DX + CARD_W - 90, y: L2Y + ISO_DY + 8, maxWidth: 100,
      fontSize: 13, fontWeight: 600, color: GREEN_D,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Layer 3 — PostgreSQL
    {
      id: "sr3-shadow",
      type: "shape", shapeType: "rect",
      start: 3.3, end: 14.5, layer: 1,
      x: SR_X + ISO_DX, y: L3Y + ISO_DY, width: CARD_W, height: CARD_H, radius: CARD_R,
      fill: "rgb(5 14 12 / 0.9)",
      stroke: GREEN_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 30, to: 0, easing: "easeOut" },
    },
    {
      id: "sr3-rect",
      type: "shape", shapeType: "rect",
      start: 3.4, end: 14.5, layer: 2,
      x: SR_X, y: L3Y, width: CARD_W, height: CARD_H, radius: CARD_R,
      fill: GREEN_BG_3,
      stroke: "rgb(52 211 153 / 0.25)", strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 30, to: 0, easing: "easeOut" },
    },
    {
      id: "sr3-label",
      type: "text",
      start: 3.6, end: 14.5, layer: 4,
      text: "PostgreSQL",
      x: SR_X + 28, y: L3Y + (CARD_H - 26) / 2 + 4, maxWidth: CARD_W - 56,
      fontSize: 26, fontWeight: 600, color: DIM,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "sr3-depth-tag",
      type: "text",
      start: 3.8, end: 14.5, layer: 4,
      text: "LAYER 3",
      x: SR_X + ISO_DX + CARD_W - 90, y: L3Y + ISO_DY + 8, maxWidth: 100,
      fontSize: 13, fontWeight: 600, color: GREEN_D,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // SERVER header
    {
      id: "server-header",
      type: "text",
      start: 2.7, end: 14.5, layer: 5,
      text: "SERVER",
      x: SR_X, y: L1Y - 44, maxWidth: 160,
      fontSize: 16, fontWeight: 700, color: GREEN_F,
      shadow: { color: "rgb(52 211 153 / 0.6)", blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── ACT 3: REQUEST — packet arcs diagonally (iso-style) ───────────────
    {
      id: "req-label",
      type: "text",
      start: 4.5, end: 7.0, layer: 5,
      text: "POST /api/users",
      x: GAP_CX - 160, y: L1Y - 65, maxWidth: 380,
      fontSize: 28, fontWeight: 700, color: BLUE_F,
      shadow: { color: "rgb(96 165 250 / 0.7)", blur: 25 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: -12, to: 0, easing: "easeOut" },
    },

    // Packet arc — starts from client L1 right edge, ends at server L1 left edge
    // Mid-point goes diagonally "up-right" matching iso angle
    {
      id: "req-packet",
      type: "shape", shapeType: "circle",
      start: 5.0, end: 7.0, layer: 4,
      x: GAP_CX, y: L1Y + CARD_H / 2, radius: 22,
      fill: "rgb(96 165 250 / 0.95)",
      shadow: { color: "rgb(96 165 250 / 0.9)", blur: 28 },
      path: {
        points: [
          { x: GAP_L, y: L1Y + CARD_H / 2 },
          { x: GAP_CX - ISO_PATH_SLOPE_X / 2, y: L1Y + CARD_H / 2 - ISO_PATH_SLOPE_Y * 2 },
          { x: GAP_R, y: L1Y + CARD_H / 2 },
        ],
        easing: "easeInOut",
      },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0.5, to: 1.2, easing: "easeInOut" },
    },

    // Launch burst
    {
      id: "req-burst",
      type: "particle",
      start: 5.0, end: 6.5, layer: 3,
      count: 25, seed: 33,
      origin: { x: GAP_L, y: L1Y + CARD_H / 2 },
      spread: { x: 40, y: 30 },
      drift: { x: 40, y: -18 },
      particleRadius: { min: 2, max: 5 },
      color: "rgb(96 165 250 / 0.8)",
      particleOpacity: { min: 0.4, max: 0.85 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── ACT 4: PROCESSING — cards highlight one by one ────────────────────
    {
      id: "proc-glow-1",
      type: "shape", shapeType: "rect",
      start: 7.5, end: 10.5, layer: 3,
      x: SR_X - 6, y: L1Y - 6, width: CARD_W + 12, height: CARD_H + 12, radius: CARD_R + 4,
      fill: "rgb(52 211 153 / 0.1)",
      shadow: { color: "rgb(52 211 153 / 0.6)", blur: 30 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "step-validate",
      type: "text",
      start: 7.8, end: 10.2, layer: 5,
      text: "→ Validate",
      x: SR_X + 28, y: L1Y + CARD_H + 8, maxWidth: 200,
      fontSize: 20, fontWeight: 600, color: GREEN_F,
      shadow: { color: "rgb(52 211 153 / 0.5)", blur: 10 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: -16, to: 0, easing: "easeOut" },
    },

    {
      id: "proc-glow-2",
      type: "shape", shapeType: "rect",
      start: 8.3, end: 10.5, layer: 3,
      x: SR_X - 6, y: L2Y - 6, width: CARD_W + 12, height: CARD_H + 12, radius: CARD_R + 4,
      fill: "rgb(52 211 153 / 0.08)",
      shadow: { color: "rgb(52 211 153 / 0.5)", blur: 25 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "step-hash",
      type: "text",
      start: 8.6, end: 10.2, layer: 5,
      text: "→ Hash Password",
      x: SR_X + 28, y: L2Y + CARD_H + 8, maxWidth: 260,
      fontSize: 20, fontWeight: 600, color: GREEN_F,
      shadow: { color: "rgb(52 211 153 / 0.5)", blur: 10 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: -16, to: 0, easing: "easeOut" },
    },

    {
      id: "proc-glow-3",
      type: "shape", shapeType: "rect",
      start: 9.0, end: 10.5, layer: 3,
      x: SR_X - 6, y: L3Y - 6, width: CARD_W + 12, height: CARD_H + 12, radius: CARD_R + 4,
      fill: "rgb(251 191 36 / 0.08)",
      shadow: { color: AMBER_G, blur: 22 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "step-store",
      type: "text",
      start: 9.3, end: 10.2, layer: 5,
      text: "→ INSERT INTO users",
      x: SR_X + 28, y: L3Y + CARD_H + 8, maxWidth: 300,
      fontSize: 20, fontWeight: 600, color: "rgb(251 191 36)",
      shadow: { color: AMBER_G, blur: 10 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateX: { from: -16, to: 0, easing: "easeOut" },
    },

    // DB burst
    {
      id: "db-burst",
      type: "particle",
      start: 9.0, end: 10.5, layer: 3,
      count: 20, seed: 55,
      origin: { x: SR_X + CARD_W / 2, y: L3Y + CARD_H / 2 },
      spread: { x: 60, y: 35 },
      drift: { x: 3, y: -12 },
      particleRadius: { min: 2, max: 4 },
      color: AMBER_G,
      particleOpacity: { min: 0.3, max: 0.7 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── ACT 5: RESPONSE — packet arcs back diagonally ────────────────────
    {
      id: "res-label",
      type: "text",
      start: 10.0, end: 12.5, layer: 5,
      text: "201 Created",
      x: GAP_CX - 110, y: L1Y - 65, maxWidth: 300,
      fontSize: 28, fontWeight: 700, color: GREEN_F,
      shadow: { color: "rgb(52 211 153 / 0.7)", blur: 25 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: -12, to: 0, easing: "easeOut" },
    },

    {
      id: "res-packet",
      type: "shape", shapeType: "circle",
      start: 10.3, end: 12.0, layer: 4,
      x: GAP_CX, y: L1Y + CARD_H / 2, radius: 22,
      fill: "rgb(52 211 153 / 0.95)",
      shadow: { color: "rgb(52 211 153 / 0.9)", blur: 28 },
      path: {
        points: [
          { x: GAP_R, y: L1Y + CARD_H / 2 },
          { x: GAP_CX + ISO_PATH_SLOPE_X / 2, y: L1Y + CARD_H / 2 - ISO_PATH_SLOPE_Y * 2 },
          { x: GAP_L, y: L1Y + CARD_H / 2 },
        ],
        easing: "easeInOut",
      },
      opacity: { from: 0, to: 1, easing: "easeOut" },
      scale: { from: 0.5, to: 1.2, easing: "easeInOut" },
    },

    // ── OUTRO ─────────────────────────────────────────────────────────────
    {
      id: "closing",
      type: "text",
      start: 13.0, end: DUR, layer: 5,
      text: "Every click. Every scroll. Every tap.",
      x: W / 2 - 470, y: 850, maxWidth: 980,
      fontSize: 48, fontWeight: 700, color: WHITE,
      shadow: { color: "rgb(96 165 250 / 0.6)", blur: 40 },
      opacity: {
        keyframes: [
          { time: 13.0, value: 0, easing: "easeOut" },
          { time: 13.7, value: 1, easing: "easeOut" },
          { time: 14.3, value: 1, easing: "easeInOut" },
          { time: DUR, value: 0, easing: "easeIn" },
        ],
      },
      translateY: { from: 18, to: 0, easing: "easeOut" },
    },

    {
      id: "celebration",
      type: "particle",
      start: 13.2, end: DUR, layer: 3,
      count: 30, seed: 77,
      origin: { x: W / 2, y: 830 },
      spread: { x: 400, y: 80 },
      drift: { x: 4, y: -12 },
      particleRadius: { min: 2, max: 5 },
      color: AMBER_G,
      particleOpacity: { min: 0.2, max: 0.6 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
  ],
};
