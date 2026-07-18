import { VideoProjectSchema } from "@/lib/others/schemas/timeline";
import {
  boundsOverlap,
  getEventBounds,
  timeOverlap,
  type Bounds,
} from "@/lib/ui/renderer/geometry";
import type { TimelineEvent } from "@/lib/ui/renderer";

export type EvaluationDiagnosticCode =
  | "renderer-schema-failure"
  | "renderer-failure"
  | "generation-failure"
  | "degraded-scene"
  | "deterministic-fallback"
  | "unusable-fallback"
  | "excessive-overlap"
  | "missing-motion"
  | "unreadable-text"
  | "generic-layout";

export type EvaluationDiagnostic = {
  code: EvaluationDiagnosticCode;
  severity: 1 | 2 | 3 | 4 | 5;
  message: string;
  eventIds?: string[];
};

const ANIMATED_FIELDS = [
  "opacity",
  "translateX",
  "translateY",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
  "drawProgress",
] as const;

function area(bounds: Bounds): number {
  return Math.max(0, bounds.right - bounds.left) * Math.max(0, bounds.bottom - bounds.top);
}

function overlapRatio(first: Bounds, second: Bounds): number {
  if (!boundsOverlap(first, second)) return 0;
  const intersection = {
    left: Math.max(first.left, second.left),
    top: Math.max(first.top, second.top),
    right: Math.min(first.right, second.right),
    bottom: Math.min(first.bottom, second.bottom),
  };
  return area(intersection) / Math.max(1, Math.min(area(first), area(second)));
}

function excessiveOverlap(events: TimelineEvent[]): string[] | undefined {
  const visible = events.filter((event) => event.type === "text" || event.type === "shape");
  for (let firstIndex = 0; firstIndex < visible.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < visible.length; secondIndex += 1) {
      const first = visible[firstIndex];
      const second = visible[secondIndex];
      if (!timeOverlap(first, second)) continue;
      const isShapePair = first.type === "shape" && second.type === "shape";
      if (
        isShapePair
        && (first.layer !== second.layer
          || first.shapeType === "line"
          || second.shapeType === "line")
      ) {
        continue;
      }
      const firstBounds = getEventBounds(first);
      const secondBounds = getEventBounds(second);
      const threshold = isShapePair ? 0.65 : 0.35;
      if (firstBounds && secondBounds && overlapRatio(firstBounds, secondBounds) > threshold) {
        return [first.id, second.id];
      }
    }
  }
  return undefined;
}

function isAnimated(event: TimelineEvent): boolean {
  const pathMoves = event.path
    ? new Set(event.path.points.map((point) => `${point.x},${point.y}`)).size > 1
    : false;
  return pathMoves || ANIMATED_FIELDS.some((field) => {
    const value = event[field];
    if (!value) return false;
    if ("keyframes" in value) {
      return new Set(value.keyframes.map((keyframe) => keyframe.value)).size > 1;
    }
    return value.from !== value.to;
  });
}

function unreadableEventIds(events: TimelineEvent[]): string[] {
  return events.flatMap((event) => {
    if (event.type === "text" && (event.fontSize < 24 || event.maxWidth < 80)) return [event.id];
    if (event.type === "shape" && event.shapeType === "badge" && (event.fontSize ?? 20) < 24) {
      return [event.id];
    }
    return [];
  });
}

function looksLikeGenericCardLayout(events: TimelineEvent[]): string[] | undefined {
  const rectangles = events.filter(
    (event): event is Extract<TimelineEvent, { type: "shape" }> & { shapeType: "rect" } =>
      event.type === "shape" && event.shapeType === "rect",
  );
  for (let index = 0; index < rectangles.length; index += 1) {
    const first = rectangles[index];
    const row = rectangles.filter((candidate) =>
      timeOverlap(first, candidate)
      && Math.abs(candidate.y - first.y) <= 24
      && Math.abs(candidate.width - first.width) <= Math.max(24, first.width * 0.12)
      && Math.abs(candidate.height - first.height) <= Math.max(24, first.height * 0.12)
    ).sort((left, right) => left.x - right.x);
    if (row.length < 3) continue;
    const gaps = row.slice(1).map((entry, rowIndex) =>
      entry.x - (row[rowIndex].x + row[rowIndex].width)
    );
    if (Math.max(...gaps) - Math.min(...gaps) <= 32) return row.map((entry) => entry.id);
  }
  return undefined;
}

