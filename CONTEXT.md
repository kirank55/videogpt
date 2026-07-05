# VideoGPT

The context for translating natural-language prompts into animated infographic videos rendered on a Canvas 2D engine. This glossary defines the structural and visual vocabulary shared by the AI brief, the Brief Expander, and the renderer.

## Language

**VideoBrief**:
The AI-authored, duration-agnostic description of *what* a video contains and *how* it feels. The expander computes *where* (coordinates) and *when* (timestamps) from it.
_Avoid_: spec, config, project (a VideoProject is the expanded output)

**Legacy Brief**:
A previously generated brief that lacks the current scene or primitive diagram contract. Legacy Briefs are not a compatibility target for new generation; they may be discarded or rejected rather than migrated.
_Avoid_: old project, fallback brief

**VideoProject**:
The renderable output of the Brief Expander: a flat `TimelineEvent[]` with absolute start/end times on a fixed canvas.
_Avoid_: brief, scene

**Scene**:
A composable content segment within a video. A video is a sequence of 1..N Scenes, where N scales with duration. Each Scene carries its own content blocks, diagram, and creative fields. The video-level title and closing bracket the whole; scenes are the content between them.
_Avoid_: segment, chapter, section, act

**Supporting Block**:
A short textual caption or callout within a Scene. In graph-flow scenes, blocks may remain a primary explanatory surface; in primitive-first scenes, Visual Primitives and Primitive Relationships carry the explanation, and blocks support them with concise context.
_Avoid_: main diagram, paragraph, card-only explanation

**Scene Content Budget**:
The practical amount of content a single Scene can fit without degrading readability. Generation should respect layout-specific node and block budgets: `pipeline` max 5 nodes/5 blocks, `client-server` max 6 nodes/4 blocks, `hub-spoke` max 5 nodes/4 blocks, and `stack` max 5 nodes/5 blocks. All layouts support at most 4 animated edges per scene. Validation may normalize excessive content; the Scene Layout Module fits or falls back inside the scene it receives. The Brief Expander does not invent or split Scenes.
_Avoid_: automatic scene split, hidden chaptering

**Over-budget Normalization**:
The validator's deterministic trim order when a Scene exceeds its Scene Content Budget. Preserve author order as importance: trim extra blocks after the layout max; keep graph nodes in author order while prioritizing nodes referenced by animated edges over unreferenced decorative nodes; drop dangling edges; trim non-animated edges before animated edges; if animated edges exceed the max, keep the first 4 in author order.
_Avoid_: random pruning, silent rearrangement

**Act**:
One of five fixed temporal phases (title → stacks → request → processing → outro) in the legacy single-scene skeleton. Being retired as the global forced structure; the flow scene's request→processing→response beats survive as one optional scene-internal rhythm. With two-column removed, flow is expressed via the diagram instead.
_Avoid_: phase, beat, scene

**Layout**:
The spatial arrangement of a scene's content. The two-column layout is being retired; single-column (content blocks + diagram) becomes the only layout. Request/response, comparison, and flow content are expressed through the diagram, not through a second column.
_Avoid_: variant, arrangement, template

**TimelineEvent**:
A single renderable atom (text, shape, particle, background) positioned by absolute `start`/`end` seconds and `layer`. The renderer draws whatever events are active at `time`.
_Avoid_: frame, object, sprite

**Brief Expander**:
The deterministic module that turns a `VideoBrief` into a `VideoProject` by translating each Scene's `SceneLayoutPlan` into renderable TimelineEvents and absolute timestamps. Makes no creative decisions and does not invent or split Scenes.
_Avoid_: compiler, renderer

**Scene Layout Module**:
The deterministic module that turns one Scene plus canvas settings into a `SceneLayoutPlan`. It owns regions, graph placement, block placement, text fitting, collision checks, fallbacks, and developer-only diagnostics before any TimelineEvents are emitted.
_Avoid_: renderer, analyzer, prompt logic

**SceneLayoutPlan**:
The intermediate layout artifact for one Scene. Contains named Layout Regions, laid-out Nodes, Edges, Blocks, text boxes, omitted labels, fit decisions, fallbacks, and developer-only diagnostics. It is not renderable and does not belong inside `VideoProject`; the Brief Expander consumes it to emit TimelineEvents.
_Avoid_: VideoProject, TimelineEvent, diagnostics-only report

