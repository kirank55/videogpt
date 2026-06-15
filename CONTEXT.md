# Context — videogpt

A tool that generates animated explainer/architecture videos from natural-language prompts. The user describes what they want, an LLM produces a structured brief, and a deterministic pipeline expands it into a renderable canvas animation.

## Language

### Renderer primitives

| Term | Definition |
|------|------------|
| **VideoProject** | The top-level data structure that fully describes a renderable video: id, name, dimensions, duration, and a list of TimelineEvents. |
| **TimelineEvent** | A single visual element with a time range (`start`/`end`), layer, and type-specific properties. Discriminated union of `BackgroundEvent`, `TextEvent`, `ShapeEvent`, and `ParticleEvent`. |
| **Canonical Resolution** | 1920×1080 (Full HD). All new projects target this resolution. |
| **Layer** | Integer z-order for events. Lower layers render first (behind). Background events are always on layer 0. |
| **AnimatedValue** | A `{ from, to, easing }` triple that interpolates a numeric property across an event's lifetime. Union: classic two-point form, or a `{ keyframes }` array for multi-step animation. |
| **KeyframedValue** | An `AnimatedValue` variant with `keyframes: { time, value, easing }[]`. `time` is absolute seconds (matching event `start`/`end`). The renderer interpolates between adjacent keyframes. |
| **EasingName** | One of `linear`, `easeIn`, `easeOut`, `easeInOut`, `bounce`. Applied to AnimatedValues during interpolation. |
| **ParticleEvent** | A `TimelineEvent` that spawns N small shapes with deterministic pseudo-random positions and drift, using a seeded PRNG (mulberry32). Produces ambient sparkles, energy bursts, and background atmospherics. |
| **PathAnimation** | A `path` property on `BaseTimelineEvent` that moves an element along a Catmull-Rom spline. Specified as an array of `{ x, y }` points the curve passes through. Overrides `translateX`/`translateY` when set. |
| **Shadow** | Optional `shadow` property on `BaseTimelineEvent`: `{ color, blur, offsetX?, offsetY? }`. Produces glow and depth effects via Canvas `shadowBlur`/`shadowColor`. |

### AI generation layer

| Term | Definition |
|------|------------|
| **VideoBrief** | A small structured JSON the AI produces instead of a full VideoProject. Contains layout choice, labels, palette, style, flow toggle, and content — but no coordinates, no particles, no paths. _Avoid_: prompt response, AI output, generation result. |
| **Layout Template** | A pre-computed spatial grid with exact x/y positions for every slot. The AI picks a template name; the pipeline knows the coordinates. Currently two templates: Two-Column and Single-Column. _Avoid_: layout mode, arrangement. |
| **Act Timing Table** | A pre-computed breakdown of act start/end times for each supported duration (5, 10, 15, 20, 30 seconds). Eliminates arithmetic from the AI's job. |
| **Named Palette** | A curated set of harmonizing colors identified by a short name (e.g., `"midnight"`, `"neon"`, `"paper"`). The AI picks a name; the pipeline resolves it to exact hex/rgb values. _Avoid_: color scheme, theme colors. |
| **Named Style** | A curated animation/shape personality identified by a short name (e.g., `"modern"`, `"brutalist"`, `"sketch"`). Controls corner radius, easing character, stroke weight, glow intensity, and particle density. Independent of palette. _Avoid_: animation preset. |
| **Pipeline Injection** | Deterministic post-processing that adds events the AI doesn't generate: ambient particles, packet path animations, burst particles, processing glow, connectors, deco lines, celebration bursts. These are formulaic given the layout template and act timing. _Avoid_: post-processing, enrichment. |
| **Brief Expander** | The function (`buildProjectFromBrief`) that transforms a VideoBrief into a complete VideoProject by applying the Layout Template, Act Timing Table, Named Palette, Named Style, and Pipeline Injections. All spatial coordinates, animation values, and particle configs are computed here — not by the AI. _Avoid_: project builder, generator. |

## Relationships

- A **VideoBrief** is expanded by the **Brief Expander** into exactly one **VideoProject**
- A **Layout Template** determines the spatial positions of all **TimelineEvents** in the expanded project
- An **Act Timing Table** determines the `start`/`end` values of all **TimelineEvents**
- A **Named Palette** and a **Named Style** together determine the visual properties (colors, radii, easing, glow) of all events
- **Pipeline Injection** adds **ParticleEvents**, **PathAnimations**, and **Shadows** that the AI never sees or produces
- The modify flow operates on the **VideoBrief**, not the **VideoProject** — the Brief Expander re-runs after every modification

## Example dialogue

> **Dev:** "The AI is generating text events with wrong coordinates — labels are floating above their rects."
> **Domain expert:** "The AI shouldn't produce coordinates at all. It outputs a **VideoBrief** with label strings. The **Brief Expander** places them using the **Layout Template** grid."

> **Dev:** "Can the user ask for a color the AI hasn't seen before?"
> **Domain expert:** "No. The AI picks a **Named Palette** — a curated set. If the palette name is invalid, the **Brief Expander** falls back to `midnight`."

> **Dev:** "What happens when the user says 'make the text bigger'?"
> **Domain expert:** "The modify prompt sends the current **VideoBrief** + the instruction. The AI returns an updated brief. The **Brief Expander** re-runs from scratch — new **VideoProject**, correct coordinates, fresh **Pipeline Injections**."

## Flagged ambiguities

- "style" was used to mean both color palette and animation character — resolved: these are separate axes (**Named Palette** for colors, **Named Style** for animation/shape personality). Soft guidance in the system prompt prevents ugly combinations.
