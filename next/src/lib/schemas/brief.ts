import { z } from "zod";
import { EasingNameSchema } from "./timeline";

// ── Supported durations ──────────────────────────────────────────────────────

export const SUPPORTED_DURATIONS = [5, 10, 15, 20] as const;
export type SupportedDuration = (typeof SUPPORTED_DURATIONS)[number];

/**
 * Zod schema for the supported duration union.
 * Use this at API boundaries to validate duration values from user input.
 */
export const SupportedDurationSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
  z.literal(20),
]);

/**
 * Coerce an arbitrary value into a SupportedDuration, falling back to `fallback`
 * (default 15) when it is not a known duration. The single place the duration
 * set is consulted, so routes stop redeclaring their own VALID_DURATIONS Set.
 */
export function resolveDuration(value: unknown, fallback: SupportedDuration = 15): SupportedDuration {
  return typeof value === "number" && (SUPPORTED_DURATIONS as readonly number[]).includes(value)
    ? (value as SupportedDuration)
    : fallback;
}

// ── Style preset catalog keys ─────────────────────────────────────────────────
//
// Must stay in sync with the STYLES record in catalog/styles.ts.
// Use StylePresetSchema at API boundaries to validate AI-provided style keys.

export const STYLE_PRESET_KEYS = [
  "modern",
  "brutalist",
  "sketch",
  "neon-glow",
  "minimal",
] as const;

export type StylePreset = (typeof STYLE_PRESET_KEYS)[number];

export const StylePresetSchema = z.enum(STYLE_PRESET_KEYS);

// ── Transition preset ─────────────────────────────────────────────────────────
//
// Named cuts / transitions between scenes.  Stored on timeline events or
// at the project level.  Extend this as new renderer transitions are added.

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

// ── Icon name catalog ─────────────────────────────────────────────────────────
//
// Must stay in sync with IconName in renderer/types.ts and the ICON_ATLAS in
// renderer/shape.ts.  The AI can reference these in leftIcons / rightIcons /
// blockIcons to explicitly assign icons instead of relying on keyword matching.

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
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export const IconNameSchema = z.enum(ICON_NAMES);

// ── Easing names ──────────────────────────────────────────────────────────────
//
// EasingName / EasingNameSchema are defined in timeline.ts. Imported above.
// Re-exported here for convenience so brief.ts consumers can get everything
// from one import path.
export type { EasingName } from "./timeline";


// ── Sub-schemas ──────────────────────────────────────────────────────────────

const BlockSchema = z.object({
  heading: z.string().min(1),
  description: z.string().min(1),
  /** Explicit icon for this block. Overrides keyword matching. */
  icon: IconNameSchema.optional(),
});

export const VisualElementSchema = z.object({
  type: z.enum(["rect", "circle", "line", "icon"]),
  blockIndex: z.number().int().min(0).max(4).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  radius: z.number().optional(),
  x1: z.number().optional(),
  y1: z.number().optional(),
  x2: z.number().optional(),
  y2: z.number().optional(),
  color: z.enum(["accent1", "accent2", "muted", "text", "surface"]).optional(),
  fillType: z.enum(["solid", "outline", "dashed"]).optional(),
  iconName: IconNameSchema.optional(),
  label: z.string().optional(),
  entry: z.enum(["fade", "slide-up", "slide-down", "scale-up", "grow-y", "grow-x", "draw"]).optional(),
  startPadding: z.number().optional(),
  endPadding: z.number().optional(),
  labelBackdrop: z.boolean().optional(),
});

// ── Main schema ──────────────────────────────────────────────────────────────
//
// This is the AI-pipeline contract.  The AI outputs a VideoBrief (~350 tokens),
// never a VideoProject.  The Brief Expander (buildProjectFromBrief) handles all
// coordinates, timing, and pipeline injections.
//
// Design principle: the AI should describe *what* and *how* the video feels.
// The expander only computes *where* (coordinates) and *when* (timestamps).

