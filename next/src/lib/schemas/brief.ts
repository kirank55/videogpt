import { z } from "zod";

// ── Supported durations ──────────────────────────────────────────────────────

export const SUPPORTED_DURATIONS = [5, 10, 15, 20, 30] as const;
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
  z.literal(30),
]);

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

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const BlockSchema = z.object({
  heading: z.string().min(1),
  description: z.string().min(1),
});

// ── Main schema ──────────────────────────────────────────────────────────────
//
// This is the AI-pipeline contract.  The AI outputs a VideoBrief (~200 tokens),
// never a VideoProject.  The Brief Expander (buildProjectFromBrief) handles all
// coordinates, timing, and pipeline injections.

export const VideoBriefSchema = z.object({
  layout: z.enum(["two-column", "single-column"]),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  closingLine: z.string().optional(),

  // ── Two-Column fields ──────────────────────────────────────────────────────
  leftHeader: z.string().optional(),
  rightHeader: z.string().optional(),
  /** 2–4 labels for the left stack.  Validated/clamped by validateBrief. */
  leftRows: z.array(z.string().min(1)).min(2).max(4).optional(),
  /** 2–4 labels for the right stack.  Validated/clamped by validateBrief. */
  rightRows: z.array(z.string().min(1)).min(2).max(4).optional(),

  // ── Two-Column flow (pipeline-injected when flow=true) ────────────────────
  flow: z.boolean().optional(),
  requestLabel: z.string().optional(),
  requestBody: z.string().optional(),
  responseLabel: z.string().optional(),
  /** Up to 3 processing steps shown inside the right-stack rows. */
  processingSteps: z.array(z.string().min(1)).max(3).optional(),
  /** Up to 3 short callout strings shown in the gap area (e.g. "TLS 1.3", "REST"). */
  annotations: z.array(z.string().min(1).max(30)).max(3).optional(),
  /** Packet travel style for flow animations. */
  flowStyle: z.enum(["arc", "straight", "zigzag"]).optional(),

  // ── Single-Column fields ───────────────────────────────────────────────────
  /** 2–5 content blocks.  Validated/clamped by validateBrief. */
  blocks: z.array(BlockSchema).min(2).max(5).optional(),

  // ── Visual ────────────────────────────────────────────────────────────────
  /** Named palette key (e.g. "midnight", "neon").  Unknown → "midnight". */
  palette: z.string().min(1),
  /** Named style key (e.g. "modern", "brutalist").  Unknown → "modern". */
  style: z.string().min(1),
});

export type VideoBrief = z.infer<typeof VideoBriefSchema>;

