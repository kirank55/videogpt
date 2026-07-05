# Plan: Prompt-shaped diagram generation

## Problem

The current generated briefs for "GPS Signal Explained" and "Skyscraper Construction Explained" use different labels, icons, palettes, and scene headings, but they still converge on the same visual language: rectangular node cards, short block cards, straight connectors, and generic animated packets.

That happens because the current `VideoBrief` can only ask for:

- one of four `diagramLayout` strategies: `pipeline`, `client-server`, `hub-spoke`, or `stack`
- generic graph `nodes` and `edges`
- a small icon name from the renderer icon atlas
- freeform `kind`, which is not strong enough to create a different drawing vocabulary

The result is a graph diagram with topic labels, not a prompt-shaped diagram. A GPS scene should look like satellites, Earth, radio waves, timing, and intersecting ranges. A skyscraper scene should look like an excavation, foundation piers, core, crane, floor plates, and curtain wall progression.

## Goal

Make each scene choose and render a diagram family that follows the prompt's subject matter. Graph-flow remains a first-class family for software/system topics, but physical, scientific, civic, medical, historical, and built-world topics need structured primitive-first visuals instead of forced node-card graphs.

## Recommended direction

Keep diagram generation deterministic and structured. Do not make AI-generated bitmap images the core diagram mechanism.

Use generated images only as optional background or texture assets later. The main explanation diagram should stay editable, inspectable, testable, and animatable through Canvas events.

Build the broad primitive system before building topic-specific diagram modules. The prompt should author the diagram's semantic material through `visualPrimitives`; diagram families should only arrange, constrain, and animate that material.

Do not preserve compatibility with legacy graph-only briefs. New generation should use `diagramScript`, `diagramIntent`, and primitive-first fields for non-graph scenes; old briefs may be discarded or rejected instead of migrated.

Graph-flow is not legacy behavior. It remains the correct first-class diagram family for software architecture, request/response flows, queues, databases, service dependencies, event streams, and similar system diagrams.

Implementation should start with schema, prompt, and diagnostics before primitive rendering. First prove that the LLM can produce specific `diagramScript`, `visualPrimitives`, and `primitiveRelationships`; then build renderer primitives against real generated examples.

## Phase 1 - Add a diagram intent layer

Add a new scene-level field before graph layout:

```ts
diagramScript: {
  summary: string;
  beats: string[];
  visualStory: string;
  mustShow: string[];
  mustAvoid?: string[];
}

diagramIntent: {
  family: "graph-flow" | "spatial-cutaway" | "field-range" | "build-up" | "cycle" | "comparison" | "timeline";
  subject: string;
  perspective?: "top-down" | "side-elevation" | "cross-section" | "orbit" | "abstract";
  signatureVisuals: string[];
  motionCues: string[];
  avoid?: string[];
}
```

Resolved decision: the AI authors both `diagramScript` and the compiled primitive plan. `diagramScript` is the creative intent; `visualPrimitives` and `primitiveRelationships` are the inspectable compiled plan. Retry and diagnostics should compare them when a diagram becomes too generic.

Resolved decision: `diagramScript` is developer-only. It should appear in diagnostics, eval output, and debugging tools, but not in the normal viewer UI.

Resolved decision: do not maintain legacy-brief compatibility. Fresh LLM output should satisfy the new diagram contract. Validation does not need to wrap old graph-only non-graph briefs into primitive scenes.

Examples:

- GPS trilateration: `family: "field-range"`, `perspective: "top-down"`, `signatureVisuals: ["Earth", "three satellites", "range circles", "receiver pin"]`
- Skyscraper foundation: `family: "spatial-cutaway"`, `perspective: "cross-section"`, `signatureVisuals: ["soil layers", "bedrock", "piers", "mat slab"]`
- Steel superstructure: `family: "build-up"`, `perspective: "side-elevation"`, `signatureVisuals: ["columns", "floor beams", "floor plates", "crane lift"]`

The existing `graph` stays useful, but only as the primary representation for graph-flow scenes or as optional supporting structure for primitive-first scenes.

## Phase 2 - Add a broad primitive grammar

Add a controlled `visualPrimitives` field for scenes whose `diagramIntent.family` is not `graph-flow`.

Resolved decision: `graph` is optional at the scene level, not mandatory for every scene. For `graph-flow` scenes, `graph` is primary and remains first-class. For domain-shaped scenes, `visualPrimitives` is primary and `graph` should appear only when it adds explanatory value.

