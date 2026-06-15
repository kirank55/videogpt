# All Demo Project Scripts

9 projects total. Each section = one file. Copy/mix freely.

---

## 1. `demoProject.ts` — Launch Loop (5s)

**Vibe:** Simple promo splash. Gradient bg, panel, circle, slash line, text.

```typescript
import type { VideoProject } from "@/lib/renderer";

export const demoProject: VideoProject = {
  id: "demo-launch-loop",
  name: "Launch Loop",
  width: 1920,
  height: 1080,
  duration: 5,
  events: [
    {
      id: "background",
      type: "background",
      start: 0, end: 5, layer: 0,
      background: { kind: "gradient", from: "#020617", to: "#1d4ed8", angle: 30 },
    },
    {
      id: "panel",
      type: "shape", shapeType: "rect",
      start: 0.35, end: 4.8, layer: 1,
      x: 168, y: 184, width: 840, height: 480, radius: 56,
      fill: "rgb(15 23 42 / 0.66)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 60, to: 0, easing: "easeOut" },
    },
    {
      id: "accent-circle",
      type: "shape", shapeType: "circle",
      start: 0.55, end: 4.6, layer: 1,
      x: 1520, y: 340, radius: 184,
      fill: "rgb(45 212 191 / 0.9)",
      opacity: { from: 0, to: 0.95, easing: "easeOut" },
      scale: { from: 0.6, to: 1, easing: "bounce" },
    },
    {
      id: "slash",
      type: "shape", shapeType: "line",
      start: 1.1, end: 4.5, layer: 2,
      x1: 1100, y1: 780, x2: 1720, y2: 216,
      stroke: "rgb(248 250 252 / 0.84)", lineWidth: 28,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "title",
      type: "text",
      start: 0.2, end: 2.8, layer: 3,
      text: "Launch your next story in motion",
      x: 220, y: 252, maxWidth: 680,
      color: "#f8fafc", fontSize: 84, fontWeight: 700, lineHeight: 92,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 56, to: 0, easing: "easeOut" },
    },
    {
      id: "subtitle",
      type: "text",
      start: 1.35, end: 4.8, layer: 3,
      text: "Prompt. Preview. Export. All from one compact studio flow.",
      x: 220, y: 564, maxWidth: 720,
      color: "rgb(191 219 254 / 0.94)", fontSize: 44, fontWeight: 500, lineHeight: 60,
      opacity: { from: 0, to: 1, easing: "easeInOut" },
      translateY: { from: 36, to: 0, easing: "easeOut" },
    },
    {
      id: "tag",
      type: "shape", shapeType: "triangle",
      start: 2.1, end: 5, layer: 2,
      x: 1380, y: 660, width: 240, height: 220,
      fill: "rgb(37 99 235 / 0.85)",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      rotate: { from: -10, to: 0, easing: "easeOut" },
    },
    {
      id: "caption",
      type: "text",
      start: 2.45, end: 5, layer: 3,
      text: "Canvas-ready previews",
      x: 1180, y: 760, maxWidth: 440,
      color: "#f8fafc", fontSize: 52, fontWeight: 700,
      opacity: { from: 0, to: 1, easing: "easeInOut" },
      scale: { from: 0.92, to: 1, easing: "bounce" },
    },
  ],
};
```

---

## 2. `bigDemoProject.ts` — Client–Server Architecture (15s)

**Vibe:** Dark navy, blue/green stacks, arcing packets, particles, glow effects. Most complex.

**Key constants:**
- Canvas: 1920×1080
- Client stack: x=100, w=500
- Server stack: x=1320, w=500
- Gap center: x=960
- Row layout: R1Y=270(h140), R2Y=430(h120), R3Y=570(h120)
- Colors: BLUE=`rgb(96 165 250)`, GREEN=`rgb(52 211 153)`, AMBER=`rgb(251 191 36)`

**Acts:**
1. 0–3s: Title "How the Web Works" + subtitle words fade in
2. 2–5s: Client stack (Browser/HTTP/Network) + Server stack (REST API/Business Logic/PostgreSQL) slide in
3. 4.5–8s: `POST /api/users` packet arcs client→server
4. 7.5–10.5s: Server processes (Validate → Hash Password → INSERT INTO users)
5. 10–15s: `201 Created` packet arcs back, round-trip overlay, closing line

