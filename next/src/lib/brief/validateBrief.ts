// ── validateBrief ─────────────────────────────────────────────────────────────
//
// Deterministic normalizer: accepts **any** unknown value from the LLM or the
// client and always returns a valid, fully-typed `VideoBrief`.
//
// Interface: validateBrief(raw: unknown) → VideoBrief   (never throws)
//
// Implementation strategy:
//   1. Parse with a lenient Zod schema that uses `.catch(default)` for every
//      field that the LLM might mis-spell or omit.  This replaces ~80 lines of
//      hand-written `typeof x === "string" && [...].includes(x)` guards with
//      Zod as the single source of truth.
//   2. Apply the small set of *semantic* normalisations Zod cannot express:
//      - Unknown palette key → DEFAULT_PALETTE
//      - Unknown style key   → DEFAULT_STYLE
//      - leftRows / rightRows shorter than 2 → padded to 2
//      - blocks with fewer than 2 items → padded with placeholder content
//
// Callers (pipeline.ts, modify/route.ts) import only this function.
// They must not import the internal Zod schema — it's an implementation detail.

import { z } from "zod";
import type { VideoBrief } from "@/lib/schemas/brief";
import { ICON_NAMES } from "@/lib/schemas/brief";
import { EasingNameSchema } from "@/lib/schemas/timeline";
import { PALETTES, DEFAULT_PALETTE } from "@/lib/catalog/palettes";
import { STYLES, DEFAULT_STYLE } from "@/lib/catalog/styles";

// ── Internal Zod schema (implementation detail) ───────────────────────────────
//
// This schema is intentionally lenient: every field that the LLM might produce
// incorrectly uses .catch() to fall back to a safe default instead of rejecting.
// The overall parse always succeeds — that's the contract.

const VALID_PALETTES = new Set(Object.keys(PALETTES));
const VALID_STYLES   = new Set(Object.keys(STYLES));

const IconNameSchema = z.enum(ICON_NAMES).catch("gear");

const EasingSchema = EasingNameSchema.catch("easeInOut");

const LenientBlockSchema = z.object({
  heading:     z.string().min(1).catch("Key Point"),
  description: z.string().min(1).catch("An important detail."),
  icon:        IconNameSchema.optional(),
}).catch({ heading: "Key Point", description: "An important detail." });

const LenientVisualElementSchema = z.object({
  type:         z.enum(["rect", "circle", "line", "icon"]).catch("rect"),
  blockIndex:   z.number().int().min(0).max(4).optional().catch(undefined),
  x:            z.number().optional().catch(undefined),
  y:            z.number().optional().catch(undefined),
  width:        z.number().optional().catch(undefined),
  height:       z.number().optional().catch(undefined),
  radius:       z.number().optional().catch(undefined),
  x1:           z.number().optional().catch(undefined),
  y1:           z.number().optional().catch(undefined),
  x2:           z.number().optional().catch(undefined),
  y2:           z.number().optional().catch(undefined),
  color:        z.enum(["accent1", "accent2", "muted", "text", "surface"]).optional().catch(undefined),
  fillType:     z.enum(["solid", "outline", "dashed"]).optional().catch(undefined),
  iconName:     IconNameSchema.optional().catch(undefined),
  label:        z.string().optional().catch(undefined),
  entry:        z.enum(["fade", "slide-up", "slide-down", "scale-up", "grow-y", "grow-x", "draw"]).optional().catch(undefined),
  startPadding: z.number().optional().catch(undefined),
  endPadding:   z.number().optional().catch(undefined),
  labelBackdrop: z.boolean().optional().catch(undefined),
});

