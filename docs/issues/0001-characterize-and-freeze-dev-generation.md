# Characterize and freeze dev generation behavior

## What to build

Capture the current dev generation stack as the visual-quality reference before separating or changing generation code. Add characterization coverage that exercises every dev part through its public request boundary, representative authored model responses, recovery behavior, and final renderable project contract. The tests should describe externally meaningful behavior without coupling to incidental internal function structure.

The completed slice must demonstrate that title, summary, main-diagram, and conclusion generation still behave as they did at the start of this work.

## Acceptance criteria

- [x] Characterization tests cover successful title, summary, main-diagram, and conclusion requests through the dev API boundary.
- [x] Direct summary and main-diagram cases verify representative authored events survive validation and appear in the final `VideoProject`.
- [x] Copy-only repair, malformed direct-timeline fallback, duration preservation, and model-option behavior are covered.
- [x] The tests verify renderer-facing invariants such as canvas dimensions, duration, event timing, and required event types without snapshotting unstable implementation details.
- [x] Existing dev generation pages continue to submit, render, and store generated projects without behavior changes.
- [x] No root generation behavior is intentionally changed in this slice.
- [x] Typecheck, changed-file lint, and relevant tests pass.

## Blocked by

None - can start immediately.
