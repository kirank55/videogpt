import { getAnimatedStyle } from "@/lib/renderer/animation";
import type { GradientFill, ShapeFill, ShapeEvent, IconName } from "@/lib/renderer/types";

// ── Geometry helpers ─────────────────────────────────────────────────────────

function getShapeCenter(event: ShapeEvent) {
  switch (event.shapeType) {
    case "rect":
      return { x: event.x + event.width / 2, y: event.y + event.height / 2 };
    case "circle":
      return { x: event.x, y: event.y };
    case "triangle":
      return { x: event.x + event.width / 2, y: event.y + event.height / 2 };
    case "line":
      return { x: (event.x1 + event.x2) / 2, y: (event.y1 + event.y2) / 2 };
    case "icon":
      return { x: event.cx, y: event.cy };
    case "badge":
      return { x: event.cx, y: event.cy };
    case "progress":
      return { x: event.x + event.width / 2, y: event.y + event.height / 2 };
  }
}

// ── Fill resolution ──────────────────────────────────────────────────────────

function isGradientFill(fill: ShapeFill): fill is GradientFill {
  return typeof fill === "object" && fill.kind === "gradient";
}

function resolveShapeFill(
  context: CanvasRenderingContext2D,
  fill: ShapeFill,
  bounds: { x: number; y: number; width: number; height: number },
): string | CanvasGradient {
  if (!isGradientFill(fill)) {
    return fill;
  }

  const radians = (fill.angle * Math.PI) / 180;
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const halfDiag = Math.sqrt(bounds.width ** 2 + bounds.height ** 2) / 2;

  const dx = Math.cos(radians) * halfDiag;
  const dy = Math.sin(radians) * halfDiag;

  const gradient = context.createLinearGradient(
    cx - dx,
    cy - dy,
    cx + dx,
    cy + dy,
  );
  gradient.addColorStop(0, fill.from);
  gradient.addColorStop(1, fill.to);
  return gradient;
}

// ── Rounded rect path ────────────────────────────────────────────────────────

function buildRoundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

// ── Individual shape draw functions ──────────────────────────────────────────

function drawRectShape(context: CanvasRenderingContext2D, event: ShapeEvent) {
  if (event.shapeType !== "rect") return;

  const bounds = { x: event.x, y: event.y, width: event.width, height: event.height };
  context.fillStyle = resolveShapeFill(context, event.fill, bounds);
  buildRoundedRectPath(context, event.x, event.y, event.width, event.height, event.radius ?? 0);
  context.fill();

  if (event.stroke && event.strokeWidth) {
    context.strokeStyle = event.stroke;
    context.lineWidth = event.strokeWidth;
    context.stroke();
  }
}

function drawCircleShape(context: CanvasRenderingContext2D, event: ShapeEvent, time: number) {
  if (event.shapeType !== "circle") return;

  const bounds = {
    x: event.x - event.radius,
    y: event.y - event.radius,
    width: event.radius * 2,
    height: event.radius * 2,
  };

  const { drawProgress } = getAnimatedStyle(event, time);
  const isOutline = event.fill === "transparent" || event.fill === "none";

  context.beginPath();
  context.fillStyle = resolveShapeFill(context, event.fill, bounds);
  
  if (isOutline && drawProgress < 1) {
    context.arc(event.x, event.y, event.radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * drawProgress);
  } else {
    context.arc(event.x, event.y, event.radius, 0, Math.PI * 2);
  }

  if (!isOutline) {
    context.fill();
  }

  if (event.stroke && event.strokeWidth) {
    context.strokeStyle = event.stroke;
    context.lineWidth = event.strokeWidth;
    context.stroke();
  }
}

function drawTriangleShape(context: CanvasRenderingContext2D, event: ShapeEvent) {
  if (event.shapeType !== "triangle") return;

  const bounds = { x: event.x, y: event.y, width: event.width, height: event.height };

  context.beginPath();
  context.fillStyle = resolveShapeFill(context, event.fill, bounds);
  context.moveTo(event.x + event.width / 2, event.y);
  context.lineTo(event.x + event.width, event.y + event.height);
  context.lineTo(event.x, event.y + event.height);
  context.closePath();
  context.fill();

  if (event.stroke && event.strokeWidth) {
    context.strokeStyle = event.stroke;
    context.lineWidth = event.strokeWidth;
    context.stroke();
  }
}

// ── Arrowhead drawing ────────────────────────────────────────────────────────

function drawArrowhead(
  context: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  angle: number,
  size: number,
  color: string,
) {
  context.save();
  context.fillStyle = color;
  context.translate(tipX, tipY);
  context.rotate(angle);
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(-size, -size / 2);
  context.lineTo(-size, size / 2);
  context.closePath();
  context.fill();
  context.restore();
}

function drawLineShape(context: CanvasRenderingContext2D, event: ShapeEvent, time: number) {
  if (event.shapeType !== "line") return;

  const { drawProgress } = getAnimatedStyle(event, time);

  const startPad = (event as any).startPadding ?? 0;
  const endPad = (event as any).endPadding ?? 0;

  const dx = event.x2 - event.x1;
  const dy = event.y2 - event.y1;
  const angle = Math.atan2(dy, dx);

  const p1X = event.x1 + Math.cos(angle) * startPad;
  const p1Y = event.y1 + Math.sin(angle) * startPad;
  const p2X = event.x2 - Math.cos(angle) * endPad;
  const p2Y = event.y2 - Math.sin(angle) * endPad;

  if (event.lineDash) {
    context.setLineDash(event.lineDash);
  }

  context.beginPath();
  context.strokeStyle = event.stroke;
  context.lineWidth = event.lineWidth;
  context.lineCap = "round";
  
  const currentX2 = p1X + (p2X - p1X) * drawProgress;
  const currentY2 = p1Y + (p2Y - p1Y) * drawProgress;
  
  context.moveTo(p1X, p1Y);
  context.lineTo(currentX2, currentY2);
  context.stroke();

  if (event.lineDash) {
    context.setLineDash([]);
  }

  const size = event.arrowSize ?? event.lineWidth * 3;

  if (event.arrowEnd && drawProgress >= 0.98) {
    drawArrowhead(context, p2X, p2Y, angle, size, event.stroke);
  }

  if (event.arrowStart && drawProgress >= 0.02) {
    drawArrowhead(context, p1X, p1Y, angle + Math.PI, size, event.stroke);
  }
}