```typescript
import type { VideoProject } from "@/lib/renderer";

const W = 1920, H = 1080, DUR = 15;
const CL = 100, SW = 500, SL = W - CL - SW;
const GAP_L = CL + SW, GAP_R = SL, GAP_CX = (GAP_L + GAP_R) / 2;
const PAD = 44;
const HEADER_Y = 240;
const R1Y = 270, R1H = 140, RG = 20;
const R2Y = R1Y + R1H + RG, R2H = 120;
const R3Y = R2Y + R2H + RG, R3H = 120;
const STACK_BOTTOM = R3Y + R3H;
const L1_FS = 32, L2_FS = 26;
const L1Y = R1Y + (R1H - L1_FS) / 2;
const L2Y = R2Y + (R2H - L2_FS) / 2;
const L3Y = R3Y + (R3H - L2_FS) / 2;
const REQ_START_Y = R1Y + R1H / 2, REQ_END_Y = R1Y + R1H / 2;
const RES_START_Y = R1Y + R1H / 2, RES_END_Y = R1Y + R1H / 2;
const BLUE = "rgb(96 165 250)", BLUE_DIM = "rgb(96 165 250 / 0.45)", BLUE_GLOW = "rgb(96 165 250 / 0.7)";
const GREEN = "rgb(52 211 153)", GREEN_DIM = "rgb(52 211 153 / 0.4)", GREEN_GLOW = "rgb(52 211 153 / 0.7)";
const AMBER = "rgb(251 191 36)", WHITE = "#f1f5f9";
const MUTED = "rgb(178 190 205 / 0.95)", MUTED_DIM = "rgb(160 175 195 / 0.8)";

export const bigDemoProject: VideoProject = {
  id: "big-demo-client-server-v3",
  name: "Client–Server Architecture",
  width: W, height: H, duration: DUR,
  events: [
    // BACKGROUND
    { id: "bg", type: "background", start: 0, end: DUR, layer: 0,
      background: { kind: "gradient", from: "#020617", to: "#0f172a", angle: 160 } },

    // PARTICLES
    { id: "ambient-particles", type: "particle", start: 0.2, end: DUR, layer: 1,
      count: 40, seed: 42, origin: { x: W/2, y: H/2 }, spread: { x: W/2-80, y: H/2-80 },
      drift: { x: 6, y: -2 }, particleRadius: { min: 2, max: 6 },
      color: "rgb(96 165 250 / 0.6)", particleOpacity: { min: 0.25, max: 0.65 },
      opacity: { from: 0, to: 1, easing: "easeOut" } },

    // ACT 1: TITLE
    { id: "title", type: "text", start: 0.0, end: 2.8, layer: 5,
      text: "How the Web Works", x: 320, y: 420, maxWidth: 1300,
      fontSize: 96, fontWeight: 800, color: WHITE,
      shadow: { color: "rgb(96 165 250 / 0.8)", blur: 50 },
      opacity: { keyframes: [{ time: 0.0, value: 0, easing: "easeOut" }, { time: 0.6, value: 1, easing: "easeOut" }, { time: 1.8, value: 1, easing: "easeInOut" }, { time: 2.8, value: 0, easing: "easeIn" }] },
      translateY: { from: 40, to: 0, easing: "easeOut" } },

    // Subtitle words (sub-client, sub-arrow-1, sub-server, sub-arrow-2, sub-response)
    // ... [staggered fade-ins at 0.5, 0.8, 1.0, 1.2, 1.4]

    // Deco baseline
    { id: "deco-line", type: "shape", shapeType: "line", start: 0.3, end: 14.5, layer: 1,
      x1: 100, y1: 750, x2: 1820, y2: 750, stroke: BLUE_DIM, lineWidth: 2,
      lineDash: [14, 10], arrowStart: true, arrowEnd: true, arrowSize: 10,
      opacity: { from: 0, to: 0.7, easing: "easeOut" } },

    // ACT 2: CLIENT STACK
    { id: "client-header", type: "text", start: 2.8, end: 14.5, layer: 5,
      text: "CLIENT", x: CL + PAD, y: HEADER_Y, maxWidth: 300,
      fontSize: 18, fontWeight: 700, color: BLUE,
      shadow: { color: BLUE_GLOW, blur: 15 },
      opacity: { from: 0, to: 1, easing: "easeOut" } },
    { id: "browser-rect", type: "shape", shapeType: "rect", start: 2.9, end: 14.5, layer: 2,
      x: CL, y: R1Y, width: SW, height: R1H, radius: 16,
      fill: { kind: "gradient", from: "rgb(38 52 78 / 0.95)", to: "rgb(25 38 60 / 0.9)", angle: 180 },
      stroke: "rgb(96 165 250 / 0.5)", strokeWidth: 1.5,
      opacity: { keyframes: [{ time: 2.9, value: 0, easing: "easeOut" }, { time: 3.5, value: 1, easing: "easeOut" }, { time: 3.9, value: 0.7, easing: "easeInOut" }, { time: 4.3, value: 1, easing: "easeOut" }] },
      translateY: { from: 40, to: 0, easing: "easeOut" } },
    { id: "browser-label", type: "text", start: 3.0, end: 14.5, layer: 4,
      text: "Browser", x: CL + PAD, y: L1Y, maxWidth: SW - PAD*2,
      fontSize: L1_FS, fontWeight: 600, color: "#e2e8f0",
      opacity: { from: 0, to: 1, easing: "easeOut" }, translateY: { from: 24, to: 0, easing: "easeOut" } },
    { id: "http-rect", type: "shape", shapeType: "rect", start: 3.2, end: 14.5, layer: 2,
      x: CL, y: R2Y, width: SW, height: R2H, radius: 14,
      fill: { kind: "gradient", from: "rgb(32 45 70 / 0.9)", to: "rgb(22 32 55 / 0.85)", angle: 180 },
      stroke: "rgb(96 165 250 / 0.3)", strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeInOut" }, translateY: { from: 40, to: 0, easing: "easeInOut" } },
    { id: "http-label", type: "text", start: 3.3, end: 14.5, layer: 4,
      text: "HTTP Layer", x: CL + PAD, y: L2Y, maxWidth: SW - PAD*2,
      fontSize: L2_FS, fontWeight: 600, color: "rgb(210 220 235 / 0.95)",
      opacity: { from: 0, to: 1, easing: "easeInOut" } },
    { id: "network-rect", type: "shape", shapeType: "rect", start: 3.4, end: 14.5, layer: 2,
      x: CL, y: R3Y, width: SW, height: R3H, radius: 14,
      fill: { kind: "gradient", from: "rgb(28 40 62 / 0.8)", to: "rgb(18 28 48 / 0.75)", angle: 180 },
      stroke: "rgb(96 165 250 / 0.2)", strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" }, translateY: { from: 40, to: 0, easing: "easeOut" } },
    { id: "network-label", type: "text", start: 3.5, end: 14.5, layer: 4,
      text: "Network", x: CL + PAD, y: L3Y, maxWidth: SW - PAD*2,
      fontSize: L2_FS, fontWeight: 600, color: MUTED_DIM,
      opacity: { from: 0, to: 1, easing: "easeOut" } },
    // Client connectors (dashed, arrowEnd)
    { id: "client-conn-1", type: "shape", shapeType: "line", start: 3.8, end: 14.5, layer: 1,
      x1: CL+SW/2, y1: R1Y+R1H, x2: CL+SW/2, y2: R2Y,
      stroke: "rgb(96 165 250 / 0.4)", lineWidth: 2, lineDash: [6, 5], arrowEnd: true, arrowSize: 8,
      opacity: { from: 0, to: 1, easing: "easeOut" } },
    { id: "client-conn-2", type: "shape", shapeType: "line", start: 3.9, end: 14.5, layer: 1,
      x1: CL+SW/2, y1: R2Y+R2H, x2: CL+SW/2, y2: R3Y,
      stroke: "rgb(96 165 250 / 0.3)", lineWidth: 2, lineDash: [6, 5], arrowEnd: true, arrowSize: 8,
      opacity: { from: 0, to: 1, easing: "easeOut" } },

    // ACT 2: SERVER STACK
    { id: "server-header", type: "text", start: 3.1, end: 14.5, layer: 5,
      text: "SERVER", x: SL + PAD, y: HEADER_Y, maxWidth: 300,
      fontSize: 18, fontWeight: 700, color: GREEN,
      shadow: { color: GREEN_GLOW, blur: 15 },
      opacity: { from: 0, to: 1, easing: "easeOut" } },
    { id: "api-rect", type: "shape", shapeType: "rect", start: 3.2, end: 14.5, layer: 2,
      x: SL, y: R1Y, width: SW, height: R1H, radius: 16,
      fill: { kind: "gradient", from: "rgb(38 52 78 / 0.95)", to: "rgb(25 38 60 / 0.9)", angle: 180 },
      stroke: "rgb(52 211 153 / 0.5)", strokeWidth: 1.5,
      opacity: { keyframes: [{ time: 3.2, value: 0, easing: "easeOut" }, { time: 3.8, value: 1, easing: "easeOut" }, { time: 4.2, value: 0.7, easing: "easeInOut" }, { time: 4.6, value: 1, easing: "easeOut" }] },
      translateY: { from: 40, to: 0, easing: "easeOut" } },
    { id: "api-label", type: "text", start: 3.3, end: 14.5, layer: 4,
      text: "REST API", x: SL + PAD, y: L1Y, maxWidth: SW - PAD*2,
      fontSize: L1_FS, fontWeight: 600, color: "#e2e8f0",
      opacity: { from: 0, to: 1, easing: "easeOut" }, translateY: { from: 24, to: 0, easing: "easeOut" } },
    { id: "logic-rect", type: "shape", shapeType: "rect", start: 3.4, end: 14.5, layer: 2,
      x: SL, y: R2Y, width: SW, height: R2H, radius: 14,
      fill: { kind: "gradient", from: "rgb(32 45 70 / 0.9)", to: "rgb(22 32 55 / 0.85)", angle: 180 },
      stroke: "rgb(52 211 153 / 0.3)", strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeInOut" }, translateY: { from: 40, to: 0, easing: "easeInOut" } },
    { id: "logic-label", type: "text", start: 3.5, end: 14.5, layer: 4,
      text: "Business Logic", x: SL + PAD, y: L2Y, maxWidth: SW - PAD*2,
      fontSize: L2_FS, fontWeight: 600, color: "rgb(210 220 235 / 0.95)",
      opacity: { from: 0, to: 1, easing: "easeInOut" } },
    { id: "db-rect", type: "shape", shapeType: "rect", start: 3.6, end: 14.5, layer: 2,
      x: SL, y: R3Y, width: SW, height: R3H, radius: 14,
      fill: { kind: "gradient", from: "rgb(28 40 62 / 0.8)", to: "rgb(18 28 48 / 0.75)", angle: 180 },
      stroke: "rgb(52 211 153 / 0.2)", strokeWidth: 1,
      opacity: { from: 0, to: 1, easing: "easeOut" }, translateY: { from: 40, to: 0, easing: "easeOut" } },
    { id: "db-label", type: "text", start: 3.7, end: 14.5, layer: 4,
      text: "PostgreSQL", x: SL + PAD, y: L3Y, maxWidth: SW - PAD*2,
      fontSize: L2_FS, fontWeight: 600, color: MUTED_DIM,
      opacity: { from: 0, to: 1, easing: "easeOut" } },
    { id: "server-conn-1", type: "shape", shapeType: "line", start: 4.0, end: 14.5, layer: 1,
      x1: SL+SW/2, y1: R1Y+R1H, x2: SL+SW/2, y2: R2Y,
      stroke: "rgb(52 211 153 / 0.4)", lineWidth: 2, lineDash: [6, 5], arrowEnd: true, arrowSize: 8,
      opacity: { from: 0, to: 1, easing: "easeOut" } },
    { id: "server-conn-2", type: "shape", shapeType: "line", start: 4.1, end: 14.5, layer: 1,
      x1: SL+SW/2, y1: R2Y+R2H, x2: SL+SW/2, y2: R3Y,
      stroke: "rgb(52 211 153 / 0.3)", lineWidth: 2, lineDash: [6, 5], arrowEnd: true, arrowSize: 8,
      opacity: { from: 0, to: 1, easing: "easeOut" } },

    // ACT 3: REQUEST PACKET
    { id: "req-label", type: "text", start: 4.5, end: 7.5, layer: 5,
      text: "POST /api/users", x: GAP_CX - 150, y: R1Y - 60, maxWidth: 450,
      fontSize: 30, fontWeight: 700, color: BLUE,
      shadow: { color: BLUE_GLOW, blur: 25 },
      opacity: { from: 0, to: 1, easing: "easeOut" }, translateY: { from: -15, to: 0, easing: "easeOut" } },
    { id: "req-packet", type: "shape", shapeType: "circle", start: 5.0, end: 7.2, layer: 3,
      x: GAP_CX, y: R1Y, radius: 22,
      fill: "rgb(96 165 250 / 0.95)",
      shadow: { color: "rgb(96 165 250 / 0.9)", blur: 24 },
      path: { points: [{ x: GAP_L, y: REQ_START_Y }, { x: GAP_CX, y: R1Y - 40 }, { x: GAP_R, y: REQ_END_Y }], easing: "easeInOut" },
      opacity: { from: 0, to: 1, easing: "easeOut" }, scale: { from: 0.5, to: 1.2, easing: "easeInOut" } },
    { id: "req-body", type: "text", start: 5.5, end: 7.2, layer: 4,
      text: "{ name, email, password }", x: GAP_CX - 140, y: R2Y + 15, maxWidth: 420,
      fontSize: 24, fontWeight: 500, color: MUTED,
      opacity: { from: 0, to: 1, easing: "easeInOut" } },
    { id: "req-burst", type: "particle", start: 5.0, end: 6.8, layer: 3,
      count: 25, seed: 101, origin: { x: GAP_L, y: REQ_START_Y }, spread: { x: 40, y: 35 },
      drift: { x: 50, y: -20 }, particleRadius: { min: 2, max: 5 },
      color: "rgb(96 165 250 / 0.8)", particleOpacity: { min: 0.4, max: 0.85 },
      opacity: { from: 0, to: 1, easing: "easeOut" } },

    // ACT 4: SERVER PROCESSING
    { id: "processing-glow", type: "shape", shapeType: "rect", start: 7.5, end: 10.5, layer: 1,
      x: SL - 8, y: R1Y - 8, width: SW + 16, height: R1H + R2H + R3H + RG*2 + 16, radius: 22,
      fill: "rgb(52 211 153 / 0.08)", shadow: { color: "rgb(52 211 153 / 0.5)", blur: 30 },
      opacity: { from: 0, to: 1, easing: "easeIn" },
      scale: { keyframes: [{ time: 7.5, value: 0.97, easing: "easeOut" }, { time: 8.3, value: 1.03, easing: "easeInOut" }, { time: 9.2, value: 0.99, easing: "easeInOut" }, { time: 10.0, value: 1.02, easing: "easeInOut" }, { time: 10.5, value: 1.0, easing: "easeOut" }] } },
    { id: "step-validate-arrow", type: "text", start: 7.8, end: 10.2, layer: 5,
      text: "→", x: SL + SW - 180, y: L1Y, maxWidth: 30,
      fontSize: 22, fontWeight: 600, color: GREEN, shadow: { color: GREEN_GLOW, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" }, translateX: { from: -24, to: 0, easing: "easeOut" } },
    { id: "step-validate-text", type: "text", start: 8.1, end: 10.2, layer: 5,
      text: "Validate", x: SL + SW - 150, y: L1Y, maxWidth: 130,
      fontSize: 22, fontWeight: 600, color: GREEN, shadow: { color: GREEN_GLOW, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" } },
    { id: "step-hash-arrow", type: "text", start: 8.3, end: 10.2, layer: 5,
      text: "→", x: SL + SW - 220, y: L2Y, maxWidth: 30,
      fontSize: 22, fontWeight: 600, color: GREEN, shadow: { color: GREEN_GLOW, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" }, translateX: { from: -24, to: 0, easing: "easeOut" } },
    { id: "step-hash-text", type: "text", start: 8.6, end: 10.2, layer: 5,
      text: "Hash Password", x: SL + SW - 190, y: L2Y, maxWidth: 170,
      fontSize: 22, fontWeight: 600, color: GREEN, shadow: { color: GREEN_GLOW, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" } },
    { id: "step-store-arrow", type: "text", start: 8.8, end: 10.2, layer: 5,
      text: "→", x: SL + SW - 255, y: L3Y, maxWidth: 30,
      fontSize: 22, fontWeight: 600, color: GREEN, shadow: { color: GREEN_GLOW, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" }, translateX: { from: -24, to: 0, easing: "easeOut" } },
    { id: "step-store-text", type: "text", start: 9.1, end: 10.2, layer: 5,
      text: "INSERT INTO users", x: SL + SW - 225, y: L3Y, maxWidth: 205,
      fontSize: 22, fontWeight: 600, color: GREEN, shadow: { color: GREEN_GLOW, blur: 12 },
      opacity: { from: 0, to: 1, easing: "easeOut" } },
    { id: "db-burst", type: "particle", start: 9.0, end: 10.5, layer: 3,
      count: 20, seed: 202, origin: { x: SL+SW/2, y: R3Y+R3H/2 }, spread: { x: 70, y: 40 },
      drift: { x: 5, y: -15 }, particleRadius: { min: 2, max: 5 },
      color: "rgb(251 191 36 / 0.7)", particleOpacity: { min: 0.3, max: 0.8 },
      opacity: { from: 0, to: 1, easing: "easeOut" } },

    // ACT 5: RESPONSE + OUTRO
    { id: "res-label", type: "text", start: 10.0, end: 12.5, layer: 5,
      text: "201 Created", x: GAP_CX - 110, y: R3Y + 15, maxWidth: 400,
      fontSize: 30, fontWeight: 700, color: GREEN, shadow: { color: GREEN_GLOW, blur: 25 },
      opacity: { from: 0, to: 1, easing: "easeOut" }, translateY: { from: 15, to: 0, easing: "easeOut" } },
    { id: "res-packet", type: "shape", shapeType: "circle", start: 10.3, end: 12.0, layer: 3,
      x: GAP_CX, y: R1Y, radius: 22,
      fill: "rgb(52 211 153 / 0.95)", shadow: { color: "rgb(52 211 153 / 0.9)", blur: 24 },
      path: { points: [{ x: GAP_R, y: RES_START_Y }, { x: GAP_CX, y: R1Y - 40 }, { x: GAP_L, y: RES_END_Y }], easing: "easeInOut" },
      opacity: { from: 0, to: 1, easing: "easeOut" }, scale: { from: 0.5, to: 1.2, easing: "easeInOut" } },
    { id: "roundtrip-overlay", type: "shape", shapeType: "rect", start: 12.0, end: 13.8, layer: 3,
      x: 70, y: HEADER_Y - 10, width: W - 140, height: STACK_BOTTOM - HEADER_Y + 50, radius: 24,
      fill: { kind: "gradient", from: "rgb(10 18 35 / 0.7)", to: "rgb(10 18 35 / 0.5)", angle: 90 },
      stroke: "rgb(148 163 184 / 0.25)", strokeWidth: 1,
      opacity: { from: 0, to: 0.9, easing: "easeInOut" } },
    { id: "rt-latency", type: "text", start: 12.5, end: 13.8, layer: 5,
      text: "~200ms round trip", x: GAP_CX - 70, y: R2Y + 15, maxWidth: 300,
      fontSize: 22, fontWeight: 500, color: "rgb(251 191 36 / 0.95)",
      shadow: { color: "rgb(251 191 36 / 0.5)", blur: 14 },
      opacity: { from: 0, to: 1, easing: "easeInOut" } },
    { id: "closing-line", type: "text", start: 13.0, end: DUR, layer: 5,
      text: "Every click. Every scroll. Every tap.",
      x: 570, y: 800, maxWidth: 1000,
      fontSize: 48, fontWeight: 700, color: WHITE,
      shadow: { color: "rgb(96 165 250 / 0.6)", blur: 40 },
      opacity: { keyframes: [{ time: 13.0, value: 0, easing: "easeOut" }, { time: 13.6, value: 1, easing: "easeOut" }, { time: 14.5, value: 1, easing: "easeInOut" }, { time: DUR, value: 0, easing: "easeIn" }] },
      translateY: { from: 20, to: 0, easing: "easeOut" } },
    { id: "celebration-burst", type: "particle", start: 13.2, end: DUR, layer: 3,
      count: 35, seed: 303, origin: { x: W/2, y: 820 }, spread: { x: 450, y: 100 },
      drift: { x: 3, y: -15 }, particleRadius: { min: 2.5, max: 6 },
      color: "rgb(251 191 36 / 0.6)", particleOpacity: { min: 0.3, max: 0.7 },
      opacity: { from: 0, to: 1, easing: "easeOut" } },
  ],
};
```

