// ── Icon Atlas ────────────────────────────────────────────────────────────────
//
// All icons are drawn in a normalised [-1, 1] coordinate space, then scaled to
// `size` by drawIcon().  Adding a new icon means:
//   1. Write an `iconXxx(ctx)` function below.
//   2. Add an entry to ICON_ATLAS.
//   3. Add the name to IconName in types.ts and ICON_NAMES in schemas/brief.ts.
//
// External interface (the only thing callers need):
//
//   drawIcon(name, ctx, cx, cy, size, color)
//
// Everything else is an implementation detail.

import type { IconName } from "@/lib/renderer/types";

// ── Internal draw functions ───────────────────────────────────────────────────
// Each function receives a context already translated to the icon centre and
// scaled so that 1 unit = half the requested icon size.

type IconDrawFn = (ctx: CanvasRenderingContext2D) => void;

function iconBrowser(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.roundRect(-0.9, -0.9, 1.8, 1.8, 0.15);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.9, -0.55);
  ctx.lineTo(0.9, -0.55);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-0.65 + i * 0.25, -0.72, 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.roundRect(-0.65, -0.45, 1.3, 0.18, 0.05);
  ctx.stroke();
}

function iconServer(ctx: CanvasRenderingContext2D) {
  for (let i = 0; i < 3; i++) {
    const y = -0.72 + i * 0.5;
    ctx.beginPath();
    ctx.roundRect(-0.8, y, 1.6, 0.38, 0.08);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0.6, y + 0.19, 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
}

function iconDatabase(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.ellipse(0, -0.55, 0.75, 0.22, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0.55, 0.75, 0.22, 0, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.75, -0.55);
  ctx.lineTo(-0.75, 0.55);
  ctx.moveTo(0.75, -0.55);
  ctx.lineTo(0.75, 0.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.75, 0.22, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function iconCloud(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.arc(-0.32, 0.1, 0.42, Math.PI * 0.7, Math.PI * 1.95);
  ctx.arc(0, -0.28, 0.38, Math.PI * 1.2, Math.PI * 1.85);
  ctx.arc(0.42, 0.05, 0.34, Math.PI * 1.5, Math.PI * 0.1);
  ctx.arc(0.18, 0.35, 0.26, -0.05, Math.PI);
  ctx.arc(-0.48, 0.35, 0.22, 0, Math.PI * 0.85);
  ctx.closePath();
  ctx.stroke();
}

function iconLock(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.arc(0, -0.22, 0.44, Math.PI, 0);
  ctx.lineTo(0.44, 0.08);
  ctx.moveTo(-0.44, 0.08);
  ctx.lineTo(-0.44, -0.22);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-0.58, 0.08, 1.16, 0.72, 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0.42, 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.08, 0.5);
  ctx.lineTo(0.08, 0.5);
  ctx.lineTo(0.05, 0.72);
  ctx.lineTo(-0.05, 0.72);
  ctx.closePath();
  ctx.fill();
}

function iconGlobe(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.arc(0, 0, 0.85, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.85, 0.32, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -0.85);
  ctx.lineTo(0, 0.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.85, 0);
  ctx.lineTo(0.85, 0);
  ctx.stroke();
}

function iconGear(ctx: CanvasRenderingContext2D) {
  const teeth = 8;
  const innerR = 0.45;
  const outerR = 0.75;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2 - 0.15;
    const a1 = a0 + 0.15;
    const a2 = a1 + 0.08;
    const a3 = a2 + 0.15;
    ctx.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    ctx.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
    ctx.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
    ctx.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 0.22, 0, Math.PI * 2);
  ctx.stroke();
}

function iconCode(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(-0.25, -0.4);
  ctx.lineTo(-0.75, 0);
  ctx.lineTo(-0.25, 0.4);
  ctx.moveTo(0.25, -0.4);
  ctx.lineTo(0.75, 0);
  ctx.lineTo(0.25, 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.15, -0.55);
  ctx.lineTo(-0.15, 0.55);
  ctx.stroke();
}

function iconApi(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.roundRect(-0.8, -0.5, 1.6, 1.0, 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -0.5);
  ctx.lineTo(0, -0.85);
  ctx.moveTo(-0.35, 0.5);
  ctx.lineTo(-0.35, 0.85);
  ctx.moveTo(0.35, 0.5);
  ctx.lineTo(0.35, 0.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -0.85, 0.07, 0, Math.PI * 2);
  ctx.arc(-0.35, 0.85, 0.07, 0, Math.PI * 2);
  ctx.arc(0.35, 0.85, 0.07, 0, Math.PI * 2);
  ctx.fill();
}

function iconMobile(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.roundRect(-0.45, -0.9, 0.9, 1.8, 0.18);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0.65, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.45, 0.45);
  ctx.lineTo(0.45, 0.45);
  ctx.stroke();
}