export const VideoBriefSchema = z.object({
  layout: z.enum(["two-column", "single-column"]),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  closingLine: z.string().optional(),

  // ── Two-Column fields ──────────────────────────────────────────────────────
  leftHeader: z.string().optional(),
  rightHeader: z.string().optional(),
  /** 2–4 labels for the left stack. */
  leftRows: z.array(z.string().min(1)).min(2).max(4).optional(),
  /** 2–4 labels for the right stack. */
  rightRows: z.array(z.string().min(1)).min(2).max(4).optional(),

  // ── Two-Column flow ────────────────────────────────────────────────────────
  flow: z.boolean().optional(),
  requestLabel: z.string().optional(),
  requestBody: z.string().optional(),
  responseLabel: z.string().optional(),
  /** Up to 3 processing steps shown inside the right-stack rows. */
  processingSteps: z.array(z.string().min(1)).max(3).optional(),
  /** Up to 3 short callout strings shown in the gap area. */
  annotations: z.array(z.string().min(1).max(30)).max(3).optional(),
  /** Packet travel style for flow animations. */
  flowStyle: z.enum(["arc", "straight", "zigzag"]).optional(),

  // ── Single-Column fields ───────────────────────────────────────────────────
  /** 2–5 content blocks. */
  blocks: z.array(BlockSchema).min(2).max(5).optional(),

  // ── Visual ────────────────────────────────────────────────────────────────
  /** Named palette key (e.g. "midnight", "neon"). Unknown → "midnight". */
  palette: z.string().min(1),
  /** Named style key (e.g. "modern", "brutalist"). Unknown → "modern". */
  style: z.string().min(1),

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — High-impact creative fields
  // ══════════════════════════════════════════════════════════════════════════

  // ── Layout variant (two-column only) ──────────────────────────────────────
  /**
   * Spatial arrangement of the two columns.
   * "standard"    — symmetric, equal-width columns
   * "diagonal"    — right column shifted down 60px for depth
   * "asymmetric"  — client narrower (380px), server wider (580px)
   */
  variant: z.enum(["standard", "diagonal", "asymmetric"]).optional(),

  // ── Entry animation ───────────────────────────────────────────────────────
  /**
   * How stack rows / content blocks enter the canvas.
   * "slide-up"    — (default) translate from y+40 to y=0
   * "slide-down"  — translate from y-40 to y=0
   * "slide-left"  — translate from x+60 to x=0
   * "slide-right" — translate from x-60 to x=0
   * "fade-only"   — opacity only, no translate
   * "scale-up"    — scale from 0.5 → 1 + fade
   * "bounce-in"   — bounce easing on scale
   */
  entryAnimation: z.enum([
    "slide-up",
    "slide-down",
    "slide-left",
    "slide-right",
    "fade-only",
    "scale-up",
    "bounce-in",
  ]).optional(),

  // ── Row emphasis ──────────────────────────────────────────────────────────
  /**
   * 0-based index of the row to visually emphasize (bold border, accent color,
   * larger icon, glow). -1 = no emphasis.
   */
  emphasizeLeft: z.number().int().min(-1).max(3).optional(),
  emphasizeRight: z.number().int().min(-1).max(3).optional(),

  // ── Explicit icon assignment ───────────────────────────────────────────────
  /**
   * One icon name per left/right/block row. Must match the row count.
   * Falls back to keyword matching for any missing entries.
   */
  leftIcons: z.array(IconNameSchema).max(4).optional(),
  rightIcons: z.array(IconNameSchema).max(4).optional(),
  blockIcons: z.array(IconNameSchema).max(5).optional(),

  // ── Decorative elements ───────────────────────────────────────────────────
  /**
   * Toggle individual decorative overlays. All default to true.
   * Turn off for cleaner/brutalist aesthetics.
   */
  decorations: z.object({
    /** L-shaped brackets around each column (default: true). */
    cornerBrackets: z.boolean().optional(),
    /** Horizontal scan line sweeping down each column (default: true). */
    scanLines: z.boolean().optional(),
    /** Expanding pulse rings at packet departure/arrival (default: true). */
    pulseRings: z.boolean().optional(),
    /** Vertical dashed divider in the gap between columns (default: true). */
    gapDivider: z.boolean().optional(),
    /** Horizontal deco baseline below the stacks (default: true). */
    decoBaseline: z.boolean().optional(),
  }).optional(),

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 2 — Pacing and presentation control
  // ══════════════════════════════════════════════════════════════════════════

  // ── Act timing weights ────────────────────────────────────────────────────
  /**
   * Relative time weight for each of the 5 acts [Act1, Act2, Act3, Act4, Act5].
   * The expander normalizes these to fit the total duration, with a minimum
   * guard of 0.5s per act to keep animations valid.
   * Example: [1, 3, 1, 1.5, 1.5] gives Act2 triple the time of Act1.
   * If omitted, uses the catalog defaults.
   */
  actWeights: z.preprocess((val) => {
    if (Array.isArray(val)) {
      if (val.length > 5) return val.slice(0, 5);
      if (val.length < 5) return [...val, ...Array(5 - val.length).fill(1)];
    }
    return val;
  }, z.array(z.number().positive()).length(5)).optional(),

  // ── Title presentation ────────────────────────────────────────────────────
  /**
   * Size of the main title.
   * "small"  — 56px  (good for long titles)
   * "medium" — 72px  (balanced)
   * "large"  — 88px  (default)
   * "hero"   — 108px (short, punchy titles)
   */
  titleSize: z.enum(["small", "medium", "large", "hero"]).optional(),
  /** Horizontal alignment of the title text. Default: "left". */
  titleAlign: z.enum(["left", "center"]).optional(),

  // ── Particle intensity ────────────────────────────────────────────────────
  /**
   * Multiplier for all particle counts (ambient + burst + trail + db-burst).
   * 0 = suppress all particles  (clean, brutalist)
   * 1 = default counts from style
   * 2 = heavy (cinematic, dense)
   * 3 = extreme (max spectacle)
   */
  particleIntensity: z.number().min(0).max(3).optional(),

  // ── Closing style ─────────────────────────────────────────────────────────
  /**
   * How the closing line animates in.
   * "fade-up"     — (default) fade + translateY up
   * "fade-center" — fade only, centered on screen
   * "none"        — skip closing line entirely
   */
  closingStyle: z.enum(["fade-up", "fade-center", "none"]).optional(),

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 3 — Fine-grained override control
  // ══════════════════════════════════════════════════════════════════════════

  // ── Per-act easing overrides ──────────────────────────────────────────────
  /**
   * Override the global easing for specific acts.
   * The global easing comes from the style preset.
   * These overrides let the AI give each act its own animation character.
   */
  actEasings: z.object({
    title: EasingNameSchema.optional(),
    stacks: EasingNameSchema.optional(),
    flow: EasingNameSchema.optional(),
    closing: EasingNameSchema.optional(),
  }).optional(),

  // ── Palette color overrides ───────────────────────────────────────────────
  /**
   * Override specific color slots from the chosen palette.
   * Values must be valid CSS color strings (rgb(), hex, etc.).
   * accent1 = primary/request accent, accent2 = secondary/response accent.
   */
  colorOverrides: z.object({
    accent1: z.string().optional(),
    accent2: z.string().optional(),
    surface: z.string().optional(),
  }).optional(),

  // ── Single-column block layout style ─────────────────────────────────────
  /**
   * Visual arrangement of content blocks in single-column layout.
   * "stacked"  — (default) vertical list with heading + description
   * "cards"    — each block in a bordered card rect
   * "timeline" — vertical timeline with connecting dots/line
   * "numbered" — 01, 02, 03 prefix numbering
   */
  blockStyle: z.enum(["stacked", "cards", "timeline", "numbered"]).optional(),
  visualElements: z.array(VisualElementSchema).optional(),
});

export type VideoBrief = z.infer<typeof VideoBriefSchema>;