---

## 3. `blueprintProject.ts` — Blueprint / Technical Schematic (15s)

**Vibe:** Deep navy, cyan grid lines, zero fills (wire-frame), strict horizontal packet travel, `linear` easing.

**Key constants:**
- Colors: CYAN=`rgb(0 255 255)`, CYAN_D=`rgb(0 255 255 / 0.35)`, server stroke=`rgb(0 255 160)`
- Grid: 9 horizontal lines (step 120px), 11 vertical lines (step 160px)
- Packet path: strict horizontal at `MID_Y = R1Y + R1H/2`
- Title: "SYSTEM ARCHITECTURE" / "CLIENT — NETWORK — SERVER"
- Outro: "REQUEST COMPLETE // LATENCY ~200ms"

**Unique elements:**
- Array-generated grid lines (horizontal + vertical)
- `radius: 0` on all rects (sharp corners)
- Processing steps prefixed with `> ` (terminal style)

```typescript
// Key snippet — grid generation:
...Array.from({ length: 9 }, (_, i) => ({
  id: `grid-h-${i}`,
  type: "shape" as const, shapeType: "line" as const,
  start: 0.5, end: DUR, layer: 0,
  x1: 0, y1: 120 * (i + 1), x2: W, y2: 120 * (i + 1),
  stroke: "rgb(0 200 255 / 0.06)", lineWidth: 1,
})),

// Processing steps (terminal style):
{ id: "step-validate", type: "text", start: 7.5, end: 10.0, layer: 5,
  text: "> VALIDATE", ... color: "rgb(0 255 160)", translateX: { from: -20, to: 0 } }

// Packet — straight horizontal, linear:
path: { points: [{ x: GAP_L, y: MID_Y }, { x: GAP_CX, y: MID_Y }, { x: GAP_R, y: MID_Y }], easing: "linear" }
```

