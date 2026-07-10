import { z } from "zod";
import { EasingNameSchema } from "@/lib/others/schemas/timeline";

// Supported durations ---------------------------------------------------------

export const SUPPORTED_DURATIONS = [5, 10, 15, 20] as const;
export type SupportedDuration = (typeof SUPPORTED_DURATIONS)[number];

export const SupportedDurationSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
  z.literal(20),
]);

export function resolveDuration(
  value: unknown,
  fallback: SupportedDuration = 5,
): SupportedDuration {
  return typeof value === "number" && (SUPPORTED_DURATIONS as readonly number[]).includes(value)
    ? (value as SupportedDuration)
    : fallback;
}

// Catalog keys ----------------------------------------------------------------

export const STYLE_PRESET_KEYS = [
  "modern",
  "brutalist",
  "sketch",
  "neon-glow",
  "minimal",
] as const;

export type StylePreset = (typeof STYLE_PRESET_KEYS)[number];
export const StylePresetSchema = z.enum(STYLE_PRESET_KEYS);

export const TRANSITION_PRESETS = [
  "none",
  "fade",
  "slide-left",
  "slide-right",
  "zoom-in",
  "zoom-out",
] as const;

export type TransitionPreset = (typeof TRANSITION_PRESETS)[number];
export const TransitionPresetSchema = z.enum(TRANSITION_PRESETS);

export const ICON_NAMES = [
  "browser",
  "server",
  "database",
  "cloud",
  "lock",
  "globe",
  "gear",
  "code",
  "api",
  "mobile",
  "router",
  "shield",
  "cpu",
  "cache",
  "app",
  "building",
  "foundation",
  "beam",
  "floor",
  "elevator",
  "wall",
  "wrench",
  "water",
] as const;

export type IconName = (typeof ICON_NAMES)[number];
export const IconNameSchema = z.enum(ICON_NAMES);

export type { EasingName } from "@/lib/others/schemas/timeline";

// Scene contract --------------------------------------------------------------

export const DiagramLayoutSchema = z.enum([
  "pipeline",
  "client-server",
  "hub-spoke",
  "stack",
]);
export type DiagramLayout = z.infer<typeof DiagramLayoutSchema>;

export const DiagramFamilySchema = z.enum([
  "graph-flow",
  "spatial-cutaway",
  "field-range",
  "build-up",
  "cycle",
  "comparison",
  "timeline",
]);
export type DiagramFamily = z.infer<typeof DiagramFamilySchema>;

export const DiagramPerspectiveSchema = z.enum([
  "top-down",
  "side-elevation",
  "cross-section",
  "orbit",
  "abstract",
]);
export type DiagramPerspective = z.infer<typeof DiagramPerspectiveSchema>;

export const LayoutRoleSchema = z.enum([
  "client",
  "server",
  "shared",
  "hub",
  "spoke",
  "source",
  "step",
  "sink",
]);
export type LayoutRole = z.infer<typeof LayoutRoleSchema>;

export const EntryAnimationSchema = z.enum([
  "slide-up",
  "slide-down",
  "slide-left",
  "slide-right",
  "fade-only",
  "scale-up",
  "bounce-in",
]);
export type EntryAnimation = z.infer<typeof EntryAnimationSchema>;

export const BlockStyleSchema = z.enum(["stacked", "cards", "timeline", "numbered"]);
export type BlockStyle = z.infer<typeof BlockStyleSchema>;

export const TitleSizeSchema = z.enum(["small", "medium", "large", "hero"]);
export type TitleSize = z.infer<typeof TitleSizeSchema>;

export const ClosingStyleSchema = z.enum(["fade-up", "fade-center", "none"]);
export type ClosingStyle = z.infer<typeof ClosingStyleSchema>;

export const BlockSchema = z.object({
  heading: z.string().min(1),
  description: z.string().min(1),
  icon: IconNameSchema.optional(),
});
export type BriefBlock = z.infer<typeof BlockSchema>;

export const DiagramScriptSchema = z.object({
  summary: z.string().min(1),
  beats: z.array(z.string().min(1)).min(1),
  visualStory: z.string().min(1),
  mustShow: z.array(z.string().min(1)).default([]),
  mustAvoid: z.array(z.string().min(1)).optional(),
});
export type DiagramScript = z.infer<typeof DiagramScriptSchema>;

export const DiagramIntentSchema = z.object({
  family: DiagramFamilySchema,
  subject: z.string().min(1),
  perspective: DiagramPerspectiveSchema.optional(),
  signatureVisuals: z.array(z.string().min(1)).default([]),
  motionCues: z.array(z.string().min(1)).default([]),
  avoid: z.array(z.string().min(1)).optional(),
});
export type DiagramIntent = z.infer<typeof DiagramIntentSchema>;

export const GraphNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  icon: IconNameSchema.optional(),
  kind: z.string().optional(),
  layoutRole: LayoutRoleSchema.optional(),
  color: z.string().optional(),
});
export type BriefGraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
  animated: z.boolean().optional(),
  packetLabel: z.string().optional(),
  packetColor: z.string().optional(),
});
export type BriefGraphEdge = z.infer<typeof GraphEdgeSchema>;

