# PRD: VideoBrief Architecture — AI Generation Layer

Status: `ready-for-agent`

## Problem Statement

When a user asks videogpt to generate a video (e.g., "create a video of client-server architecture"), the system needs to produce output matching the quality of the hand-crafted demo projects — specifically hybridProject: 50+ events with precise spatial layout, 5-act narrative structure, staggered animations, particle atmospherics, and path-animated packet flows.

The current plan (Phase 6 in the rebuild checklist) calls for a system prompt that tells the LLM to generate a full VideoProject JSON directly. But LLMs — especially the open models targeted (Kimi, Minimax via OpenRouter) — are unreliable at the multi-step coordinate arithmetic, spatial alignment, and formulaic effect generation this requires. The result is labels floating above rects, connectors pointing at empty space, packets arcing off-screen, and no particles or path animations.

## Solution

Instead of having the LLM generate a VideoProject, the LLM generates a **VideoBrief** — a small structured form (~200 tokens) containing layout choice, labels, palette name, style name, flow toggle, and content text. A deterministic **Brief Expander** (`buildProjectFromBrief`) transforms this brief into a complete VideoProject with exact coordinates, particles, path animations, and all pipeline-injected effects.

The LLM's job is reduced to semantic/creative decisions: choosing labels, picking a palette, deciding whether a prompt describes a flow or a comparison. All spatial math, timing, color resolution, and effect generation is handled by deterministic, testable code.

## User Stories

1. As a user, I want to type "create a video about client-server architecture" and get a video with two labeled stacks, a request/response flow, processing steps, particles, and a closing line — matching hybridProject quality.
2. As a user, I want to type "explain the water cycle" and get a single-column video with staggered content blocks revealing each stage progressively.
3. As a user, I want to say "change the server labels to Nginx, Redis, MongoDB" and get an updated video where only the labels changed but all spatial alignment, particles, and paths are still correct.
4. As a user, I want the video to have a cohesive color palette that doesn't look muddy or clashing, without needing to specify colors myself.
5. As a user, I want the video to have a clear act structure — title → content → closing — not a flat dump of all elements at once.
6. As a user, I want the system to always produce a renderable video, even if the LLM returns malformed output, by falling back to sensible defaults.
7. As a user, I want to choose a video duration (5, 10, 15, 20, or 30 seconds) and have the act structure scale appropriately.
8. As a user, I want the video to have ambient particles, celebration bursts, and packet arc animations automatically — without needing to describe these in my prompt.
9. As a user, I want "React vs Vue" to produce a side-by-side comparison (two columns, no packet flow), while "how a REST API handles a request" produces a two-column flow with packets and processing steps.
10. As a user, I want the visual style (sharp brutalist corners vs smooth modern rounded) to be independent of the color palette, so I get meaningful variety across videos.
11. As a user, I want the system to work reliably with affordable open models (Kimi, Minimax), not require expensive frontier models.
12. As a user, I want follow-up modifications to be fast, since the LLM only needs to update a ~200-token brief rather than regenerate 10,000+ tokens of VideoProject JSON.
13. As a user, I want architecture diagrams to have exactly 2–4 labeled rows per stack, with labels vertically centered in their containers and connectors running between exact row edges.
14. As a user, I want processing steps (e.g., "Validate → Hash Password → INSERT INTO users") to appear staggered inside the server stack during the processing act.
15. As a user, I want a title card at the beginning and a closing line at the end of every video.
16. As a user, I want the system to automatically choose Two-Column layout when my prompt mentions comparisons, architectures, or two-sided concepts, and Single-Column for everything else.

## Implementation Decisions

### Architecture: VideoBrief as intermediate format (ADR 0001)

The LLM outputs a VideoBrief, not a VideoProject. This is the central architectural decision. The Brief Expander is the deepest module — all spatial, timing, and visual correctness lives there. See `docs/adr/0001-video-brief-over-direct-project-generation.md` for the full rationale and rejected alternatives.

### VideoBrief schema shape

```typescript
type VideoBrief = {
  layout: "two-column" | "single-column";
  title: string;
  subtitle?: string;
  closingLine?: string;

  // Two-Column
  leftHeader?: string;
  rightHeader?: string;
  leftRows?: string[];       // 2–4 labels
  rightRows?: string[];      // 2–4 labels

  // Two-Column flow (optional)
  flow?: boolean;
  requestLabel?: string;
  requestBody?: string;
  responseLabel?: string;
  processingSteps?: string[];

  // Single-Column
  blocks?: { heading: string; description: string }[];  // 2–5

  // Visual
  palette: string;   // Named palette key
  style: string;     // Named style key
};
```

