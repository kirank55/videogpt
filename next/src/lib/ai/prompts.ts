// ── Prompt builders ───────────────────────────────────────────────────────────
//
// The AI produces a VideoBrief (~350 tokens).  It never touches coordinates,
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

// ── Two-column trigger keywords ───────────────────────────────────────────────
//
// If the user's prompt contains any of these (case-insensitive), the AI should
// output layout = "two-column".  Otherwise, default to "single-column".

const TWO_COLUMN_KEYWORDS = [
  "vs", "versus", "client", "server", "frontend", "backend",
  "before", "after", "request", "response", "architecture",
  "compare", "comparison", "difference", "vs.", "api", "endpoint",
  "database", "microservice", "service", "producer", "consumer",
  "sender", "receiver", "push", "pull", "sync", "async",
] as const;

// ── Palette + Style catalog summaries ─────────────────────────────────────────

const PALETTE_CATALOG = `
PALETTES (pick one name):
  "midnight"  — deep navy/blue, blue+teal accents        [tech, data, networking]
  "neon"      — ultra-dark, cyan+pink neon accents        [cyberpunk, AI, ML]
  "aurora"    — dark blue, purple+teal accents            [science, space, magic]
  "ember"     — near-black, orange+red accents            [performance, infra, ops]
  "forest"    — near-black green, green+teal accents      [environment, biology]
  "slate"     — dark grey-blue, muted cool accents        [enterprise, finance]
  "paper"     — warm cream, rust+forest-green accents     [explainers, education]
  "ice"       — light blue-white, navy+sky accents        [cloud, data, clean]
`.trim();

const STYLE_CATALOG = `
STYLES (pick one name):
  "modern"     — rounded, softly glowing, dense particles  [good default]
  "brutalist"  — sharp corners, no glow, no particles      [stark, data-center]
  "sketch"     — slightly rough, dashed connectors         [hand-drawn, educational]
  "neon-glow"  — heavy bloom, ultra-rounded, dense haze    [cyberpunk, AI, synthwave]
  "minimal"    — ultra-thin lines, barely-there glow       [clean, whitespace-focused]
`.trim();

const COMPATIBILITY_HINTS = `
SOFT COMPATIBILITY GUIDANCE:
  neon palette → neon-glow or modern style
  paper palette → sketch or minimal style
  ember palette → brutalist or modern
  midnight / aurora / slate → modern, minimal, or neon-glow
  ice palette → minimal or modern
  Avoid: paper + neon-glow, neon + brutalist
`.trim();