---

## 4. `brutalistProject.ts` — Brutalist / Raw & Sharp (15s)

**Vibe:** Pure black bg, white/gray palette, single red accent, ALL CAPS, instant snap animations (no easing).

**Key constants:**
- Colors: WHITE=`#ffffff`, GRAY1=`#c0c0c0`, GRAY2=`#808080`, GRAY3=`#404040`, RED=`rgb(220 30 30)`
- All transitions via `snap()` / `snapOut()` helper (0.04s instant)
- Easing: always `"linear"`

**Unique elements:**
- `snap(t)` / `snapOut(t1, t2)` helper fns for hard-cut opacity
- Red underline under title, red separator before outro
- Horizontal divider line in gap between stacks
- Outro: "EVERY REQUEST. EVERY TIME." 64px fontWeight 900

```typescript
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
```

---

## 5. `isometricProject.ts` — Isometric 3D / Depth Illusion (15s)

**Vibe:** Dark blue/green depth effect. Each card has a shadow card offset by `ISO_DX=28, ISO_DY=16`. Packet follows diagonal arc.

**Key constants:**
- `ISO_DX=28, ISO_DY=16` — shadow offset per layer
- `CARD_W=480, CARD_H=120, CARD_R=10`
- Colors: `BLUE_BG_1..3` (progressively darker), `GREEN_BG_1..3`
- Packet arc: diagonal mid-point using `ISO_PATH_SLOPE_X/Y`
- Each card: shadow rect (`cl1-shadow`) + face rect (`cl1-rect`) + label + depth tag "LAYER N"

