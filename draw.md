# SVG-First Main Drawing Animation

**Summary**
Replace only the main drawing animation for non-setup primitive-first scenes with an SVG-first renderer. Do not edit or change the title, Phase 1/setup context scene, scene transitions, timing, or conclusion. Graph-flow scenes remain unchanged.

**Key Changes**
- Add a new internal `svg-scene` timeline event type for storyboard drawings only.
- Update the storyboard compiler to emit one `svg-scene` event per non-setup primitive-first storyboard scene.
- Do not modify title rendering, Phase 1/setup rendering, conclusion rendering, or their timing/bookend logic.
- Build a generic SVG scene renderer with templates by `diagramIntent.family`:
  - `build-up`: layered construction, beams, slabs, panels, frame lines, rising/growing groups.
  - `spatial-cutaway`: masks, clipped sections, layer hatching, depth shadows, interior reveals.
  - `cycle`: circular SVG paths, moving markers, staged path tracing.
  - `field-range`: emitter pins, rings, signal paths, receiver pulses.
  - `comparison`: before/after panels, morph/arrow path, staged highlights.
- Use HTML/CSS/SVG for playback through a React SVG layer over the canvas.
- Rasterize the same SVG into canvas for previews and video/GIF export.

**Public API / Types**
- Extend `TimelineEvent` and `TimelineEventSchema` with `type: "svg-scene"`.
- The event stores validated scene data, not raw arbitrary HTML:
  - scene family, region, primitives, relationships, stages, palette/style tokens.
- Do not allow raw LLM-authored HTML/SVG, scripts, external URLs, or unsafe SVG attributes.
- Existing `shape`, `text`, `background`, and `particle` events remain supported.

**Test Plan**
- Add schema tests for valid/invalid `svg-scene` events.
- Add compiler tests proving:
  - non-setup primitive-first scenes emit `svg-scene`
  - Phase 1/setup scenes do not emit `svg-scene`
  - title and conclusion events are unchanged
- Add family tests for all supported non-graph families.
- Add renderer/export tests proving SVG playback and exported video/GIF include the same main animation.
- Run from `next/`: `npx tsc --noEmit`, targeted Vitest suites, and ESLint on changed files.

**Assumptions**
- “Main drawing animation” means non-setup primitive-first storyboard scenes only.
- Title, Phase 1/setup context, and conclusion are strictly out of scope and must not be edited.
- SVG is generated deterministically from validated primitives/storyboard data.
- No git staging, commits, pushes, or PRs are part of this work.
