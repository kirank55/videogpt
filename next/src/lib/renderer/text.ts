import { getAnimatedStyle } from "@/lib/renderer/animation";
import type { TextEvent } from "@/lib/renderer/types";

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
  context.fillStyle = event.color;
  context.textAlign = event.align ?? "left";
  context.textBaseline = "top";
  context.font = `${event.fontWeight ?? 600} ${event.fontSize}px ${
    event.fontFamily ?? "Inter, Arial, sans-serif"
  }`;

  const lines = splitLines(context, event.text, event.maxWidth);
  const lineHeight = event.lineHeight ?? event.fontSize * 1.15;

  lines.forEach((line, index) => {
    context.fillText(line, event.x + offsetX, event.y + offsetY + index * lineHeight);
  });

  context.restore();
}

export function drawText(
  context: CanvasRenderingContext2D,
  event: TextEvent,
  time: number,
) {
  const { opacity, offsetX, offsetY } = getAnimatedStyle(event, time);
  drawTextLines(context, event, opacity, offsetX, offsetY);
}
