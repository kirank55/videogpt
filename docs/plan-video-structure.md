# Plan: Improve Video Structure, Diagrams, Text Placement, and Duration Scaling

This plan is the output of a grilling session (see `docs/adr/0001` and `docs/adr/0002` for the two hard-to-reverse decisions). It addresses three reported problems:

1. **Longer-duration videos look slow** — a 20s video is the same 5s content stretched.
2. **Weak video structure** — only 2 layouts, one fixed 5-act skeleton, no scene/chapter concept.
3. **Poor diagram/text placement** — hardcoded coordinates, no layout engine, text overlaps, cramped 700x600 diagram box, greedy word-wrap.

Root cause for all three: there is no composable content unit, no real layout engine, and content cardinality is duration-independent.

---

## Resolved design decisions (from the grilling)

| # | Decision | Choice |
|---|---|---|
| 1 | Structural unit | Scene-based composition: a video = 1..N Scenes |
| 2 | Scene rhythm | 2-level: global title + closing; scenes have a 3-beat rhythm (heading → content → hold) |
| 3 | Scene count vs duration | AI-authored count with duration guidance (~1 scene / 5s); expander splits time via `sceneWeights` |
| 4 | Per-scene vs video-level fields | Palette/style global; layout/entry/variant/blockStyle per-scene (variety knobs) |
| 5 | Scene schema richness | Full mini-brief per scene (AI controls all creative fields; prompt instructs variety) |
| 6 | Scene transitions | Implement `TRANSITION_PRESETS` as per-event entry/exit opacity/translate anims with overlap |
| 7 | Two-column | Removed; single-column + graph diagrams handle everything (incl. request/response) |
| 8 | Diagram authoring | Graph-based: nodes + edges + layout strategy; expander computes coordinates |
| 9 | Canvas arrangement | The layout strategy owns the full 1920x1080 canvas (places nodes + blocks together) |
| 10 | Layout strategies (v1) | pipeline, client-server, hub-spoke, stack (the 4 the AI already knows) |
| 11 | Animated flow | Edges with `animated: true` carry a Packet traveling along the edge path |
| 12 | Text placement | Real layout pass in the expander using a precomputed Inter font-metrics table |
| 13 | Backward compat | No migration; old persisted projects are discarded |
| 14 | Layout planning boundary | Dedicated `SceneLayoutPlan` module; the expander translates plans to `TimelineEvent`s |
| 15 | Node placement hints | Add optional `layoutRole` to nodes; validator drops invalid roles and expander infers only when missing |
| 16 | Crowded scenes | Expander does not split scenes; it fits/fallbacks in-place and reports dev-only diagnostics |
| 17 | v1 content budgets | `pipeline` 5 nodes/5 blocks; `client-server` 6 nodes/4 blocks; `hub-spoke` 5 nodes/4 blocks; `stack` 5 nodes/5 blocks; max 4 animated edges |
| 18 | Over-budget normalization | Preserve author order; trim extra blocks, decorative nodes, dangling/non-animated edges, then animated edges beyond 4 |
| 19 | Collision model | Check the all-content hold state plus swept packet paths; ignore transition-only overlap except safe-margin/main-heading hits |
| 20 | Collision resolution | Try ranked layout strategy variants with deterministic scoring before strategy fallback; avoid generic pixel nudging except inside text boxes |
| 21 | Strategy fallback order | `pipeline` -> `stack`; `hub-spoke` -> `stack`; `client-server` falls back to `stack` only after role/label remedies fail; `stack` has no fallback |

---

## Phased work

### Phase 1 — Schema & contract redesign (`lib/agent/schemas/`, `lib/others/schemas/`)

**Goal:** define the new `VideoBrief` and `Scene` shapes; remove two-column; make the brief duration-aware through scenes.

