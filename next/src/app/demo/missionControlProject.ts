import type { VideoProject } from "@/lib/renderer";

/**
 * Mission Control — Dashboard HUD
 * Layers stacked vertically full-width, data flows downward through each layer,
 * status indicators light up per layer, progress-bar-style fills.
 * 15 seconds · 1920×1080
 */

const W = 1920;
const H = 1080;
const DUR = 15;

// Horizontal bands — full width
const BAND_X = 100;
const BAND_W = W - 200;
const BAND_H = 80;
const BAND_GAP = 14;

// 6 layers: Browser, HTTP, Network | API, Business Logic, PostgreSQL
const B1Y = 180;  // Browser
const B2Y = B1Y + BAND_H + BAND_GAP;  // HTTP
const B3Y = B2Y + BAND_H + BAND_GAP;  // Network (client)
const DIVIDER_Y = B3Y + BAND_H + 20;
const B4Y = DIVIDER_Y + 30;           // REST API (server)
const B5Y = B4Y + BAND_H + BAND_GAP; // Business Logic
const B6Y = B5Y + BAND_H + BAND_GAP; // PostgreSQL
const STACK_BOTTOM = B6Y + BAND_H;

const BAND_CX = BAND_X + BAND_W / 2;

const BLUE   = "rgb(96 165 250)";
const BLUE_D = "rgb(96 165 250 / 0.3)";
const BLUE_G = "rgb(96 165 250 / 0.7)";
const GREEN  = "rgb(52 211 153)";
const GREEN_D = "rgb(52 211 153 / 0.3)";
const GREEN_G = "rgb(52 211 153 / 0.7)";
const AMBER  = "rgb(251 191 36)";
const AMBER_G = "rgb(251 191 36 / 0.6)";
const WHITE  = "#f1f5f9";
const MUTED  = "rgb(178 190 205 / 0.85)";

// Status dot x positions
const STATUS_X = BAND_X + 22;
const LABEL_X = BAND_X + 55;
const BAR_X = BAND_X + 320;
const BAR_W = BAND_W - 380;

