# Rebuild Plan — Videographic (`gui/`)

> **Philosophy:** Frontend first. You see something in the browser at every phase.  
> Logic and backend come _after_ you already have a working visual shell.  
> You write every line. The `videographic/main/` folder is your reference — read it, don't copy it.
>
> **Prioritization rule:** implement only what is required to keep the product running end-to-end; defer validation, deep typing, persistence, and tests unless they unblock runtime functionality.

---

## Phase 0 — Foundation

_Core runtime path: project setup, buildability, and a clean starting point_

- [x] Run `npx create-next-app@latest ./ --typescript --tailwind --src-dir --app --import-alias "@/*" --no-git`
- [x] Install runtime deps: `npm install zod zustand`
- [x] Install dev deps: `npm install -D vitest @vitest/coverage-v8`
- [x] Create `vitest.config.ts` with globals and `@` alias
- [x] Add `"test": "vitest run"` and `"test:watch": "vitest"` to `package.json` scripts
- [x] Strip `src/app/page.tsx` to just `export default function Page() { return <main /> }`
- [x] **Verify:** `npm run dev` → blank page, no errors
- [x] **Verify:** `npm run build` → compiles clean
- [x] **Verify:** `npm test` → exits 0

---

## Phase 1 — Layout + Design System

_Core runtime path: shared shell, tokens, and visual foundation_

- [x] Add design tokens (`--color-primary`, `--color-surface`, etc.) to `src/app/globals.css` using `@theme {}`
- [x] Add `@utility shell` (grid layout) and `@utility card` to `globals.css`
- [x] Add Inter font via `next/font/google` in `src/app/layout.tsx`
- [x] Build `src/components/layout/Sidebar.tsx` — app name, nav links, muted footer
- [x] Build `src/components/layout/TopBar.tsx` — title slot + right-side action slot
- [x] Update `src/app/layout.tsx` to wrap everything in `.shell` grid
- [x] Update `page.tsx` to show a placeholder heading in the content area
- [x] **Verify:** `npm run dev` → dark page with visible sidebar and top bar
- [x] **Verify:** Resize browser → sidebar collapses on narrow screens (`hidden md:block`)

---

## Phase 2 — UI Components (Hardcoded Data)

_Core runtime path: browser-visible screens with hardcoded content_

- [x] Build `src/components/generate/PromptForm.tsx` — textarea + Send button, Enter submits, Shift+Enter newlines, spinner when `isLoading`
- [x] Build `src/components/generate/MessageBubble.tsx` — `user` (right, primary) and `assistant` (left, surface-raised) variants
- [x] Build `src/components/generate/ChatThread.tsx` — scrollable message list, auto-scroll to bottom, 3 dummy messages
- [x] Build `src/components/generate/GenerateWorkspace.tsx` — `ChatThread` (top) + `PromptForm` (sticky bottom)
- [x] Build `src/components/home/ProjectCard.tsx` — name, thumbnail placeholder, date, Delete button
- [x] Build `src/components/home/HomeDashboard.tsx` — grid of `ProjectCard`, "New Project" button, empty state
- [x] Create `src/app/generate/page.tsx` → renders `GenerateWorkspace`
- [x] Update `src/app/page.tsx` → renders `HomeDashboard`
- [x] **Verify:** `/` → project grid with dummy cards
- [x] **Verify:** `/generate` → chat thread with dummy messages + prompt form
- [x] **Verify:** Typing + Enter → `console.log` fires

---

## Phase 3 — Canvas Renderer

_Core runtime path: generate visual output and preview it in the app_

