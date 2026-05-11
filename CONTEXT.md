# Context — videogpt

## Glossary

| Term | Definition |
|------|------------|
| **VideoProject** | The top-level data structure that fully describes a renderable video: id, name, dimensions, duration, and a list of TimelineEvents. |
| **TimelineEvent** | A single visual element with a time range (`start`/`end`), layer, and type-specific properties. Discriminated union of `BackgroundEvent`, `TextEvent`, and `ShapeEvent`. |
| **Canonical Resolution** | 1920×1080 (Full HD). All new projects should target this resolution. Defined in `lib/renderer/constants.ts` as `DEFAULT_WIDTH` and `DEFAULT_HEIGHT`. |
| **Layer** | Integer z-order for events. Lower layers render first (behind). Background events are always on layer 0. |
| **AnimatedValue** | A `{ from, to, easing }` triple that interpolates a numeric property across an event's lifetime. |
| **EasingName** | One of `linear`, `easeIn`, `easeOut`, `easeInOut`, `bounce`. Applied to AnimatedValues during interpolation. |