Resolved decision: build the broad primitive system first. Do not start by hardcoding only GPS and skyscraper renderers. The prompt must be able to express the diagram's subject-specific objects, spatial relationships, labels, and motion cues across many topics.

Resolved decision: keep `blocks`, but demote them for non-graph scenes. In primitive-first scenes, `visualPrimitives` and `primitiveRelationships` carry the explanation visually; blocks become short supporting captions or callouts and may be omitted or shortened when the diagram needs space.

Primitive `type` should be freeform, not a closed enum. The AI should be able to write subject-shaped types such as `satellite`, `range circle`, `receiver pin`, `soil layer`, `bedrock`, `concrete pier`, `mat slab`, `crane hook`, `curtain wall`, or whatever the user's prompt calls for.

Use optional renderer guidance fields to keep freeform types deterministic:

- `renderAs`: optional broad drawing hint, such as body, wave, zone, layer, structure, path, measurement, actor, annotation, surface, container, or device
- `shapeHint`: optional low-level shape hint, such as circle, ring, arc, line, beam, slab, wall, pin, stack, polygon, or icon
- `materialHint`: optional visual treatment, such as earth, steel, concrete, glass, soil, water, signal, heat, pressure, light, or data

The renderer should never require an exact `type` match to draw something. It should use `renderAs` and `shapeHint` when present, infer a fallback from the freeform `type` when possible, and otherwise render a labeled annotation shape instead of dropping the primitive.

Resolved decision: weak primitive hints should trigger one generation retry before accepting the brief. If the retry still leaves a primitive hard to infer, the renderer should draw a labeled fallback annotation rather than omit the primitive or fail the video.

Resolved decision: the retry belongs in the AI pipeline after brief validation and primitive diagnostics, before `buildProjectFromBrief`. The renderer and layout modules should not call the LLM or mutate the brief; they stay deterministic consumers of the accepted brief.

Each primitive should be semantic, not raw pixels. The expander still computes final coordinates and renderer events.

Each primitive should support:

- `id`, `type`, `label`, and optional `description`
- optional `renderAs`, `shapeHint`, and `materialHint`
- `role`, such as source, target, medium, boundary, layer, measurement, highlight, or actor
- `placementHint`, such as top, bottom, center, left, right, above, below, inside, outside, orbiting, crossing, or stacked
- `motion`, such as pulse, sweep, travel, grow, reveal, rotate, lift, descend, fill, or intersect
- `styleHint`, such as solid, dashed, translucent, glowing, outlined, filled, or textured
- `dependsOn`, for relationships like signal travels from satellite to receiver, slab sits on piers, or range circles intersect at receiver

Add first-class `primitiveRelationships` alongside `visualPrimitives`. Primitives are the nouns; relationships are the verbs and choreography.

```ts
primitiveRelationships: Array<{
  from: string[];
  to: string[];
  relation: string;
  visualMetaphor?: string;
  motion?: string;
  timingRole?: "setup" | "reveal-mechanism" | "highlight-result" | "loop" | "background";
}>
```

Examples:

- GPS: `{ from: ["satelliteA", "satelliteB", "satelliteC"], to: ["receiver"], relation: "ranges intersect at", visualMetaphor: "overlapping translucent circles", motion: "pulse outward then converge" }`
- Skyscraper: `{ from: ["matSlab"], to: ["piers", "bedrock"], relation: "load transfers downward", visualMetaphor: "descending force arrows", motion: "flow downward through piers" }`

Resolved decision: relationships are first-class. Do not hide mechanism inside only `dependsOn` or primitive-local `motion`; use relationships whenever the diagram needs to show how objects affect, support, intersect, feed, reveal, or transform each other.

## Phase 3 - Implement primitive planning and rendering

Create a primitive planning layer before family-specific layout:

- `primitiveSchema` defines the controlled grammar.
- `primitivePlanner` turns `diagramScript`, `diagramIntent`, `visualPrimitives`, and `primitiveRelationships` into positioned primitive plans.
- `primitiveRenderer` maps primitive plans to Canvas TimelineEvents.
- `primitiveDiagnostics` reports missing labels, weak renderer hints, dangling or unresolved relationships, collisions, primitives rendered through generic fallback, prompt-generic diagrams, and mismatches between the `diagramScript` and compiled primitives.
- `supportingBlockPlanner` places blocks as captions or callouts for primitive-first scenes, with permission to shorten or omit descriptions before shrinking the diagram.

The planner should use diagram families as arrangement presets:

- `graph-flow` uses the existing node and edge graph path.
- `field-range` arranges bodies, signals, range circles, zones, measurements, and intersections.
- `spatial-cutaway` arranges containers, layers, surfaces, structural elements, actors, and annotations.
- `build-up` arranges repeated structural elements, surfaces, lift paths, construction stages, and highlights.
- `cycle` arranges flow paths, zones, actors, surfaces, and repeated motion.
- `comparison` arranges two primitive groups with shared measurements or annotations.

Families should not be topic-specific renderers. A GPS scene and a radar scene can both use `field-range`; a skyscraper and a machine assembly can both use `build-up`.

Graph-flow remains preferred for software/system diagrams where nodes and edges are the natural explanation: architecture, request/response, queues, caches, APIs, databases, event streams, and dependency graphs.

## Phase 4 - Implement diagram-family layout modules

Create layout/render planning modules alongside the graph layout:

- `graphFlowLayout` for current node and edge diagrams
- `fieldRangeLayout` for GPS, radar, wireless coverage, magnetism, waves, influence zones
- `spatialCutawayLayout` for foundations, anatomy slices, geology, machines, infrastructure
- `buildUpLayout` for construction, assembly, manufacturing, growth, layer-by-layer processes
- `cycleLayout` for water cycle, feedback loops, lifecycle diagrams
- `comparisonLayout` for before/after and two-model contrast

Each module should consume primitive plans, not raw prompts. Each module should output a `SceneLayoutPlan`-compatible result or a sibling `DiagramLayoutPlan` that the expander can turn into TimelineEvents.

## Phase 5 - Rewrite prompt guidance around visual signatures

Update `buildSystemPrompt` so the model first identifies the subject-specific visual signature, then chooses the diagram family.

Add explicit anti-patterns:

- Do not use `server`, `router`, `gear`, or generic graph metaphors for non-computing topics unless the prompt is actually about computing.
- Do not represent physical processes as generic boxes connected by arrows when a spatial or physical depiction is possible.
- Every scene must include at least two `signatureVisuals` that come from the user's prompt or the topic domain.

Add few-shot examples:

- GPS signal -> orbit/field-range visuals, not client-server
- Skyscraper -> cutaway/build-up visuals, not generic stack cards
- Water cycle -> cycle layout with clouds, water, ground, arrows
- Database replication -> graph-flow remains appropriate

## Phase 6 - Add validation and scoring

Extend the eval harness beyond "scene count and layout type" to score visual specificity:

- `signatureVisualCoverage`: every scene includes at least two prompt-specific visuals
- `genericMetaphorPenalty`: non-software prompts lose points for server/router/api-style visuals
- `diagramFamilyDiversity`: adjacent scenes should not use the same family unless the topic demands it
- `primitiveCoverage`: non-graph families must emit domain primitives, not only labels
- `motionCueCoverage`: at least one animated primitive or path should explain the core mechanism

Use score-based evals with hard structural failures:

- Hard fail if required schema fields are missing.
- Hard fail if `primitiveRelationships` reference unknown primitive ids.
- Hard fail if a non-graph prompt is forced into graph-flow without a strong reason.
- Hard fail if a graph-flow prompt lacks a valid graph.
- Otherwise, compute a 0-100 visual specificity score.
- Track scores over time so prompt/schema changes show gradual quality movement, not only pass/fail churn.
- Low score should trigger the one generation retry, but should not block rendering/export after the retry. If the accepted brief still scores low, render with diagnostics and fallbacks.

Initial primitive specificity retry rule:

- For every non-graph scene, require at least 3 prompt-specific primitive types or labels.
- Require at least 2 first-class `primitiveRelationships`.
- Retry when primitive types or labels are mostly generic planning terms, such as process, system, component, step, input, output, layer, item, node, or element, unless the user's prompt is actually about those terms.
- Retry when `diagramScript.mustShow` names a subject-specific visual that has no matching primitive or relationship.

Add GPS and skyscraper as regression prompts. They should fail under the current system and pass only after domain primitives are used.

Initial eval matrix should be broader than the two observed failures:

- GPS signal/trilateration: primitive-first `field-range`
- Skyscraper construction: primitive-first `spatial-cutaway` and `build-up`
- Water cycle: primitive-first `cycle`
- Human heart blood flow: primitive-first `cycle` or `spatial-cutaway`
- Supply chain logistics: primitive-first `timeline`, `cycle`, or `comparison`
- Courtroom process: primitive-first `timeline` or `comparison`
- Database replication: graph-flow
- OAuth login: graph-flow