- [x] Slice 1 — scaffold `renderProjectFrame(ctx, project, t)` with `clearRect` + solid fill
- [x] Slice 2 — `visibleEvents(project, t)`: filter by time range, sort by layer
- [x] Slice 3 — `drawBackground(ctx, event)`: solid → linear gradient → vignette overlay
- [x] Slice 4 — `drawText(ctx, event, opacity)` + `drawWrappedText()` helper
- [x] Slice 5 — `drawShape(ctx, event, opacity)`: rect, circle, triangle, line
- [x] Slice 6 — Easing functions: `linear`, `easeIn`, `easeOut`, `easeInOut`, `bounce`
- [x] Slice 7 — `animatedNumber(from, to, easingFn, progress)`, wire into draw functions
- [x] Build `src/app/demo/page.tsx` — 3 canvases side by side at `t=0`, `t=2.5`, `t=4.9`
- [x] Build `src/components/generate/InlinePreviewCard.tsx` — rAF loop, play/pause, scrubber, time display
- [x] Update `MessageBubble` to render `<InlinePreviewCard>` when message has a `project`
- [x] **Verify:** `/demo` → three frames with shapes/text at correct times
- [x] **Verify:** `/generate` → dummy assistant message shows animated canvas preview
- [x] **Verify:** Play/pause and scrub work

---

## Phase 4 — Core App State

_Core runtime path: move from hardcoded UI to shared live state with basic safety_

- [x] Define types in `src/types/generate.ts`: `ChatMessage`, `Session`
- [x] Slice 1 — state shape + setters: `setPrompt`, `setDuration`, `setStylePreset`, `clearError`
- [x] Slice 4 — `submitInitialPrompt(prompt)`: optimistic append → POST `/api/generate` → append result or error
- [x] Slice 5 — `submitModifyPrompt(sessionId, prompt)`: optimistic append → POST `/api/modify` → append result
- [x] Wire `HomeDashboard`, `ChatThread`, `PromptForm` to read from store (no more hardcoded data)
- [x] **Verify:** Submit prompt → spinner → error message in chat (API not real yet)

---

## Phase 5 — API Routes (Stub First)

_Core runtime path: make the app loop work through real request boundaries with minimal validation_

- [x] Define `GenerateRequestSchema` and `ModifyRequestSchema` in `src/lib/schemas/api.ts`
- [x] Build `src/app/api/generate/route.ts` — validate body, return `createSeedProject` + summary + diagnostics
- [x] Build `src/app/api/modify/route.ts` — same pattern, return project with modified title
- [x] **Verify:** Submit prompt in UI → spinner → assistant message with canvas preview, no console errors
- [x] **Verify:** `curl POST /api/generate` → valid JSON response

---

## Phase 6A — VideoBrief Layer (no LLM dependency)

_Build and test all deterministic modules first. No OpenRouter calls yet — pipeline still returns stubs._

> **Architecture:** The AI produces a **VideoBrief** (~200-token structured form), not a VideoProject.
> A deterministic **Brief Expander** (`buildProjectFromBrief`) handles all coordinates, timing,
> particles, and path animations. See `.scratch/video-brief-architecture/PRD.md` and `docs/adr/0001-...` for full rationale.

### Catalog

- [x] Build `src/lib/catalog/palettes.ts` — 6–8 Named Palettes: name → `{ bgFrom, bgTo, accent1, accent2, text, muted, glow }` exact color values
- [x] Build `src/lib/catalog/styles.ts` — 4–5 Named Styles: name → `{ radius, easing, strokeWeight, glowIntensity, particleDensity }`
- [x] Build `src/lib/catalog/timings.ts` — 5 Act Timing Tables (one per duration 5/10/15/20/30s), each defining act start/end boundaries and stagger offsets

### Brief Schema

- [x] Build `src/lib/schemas/brief.ts` — Zod schema for `VideoBrief` (layout, title, subtitle, leftRows/rightRows 2–4, flow toggle, blocks 2–5, palette key, style key, closingLine)

### Brief Validator

- [x] Build `src/lib/brief/validateBrief.ts` — `(raw: unknown) → VideoBrief`. Clamps rows to 2–4, replaces unknown palette/style with `"midnight"`/`"modern"`, fills missing fields, truncates blocks to 5. No API calls.

### Brief Expander

