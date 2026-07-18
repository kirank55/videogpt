# Raise root substantive-scene capacity

## What to build

Give every root substantive scene enough authorship capacity to approach the isolated dev main-diagram reference. Establish 6,144 output tokens and 20 authored events as the minimum substantive-scene budget, including for 3.3–4 second composition windows. Keep higher-duration scaling where it already exceeds that floor.

The prompt, model call, parser, normalizer, diagnostics, and fallback logic must agree on the same event capacity. Extra capacity should produce richer geometry and animation rather than denser prose, so existing readability and collision constraints remain in force.

## Acceptance criteria

- [ ] Every root mechanism, example, and comparison scene receives at least 6,144 output tokens.
- [ ] Every root substantive scene may author and retain up to at least 20 events.
- [ ] Longer substantive scenes retain any existing higher token or event allowance.
- [ ] Root overview scenes remain intentionally compact and do not inherit the substantive budget floor.
- [ ] The root prompt's event limit matches the model option and normalization limit.
- [ ] The normalizer does not silently trim a valid 20-event substantive scene to the former lower ceiling.
- [ ] Text-count, minimum-font, contrast, safe-margin, collision, and motion diagnostics remain active.
- [ ] Tests cover a 3.3-second substantive scene, a boundary-duration scene, a longer scene, a 20-event authored response, and an oversized response.
- [ ] A focused benchmark run shows increased meaningful geometry or animation without an automated readability regression.
- [ ] Dev budgets, normalization, generation behavior, and characterization tests remain unchanged.
- [ ] Typecheck, changed-file lint, and relevant tests pass.

## Blocked by

- [Issue 0004](./0004-build-quality-evaluation-workflow.md)
- [Issue 0007](./0007-focus-root-scene-authorship.md)

