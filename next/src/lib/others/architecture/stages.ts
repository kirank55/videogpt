// ── Architecture explorer data ─────────────────────────────────────────────────
//
// Structured port of docs/architecture.md. Single source of truth for the
// "How it works" slide-over: the high-level diagram renders PIPELINE_STAGES as
// clickable nodes; selecting one drills into its low-level explanation.
//
// Keep file paths in sync with the codebase. When a stage moves, update both
// this file and docs/architecture.md.

export interface ArchStage {
  /** Stable id used as the diagram node key and the drill-down selector. */
  id: string;
  /** Short label shown on the diagram node. */
  label: string;
  /** One-line summary under the label. */
  summary: string;
  /** `path:line` reference to the implementation. */
  file: string;
  /** Function or symbol that owns this stage, if applicable. */
  symbol?: string;
  /** State / data shape crossing this boundary. */
  dataShape: string;
  /** Low-level explanation shown on drill-down. */
  details: string;
}

export const PIPELINE_STAGES: ArchStage[] = [
  {
    id: "user-prompt",
    label: "User Prompt",
    summary: "Natural-language prompt or modify instruction",
    file: "next/src/app/generate (UI)",
    dataShape: "Raw text string",
    details:
      "The user inputs a natural-language prompt (e.g. \"compare client and server request flow\") or types a chat instruction to modify an existing timeline. This is the only human-authored input; everything downstream is deterministic or LLM-driven.",
  },
  {
    id: "api-routes",
    label: "API Routes",
    summary: "Serverless HTTP entry points",
    file: "next/src/app/api/generate/route.ts & modify/route.ts",
    symbol: "POST",
    dataShape: "HTTP JSON request body",
    details:
      "Serverless HTTP endpoint entry points. They accept POST payloads containing the prompt text, project duration, style preferences, and optional Authorization headers. The four routes (generate, generate/stream, modify, modify/stream) are thin HTTP adapters over the pipeline's two functions.",
  },
  {
    id: "prompt-builder",
    label: "Prompt Builder",
    summary: "Constructs the LLM system + user prompts",
    file: "next/src/lib/agent/ai/prompts.ts",
    symbol: "buildSystemPrompt, buildModifyPrompt",
    dataShape: "Formatted LLM system & user prompt strings",
    details:
      "Constructs structured system prompts directing the LLM to output a valid VideoBrief matching the target schema as a JSON object. If modifying, it injects the current project state so the AI computes incremental differences rather than rebuilding from scratch.",
  },
  {
    id: "openrouter",
    label: "OpenRouter Call",
    summary: "Sends the prompt; streams/returns the brief",
    file: "next/src/lib/agent/ai/openrouter.ts",
    symbol: "callOpenRouter, callOpenRouterStream",
    dataShape: "Raw JSON string from the LLM",
    details:
      "Sends the prompt context to OpenRouter (model from .env.local). It uses response_format: json_object for constrained decoding, ensuring the model returns valid JSON. The pipeline's onFallback handles any hard failure with a deterministic fallback brief.",
  },
  {
    id: "validate-brief",
    label: "validateBrief",
    summary: "Lenient Zod parse — always yields a valid brief",
    file: "next/src/lib/agent/brief/validateBrief.ts",
    symbol: "validateBrief",
    dataShape: "Hydrated, structured VideoBrief object",
    details:
      "The first layer of defense. Pre-processes the raw text returned by the LLM and runs a lenient Zod schema where every field has a .catch() default. If the LLM misses enums, misspells keys, or drops arrays, Zod dynamically injects safe fallback values. The overall parse never throws.",
  },
  {
    id: "hydrate-brief",
    label: "hydrateBrief",
    summary: "Seeds deterministic RNG; fills creative defaults",
    file: "next/src/lib/agent/brief/buildProjectFromBrief.ts",
    symbol: "hydrateBrief",
    dataShape: "Fully detailed VideoBrief object",
    details:
      "Takes the parsed brief and seeds a deterministic random number generator (mulberry32) using a hash of the project title. This fills in any missing creative style parameters (particle densities, entry animations, column alignments). Different titles look unique; the same title renders identically every time.",
  },
  {
    id: "build-project",
    label: "buildProject",
    summary: "Expands the brief into concrete timeline events",
    file: "next/src/lib/agent/brief/buildProjectFromBrief.ts",
    symbol: "buildProjectFromBrief",
    dataShape: "VideoProject with TimelineEvent[]",
    details:
      "Translates abstract VideoBrief properties (layout points, timing act weights, gradients) into an array of concrete visual events (texts, rects, lines, particle systems) with absolute start/end times and coordinate positions. This is where *where* (coordinates) and *when* (timestamps) are computed — the AI only describes *what* and *how it feels*.",
  },
  {
    id: "quality-gate",
    label: "runQualityGate",
    summary: "Visual validation; 0–100 quality score",
    file: "next/src/lib/ui/renderer/validateProject.ts",
    symbol: "runQualityGate",
    dataShape: "QualityResult { passed, score, issues[] }",
    details:
      "Performs visual checks on the compiled VideoProject timeline: collision overlaps on the same layer, timing out-of-bounds, off-canvas coordinates, and text readability. Computes a numerical score from 0 to 100 and a list of QualityIssue diagnostics that surface in the chat UI.",
  },
  {
    id: "store",
    label: "Zustand Store",
    summary: "Client state + local persistence",
    file: "next/src/lib/ui/store.ts",
    symbol: "useStore",
    dataShape: "Persisted React client state",
    details:
      "Updates the client store, adding the generated project, brief, and quality diagnostics to the chat message timeline. A store subscriber serialises a clean slice of the state (sessions, duration, style, API key) to LocalStorage for offline persistence.",
  },
  {
    id: "player-canvas",
    label: "PlayerCanvas Hook",
    summary: "Reactive canvas element",
    file: "next/src/components/canvas/PlayerCanvas.tsx",
    dataShape: "Canvas rendering context hook",
    details:
      "A React component rendering the HTML5 <canvas> element. Using a decoupled useEffect tracking changes to currentTime and project, it bypasses React virtual DOM updates and commands direct 2D-context canvas draws. If drawing fails, it renders a visual error-reporting grid inside the canvas instead of crashing.",
  },
  {
    id: "render-frame",
    label: "renderProjectFrame",
    summary: "The Canvas 2D rendering engine",
    file: "next/src/lib/ui/renderer/renderProjectFrame.ts",
    symbol: "renderProjectFrame",
    dataShape: "Pixel frames drawn to the screen",
    details:
      "The rendering engine. Filters and computes active visible timeline events for the current time. Computes easing positions and Catmull-Rom spline curves, updates particle positions, and draws shape fills, vectors, and texts directly onto the screen — once per animation frame.",
  },
];

// Linear top-down flow (mirrors the mermaid `graph TD` in docs/architecture.md).
export const PIPELINE_EDGES: Array<[string, string]> = [
  ["user-prompt", "api-routes"],
  ["api-routes", "prompt-builder"],
  ["prompt-builder", "openrouter"],
  ["openrouter", "validate-brief"],
  ["validate-brief", "hydrate-brief"],
  ["hydrate-brief", "build-project"],
  ["build-project", "quality-gate"],
  ["quality-gate", "store"],
  ["store", "player-canvas"],
  ["player-canvas", "render-frame"],
];