const LenientBriefSchema = z.preprocess(
  // Non-objects become an empty object so downstream fields safely get defaults.
  (v) => (v !== null && typeof v === "object" && !Array.isArray(v) ? v : {}),
  z.object({
    layout:       z.enum(["two-column", "single-column"]).catch("single-column"),
    title:        z.string().min(1).catch("Untitled"),
    subtitle:     z.string().optional().catch(undefined),
    closingLine:  z.string().optional().catch(undefined),

    // Two-column fields
    leftHeader:   z.string().optional().catch(undefined),
    rightHeader:  z.string().optional().catch(undefined),
    leftRows:     z.array(z.string().min(1)).transform(a => a.slice(0, 4)).optional().catch(undefined),
    rightRows:    z.array(z.string().min(1)).transform(a => a.slice(0, 4)).optional().catch(undefined),

    // Flow fields
    flow:             z.boolean().optional().catch(undefined),
    requestLabel:     z.string().optional().catch(undefined),
    requestBody:      z.string().optional().catch(undefined),
    responseLabel:    z.string().optional().catch(undefined),
    processingSteps:  z.array(z.string().min(1)).transform(a => a.slice(0, 3)).optional().catch(undefined),
    annotations:      z.array(z.string().min(1).max(30)).transform(a => a.slice(0, 3)).optional().catch(undefined),
    flowStyle:        z.enum(["arc", "straight", "zigzag"]).optional().catch(undefined),

    // Single-column fields
    blocks: z.array(LenientBlockSchema).transform(a => a.slice(0, 5)).optional().catch(undefined),

    // Style / palette: kept as raw string, normalised in step 2 below.
    palette: z.string().min(1).catch(DEFAULT_PALETTE),
    style:   z.string().min(1).catch(DEFAULT_STYLE),

    // Creative fields — all use .catch(undefined) so unknown values are dropped.
    variant:          z.enum(["standard", "diagonal", "asymmetric"]).optional().catch(undefined),
    entryAnimation:   z.enum(["slide-up", "slide-down", "slide-left", "slide-right", "fade-only", "scale-up", "bounce-in"]).optional().catch(undefined),
    emphasizeLeft:    z.number().int().min(-1).max(3).optional().catch(undefined),
    emphasizeRight:   z.number().int().min(-1).max(3).optional().catch(undefined),
    leftIcons:        z.array(IconNameSchema).transform(a => a.slice(0, 4)).optional().catch(undefined),
    rightIcons:       z.array(IconNameSchema).transform(a => a.slice(0, 4)).optional().catch(undefined),
    blockIcons:       z.array(IconNameSchema).transform(a => a.slice(0, 5)).optional().catch(undefined),
    titleSize:        z.enum(["small", "medium", "large", "hero"]).optional().catch(undefined),
    titleAlign:       z.enum(["left", "center"]).optional().catch(undefined),
    particleIntensity: z.number().min(0).max(3).optional().catch(undefined),
    closingStyle:     z.enum(["fade-up", "fade-center", "none"]).optional().catch(undefined),
    blockStyle:       z.enum(["stacked", "cards", "timeline", "numbered"]).optional().catch(undefined),
    actWeights:       z.array(z.number().positive()).length(5).optional().catch(undefined),

    decorations: z.object({
      cornerBrackets: z.boolean().optional().catch(undefined),
      scanLines:      z.boolean().optional().catch(undefined),
      pulseRings:     z.boolean().optional().catch(undefined),
      gapDivider:     z.boolean().optional().catch(undefined),
      decoBaseline:   z.boolean().optional().catch(undefined),
    }).optional().catch(undefined),

    actEasings: z.object({
      title:   EasingSchema.optional().catch(undefined),
      stacks:  EasingSchema.optional().catch(undefined),
      flow:    EasingSchema.optional().catch(undefined),
      closing: EasingSchema.optional().catch(undefined),
    }).optional().catch(undefined),

    colorOverrides: z.object({
      accent1: z.string().optional().catch(undefined),
      accent2: z.string().optional().catch(undefined),
      surface: z.string().optional().catch(undefined),
    }).optional().catch(undefined),

    visualElements: z.array(LenientVisualElementSchema).max(30).optional().catch(undefined),
  }),
);

type LenientBrief = z.infer<typeof LenientBriefSchema>;

// ── Semantic normalisers (Zod can't express these) ────────────────────────────

function normalisePalette(raw: string): string {
  return VALID_PALETTES.has(raw) ? raw : DEFAULT_PALETTE;
}

function normaliseStyle(raw: string): string {
  return VALID_STYLES.has(raw) ? raw : DEFAULT_STYLE;
}

/** Pad string array to minLen by appending `${prefix} N` labels. */
function padArray(arr: string[], minLen: number, prefix: string): string[] {
  const out = [...arr];
  while (out.length < minLen) out.push(`${prefix} ${out.length + 1}`);
  return out;
}

const DEFAULT_BLOCKS = [
  { heading: "Key Point",  description: "An important insight to share." },
  { heading: "Key Detail", description: "Another crucial piece of the puzzle." },
];

function normaliseBlocks(
  raw: LenientBrief["blocks"],
): NonNullable<VideoBrief["blocks"]> {
  const blocks = (raw ?? []).filter(
    (b): b is NonNullable<typeof b> => b !== null && typeof b === "object",
  );
  if (blocks.length >= 2) return blocks.slice(0, 5);
  // Pad: keep what we have, append defaults until we reach 2
  const padded = [...blocks, ...DEFAULT_BLOCKS].slice(0, Math.max(2, blocks.length));
  return padded;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Deterministic fallback normalizer.
 * Accepts **any** unknown value and always returns a valid `VideoBrief`.
 *
 * Normalisations applied:
 * - Non-object input                 → treated as empty object (single-column fallback)
 * - Unknown palette / style key      → DEFAULT_PALETTE / DEFAULT_STYLE
 * - leftRows / rightRows shorter < 2 → padded with "Layer N" placeholders
 * - Empty title                      → "Untitled"
 * - blocks < 2                       → padded with placeholder blocks
 * - Any unrecognised enum value      → field dropped (optional) or default applied
 *
 * Never throws. Never calls APIs.
 */
export function validateBrief(raw: unknown): VideoBrief {
  // Step 1: Lenient Zod parse (always succeeds — every field has a catch default).
  const parsed = LenientBriefSchema.parse(raw);

  // Step 2: Semantic normalisations Zod cannot express.
  const palette = normalisePalette(parsed.palette);
  const style   = normaliseStyle(parsed.style);
  const layout  = parsed.layout;

  const base = {
    ...parsed,
    palette,
    style,
  };

  if (layout === "two-column") {
    const leftRows  = padArray(parsed.leftRows  ?? [], 2, "Layer");
    const rightRows = padArray(parsed.rightRows ?? [], 2, "Layer");
    const flow      = parsed.flow ?? false;

    return {
      ...base,
      leftHeader:  parsed.leftHeader  ?? "LEFT",
      rightHeader: parsed.rightHeader ?? "RIGHT",
      leftRows,
      rightRows,
      flow,
      requestLabel:    flow ? (parsed.requestLabel  ?? "REQUEST")  : undefined,
      requestBody:     flow ? parsed.requestBody                   : undefined,
      responseLabel:   flow ? (parsed.responseLabel ?? "RESPONSE") : undefined,
      processingSteps: flow ? (parsed.processingSteps ?? [])       : undefined,
    } as VideoBrief;
  }

  // single-column
  return {
    ...base,
    blocks: normaliseBlocks(parsed.blocks),
  } as VideoBrief;
}
