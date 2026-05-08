# Rebuild Plan — Videographic (`gui/`)

> **Philosophy:** Frontend first. You see something in the browser at every phase.  
> Logic and backend come _after_ you already have a working visual shell.  
> You write every line. The `videographic/main/` folder is your reference — read it, don't copy it.

---

## Phase 0 — Foundation

_Teaches: Next.js App Router, TypeScript strict mode, Vitest setup_

- [x] Run `npx create-next-app@latest ./ --typescript --tailwind --src-dir --app --import-alias "@/*" --no-git`
- [x] Install runtime deps: `npm install zod zustand`
- [x] Install dev deps: `npm install -D vitest @vitest/coverage-v8`
- x Create `vitest.config.ts` with globals and `@` alias
- [x] Add `"test": "vitest run"` and `"test:watch": "vitest"` to `package.json` scripts
- [x] Strip `src/app/page.tsx` to just `export default function Page() { return <main /> }`
- [x] **Verify:** `npm run dev` → blank page, no errors
- [x] **Verify:** `npm run build` → compiles clean
- [x] **Verify:** `npm test` → exits 0

---

## Phase 1 — Layout + Design System

_Teaches: Tailwind v4 `@theme`, design tokens, responsive layout, dark mode_

- [x] Add design tokens (`--color-primary`, `--color-surface`, etc.) to `src/app/globals.css` using `@theme {}`
- [x] Add `@utility shell` (grid layout) and `@utility card` to `globals.css`
- [ ] Add Inter font via `next/font/google` in `src/app/layout.tsx`
- [ ] Build `src/components/layout/Sidebar.tsx` — app name, nav links, muted footer
- [ ] Build `src/components/layout/TopBar.tsx` — title slot + right-side action slot
- [ ] Update `src/app/layout.tsx` to wrap everything in `.shell` grid
- [ ] Update `page.tsx` to show a placeholder heading in the content area
- [ ] **Verify:** `npm run dev` → dark page with visible sidebar and top bar
- [ ] **Verify:** Resize browser → sidebar collapses on narrow screens (`hidden md:block`)

---

## Phase 2 — UI Components (Hardcoded Data)

_Teaches: React components, props, composition, basic hooks, conditional rendering_

- [ ] Build `src/components/generate/PromptForm.tsx` — textarea + Send button, Enter submits, Shift+Enter newlines, spinner when `isLoading`
- [ ] Build `src/components/generate/MessageBubble.tsx` — `user` (right, primary) and `assistant` (left, surface-raised) variants
- [ ] Build `src/components/generate/ChatThread.tsx` — scrollable message list, auto-scroll to bottom, 3 dummy messages
- [ ] Build `src/components/generate/GenerateWorkspace.tsx` — `ChatThread` (top) + `PromptForm` (sticky bottom)
- [ ] Build `src/components/home/ProjectCard.tsx` — name, thumbnail placeholder, date, Delete button
- [ ] Build `src/components/home/HomeDashboard.tsx` — grid of `ProjectCard`, "New Project" button, empty state
- [ ] Create `src/app/generate/page.tsx` → renders `GenerateWorkspace`
- [ ] Update `src/app/page.tsx` → renders `HomeDashboard`
- [ ] **Verify:** `/` → project grid with dummy cards
- [ ] **Verify:** `/generate` → chat thread with dummy messages + prompt form
- [ ] **Verify:** Typing + Enter → `console.log` fires

---

## Phase 3 — Canvas Renderer

_Teaches: HTML5 Canvas 2D API, coordinate system, draw calls, easing, `requestAnimationFrame`_

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

## Phase 4 — Zustand Store

_Teaches: Zustand v5, global state, localStorage persistence, optimistic UI_

- [ ] Define types in `src/types/generate.ts`: `ChatMessage`, `Session`
- [ ] Slice 1 — state shape + setters: `setPrompt`, `setDuration`, `setStylePreset`, `clearError`
- [ ] Slice 2 — persistence: `persistToStorage`, `hydrateFromStorage`, `HydrateStore` client component
- [ ] Slice 3 — `deleteSession(id)`
- [ ] Slice 4 — `submitInitialPrompt(prompt)`: optimistic append → POST `/api/generate` → append result or error
- [ ] Slice 5 — `submitModifyPrompt(sessionId, prompt)`: optimistic append → POST `/api/modify` → append result
- [ ] Wire `HomeDashboard`, `ChatThread`, `PromptForm` to read from store (no more hardcoded data)
- [ ] Add `HydrateStore` to `layout.tsx`
- [ ] **Verify:** Submit prompt → spinner → error message in chat (API not real yet)
- [ ] **Verify:** DevTools → Local Storage → state serialized after each action
- [ ] **Verify:** Refresh page → state restored