**Unique elements:**
- Double rect per card (shadow + face)
- "LAYER 1/2/3" depth tags at offset position
- Diagonal packet path: `{ x: GAP_CX - ISO_PATH_SLOPE_X/2, y: L1Y + CARD_H/2 - ISO_PATH_SLOPE_Y*2 }`
- Outro particle: amber drift

```typescript
// Shadow + face card pattern:
{ id: "cl1-shadow", type: "shape", shapeType: "rect",
  x: CL_X + ISO_DX, y: L1Y + ISO_DY,  // offset = depth
  fill: BLUE_BG_3, stroke: BLUE_D },
{ id: "cl1-rect", type: "shape", shapeType: "rect",
  x: CL_X, y: L1Y,  // front face
  fill: BLUE_BG_1, stroke: BLUE_F,
  shadow: { color: "rgb(96 165 250 / 0.5)", blur: 20 } },

// Diagonal packet arc:
path: {
  points: [
    { x: GAP_L, y: L1Y + CARD_H / 2 },
    { x: GAP_CX - ISO_PATH_SLOPE_X / 2, y: L1Y + CARD_H / 2 - ISO_PATH_SLOPE_Y * 2 },
    { x: GAP_R, y: L1Y + CARD_H / 2 },
  ],
  easing: "easeInOut",
}
```