### Module decomposition

8 modules, organized by concern:

1. **Brief Schema** (`lib/schemas/brief.ts`) — Zod schema for VideoBrief. Pure types, no logic. Defines the AI–pipeline contract.

2. **Catalog** (`lib/catalog/`) — Curated data objects:
   - `palettes.ts` — 6–8 Named Palettes mapping name → exact color values (background gradient, accent1, accent2, text, muted, glow)
   - `styles.ts` — 4–5 Named Styles mapping name → shape/animation properties (corner radius, easing, stroke weight, glow intensity, particle density)
   - `timings.ts` — 5 Act Timing Tables (one per supported duration: 5/10/15/20/30s), each defining act boundaries and stagger offsets

3. **Brief Expander** (`lib/brief/buildProjectFromBrief.ts`) — Pure function: `(brief: VideoBrief, duration: SupportedDuration) → VideoProject`. The deepest module. Encapsulates all spatial layout math, timing assignment, and pipeline injection. Sub-concerns:
   - Layout grid computation (Two-Column/Single-Column row positions, dynamic row heights for 2–4 rows)
   - Structural event generation (background, rects, labels, headers, connectors)
   - Pipeline injection (ambient particles, packet paths, request/response bursts, processing glow + keyframed scale, celebration burst, deco baseline)
   - Act timing assignment from pre-computed tables

4. **Brief Validator** (`lib/brief/validateBrief.ts`) — Pure function: `(raw: unknown) → VideoBrief`. Deterministic fallback normalizer. Clamps row counts to 2–4, replaces unknown palette/style names with defaults (`"midnight"` / `"modern"`), fills missing fields, truncates content blocks to 5. No API calls, no repair loops.

5. **System Prompt** (`lib/ai/prompts.ts`) — `buildSystemPrompt(duration)` containing: compositional rules for act structure, keyword-based layout selection (Two-Column triggers: "vs", "client/server", "frontend/backend", etc.; Single-Column as default), palette/style name catalogs, the brief JSON schema, and soft guidance for palette+style compatibility. `buildModifyPrompt(currentBrief, instruction)` sends the current brief + user instruction.

6. **OpenRouter Client** (`lib/ai/openrouter.ts`) — HTTP wrapper for OpenRouter API with `json_schema` response format. Parse response, extract JSON, pass to Brief Validator.

7. **Pipeline** (`lib/ai/pipeline.ts`) — Orchestration:
   - Generate: call OpenRouter → validate brief → expand to VideoProject → run `validateProject()` quality checks → return project + diagnostics
   - Modify: send current brief + instruction → validate updated brief → re-expand → quality checks
   - Stores the current brief alongside the VideoProject for the modify flow

8. **Eval Harness** (`scripts/evalPrompts.ts`) — CLI script that runs 10–15 test prompts through the pipeline, validates each expanded VideoProject with `validateProject()`, and reports a pass/fail matrix. Used to iterate on the system prompt.

### Layout template selection

Keyword rules in the system prompt, Single-Column as default:
- Two-Column triggers: prompt contains "vs", "versus", "comparison", "client", "server", "frontend", "backend", "before", "after", "sender", "receiver", "input", "output", "request", "response", "architecture"
- Everything else: Single-Column

### Spatial layout

Pre-computed coordinate grids. For Two-Column:
- Left column x=100, right column x=1320, width=500
- Row positions computed dynamically from row count: `rowH = max(80, min(140, availableHeight / count))`
- Labels vertically centered: `labelY = rowY + (rowH - fontSize) / 2`
- Connectors run between exact row edges

For Single-Column:
- Content blocks at fixed Y intervals (~200px apart, starting at y=300)
- Title centered at top, closing line at bottom

### Act timing

Pre-computed tables, one per supported duration. Example for 15s:
- Act 1 (title): 0–2.5s
- Act 2 (setup): 2.5–4.5s
- Act 3 (action/request): 4.5–7.5s
- Act 4 (processing): 7.5–10.5s
- Act 5 (response+outro): 10.5–15s

### Palette + style as independent axes