// ── Icon atlas ────────────────────────────────────────────────────────────────
//
// All icons are drawn in a normalised [-1, 1] coordinate space,
// then scaled to `size` by the caller. Each function receives a context
// already translated to the icon centre and scaled appropriately.

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

function drawIconShape(context: CanvasRenderingContext2D, event: ShapeEvent) {
  if (event.shapeType !== "icon") return;

  const scale = event.size / 2;
  context.save();
  context.translate(event.cx, event.cy);
  context.scale(scale, scale);
  context.strokeStyle = event.stroke ?? event.color;
  context.fillStyle = event.color;
  context.lineWidth = (event.strokeWidth ?? 1.5) / scale;
  context.lineCap = "round";
  context.lineJoin = "round";

  const drawFn = ICON_ATLAS[event.iconName];
  if (drawFn) drawFn(context);

  context.restore();
}

// ── Badge (pill with centred text) ───────────────────────────────────────────

function drawBadgeShape(context: CanvasRenderingContext2D, event: ShapeEvent) {
  if (event.shapeType !== "badge") return;

  const fontSize = event.fontSize ?? 20;
  const padX = event.paddingX ?? 18;
  const padY = event.paddingY ?? 8;

  context.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
  const textW = context.measureText(event.text).width;
  const badgeW = textW + padX * 2;
  const badgeH = fontSize + padY * 2;
  const r = badgeH / 2;

  context.fillStyle = event.fill;
  buildRoundedRectPath(context, event.cx - badgeW / 2, event.cy - badgeH / 2, badgeW, badgeH, r);
  context.fill();

  if (event.stroke && event.strokeWidth) {
    context.strokeStyle = event.stroke;
    context.lineWidth = event.strokeWidth;
    context.stroke();
  }

  context.fillStyle = event.textColor;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(event.text, event.cx, event.cy);
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function drawProgressShape(
  context: CanvasRenderingContext2D,
  event: ShapeEvent,
  time: number,
) {
  if (event.shapeType !== "progress") return;

  const r = event.radius ?? 4;
  const { x, y, width, height } = event;

  // Track background
  context.fillStyle = event.trackColor;
  buildRoundedRectPath(context, x, y, width, height, r);
  context.fill();

  if (event.stroke && event.strokeWidth) {
    context.strokeStyle = event.stroke;
    context.lineWidth = event.strokeWidth;
    context.stroke();
  }

  // Fill fraction driven by event lifetime unless explicitly overridden
  let fraction = event.fillFraction ?? 0;
  if (event.fillFraction === undefined) {
    const dur = Math.max(event.end - event.start, 0.0001);
    fraction = Math.min(Math.max((time - event.start) / dur, 0), 1);
  }

  if (fraction > 0) {
    const fillW = width * fraction;
    context.fillStyle = event.fillColor;
    buildRoundedRectPath(context, x, y, fillW, height, Math.min(r, fillW / 2));
    context.fill();
  }
}

// ── Shape body dispatch ──────────────────────────────────────────────────────

function drawShapeBody(context: CanvasRenderingContext2D, event: ShapeEvent, time: number) {
  switch (event.shapeType) {
    case "rect":
      drawRectShape(context, event);
      return;
    case "circle":
      drawCircleShape(context, event, time);
      return;
    case "triangle":
      drawTriangleShape(context, event);
      return;
    case "line":
      drawLineShape(context, event, time);
      return;
    case "icon":
      drawIconShape(context, event);
      return;
    case "badge":
      drawBadgeShape(context, event);
      return;
    case "progress":
      drawProgressShape(context, event, time);
      return;
  }
}

// ── Transform + shadow application ───────────────────────────────────────────

function applyShapeTransform(
  context: CanvasRenderingContext2D,
  event: ShapeEvent,
  time: number,
) {
  const { opacity, offsetX, offsetY, scale, scaleX, scaleY, rotation, pathOffset } =
    getAnimatedStyle(event, time);
  const center = getShapeCenter(event);

  const finalOffsetX = pathOffset ? pathOffset.x - center.x : offsetX;
  const finalOffsetY = pathOffset ? pathOffset.y - center.y : offsetY;

  context.save();
  context.globalAlpha = opacity;

  if (event.shadow) {
    context.shadowColor = event.shadow.color;
    context.shadowBlur = event.shadow.blur;
    context.shadowOffsetX = event.shadow.offsetX ?? 0;
    context.shadowOffsetY = event.shadow.offsetY ?? 0;
  }

  context.translate(center.x + finalOffsetX, center.y + finalOffsetY);
  context.rotate((rotation * Math.PI) / 180);
  context.scale(scale * scaleX, scale * scaleY);
  context.translate(-center.x, -center.y);
}

export function drawShape(
  context: CanvasRenderingContext2D,
  event: ShapeEvent,
  time: number,
) {
  applyShapeTransform(context, event, time);
  drawShapeBody(context, event, time);
  context.restore();
}