---

## 6. `missionControlProject.ts` — Mission Control / Dashboard HUD (15s)

**Vibe:** Full-width horizontal bands (HUD/dashboard). 6 bands stacked. Status dots. Progress bar tracks. Packet travels vertically down then up.

**Key constants:**
- `BAND_X=100, BAND_W=1720, BAND_H=80, BAND_GAP=14`
- 6 bands: B1Y=180 (Browser), B2Y (HTTP), B3Y (Network), divider, B4Y (REST API), B5Y (Business Logic), B6Y (PostgreSQL)
- `STATUS_X = BAND_X + 22`, `LABEL_X = BAND_X + 55`, `BAR_X = BAND_X + 320`
- Each band: rect + dot (status circle) + label + bar track
- Active highlight rect + status text on right side when processing

**Unique elements:**
- Vertical packet travel (down through client bands → up through server bands)
- Per-band status messages: "● SENDING", "● ENCRYPTING", "● IN TRANSIT", "● RECEIVED — VALIDATING", etc.
- All bands go green overlay at response
- Latency readout: "ROUND TRIP  ~200ms" in amber
- Outro: "Systems nominal." in green

```typescript
// Band structure (repeated x6):
{ id: "b1-rect", type: "shape", shapeType: "rect",
  x: BAND_X, y: B1Y, width: BAND_W, height: BAND_H, radius: 6,
  fill: "rgb(96 165 250 / 0.06)", stroke: BLUE_D },
{ id: "b1-dot", type: "shape", shapeType: "circle",
  x: STATUS_X, y: B1Y + BAND_H/2, radius: 7 },
{ id: "b1-label", type: "text", x: LABEL_X, y: B1Y + ... },
{ id: "b1-bar-track", type: "shape", shapeType: "rect",
  x: BAR_X, y: B1Y + (BAND_H-12)/2, width: BAR_W, height: 12, radius: 6 },

// Vertical packet path:
path: {
  points: [
    { x: BAND_CX, y: B1Y + BAND_H/2 },
    { x: BAND_CX, y: (B3Y + B4Y)/2 + BAND_H/2 },
    { x: BAND_CX, y: B4Y + BAND_H/2 },
  ],
  easing: "easeInOut",
}
```