## Diagrams

**Diagram Intent**:
A scene's subject-specific visual aim before layout is chosen. It names the diagram family, perspective, signature visuals, and motion cues that should make the diagram feel shaped by the prompt rather than by a generic graph template.
_Avoid_: prompt, layout strategy, style

**Diagram Script**:
A developer-only, scene-local description of the diagram's visual story and choreography before it is compiled into Visual Primitives and Primitive Relationships. It preserves creative intent in readable language so generation, validation, and retry diagnostics can compare what the scene meant to draw against what it actually planned.
_Avoid_: prompt, timeline, renderer events

**Diagram Family**:
A broad visual explanation form, such as graph-flow, field-range, spatial cutaway, build-up, cycle, comparison, or timeline. Graph-flow uses Nodes and Edges; non-graph families use Visual Primitives as their primary authored material.
_Avoid_: layout strategy, renderer primitive, template

**Graph-Flow Scene**:
A Scene whose subject is naturally represented as Nodes and Edges, such as software architecture, request/response, queues, APIs, databases, service dependencies, or event streams. Graph-flow is first-class for system diagrams; it is not a legacy fallback for non-graph domains.
_Avoid_: primitive-first scene, legacy graph

**Visual Primitive**:
A semantic, prompt-authored diagram object for non-graph families. Its `type` is freeform so the prompt can name subject-specific things like satellite, range circle, concrete pier, soil layer, or crane hook; the expander still decides coordinates and emits renderer Shapes.
_Avoid_: node, icon, bitmap, raw shape

**Primitive-First Scene**:
A non-graph Scene where Visual Primitives and Primitive Relationships are the primary explanation surface. Supporting Blocks may appear as captions or callouts, but the scene should remain understandable from the diagram itself.
_Avoid_: card-first scene, graph-flow scene

**Primitive Grammar**:
The broad authored vocabulary of freeform Visual Primitive types, relationships, anchors, motion cues, and labels that lets a prompt describe many kinds of diagrams without requiring a topic-specific renderer. Diagram Families arrange and constrain this grammar; they do not replace it.
_Avoid_: icon set, diagram family, renderer API

**Primitive Relationship**:
A first-class authored relationship between Visual Primitives that describes the mechanism, visual metaphor, and motion choreography between them. Primitive Relationships are the verbs of a diagram, such as signal travels, ranges intersect, load transfers, layer supports, or fluid flows.
_Avoid_: edge, dependency, connector

**Prompt-Specific Primitive**:
A Visual Primitive whose type or label comes from the user's topic domain rather than from generic planning language. Satellites, range circles, concrete piers, soil layers, and crane hooks are prompt-specific; process, system, component, step, input, and output are generic unless the prompt itself is about those terms.
_Avoid_: generic primitive, placeholder, topic label

**Node**:
A labeled box in a diagram graph. Has a label, an icon, an optional `kind` for visual/semantic flavor, and an optional `layoutRole` for placement. The expander positions nodes and sizes their boxes to fit the label. The AI never writes node coordinates.
_Avoid_: box, element, shape (a shape is the render primitive)

**Edge**:
A directed connection between two Nodes. Has a source, target, optional label (e.g. "GET /api"), and an `animated` flag. Animated edges carry a Packet traveling from source to target during the scene's flow phase. The expander synthesizes connector lines from edges.
_Avoid_: connector, link, arrow

**Packet**:
A small circle/badge shape with a `path` animation that travels along an Edge from source Node to target Node. Replaces the retired two-column request/response packet animation.
_Avoid_: token, message, request (a request is a user prompt)

**Layout Strategy**:
A named graph-layout function that owns the full canvas and places both Nodes and content blocks as one cohesive layout. v1 strategies: `pipeline` (horizontal sequence), `client-server` (two node groups with edges between), `hub-spoke` (central node with radial peripherals), `stack` (vertical layers). The AI picks the strategy; the expander applies it.
_Avoid_: template, arrangement, variant

**Layout Strategy Variant**:
A deterministic variant within a Layout Strategy, such as roomy/compact, blocks-bottom/blocks-side, or labels-on/labels-off. The Scene Layout Module tries a ranked set of variants before falling back to another strategy. Variants preserve the strategy's expected shape; they are preferred over generic pixel nudging.
_Avoid_: arbitrary nudge, random relayout

