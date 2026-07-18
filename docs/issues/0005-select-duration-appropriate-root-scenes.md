# Select duration-appropriate root scenes

## What to build

Make root planning select a number and mix of content scenes that the chosen duration can support. A constrained video must prioritize the strongest topic-specific substantive role—mechanism, example, or comparison—instead of spending its only content window on an overview.

The planner may choose fewer scenes than the ceiling when the topic benefits from depth. Overview remains optional at every duration, and two substantive scenes are valid when they better fit the topic.

## Acceptance criteria

- [ ] Five-second root videos plan exactly one content scene and that scene is substantive.
- [ ] Content-scene ceilings are two at 10 seconds, three at 15 seconds, and four at 20 seconds.
- [ ] The planner may choose fewer than the ceiling but always selects at least one content scene.
- [ ] Overview is never mandatory and is omitted when it would displace a more valuable substantive scene.
- [ ] Ten-second planning permits two complementary substantive scenes.
- [ ] Planner schema, prompt guidance, plan normalization, and duration-specific fallback plans agree on the same rules.
- [ ] Duplicate or reserved scene identifiers remain composition-safe.
- [ ] Root API output preserves the selected total duration and contains no blank interval.
- [ ] Tests cover every supported duration, an overview-free plan, a plan below the ceiling, and an over-limit model response.
- [ ] Dev generation code and characterization tests remain unchanged.
- [ ] Typecheck, changed-file lint, and relevant tests pass.

## Blocked by

- [Issue 0004](./0004-build-quality-evaluation-workflow.md)

