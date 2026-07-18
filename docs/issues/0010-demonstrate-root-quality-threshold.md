# Demonstrate the root quality threshold

## What to build

Run the complete scene quality evaluation after the root improvements land, review the rendered comparisons, and retain the resulting evidence. Tune only the isolated root generation stack where the evidence identifies a miss; do not change the dev reference, the agreed scene-count policy, or the acceptance rubric during the run.

This slice is complete when root meets the agreed automated and human-scored threshold across the fixed evaluation set.

## Acceptance criteria

- [x] The complete eight-case, three-runs-per-path evaluation finishes with all required artifacts and metadata.
- [x] Any renderer failure, unusable fallback, or unreadable output fails its run regardless of human score.
- [x] Root's median overall human score is at least the dev median.
- [x] No root scoring category averages below 3/5.
- [x] Root trails dev by no more than 0.5 points on any individual prompt.
- [x] Median and worst-run results are reported for every prompt and path.
- [x] Automated diagnostics and human scores are preserved together with rendered comparisons.
- [x] Any tuning required to pass changes only root-owned generation code and receives focused regression coverage.
- [x] Dev characterization tests and generation-stack boundary enforcement remain green.
- [x] The final report records model identity, options, run timestamp, and the exact evaluation-case revision.
- [x] Typecheck, changed-file lint, deterministic tests, and the full quality evaluation pass.

## Retained evidence

The passing evaluation is retained at
`evaluation-artifacts/scene-quality-2026-07-18T15-11-00-647Z/`.

- Model: `deepseek/deepseek-v4-flash`
- Run timestamp: `2026-07-18T15:11:00.649Z`
- Evaluation-case revision:
  `sha256:ddc64d6a580194817f3ba28775c1089904c699b06a180f1d5c5b8fdae347412f`
- Complete artifacts: 48/48, with 144/144 rendered frames
- Disqualified runs: 0
- Root overall median: 4.0; dev overall median: 3.75
- Root category averages: specificity 4.083, geometry 3.958, animation
  3.833, readability 3.833
- Maximum per-prompt root deficit: 0.25 (`database-replication` and
  `heat-pump-cycle`)

## Blocked by

- [Issue 0005](./0005-select-duration-appropriate-root-scenes.md)
- [Issue 0006](./0006-allocate-useful-root-composition-windows.md)
- [Issue 0007](./0007-focus-root-scene-authorship.md)
- [Issue 0008](./0008-raise-root-substantive-scene-capacity.md)
- [Issue 0009](./0009-retry-unusable-substantive-scenes.md)