---

## 7. `neonPulseProject.ts` — Neon Pulse / Cyberpunk (15s)

**Vibe:** Near-black bg, hot-pink + electric-cyan, ghost trails, laser sweeps, dense particles.

**Key constants:**
- Colors: PINK=`rgb(255 0 170)`, ELEC=`rgb(0 200 255)`, PURPLE=`rgb(180 0 255)`
- Client stack: pink theme. Server stack: electric cyan theme.
- Title: "JACK IN." (100px, fontWeight 900, pink glow)
- Ambient: 2 particle systems (pink falling + cyan rising)

**Unique elements:**
- Ghost trail: 2 extra delayed circles per packet (req-ghost-1, req-ghost-2)
- Laser sweep: horizontal line that flashes during packet transfer
- `scale: { from: 0.4, to: 1.3 }` — exaggerated packet scale
- Pulsing rect opacity keyframes on browser + api rects (5-keyframe pulse)
- Response burst on client side (after packet arrives)
- Outro: "CONNECTED." 72px purple with scale-in

```typescript
// Ghost trail pattern:
{ id: "req-ghost-1", type: "shape", shapeType: "circle",
  start: 5.15,  // delayed 0.15s behind main
  radius: 18, fill: "rgb(255 0 170 / 0.4)",
  path: { /* same path as main packet */ } },
{ id: "req-ghost-2", start: 5.3, radius: 12, fill: "rgb(255 0 170 / 0.2)" },

// Laser sweep:
{ id: "laser-sweep", type: "shape", shapeType: "line",
  start: 5.8, end: 6.4,
  x1: GAP_L, y1: R1Y + R1H/2, x2: GAP_R, y2: R1Y + R1H/2,
  stroke: "rgb(255 0 170 / 0.5)", lineWidth: 3,
  opacity: { keyframes: [
    { time: 5.8, value: 0 }, { time: 6.0, value: 1 }, { time: 6.4, value: 0 }
  ]} }
```

---

## 8. `timelineProject.ts` — Timeline / Sequential Filmstrip (15s)

**Vibe:** Horizontal timeline spine, playhead sweeps left→right, 7 events pop above/below alternating.

**Key constants:**
- `TL_Y = H/2 = 540` — timeline center
- `TL_X1=120, TL_X2=1800`
- 7 event X positions: E1X..E7X (at 12%, 28%, 42%, 55%, 67%, 78%, 91% of width)
- Event beat times: T1=4.5, T2=5.5, T3=6.5, T4=7.8, T5=9.0, T6=10.0, T7=11.2
- `ABOVE_Y = TL_Y - 90`, `BELOW_Y = TL_Y + 68`, `TIME_Y = TL_Y + 120`

**Unique elements:**
- Playhead = vertical line + triangle tip, both following path along timeline
- Events alternate above/below (E1 above, E2 below, E3 above, E4 below, ...)
- Each event: dot (bounce scale) + stem line + label + subtitle + optional time label
- E4 (API) and E7 (Response) = bigger dots (r=16), full green
- `scale: { from: 0, to: 1, easing: "bounce" }` on all event dots
- Celebration burst at E7