- [x] Build `src/lib/brief/buildProjectFromBrief.ts` — `(brief: VideoBrief, duration: SupportedDuration) → VideoProject`
  - [x] Two-Column layout: dynamic row heights (`max(80, min(140, availableH / count))`), labels vertically centered, connectors between exact row edges
  - [x] Single-Column layout: content blocks at fixed Y intervals, title top, closing line bottom
  - [x] Pipeline injection (Two-Column flow=true): ambient particles, request packet + arc path, request burst, processing glow + keyframed scale, response packet + arc path, response burst, celebration burst, deco baseline
  - [x] Pipeline injection (Two-Column flow=false): staggered stacks only, no packets
  - [x] Palette resolver: maps Named Palette key → colors on all events
  - [x] Style resolver: maps Named Style key → radius, easing, glow on all events
  - [x] Act timing: all event start/end values derived from Act Timing Table, never hardcoded
- [x] Wire `buildProjectFromBrief` into `/api/generate` stub (replace hardcoded `createSeedProject` with a hardcoded brief → expander call)
- [x] **Verify:** `/demo` still renders correctly
- [x] **Verify:** `/generate` → submit prompt → spinner → assistant message shows canvas from expanded brief

---

## Phase 6B — LLM Wiring

_Core runtime path: replace hardcoded brief with real AI-generated brief via OpenRouter_

### OpenRouter Client

- [x] Build `src/lib/ai/openrouter.ts` — `callOpenRouter(systemPrompt, userPrompt): Promise<unknown>` using `json_schema` response format targeting `VideoBrief` schema

### System Prompt

- [x] Build `src/lib/ai/prompts.ts`:
  - [x] `buildSystemPrompt(duration)` — compositional rules + keyword layout selection + palette/style catalog + act timing table + brief JSON schema + soft palette/style compatibility guidance
  - [x] `buildModifyPrompt(currentBrief, instruction)` — sends current brief + user instruction (not VideoProject)
- [x] Layout selection keywords in prompt: Two-Column triggers = "vs", "client", "server", "frontend", "backend", "before", "after", "request", "response", "architecture"; Single-Column is default

### Pipeline

- [x] Build `src/lib/ai/pipeline.ts`:
  - [x] `runGeneratePipeline(prompt, duration)` → call OpenRouter → `validateBrief` → `buildProjectFromBrief` → `validateProject` → return `{ project, brief, diagnostics }`
  - [x] `runModifyPipeline(currentBrief, instruction, duration)` → call OpenRouter with modify prompt → `validateBrief` → `buildProjectFromBrief` → `validateProject` → return `{ project, brief, diagnostics }`
  - [x] Store latest `brief` alongside `project` in session state (modify flow reads from brief, not project)
- [x] Replace stub returns in `/api/generate` and `/api/modify` with pipeline calls
- [x] Add `OPENROUTER_API_KEY=sk-or-...` to `.env.local`

### Eval Harness

- [x] Build `src/scripts/evalPrompts.ts` — CLI that runs 10–15 test prompts through the pipeline (real LLM), validates each expanded VideoProject with `validateProject()`, reports pass/fail matrix
- [x] **Verify:** Eval harness passes ≥80% of test prompts with zero errors from `validateProject()` — **12/15 (80%) ✅** 3 misses are layout judgement calls (vs/before-after/producer-consumer), no LLM errors
- [x] Iterate system prompt until eval passes reliably — passed on first clean run after `max_tokens=4096` fix

### End-to-end

- [x] **Verify:** Submit "a 15-second video about client-server architecture" → Two-Column layout, packets arc, processing steps appear, quality hybridProject-like output
- [x] **Verify:** Submit "explain the water cycle" → Single-Column layout, staggered content blocks
- [x] **Verify:** Submit follow-up "change the server to use Redis instead of PostgreSQL" → labels update, spatial layout stays correct, particles intact

---

## Phase 7 — WebM Exporter

_Core runtime path: export generated output once preview and generation are working_

- [x] Build `src/lib/core/MediaRecorderExporter.ts` — detect MIME type, capture stream, frame loop, collect chunks → Blob
- [x] Build `src/lib/core/VideoExporter.ts` — call exporter, create object URL, trigger download
- [x] Wire Export button into `InlinePreviewCard` with `isExporting` loading state
- [ ] **Verify:** Click Export → `.webm` file downloads
- [ ] **Verify:** Open file in browser or VLC → plays correctly