const DIAGRAM_GUIDE = `
━━━ DIAGRAM DESIGN & COORDINATES GUIDE ━━━
Use visualElements to build a beautiful diagram on the right half of the canvas.
- Coordinate box: width=700 (x: 0 to 700), height=600 (y: 0 to 600).
- Origin: Top-left is (0,0). Bottom-right is (700,600). y=0 is TOP, y=600 is BOTTOM.
- Stacking / Buildings (e.g. skyscraper, layers):
  * Start from the bottom (e.g. foundation at y=480, height=80, y-span 480 to 560).
  * Stack upwards by using SMALLER y values for each next block (e.g. next block at y=380, height=100, sitting directly on top of the foundation).
  * Center the stack horizontally around x=350 (e.g. width=300 starting at x=200).
- Label Formatting:
  * Only put labels on rectangles/circles if they are wide/large enough (width >= 160) to fit the text without overflowing.
  * If a rect/circle is narrow (width < 120), leave the label blank.
- Timing: Match blockIndex of visualElements to the corresponding block index on the left (e.g. blockIndex=0 is the first block, blockIndex=1 is the second block).
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
      description: "two-column: client/server, compare, architecture. single-column: explainers, steps.",
    },
    title: { type: "string", minLength: 1, maxLength: 80 },
    subtitle: { type: "string", maxLength: 120 },
    closingLine: { type: "string", maxLength: 100 },

    // Two-column fields
    leftHeader:  { type: "string", maxLength: 30 },
    rightHeader: { type: "string", maxLength: 30 },
    leftRows:  { type: "array", items: { type: "string", maxLength: 40 }, minItems: 2, maxItems: 4 },
    rightRows: { type: "array", items: { type: "string", maxLength: 40 }, minItems: 2, maxItems: 4 },
    flow: { type: "boolean" },
    requestLabel:  { type: "string", maxLength: 60 },
    requestBody:   { type: "string", maxLength: 80 },
    responseLabel: { type: "string", maxLength: 60 },
    processingSteps: { type: "array", items: { type: "string", maxLength: 50 }, maxItems: 3 },
    annotations:    { type: "array", items: { type: "string", maxLength: 30 }, maxItems: 3 },
    flowStyle: { type: "string", enum: ["arc", "straight", "zigzag"] },

    // Single-column fields
    blocks: {
      type: "array",
      items: {
        type: "object",
        required: ["heading", "description"],
        additionalProperties: false,
        properties: {
          heading:     { type: "string", maxLength: 60 },
          description: { type: "string", maxLength: 140 },
          icon: { type: "string", enum: ["browser","server","database","cloud","lock","globe","gear","code","api","mobile","router","shield","cpu","cache","app"] },
        },
      },
      minItems: 2, maxItems: 5,
    },

    palette: { type: "string", enum: ["midnight","neon","aurora","ember","forest","slate","paper","ice"] },
    style:   { type: "string", enum: ["modern","brutalist","sketch","neon-glow","minimal"] },

    // Creative fields
    variant:        { type: "string", enum: ["standard","diagonal","asymmetric"] },
    entryAnimation: { type: "string", enum: ["slide-up","slide-down","slide-left","slide-right","fade-only","scale-up","bounce-in"] },
    emphasizeLeft:  { type: "number" },
    emphasizeRight: { type: "number" },
    leftIcons:  { type: "array", items: { type: "string", enum: ["browser","server","database","cloud","lock","globe","gear","code","api","mobile","router","shield","cpu","cache","app"] }, maxItems: 4 },
    rightIcons: { type: "array", items: { type: "string", enum: ["browser","server","database","cloud","lock","globe","gear","code","api","mobile","router","shield","cpu","cache","app"] }, maxItems: 4 },
    blockIcons: { type: "array", items: { type: "string", enum: ["browser","server","database","cloud","lock","globe","gear","code","api","mobile","router","shield","cpu","cache","app"] }, maxItems: 5 },
    decorations: {
      type: "object",
      additionalProperties: false,
      properties: {
        cornerBrackets: { type: "boolean" },
        scanLines:      { type: "boolean" },
        pulseRings:     { type: "boolean" },
        gapDivider:     { type: "boolean" },
        decoBaseline:   { type: "boolean" },
      },
    },
    actWeights:        { type: "array", items: { type: "number" }, minItems: 5, maxItems: 5 },
    titleSize:         { type: "string", enum: ["small","medium","large","hero"] },
    titleAlign:        { type: "string", enum: ["left","center"] },
    particleIntensity: { type: "number" },
    closingStyle:      { type: "string", enum: ["fade-up","fade-center","none"] },
    actEasings: {
      type: "object",
      additionalProperties: false,
      properties: {
        title:   { type: "string", enum: ["linear","easeIn","easeOut","easeInOut","bounce"] },
        stacks:  { type: "string", enum: ["linear","easeIn","easeOut","easeInOut","bounce"] },
        flow:    { type: "string", enum: ["linear","easeIn","easeOut","easeInOut","bounce"] },
        closing: { type: "string", enum: ["linear","easeIn","easeOut","easeInOut","bounce"] },
      },
    },
    colorOverrides: {
      type: "object",
      additionalProperties: false,
      properties: {
        accent1: { type: "string" },
        accent2: { type: "string" },
        surface: { type: "string" },
      },
    },
    blockStyle: { type: "string", enum: ["stacked","cards","timeline","numbered"] },
    visualElements: {
      type: "array",
      description: "Optional shape/line/icon diagram elements to render on the right half of the canvas inside a 700x600 coordinate box.",
      items: {
        type: "object",
        required: ["type"],
        additionalProperties: false,
        properties: {
          type: { type: "string", enum: ["rect", "circle", "line", "icon"] },
          blockIndex: { type: "integer", minimum: 0, maximum: 4, description: "Block index (0-based) that triggers this element's entrance" },
          x: { type: "number", description: "Relative X (0-700) for rect, circle, or icon" },
          y: { type: "number", description: "Relative Y (0-600) for rect, circle, or icon" },
          width: { type: "number", description: "Width for rect" },
          height: { type: "number", description: "Height for rect" },
          radius: { type: "number", description: "Radius for circle" },
          x1: { type: "number", description: "Line start X (0-700)" },
          y1: { type: "number", description: "Line start Y (0-600)" },
          x2: { type: "number", description: "Line end X (0-700)" },
          y2: { type: "number", description: "Line end Y (0-600)" },
          color: { type: "string", enum: ["accent1", "accent2", "muted", "text", "surface"] },
          fillType: { type: "string", enum: ["solid", "outline", "dashed"] },
          iconName: { type: "string", enum: ["browser","server","database","cloud","lock","globe","gear","code","api","mobile","router","shield","cpu","cache","app"] },
          label: { type: "string", maxLength: 40, description: "Text label centered within/on the element" },
          entry: { type: "string", enum: ["fade", "slide-up", "slide-down", "scale-up", "grow-y", "grow-x"] },
        },
      },
    },
  },
};

export { VIDEO_BRIEF_JSON_SCHEMA };

// ── buildSystemPrompt ──────────────────────────────────────────────────────────

/**
 * Build the system prompt for a fresh video generation request.
 * Kept compact (~2,500 tokens) to stay within OpenRouter budget.
 */
export function buildSystemPrompt(duration: SupportedDuration): string {
  const kw = TWO_COLUMN_KEYWORDS.join(", ");

  return `
