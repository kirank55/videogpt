import { seededHash } from "@/lib/agent/brief/briefHelpers";
import type { SupportedDuration } from "@/lib/agent/schemas/brief";
import {
  MainDiagramPartContentSchema,
  type MainDiagramPartContent,
} from "@/lib/agent/videoParts/schemas";
import type {
  AnimatedValue,
  TimelineEvent,
  VideoProject,
} from "@/lib/others/schemas/timeline";
import { getAnimatedStyle } from "@/lib/ui/renderer/animation";
import {
  boundsOverlap,
  getShapeCenter,
  getStaticEventBounds,
  type Bounds,
} from "@/lib/ui/renderer/geometry";

export const DIRECT_TIMELINE_WIDTH = 1920;
export const DIRECT_TIMELINE_HEIGHT = 1080;
const CANVAS_BLEED = 192;
const MIN_LABEL_FONT_SIZE = 24;
const MIN_LABEL_WIDTH = 80;
const TITLE_FONT_SIZE = 32;
const MIN_BACKDROP_ALPHA = 0.7;
const RECOMMENDED_LABEL_GAP = 8;
const MAX_MINOR_LABEL_OVERLAP_RATIO = 0.15;
const VISIBLE_OPACITY = 0.15;

type TextTimelineEvent = Extract<TimelineEvent, { type: "text" }>;
type BadgeTimelineEvent = Extract<TimelineEvent, { type: "shape" }> & {
  shapeType: "badge";
};
type LabelTimelineEvent = TextTimelineEvent | BadgeTimelineEvent;

export class DirectTimelineValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(issues.join("; "));
    this.name = "DirectTimelineValidationError";
  }
}

function intersectsCanvas(bounds: Bounds): boolean {
  return bounds.right >= -CANVAS_BLEED
    && bounds.left <= DIRECT_TIMELINE_WIDTH + CANVAS_BLEED
    && bounds.bottom >= -CANVAS_BLEED
    && bounds.top <= DIRECT_TIMELINE_HEIGHT + CANVAS_BLEED;
}

function sampledTimes(event: TimelineEvent): number[] {
  const steps = 40;
  return Array.from(
    { length: steps + 1 },
    (_, index) => event.start + ((event.end - event.start) * index) / steps,
  );
}

function shiftedBounds(bounds: Bounds, x: number, y: number): Bounds {
  return {
    left: bounds.left + x,
    top: bounds.top + y,
    right: bounds.right + x,
    bottom: bounds.bottom + y,
  };
}

