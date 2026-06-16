// ── Prompt builders ───────────────────────────────────────────────────────────
//
// The AI produces a VideoBrief (~200 tokens).  It never touches coordinates,
// timing arithmetic, or particle counts — those are computed deterministically
// by the Brief Expander (buildProjectFromBrief).
//
// Two prompts:
//   buildSystemPrompt(duration) — used for fresh generation
//   buildModifyPrompt(currentBrief, instruction) — used for modifications
//
// The JSON schema embedded in the system prompt must stay in sync with
// src/lib/schemas/brief.ts.  When the schema changes, update both files.

import type { SupportedDuration, VideoBrief } from "@/lib/schemas/brief";
import { TIMINGS } from "@/lib/catalog/timings";

// ── Two-column trigger keywords ───────────────────────────────────────────────
//
// If the user's prompt contains any of these (case-insensitive), the AI should
// output layout = "two-column".  Otherwise, default to "single-column".
//
// This list is embedded verbatim in the system prompt so the model can apply it.

const TWO_COLUMN_KEYWORDS = [
  "vs",
  "versus",
  "client",
  "server",
  "frontend",
  "backend",
  "before",
  "after",
  "request",
  "response",
  "architecture",
  "compare",
  "comparison",
  "difference",
  "vs.",
  "api",
  "endpoint",
  "database",
  "microservice",
  "service",
  "producer",
  "consumer",
  "sender",
  "receiver",
  "push",
  "pull",
  "sync",
  "async",
] as const;

// ── Palette + Style catalog summaries for the prompt ─────────────────────────

const PALETTE_CATALOG = `
PALETTES (pick one name):
  "midnight"  — deep navy/blue, blue+teal accents        [best for: tech, data, networking]
  "neon"      — ultra-dark, cyan+pink neon accents        [best for: cyberpunk, AI, ML]
  "aurora"    — dark blue, purple+teal accents            [best for: science, space, magic]
  "ember"     — near-black, orange+red accents            [best for: performance, infra, ops]
  "forest"    — near-black green, green+teal accents      [best for: environment, biology]
  "slate"     — dark grey-blue, muted cool accents        [best for: enterprise, finance]
  "paper"     — warm cream, rust+forest-green accents     [best for: explainers, education]
  "ice"       — light blue-white, navy+sky accents        [best for: cloud, data, clean]
`.trim();

const STYLE_CATALOG = `
STYLES (pick one name):
  "modern"     — rounded, softly glowing, dense particles  [good default for almost anything]
  "brutalist"  — sharp corners, no glow, no particles      [stark, data-center aesthetic]
  "sketch"     — slightly rough, dashed connectors         [hand-drawn, educational]
  "neon-glow"  — heavy bloom, ultra-rounded, dense haze    [cyberpunk, AI, synthwave]
  "minimal"    — ultra-thin lines, barely-there glow       [clean, whitespace-focused]
`.trim();

const COMPATIBILITY_HINTS = `
SOFT COMPATIBILITY GUIDANCE (not rules — trust your judgement):
  neon palette → neon-glow or modern style works well
  paper palette → sketch or minimal style works well
  ember palette → brutalist or modern works well
  midnight / aurora / slate → modern, minimal, or neon-glow all work
  ice palette → minimal or modern preferred
  Avoid: paper + neon-glow (clashing), neon + brutalist (contradictory)
`.trim();

// ── JSON Schema for VideoBrief (must match src/lib/schemas/brief.ts) ──────────

const VIDEO_BRIEF_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["layout", "title", "palette", "style"],
  additionalProperties: false,
  properties: {
    layout: {
      type: "string",
      enum: ["two-column", "single-column"],
      description:
        "two-column: for client/server, compare, architecture. single-column: default explainer/how-to.",
    },
    title: { type: "string", minLength: 1, maxLength: 80 },
    subtitle: { type: "string", maxLength: 120 },
    closingLine: { type: "string", maxLength: 100 },

    // Two-column fields
    leftHeader:  { type: "string", maxLength: 30 },
    rightHeader: { type: "string", maxLength: 30 },
    leftRows: {
      type: "array",
      items: { type: "string", minLength: 1, maxLength: 40 },
      minItems: 2, maxItems: 4,
    },
    rightRows: {
      type: "array",
      items: { type: "string", minLength: 1, maxLength: 40 },
      minItems: 2, maxItems: 4,
    },
    flow: {
      type: "boolean",
      description:
        "true = add animated request/response packet arc between stacks. Only meaningful for two-column.",
    },
    requestLabel:  { type: "string", maxLength: 60 },
    requestBody:   { type: "string", maxLength: 80 },
    responseLabel: { type: "string", maxLength: 60 },
    processingSteps: {
      type: "array",
      items: { type: "string", minLength: 1, maxLength: 50 },
      maxItems: 3,
    },

    // Single-column fields
    blocks: {
      type: "array",
      items: {
        type: "object",
        required: ["heading", "description"],
        additionalProperties: false,
        properties: {
          heading:     { type: "string", minLength: 1, maxLength: 60 },
          description: { type: "string", minLength: 1, maxLength: 140 },
        },
      },
      minItems: 2, maxItems: 5,
    },

    palette: { type: "string", enum: ["midnight","neon","aurora","ember","forest","slate","paper","ice"] },
    style:   { type: "string", enum: ["modern","brutalist","sketch","neon-glow","minimal"] },
  },
};

