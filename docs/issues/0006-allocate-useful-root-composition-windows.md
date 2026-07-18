# Allocate useful root composition windows

## What to build

Allocate root composition windows according to scene usefulness rather than treating planner shares as fixed percentages. Shares remain relative preferences, but an overview should receive roughly two useful seconds and every substantive scene should receive at least 3.3 seconds. When a proposed mix cannot satisfy those floors, retain the higher-value substantive coverage and remove the lower-value scene instead of producing a fragment.

The allocation must continue to preserve exact total duration, contiguous windows, stable ordering, and unscaled scene animation.

## Acceptance criteria

- [ ] Planner scene shares are treated as relative preferences rather than guaranteed percentages.
- [ ] A selected overview receives approximately two seconds when the available content time permits it.
- [ ] Every selected substantive scene receives at least 3.3 seconds.
- [ ] Remaining time is distributed proportionally after useful-duration floors are satisfied.
- [ ] When floors cannot fit, an overview is removed before a substantive scene whose goal is necessary to the plan.
- [ ] Any further removal uses a deterministic lower-value rule and preserves at least one substantive scene.
- [ ] Intro and conclusion durations remain unchanged.
- [ ] All windows are contiguous, ordered, non-empty, and cover the exact selected duration.
- [ ] Event times and absolute animation keyframes are shifted without rescaling.
- [ ] Tests cover highly skewed shares, optional overview removal, equal shares, rounding boundaries, and all supported durations.
- [ ] Dev generation code and characterization tests remain unchanged.
- [ ] Typecheck, changed-file lint, and relevant tests pass.

## Blocked by

- [Issue 0005](./0005-select-duration-appropriate-root-scenes.md)

