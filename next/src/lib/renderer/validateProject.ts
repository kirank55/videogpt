import type {
  AnimatedValue,
  EasingName,
  TimelineEvent,
  VideoProject,
} from "@/lib/renderer/types";

// ── Types ────────────────────────────────────────────────────────────────────

export type ValidationResult = {
  eventId: string;
  severity: "error" | "warning";
  message: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function isKeyframed(av: AnimatedValue): av is { keyframes: { time: number; value: number; easing: EasingName }[] } {
  return "keyframes" in av;
}

function resolveAnimatedBounds(av: AnimatedValue | undefined, fallback: number): { min: number; max: number } {
  if (!av) return { min: fallback, max: fallback };

  if (isKeyframed(av)) {
    const values = av.keyframes.map((k) => k.value);
    return { min: Math.min(...values), max: Math.max(...values) };
  }

  return {
    min: Math.min(av.from, av.to),
    max: Math.max(av.from, av.to),
  };
}

type Bounds = { left: number; top: number; right: number; bottom: number };

function getEventBounds(event: TimelineEvent): Bounds | null {
  // Compute the worst-case bounding box considering all animation extremes
  const txBounds = resolveAnimatedBounds(event.translateX, 0);
  const tyBounds = resolveAnimatedBounds(event.translateY, 0);
  const scaleBounds = resolveAnimatedBounds(event.scale, 1);

  const maxScale = Math.max(Math.abs(scaleBounds.min), Math.abs(scaleBounds.max));

  switch (event.type) {
    case "background":
      return null; // backgrounds fill the whole canvas
    case "text": {
      // Approximate text bounds (we don't have exact width without rendering)
      const left = event.x + txBounds.min;
      const top = event.y + tyBounds.min;
      const right = event.x + event.maxWidth + txBounds.max;
      const bottom = event.y + event.fontSize * 3 + tyBounds.max; // rough: 3 lines max
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
      // Particle bounds: origin ± spread ± drift * duration
      const duration = Math.max(event.end - event.start, 0);
      const maxDriftX = Math.abs(event.drift.x) * 1.5 * duration; // 1.5 = max driftScale
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

function scaleBox(bounds: Bounds, scale: number, cx: number, cy: number): Bounds {
  if (scale === 1) return bounds;
  return {
    left: cx + (bounds.left - cx) * scale,
    top: cy + (bounds.top - cy) * scale,
    right: cx + (bounds.right - cx) * scale,
    bottom: cy + (bounds.bottom - cy) * scale,
  };
}

function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function timeOverlap(a: TimelineEvent, b: TimelineEvent): boolean {
  return a.start < b.end && a.end > b.start;
}

// ── Validation checks ────────────────────────────────────────────────────────

function checkTiming(event: TimelineEvent, project: VideoProject): ValidationResult[] {
  const results: ValidationResult[] = [];

  if (event.start >= event.end) {
    results.push({
      eventId: event.id,
      severity: "error",
      message: `start (${event.start}) >= end (${event.end})`,
    });
  }

  if (event.start < 0) {
    results.push({
      eventId: event.id,
      severity: "error",
      message: `start (${event.start}) is negative`,
    });
  }

  if (event.end > project.duration) {
    results.push({
      eventId: event.id,
      severity: "error",
      message: `end (${event.end}) exceeds project duration (${project.duration})`,
    });
  }

  return results;
}

function checkKeyframeBounds(event: TimelineEvent): ValidationResult[] {
  const results: ValidationResult[] = [];
  const animProps: (AnimatedValue | undefined)[] = [
    event.opacity,
    event.translateX,
    event.translateY,
    event.scale,
    event.rotate,
  ];

  for (const av of animProps) {
    if (av && isKeyframed(av)) {
      for (const kf of av.keyframes) {
        if (kf.time < event.start) {
          results.push({
            eventId: event.id,
            severity: "error",
            message: `Keyframe time (${kf.time}) is before event start (${event.start})`,
          });
        }
        if (kf.time > event.end) {
          results.push({
            eventId: event.id,
            severity: "error",
            message: `Keyframe time (${kf.time}) is after event end (${event.end})`,
          });
        }
      }
    }
  }

  return results;
}

function checkOffCanvas(
  event: TimelineEvent,
  project: VideoProject,
): ValidationResult[] {
  const bounds = getEventBounds(event);
  if (!bounds) return [];

  const canvasBounds: Bounds = {
    left: 0,
    top: 0,
    right: project.width,
    bottom: project.height,
  };

  // Fully off-screen
  if (
    bounds.right < 0 ||
    bounds.left > project.width ||
    bounds.bottom < 0 ||
    bounds.top > project.height
  ) {
    return [
      {
        eventId: event.id,
        severity: "error",
        message: `Fully off-canvas: bounds [${Math.round(bounds.left)}, ${Math.round(bounds.top)}] → [${Math.round(bounds.right)}, ${Math.round(bounds.bottom)}]`,
      },
    ];
  }

  // Partially off-screen
  if (!boundsOverlap(bounds, canvasBounds) === false) {
    if (
      bounds.left < 0 ||
      bounds.top < 0 ||
      bounds.right > project.width ||
      bounds.bottom > project.height
    ) {
      return [
        {
          eventId: event.id,
          severity: "warning",
          message: `Partially off-canvas: bounds [${Math.round(bounds.left)}, ${Math.round(bounds.top)}] → [${Math.round(bounds.right)}, ${Math.round(bounds.bottom)}]`,
        },
      ];
    }
  }

  return [];
}

function checkLayerCollisions(project: VideoProject): ValidationResult[] {
  const results: ValidationResult[] = [];
  const nonBgEvents = project.events.filter((e) => e.type !== "background");

  for (let i = 0; i < nonBgEvents.length; i++) {
    for (let j = i + 1; j < nonBgEvents.length; j++) {
      const a = nonBgEvents[i];
      const b = nonBgEvents[j];

      if (a.layer !== b.layer) continue;
      if (!timeOverlap(a, b)) continue;

      const boundsA = getEventBounds(a);
      const boundsB = getEventBounds(b);
      if (!boundsA || !boundsB) continue;

      if (boundsOverlap(boundsA, boundsB)) {
        results.push({
          eventId: a.id,
          severity: "warning",
          message: `Layer ${a.layer} collision with "${b.id}" during [${Math.max(a.start, b.start).toFixed(1)}–${Math.min(a.end, b.end).toFixed(1)}s]`,
        });
      }
    }
  }

  return results;
}

// ── Main validator ───────────────────────────────────────────────────────────

export function validateProject(project: VideoProject): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const event of project.events) {
    results.push(...checkTiming(event, project));
    results.push(...checkKeyframeBounds(event));
    results.push(...checkOffCanvas(event, project));
  }

  results.push(...checkLayerCollisions(project));

  return results;
}