You are a video-brief writer for an animated infographic generator.
Output a single JSON VideoBrief object. No markdown, prose, or code fences.
You never compute coordinates, timing, or animations — a deterministic pipeline handles those.

VIDEO DURATION: ${duration}s

━━━ LAYOUT SELECTION ━━━
layout="two-column" if prompt contains: ${kw}
layout="single-column" for explainers, how-it-works, steps, history.

━━━ FIELD GUIDE ━━━

REQUIRED: layout, title, palette, style

TWO-COLUMN (when layout=two-column):
  leftHeader, rightHeader  — stack labels (e.g. "CLIENT", "SERVER")
  leftRows, rightRows      — 2–4 layer labels each
  flow                     — true for animated request/response arc
  requestLabel, responseLabel — arc labels (e.g. "GET /api", "200 OK")
  requestBody              — optional body text
  processingSteps          — up to 3 labels inside right rows
  annotations              — up to 3 gap callouts (e.g. "TLS 1.3")
  flowStyle                — "arc"(HTTP/REST) | "straight"(TCP) | "zigzag"(async)

SINGLE-COLUMN (when layout=single-column):
  blocks          — 2–5 items: { heading, description, icon? }
  blockStyle      — "stacked" | "cards" | "timeline" | "numbered"
  visualElements  — optional array of dynamic shapes/lines/icons to render on the right half of the canvas inside a 700x600 coordinate box. Use this to construct a visual representation or diagram related to the prompt (e.g., stacking blocks for a skyscraper, a branching line/circle for a tree).
                    Each element is an object with:
                      type: "rect" | "circle" | "line" | "icon" (required)
                      blockIndex: 0-4 (optional, triggers entry when that content block enters)
                      color: "accent1" | "accent2" | "muted" | "text" | "surface" (optional)
                      fillType: "solid" | "outline" | "dashed" (optional)
                      entry: "fade" | "slide-up" | "slide-down" | "scale-up" | "grow-y" | "grow-x" (optional)
                      label: optional centered overlay text label (max 40 chars)
                      For "rect": x, y (relative 0-700, 0-600), width, height, radius (optional)
                      For "circle": x, y, radius
                      For "line": x1, y1 (start 0-700, 0-600), x2, y2 (end 0-700, 0-600)
                      For "icon": x, y, iconName (see icons list below)

COMMON: title(max80), subtitle, closingLine(max100)

━━━ CREATIVE FIELDS ━━━

MANDATORY — include ALL of these on every brief, no exceptions:
  entryAnimation  — "slide-up" | "slide-down" | "slide-left" | "slide-right" | "fade-only" | "scale-up" | "bounce-in"
                    Pick the one that fits the mood. Never always use slide-up.
  variant         — "standard" | "diagonal" | "asymmetric"  [two-column only]
  emphasizeLeft   — 0-based index of most important left row (-1 = none)
  emphasizeRight  — 0-based index of most important right row (-1 = none)
  titleSize       — "small"(56px) | "medium"(72px) | "large"(88px,default) | "hero"(108px)
  particleIntensity — 0(none) | 1(default) | 2(heavy) | 3(extreme)
  closingStyle    — "fade-up" | "fade-center" | "none"

OPTIONAL — use when they add meaning:
  leftIcons / rightIcons / blockIcons — icon name per row/block
  ICONS: browser server database cloud lock globe gear code api mobile router shield cpu cache app
  decorations     — { cornerBrackets, scanLines, pulseRings, gapDivider, decoBaseline } booleans
                    brutalist → most false; neon-glow → all true
  titleAlign      — "left" | "center"
  actWeights      — [w1,w2,w3,w4,w5] relative act durations
  actEasings      — { title, stacks, flow, closing } each: "linear"|"easeIn"|"easeOut"|"easeInOut"|"bounce"
  colorOverrides  — { accent1, accent2, surface } CSS color strings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${PALETTE_CATALOG}

${STYLE_CATALOG}

${COMPATIBILITY_HINTS}

${DIAGRAM_GUIDE}

━━━ CONSTRAINTS ━━━
- Output ONLY the JSON object.
- two-column: include leftRows/rightRows/headers. Omit blocks.
- single-column: include blocks. Omit leftRows/rightRows/flow. If the prompt describes a physical or structural building process, always design visualElements (e.g. stacking rectangles for a building or a hierarchy of circles/lines) to provide visual support on the right.
- Only use palette/style names from the catalogs.
- Never output timing numbers.
- MANDATORY creative fields (entryAnimation, variant, emphasizeLeft, emphasizeRight, titleSize, particleIntensity, closingStyle) MUST appear in every output.
`.trim();
}

// ── buildModifyPrompt ─────────────────────────────────────────────────────────

/**
 * Build the user-turn prompt for a modify request.
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
Preserve all fields the instruction does not affect.
Do NOT change the layout unless explicitly asked.
Output ONLY the JSON object.
`.trim();
}