export { VIDEO_BRIEF_JSON_SCHEMA };

// ── buildSystemPrompt ──────────────────────────────────────────────────────────

/**
 * Build the system prompt for a fresh video generation request.
 *
 * The prompt tells the model:
 *   1. Its role and what a VideoBrief is
 *   2. Layout selection rules (keyword-driven)
 *   3. What each field means and how to fill it
 *   4. The act timing table for the requested duration
 *   5. The palette / style catalogs + compatibility hints
 *   6. Hard constraints (token budget, no arithmetic, etc.)
 */
export function buildSystemPrompt(duration: SupportedDuration): string {
  const t = TIMINGS[duration];
  const kw = TWO_COLUMN_KEYWORDS.join(", ");

  return `
You are a video-brief writer for an animated infographic generator.
Your only job is to output a single JSON object called a "VideoBrief" — a compact description of what the video should show.
You do NOT compute coordinates, animations, or timings. A deterministic code pipeline handles all of that.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIDEO DURATION: ${duration} seconds
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACT TIMING TABLE (for your reference only — never output timing values):
  Act 1 (title card):     ${t.act1.start}s → ${t.act1.end}s
  Act 2 (stacks/blocks):  ${t.act2.start}s → ${t.act2.end}s  stagger=${t.act2.stagger}s/item
  Act 3 (request phase):  ${t.act3.start}s → ${t.act3.end}s  [two-column + flow=true only]
  Act 4 (processing):     ${t.act4.start}s → ${t.act4.end}s  stepStagger=${t.act4.stepStagger}s
  Act 5 (outro):          ${t.act5.start}s → ${t.act5.end}s  closingAt=${t.act5.closingStart}s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAYOUT SELECTION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Output layout = "two-column" when the prompt contains ANY of these keywords (case-insensitive):
  ${kw}

Otherwise output layout = "single-column".
Single-column is the default for: how-it-works, explainers, history, science, steps.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIELD GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMMON FIELDS:
  title        — short headline (max 80 chars, ALLCAPS OK for acronyms)
  subtitle     — optional one-liner elaborating on the title
  closingLine  — punchy closing statement shown at the end (max 100 chars)
  palette      — visual color theme (pick from catalog below)
  style        — shape/animation personality (pick from catalog below)

TWO-COLUMN FIELDS (only for layout = "two-column"):
  leftHeader   — label for the left stack (e.g. "CLIENT", "BEFORE")
  rightHeader  — label for the right stack (e.g. "SERVER", "AFTER")
  leftRows     — 2–4 layer labels for the left stack (shortest to deepest / logical order)
  rightRows    — 2–4 layer labels for the right stack
  flow         — true if a request/response packet arc makes sense; false for pure comparisons
  requestLabel — one-line label shown above the request arc (e.g. "POST /api/users")
  requestBody  — optional inline body (e.g. "{ name, email }")
  responseLabel — one-line label shown above the response arc (e.g. "201 Created")
  processingSteps — up to 3 short labels shown inside right-stack rows (e.g. "Validate", "Hash", "INSERT")

SINGLE-COLUMN FIELDS (only for layout = "single-column"):
  blocks       — 2–5 content blocks, each with a short "heading" and 1–2 sentence "description"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${PALETTE_CATALOG}

${STYLE_CATALOG}

${COMPATIBILITY_HINTS}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HARD CONSTRAINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Output ONLY the JSON object. No markdown, no prose, no code fences.
- For two-column: include leftRows, rightRows, leftHeader, rightHeader.
  Omit blocks. Set flow=true only when a packet arc meaningfully shows the interaction.
- For single-column: include blocks (2–5). Omit leftRows, rightRows, flow, etc.
- Do not invent palette or style names outside the catalogs.
- Keep all strings within the max character limits above.
- Do not output timing numbers. The pipeline computes all timing.
`.trim();
}

// ── buildModifyPrompt ─────────────────────────────────────────────────────────

/**
 * Build the user-turn prompt for a modify request.
 *
 * We send the current brief (as JSON) so the model can intelligently update
 * only the fields that the user's instruction touches, while preserving the
 * rest.  The system prompt (same as generate) tells the model the schema.
 */
export function buildModifyPrompt(
  currentBrief: VideoBrief,
  instruction: string,
): string {
  return `
CURRENT VIDEO BRIEF:
${JSON.stringify(currentBrief, null, 2)}

USER MODIFICATION INSTRUCTION:
"${instruction}"

Return an updated VideoBrief JSON object that incorporates the user's instruction.
Preserve all fields that the instruction does not affect.
Do NOT change the layout unless the instruction explicitly asks for it.
Output ONLY the JSON object.
`.trim();
}
