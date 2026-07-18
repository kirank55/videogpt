# Build the repeatable quality-evaluation workflow

## What to build

Create an explicit, non-CI workflow for repeatable side-by-side scene quality evaluation. It must run the isolated root and dev generators against the same fixed cases, retain enough provenance to reproduce a run, apply deterministic safety and diagnostic checks, and produce rendered comparisons for human scoring.

Use eight prompt-duration cases: two each at 5, 10, 15, and 20 seconds. Balance software topology, physical mechanism, process, and comparison subjects across the set. Run each case three times per generation path, producing 48 outputs in a complete evaluation.

## Acceptance criteria

- [x] One documented command runs the complete evaluation outside CI.
- [x] The fixed set contains eight cases, two for every supported duration, with the four agreed subject categories represented across the set.
- [x] Each case runs three times through root and three times through dev.
- [x] Every run records the prompt, duration, path, model identity, model options, timestamp, raw model output or failure, normalized project, diagnostics, and usage metadata when available.
- [x] Automated checks flag renderer/schema failures, deterministic fallback usage, excessive overlap, missing motion, unreadable text, and generic-layout diagnostics.
- [x] The workflow renders directly comparable root/dev visual artifacts.
- [x] A human rubric captures 1–5 scores for subject specificity, meaningful geometry, animation, and readability.
- [x] Results identify the median run and worst failure for each prompt and path.
- [x] Evaluation artifacts are stored outside application runtime data and are not committed accidentally when they contain large generated media.
- [x] Deterministic tests cover case loading, scoring calculations, failure classification, and artifact metadata without making model calls.
- [x] Typecheck, changed-file lint, and relevant tests pass.

## Blocked by

- [Issue 0002](./0002-separate-root-and-dev-generation-stacks.md)
- [Issue 0003](./0003-enforce-generation-stack-boundary.md)