---

## Phase 5 — Domain Schemas

_Teaches: Zod, TypeScript type inference, TDD red→green cycle_

- [ ] `SupportedDurationSchema` → `z.union([z.literal(5), ...])`
- [ ] `StylePresetSchema` → `z.enum([...])`
- [ ] `TransitionPreset` → `z.enum([...])`
- [ ] `BackgroundPropertiesSchema` — solid / gradient / image discriminated union
- [ ] `TextPropertiesSchema`
- [ ] `ShapePropertiesSchema` — discriminated union on `shapeType`
- [ ] `AnimationSchema`
- [ ] `TimelineEventSchema` — discriminated union on `type`
- [ ] `VideoProjectSchema`
- [ ] Write tests in `src/__tests__/timeline/schemas.test.ts` — valid + invalid case per schema
- [ ] **Verify:** `npm test` → all schema tests pass

---

## Phase 6 — Seed Project Factory

_Teaches: Constructing valid typed objects programmatically, using schemas as contracts_

- [ ] Build `src/lib/alpha/createSeedProject(name, duration)` with background, 2 circles, line, title text events
- [ ] All timing calculated from `duration` param — no hardcoded `5`
- [ ] Replace hardcoded objects in `test-canvas/page.tsx` with `createSeedProject("Test", 5)`
- [ ] Replace hardcoded project in dummy messages with `createSeedProject`
- [ ] Write test: `VideoProjectSchema.parse(createSeedProject("test", 5))` doesn't throw
- [ ] **Verify:** `npm test` → seed factory tests pass
- [ ] **Verify:** `/test-canvas` still renders correctly

---

## Phase 7 — API Routes (Stub First)

_Teaches: Next.js route handlers, HTTP methods, Zod at the API boundary, stub-first development_

- [ ] Define `GenerateRequestSchema` and `ModifyRequestSchema` in `src/lib/schemas/api.ts`
- [ ] Build `src/app/api/generate/route.ts` — validate body, return `createSeedProject` + summary + diagnostics
- [ ] Build `src/app/api/modify/route.ts` — same pattern, return project with modified title
- [ ] **Verify:** Submit prompt in UI → spinner → assistant message with canvas preview, no console errors
- [ ] **Verify:** `curl POST /api/generate` → valid JSON response

---

## Phase 8 — WebM Exporter

_Teaches: MediaRecorder API, `canvas.captureStream()`, Blob, file download_

- [ ] Build `src/lib/core/MediaRecorderExporter.ts` — detect MIME type, capture stream, frame loop, collect chunks → Blob
- [ ] Build `src/lib/core/VideoExporter.ts` — call exporter, create object URL, trigger download
- [ ] Wire Export button into `InlinePreviewCard` with `isExporting` loading state
- [ ] **Verify:** Click Export → `.webm` file downloads
- [ ] **Verify:** Open file in browser or VLC → plays correctly

---

## Phase 9 — AI Integration

_Teaches: Fetch API, OpenRouter structured JSON output, prompt engineering, pipeline design_

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

## Phase 10 — Quality Gate

_Teaches: Pure function TDD, scoring logic, systematic validation, surfacing errors in UI_

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
- [ ] **Verify:** `npm test` → all quality gate tests pass
- [ ] **Verify:** Real AI response with issues → `QualityPanel` shows correct score and list
- [ ] **Verify:** Perfect project → green score badge

---

## Summary

| Phase | Name               | You see in browser                       | Key concept                       |
| ----- | ------------------ | ---------------------------------------- | --------------------------------- |
| 0     | Foundation         | Blank page                               | App Router, Vitest                |
| 1     | Layout + Design    | Dark shell, sidebar, top bar             | Tailwind v4 `@theme`              |
| 2     | UI Components      | Full chat UI, home grid (hardcoded)      | React components, props           |
| 3     | Canvas Renderer    | Animated canvas inside chat              | Canvas 2D API, rAF, easing        |
| 4     | Zustand Store      | UI reads live state, persists on refresh | Zustand, localStorage             |
| 5     | Domain Schemas     | No visual change; types locked in        | Zod, TDD                          |
| 6     | Seed Factory       | Hardcoded objects replaced by factory    | Typed construction                |
| 7     | API Routes (Stubs) | Full loop: type → submit → canvas        | Route handlers, Zod at boundary   |
| 8     | WebM Exporter      | Export button downloads a video file     | MediaRecorder, Blob               |
| 9     | AI Integration     | Real AI generates actual videos          | OpenRouter, JSON schema, pipeline |
| 10    | Quality Gate       | Score badge + issue list in chat         | Pure function TDD, scoring        |
