import { z } from "zod";

// ── Supported durations ──────────────────────────────────────────────────────

export const SUPPORTED_DURATIONS = [5, 10, 15, 20, 30] as const;
export type SupportedDuration = (typeof SUPPORTED_DURATIONS)[number];

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
