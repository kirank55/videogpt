// ── Geometry ──────────────────────────────────────────────────────────────────
//
// Owns TimelineEvent spatial geometry: animation ranges, fill-opacity checks,
// shape centres, and event bounding boxes. The single source of truth so the
// quality gate, the analyser, and the view layer stop re-deriving shape geometry
// across three modules. The interface is the test surface for "where does this
// event sit on the canvas, and how far can it move."

import type {
  AnimatedValue,
  EasingName,
  ShapeFill,
  ShapeEvent,
  TimelineEvent,
} from "@/lib/ui/renderer/types";

export type Bounds = { left: number; top: number; right: number; bottom: number };

type TextLikeEvent = Extract<TimelineEvent, { type: "text" }>;

// ── AnimatedValue helpers ─────────────────────────────────────────────────────

/** Type guard for the multi-keyframe variant of an AnimatedValue. */
export function isKeyframed(
  av: AnimatedValue,
): av is { keyframes: { time: number; value: number; easing: EasingName }[] } {
  return "keyframes" in av;
}

/** Min/max range an AnimatedValue can take across its whole lifetime. */
export function resolveAnimatedBounds(
  av: AnimatedValue | undefined,
  fallback: number,
): { min: number; max: number } {
  if (!av) return { min: fallback, max: fallback };
  if (isKeyframed(av)) {
    const values = av.keyframes.map((k) => k.value);
    return { min: Math.min(...values), max: Math.max(...values) };
  }
  return { min: Math.min(av.from, av.to), max: Math.max(av.from, av.to) };
}

// ── Fill helpers ──────────────────────────────────────────────────────────────

/** True for transparent or very-low-alpha fills (glows, highlights, overlays). */
export function isLowOpacityFill(fill: ShapeFill): boolean {
  if (typeof fill === "string") {
    return fill === "transparent" || /\/\s*0\.[0-2]\d*\)/.test(fill);
  }
  return /\/\s*0\.[0-2]\d*\)/.test(fill.from) || /\/\s*0\.[0-2]\d*\)/.test(fill.to);
}

// ── Centres ───────────────────────────────────────────────────────────────────

/** Geometric centre of a shape event, by shapeType. */
export function getShapeCenter(event: ShapeEvent): { x: number; y: number } {
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

/** Centre of any renderable event (text or shape); {0,0} for background/particle. */
export function getEventCenter(event: TimelineEvent): { x: number; y: number } {
  if (event.type === "text") return { x: event.x, y: event.y };
  if (event.type === "shape") return getShapeCenter(event);
  return { x: 0, y: 0 };
}

// ── Bounds ────────────────────────────────────────────────────────────────────

function scaleBox(bounds: Bounds, scale: number, cx: number, cy: number): Bounds {
  if (scale === 1) return bounds;
  return {
    left: cx + (bounds.left - cx) * scale,
    top: cy + (bounds.top - cy) * scale,
    right: cx + (bounds.right - cx) * scale,
    bottom: cy + (bounds.bottom - cy) * scale,
  };
}

function estimateTextLineCount(text: string, fontSize: number, maxWidth: number): number {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;

  const charWidth = fontSize * 0.58;
  let lines = 1;
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length * charWidth <= maxWidth || !current) {
      current = candidate;
    } else {
      lines += 1;
      current = word;
    }
  }
  return lines;
}

function getTextHeight(event: TextLikeEvent): number {
  const lineHeight = event.lineHeight ?? event.fontSize * 1.15;
  return estimateTextLineCount(event.text, event.fontSize, event.maxWidth) * lineHeight;
}

function getTextTop(event: TextLikeEvent, y: number, height: number): number {
  if (event.verticalAlign === "middle") return y - height / 2;
  if (event.verticalAlign === "bottom") return y - height;
  return y;
}

/** Static (un-animated) bounding box of an event, or null for background/particle. */
export function getStaticEventBounds(event: TimelineEvent): Bounds | null {
  switch (event.type) {
    case "background":
      return null;
    case "text": {
      const align = event.align ?? "left";
      let left = event.x;
      let right = event.x + event.maxWidth;
      if (align === "center") {
        left = event.x - event.maxWidth / 2;
        right = event.x + event.maxWidth / 2;
      } else if (align === "right") {
        left = event.x - event.maxWidth;
        right = event.x;
      }
      const height = getTextHeight(event);
      const top = getTextTop(event, event.y, height);
      const bottom = top + height;
      return { left, top, right, bottom };
    }
    case "shape": {
      switch (event.shapeType) {
        case "rect":
          return { left: event.x, top: event.y, right: event.x + event.width, bottom: event.y + event.height };
        case "circle": {
          const r = event.radius;
          return { left: event.x - r, top: event.y - r, right: event.x + r, bottom: event.y + r };
        }
        case "triangle":
          return { left: event.x, top: event.y, right: event.x + event.width, bottom: event.y + event.height };
        case "line":
          return {
            left: Math.min(event.x1, event.x2),
            top: Math.min(event.y1, event.y2),
            right: Math.max(event.x1, event.x2),
            bottom: Math.max(event.y1, event.y2),
          };
        case "icon":
          return {
            left: event.cx - event.size / 2,
            top: event.cy - event.size / 2,
            right: event.cx + event.size / 2,
            bottom: event.cy + event.size / 2,
          };
        case "badge": {
          const fontSize = event.fontSize ?? 20;
          const padX = event.paddingX ?? 18;
          const padY = event.paddingY ?? 8;
          const width = event.text.length * fontSize * 0.58 + padX * 2;
          const height = fontSize + padY * 2;
          return {
            left: event.cx - width / 2,
            top: event.cy - height / 2,
            right: event.cx + width / 2,
            bottom: event.cy + height / 2,
          };
        }
        case "progress":
          return { left: event.x, top: event.y, right: event.x + event.width, bottom: event.y + event.height };
      }
      break;
    }
    case "particle":
      return null;
  }
  return null;
}

