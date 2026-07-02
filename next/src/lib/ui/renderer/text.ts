import { getAnimatedStyle } from "@/lib/ui/renderer/animation";
import type { TextEvent } from "@/lib/ui/renderer/types";

function splitLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(candidate).width <= maxWidth || !currentLine) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function drawTextLines(
  context: CanvasRenderingContext2D,
  event: TextEvent,
  opacity: number,
  offsetX: number,
  offsetY: number,
) {
  context.save();
  context.globalAlpha = opacity;

  // Shadow / glow
  if (event.shadow) {
    context.shadowColor = event.shadow.color;
    context.shadowBlur = event.shadow.blur;
    context.shadowOffsetX = event.shadow.offsetX ?? 0;
    context.shadowOffsetY = event.shadow.offsetY ?? 0;
  }

  context.fillStyle = event.color;
  context.textAlign = event.align ?? "left";
  context.textBaseline = "top";
  context.font = `${event.fontWeight ?? 600} ${event.fontSize}px ${
    event.fontFamily ?? "Inter, Arial, sans-serif"
  }`;

  const lines = splitLines(context, event.text, event.maxWidth);
  const lineHeight = event.lineHeight ?? event.fontSize * 1.15;
  const totalHeight = lines.length * lineHeight;

  let baseY = event.y + offsetY;
  if (event.verticalAlign === "middle") {
    baseY -= totalHeight / 2;
  }

  if (event.backdrop) {
    let maxLineWidth = 0;
    lines.forEach((line) => {
      maxLineWidth = Math.max(maxLineWidth, context.measureText(line).width);
    });

    const padX = event.backdrop.paddingX ?? 10;
    const padY = event.backdrop.paddingY ?? 6;
    const radius = event.backdrop.radius ?? 6;

    let bx = event.x + offsetX;
    const by = baseY - padY;
    const align = event.align ?? "left";

    if (align === "center") {
      bx = event.x + offsetX - maxLineWidth / 2 - padX;
    } else if (align === "right") {
      bx = event.x + offsetX - maxLineWidth - padX;
    } else {
      bx = event.x + offsetX - padX;
    }

    const bw = maxLineWidth + padX * 2;
    const bh = totalHeight + padY * 2;

    context.save();
    context.fillStyle = event.backdrop.fill;
    context.beginPath();
    context.roundRect(bx, by, bw, bh, radius);
    context.fill();

    if (event.backdrop.stroke && event.backdrop.strokeWidth) {
      context.strokeStyle = event.backdrop.stroke;
      context.lineWidth = event.backdrop.strokeWidth;
      context.stroke();
    }
    context.restore();
  }

  lines.forEach((line, index) => {
    context.fillText(line, event.x + offsetX, baseY + index * lineHeight);
  });

  context.restore();
}

export function drawText(
  context: CanvasRenderingContext2D,
  event: TextEvent,
  time: number,
) {
  const { opacity, offsetX, offsetY, pathOffset } = getAnimatedStyle(event, time);

  // Path offset overrides translateX/Y
  const finalOffsetX = pathOffset ? pathOffset.x - event.x : offsetX;
  const finalOffsetY = pathOffset ? pathOffset.y - event.y : offsetY;

  drawTextLines(context, event, opacity, finalOffsetX, finalOffsetY);
}