```typescript
// Playhead (line + tip triangle both use same path):
{ id: "playhead", type: "shape", shapeType: "line",
  x1: TL_X1, y1: TL_Y - 180, x2: TL_X1, y2: TL_Y + 180,
  stroke: AMBER, lineWidth: 3,
  path: {
    points: [{ x: TL_X1, y: TL_Y }, { x: (TL_X1 + E4X)/2, y: TL_Y }, { x: TL_X2, y: TL_Y }],
    easing: "linear",
  } }

// Event marker pattern:
{ id: "e1-dot", shapeType: "circle", x: E1X, y: TL_Y, radius: 12,
  scale: { from: 0, to: 1, easing: "bounce" } }
{ id: "e1-stem", shapeType: "line", x1: E1X, y1: TL_Y-12, x2: E1X, y2: ABOVE_Y+22 }
{ id: "e1-label", text: "Browser", x: E1X-50, y: ABOVE_Y-28, translateY: { from: -8, to: 0 } }
```

---

## 9. `whiteboardProject.ts` — Whiteboard / Minimal Sketch (15s)

**Vibe:** Warm off-white bg, charcoal strokes, handwritten feel, orange (client) + forest green (server), slow linear pacing. No particles.

**Key constants:**
- Background: `#faf9f6 → #f4f2ee` (warm paper)
- 7 faint ruled lines (notebook paper effect) via spread
- Colors: CHARCOAL=`#2c2c2c`, ORANGE=`rgb(210 100 40)`, FOREST=`rgb(55 120 70)`, NAVY=`rgb(40 60 120)`
- All opacity transitions use `easing: "linear"` (deliberate, sketch-like)
- Connectors: `lineWidth: 2`, `arrowSize: 9` (hand-drawn feel)

**Unique elements:**
- Array-generated ruled lines (7 horizontal notebook lines)
- Header + underline divider per stack (client-header-line, server-header-line)
- Request uses arrow line (`req-arrow`) + packet + annotation text
- Response uses arrow line (`res-arrow`) + packet + body text "ok"
- NO particles (clean whiteboard aesthetic)
- Outro: "Every request tells a story." charcoal text

```typescript
// Ruled lines:
...Array.from({ length: 7 }, (_, i) => ({
  id: `rule-${i}`,
  type: "shape" as const, shapeType: "line" as const,
  start: 0, end: DUR, layer: 0,
  x1: 60, y1: 150 + i * 120, x2: W - 60, y2: 150 + i * 120,
  stroke: "rgb(180 175 165 / 0.3)", lineWidth: 1,
}))

// Request arrow (instead of guide line):
{ id: "req-arrow", type: "shape", shapeType: "line",
  x1: GAP_L + 20, y1: R1Y + R1H/2,
  x2: GAP_R - 20, y2: R1Y + R1H/2,
  stroke: NAVY, lineWidth: 2, arrowEnd: true, arrowSize: 10 }
```

---

## Quick Reference — Unique Techniques Per Project

| Project | Signature Technique |
|---------|-------------------|
| **bigDemo** | Arcing packets (curved path via mid-point), pulsing keyframe opacity, celebration burst |
| **blueprint** | Grid via `Array.from`, `radius: 0`, horizontal linear packets, `> CMD` processing labels |
| **brutalist** | `snap()` helper for instant cuts, pure black, red accent, all-caps, `linear` easing only |
| **isometric** | Shadow+face card pairs, diagonal arc, depth tags, per-layer glow rect |
| **missionControl** | Full-width bands, vertical packet travel, per-band status text, progress bar tracks |
| **neonPulse** | Ghost trail circles, laser sweep line, pulsing rect keyframes, exaggerated scale |
| **timeline** | Playhead sweeps path, alternating above/below events, bounce scale dots, filmstrip layout |
| **whiteboard** | Ruled lines, `linear` easing, arrow lines (no guide), no particles, warm paper bg |
| **demo** | Simple promo: slash line, bounce scale circle, minimal events |

---

## Common Patterns

### Opacity fade-in
```typescript
opacity: { from: 0, to: 1, easing: "easeOut" }
```

### Keyframe opacity (fade in, hold, fade out)
```typescript
opacity: {
  keyframes: [
    { time: 0.0, value: 0, easing: "easeOut" },
    { time: 0.6, value: 1, easing: "easeOut" },
    { time: 13.0, value: 1, easing: "easeInOut" },
    { time: 15.0, value: 0, easing: "easeIn" },
  ],
}
```

### Particle burst
```typescript
{ type: "particle",
  count: 25, seed: 101,
  origin: { x: X, y: Y }, spread: { x: 40, y: 35 },
  drift: { x: 50, y: -20 },
  particleRadius: { min: 2, max: 5 },
  color: "rgb(96 165 250 / 0.8)",
  particleOpacity: { min: 0.4, max: 0.85 } }
```

### Animated path (packet)
```typescript
path: {
  points: [{ x: X1, y: Y1 }, { x: XMid, y: YMid }, { x: X2, y: Y2 }],
  easing: "easeInOut",
}
```

### Gradient fill (rect/background)
```typescript
fill: { kind: "gradient", from: "rgb(38 52 78 / 0.95)", to: "rgb(25 38 60 / 0.9)", angle: 180 }
```

### Shadow glow
```typescript
shadow: { color: "rgb(96 165 250 / 0.7)", blur: 25 }
```
