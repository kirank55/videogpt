# VideoGPT

The context for translating natural-language prompts into animated infographic videos rendered on a Canvas 2D engine. This glossary defines the structural and visual vocabulary shared by the AI brief, the Brief Expander, and the renderer.

## Language

**VideoBrief**:
The AI-authored, duration-agnostic description of *what* a video contains and *how* it feels. The expander computes *where* (coordinates) and *when* (timestamps) from it.
_Avoid_: spec, config, project (a VideoProject is the expanded output)

**VideoProject**:
The renderable output of the Brief Expander: a flat `TimelineEvent[]` with absolute start/end times on a fixed canvas.
_Avoid_: brief, scene

**Scene**:
A composable content segment within a video. A video is a sequence of 1..N Scenes, where N scales with duration. Each Scene carries its own content blocks, diagram, and creative fields. The video-level title and closing bracket the whole; scenes are the content between them. (Proposed — not yet implemented.)
_Avoid_: segment, chapter, section, act

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
The deterministic module that turns a `VideoBrief` into a `VideoProject` — computing all pixel coordinates and timestamps, including the graph layout, text placement, and per-scene timing. Makes no creative decisions.
_Avoid_: compiler, renderer

## Diagrams

**Node**:
A labeled box in a diagram graph. Has a label, an icon, and an optional `kind`. The expander positions nodes and sizes their boxes to fit the label. The AI never writes node coordinates.
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

**Font Metrics Table**:
A precomputed table of per-glyph widths for the Inter font, loaded at runtime, that lets the server-side expander measure text without a canvas. Powers the text layout pass (node-box sizing, wrapping, collision correction).
_Avoid_: measureText (that's the canvas API the expander can't use)

## Timing

**Scene Weight**:
An optional per-scene number that distributes total duration across scenes. The expander normalizes weights into per-scene time slices (default: equal split). Replaces the legacy per-duration `TIMINGS` act tables.
_Avoid_: actWeight, duration

**Transition**:
A per-scene handoff animation from the `TRANSITION_PRESETS` set (none/fade/slide-left/slide-right/zoom-in/zoom-out), implemented as per-event entry/exit opacity/translate animations at scene boundaries with a small overlap window.
_Avoid_: cut, effect