function isDeterministicFallbackEvent(event: TimelineEvent): boolean {
  return /(?:^|-)(?:background-fallback|label-fallback|shape-fallback-\d+)$/
    .test(event.id);
}

export function classifyProjectDiagnostics(project: unknown): EvaluationDiagnostic[] {
  const parsed = VideoProjectSchema.safeParse(project);
  if (!parsed.success) {
    return [{
      code: "renderer-schema-failure",
      severity: 5,
      message: parsed.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join(".") || "project"}: ${issue.message}`)
        .join("; "),
    }];
  }

  const diagnostics: EvaluationDiagnostic[] = [];
  const events = parsed.data.events;
  const contentEvents = events.filter((event) => event.type !== "background");
  const fallbackIds = events
    .filter(isDeterministicFallbackEvent)
    .map((event) => event.id);
  if (fallbackIds.length > 0) {
    diagnostics.push({
      code: "deterministic-fallback",
      severity: 4,
      message: "The normalized project contains deterministic fallback events.",
      eventIds: fallbackIds,
    });
  }
  if (
    contentEvents.length > 0
    && contentEvents.every(isDeterministicFallbackEvent)
  ) {
    diagnostics.push({
      code: "unusable-fallback",
      severity: 5,
      message: "All substantive content events are deterministic fallbacks.",
      eventIds: contentEvents.map((event) => event.id),
    });
  }

  const overlapIds = excessiveOverlap(events);
  if (overlapIds) {
    diagnostics.push({
      code: "excessive-overlap",
      severity: 3,
      message: "Simultaneously visible text and geometry overlap excessively.",
      eventIds: overlapIds,
    });
  }

  if (
    !contentEvents.some(isAnimated)
    && new Set(contentEvents.map((event) => event.start)).size <= 1
  ) {
    diagnostics.push({
      code: "missing-motion",
      severity: 3,
      message: "The project has neither authored animation nor staggered reveals.",
    });
  }

  const unreadableIds = unreadableEventIds(events);
  if (unreadableIds.length > 0) {
    diagnostics.push({
      code: "unreadable-text",
      severity: 3,
      message: "Text falls below the deterministic 24px/80px readability floor.",
      eventIds: unreadableIds,
    });
  }

  const genericIds = looksLikeGenericCardLayout(events);
  if (genericIds) {
    diagnostics.push({
      code: "generic-layout",
      severity: 2,
      message: "Three or more equally sized, evenly spaced cards form a generic row.",
      eventIds: genericIds,
    });
  }

  return diagnostics;
}

function failureDiagnostic(
  code: "generation-failure" | "renderer-failure",
  error: unknown,
): EvaluationDiagnostic {
  return {
    code,
    severity: 5,
    message: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
  };
}

export function generationFailureDiagnostic(error: unknown): EvaluationDiagnostic {
  return failureDiagnostic("generation-failure", error);
}

export function rendererFailureDiagnostic(error: unknown): EvaluationDiagnostic {
  return failureDiagnostic("renderer-failure", error);
}

export function diagnosticFailureSeverity(diagnostics: EvaluationDiagnostic[]): number {
  return diagnostics.reduce((maximum, diagnostic) => Math.max(maximum, diagnostic.severity), 0);
}

export const DISQUALIFYING_DIAGNOSTIC_CODES = [
  "renderer-schema-failure",
  "renderer-failure",
  "generation-failure",
  "degraded-scene",
  "unusable-fallback",
  "unreadable-text",
] as const satisfies readonly EvaluationDiagnosticCode[];

const disqualifyingDiagnosticCodes = new Set<EvaluationDiagnosticCode>(
  DISQUALIFYING_DIAGNOSTIC_CODES,
);

export function hasDisqualifyingDiagnostics(
  diagnostics: EvaluationDiagnostic[],
): boolean {
  return diagnostics.some((diagnostic) =>
    disqualifyingDiagnosticCodes.has(diagnostic.code)
  );
}
