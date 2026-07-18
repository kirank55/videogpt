# Allocate useful root composition windows

## What to build

Allocate root composition windows according to scene usefulness rather than treating planner shares as fixed percentages. Shares remain relative preferences, but an overview should receive roughly two useful seconds and every substantive scene should receive at least 3.3 seconds. When a proposed mix cannot satisfy those floors, retain the higher-value substantive coverage and remove the lower-value scene instead of producing a fragment.

The allocation must continue to preserve exact total duration, contiguous windows, stable ordering, and unscaled scene animation.

## Acceptance criteria

- [x] Planner scene shares are treated as relative preferences rather than guaranteed percentages.
- [x] A selected overview receives approximately two seconds when the available content time permits it.
- [x] Every selected substantive scene receives at least 3.3 seconds.
- [x] Remaining time is distributed proportionally after useful-duration floors are satisfied.
- [x] When floors cannot fit, an overview is removed before a substantive scene whose goal is necessary to the plan.
- [x] Any further removal uses a deterministic lower-value rule and preserves at least one substantive scene.
- [x] Intro and conclusion durations remain unchanged.
- [x] All windows are contiguous, ordered, non-empty, and cover the exact selected duration.
- [x] Event times and absolute animation keyframes are shifted without rescaling.
- [x] Tests cover highly skewed shares, optional overview removal, equal shares, rounding boundaries, and all supported durations.
- [x] Dev generation code and characterization tests remain unchanged.
- [x] Typecheck, changed-file lint, and relevant tests pass.

## Blocked by

- [Issue 0005](./0005-select-duration-appropriate-root-scenes.md)