---

## Phase 8 — Schema + Type Hardening

_Delayed hardening: richer validation, deeper typing, and schema-driven contracts_

- [ ] `SupportedDurationSchema` → `z.union([z.literal(5), ...])`
- [ ] `StylePresetSchema` → `z.enum([...])`
- [ ] `TransitionPreset` → `z.enum([...])`
- [ ] `BackgroundPropertiesSchema` — solid / gradient / image discriminated union
- [ ] `TextPropertiesSchema`
- [ ] `ShapePropertiesSchema` — discriminated union on `shapeType`
- [ ] `AnimationSchema`
- [ ] `TimelineEventSchema` — discriminated union on `type`
- [ ] `VideoProjectSchema`
- [ ] Build `src/lib/alpha/createSeedProject(name, duration)` with background, 2 circles, line, title text events
- [ ] All timing calculated from `duration` param — no hardcoded `5`
- [ ] Replace hardcoded objects in `demo/page.tsx` with `createSeedProject("Test", 5)`
- [ ] Replace hardcoded project in dummy messages with `createSeedProject`
- [ ] Define app-facing schema-derived types where they materially reduce duplication

---

## Phase 9 — Persistence + UX Hardening

_Delayed hardening: persistence, hydration, and non-essential UX improvements_

- [ ] Slice 2 — persistence: `persistToStorage`, `hydrateFromStorage`, `HydrateStore` client component
- [ ] Slice 3 — `deleteSession(id)`
- [ ] Add `HydrateStore` to `layout.tsx`
- [ ] **Verify:** DevTools → Local Storage → state serialized after each action
- [ ] **Verify:** Refresh page → state restored
- [ ] **Verify:** `/demo` still renders correctly
- [ ] **Verify:** Play/pause and scrub still work after persistence wiring
- [ ] UI polish

---

## Phase 10 — Quality Gate + Test Suite

_Delayed hardening: formal tests, scoring, and correctness checks after the runtime path works_

### VideoBrief layer tests

- [ ] Tests in `src/__tests__/brief/validateBrief.test.ts`:
  - [ ] Valid brief passes through unchanged
  - [ ] Unknown palette → falls back to `"midnight"`; unknown style → falls back to `"modern"`
  - [ ] `leftRows` with 7 items → truncated to 4
  - [ ] Missing title → defaults to `"Untitled"`
  - [ ] Completely garbage input → returns a valid default brief
- [ ] Tests in `src/__tests__/brief/buildProjectFromBrief.test.ts`:
  - [ ] Two-Column brief → correct rect count, centered labels, connectors, particles, packet paths
  - [ ] Single-Column brief → correct content block count and positions
  - [ ] Variable row counts (2, 3, 4) → non-overlapping on-canvas rects
  - [ ] `flow: true` → adds packets, processing steps, bursts; `flow: false` → omits them
  - [ ] Every expanded project passes `validateProject()` (no errors, no off-canvas events)
  - [ ] Different palettes → different colors in output events
  - [ ] Different styles → different radii, easing, glow intensities
- [ ] Tests in `src/__tests__/catalog/catalog.test.ts`:
  - [ ] Every named palette resolves to a complete color set
  - [ ] Every named style resolves to a complete style set
  - [ ] Every supported duration has an act timing table
  - [ ] Default palette (`"midnight"`) and default style (`"modern"`) exist

### Renderer quality gate tests