/** Animated bounding box (extremes across the full animation range), or null. */
export function getEventBounds(event: TimelineEvent): Bounds | null {
  const txBounds = resolveAnimatedBounds(event.translateX, 0);
  const tyBounds = resolveAnimatedBounds(event.translateY, 0);
  const scaleBounds = resolveAnimatedBounds(event.scale, 1);
  const maxScale = Math.max(Math.abs(scaleBounds.min), Math.abs(scaleBounds.max));

  switch (event.type) {
    case "background":
      return null;
    case "text": {
      const align = event.align ?? "left";
      let left = event.x + txBounds.min;
      let right = event.x + event.maxWidth + txBounds.max;
      if (align === "center") {
        left = event.x - event.maxWidth / 2 + txBounds.min;
        right = event.x + event.maxWidth / 2 + txBounds.max;
      } else if (align === "right") {
        left = event.x - event.maxWidth + txBounds.min;
        right = event.x + txBounds.max;
      }
      const height = getTextHeight(event);
      const baseTop = getTextTop(event, event.y, height);
      const top = baseTop + tyBounds.min;
      const bottom = baseTop + height + tyBounds.max;
      return scaleBox({ left, top, right, bottom }, maxScale, event.x, event.y);
    }
    case "shape": {
      switch (event.shapeType) {
        case "rect": {
          const left = event.x + txBounds.min;
          const top = event.y + tyBounds.min;
          const right = event.x + event.width + txBounds.max;
          const bottom = event.y + event.height + tyBounds.max;
          const c = getShapeCenter(event);
          return scaleBox({ left, top, right, bottom }, maxScale, c.x, c.y);
        }
        case "circle": {
          const r = event.radius * maxScale;
          return {
            left: event.x - r + txBounds.min,
            top: event.y - r + tyBounds.min,
            right: event.x + r + txBounds.max,
            bottom: event.y + r + tyBounds.max,
          };
        }
        case "triangle": {
          const left = event.x + txBounds.min;
          const top = event.y + tyBounds.min;
          const right = event.x + event.width + txBounds.max;
          const bottom = event.y + event.height + tyBounds.max;
          const c = getShapeCenter(event);
          return scaleBox({ left, top, right, bottom }, maxScale, c.x, c.y);
        }
        case "line":
          return {
            left: Math.min(event.x1, event.x2) + txBounds.min,
            top: Math.min(event.y1, event.y2) + tyBounds.min,
            right: Math.max(event.x1, event.x2) + txBounds.max,
            bottom: Math.max(event.y1, event.y2) + tyBounds.max,
          };
        case "icon": {
          const left = event.cx - event.size / 2 + txBounds.min;
          const top = event.cy - event.size / 2 + tyBounds.min;
          const right = event.cx + event.size / 2 + txBounds.max;
          const bottom = event.cy + event.size / 2 + tyBounds.max;
          return scaleBox({ left, top, right, bottom }, maxScale, event.cx, event.cy);
        }
        case "badge": {
          const fontSize = event.fontSize ?? 20;
          const padX = event.paddingX ?? 18;
          const padY = event.paddingY ?? 8;
          const width = event.text.length * fontSize * 0.58 + padX * 2;
          const height = fontSize + padY * 2;
          const left = event.cx - width / 2 + txBounds.min;
          const top = event.cy - height / 2 + tyBounds.min;
          const right = event.cx + width / 2 + txBounds.max;
          const bottom = event.cy + height / 2 + tyBounds.max;
          return scaleBox({ left, top, right, bottom }, maxScale, event.cx, event.cy);
        }
        case "progress": {
          const left = event.x + txBounds.min;
          const top = event.y + tyBounds.min;
          const right = event.x + event.width + txBounds.max;
          const bottom = event.y + event.height + tyBounds.max;
          const c = getShapeCenter(event);
          return scaleBox({ left, top, right, bottom }, maxScale, c.x, c.y);
        }
      }
      break;
    }
    case "particle":
      return null;
  }
  return null;
}

// ── Overlap tests ─────────────────────────────────────────────────────────────

export function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function timeOverlap(a: TimelineEvent, b: TimelineEvent): boolean {
  return a.start < b.end && a.end > b.start;
}