export const missionControlProject: VideoProject = {
  id: "mission-control-hud-v1",
  name: "Mission Control — Dashboard HUD",
  width: W,
  height: H,
  duration: DUR,
  events: [

    // Dark background
    {
      id: "bg",
      type: "background",
      start: 0, end: DUR, layer: 0,
      background: { kind: "gradient", from: "#010812", to: "#050f1e", angle: 170 },
    },

    // Subtle ambient particles
    {
      id: "ambient",
      type: "particle",
      start: 0, end: DUR, layer: 1,
      count: 30, seed: 7,
      origin: { x: BAND_CX, y: H / 2 },
      spread: { x: BAND_W / 2, y: H / 2 },
      drift: { x: 2, y: -3 },
      particleRadius: { min: 1, max: 3 },
      color: BLUE_G,
      particleOpacity: { min: 0.1, max: 0.4 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── Title ──────────────────────────────────────────────────────────────
    {
      id: "title",
      type: "text",
      start: 0, end: 2.4, layer: 5,
      text: "MISSION CONTROL",
      x: W / 2 - 380, y: 380, maxWidth: 800,
      fontSize: 80, fontWeight: 900, color: BLUE,
      shadow: { color: BLUE_G, blur: 50 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "subtitle",
      type: "text",
      start: 0.5, end: 2.4, layer: 5,
      text: "HTTP REQUEST LIFECYCLE",
      x: W / 2 - 280, y: 490, maxWidth: 600,
      fontSize: 28, fontWeight: 400, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── SECTION HEADERS ───────────────────────────────────────────────────
    {
      id: "client-section",
      type: "text",
      start: 2.4, end: 14.5, layer: 5,
      text: "CLIENT",
      x: BAND_X, y: B1Y - 36, maxWidth: 200,
      fontSize: 14, fontWeight: 700, color: BLUE,
      shadow: { color: BLUE_G, blur: 8 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "server-section",
      type: "text",
      start: 2.4, end: 14.5, layer: 5,
      text: "SERVER",
      x: BAND_X, y: B4Y - 36, maxWidth: 200,
      fontSize: 14, fontWeight: 700, color: GREEN,
      shadow: { color: GREEN_G, blur: 8 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Client/Server divider
    {
      id: "divider",
      type: "shape", shapeType: "line",
      start: 2.4, end: 14.5, layer: 1,
      x1: BAND_X, y1: DIVIDER_Y, x2: BAND_X + BAND_W, y2: DIVIDER_Y,
      stroke: "rgb(148 163 184 / 0.2)", lineWidth: 1,
      lineDash: [10, 8],
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── LAYER BANDS ───────────────────────────────────────────────────────

    // Band 1: Browser
    {
      id: "b1-rect",
      type: "shape", shapeType: "rect",
      start: 2.5, end: 14.5, layer: 2,
      x: BAND_X, y: B1Y, width: BAND_W, height: BAND_H, radius: 6,
      fill: "rgb(96 165 250 / 0.06)",
      stroke: BLUE_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b1-dot",
      type: "shape", shapeType: "circle",
      start: 2.6, end: 14.5, layer: 4,
      x: STATUS_X, y: B1Y + BAND_H / 2, radius: 7,
      fill: "rgb(96 165 250 / 0.3)",
      stroke: BLUE, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b1-label",
      type: "text",
      start: 2.7, end: 14.5, layer: 4,
      text: "Browser",
      x: LABEL_X, y: B1Y + (BAND_H - 24) / 2 + 4, maxWidth: 240,
      fontSize: 24, fontWeight: 600, color: WHITE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    // Progress bar track
    {
      id: "b1-bar-track",
      type: "shape", shapeType: "rect",
      start: 2.8, end: 14.5, layer: 3,
      x: BAR_X, y: B1Y + (BAND_H - 12) / 2, width: BAR_W, height: 12, radius: 6,
      fill: "rgb(96 165 250 / 0.1)",
      stroke: BLUE_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Band 2: HTTP
    {
      id: "b2-rect",
      type: "shape", shapeType: "rect",
      start: 2.7, end: 14.5, layer: 2,
      x: BAND_X, y: B2Y, width: BAND_W, height: BAND_H, radius: 6,
      fill: "rgb(96 165 250 / 0.04)",
      stroke: BLUE_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b2-dot",
      type: "shape", shapeType: "circle",
      start: 2.8, end: 14.5, layer: 4,
      x: STATUS_X, y: B2Y + BAND_H / 2, radius: 7,
      fill: "rgb(96 165 250 / 0.2)",
      stroke: BLUE_D, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b2-label",
      type: "text",
      start: 2.9, end: 14.5, layer: 4,
      text: "HTTP Layer",
      x: LABEL_X, y: B2Y + (BAND_H - 24) / 2 + 4, maxWidth: 240,
      fontSize: 24, fontWeight: 600, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b2-bar-track",
      type: "shape", shapeType: "rect",
      start: 3.0, end: 14.5, layer: 3,
      x: BAR_X, y: B2Y + (BAND_H - 12) / 2, width: BAR_W, height: 12, radius: 6,
      fill: "rgb(96 165 250 / 0.08)",
      stroke: BLUE_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Band 3: Network
    {
      id: "b3-rect",
      type: "shape", shapeType: "rect",
      start: 2.9, end: 14.5, layer: 2,
      x: BAND_X, y: B3Y, width: BAND_W, height: BAND_H, radius: 6,
      fill: "rgb(96 165 250 / 0.02)",
      stroke: BLUE_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b3-dot",
      type: "shape", shapeType: "circle",
      start: 3.0, end: 14.5, layer: 4,
      x: STATUS_X, y: B3Y + BAND_H / 2, radius: 7,
      fill: "rgb(96 165 250 / 0.15)",
      stroke: BLUE_D, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b3-label",
      type: "text",
      start: 3.1, end: 14.5, layer: 4,
      text: "Network",
      x: LABEL_X, y: B3Y + (BAND_H - 24) / 2 + 4, maxWidth: 240,
      fontSize: 24, fontWeight: 600, color: "rgb(148 163 184 / 0.7)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b3-bar-track",
      type: "shape", shapeType: "rect",
      start: 3.2, end: 14.5, layer: 3,
      x: BAR_X, y: B3Y + (BAND_H - 12) / 2, width: BAR_W, height: 12, radius: 6,
      fill: "rgb(96 165 250 / 0.06)",
      stroke: BLUE_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Band 4: REST API
    {
      id: "b4-rect",
      type: "shape", shapeType: "rect",
      start: 3.1, end: 14.5, layer: 2,
      x: BAND_X, y: B4Y, width: BAND_W, height: BAND_H, radius: 6,
      fill: "rgb(52 211 153 / 0.06)",
      stroke: GREEN_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b4-dot",
      type: "shape", shapeType: "circle",
      start: 3.2, end: 14.5, layer: 4,
      x: STATUS_X, y: B4Y + BAND_H / 2, radius: 7,
      fill: "rgb(52 211 153 / 0.3)",
      stroke: GREEN, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b4-label",
      type: "text",
      start: 3.3, end: 14.5, layer: 4,
      text: "REST API",
      x: LABEL_X, y: B4Y + (BAND_H - 24) / 2 + 4, maxWidth: 240,
      fontSize: 24, fontWeight: 600, color: WHITE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b4-bar-track",
      type: "shape", shapeType: "rect",
      start: 3.4, end: 14.5, layer: 3,
      x: BAR_X, y: B4Y + (BAND_H - 12) / 2, width: BAR_W, height: 12, radius: 6,
      fill: "rgb(52 211 153 / 0.1)",
      stroke: GREEN_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Band 5: Business Logic
    {
      id: "b5-rect",
      type: "shape", shapeType: "rect",
      start: 3.3, end: 14.5, layer: 2,
      x: BAND_X, y: B5Y, width: BAND_W, height: BAND_H, radius: 6,
      fill: "rgb(52 211 153 / 0.04)",
      stroke: GREEN_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b5-dot",
      type: "shape", shapeType: "circle",
      start: 3.4, end: 14.5, layer: 4,
      x: STATUS_X, y: B5Y + BAND_H / 2, radius: 7,
      fill: "rgb(52 211 153 / 0.2)",
      stroke: GREEN_D, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b5-label",
      type: "text",
      start: 3.5, end: 14.5, layer: 4,
      text: "Business Logic",
      x: LABEL_X, y: B5Y + (BAND_H - 24) / 2 + 4, maxWidth: 240,
      fontSize: 24, fontWeight: 600, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b5-bar-track",
      type: "shape", shapeType: "rect",
      start: 3.6, end: 14.5, layer: 3,
      x: BAR_X, y: B5Y + (BAND_H - 12) / 2, width: BAR_W, height: 12, radius: 6,
      fill: "rgb(52 211 153 / 0.07)",
      stroke: GREEN_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Band 6: PostgreSQL
    {
      id: "b6-rect",
      type: "shape", shapeType: "rect",
      start: 3.5, end: 14.5, layer: 2,
      x: BAND_X, y: B6Y, width: BAND_W, height: BAND_H, radius: 6,
      fill: "rgb(52 211 153 / 0.02)",
      stroke: GREEN_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b6-dot",
      type: "shape", shapeType: "circle",
      start: 3.6, end: 14.5, layer: 4,
      x: STATUS_X, y: B6Y + BAND_H / 2, radius: 7,
      fill: "rgb(52 211 153 / 0.15)",
      stroke: GREEN_D, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b6-label",
      type: "text",
      start: 3.7, end: 14.5, layer: 4,
      text: "PostgreSQL",
      x: LABEL_X, y: B6Y + (BAND_H - 24) / 2 + 4, maxWidth: 240,
      fontSize: 24, fontWeight: 600, color: "rgb(148 163 184 / 0.7)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b6-bar-track",
      type: "shape", shapeType: "rect",
      start: 3.8, end: 14.5, layer: 3,
      x: BAR_X, y: B6Y + (BAND_H - 12) / 2, width: BAR_W, height: 12, radius: 6,
      fill: "rgb(52 211 153 / 0.05)",
      stroke: GREEN_D, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── ACT 3: REQUEST — packet travels DOWN through all layers ───────────
    {
      id: "req-header",
      type: "text",
      start: 4.5, end: 7.5, layer: 5,
      text: "POST /api/users",
      x: BAND_X + BAND_W - 380, y: B1Y - 36, maxWidth: 380,
      fontSize: 22, fontWeight: 700, color: BLUE,
      shadow: { color: BLUE_G, blur: 16 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Packet descends vertically through layers
    {
      id: "req-packet",
      type: "shape", shapeType: "circle",
      start: 5.0, end: 7.3, layer: 4,
      x: BAND_CX, y: B1Y + BAND_H / 2, radius: 20,
      fill: "rgb(96 165 250 / 0.95)",
      shadow: { color: BLUE_G, blur: 28 },
      path: {
        points: [
          { x: BAND_CX, y: B1Y + BAND_H / 2 },
          { x: BAND_CX, y: (B3Y + B4Y) / 2 + BAND_H / 2 },
          { x: BAND_CX, y: B4Y + BAND_H / 2 },
        ],
        easing: "easeInOut",
      },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Layer highlight — B1 activates as packet passes
    {
      id: "b1-active",
      type: "shape", shapeType: "rect",
      start: 5.0, end: 5.8, layer: 3,
      x: BAND_X, y: B1Y, width: BAND_W, height: BAND_H, radius: 6,
      fill: "rgb(96 165 250 / 0.15)",
      stroke: BLUE, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b1-status",
      type: "text",
      start: 5.0, end: 5.8, layer: 5,
      text: "● SENDING",
      x: BAND_X + BAND_W - 200, y: B1Y + (BAND_H - 22) / 2 + 4, maxWidth: 200,
      fontSize: 18, fontWeight: 600, color: BLUE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    {
      id: "b2-active",
      type: "shape", shapeType: "rect",
      start: 5.5, end: 6.3, layer: 3,
      x: BAND_X, y: B2Y, width: BAND_W, height: BAND_H, radius: 6,
      fill: "rgb(96 165 250 / 0.12)",
      stroke: BLUE, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b2-status",
      type: "text",
      start: 5.5, end: 6.3, layer: 5,
      text: "● ENCRYPTING",
      x: BAND_X + BAND_W - 240, y: B2Y + (BAND_H - 22) / 2 + 4, maxWidth: 240,
      fontSize: 18, fontWeight: 600, color: BLUE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    {
      id: "b3-active",
      type: "shape", shapeType: "rect",
      start: 6.0, end: 7.3, layer: 3,
      x: BAND_X, y: B3Y, width: BAND_W, height: BAND_H, radius: 6,
      fill: "rgb(96 165 250 / 0.1)",
      stroke: BLUE, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b3-status",
      type: "text",
      start: 6.0, end: 7.3, layer: 5,
      text: "● IN TRANSIT",
      x: BAND_X + BAND_W - 220, y: B3Y + (BAND_H - 22) / 2 + 4, maxWidth: 220,
      fontSize: 18, fontWeight: 600, color: BLUE,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── ACT 4: SERVER PROCESSING — layers light up sequentially ──────────
    {
      id: "b4-active",
      type: "shape", shapeType: "rect",
      start: 7.5, end: 10.5, layer: 3,
      x: BAND_X, y: B4Y, width: BAND_W, height: BAND_H, radius: 6,
      fill: "rgb(52 211 153 / 0.15)",
      stroke: GREEN, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b4-status",
      type: "text",
      start: 7.5, end: 10.5, layer: 5,
      text: "● RECEIVED — VALIDATING",
      x: BAND_X + BAND_W - 380, y: B4Y + (BAND_H - 22) / 2 + 4, maxWidth: 380,
      fontSize: 18, fontWeight: 600, color: GREEN,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    {
      id: "b5-active",
      type: "shape", shapeType: "rect",
      start: 8.2, end: 10.5, layer: 3,
      x: BAND_X, y: B5Y, width: BAND_W, height: BAND_H, radius: 6,
      fill: "rgb(52 211 153 / 0.12)",
      stroke: GREEN, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b5-status",
      type: "text",
      start: 8.2, end: 10.5, layer: 5,
      text: "● PROCESSING — HASHING",
      x: BAND_X + BAND_W - 380, y: B5Y + (BAND_H - 22) / 2 + 4, maxWidth: 380,
      fontSize: 18, fontWeight: 600, color: GREEN,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    {
      id: "b6-active",
      type: "shape", shapeType: "rect",
      start: 9.0, end: 10.5, layer: 3,
      x: BAND_X, y: B6Y, width: BAND_W, height: BAND_H, radius: 6,
      fill: "rgb(251 191 36 / 0.12)",
      stroke: AMBER, strokeWidth: 1.5,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "b6-status",
      type: "text",
      start: 9.0, end: 10.5, layer: 5,
      text: "● WRITING — INSERT INTO users",
      x: BAND_X + BAND_W - 440, y: B6Y + (BAND_H - 22) / 2 + 4, maxWidth: 440,
      fontSize: 18, fontWeight: 600, color: AMBER,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // DB write particles
    {
      id: "db-burst",
      type: "particle",
      start: 9.0, end: 10.5, layer: 3,
      count: 20, seed: 44,
      origin: { x: BAND_CX, y: B6Y + BAND_H / 2 },
      spread: { x: BAR_W / 2, y: 30 },
      drift: { x: 0, y: -10 },
      particleRadius: { min: 2, max: 4 },
      color: AMBER_G,
      particleOpacity: { min: 0.3, max: 0.7 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── ACT 5: RESPONSE — packet travels UP ───────────────────────────────
    {
      id: "res-label",
      type: "text",
      start: 10.5, end: 12.5, layer: 5,
      text: "201 CREATED — RESPONSE",
      x: BAND_X + BAND_W - 480, y: B4Y - 36, maxWidth: 480,
      fontSize: 22, fontWeight: 700, color: GREEN,
      shadow: { color: GREEN_G, blur: 16 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    {
      id: "res-packet",
      type: "shape", shapeType: "circle",
      start: 10.5, end: 12.3, layer: 4,
      x: BAND_CX, y: B4Y + BAND_H / 2, radius: 20,
      fill: "rgb(52 211 153 / 0.95)",
      shadow: { color: GREEN_G, blur: 28 },
      path: {
        points: [
          { x: BAND_CX, y: B4Y + BAND_H / 2 },
          { x: BAND_CX, y: (B3Y + B4Y) / 2 + BAND_H / 2 },
          { x: BAND_CX, y: B1Y + BAND_H / 2 },
        ],
        easing: "easeInOut",
      },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // All layers go green on response
    {
      id: "all-green",
      type: "shape", shapeType: "rect",
      start: 12.3, end: 13.5, layer: 3,
      x: BAND_X - 4, y: B1Y - 4,
      width: BAND_W + 8, height: STACK_BOTTOM - B1Y + 8,
      radius: 10,
      fill: "rgb(52 211 153 / 0.04)",
      stroke: GREEN_G, strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // Latency readout
    {
      id: "latency",
      type: "text",
      start: 12.3, end: 13.8, layer: 5,
      text: "ROUND TRIP  ~200ms",
      x: BAND_CX - 220, y: STACK_BOTTOM + 50, maxWidth: 500,
      fontSize: 32, fontWeight: 700, color: AMBER,
      shadow: { color: AMBER_G, blur: 20 },
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },

    // ── OUTRO ─────────────────────────────────────────────────────────────
    {
      id: "closing",
      type: "text",
      start: 13.5, end: DUR, layer: 5,
      text: "Systems nominal.",
      x: W / 2 - 250, y: 850, maxWidth: 560,
      fontSize: 48, fontWeight: 700, color: GREEN,
      shadow: { color: GREEN_G, blur: 30 },
      opacity: {
        keyframes: [
          { time: 13.5, value: 0, easing: "easeOut" },
          { time: 14.0, value: 1, easing: "easeOut" },
          { time: 14.4, value: 1, easing: "easeInOut" },
          { time: DUR, value: 0, easing: "easeIn" },
        ],
      },
    },
  ],
};
