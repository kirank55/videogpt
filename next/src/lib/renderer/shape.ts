import { getAnimatedStyle } from "@/lib/renderer/animation";
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

function drawCircleShape(context: CanvasRenderingContext2D, event: ShapeEvent) {
  if (event.shapeType !== "circle") return;

  const bounds = {
    x: event.x - event.radius,
    y: event.y - event.radius,
    width: event.radius * 2,
    height: event.radius * 2,
  };

  context.beginPath();
  context.fillStyle = resolveShapeFill(context, event.fill, bounds);
  context.arc(event.x, event.y, event.radius, 0, Math.PI * 2);
  context.fill();

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

function drawLineShape(context: CanvasRenderingContext2D, event: ShapeEvent) {
  if (event.shapeType !== "line") return;

  // Dashed lines
  if (event.lineDash) {
    context.setLineDash(event.lineDash);
  }

  context.beginPath();
  context.strokeStyle = event.stroke;
  context.lineWidth = event.lineWidth;
  context.lineCap = "round";
  context.moveTo(event.x1, event.y1);
  context.lineTo(event.x2, event.y2);
  context.stroke();

  // Reset dash
  if (event.lineDash) {
    context.setLineDash([]);
  }

  // Arrowheads
  const angle = Math.atan2(event.y2 - event.y1, event.x2 - event.x1);
  const size = event.arrowSize ?? event.lineWidth * 3;

  if (event.arrowEnd) {
    drawArrowhead(context, event.x2, event.y2, angle, size, event.stroke);
  }

  if (event.arrowStart) {
    drawArrowhead(context, event.x1, event.y1, angle + Math.PI, size, event.stroke);
  }
}

// ── Shape body dispatch ──────────────────────────────────────────────────────

function drawShapeBody(context: CanvasRenderingContext2D, event: ShapeEvent) {
  switch (event.shapeType) {
    case "rect":
      drawRectShape(context, event);
      return;
    case "circle":
      drawCircleShape(context, event);
      return;
    case "triangle":
      drawTriangleShape(context, event);
      return;
    case "line":
      drawLineShape(context, event);
      return;
  }
}

// ── Transform + shadow application ───────────────────────────────────────────

function applyShapeTransform(
  context: CanvasRenderingContext2D,
  event: ShapeEvent,
  time: number,
) {
  const { opacity, offsetX, offsetY, scale, rotation, pathOffset } =
    getAnimatedStyle(event, time);
  const center = getShapeCenter(event);

  // Path offset overrides translateX/Y
  const finalOffsetX = pathOffset ? pathOffset.x - center.x : offsetX;
  const finalOffsetY = pathOffset ? pathOffset.y - center.y : offsetY;

  context.save();
  context.globalAlpha = opacity;

  // Shadow / glow
  if (event.shadow) {
    context.shadowColor = event.shadow.color;
    context.shadowBlur = event.shadow.blur;
    context.shadowOffsetX = event.shadow.offsetX ?? 0;
    context.shadowOffsetY = event.shadow.offsetY ?? 0;
  }

  context.translate(center.x + finalOffsetX, center.y + finalOffsetY);
  context.rotate((rotation * Math.PI) / 180);
  context.scale(scale, scale);
  context.translate(-center.x, -center.y);
}

export function drawShape(
  context: CanvasRenderingContext2D,
  event: ShapeEvent,
  time: number,
) {
  applyShapeTransform(context, event, time);
  drawShapeBody(context, event);
  context.restore();
}