function transformedShapeBounds(
  event: Extract<TimelineEvent, { type: "shape" }>,
  time: number,
): Bounds {
  const bounds = getStaticEventBounds(event)!;
  const center = getShapeCenter(event);
  const style = getAnimatedStyle(event, time);
  const offsetX = style.pathOffset ? style.pathOffset.x - center.x : style.offsetX;
  const offsetY = style.pathOffset ? style.pathOffset.y - center.y : style.offsetY;
  const radians = (style.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const scaleX = style.scale * style.scaleX;
  const scaleY = style.scale * style.scaleY;
  const corners = [
    [bounds.left, bounds.top],
    [bounds.right, bounds.top],
    [bounds.right, bounds.bottom],
    [bounds.left, bounds.bottom],
  ].map(([x, y]) => {
    const localX = (x - center.x) * scaleX;
    const localY = (y - center.y) * scaleY;
    return {
      x: center.x + offsetX + localX * cos - localY * sin,
      y: center.y + offsetY + localX * sin + localY * cos,
    };
  });
  return {
    left: Math.min(...corners.map((point) => point.x)),
    top: Math.min(...corners.map((point) => point.y)),
    right: Math.max(...corners.map((point) => point.x)),
    bottom: Math.max(...corners.map((point) => point.y)),
  };
}

function particleBounds(event: Extract<TimelineEvent, { type: "particle" }>): Bounds {
  const duration = event.end - event.start;
  const radius = event.particleRadius.max;
  const driftX = event.drift.x * 1.5 * duration;
  const driftY = event.drift.y * 1.5 * duration;
  return {
    left: event.origin.x - Math.abs(event.spread.x) + Math.min(0, driftX) - radius,
    top: event.origin.y - Math.abs(event.spread.y) + Math.min(0, driftY) - radius,
    right: event.origin.x + Math.abs(event.spread.x) + Math.max(0, driftX) + radius,
    bottom: event.origin.y + Math.abs(event.spread.y) + Math.max(0, driftY) + radius,
  };
}

function eventIntersectsCanvas(event: TimelineEvent): boolean {
  if (event.type === "background") return true;
  if (event.type === "particle") return intersectsCanvas(particleBounds(event));
  const staticBounds = getStaticEventBounds(event);
  if (!staticBounds) return false;
  return sampledTimes(event).some((time) => {
    if (event.type === "shape") return intersectsCanvas(transformedShapeBounds(event, time));
    const style = getAnimatedStyle(event, time);
    const offsetX = style.pathOffset ? style.pathOffset.x - event.x : style.offsetX;
    const offsetY = style.pathOffset ? style.pathOffset.y - event.y : style.offsetY;
    return intersectsCanvas(shiftedBounds(staticBounds, offsetX, offsetY));
  });
}

function pathIntersectsCanvas(event: TimelineEvent): boolean {
  if (!event.path) return true;
  return sampledTimes(event).some((time) => {
    const point = getAnimatedStyle(event, time).pathOffset;
    return point ? intersectsCanvas({
      left: point.x,
      top: point.y,
      right: point.x,
      bottom: point.y,
    }) : false;
  });
}

function animatedValueChanges(value: AnimatedValue | undefined): boolean {
  if (!value) return false;
  if ("from" in value) return value.from !== value.to;
  return new Set(value.keyframes.map((keyframe) => keyframe.value)).size > 1;
}

function maxAnimatedValue(value: AnimatedValue | undefined, fallback: number): number {
  if (!value) return fallback;
  if ("from" in value) return Math.max(value.from, value.to);
  return Math.max(...value.keyframes.map((keyframe) => keyframe.value));
}

function pathChanges(event: TimelineEvent): boolean {
  return Boolean(
    event.path
    && new Set(event.path.points.map((point) => `${point.x},${point.y}`)).size > 1,
  );
}

function canBecomeVisible(event: TimelineEvent): boolean {
  return maxAnimatedValue(event.opacity, 1) > 0.05;
}

function hasAuthoredAnimation(event: TimelineEvent): boolean {
  if (event.type === "background") return false;
  if (event.type === "particle") {
    const particleOpacity = event.particleOpacity?.max ?? 1;
    return canBecomeVisible(event) && particleOpacity > 0.05;
  }
  if (event.type === "text") {
    return [event.opacity, event.translateX, event.translateY].some(animatedValueChanges)
      || pathChanges(event);
  }

  const commonShapeMotion = [
    event.opacity,
    event.translateX,
    event.translateY,
    event.scale,
    event.scaleX,
    event.scaleY,
    event.rotate,
  ].some(animatedValueChanges) || pathChanges(event);
  if (commonShapeMotion) return true;
  if (event.shapeType === "progress" && event.fillFraction === undefined) return true;
  return (event.shapeType === "line" || event.shapeType === "circle")
    && animatedValueChanges(event.drawProgress);
}

function droppedPropertyPaths(
  raw: unknown,
  parsed: unknown,
  path = "",
): string[] {
  if (Array.isArray(raw) && Array.isArray(parsed)) {
    return raw.flatMap((value, index) =>
      droppedPropertyPaths(value, parsed[index], `${path}.${index}`)
    );
  }
  if (!raw || typeof raw !== "object" || !parsed || typeof parsed !== "object") {
    return [];
  }

  const rawRecord = raw as Record<string, unknown>;
  const parsedRecord = parsed as Record<string, unknown>;
  return Object.keys(rawRecord).flatMap((key) => {
    if (rawRecord[key] === undefined) return [];
    const propertyPath = path ? `${path}.${key}` : key;
    if (!Object.prototype.hasOwnProperty.call(parsedRecord, key)) return [propertyPath];
    return droppedPropertyPaths(rawRecord[key], parsedRecord[key], propertyPath);
  });
}

function colorAlpha(color: string): number {
  const normalized = color.trim().toLowerCase();
  if (normalized === "transparent") return 0;

  const hex = normalized.match(/^#([0-9a-f]{4}|[0-9a-f]{8})$/i)?.[1];
  if (hex) {
    const alphaHex = hex.length === 4 ? `${hex[3]}${hex[3]}` : hex.slice(6, 8);
    return parseInt(alphaHex, 16) / 255;
  }

  const legacyAlpha = normalized.match(/^(?:rgba|hsla)\((?:[^,]+,){3}\s*([\d.]+%?)\s*\)$/)?.[1];
  const slashAlpha = normalized.match(/\/[\s]*([\d.]+%?)[\s]*\)$/)?.[1];
  const alpha = legacyAlpha ?? slashAlpha;
  if (!alpha) return 1;
  return alpha.endsWith("%")
    ? Math.min(1, Math.max(0, parseFloat(alpha) / 100))
    : Math.min(1, Math.max(0, parseFloat(alpha)));
}

function isSemibold(fontWeight: string | number | undefined): boolean {
  if (fontWeight === undefined) return true; // The renderer defaults to 600.
  if (typeof fontWeight === "number") return fontWeight >= 600;
  const numericWeight = Number(fontWeight);
  if (Number.isFinite(numericWeight)) return numericWeight >= 600;
  return fontWeight.toLowerCase() === "bold" || fontWeight.toLowerCase() === "bolder";
}

function textReadabilityIssues(
  event: TextTimelineEvent,
  index: number,
): string[] {
  const prefix = `events.${index}: readable text event "${event.id}"`;
  const issues: string[] = [];
  if (event.text.trim().length === 0) issues.push(`${prefix} must not be empty`);
  if (event.fontSize < MIN_LABEL_FONT_SIZE) {
    issues.push(`${prefix} fontSize must be at least ${MIN_LABEL_FONT_SIZE}px`);
  }
  if (event.maxWidth < MIN_LABEL_WIDTH) {
    issues.push(`${prefix} maxWidth must be at least ${MIN_LABEL_WIDTH}px`);
  }
  if (event.color.trim().toLowerCase() === "transparent" || !canBecomeVisible(event)) {
    issues.push(`${prefix} must use a visible text color and opacity`);
  }

  if (event.fontSize < TITLE_FONT_SIZE) {
    if (!isSemibold(event.fontWeight)) {
      issues.push(`${prefix} fontWeight must be at least 600`);
    }
    if (!event.backdrop) {
      issues.push(`${prefix} needs a high-contrast backdrop because it is smaller than ${TITLE_FONT_SIZE}px`);
    } else if (colorAlpha(event.backdrop.fill) < MIN_BACKDROP_ALPHA) {
      issues.push(`${prefix} backdrop opacity must be at least ${MIN_BACKDROP_ALPHA}`);
    }
  }
  return issues;
}

function isLabelEvent(event: TimelineEvent): event is LabelTimelineEvent {
  return event.type === "text" || (event.type === "shape" && event.shapeType === "badge");
}

function estimatedTextLines(event: TextTimelineEvent): string[] {
  const words = event.text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  const charWidth = event.fontSize * 0.58;
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length * charWidth <= event.maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function textBoundsAtTime(event: TextTimelineEvent, time: number): Bounds {
  const lines = estimatedTextLines(event);
  const charWidth = event.fontSize * 0.58;
  const width = Math.max(...lines.map((line) => line.length * charWidth));
  const lineHeight = event.lineHeight ?? event.fontSize * 1.15;
  const height = lines.length * lineHeight;
  const paddingX = event.backdrop?.paddingX ?? 0;
  const paddingY = event.backdrop?.paddingY ?? 0;
  const align = event.align ?? "left";
  const verticalAlign = event.verticalAlign ?? "top";
  const style = getAnimatedStyle(event, time);
  const offsetX = style.pathOffset ? style.pathOffset.x - event.x : style.offsetX;
  const offsetY = style.pathOffset ? style.pathOffset.y - event.y : style.offsetY;

  let left = event.x + offsetX;
  if (align === "center") left -= width / 2;
  if (align === "right") left -= width;

  let top = event.y + offsetY;
  if (verticalAlign === "middle") top -= height / 2;
  if (verticalAlign === "bottom") top -= height;

  return {
    left: left - paddingX,
    top: top - paddingY,
    right: left + width + paddingX,
    bottom: top + height + paddingY,
  };
}

function labelBoundsAtTime(event: LabelTimelineEvent, time: number): Bounds {
  return event.type === "text"
    ? textBoundsAtTime(event, time)
    : transformedShapeBounds(event, time);
}

function overlapRatioOfSmallerBounds(first: Bounds, second: Bounds): number {
  if (!boundsOverlap(first, second)) return 0;
  const overlapWidth = Math.min(first.right, second.right) - Math.max(first.left, second.left);
  const overlapHeight = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
  const overlapArea = overlapWidth * overlapHeight;
  const firstArea = (first.right - first.left) * (first.bottom - first.top);
  const secondArea = (second.right - second.left) * (second.bottom - second.top);
  const smallerArea = Math.min(firstArea, secondArea);
  return smallerArea > 0 ? overlapArea / smallerArea : 0;
}

function labelsCollideDuringSharedLifetime(
  first: LabelTimelineEvent,
  second: LabelTimelineEvent,
): boolean {
  const start = Math.max(first.start, second.start);
  const end = Math.min(first.end, second.end);
  if (start >= end) return false;

  const steps = 40;
  return Array.from(
    { length: steps + 1 },
    (_, index) => start + ((end - start) * index) / steps,
  ).some((time) => {
    if (
      getAnimatedStyle(first, time).opacity <= VISIBLE_OPACITY
      || getAnimatedStyle(second, time).opacity <= VISIBLE_OPACITY
    ) {
      return false;
    }
    return overlapRatioOfSmallerBounds(
      labelBoundsAtTime(first, time),
      labelBoundsAtTime(second, time),
    ) > MAX_MINOR_LABEL_OVERLAP_RATIO;
  });
}

function labelCollisionIssues(events: TimelineEvent[]): string[] {
  const labels = events.filter(isLabelEvent);
  const issues: string[] = [];
  for (let firstIndex = 0; firstIndex < labels.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < labels.length; secondIndex += 1) {
      const first = labels[firstIndex];
      const second = labels[secondIndex];
      if (labelsCollideDuringSharedLifetime(first, second)) {
        issues.push(
          `events: readable label "${first.id}" overlaps significantly with "${second.id}" during their shared visible time; aim for ${RECOMMENDED_LABEL_GAP}px between their text/backdrop bounds or make their active times disjoint`,
        );
      }
    }
  }
  return issues;
}

/** Validates the duration- and canvas-dependent contract without rewriting authored events. */
export function validateDirectTimelineContent(
  raw: unknown,
  duration: SupportedDuration,
): MainDiagramPartContent {
  const content = MainDiagramPartContentSchema.parse(raw);
  const issues: string[] = [];
  const droppedPaths = droppedPropertyPaths(raw, content);
  if (droppedPaths.length > 0) {
    issues.push(`unsupported properties are not allowed: ${droppedPaths.slice(0, 8).join(", ")}`);
  }
  const ids = new Set<string>();

  content.events.forEach((event, index) => {
    if (ids.has(event.id)) {
      issues.push(`events.${index}.id: TimelineEvent ids must be unique; "${event.id}" is duplicated`);
    }
    ids.add(event.id);

    if (event.start < 0 || event.end <= event.start || event.end > duration) {
      issues.push(
        `events.${index}: start/end must satisfy 0 <= start < end <= requested duration ${duration}s`,
      );
    }

    if (!eventIntersectsCanvas(event)) {
      issues.push(`events.${index}: "${event.id}" does not intersect the canvas or permitted bleed area`);
    }
    if (!pathIntersectsCanvas(event)) {
      issues.push(`events.${index}.path: "${event.id}" has a path entirely outside the canvas`);
    }
    if (event.type === "text") {
      issues.push(...textReadabilityIssues(event, index));
    }
    if (event.type === "shape" && event.shapeType === "badge" && (event.fontSize ?? 20) < MIN_LABEL_FONT_SIZE) {
      issues.push(
        `events.${index}: readable badge "${event.id}" fontSize must be at least ${MIN_LABEL_FONT_SIZE}px`,
      );
    }
  });
  issues.push(...labelCollisionIssues(content.events));

  const hasFullBackground = content.events.some((event) =>
    event.type === "background" && event.start === 0 && event.end === duration
  );
  if (!hasFullBackground) {
    issues.push(`events: include at least one background spanning the full requested duration 0-${duration}s`);
  }

  const textCount = content.events.filter((event) => event.type === "text").length;
  if (textCount === 0) issues.push("events: include at least one readable text label");

  const shapeCount = content.events.filter((event) => event.type === "shape").length;
  if (shapeCount < 3) issues.push("events: include at least three shape events for the diagram");

  const revealStarts = new Set(
    content.events.filter((event) => event.type !== "background").map((event) => event.start),
  );
  const hasVisibleMotion = content.events.some(hasAuthoredAnimation) || revealStarts.size > 1;
  if (!hasVisibleMotion) {
    issues.push("events: include visible animation or staggered reveals");
  }

  if (issues.length > 0) throw new DirectTimelineValidationError(issues);
  return content;
}

/** Wraps validated direct events in server-owned VideoProject metadata. */
export function buildDirectTimelineProject(
  raw: unknown,
  duration: SupportedDuration,
): VideoProject {
  const content = validateDirectTimelineContent(raw, duration);
  const hash = seededHash(JSON.stringify({ content, duration })).toString(16);
  return {
    id: `direct-main-${hash}`,
    name: content.name,
    width: DIRECT_TIMELINE_WIDTH,
    height: DIRECT_TIMELINE_HEIGHT,
    duration,
    events: content.events,
  };
}
