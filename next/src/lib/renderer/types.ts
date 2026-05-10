export type EasingName =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "bounce";

export type AnimatedValue = {
  from: number;
  to: number;
  easing: EasingName;
};

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
};

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
        fill: string;
      }
    | {
        type: "shape";
        shapeType: "circle";
        x: number;
        y: number;
        radius: number;
        fill: string;
      }
    | {
        type: "shape";
        shapeType: "triangle";
        x: number;
        y: number;
        width: number;
        height: number;
        fill: string;
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
      }
  );

export type TimelineEvent = BackgroundEvent | TextEvent | ShapeEvent;

export type VideoProject = {
  id: string;
  name: string;
  width: number;
  height: number;
  duration: number;
  events: TimelineEvent[];
};
