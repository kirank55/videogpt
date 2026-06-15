export type EasingName =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "bounce";

// ── Animated values ──────────────────────────────────────────────────────────

/** Single keyframe in a multi-keyframe animation. `time` is absolute seconds. */
export type Keyframe = {
  time: number;
  value: number;
  easing: EasingName;
};

/** Classic two-point interpolation OR multi-keyframe sequence. */
export type AnimatedValue =
  | { from: number; to: number; easing: EasingName }
  | { keyframes: Keyframe[] };

// ── Shared properties ────────────────────────────────────────────────────────

/** Glow / depth shadow applied via Canvas shadowBlur / shadowColor. */
export type Shadow = {
  color: string;
  blur: number;
  offsetX?: number;
  offsetY?: number;
};

/** Catmull-Rom spline path. Element follows the curve over its lifetime. */
export type PathAnimation = {
  points: { x: number; y: number }[];
  easing: EasingName;
};

/** Gradient fill for shapes (not just backgrounds). */
export type GradientFill = {
  kind: "gradient";
  from: string;
  to: string;
  angle: number;
};

/** Fill value — either a plain CSS color string or a gradient descriptor. */
export type ShapeFill = string | GradientFill;

export type BaseTimelineEvent = {
  id: string;
  start: number;
  end: number;
  layer: number;
  opacity?: AnimatedValue;
  translateX?: AnimatedValue;
  translateY?: AnimatedValue;
  scale?: AnimatedValue;
  rotate?: AnimatedValue;
  shadow?: Shadow;
  path?: PathAnimation;
};

// ── Background ───────────────────────────────────────────────────────────────

export type BackgroundEvent = BaseTimelineEvent & {
  type: "background";
  background:
    | {
        kind: "solid";
        color: string;
      }
    | {
        kind: "gradient";
        from: string;
        to: string;
        angle: number;
      };
};

// ── Text ─────────────────────────────────────────────────────────────────────

export type TextEvent = BaseTimelineEvent & {
  type: "text";
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  color: string;
  fontSize: number;
  fontWeight?: number | string;
  fontFamily?: string;
  lineHeight?: number;
  align?: CanvasTextAlign;
};

// ── Shapes ───────────────────────────────────────────────────────────────────

export type ShapeEvent = BaseTimelineEvent &
  (
    | {
        type: "shape";
        shapeType: "rect";
        x: number;
        y: number;
        width: number;
        height: number;
        radius?: number;
        fill: ShapeFill;
        stroke?: string;
        strokeWidth?: number;
      }
    | {
        type: "shape";
        shapeType: "circle";
        x: number;
        y: number;
        radius: number;
        fill: ShapeFill;
        stroke?: string;
        strokeWidth?: number;
      }
    | {
        type: "shape";
        shapeType: "triangle";
        x: number;
        y: number;
        width: number;
        height: number;
        fill: ShapeFill;
        stroke?: string;
        strokeWidth?: number;
      }
    | {
        type: "shape";
        shapeType: "line";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        stroke: string;
        lineWidth: number;
        lineDash?: number[];
        arrowStart?: boolean;
        arrowEnd?: boolean;
        arrowSize?: number;
      }
  );

// ── Particles ────────────────────────────────────────────────────────────────

export type ParticleEvent = BaseTimelineEvent & {
  type: "particle";
  count: number;
  seed: number;
  origin: { x: number; y: number };
  spread: { x: number; y: number };
  drift: { x: number; y: number };
  particleRadius: { min: number; max: number };
  color: string;
  particleOpacity?: { min: number; max: number };
};

// ── Union ────────────────────────────────────────────────────────────────────

export type TimelineEvent =
  | BackgroundEvent
  | TextEvent
  | ShapeEvent
  | ParticleEvent;

export type VideoProject = {
  id: string;
  name: string;
  width: number;
  height: number;
  duration: number;
  events: TimelineEvent[];
};
