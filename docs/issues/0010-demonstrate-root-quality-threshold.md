# Demonstrate the root quality threshold

## What to build

Run the complete scene quality evaluation after the root improvements land, review the rendered comparisons, and retain the resulting evidence. Tune only the isolated root generation stack where the evidence identifies a miss; do not change the dev reference, the agreed scene-count policy, or the acceptance rubric during the run.

This slice is complete when root meets the agreed automated and human-scored threshold across the fixed evaluation set.

## Acceptance criteria

- [ ] The complete eight-case, three-runs-per-path evaluation finishes with all required artifacts and metadata.
- [ ] Any renderer failure, unusable fallback, or unreadable output fails its run regardless of human score.
- [ ] Root's median overall human score is at least the dev median.
- [ ] No root scoring category averages below 3/5.
- [ ] Root trails dev by no more than 0.5 points on any individual prompt.
- [ ] Median and worst-run results are reported for every prompt and path.
- [ ] Automated diagnostics and human scores are preserved together with rendered comparisons.
- [ ] Any tuning required to pass changes only root-owned generation code and receives focused regression coverage.
- [ ] Dev characterization tests and generation-stack boundary enforcement remain green.
- [ ] The final report records model identity, options, run timestamp, and the exact evaluation-case revision.
- [ ] Typecheck, changed-file lint, deterministic tests, and the full quality evaluation pass.

## Blocked by

- [Issue 0005](./0005-select-duration-appropriate-root-scenes.md)
- [Issue 0006](./0006-allocate-useful-root-composition-windows.md)
- [Issue 0007](./0007-focus-root-scene-authorship.md)
- [Issue 0008](./0008-raise-root-substantive-scene-capacity.md)
- [Issue 0009](./0009-retry-unusable-substantive-scenes.md)

