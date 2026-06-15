import type {
  AnimatedValue,
  BaseTimelineEvent,
  EasingName,
  PathAnimation,
  TimelineEvent,
} from "@/lib/renderer/types";

// ── Easing functions ─────────────────────────────────────────────────────────

const easingFns: Record<EasingName, (value: number) => number> = {
  linear: (value) => value,
  easeIn: (value) => value * value,
  easeOut: (value) => 1 - (1 - value) * (1 - value),
  easeInOut: (value) =>
    value < 0.5
      ? 2 * value * value
      : 1 - Math.pow(-2 * value + 2, 2) / 2,
  bounce: (value) => {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (value < 1 / d1) {
      return n1 * value * value;
    }

    if (value < 2 / d1) {
      const adjusted = value - 1.5 / d1;
      return n1 * adjusted * adjusted + 0.75;
    }

    if (value < 2.5 / d1) {
      const adjusted = value - 2.25 / d1;
      return n1 * adjusted * adjusted + 0.9375;
    }

    const adjusted = value - 2.625 / d1;
    return n1 * adjusted * adjusted + 0.984375;
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getEventProgress(event: TimelineEvent, time: number) {
  const duration = Math.max(event.end - event.start, 0.0001);
  return clamp((time - event.start) / duration, 0, 1);
}

export function animatedNumber(
  from: number,
  to: number,
  easingFn: (value: number) => number,
  progress: number,
) {
  return from + (to - from) * easingFn(clamp(progress, 0, 1));
}

// ── AnimatedValue resolution (supports both classic and keyframed) ───────────

function isKeyframed(
  av: AnimatedValue,
): av is { keyframes: { time: number; value: number; easing: EasingName }[] } {
  return "keyframes" in av;
}

function resolveKeyframedValue(
  av: { keyframes: { time: number; value: number; easing: EasingName }[] },
  time: number,
): number {
  const { keyframes } = av;
  if (keyframes.length === 0) return 0;
  if (keyframes.length === 1) return keyframes[0].value;

  // Before first keyframe → hold first value
  if (time <= keyframes[0].time) return keyframes[0].value;

  // After last keyframe → hold last value
  if (time >= keyframes[keyframes.length - 1].time) {
    return keyframes[keyframes.length - 1].value;
  }

  // Find surrounding keyframes
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k0 = keyframes[i];
    const k1 = keyframes[i + 1];

    if (time >= k0.time && time <= k1.time) {
      const segmentDuration = Math.max(k1.time - k0.time, 0.0001);
      const localProgress = (time - k0.time) / segmentDuration;
      const easingFn = easingFns[k1.easing]; // easing on the destination keyframe
      return animatedNumber(k0.value, k1.value, easingFn, localProgress);
    }
  }

  return keyframes[keyframes.length - 1].value;
}

function readAnimatedValue(
  animatedValue: AnimatedValue | undefined,
  fallback: number,
  progress: number,
  absoluteTime: number,
) {
  if (!animatedValue) {
    return fallback;
  }

  if (isKeyframed(animatedValue)) {
    return resolveKeyframedValue(animatedValue, absoluteTime);
  }

  return animatedNumber(
    animatedValue.from,
    animatedValue.to,
    easingFns[animatedValue.easing],
    progress,
  );
}

// ── Catmull-Rom spline evaluation ────────────────────────────────────────────

/**
 * Evaluate a Catmull-Rom spline at parameter t (0–1).
 * `points` must have ≥ 2 entries. The spline passes through each point.
 * Phantom control points are mirrored at the ends.
 */
function evaluateCatmullRom(
  points: { x: number; y: number }[],
  t: number,
): { x: number; y: number } {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0 };
  if (n === 1) return { ...points[0] };
  if (t <= 0) return { ...points[0] };
  if (t >= 1) return { ...points[n - 1] };

  // Map t to a segment index
  const totalSegments = n - 1;
  const scaledT = t * totalSegments;
  const segIndex = Math.min(Math.floor(scaledT), totalSegments - 1);
  const localT = scaledT - segIndex;

  // Get the 4 control points (p0, p1, p2, p3) — clamp at ends
  const p0 = points[Math.max(segIndex - 1, 0)];
  const p1 = points[segIndex];
  const p2 = points[Math.min(segIndex + 1, n - 1)];
  const p3 = points[Math.min(segIndex + 2, n - 1)];

  // Catmull-Rom matrix multiplication (tau = 0.5)
  const tt = localT * localT;
  const ttt = tt * localT;

  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * localT +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tt +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * ttt);

  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * localT +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tt +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * ttt);

  return { x, y };
}

function evaluatePathPosition(
  path: PathAnimation,
  progress: number,
): { x: number; y: number } {
  const easedProgress = easingFns[path.easing](clamp(progress, 0, 1));
  return evaluateCatmullRom(path.points, easedProgress);
}

// ── Main style computation ───────────────────────────────────────────────────

export function getAnimatedStyle(event: BaseTimelineEvent, time: number) {
  const progress = getEventProgress(event as TimelineEvent, time);

  const pathOffset = event.path
    ? evaluatePathPosition(event.path, progress)
    : null;

  return {
    opacity: readAnimatedValue(event.opacity, 1, progress, time),
    offsetX: readAnimatedValue(event.translateX, 0, progress, time),
    offsetY: readAnimatedValue(event.translateY, 0, progress, time),
    scale: readAnimatedValue(event.scale, 1, progress, time),
    rotation: readAnimatedValue(event.rotate, 0, progress, time),
    pathOffset,
  };
}
