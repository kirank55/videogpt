# Scene-based video composition

Status: Superseded by ADR 0012

## Layout planning addendum

Scene-based composition uses a dedicated `SceneLayoutPlan` boundary. The scene layout module turns one Scene plus canvas settings into named regions, positioned nodes/edges/blocks/text boxes, omitted labels, fit decisions, fallbacks, and developer-only diagnostics. The Brief Expander consumes that plan to emit renderable `TimelineEvent`s and absolute timestamps; it does not invent or split Scenes.

Nodes may include an optional AI-authored `layoutRole` placement hint, separate from `kind` which remains visual/semantic flavor. Invalid roles are dropped by validation, and the expander infers roles only when explicit roles are absent.

Scene count remains a generation responsibility. The expander fits or falls back inside the Scene it receives. v1 scene content budgets are: `pipeline` max 5 nodes/5 blocks, `client-server` max 6 nodes/4 blocks, `hub-spoke` max 5 nodes/4 blocks, `stack` max 5 nodes/5 blocks, and max 4 animated edges for every layout. When a Scene exceeds budget, validation preserves author order as importance: trim extra blocks after the layout max; keep graph nodes in author order while prioritizing nodes referenced by animated edges over unreferenced decorative nodes; drop dangling edges; trim non-animated edges before animated edges; if animated edges exceed the max, keep the first 4 in author order.

Collision checks use the Scene's shared hold moment where all meaningful content may be visible together. Static occupancy includes headings, nodes, blocks, labels, and edges. Animated Packets are checked as swept-path envelopes. Transition-only overlap between adjacent Scenes is ignored unless it hits safe margins or the main heading.

Collision resolution tries ranked Layout Strategy Variants before strategy fallback. Variants preserve the chosen strategy's expected shape and may switch between options such as roomy/compact, blocks-bottom/blocks-side, and labels-on/labels-off. The layout module scores variants for collisions, safe-margin violations, text-fit degradation, omitted labels, and semantic role violations. Generic pixel nudging is allowed only inside text boxes.

v1 strategy fallback order is deterministic: `pipeline` falls back to `stack` preserving node order; `hub-spoke` falls back to `stack` with the hub first, then spokes; `client-server` strongly prefers staying `client-server` and only falls back to `stack` when roles are missing/invalid or collisions remain after labels are dropped; `stack` has no strategy fallback.

A video is now a sequence of 1..N Scenes rather than one fixed 5-act skeleton. The AI authors N scene "mini-briefs" (with a duration-suggested count, ~1 scene per 5s); the expander splits total duration across scenes via optional `sceneWeights`. The video keeps one global title and one global closing; scenes are the content between them. Each scene carries its own layout, content blocks, diagram, and creative fields (palette/style stay video-level for coherence; layout/entry/variant/blockStyle vary per-scene to avoid repetition). This was chosen over scaling content cardinality (cramped, still one scene), a chapters layer above the 5 acts (rigid, forces request/processing acts), and multi-brief generation (loses coherent flow, multiplies cost). Old persisted projects are discarded — no migration path.