export const GraphSchema = z.object({
  nodes: z.array(GraphNodeSchema).min(1),
  edges: z.array(GraphEdgeSchema).default([]),
});
export type BriefGraph = z.infer<typeof GraphSchema>;

export const PrimitiveTimingRoleSchema = z.enum([
  "setup",
  "reveal-mechanism",
  "highlight-result",
  "loop",
  "background",
]);
export type PrimitiveTimingRole = z.infer<typeof PrimitiveTimingRoleSchema>;

export const DrawingRoleSchema = z.enum([
  "mass",
  "container",
  "layer",
  "support",
  "path",
  "flow",
  "ring",
  "pin",
  "panel",
  "label",
  "background",
]);
export type DrawingRole = z.infer<typeof DrawingRoleSchema>;

export const VisualPrimitiveSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  renderAs: z.string().optional(),
  shapeHint: z.string().optional(),
  materialHint: z.string().optional(),
  role: z.string().optional(),
  placementHint: z.string().optional(),
  motion: z.string().optional(),
  styleHint: z.string().optional(),
  dependsOn: z.array(z.string().min(1)).optional(),
  drawingRole: DrawingRoleSchema.optional(),
});
export type VisualPrimitive = z.infer<typeof VisualPrimitiveSchema>;

export const PrimitiveRelationshipSchema = z.object({
  from: z.array(z.string().min(1)).min(1),
  to: z.array(z.string().min(1)).min(1),
  relation: z.string().min(1),
  visualMetaphor: z.string().optional(),
  motion: z.string().optional(),
  timingRole: PrimitiveTimingRoleSchema.optional(),
});
export type PrimitiveRelationship = z.infer<typeof PrimitiveRelationshipSchema>;

export const StoryboardOperationSchema = z.enum([
  "reveal",
  "grow",
  "connect",
  "fill",
  "pulse",
  "trace",
  "move",
]);
export type StoryboardOperation = z.infer<typeof StoryboardOperationSchema>;

export const StoryboardStageSchema = z.object({
  label: z.string().min(1),
  operation: StoryboardOperationSchema,
  primitiveIds: z.array(z.string().min(1)).min(1),
});
export type StoryboardStage = z.infer<typeof StoryboardStageSchema>;

export const StoryboardSchema = z.object({
  style: z.literal("line-drawing"),
  continuityKey: z.string().optional(),
  stages: z.array(StoryboardStageSchema).min(1),
});
export type Storyboard = z.infer<typeof StoryboardSchema>;

export const ColorOverridesSchema = z.object({
  accent1: z.string().optional(),
  accent2: z.string().optional(),
  surface: z.string().optional(),
});
export type ColorOverrides = z.infer<typeof ColorOverridesSchema>;

export const SceneActEasingsSchema = z.object({
  heading: EasingNameSchema.optional(),
  content: EasingNameSchema.optional(),
  flow: EasingNameSchema.optional(),
});
export type SceneActEasings = z.infer<typeof SceneActEasingsSchema>;

export const SceneSchema = z.object({
  heading: z.string().min(1),
  diagramScript: DiagramScriptSchema,
  diagramIntent: DiagramIntentSchema,
  diagramLayout: DiagramLayoutSchema,
  blocks: z.array(BlockSchema).min(2).max(5),
  graph: GraphSchema,
  visualPrimitives: z.array(VisualPrimitiveSchema).optional(),
  primitiveRelationships: z.array(PrimitiveRelationshipSchema).optional(),
  storyboard: StoryboardSchema.optional(),
  entryAnimation: EntryAnimationSchema,
  blockStyle: BlockStyleSchema,
  emphasizeIndex: z.number().int().min(-1).max(4).optional(),
  transition: TransitionPresetSchema,
  actEasings: SceneActEasingsSchema.optional(),
  colorOverrides: ColorOverridesSchema.optional(),
  sceneWeight: z.number().positive().optional(),
});
export type Scene = z.infer<typeof SceneSchema>;

export const DecorationsSchema = z.object({
  cornerBrackets: z.boolean().optional(),
  scanLines: z.boolean().optional(),
  pulseRings: z.boolean().optional(),
  gapDivider: z.boolean().optional(),
  decoBaseline: z.boolean().optional(),
});
export type Decorations = z.infer<typeof DecorationsSchema>;

// Main schema -----------------------------------------------------------------

export const VideoBriefSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  closingLine: z.string().optional(),
  palette: z.string().min(1),
  style: z.string().min(1),
  particleIntensity: z.number().min(0).max(3).optional(),
  decorations: DecorationsSchema.optional(),
  titleSize: TitleSizeSchema.optional(),
  titleAlign: z.enum(["left", "center"]).optional(),
  closingStyle: ClosingStyleSchema.optional(),
  scenes: z.array(SceneSchema).min(1),
});

export type VideoBrief = z.infer<typeof VideoBriefSchema>;