The matrix should verify both sides of the boundary: non-graph domains should produce prompt-specific primitives and relationships, while software/system prompts should still choose graph-flow when nodes and edges are the clearest explanation.

## Phase 7 - Roll out in thin slices

1. Schema, prompt, and diagnostics first:
   Add the new brief fields, update prompt guidance, and implement primitive diagnostics/eval scoring before rendering primitive shapes. This slice proves the authored JSON is prompt-specific enough to render.

2. New primitive brief contract:
   Add `diagramScript` and `diagramIntent`, validate them, and require them for fresh generated scenes. Do not add migration logic for legacy graph-only non-graph briefs.

3. Primitive grammar schema:
   Add `visualPrimitives` with freeform primitive `type`, plus first-class `primitiveRelationships`. Validate primitive ids, relationship references, roles, placement hints, motion hints, visual metaphors, and optional renderer hints.

4. Prompt-only guardrail:
   Improve `GRAPH_GUIDE` and eval scoring so new outputs stop choosing obviously generic diagrams for physical topics.

5. Generic primitive renderer:
   Add Canvas drawing support for the broad primitive set with tests and screenshots.

6. Supporting block demotion:
   For non-graph scenes, render blocks as small captions or callouts tied to primitives. Preserve block headings where useful, but allow descriptions to be shortened or omitted before diagram primitives are reduced.

7. Family arrangement presets:
   Add `field-range`, `spatial-cutaway`, and `build-up` as presets over the same primitive plans. They should prove GPS and skyscraper without becoming one-off topic renderers.

8. Primitive hint retry:
   If primitive diagnostics find weak renderer hints or visual specificity scoring fails, retry the LLM call once with the failed rubric instead of immediately accepting a generic diagram. This lives in the AI pipeline after schema validation and before `buildProjectFromBrief`.

9. Labeled fallback rendering:
   If the retry still leaves a primitive hard to infer, render it as a labeled annotation shape and record the fallback in diagnostics. Never drop prompt-authored primitives silently.

## Phase 1 implementation task list

Goal: prove the new prompt-shaped diagram contract before building primitive rendering.

1. Schema: add diagram intent fields
   - Update `next/src/lib/agent/schemas/brief.ts`.
   - Add `diagramScript` to each scene.
   - Add `diagramIntent` to each scene.
   - Keep `graph` required only for `graph-flow` scenes.
   - Require `visualPrimitives` and `primitiveRelationships` for non-graph scenes.
   - Do not add legacy graph-only migration paths.

2. Schema: define freeform primitives
   - Add `VisualPrimitiveSchema`.
   - Use freeform `type`.
   - Add optional `renderAs`, `shapeHint`, and `materialHint`.
   - Add `role`, `placementHint`, `motion`, `styleHint`, and `dependsOn`.
   - Validate primitive ids are unique inside a scene.

3. Schema: define first-class relationships
   - Add `PrimitiveRelationshipSchema`.
   - Validate `from[]` and `to[]` reference existing primitive ids.
   - Add `relation`, optional `visualMetaphor`, optional `motion`, and optional `timingRole`.
   - Keep relationship text freeform so the prompt can describe domain-specific mechanisms.

4. Validation: normalize only within the new contract
   - Update `next/src/lib/agent/brief/validateBrief.ts`.
   - Reject or repair malformed new fields where safe.
   - Do not wrap legacy graph-only non-graph briefs into primitive scenes.
   - Preserve graph-flow as first-class when the scene is genuinely software/system-shaped.

5. Prompt: rewrite the diagram section
   - Update `next/src/lib/agent/ai/prompts.ts`.
   - Teach the hierarchy: `diagramScript` -> `diagramIntent` -> `visualPrimitives` + `primitiveRelationships`.
   - Instruct non-graph scenes to be primitive-first.
   - Instruct graph-flow scenes to use `graph`.
   - Add anti-patterns for physical/scientific/built-world prompts represented as generic node cards.
   - Add few-shot examples for GPS, skyscraper, water cycle, database replication, and OAuth login.

6. Diagnostics: create primitive scoring
   - Add a primitive diagnostics module under `next/src/lib/agent/brief/`.
   - Hard fail missing required fields and dangling relationship references.
   - Score valid outputs from 0-100 for visual specificity.
   - Retry signal rules:
     - fewer than 3 prompt-specific primitives in a non-graph scene
     - fewer than 2 primitive relationships in a non-graph scene
     - mostly generic primitive labels
     - `diagramScript.mustShow` items missing from primitives or relationships

