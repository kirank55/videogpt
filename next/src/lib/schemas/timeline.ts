/**
 * src/lib/schemas/timeline.ts
 *
 * Zod schemas for the VideoProject type hierarchy.
 * These mirror `renderer/types.ts` and are the single source of truth for
 * runtime validation at API boundaries (parse + strip unknown keys).
 *
 * Inferred TypeScript types are re-exported so consumers can import from
 * one place instead of maintaining two parallel type files.
 */

import { z } from "zod";

// ── Primitives ────────────────────────────────────────────────────────────────

export const EasingNameSchema = z.enum([
  "linear",
  "easeIn",
  "easeOut",
  "easeInOut",
  "bounce",
]);

// ── Animation ─────────────────────────────────────────────────────────────────

export const KeyframeSchema = z.object({
  time: z.number(),
  value: z.number(),
  easing: EasingNameSchema,
});

export const AnimatedValueSchema = z.union([
  z.object({ from: z.number(), to: z.number(), easing: EasingNameSchema }),
  z.object({ keyframes: z.array(KeyframeSchema).min(1) }),
]);

// ── Shared decorators ─────────────────────────────────────────────────────────

export const ShadowSchema = z.object({
  color: z.string(),
  blur: z.number().nonnegative(),
  offsetX: z.number().optional(),
  offsetY: z.number().optional(),
});

export const PathPointSchema = z.object({ x: z.number(), y: z.number() });

export const PathAnimationSchema = z.object({
  points: z.array(PathPointSchema).min(2),
  easing: EasingNameSchema,
});

export const GradientFillSchema = z.object({
  kind: z.literal("gradient"),
  from: z.string(),
  to: z.string(),
  angle: z.number(),
});

/** A shape fill — either a CSS color string or a gradient descriptor. */
export const ShapeFillSchema = z.union([z.string(), GradientFillSchema]);

// ── Base event ────────────────────────────────────────────────────────────────

export const BaseTimelineEventSchema = z.object({
  id: z.string().min(1),
  start: z.number().nonnegative(),
  end: z.number().positive(),
  layer: z.number().int().nonnegative(),
  opacity: AnimatedValueSchema.optional(),
  translateX: AnimatedValueSchema.optional(),
  translateY: AnimatedValueSchema.optional(),
  scale: AnimatedValueSchema.optional(),
  rotate: AnimatedValueSchema.optional(),
  shadow: ShadowSchema.optional(),
  path: PathAnimationSchema.optional(),
});

// ── Background ────────────────────────────────────────────────────────────────

const BackgroundSolidSchema = z.object({ kind: z.literal("solid"), color: z.string() });
const BackgroundGradientSchema = z.object({
  kind: z.literal("gradient"),
  from: z.string(),
  to: z.string(),
  angle: z.number(),
});

/** Discriminated union on `kind`. Add `"image"` here in a future phase. */
export const BackgroundPropertiesSchema = z.discriminatedUnion("kind", [
  BackgroundSolidSchema,
  BackgroundGradientSchema,
]);

export const BackgroundEventSchema = BaseTimelineEventSchema.extend({
  type: z.literal("background"),
  background: BackgroundPropertiesSchema,
});

// ── Text ──────────────────────────────────────────────────────────────────────

export const TextPropertiesSchema = z.object({
  text: z.string(),
  x: z.number(),
  y: z.number(),
  maxWidth: z.number().positive(),
  color: z.string(),
  fontSize: z.number().positive(),
  fontWeight: z.union([z.number(), z.string()]).optional(),
  fontFamily: z.string().optional(),
  lineHeight: z.number().optional(),
  align: z
    .enum(["left", "right", "center", "start", "end"])
    .optional(),
});

export const TextEventSchema = BaseTimelineEventSchema.merge(
  TextPropertiesSchema,
).extend({ type: z.literal("text") });

// ── Shapes ────────────────────────────────────────────────────────────────────

