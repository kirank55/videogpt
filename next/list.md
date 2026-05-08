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

- [ ] Slice 1 — scaffold `renderProjectFrame(ctx, project, t)` with `clearRect` + solid fill
- [ ] Slice 2 — `visibleEvents(project, t)`: filter by time range, sort by layer
- [ ] Slice 3 — `drawBackground(ctx, event)`: solid → linear gradient → vignette overlay
- [ ] Slice 4 — `drawText(ctx, event, opacity)` + `drawWrappedText()` helper
- [ ] Slice 5 — `drawShape(ctx, event, opacity)`: rect, circle, triangle, line
- [ ] Slice 6 — Easing functions: `linear`, `easeIn`, `easeOut`, `easeInOut`, `bounce`
- [ ] Slice 7 — `animatedNumber(from, to, easingFn, progress)`, wire into draw functions
- [ ] Build `src/app/test-canvas/page.tsx` — 3 canvases side by side at `t=0`, `t=2.5`, `t=4.9`
- [ ] Build `src/components/generate/InlinePreviewCard.tsx` — rAF loop, play/pause, scrubber, time display
- [ ] Update `MessageBubble` to render `<InlinePreviewCard>` when message has a `project`
- [ ] **Verify:** `/test-canvas` → three frames with shapes/text at correct times
- [ ] **Verify:** `/generate` → dummy assistant message shows animated canvas preview
- [ ] **Verify:** Play/pause and scrub work

---

## Phase 4 — Core App State

_Core runtime path: move from hardcoded UI to shared live state with basic safety_

- [ ] Define types in `src/types/generate.ts`: `ChatMessage`, `Session`
- [ ] Slice 1 — state shape + setters: `setPrompt`, `setDuration`, `setStylePreset`, `clearError`
- [ ] Slice 4 — `submitInitialPrompt(prompt)`: optimistic append → POST `/api/generate` → append result or error
- [ ] Slice 5 — `submitModifyPrompt(sessionId, prompt)`: optimistic append → POST `/api/modify` → append result
- [ ] Wire `HomeDashboard`, `ChatThread`, `PromptForm` to read from store (no more hardcoded data)
- [ ] **Verify:** Submit prompt → spinner → error message in chat (API not real yet)

---

## Phase 5 — API Routes (Stub First)

_Core runtime path: make the app loop work through real request boundaries with minimal validation_

- [ ] Define `GenerateRequestSchema` and `ModifyRequestSchema` in `src/lib/schemas/api.ts`
- [ ] Build `src/app/api/generate/route.ts` — validate body, return `createSeedProject` + summary + diagnostics
- [ ] Build `src/app/api/modify/route.ts` — same pattern, return project with modified title
- [ ] **Verify:** Submit prompt in UI → spinner → assistant message with canvas preview, no console errors
- [ ] **Verify:** `curl POST /api/generate` → valid JSON response

---

## Phase 6 — AI Integration

_Core runtime path: replace stub generation with a real model-backed pipeline_

- [ ] Build `src/lib/ai/prompts.ts`: `buildSystemPrompt`, `buildInitialPrompt`, `buildModifyPrompt`, `buildRepairPrompt`
- [ ] Build `src/lib/ai/openrouter.ts`: `callOpenRouter(messages, schema)` using `json_schema` response format
- [ ] Build `src/lib/ai/validateGeneratedProject.ts` — normalize raw AI JSON before quality gate
- [ ] Build `src/lib/ai/pipeline.ts`: `runGeneratePipeline` (generate → validate → quality gate → optional repair)
- [ ] Build `runModifyPipeline` with same pattern
- [ ] Replace stub returns in `/api/generate` and `/api/modify` with pipeline calls
- [ ] Add `OPENROUTER_API_KEY=sk-or-...` to `.env.local`
- [ ] **Verify:** Submit "a 10-second video about the solar system" → real AI canvas renders
- [ ] **Verify:** Submit follow-up "make the text bigger" → canvas updates

---

## Phase 7 — WebM Exporter

_Core runtime path: export generated output once preview and generation are working_

- [ ] Build `src/lib/core/MediaRecorderExporter.ts` — detect MIME type, capture stream, frame loop, collect chunks → Blob
- [ ] Build `src/lib/core/VideoExporter.ts` — call exporter, create object URL, trigger download
- [ ] Wire Export button into `InlinePreviewCard` with `isExporting` loading state
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
- [ ] Replace hardcoded objects in `test-canvas/page.tsx` with `createSeedProject("Test", 5)`
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
- [ ] **Verify:** `/test-canvas` still renders correctly
- [ ] **Verify:** Play/pause and scrub still work after persistence wiring
- [ ] UI polish

---

## Phase 10 — Quality Gate + Test Suite

_Delayed hardening: formal tests, scoring, and correctness checks after the runtime path works_

- [ ] Write tests in `src/__tests__/timeline/schemas.test.ts` — valid + invalid case per schema
- [ ] Write test: `VideoProjectSchema.parse(createSeedProject("test", 5))` doesn't throw
- [ ] TDD: `checkBackgroundPresence` → `NO_BACKGROUND` error
- [ ] TDD: `checkTimingBoundaries` → `EVENT_EXCEEDS_DURATION`, `EVENT_NEGATIVE_START`
- [ ] TDD: `checkLayerOrdering` → `BACKGROUND_WRONG_LAYER` warning
- [ ] TDD: `checkTextReadability` → `TEXT_TOO_SMALL`, `TEXT_OUT_OF_SAFE_ZONE`
- [ ] TDD: `checkContentDensity` → `NO_TEXT_CONTENT`, `TOO_MANY_TEXT_EVENTS`, `NO_TITLE`
- [ ] TDD: `calculateScore` → `100 - (20×errors) - (8×warnings) - (2×info)`, floor 0
- [ ] TDD: `runQualityGate` → wires all checks, returns `{ score, passed, issues }`
- [ ] Write tests in `src/__tests__/quality-gate.test.ts`
- [ ] Build `src/components/generate/QualityPanel.tsx` — collapsible, score badge, issue list with icons
- [ ] Wire `QualityPanel` into `MessageBubble` (below canvas when diagnostics present)
- [ ] **Verify:** `npm test` → all schema tests pass
- [ ] **Verify:** `npm test` → seed factory tests pass
- [ ] **Verify:** `npm test` → all quality gate tests pass
- [ ] **Verify:** Real AI response with issues → `QualityPanel` shows correct score and list
- [ ] **Verify:** Perfect project → green score badge

---

## Summary

| Phase | Name                      | You see in browser                       | Priority |
| ----- | ------------------------- | ---------------------------------------- | -------- |
| 0     | Foundation                | Blank page                               | Required |
| 1     | Layout + Design System    | Dark shell, sidebar, top bar             | Required |
| 2     | UI Components             | Full chat UI, home grid (hardcoded)      | Required |
| 3     | Canvas Renderer           | Animated canvas inside chat              | Required |
| 4     | Core App State            | UI reads live state                      | Required |
| 5     | API Routes (Stub First)   | Full loop: type → submit → canvas        | Required |
| 6     | AI Integration            | Real AI generates actual videos          | Required |
| 7     | WebM Exporter             | Export button downloads a video file     | Required |
| 8     | Schema + Type Hardening   | No major visual change; contracts deepen | Delayed  |
| 9     | Persistence + UX Hardening| State survives refresh, UX gets smoother | Delayed  |
| 10    | Quality Gate + Test Suite | Score badge + formal test coverage       | Delayed  |
