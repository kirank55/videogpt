# Retry unusable substantive scenes

## What to build

Implement ADR 0014 in the isolated root generation stack. A substantive scene receives one low-temperature targeted retry when its model output is malformed, truncated, or effectively empty. Recoverable authored events continue through deterministic normalization without a retry. If the targeted retry is still unusable, produce the existing renderer-safe deterministic fallback and expose enough diagnostics for evaluation to identify the degraded scene.

The repair request should include the original scene brief, concise validation findings, and usable partial output when available.

## Acceptance criteria

- [ ] Root distinguishes recoverable timeline diagnostics from unusable substantive output.
- [ ] Malformed JSON, length-truncated output, and effectively empty substantive timelines each trigger one targeted retry.
- [ ] Recoverable aliases, geometry repairs, timing repairs, and ordinary visual diagnostics do not trigger another model request.
- [ ] The retry uses a low temperature and the same root-owned schema and substantive-scene capacity.
- [ ] Partial model output is supplied to repair when safely available.
- [ ] A successful retry is normalized and composed in the original scene window.
- [ ] A failed or still-unusable retry produces one renderer-safe deterministic fallback and a machine-readable degraded-scene diagnostic.
- [ ] Retry behavior does not alter intro, conclusion, overview, or unrelated successful scenes.
- [ ] Unrecoverable provider failures retain the documented all-sections failure behavior.
- [ ] Tests assert model-call counts and outcomes for valid, recoverable, malformed, truncated, empty, repaired, and fallback cases.
- [ ] Dev generation retry and fallback behavior remains unchanged.
- [ ] Typecheck, changed-file lint, and relevant tests pass.

## Blocked by

- [Issue 0004](./0004-build-quality-evaluation-workflow.md)
- [Issue 0008](./0008-raise-root-substantive-scene-capacity.md)

