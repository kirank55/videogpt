import type {
  AnimatedValue,
  EasingName,
  TextEvent,
  TimelineEvent,
  VideoProject,
} from "@/lib/renderer/types";

// ── Types ────────────────────────────────────────────────────────────────────

export type IssueSeverity = "error" | "warning" | "info";

export type QualityIssue = {
  eventId: string;
  severity: IssueSeverity;
  code: string;
  message: string;
};

export type QualityResult = {
  score: number;   // 0–100
  passed: boolean; // true when score >= 60 and no errors
  issues: QualityIssue[];
};

/** Legacy alias kept for validateProject consumers. */
export type ValidationResult = {
  eventId: string;
  severity: "error" | "warning";
  message: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function isKeyframed(
  av: AnimatedValue,
): av is { keyframes: { time: number; value: number; easing: EasingName }[] } {
  return "keyframes" in av;
}

function resolveAnimatedBounds(
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

type Bounds = { left: number; top: number; right: number; bottom: number };

function getEventBounds(event: TimelineEvent): Bounds | null {
  const txBounds = resolveAnimatedBounds(event.translateX, 0);
  const tyBounds = resolveAnimatedBounds(event.translateY, 0);
  const scaleBounds = resolveAnimatedBounds(event.scale, 1);
  const maxScale = Math.max(
    Math.abs(scaleBounds.min),
    Math.abs(scaleBounds.max),
  );

  switch (event.type) {
    case "background":
      return null;
    case "text": {
      const left = event.x + txBounds.min;
      const top = event.y + tyBounds.min;
      const right = event.x + event.maxWidth + txBounds.max;
      const bottom = event.y + event.fontSize * 3 + tyBounds.max;
      return scaleBox({ left, top, right, bottom }, maxScale, event.x, event.y);
    }
    case "shape": {
      switch (event.shapeType) {
        case "rect": {
          const left = event.x + txBounds.min;
          const top = event.y + tyBounds.min;
          const right = event.x + event.width + txBounds.max;
          const bottom = event.y + event.height + tyBounds.max;
          const cx = event.x + event.width / 2;
          const cy = event.y + event.height / 2;
          return scaleBox({ left, top, right, bottom }, maxScale, cx, cy);
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
          const cx = event.x + event.width / 2;
          const cy = event.y + event.height / 2;
          return scaleBox({ left, top, right, bottom }, maxScale, cx, cy);
        }
        case "line": {
          const left = Math.min(event.x1, event.x2) + txBounds.min;
          const top = Math.min(event.y1, event.y2) + tyBounds.min;
          const right = Math.max(event.x1, event.x2) + txBounds.max;
          const bottom = Math.max(event.y1, event.y2) + tyBounds.max;
          return { left, top, right, bottom };
        }
      }
      break;
    }
    case "particle": {
      const duration = Math.max(event.end - event.start, 0);
      const maxDriftX = Math.abs(event.drift.x) * 1.5 * duration;
      const maxDriftY = Math.abs(event.drift.y) * 1.5 * duration;
      return {
        left: event.origin.x - event.spread.x - maxDriftX,
        top: event.origin.y - event.spread.y - maxDriftY,
        right: event.origin.x + event.spread.x + maxDriftX,
        bottom: event.origin.y + event.spread.y + maxDriftY,
      };
    }
  }
  return null;
}

function scaleBox(
  bounds: Bounds,
  scale: number,
  cx: number,
  cy: number,
): Bounds {
  if (scale === 1) return bounds;
  return {
    left: cx + (bounds.left - cx) * scale,
    top: cy + (bounds.top - cy) * scale,
    right: cx + (bounds.right - cx) * scale,
    bottom: cy + (bounds.bottom - cy) * scale,
  };
}

function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return (
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top
  );
}

function timeOverlap(a: TimelineEvent, b: TimelineEvent): boolean {
  return a.start < b.end && a.end > b.start;
}

const SAFE_ZONE_MARGIN = 80; // px inset from each canvas edge

// ── Named check functions (used individually in tests + wired by runQualityGate) ─

/**
 * Checks that at least one background event exists.
 * Returns a `NO_BACKGROUND` error if absent.
 */
export function checkBackgroundPresence(project: VideoProject): QualityIssue[] {
  const hasBg = project.events.some((e) => e.type === "background");
  if (hasBg) return [];
  return [
    {
      eventId: "__project__",
      severity: "error",
      code: "NO_BACKGROUND",
      message: "Project has no background event.",
    },
  ];
}

/**
 * Checks per-event timing: negative start, start >= end, end > duration.
 * Returns `EVENT_NEGATIVE_START` and `EVENT_EXCEEDS_DURATION` errors.
 */
export function checkTimingBoundaries(project: VideoProject): QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const ev of project.events) {
    if (ev.start < 0) {
      issues.push({
        eventId: ev.id,
        severity: "error",
        code: "EVENT_NEGATIVE_START",
        message: `start (${ev.start}) is negative`,
      });
    }
    if (ev.start >= ev.end) {
      issues.push({
        eventId: ev.id,
        severity: "error",
        code: "EVENT_NEGATIVE_START",
        message: `start (${ev.start}) >= end (${ev.end})`,
      });
    }
    if (ev.end > project.duration) {
      issues.push({
        eventId: ev.id,
        severity: "error",
        code: "EVENT_EXCEEDS_DURATION",
        message: `end (${ev.end}) exceeds duration (${project.duration})`,
      });
    }
  }
  return issues;
}

