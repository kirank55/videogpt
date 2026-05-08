# Rebuild Plan — Videographic (`gui/`)

> **Philosophy:** Frontend first. You see something in the browser at every phase.  
> Logic and backend come _after_ you already have a working visual shell.  
> You write every line. The `videographic/main/` folder is your reference — read it, don't copy it.

---

## Phase 0 — Foundation

_Teaches: Next.js App Router, TypeScript strict mode, Vitest setup_

### What you build

A fresh Next.js project with testing configured and a blank homepage.

### Steps

1. Run `npx create-next-app@latest ./ --typescript --tailwind --src-dir --app --import-alias "@/*" --no-git`
2. Install runtime deps: `npm install zod zustand`
3. Install dev deps: `npm install -D vitest @vitest/coverage-v8`
4. Create `vitest.config.ts`:

   ```ts
   import { defineConfig } from "vitest/config";
   import path from "path";

   export default defineConfig({
     test: { globals: true },
     resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
   });
   ```

5. Add to `package.json` scripts:
   ```json
   "test": "vitest run",
   "test:watch": "vitest"
   ```
6. Strip `src/app/page.tsx` to just `export default function Page() { return <main /> }`

### Verify

- `npm run dev` → blank page, no errors
- `npm run build` → compiles clean
- `npm test` → exits 0 (no tests yet, that's fine)

---

## Phase 1 — Layout + Design System

_Teaches: Tailwind v4 `@theme`, design tokens, responsive layout, dark mode_

### What you build

A full-page dark shell with a sidebar, a top bar, and a content area — all empty but styled. This becomes the permanent skeleton every other phase fills in.

### Concepts first

- Tailwind v4 stores theme config inside `globals.css` using `@theme {}` — there is no `tailwind.config.ts`
- `@utility` lets you define reusable class names (like `.card`, `.shell`) without writing raw CSS
- `rem` units scale with browser font size — prefer them over `px` for layout

### Steps

**1. Design tokens in `src/app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(65% 0.22 260);
  --color-surface: oklch(18% 0.02 260);
  --color-surface-raised: oklch(22% 0.02 260);
  --color-muted: oklch(55% 0.04 260);
  --color-accent: oklch(72% 0.18 160);
  --color-danger: oklch(62% 0.22 25);

  --font-sans: "Inter", system-ui, sans-serif;

  --radius-card: 0.75rem;
  --radius-pill: 9999px;
}

@utility shell {
  display: grid;
  grid-template-columns: 16rem 1fr;
  grid-template-rows: 3.5rem 1fr;
  min-height: 100dvh;
  background-color: var(--color-surface);
  color: white;
}

@utility card {
  background-color: var(--color-surface-raised);
  border-radius: var(--radius-card);
  padding: 1rem;
}
```

**2. Add Google Fonts to `src/app/layout.tsx`**

```tsx
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });
// apply inter.className to <body>
```

**3. Build layout components**

- `src/components/layout/Sidebar.tsx` — app name at top, nav links (Home, History), muted footer
- `src/components/layout/TopBar.tsx` — page title slot, right-side action slot
- `src/app/layout.tsx` — wraps everything in the `.shell` grid

**4. Update `page.tsx`** to show a placeholder heading inside the content area

### Verify

- `npm run dev` → dark page with a visible sidebar and top bar
- Resize browser — sidebar collapses gracefully on narrow screens (`hidden md:block`)

---

## Phase 2 — UI Components (Hardcoded Data)

_Teaches: React components, props, composition, basic hooks, conditional rendering_

### What you build

Every major UI component the app needs — wired together with hardcoded dummy data. No state management, no API calls. Just components that _look_ right.

### Concepts first

- A React component is a function that returns JSX. Props are its inputs.
- `useState` holds local UI state (is this panel open? is this button loading?).
- You pass data _down_ via props and events _up_ via callback props (`onSubmit`, `onChange`).

### Components to build (in order)

**`src/components/generate/PromptForm.tsx`**

- A `<textarea>` and a Send button
- `Enter` (without Shift) submits; `Shift+Enter` is a newline
- Props: `onSubmit: (prompt: string) => void`, `isLoading: boolean`
- Show a spinner in the button when `isLoading` is true
- Test it: pass a hardcoded `onSubmit` that `console.log`s the value

**`src/components/generate/MessageBubble.tsx`**

- Two variants: `user` (right-aligned, primary color) and `assistant` (left-aligned, surface-raised)
- Props: `role: "user" | "assistant"`, `content: string`
- For now, always renders text. Will render a canvas preview later.

**`src/components/generate/ChatThread.tsx`**

- A scrollable column of `<MessageBubble>` components
- Accepts `messages: { role, content }[]`
- Auto-scrolls to bottom when messages change (`useEffect` + `ref.scrollIntoView()`)
- Hardcode 3 dummy messages to verify layout

**`src/components/generate/GenerateWorkspace.tsx`**

- Combines `ChatThread` (top, scrollable) + `PromptForm` (bottom, sticky)
- Full viewport height minus the top bar

**`src/components/home/ProjectCard.tsx`**

- A `.card` with a project name, a thumbnail placeholder (grey box), a date, and a Delete button
- Props: `name: string`, `createdAt: string`, `onDelete: () => void`

**`src/components/home/HomeDashboard.tsx`**

- A grid of `ProjectCard` components from a hardcoded array
- "New Project" button that navigates to `/generate`
- Empty state: if array is empty, show a centered "No projects yet" message

**`src/app/generate/page.tsx`**

- Renders `GenerateWorkspace`

**`src/app/page.tsx`**

- Renders `HomeDashboard`

### Verify

- `/` → project grid with dummy cards visible
- `/generate` → chat thread with dummy messages + prompt form at bottom
- Typing in the form and hitting Enter → `console.log` fires

---

## Phase 3 — Canvas Renderer

_Teaches: HTML5 Canvas 2D API, coordinate system, draw calls, easing, `requestAnimationFrame`_

### What you build

A module that takes a video project data object and draws it onto a `<canvas>` element — one frame at a time. Then a test page to see it working. Then `InlinePreviewCard` to embed it in the chat.

### Concepts first

- A `<canvas>` is a pixel grid. You draw on it by calling methods on a `CanvasRenderingContext2D` object.
- `ctx.clearRect()` wipes the canvas. You call it at the start of every frame.
- `requestAnimationFrame(callback)` tells the browser to call your function before the next repaint (~60fps). This is how animation loops work.
- **Easing** = a math function that maps a 0→1 progress value to a curved 0→1 output (fast start, slow end, bounce, etc.)
- **Interpolation** = "at time `t`, what is this property's value between its start and end value?" You use easing to shape the curve.

### Steps

**`src/lib/core/FabricRenderer.ts`** — build in slices, eyeball each one

Slice 1 — scaffold:

```ts
export function renderProjectFrame(
  ctx: CanvasRenderingContext2D,
  project: VideoProject,
  t: number, // current time in seconds
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // fill solid color for now
  ctx.fillStyle = project.backgroundColor;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}
```

Slice 2 — `visibleEvents(project, t)`: filter events where `startTime <= t < startTime + duration`, sort by `layer` ascending.

Slice 3 — `drawBackground(ctx, event)`: solid color → linear gradient (with angle) → vignette overlay (radial gradient, black transparent to semi-black).

Slice 4 — `drawText(ctx, event, opacity)`: `ctx.font`, `ctx.fillStyle`, `ctx.globalAlpha`, `ctx.fillText()`. Add `drawWrappedText()` helper that splits text into lines.

Slice 5 — `drawShape(ctx, event, opacity)`: `rect` → `ctx.fillRect()`, `circle` → `ctx.arc()`, `triangle` → `ctx.moveTo/lineTo`, `line` → `ctx.strokeStyle`.

Slice 6 — Easing functions:

```ts
export const easing = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => 1 - (1 - t) ** 2,
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  bounce: (t: number) => {
    /* standard bounce formula */
  },
};
```

Slice 7 — `animatedNumber(from, to, easingFn, progress)`: returns interpolated value. Wire into opacity, x, y, fontSize inside draw functions.

**`src/app/test-canvas/page.tsx`** — temporary verification page:

- Three hardcoded `<canvas>` elements side by side
- Renders the seed project (hardcoded inline object for now) at `t=0`, `t=2.5`, `t=4.9`
- Delete this page when Phase 8 is done

**`src/components/generate/InlinePreviewCard.tsx`**:

- `<canvas ref={canvasRef} />`
- `useEffect` sets up a `requestAnimationFrame` loop that increments time and calls `renderProjectFrame`
- Play/pause button toggles a `isPlaying` state that controls whether time advances
- Scrubber `<input type="range">` for manual time seeking
- Time display `0:00 / 0:05`
- Props: `project: VideoProject`

Update `MessageBubble` to render `<InlinePreviewCard>` when the message has a `project` attached.

### Verify

- `/test-canvas` → three canvas frames visible, shapes/text drawn at correct times
- `/generate` → dummy assistant message shows an animated canvas preview
- Play/pause and scrub work

---

## Phase 4 — Zustand Store

_Teaches: Zustand v5, global state, localStorage persistence, optimistic UI_

### What you build

A single global store that holds all app state. Components stop using hardcoded data and read from the store instead.

### Concepts first

- Zustand is a tiny state manager. You define a store as a function that returns state + actions.
- `useStore(state => state.something)` — components subscribe to slices of state and re-render only when that slice changes.
- **Optimistic UI** = update the UI _immediately_ when the user acts, then correct it if the server disagrees. Feels instant.
- **Persistence** = save state to `localStorage` so it survives page refresh. You serialize to JSON on write, parse on read.

### Steps

**`src/types/generate.ts`** — define types:

```ts
export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  project?: VideoProject;
};

export type Session = {
  id: string;
  prompt: string;
  messages: ChatMessage[];
  createdAt: string;
};
```

**`src/stores/generate-store.ts`** — build in slices:

Slice 1 — state shape + setters:

```ts
type State = {
  prompt: string;
  duration: SupportedDuration;
  stylePreset: StylePreset;
  sessions: Session[];
  activeSessionId: string | null;
  isLoading: boolean;
  error: string | null;
};
```

Actions: `setPrompt`, `setDuration`, `setStylePreset`, `clearError`

Slice 2 — persistence:

- `persistToStorage(state)` → `localStorage.setItem("videographic-v1", JSON.stringify(...))`
- `hydrateFromStorage()` → parse and set state
- Call `hydrateFromStorage()` once at app startup via a `HydrateStore` client component

Slice 3 — `deleteSession(id)`: removes from `sessions`, clears `activeSessionId` if it matches

Slice 4 — `submitInitialPrompt(prompt)`:

1. Create a new `Session` with the user message appended (optimistic)
2. Set `isLoading: true`
3. `POST /api/generate` with `{ prompt, duration, stylePreset }`
4. On success: append assistant message with the returned project
5. On error: append an error message

Slice 5 — `submitModifyPrompt(sessionId, prompt)`:

1. Append user message to existing session (optimistic)
2. `POST /api/modify` with `{ prompt, sessionId, previousProject }`
3. On success: append assistant message with updated project

### Wiring

- Replace all hardcoded data in `HomeDashboard`, `ChatThread`, `PromptForm` with store reads
- `HydrateStore` client component in `layout.tsx` calls `hydrateFromStorage` on mount

### Verify

- Submit a prompt → loading spinner appears → (API not real yet, will error) → error message in chat
- Open DevTools → Application → Local Storage → confirm state is serialized after each action
- Refresh page → state is restored

---

## Phase 5 — Domain Schemas

_Teaches: Zod, TypeScript type inference, TDD red→green cycle_

### What you build

Zod schemas for every data shape the app uses. These become the single source of truth for types.

### Concepts first

- Zod defines the _shape_ of your data and validates it at runtime. `z.string()`, `z.number()`, `z.object({})`.
- `z.infer<typeof MySchema>` extracts a TypeScript type from a schema — no duplicated type definitions.
- TDD: write a failing test (`expect(fn()).toThrow()`) → run test → see it fail (red) → implement → run test → see it pass (green).

### Schemas to build (one red→green cycle each)

File: `src/lib/schemas/timeline.ts`

```
SupportedDurationSchema     → z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20), z.literal(30)])
StylePresetSchema           → z.enum(["minimal", "bold", "cinematic", "playful", "dark"])
TransitionPreset            → z.enum(["fade", "slide", "zoom", "none"])
BackgroundPropertiesSchema  → { type: "solid"|"gradient"|"image", color, gradientColors?, angle?, imageUrl? }
TextPropertiesSchema        → { content, fontSize, fontFamily, color, align, bold, italic, shadow? }
ShapePropertiesSchema       → discriminated union on shapeType: "rect"|"circle"|"ellipse"|"triangle"|"line"|"arrow"
AnimationSchema             → { property, from, to, easing, delay, duration }
TimelineEventSchema         → discriminated union on type: "background"|"text"|"shape"|"image"
VideoProjectSchema          → { id, name, duration, backgroundColor, events: TimelineEvent[] }
```

Tests file: `src/__tests__/timeline/schemas.test.ts`

For each schema, write at least:

- One test that passes a valid object → no throw
- One test that passes an invalid object → throws `ZodError`

### Verify

- `npm test` → all schema tests pass

---

## Phase 6 — Seed Project Factory

_Teaches: Constructing valid typed objects programmatically, using schemas as contracts_

### What you build

A function that generates a complete, valid `VideoProject` with real timeline events. This replaces all inline hardcoded objects used in earlier phases.

### Steps

**`src/lib/alpha/createSeedProject.ts`**:

```ts
export function createSeedProject(
  name: string,
  duration: SupportedDuration,
): VideoProject {
  return {
    id: crypto.randomUUID(),
    name,
    duration,
    backgroundColor: "#0f0f1a",
    events: [
      // background: full duration solid color
      // circle 1: appears at 0, animates opacity 0→1
      // circle 2: appears at 1s, different color, animates scale
      // line: appears at 2s
      // title text: appears at 0.5s, animates y position
    ],
  };
}
```

All `duration` and `startTime` values must be calculated from the `duration` param — no hardcoded `5`.

**Update earlier phases:**

- Replace hardcoded project objects in `test-canvas/page.tsx` with `createSeedProject("Test", 5)`
- Replace hardcoded project in any dummy message with `createSeedProject`

**Test:**

```ts
it("passes schema validation", () => {
  expect(() =>
    VideoProjectSchema.parse(createSeedProject("test", 5)),
  ).not.toThrow();
  expect(() =>
    VideoProjectSchema.parse(createSeedProject("test", 30)),
  ).not.toThrow();
});
```

### Verify

- `npm test` → seed factory tests pass
- `/test-canvas` still renders correctly using the factory

---

## Phase 7 — API Routes (Stub First)

_Teaches: Next.js route handlers, HTTP methods, Zod at the API boundary, stub-first development_

### What you build

Two API endpoints that return real-shaped data (using the seed factory) without any AI. The full UI loop — type prompt → see canvas — works end to end.

### Concepts first

- A Next.js route handler lives in `src/app/api/[route]/route.ts` and exports named functions: `GET`, `POST`, etc.
- `Request` is the Web API request object. `Response.json(data)` sends JSON back.
- Validate the request body with Zod _before_ using any of its values. Return a 400 if it fails.

### Steps

**`src/lib/schemas/api.ts`** — request schemas:

```ts
export const GenerateRequestSchema = z.object({
  prompt: z.string().min(1),
  duration: SupportedDurationSchema,
  stylePreset: StylePresetSchema,
});

export const ModifyRequestSchema = z.object({
  prompt: z.string().min(1),
  sessionId: z.string(),
  previousProject: VideoProjectSchema,
});
```

**`src/app/api/generate/route.ts`**:

```ts
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success)
    return Response.json({ error: "Invalid request" }, { status: 400 });

  const project = createSeedProject(parsed.data.prompt, parsed.data.duration);
  return Response.json({
    summary: `Created a ${parsed.data.duration}s video about: ${parsed.data.prompt}`,
    project,
    diagnostics: { score: 100, passed: true, issues: [] },
  });
}
```

**`src/app/api/modify/route.ts`** — same pattern, return project with modified title.

### Verify

- Submit "explain gravity" in the UI → spinner → assistant message appears with canvas preview
- No errors in console or terminal
- `curl -X POST http://localhost:3000/api/generate -H "Content-Type: application/json" -d '{"prompt":"test","duration":5,"stylePreset":"minimal"}'` → valid JSON response

---

## Phase 8 — WebM Exporter

_Teaches: MediaRecorder API, `canvas.captureStream()`, Blob, file download_

### What you build

A module that records the canvas animation to a `.webm` video file and triggers a browser download.

### Concepts first

- `canvas.captureStream(fps)` returns a `MediaStream` — a live feed of canvas pixels.
- `MediaRecorder` wraps a stream and encodes it to a video format in chunks.
- When recording is stopped, you collect all the chunks into a `Blob` and create an object URL to download.
- MIME type support varies by browser: try `video/webm;codecs=vp9` → `video/webm;codecs=vp8` → `video/webm` as fallback.

### Steps

**`src/lib/core/MediaRecorderExporter.ts`**:

```ts
export async function exportProjectWithMediaRecorder(
  canvas: HTMLCanvasElement,
  project: VideoProject,
  fps: number = 30,
): Promise<Blob> {
  // 1. Detect supported MIME type
  // 2. canvas.captureStream(fps)
  // 3. new MediaRecorder(stream, { mimeType })
  // 4. Frame loop: for each frame t, call renderProjectFrame, requestAnimationFrame
  // 5. After all frames, recorder.stop()
  // 6. Collect ondataavailable chunks → resolve Blob
}
```

**`src/lib/core/VideoExporter.ts`**:

```ts
export async function exportProjectVideo(
  canvas: HTMLCanvasElement,
  project: VideoProject,
): Promise<void> {
  const blob = await exportProjectWithMediaRecorder(canvas, project);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.toLowerCase().replace(/\s+/g, "-")}.webm`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Wire into `InlinePreviewCard`**:

- Export button calls `exportProjectVideo(canvasRef.current, project)`
- Show loading state while exporting (`isExporting` local state)

### Verify

- Click Export on any canvas preview → `.webm` file downloads
- Open the file in browser or VLC → plays correctly

---

## Phase 9 — AI Integration

_Teaches: Fetch API, OpenRouter structured JSON output, prompt engineering, pipeline design_

### What you build

Replace the stub API routes with real AI calls that generate actual video projects from natural language prompts.

### Concepts first

- OpenRouter is an API gateway that gives access to many LLMs via one endpoint.
- `json_schema` mode tells the model to return a response that matches a specific JSON schema — no free-form text.
- A **pipeline** is a sequence of steps: generate → validate → optionally repair → return. Each step can fail and the pipeline handles it.
- **Prompt engineering**: the system prompt sets the model's role and rules. The user prompt provides the specific request. The repair prompt explains what was wrong and asks for a fix.

### Steps

**`src/lib/ai/prompts.ts`**:

```ts
export function buildSystemPrompt(): string {
  /* role, rules, schema description */
}
export function buildInitialPrompt(
  prompt: string,
  duration: number,
  style: string,
): string;
export function buildModifyPrompt(
  prompt: string,
  previousProject: VideoProject,
): string;
export function buildRepairPrompt(
  project: VideoProject,
  issues: QualityIssue[],
): string;
```

**`src/lib/ai/openrouter.ts`**:

```ts
export async function callOpenRouter(
  messages: { role: string; content: string }[],
  schema: object, // your VideoProject JSON schema
): Promise<unknown> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-flash-1.5",
      response_format: { type: "json_schema", json_schema: { schema } },
      provider: { require_parameters: true },
      messages,
    }),
  });
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}
```

**`src/lib/ai/pipeline.ts`**:

```ts
export async function runGeneratePipeline(
  prompt: string,
  duration: SupportedDuration,
  stylePreset: StylePreset
): Promise<{ project: VideoProject; summary: string; diagnostics: QualityResult }> {
  // 1. Call OpenRouter with initial prompt
  // 2. Parse and normalize response with VideoProjectSchema
  // 3. Run quality gate
  // 4. If score < 60: call OpenRouter again with repair prompt (max 1 retry)
  // 5. Return final project + diagnostics
}

export async function runModifyPipeline(...): Promise<...> { /* same pattern */ }
```

**`src/lib/ai/validateGeneratedProject.ts`**:

- Normalize raw AI JSON: clamp event durations, insert a background event if missing, resolve `SupportedDuration` to nearest valid value
- This runs before the quality gate so the gate always sees clean data

**Wire routes:** Replace stub returns in `/api/generate` and `/api/modify` with `runGeneratePipeline` and `runModifyPipeline`.

**`.env.local`**:

```
OPENROUTER_API_KEY=sk-or-...
```

### Verify

- Submit "a 10-second video about the solar system" → real AI response → canvas renders a space-themed project
- Check terminal for API response logs
- Submit a follow-up "make the text bigger" → canvas updates

---

## Phase 10 — Quality Gate

_Teaches: Pure function TDD, scoring logic, systematic validation, surfacing errors in UI_

### What you build

A scoring system that checks every AI-generated project for structural errors (missing background, bad timing, unreadable text) and returns a score and issue list. Then a `QualityPanel` component to show it.

### Concepts first

- A **pure function** takes inputs and returns outputs with no side effects — no API calls, no DOM, no randomness. Easy to test.
- TDD is ideal here because every check is deterministic: given _this_ project, always return _these_ issues.
- The quality gate runs _inside the AI pipeline_ as a safeguard, and is also shown to the user in the UI.

### Checks to implement (one red→green TDD cycle each)

File: `src/lib/ai/quality-gate.ts`

```
checkBackgroundPresence    → NO_BACKGROUND (error) if no background event at layer 0
checkTimingBoundaries      → EVENT_EXCEEDS_DURATION (error), EVENT_NEGATIVE_START (error)
checkLayerOrdering         → BACKGROUND_WRONG_LAYER (warning) if bg event not on lowest layer
checkTextReadability       → TEXT_TOO_SMALL (warning) if fontSize < 12, TEXT_OUT_OF_SAFE_ZONE (warning)
checkContentDensity        → NO_TEXT_CONTENT, TOO_MANY_TEXT_EVENTS, NO_TITLE (info/warning)
calculateScore             → 100 - (20 × errors) - (8 × warnings) - (2 × info), floor 0
runQualityGate             → wires all checks, returns { score, passed: score >= 60, issues }
```

Tests: `src/__tests__/quality-gate.test.ts`

**`src/components/generate/QualityPanel.tsx`**:

- Collapsible panel (click header to toggle)
- Score badge: green ≥ 80, yellow ≥ 60, red < 60
- Issue list with icons: 🔴 error, 🟡 warning, 🔵 info
- Props: `diagnostics: QualityResult`

Wire `QualityPanel` into `MessageBubble` — show below the canvas preview when an assistant message has diagnostics.

### Verify

- `npm test` → all quality gate tests pass
- A real AI response with issues → `QualityPanel` shows the correct score and issue list
- A perfect project → green score badge

---

## Summary Table

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
