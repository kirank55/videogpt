import { getAnimatedStyle } from "@/lib/renderer/animation";
import type { ShapeEvent } from "@/lib/renderer/types";

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

function drawRectShape(context: CanvasRenderingContext2D, event: ShapeEvent) {
  if (event.shapeType !== "rect") {
    return;
  }

  context.fillStyle = event.fill;
  buildRoundedRectPath(
    context,
    event.x,
    event.y,
    event.width,
    event.height,
    event.radius ?? 0,
  );
  context.fill();
}

function drawCircleShape(context: CanvasRenderingContext2D, event: ShapeEvent) {
  if (event.shapeType !== "circle") {
    return;
  }

  context.beginPath();
  context.fillStyle = event.fill;
  context.arc(event.x, event.y, event.radius, 0, Math.PI * 2);
  context.fill();
}

function drawTriangleShape(context: CanvasRenderingContext2D, event: ShapeEvent) {
  if (event.shapeType !== "triangle") {
    return;
  }

  context.beginPath();
  context.fillStyle = event.fill;
  context.moveTo(event.x + event.width / 2, event.y);
  context.lineTo(event.x + event.width, event.y + event.height);
  context.lineTo(event.x, event.y + event.height);
  context.closePath();
  context.fill();
}

function drawLineShape(context: CanvasRenderingContext2D, event: ShapeEvent) {
  if (event.shapeType !== "line") {
    return;
  }

  context.beginPath();
  context.strokeStyle = event.stroke;
  context.lineWidth = event.lineWidth;
  context.lineCap = "round";
  context.moveTo(event.x1, event.y1);
  context.lineTo(event.x2, event.y2);
  context.stroke();
}

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

function applyShapeTransform(
  context: CanvasRenderingContext2D,
  event: ShapeEvent,
  time: number,
) {
  const { opacity, offsetX, offsetY, scale, rotation } = getAnimatedStyle(
    event,
    time,
  );
  const center = getShapeCenter(event);

  context.save();
  context.globalAlpha = opacity;
  context.translate(center.x + offsetX, center.y + offsetY);
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