- [ ] TDD: `checkBackgroundPresence` → `NO_BACKGROUND` error
- [ ] TDD: `checkTimingBoundaries` → `EVENT_EXCEEDS_DURATION`, `EVENT_NEGATIVE_START`
- [ ] TDD: `checkLayerOrdering` → `BACKGROUND_WRONG_LAYER` warning
- [ ] TDD: `checkTextReadability` → `TEXT_TOO_SMALL`, `TEXT_OUT_OF_SAFE_ZONE`
- [ ] TDD: `checkContentDensity` → `NO_TEXT_CONTENT`, `TOO_MANY_TEXT_EVENTS`, `NO_TITLE`
- [ ] TDD: `calculateScore` → `100 - (20×errors) - (8×warnings) - (2×info)`, floor 0
- [ ] TDD: `runQualityGate` → wires all checks, returns `{ score, passed, issues }`
- [ ] Write tests in `src/__tests__/quality-gate.test.ts`

### Schema tests

- [ ] Write tests in `src/__tests__/timeline/schemas.test.ts` — valid + invalid case per schema

### UI

- [ ] Build `src/components/generate/QualityPanel.tsx` — collapsible, score badge, issue list with icons
- [ ] Wire `QualityPanel` into `MessageBubble` (below canvas when diagnostics present)

### Verify

- [ ] **Verify:** `npm test` → all brief/expander/catalog tests pass
- [ ] **Verify:** `npm test` → all quality gate tests pass
- [ ] **Verify:** `npm test` → all schema tests pass
- [ ] **Verify:** Real AI response with issues → `QualityPanel` shows correct score and list
- [ ] **Verify:** Perfect project → green score badge

---

## Summary

| Phase | Name                       | You see in browser                                    | Priority |
| ----- | -------------------------- | ----------------------------------------------------- | -------- |
| 0     | Foundation                 | Blank page                                            | Required |
| 1     | Layout + Design System     | Dark shell, sidebar, top bar                          | Required |
| 2     | UI Components              | Full chat UI, home grid (hardcoded)                   | Required |
| 3     | Canvas Renderer            | Animated canvas inside chat                           | Required |
| 4     | Core App State             | UI reads live state                                   | Required |
| 5     | API Routes (Stub First)    | Full loop: type → submit → canvas                     | Required |
| 6A    | VideoBrief Layer (no LLM)  | Stub brief → hybridProject-quality canvas             | Required |
| 6B    | LLM Wiring                 | Real AI brief → hybridProject-quality canvas          | Required |
| 7     | WebM Exporter              | Export button downloads a video file                  | Required |
| 8     | Schema + Type Hardening    | No major visual change; contracts deepen              | Delayed  |
| 9     | Persistence + UX Hardening | State survives refresh, UX gets smoother              | Delayed  |
| 10    | Quality Gate + Test Suite  | Score badge, brief/expander tests, quality gate tests | Delayed  |

---

## Design Decisions (from grill session 2026-06-15)

> Full rationale in `.scratch/video-brief-architecture/PRD.md` and `docs/adr/0001-...`.
> Domain glossary updated in `CONTEXT.md`.

- **AI outputs a `VideoBrief`, not a `VideoProject`.** The brief is ~200 tokens (labels, palette key, style key, layout choice). The deterministic `buildProjectFromBrief` expander handles all coordinates, timing, particles, and path animations.
- **Two layout templates:** Two-Column (client/server, compare, architecture) and Single-Column (explainers, how-it-works). AI picks via keyword rules in the system prompt; Single-Column is the default.
- **Act timing is pre-computed** per duration (5/10/15/20/30s tables). AI never does arithmetic.
- **Particles and path animations are pipeline-injected** — never generated by the AI. They are formulaic given the layout template.
- **Named Palettes + Named Styles** are two independent curated catalogs. AI picks names; pipeline resolves to exact values. Soft guidance prevents ugly combinations.
- **Variable 2–4 rows per stack side** (asymmetric allowed). Row heights computed dynamically.
- **Flow is optional** (`flow: boolean` in brief). Two-Column without flow = side-by-side comparison with no packet arc.
- **Modify flow operates on the brief**, not the VideoProject. The expander re-runs from scratch after every modification.
- **Deterministic fallback** on invalid AI output — no repair loops. Every field has a default.
- **Eval harness** (`src/scripts/evalPrompts.ts`) validates expanded projects with `validateProject()` across 10–15 test prompts. Used to iterate system prompt.