/**
 * Checks that background events are on layer 0.
 * Returns `BACKGROUND_WRONG_LAYER` warning if not.
 */
export function checkLayerOrdering(project: VideoProject): QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const ev of project.events) {
    if (ev.type === "background" && ev.layer !== 0) {
      issues.push({
        eventId: ev.id,
        severity: "warning",
        code: "BACKGROUND_WRONG_LAYER",
        message: `Background event is on layer ${ev.layer}, expected 0`,
      });
    }
  }
  return issues;
}

/**
 * Checks text events for readability:
 * - `TEXT_TOO_SMALL` (warning) when fontSize < 16
 * - `TEXT_OUT_OF_SAFE_ZONE` (warning) when text starts outside the safe zone margin
 */
export function checkTextReadability(project: VideoProject): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const { width, height } = project;
  const textEvents = project.events.filter(
    (e): e is TextEvent => e.type === "text",
  );

  for (const ev of textEvents) {
    if (ev.fontSize < 16) {
      issues.push({
        eventId: ev.id,
        severity: "warning",
        code: "TEXT_TOO_SMALL",
        message: `fontSize ${ev.fontSize} is below readable threshold (16)`,
      });
    }
    const outsafeX =
      ev.x < SAFE_ZONE_MARGIN || ev.x > width - SAFE_ZONE_MARGIN;
    const outsafeY =
      ev.y < SAFE_ZONE_MARGIN || ev.y > height - SAFE_ZONE_MARGIN;
    if (outsafeX || outsafeY) {
      issues.push({
        eventId: ev.id,
        severity: "warning",
        code: "TEXT_OUT_OF_SAFE_ZONE",
        message: `Text origin (${ev.x}, ${ev.y}) is outside the ${SAFE_ZONE_MARGIN}px safe zone`,
      });
    }
  }
  return issues;
}

/**
 * Checks content density:
 * - `NO_TEXT_CONTENT` (error) when no text events at all
 * - `NO_TITLE` (warning) when no "title" id text event
 * - `TOO_MANY_TEXT_EVENTS` (info) when > 20 text events
 */
export function checkContentDensity(project: VideoProject): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const textEvents = project.events.filter((e) => e.type === "text");

  if (textEvents.length === 0) {
    issues.push({
      eventId: "__project__",
      severity: "error",
      code: "NO_TEXT_CONTENT",
      message: "Project contains no text events.",
    });
    return issues; // subsequent checks are irrelevant
  }

  const hasTitle = textEvents.some((e) => e.id === "title");
  if (!hasTitle) {
    issues.push({
      eventId: "__project__",
      severity: "warning",
      code: "NO_TITLE",
      message: 'No text event with id "title" found.',
    });
  }

  if (textEvents.length > 20) {
    issues.push({
      eventId: "__project__",
      severity: "info",
      code: "TOO_MANY_TEXT_EVENTS",
      message: `${textEvents.length} text events may crowd the canvas (recommended ≤ 20).`,
    });
  }
  return issues;
}

/**
 * Checks for events whose bounding box is partially or fully off-canvas.
 */
