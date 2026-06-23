import { getAnimatedStyle } from "@/lib/renderer/animation";
import { drawIcon } from "@/lib/renderer/iconAtlas";
import type { GradientFill, ShapeFill, ShapeEvent } from "@/lib/renderer/types";

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

// ── Icon shape — delegates to iconAtlas ──────────────────────────────────────

function drawIconShape(context: CanvasRenderingContext2D, event: ShapeEvent) {
  if (event.shapeType !== "icon") return;
  drawIcon(event.iconName, context, event.cx, event.cy, event.size, event.stroke ?? event.color, event.strokeWidth ?? 1.5);
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
