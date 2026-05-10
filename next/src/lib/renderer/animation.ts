import type {
  AnimatedValue,
  EasingName,
  TimelineEvent,
} from "@/lib/renderer/types";

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

function readAnimatedValue(
  animatedValue: AnimatedValue | undefined,
  fallback: number,
  progress: number,
) {
  if (!animatedValue) {
    return fallback;
  }

  return animatedNumber(
    animatedValue.from,
    animatedValue.to,
    easingFns[animatedValue.easing],
    progress,
  );
}

export function getAnimatedStyle(event: TimelineEvent, time: number) {
  const progress = getEventProgress(event, time);

  return {
    opacity: readAnimatedValue(event.opacity, 1, progress),
    offsetX: readAnimatedValue(event.translateX, 0, progress),
    offsetY: readAnimatedValue(event.translateY, 0, progress),
    scale: readAnimatedValue(event.scale, 1, progress),
    rotation: readAnimatedValue(event.rotate, 0, progress),
  };
}