7. Pipeline: add one retry boundary
   - Update `next/src/lib/agent/ai/pipeline.ts`.
   - Run primitive diagnostics after validation and before `buildProjectFromBrief`.
   - If diagnostics request retry, call the LLM once with diagnostic feedback.
   - Validate the retried brief.
   - Do not block rendering/export on a low score after the retry.
   - Keep layout and renderer deterministic; no LLM calls there.

8. Eval harness: broaden the matrix
   - Update `next/src/scripts/evalPrompts.ts`.
   - Add prompts for:
     - GPS signal/trilateration
     - skyscraper construction
     - water cycle
     - human heart blood flow
     - supply chain logistics
     - courtroom process
     - database replication
     - OAuth login
   - Report hard failures separately from 0-100 visual specificity scores.
   - Verify non-graph domains choose primitive-first families.
   - Verify software/system prompts keep graph-flow.

9. Tests
   - Update `next/src/__tests__/brief/validateBrief.test.ts`.
   - Add tests for valid graph-flow scenes.
   - Add tests for valid primitive-first scenes.
   - Add tests for dangling primitive relationships.
   - Add tests for generic primitive labels triggering retry diagnostics.
   - Add tests that low score does not block accepted output after retry.

10. Verification
   - Run `npx tsc --noEmit` from `next/`.
   - Run `npx eslint` on changed TypeScript files.
   - Run the updated eval harness and record scores for the 8-prompt matrix.

## Resolved design decision

`visualPrimitives` replaces mandatory `graph` for non-graph scenes. A `graph-flow` scene still uses `graph` as its primary explanation skeleton. A domain-shaped scene uses `visualPrimitives` as primary authored material and may include a `graph` only when it adds explanatory value.

Graph-flow remains first-class for software/system prompts. The primitive system replaces forced graph usage for non-graph domains; it does not remove graph diagrams where graph diagrams are semantically right.

Build the Primitive Grammar before building specific domain families. The user's prompt should determine the diagram's subject-specific objects and relationships; families are arrangement presets over those primitives.

Primitive `type` is freeform. Renderer determinism comes from optional `renderAs`, `shapeHint`, `materialHint`, inference, and a labeled fallback rendering path rather than from a closed primitive type enum.

Weak primitive hints get one generation retry. If the retry still cannot produce enough renderer guidance, the renderer uses a labeled fallback annotation and records the fallback in diagnostics.

Primitive Relationships are first-class. The prompt should describe not only what appears in the diagram, but also how those objects interact through relation, visual metaphor, motion, and timing role.

The AI authors a hierarchy: `diagramScript` first, then `diagramIntent`, then `visualPrimitives` and `primitiveRelationships`. `diagramScript` keeps the creative visual story readable; the primitive plan makes that story renderable, testable, and retryable.

`diagramScript` is developer-only. Keep it available for diagnostics and evals, but do not surface it to end users in the normal video-generation UI.

The primitive retry boundary is: LLM output -> validate brief -> primitive diagnostics -> optional one retry with diagnostic feedback -> validate again -> `buildProjectFromBrief`. Layout and renderer code must stay deterministic and must not call the LLM.

Primitive diagnostics should trigger the retry for non-graph scenes that have fewer than 3 prompt-specific primitives, fewer than 2 first-class relationships, mostly generic primitive labels, or missing primitives for visuals named in `diagramScript.mustShow`.

For non-graph scenes, blocks are supporting captions. The layout fit policy should preserve the primitive diagram first, then block headings, then block descriptions. It may omit block descriptions before reducing or hiding prompt-specific primitives.

Legacy graph-only briefs are not a compatibility target. The implementation may reject or discard old briefs instead of preserving or migrating them.

Build schema, prompt, and diagnostics before primitive rendering. Rendering should be guided by real primitive plans produced by the LLM, not by guessed examples.

Use a small broad eval matrix rather than only GPS/skyscraper. The first matrix should cover GPS, skyscraper, water cycle, human heart blood flow, supply chain logistics, courtroom process, database replication, and OAuth login.

Eval should be score-based after hard structural validation. Required-field and reference errors fail immediately; valid outputs receive a 0-100 visual specificity score.

Visual specificity score gates the retry, not rendering/export. After the one retry, render the accepted brief even if the score remains low, using diagnostics and fallback rendering to preserve a visible video.