function iconRouter(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.roundRect(-0.8, -0.15, 1.6, 0.55, 0.1);
  ctx.stroke();
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 0.45, -0.15);
    ctx.lineTo(i * 0.55, -0.65);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(i * 0.55, -0.65, 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(-0.5 + i * 0.32, 0.17, 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
}

function iconShield(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(0, -0.9);
  ctx.lineTo(0.78, -0.52);
  ctx.lineTo(0.78, 0.18);
  ctx.quadraticCurveTo(0.78, 0.75, 0, 0.9);
  ctx.quadraticCurveTo(-0.78, 0.75, -0.78, 0.18);
  ctx.lineTo(-0.78, -0.52);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.3, 0.1);
  ctx.lineTo(-0.05, 0.4);
  ctx.lineTo(0.38, -0.2);
  ctx.stroke();
}

function iconCpu(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.roundRect(-0.55, -0.55, 1.1, 1.1, 0.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-0.3, -0.3, 0.6, 0.6, 0.05);
  ctx.stroke();
  const pins = [-0.35, -0.1, 0.15, 0.4];
  for (const p of pins) {
    ctx.beginPath();
    ctx.moveTo(p, -0.55);
    ctx.lineTo(p, -0.8);
    ctx.moveTo(p, 0.55);
    ctx.lineTo(p, 0.8);
    ctx.moveTo(-0.55, p);
    ctx.lineTo(-0.8, p);
    ctx.moveTo(0.55, p);
    ctx.lineTo(0.8, p);
    ctx.stroke();
  }
}

function iconCache(ctx: CanvasRenderingContext2D) {
  for (let i = 0; i < 3; i++) {
    const y = -0.5 + i * 0.42;
    ctx.beginPath();
    ctx.ellipse(0, y + 0.38, 0.72, 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (i < 2) {
      ctx.beginPath();
      ctx.moveTo(-0.72, y + 0.38);
      ctx.lineTo(-0.72, y + 0.38 + 0.42);
      ctx.moveTo(0.72, y + 0.38);
      ctx.lineTo(0.72, y + 0.38 + 0.42);
      ctx.stroke();
    }
  }
}

function iconApp(ctx: CanvasRenderingContext2D) {
  const tile = 0.38;
  const positions: [number, number][] = [
    [-0.5, -0.5], [0.5, -0.5],
    [-0.5, 0.5],  [0.5, 0.5],
  ];
  for (const [cx, cy] of positions) {
    ctx.beginPath();
    ctx.roundRect(cx - tile / 2, cy - tile / 2, tile, tile, 0.07);
    ctx.stroke();
  }
}

// ── Atlas registry ────────────────────────────────────────────────────────────

const ICON_ATLAS: Record<IconName, IconDrawFn> = {
  browser:  iconBrowser,
  server:   iconServer,
  database: iconDatabase,
  cloud:    iconCloud,
  lock:     iconLock,
  globe:    iconGlobe,
  gear:     iconGear,
  code:     iconCode,
  api:      iconApi,
  mobile:   iconMobile,
  router:   iconRouter,
  shield:   iconShield,
  cpu:      iconCpu,
  cache:    iconCache,
  app:      iconApp,
};

// ── External interface ────────────────────────────────────────────────────────

/**
 * Draw a named icon centred at (cx, cy) with the given size and color.
 *
 * This is the only export — callers never touch the individual draw functions
 * or the ICON_ATLAS record.  Unknown names are silently ignored.
 */
export function drawIcon(
  name: IconName,
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  strokeWidth = 1.5,
) {
  const drawFn = ICON_ATLAS[name];
  if (!drawFn) return;

  const scale = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = strokeWidth / scale;
  ctx.lineCap     = "round";
  ctx.lineJoin    = "round";

  drawFn(ctx);

  ctx.restore();
}