const RectPropertiesSchema = z.object({
  shapeType: z.literal("rect"),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  radius: z.number().nonnegative().optional(),
  fill: ShapeFillSchema,
  stroke: z.string().optional(),
  strokeWidth: z.number().nonnegative().optional(),
});

const CirclePropertiesSchema = z.object({
  shapeType: z.literal("circle"),
  x: z.number(),
  y: z.number(),
  radius: z.number().positive(),
  fill: ShapeFillSchema,
  stroke: z.string().optional(),
  strokeWidth: z.number().nonnegative().optional(),
});

const TrianglePropertiesSchema = z.object({
  shapeType: z.literal("triangle"),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  fill: ShapeFillSchema,
  stroke: z.string().optional(),
  strokeWidth: z.number().nonnegative().optional(),
});

const LinePropertiesSchema = z.object({
  shapeType: z.literal("line"),
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  stroke: z.string(),
  lineWidth: z.number().positive(),
  lineDash: z.array(z.number()).optional(),
  arrowStart: z.boolean().optional(),
  arrowEnd: z.boolean().optional(),
  arrowSize: z.number().optional(),
});

/**
 * Discriminated union on `shapeType`.
 * We extend BaseTimelineEventSchema instead of merging so the `type: "shape"`
 * literal lives at the event level, not inside the shape properties.
 */
export const ShapePropertiesSchema = z.discriminatedUnion("shapeType", [
  RectPropertiesSchema,
  CirclePropertiesSchema,
  TrianglePropertiesSchema,
  LinePropertiesSchema,
]);

export const ShapeEventSchema = BaseTimelineEventSchema.extend({
  type: z.literal("shape"),
}).and(ShapePropertiesSchema);

// ── Particles ─────────────────────────────────────────────────────────────────

export const ParticleEventSchema = BaseTimelineEventSchema.extend({
  type: z.literal("particle"),
  count: z.number().int().positive(),
  seed: z.number().int().nonnegative(),
  origin: PathPointSchema,
  spread: PathPointSchema,
  drift: PathPointSchema,
  particleRadius: z.object({ min: z.number(), max: z.number() }),
  color: z.string(),
  particleOpacity: z.object({ min: z.number(), max: z.number() }).optional(),
});

// ── Union ─────────────────────────────────────────────────────────────────────

/**
 * Full discriminated union on `type`.
 * ShapeEventSchema uses `.and()` so it isn't a simple object — we use
 * z.union here rather than z.discriminatedUnion.
 */
export const TimelineEventSchema = z.union([
  BackgroundEventSchema,
  TextEventSchema,
  ShapeEventSchema,
  ParticleEventSchema,
]);

// ── VideoProject ──────────────────────────────────────────────────────────────

export const VideoProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  duration: z.number().positive(),
  events: z.array(TimelineEventSchema),
});

// ── Inferred types ────────────────────────────────────────────────────────────
// Re-export so consumers can import types from this file without touching
// renderer/types.ts (reduces cross-package coupling).

export type EasingName = z.infer<typeof EasingNameSchema>;
export type Keyframe = z.infer<typeof KeyframeSchema>;
export type AnimatedValue = z.infer<typeof AnimatedValueSchema>;
export type Shadow = z.infer<typeof ShadowSchema>;
export type PathAnimation = z.infer<typeof PathAnimationSchema>;
export type GradientFill = z.infer<typeof GradientFillSchema>;
export type ShapeFill = z.infer<typeof ShapeFillSchema>;
export type BackgroundProperties = z.infer<typeof BackgroundPropertiesSchema>;
export type TextProperties = z.infer<typeof TextPropertiesSchema>;
export type ShapeProperties = z.infer<typeof ShapePropertiesSchema>;
export type BackgroundEvent = z.infer<typeof BackgroundEventSchema>;
export type TextEvent = z.infer<typeof TextEventSchema>;
export type ShapeEvent = z.infer<typeof ShapeEventSchema>;
export type ParticleEvent = z.infer<typeof ParticleEventSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type VideoProject = z.infer<typeof VideoProjectSchema>;