Palette controls colors. Style controls animation/shape personality. Combined via soft guidance in the system prompt (e.g., "pair dark palettes with glowing styles, pair light palettes with sketch styles"). No hard compatibility matrix.

### Deterministic fallback (no repair loops)

Every brief field has a default. Unknown values are replaced silently. The Brief Expander always produces a valid, renderable VideoProject. This is critical for reliability with open models.

### Modify flow operates on briefs

The pipeline stores the latest VideoBrief alongside the expanded VideoProject. Modifications re-prompt the LLM with the current brief + instruction. The LLM returns an updated brief. The Brief Expander re-runs from scratch — new VideoProject, correct coordinates, fresh pipeline injections.

## Testing Decisions

Tests should verify external behavior (input → output), not implementation details. All modules listed below are pure functions or thin wrappers, making them naturally testable without mocking internals.

### Brief Schema (`lib/schemas/brief.ts`)
- Valid briefs parse without error
- Invalid briefs (wrong layout name, missing required fields, too many rows) are rejected
- Edge cases: empty strings, 0 rows, 5+ rows, unknown palette/style names

### Catalog (`lib/catalog/`)
- Every named palette resolves to a complete color set (all required keys present)
- Every named style resolves to a complete style set
- Every supported duration has an act timing table
- Default palette (`"midnight"`) and default style (`"modern"`) exist

### Brief Expander (`lib/brief/buildProjectFromBrief.ts`)
- Two-Column brief → VideoProject with correct number of rect events, text events, connectors, particles, packet paths
- Single-Column brief → VideoProject with correct number of content block events
- Variable row counts (2, 3, 4) produce non-overlapping, on-canvas rects with centered labels
- Flow=true adds packet events, processing steps, bursts; flow=false omits them
- Expanded VideoProject passes `validateProject()` (no timing errors, no off-canvas events, no layer collisions)
- Different palettes produce different colors in the output events
- Different styles produce different radii, easing values, glow intensities

### Brief Validator (`lib/brief/validateBrief.ts`)
- Valid brief passes through unchanged
- Unknown palette → falls back to `"midnight"`
- Unknown style → falls back to `"modern"`
- 7 rows → truncated to 4
- Missing title → defaults to `"Untitled"`
- Completely garbage input → returns a valid default brief

### Pipeline (`lib/ai/pipeline.ts`)
- Integration test with mocked OpenRouter: valid brief JSON → returns VideoProject + diagnostics
- Mocked OpenRouter returns garbage → deterministic fallback produces valid VideoProject
- Modify flow: sends current brief + instruction, returns updated VideoProject
- Diagnostics include score and issue list from `validateProject()`

### Eval Harness (`scripts/evalPrompts.ts`)
- Runs against a set of fixture briefs (no LLM call) to verify the harness itself works
- Reports correct pass/fail counts

Prior art: `src/scripts/analyzeProject.ts` (spatial diagnostics), `src/lib/renderer/validateProject.ts` (timing/bounds/collision checks), `src/__tests__/` directory structure in the reference codebase.

## Out of Scope

- **Third layout template (Flow/Pipeline)** — Two-Column and Single-Column cover 80%+ of real prompts. Flow/Pipeline can be added later as a separate brief.
- **User-facing layout/palette/style selectors in the UI** — the AI decides for now. Power-user overrides are a separate feature.
- **Streaming/progressive rendering** — the full VideoProject is generated in one shot.
- **Multi-model fallback** — if the primary model fails, we don't automatically try a different model. The deterministic fallback handles bad output.
- **Image events** — the renderer supports only background, text, shape, and particle events. No image/media embedding.
- **Audio/narration** — canvas-only output.
- **WebM export integration** — handled separately in Phase 7.
- **Persistence of briefs/projects** — handled separately in Phase 9.
- **Quality gate scoring UI (QualityPanel)** — handled separately in Phase 10.

## Further Notes

- The Brief Expander is the most important module. Its quality directly determines video quality. It should be built and tested thoroughly before any LLM integration.
- The system prompt should be iterable — the eval harness exists specifically to support rapid prompt engineering without manual inspection of every output.
- The catalog (palettes, styles, timings) is designed to be extended over time. Adding a new palette or style is a data change, not a code change.
- The VideoBrief schema will likely need to evolve as new layout templates or content types are added. The deterministic fallback ensures backward compatibility — old briefs always produce valid output even if the schema grows.