export function checkOffCanvas(project: VideoProject): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const canvas: Bounds = {
    left: 0,
    top: 0,
    right: project.width,
    bottom: project.height,
  };

  for (const ev of project.events) {
    const bounds = getEventBounds(ev);
    if (!bounds) continue;

    const fullyOff =
      bounds.right < 0 ||
      bounds.left > project.width ||
      bounds.bottom < 0 ||
      bounds.top > project.height;

    if (fullyOff) {
      issues.push({
        eventId: ev.id,
        severity: "error",
        code: "EVENT_OFF_CANVAS",
        message: `Fully off-canvas: [${Math.round(bounds.left)}, ${Math.round(bounds.top)}] → [${Math.round(bounds.right)}, ${Math.round(bounds.bottom)}]`,
      });
      continue;
    }

    const partiallyOff =
      bounds.left < 0 ||
      bounds.top < 0 ||
      bounds.right > project.width ||
      bounds.bottom > project.height;

    if (partiallyOff && boundsOverlap(bounds, canvas)) {
      issues.push({
        eventId: ev.id,
        severity: "warning",
        code: "EVENT_PARTIALLY_OFF_CANVAS",
        message: `Partially off-canvas: [${Math.round(bounds.left)}, ${Math.round(bounds.top)}] → [${Math.round(bounds.right)}, ${Math.round(bounds.bottom)}]`,
      });
    }
  }
  return issues;
}

/**
 * Checks for same-layer, same-time, overlapping-bounds collisions.
 */
export function checkLayerCollisions(project: VideoProject): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const nonBg = project.events.filter((e) => e.type !== "background");

  for (let i = 0; i < nonBg.length; i++) {
    for (let j = i + 1; j < nonBg.length; j++) {
      const a = nonBg[i];
      const b = nonBg[j];
      if (a.layer !== b.layer) continue;
      if (!timeOverlap(a, b)) continue;
      const boundsA = getEventBounds(a);
      const boundsB = getEventBounds(b);
      if (!boundsA || !boundsB) continue;
      if (boundsOverlap(boundsA, boundsB)) {
        issues.push({
          eventId: a.id,
          severity: "warning",
          code: "LAYER_COLLISION",
          message: `Layer ${a.layer} collision with "${b.id}" during [${Math.max(a.start, b.start).toFixed(1)}–${Math.min(a.end, b.end).toFixed(1)}s]`,
        });
      }
    }
  }
  return issues;
}

// ── Score ─────────────────────────────────────────────────────────────────────

/**
 * Computes a quality score from an issue list.
 * Formula: `100 - (20 × errors) - (8 × warnings) - (2 × info)`, floor 0.
 */
export function calculateScore(issues: QualityIssue[]): number {
  let penalty = 0;
  for (const issue of issues) {
    if (issue.severity === "error") penalty += 20;
    else if (issue.severity === "warning") penalty += 8;
    else penalty += 2;
  }
  return Math.max(0, 100 - penalty);
}

// ── Main quality gate ────────────────────────────────────────────────────────

/**
 * Runs all checks, computes the score, and returns a consolidated result.
 * `passed` is true when score >= 60 AND there are no errors.
 */
export function runQualityGate(project: VideoProject): QualityResult {
  const issues: QualityIssue[] = [
    ...checkBackgroundPresence(project),
    ...checkTimingBoundaries(project),
    ...checkLayerOrdering(project),
    ...checkTextReadability(project),
    ...checkContentDensity(project),
    ...checkOffCanvas(project),
    ...checkLayerCollisions(project),
  ];

  const score = calculateScore(issues);
  const passed = score >= 60 && !issues.some((i) => i.severity === "error");

  return { score, passed, issues };
}

// ── Legacy adapter ───────────────────────────────────────────────────────────

/**
 * Backwards-compatible wrapper used by existing pipeline code.
 * Returns the same `ValidationResult[]` shape as before.
 */
export function validateProject(project: VideoProject): ValidationResult[] {
  const issues = runQualityGate(project).issues;
  return issues
    .filter((i): i is QualityIssue & { severity: "error" | "warning" } =>
      i.severity === "error" || i.severity === "warning",
    )
    .map((i) => ({
      eventId: i.eventId,
      severity: i.severity,
      message: i.message,
    }));
}