**Layout Role**:
An optional AI-authored `layoutRole` field on a Node that tells a Layout Strategy where the Node belongs, such as client/server/shared in `client-server`, hub/spoke in `hub-spoke`, or sequence position in `pipeline`. `kind` remains visual/semantic flavor; `layoutRole` is only for placement. The validator drops invalid roles, and the expander may infer roles from graph shape only when explicit roles are absent.
_Avoid_: array order, position, coordinate

**Layout Region**:
A named canvas area reserved by a Layout Strategy for a specific content type, such as `headingBand`, `diagramRegion`, `blockRegion`, or `safeMargins`. Nodes and Edges stay in the diagram region; content blocks stay in the block region unless a strategy deliberately defines otherwise.
_Avoid_: zone, arbitrary box

**Layout Fit Policy**:
A deterministic priority order for resolving crowded scenes. Preserve scene meaning first: keep the Scene heading, Node positions, Node labels, and block headings; then shrink or wrap descriptions, drop edge and Packet labels, hide decorations, and only then switch to a safer Layout Strategy.
_Avoid_: overlap fix, nudge pass

**Text Fit Rule**:
The per-text-type rule for preserving readable text inside a Layout Region. Node labels may grow their Node box, shrink to a floor, then wrap; block headings wrap before shrinking; block descriptions wrap then clamp; edge and Packet labels are dropped first when crowded.
_Avoid_: text overflow, generic wrapping

**Layout Collision Check**:
A pre-expansion check inside the layout engine that detects collisions between intended node boxes, block boxes, text labels, edge labels, and packet paths before TimelineEvents are emitted. The analyzer remains a regression tool, not the primary collision resolver.
_Avoid_: analyzer warning, visual bug

**Collision Occupancy Model**:
The v1 collision model for a Scene. Treat the Scene as having a shared hold moment where all meaningful content may be visible together, and check static occupancy for headings, nodes, blocks, labels, and edges. Animated Packets are checked as swept-path envelopes. Transition-only overlap between adjacent Scenes is ignored unless it hits safe margins or the main heading.
_Avoid_: frame-by-frame solver, transition noise

**Layout Variant Scoring**:
The deterministic scoring pass that chooses among Layout Strategy Variants. It penalizes collisions, safe-margin violations, text-fit degradation, omitted labels, and semantic role violations, then selects the best passing plan. If no variant passes, the Layout Fallback policy applies and diagnostics record the attempted variants and winning reason.
_Avoid_: best effort nudge, visual guessing

**Layout Fallback**:
A deterministic switch from a crowded or semantically invalid Layout Strategy to a safer one after the Layout Fit Policy has been applied. v1 fallback order: `pipeline` -> `stack` preserving node order; `hub-spoke` -> `stack` with hub first, then spokes; `client-server` strongly prefers staying `client-server` and only falls back to `stack` when roles are missing/invalid or collisions remain after labels are dropped; `stack` has no strategy fallback. A fallback should preserve scene meaning and be recorded in diagnostics so unexpected placement is explainable.
_Avoid_: silent relayout, random fallback

**Layout Diagnostics**:
Developer-only metadata that explains Layout Collision Checks, Text Fit Rule decisions, and Layout Fallbacks. It travels alongside a VideoProject for dev tools and analyzers; it is not part of the renderable VideoProject and is not shown in the normal viewer UI.
_Avoid_: user-facing warning, render error

**Font Metrics Table**:
A planned precomputed table of per-glyph widths for the Inter font, loaded at runtime, that would let the server-side expander measure text without a canvas. Not yet part of the implemented layout pass.
_Avoid_: measureText (that's the canvas API the expander can't use)

## Timing

**Scene Weight**:
An optional per-scene number that distributes total duration across scenes. The expander normalizes weights into per-scene time slices (default: equal split). Replaces the legacy per-duration `TIMINGS` act tables.
_Avoid_: actWeight, duration

**Transition**:
A per-scene handoff animation from the `TRANSITION_PRESETS` set (none/fade/slide-left/slide-right/zoom-in/zoom-out), implemented as per-event entry/exit opacity/translate animations at scene boundaries with a small overlap window.
_Avoid_: cut, effect
