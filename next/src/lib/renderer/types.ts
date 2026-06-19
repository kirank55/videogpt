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
  scaleX?: AnimatedValue;
  scaleY?: AnimatedValue;
  rotate?: AnimatedValue;
  drawProgress?: AnimatedValue;
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
  backdrop?: {
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    paddingX?: number;
    paddingY?: number;
    radius?: number;
  };
};

// ── Shapes ───────────────────────────────────────────────────────────────────

/** Names available in the built-in icon atlas. */
export type IconName =
  | "browser"
  | "server"
  | "database"
  | "cloud"
  | "lock"
  | "globe"
  | "gear"
  | "code"
  | "api"
  | "mobile"
  | "router"
  | "shield"
  | "cpu"
  | "cache"
  | "app";

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
        startPadding?: number;
        endPadding?: number;
      }
    | {
        /** Canvas-drawn tech icon from the built-in atlas. */
        type: "shape";
        shapeType: "icon";
        /** Icon name from the atlas. */
        iconName: IconName;
        /** Centre x of the icon bounding box. */
        cx: number;
        /** Centre y of the icon bounding box. */
        cy: number;
        /** Diameter of the icon bounding box (icon is drawn to fit). */
        size: number;
        color: string;
        stroke?: string;
        strokeWidth?: number;
      }
    | {
        /** Pill-shaped badge with centred text inside. */
        type: "shape";
        shapeType: "badge";
        cx: number;
        cy: number;
        text: string;
        fontSize?: number;
        /** Horizontal padding on each side of the text. */
        paddingX?: number;
        /** Vertical padding above/below the text. */
        paddingY?: number;
        fill: string;
        textColor: string;
        stroke?: string;
        strokeWidth?: number;
      }
    | {
        /** Horizontal progress bar that fills from 0→1 animated over the event lifetime. */
        type: "shape";
        shapeType: "progress";
        x: number;
        y: number;
        width: number;
        height: number;
        radius?: number;
        /** Track (background) color. */
        trackColor: string;
        /** Fill (foreground) color. */
        fillColor: string;
        /** 0→1 fill progress driven by event lifetime (default). Override with explicit value. */
        fillFraction?: number;
        stroke?: string;
        strokeWidth?: number;
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
