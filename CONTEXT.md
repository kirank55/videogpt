# Context — videogpt

## Glossary

| Term | Definition |
|------|------------|
| **VideoProject** | The top-level data structure that fully describes a renderable video: id, name, dimensions, duration, and a list of TimelineEvents. |
| **TimelineEvent** | A single visual element with a time range (`start`/`end`), layer, and type-specific properties. Discriminated union of `BackgroundEvent`, `TextEvent`, `ShapeEvent`, and `ParticleEvent`. |
| **Canonical Resolution** | 1920×1080 (Full HD). All new projects should target this resolution. Defined in `lib/renderer/constants.ts` as `DEFAULT_WIDTH` and `DEFAULT_HEIGHT`. |
| **Layer** | Integer z-order for events. Lower layers render first (behind). Background events are always on layer 0. |
| **AnimatedValue** | A `{ from, to, easing }` triple that interpolates a numeric property across an event's lifetime. Now a union: the classic two-point form, or a `{ keyframes }` array for multi-step animation. |
| **KeyframedValue** | An `AnimatedValue` variant with `keyframes: { time, value, easing }[]`. `time` is absolute seconds (matching event `start`/`end`). The renderer interpolates between adjacent keyframes. |
| **EasingName** | One of `linear`, `easeIn`, `easeOut`, `easeInOut`, `bounce`. Applied to AnimatedValues during interpolation. |
| **ParticleEvent** | A `TimelineEvent` that spawns N small shapes with deterministic pseudo-random positions and drift, using a seeded PRNG (mulberry32). Produces ambient sparkles, energy bursts, and background atmospherics. |
| **PathAnimation** | A `path` property on `BaseTimelineEvent` that moves an element along a Catmull-Rom spline. Specified as an array of `{ x, y }` points the curve passes through. Overrides `translateX`/`translateY` when set. |
| **Shadow** | Optional `shadow` property on `BaseTimelineEvent`: `{ color, blur, offsetX?, offsetY? }`. Produces glow and depth effects via Canvas `shadowBlur`/`shadowColor`. |