1. **`brief.ts`** — restructure `VideoBriefSchema`:
   - Video-level (keep/shared): `title`, `subtitle`, `closingLine`, `palette`, `style`, `particleIntensity`, `decorations`.
   - New: `scenes: SceneSchema[]` (min 1). Each `Scene`:
     - `heading` (string, the scene's title, smaller than the video title)
     - `diagramLayout`: `"pipeline" | "client-server" | "hub-spoke" | "stack"`
     - `blocks`: 2–5 `{ heading, description, icon? }` (content)
     - `graph`: `{ nodes: Node[], edges: Edge[] }` (replaces `visualElements`)
       - `Node`: `{ id, label, icon?, kind?, layoutRole?, color? }`
       - `Edge`: `{ from, to, label?, animated?, packetLabel?, packetColor? }`
     - Per-scene creative (the variety knobs): `entryAnimation`, `blockStyle`, `emphasizeIndex`, `transition` (from `TRANSITION_PRESETS`), optional `actEasings`, optional `colorOverrides` (accent swap).
     - `sceneWeight`: optional number (time distribution).
   - Remove: `layout` enum (single only now), all two-column fields (`leftHeader`, `rightHeader`, `leftRows`, `rightRows`, `flow`, `requestLabel`, `responseLabel`, `processingSteps`, `annotations`, `flowStyle`, `variant`, `emphasizeLeft/Right`, `leftIcons/rightIcons`), `visualElements` (replaced by `graph`), `actWeights` (replaced by `sceneWeights`).
   - Keep `SUPPORTED_DURATIONS = [5, 10, 15, 20]`. Fix the stale `api.ts` JSDoc that mentions 30.
   - Keep `TRANSITION_PRESETS` enum — now actually implemented (Phase 3).

2. **`api.ts`** — `GenerateRequestSchema` unchanged (prompt + duration). `ModifyRequestSchema` still carries the brief (now scene-shaped). Keep the duration default consistent (pick 5 or 15 and use it everywhere; resolve the api.ts=5 vs resolveDuration=15 divergence).

3. **`timeline.ts`** — `VideoProjectSchema` unchanged in shape (still flat `events[]` + `duration`), but add a `Scene` is NOT a timeline event type — scenes are an expander input, not a render primitive. No schema change needed here except confirming `VideoProject` stays a flat event list.

4. **`validateBrief.ts`** — extend the lenient never-throws normalizer:
   - Accept the new `scenes[]` shape; if `scenes` is missing/invalid, wrap the legacy content as a single scene (so a half-formed LLM output still renders).
   - Per-scene `.catch` defaults for every creative field.
   - Drop all two-column normalization. Drop `actWeights` preprocessing.
   - Normalize `graph`: ensure node ids are unique, edges reference existing node ids, drop dangling edges.
   - Enforce scene content budgets by trimming or normalizing excessive blocks/nodes; do not split one scene into multiple scenes. v1 budgets: `pipeline` max 5 nodes/5 blocks, `client-server` max 6 nodes/4 blocks, `hub-spoke` max 5 nodes/4 blocks, `stack` max 5 nodes/5 blocks, and max 4 animated edges for every layout.
   - Use deterministic over-budget normalization: preserve author order as importance; trim extra blocks after the layout max; keep graph nodes in author order while prioritizing nodes referenced by animated edges over unreferenced decorative nodes; drop dangling edges; trim non-animated edges before animated edges; if animated edges exceed the max, keep the first 4 in author order.

**Verify:** `npx tsc --noEmit` from `next/`. Update `__tests__/brief/validateBrief.test.ts` for the new shape.

---

### Phase 2 — Scene layout engine (new module: `lib/agent/brief/sceneLayout/`)

**Goal:** turn one Scene plus canvas settings into a `SceneLayoutPlan` before any TimelineEvents are emitted. The plan owns named regions, graph placement, block placement, text boxes, collision checks, layout fallbacks, and developer-only diagnostics.

1. **`sceneLayout/index.ts`** — `layoutScene(scene, canvas) -> SceneLayoutPlan`. `graphLayout` can remain as a strategy helper underneath this boundary, but callers should consume the scene-level plan rather than raw graph boxes.
2. **Scene content budgets** — each strategy defines practical block/node limits: `pipeline` max 5 nodes/5 blocks, `client-server` max 6 nodes/4 blocks, `hub-spoke` max 5 nodes/4 blocks, `stack` max 5 nodes/5 blocks, and max 4 animated edges for every layout. Crowded scenes are handled by fit policy, label omission, or layout fallback inside the same Scene; diagnostics record the pressure. The layout module never creates extra Scenes.
3. **Collision occupancy model** — check the Scene's shared hold moment where all meaningful content may be visible together. Static occupancy includes headings, nodes, blocks, labels, and edges. Animated Packets are checked as swept-path envelopes. Transition-only overlap between adjacent Scenes is ignored unless it hits safe margins or the main heading.
4. **Layout strategy variants** — each strategy exposes a ranked set of deterministic variants such as roomy/compact, blocks-bottom/blocks-side, or labels-on/labels-off. The layout module scores variants for collisions, safe-margin violations, text-fit degradation, omitted labels, and semantic role violations, then chooses the best passing plan. Use generic pixel nudging only inside text boxes.
5. **Strategy fallback order** — `pipeline` falls back to `stack` preserving node order. `hub-spoke` falls back to `stack` with the hub first, then spokes. `client-server` strongly prefers staying `client-server`; only fall back to `stack` when roles are missing/invalid or collisions remain after labels are dropped. `stack` has no strategy fallback in v1.
6. **`graphLayout/pipeline.ts`** — horizontal sequence: nodes evenly spaced left→right across the canvas width; blocks as captions below each node. Connectors between adjacent nodes.
7. **`graphLayout/clientServer.ts`** — two node columns (left group, right group); edges between groups; blocks as legends under each column. This is what handles request/response cycles.
8. **`graphLayout/hubSpoke.ts`** — central node + radial peripherals; blocks as a bottom legend row.
9. **`graphLayout/stack.ts`** — nodes stacked vertically (current single-column style preserved); blocks on the left.
10. **Edge path computation** — for each edge, compute the connector path (straight line with `startPadding`/`endPadding` to stop at node boundaries; reuse the existing `getRectIntersection`/`getCircleIntersection`/`subtractIntervals` clipping from `singleColumnLayout.ts` so connectors don't cross solid nodes).
11. **Packet path** — for `animated` edges, compute a 2-point Catmull-Rom path from source-node center to target-node center (reuses the renderer's existing `PathAnimation`).
12. **Reuse** the geometry helpers from `briefHelpers.ts` (W, H, rowH, etc.) where applicable; extract shared constants.

**Verify:** unit tests for each strategy with snapshot-style assertions on node positions (deterministic). `npx tsc --noEmit`.

---

### Phase 3 — Scene expander (rewrite `lib/agent/brief/buildProjectFromBrief.ts`)

**Goal:** turn a scene-based `VideoBrief` + `duration` into a flat `TimelineEvent[]`.

1. **Duration split** — `splitDurationAcrossScenes(duration, sceneWeights)` → per-scene `timeSlice`. Default equal split; normalize weights; 0.5s minimum per scene.
2. **Global title** — emit title events at `[0, titleDuration]` where `titleDuration = min(2.5, slice0 * 0.3)` (title overlays the start of scene 1).
3. **Global closing** — emit closing events at `[duration - closingDuration, duration]` where `closingDuration = min(2.5, lastSlice * 0.3)`.
4. **Per-scene expansion** — for each scene, within its `[sceneStart, sceneEnd]` slice:
   - Run the graph layout (Phase 2) to get node/edge/block coordinates.
   - 3-beat rhythm: `heading` reveal (first ~15% of slice) → content stagger (next ~50%, blocks + nodes enter with `entryAnimation` + `blockIndex`-based stagger) → hold/flow (remaining ~35%, animated packets travel on `animated` edges).
   - Emit text events for headings, block headings/descriptions, node labels, edge labels (with backdrops).
   - Emit shape events for nodes (rect/circle with icon), connector lines (with draw-in `entry`), packet shapes (with `path` animation) for animated edges.
   - Apply the scene's `transition` as per-event entry/exit animations (fade/slide/zoom) at the scene's start/end with a 0.4s overlap window with the adjacent scene.
5. **Background + particles** — one video-level background event spanning `[0, duration]`; one particle event (density from video-level `particleIntensity`) spanning `[0.2, duration]`. Decorations (corner brackets, scan lines) become per-scene or video-level as appropriate.
6. **Retire** — delete `twoColumnLayout.ts`, `singleColumnLayout.ts` (replaced by the graph-layout-driven expander), the `TIMINGS` catalog, `resolveActTimings`, and all 5-act logic.
7. **`hydrateBrief`** — keep the deterministic creative-field hydration (seed from title hash), now per-scene for any omitted creative fields, with anti-repetition as a safety net (if adjacent scenes end up with identical `entryAnimation`, nudge the second — but since the AI authors full scenes, this is a fallback only).

**Verify:** `npx tsc --noEmit`. Update `__tests__/brief/buildProjectFromBrief.test.ts`. Run `npm run analyze` on sample projects.

---

### Phase 4 — Text layout pass with font metrics (new module: `lib/others/fontMetrics/`)

**Goal:** measure text server-side to size node boxes, wrap descriptions, and prevent overlaps.

1. **`fontMetrics/interGlyphWidths.ts`** — a precomputed table of per-glyph advance widths for Inter at a reference size (e.g. 100px), generated once at build time via a small Node script that loads the Inter `.ttf` with `fontkit` (dev dependency only) and writes a JSON table. Ship the JSON; runtime just looks up `width = table[char] * (fontSize / 100)`.
2. **`fontMetrics/measure.ts`** — `measureText(text, fontSize, fontWeight) → width`; `wrapText(text, fontSize, maxWidth) → string[]` (greedy with the metric table, plus break-long-word fallback for URLs/code tokens); `estimateHeight(lines, fontSize, lineHeight) → height`.
3. **Integrate into the expander (Phase 3):**
   - Size each node box to fit its label (grow the box, or auto-shrink the font to a floor of 14px, using real measurement — replaces the `charWidth = fontSize * 0.70` heuristic).
   - Wrap block descriptions to the measured column width.
   - Detect collisions between laid-out text boxes and nudge (shift down/side, or shrink font) before finalizing coordinates.
   - Replace `estimateTextLines` and `getStaticEventBounds`'s `fontSize * 3` heuristic with measured values.

**Verify:** unit tests comparing `measureText` output against a known-good canvas measurement (a few sample strings). `npx tsc --noEmit`.

---

### Phase 5 — Renderer updates (`lib/ui/renderer/`)

**Goal:** the renderer is already a dumb draw loop; mostly confirm it handles the new events. Minimal changes.

1. **`renderProjectFrame.ts`** — no change (already duration-agnostic, draws active events by layer).
2. **`text.ts`** — add `verticalAlign: "bottom"` (currently only top/middle) for edge labels that sit below a line. Keep greedy `splitLines` as a fallback (the expander now pre-wraps, but the renderer still wraps against `maxWidth`).
3. **`shape.ts`** — confirm packet shapes (circle with `path` animation) render correctly (already supported via `applyShapeTransform` + `pathOffset`). Confirm edge connector lines with `drawProgress` draw-in work (already supported).
4. **`animation.ts`** — confirm transition per-event entry/exit animations work (they're just `AnimatedValue` opacity/translate, already supported). No change.
5. **`geometry.ts`** — update `getStaticEventBounds` for text to use measured heights (from Phase 4) instead of `fontSize * 3`, so the analyzer's overlap detection is accurate.
6. **Delete** any two-column-specific rendering helpers (there are none in the renderer — two-column was all in the expander).

**Verify:** `npx tsc --noEmit`. `npx eslint` on changed files. Manual canvas render of a 4-scene 20s project.

---

### Phase 6 — Prompt rewrite (`lib/agent/ai/prompts.ts`)

**Goal:** teach the LLM the new scene-based, graph-based schema.

1. **`buildSystemPrompt(duration)`** — restructure:
   - Replace `VIDEO DURATION: ${duration}s` guidance with scene-count guidance: "Suggested scene count for ${duration}s: ~N (1 per 5s). Author that many scenes; deviate only if the content genuinely needs fewer/more."
   - Replace the layout-selection section (two-column vs single-column) with the 4 `diagramLayout` strategies and when to use each.
   - Replace `DIAGRAM_GUIDE` (coordinate-based) with a graph-based guide: nodes (label, icon, kind), edges (from, to, label, animated), the 4 strategies, and when to use `animated` edges (request/response, data flow).
   - Replace the FIELD GUIDE's two-column/single-column sections with the `Scene` shape (heading, diagramLayout, blocks, graph, creative fields, transition, sceneWeight).
   - Add an explicit "VARY YOUR SCENES" instruction: different `diagramLayout`/`entryAnimation`/`blockStyle` per scene; never repeat the same combination on adjacent scenes.
   - Keep the palette/style catalogs and compatibility hints.
   - Update the embedded `VIDEO_BRIEF_JSON_SCHEMA` to match the new `brief.ts` (scenes[], graph{}, nodes[], edges[]).
2. **`buildModifyPrompt(currentBrief, instruction)`** — operates on `scenes[]`; "preserve all scenes and fields the instruction does not affect."
3. **Remove** `TWO_COLUMN_KEYWORDS` and all two-column guidance.
4. **`pipeline.ts`** — `runGeneratePipeline` / `runModifyPipeline` signatures unchanged (still take `duration`); the shared tail still calls `buildProjectFromBrief(brief, duration)`.

**Verify:** run `npm run eval` to benchmark prompt quality. Run `npm run diag` for end-to-end check.

---

### Phase 7 — Tests, analyzer, and cleanup

1. **`__tests__/`** — update `validateBrief.test.ts`, `buildProjectFromBrief.test.ts`, and any renderer tests for the new shapes. Add tests for `splitDurationAcrossScenes`, each graph layout strategy, and `measureText`/`wrapText`.
2. **`scripts/analyzeProject.ts`** — update spatial diagnostics for graph diagrams (node/edge overlap checks replace the old visual-element checks). Update `checkActCoverage` → `checkSceneCoverage` (per-scene density histogram).
3. **`scripts/`** — update any eval/diag scripts that construct sample briefs.
4. **`alpha/createSeedProject.ts`** — update to emit a one-scene graph-based project.
5. **Delete dead code:** `twoColumnLayout.ts`, `singleColumnLayout.ts`, `catalog/timings.ts` (the 5-act table), two-column fields from `brief.ts`/`validateBrief.ts`, `TWO_COLUMN_KEYWORDS`, column geometry in `briefHelpers.ts`.
6. **`architecture.md`** — update the pipeline diagram and stage descriptions for the new expander + graph layout.

**Verify:** `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run analyze`, `npm run eval`.

---

## Suggested build order

Phases 1 → 2 → 4 → 3 → 5 → 6 → 7. Build the schema (1), then the graph layout engine (2) and font metrics (4) as independent foundations, then the scene expander (3) that uses both, then renderer polish (5), then the prompt (6), then tests/cleanup (7). Phases 2 and 4 can be built in parallel.

## What this fixes

- **Longer duration looks slow** → a 20s video now has ~4 distinct scenes with different content, not the same 5-act content stretched. Time is filled with new content, not idle hold.
- **Weak structure** → scenes give the video a real narrative arc (title → scene 1 → scene 2 → ... → closing); 4 layout strategies give structural variety.
- **Diagram/text placement** → graph-based layout computes coordinates (no more cramped 700x600 hand-authored box); real font metrics size node boxes and wrap text accurately; collision detection prevents overlaps.
