# Focus root scene authorship

## What to build

Give each root scene model a focused local authorship brief instead of the full plan. The brief should contain the video title, current role and goal, exact local duration, palette anchors, and concise boundaries describing what comes immediately before and after. The planner retains responsibility for complete narrative coverage and non-repetition.

Copy proven detailed-composition guidance into root ownership, then adapt it independently for mechanism, example, and comparison roles. Palette context remains a shared visual anchor within the root video, but scenes may introduce a small number of subject-specific semantic colors.

## Acceptance criteria

- [ ] A root scene prompt contains the video title, current scene role, current goal, and exact local duration.
- [ ] It includes concise preceding/following boundaries without embedding every other scene's full goal.
- [ ] Mechanism, example, and comparison roles each receive specific composition guidance.
- [ ] Root guidance discourages generic card rows and pipelines unless that structure is intrinsic to the subject.
- [ ] Root guidance requires meaningful subject-shaped geometry, visible motion or staggered reveals, and readable label placement.
- [ ] Palette context is described as background, text, and primary-accent anchors rather than an exclusive color list.
- [ ] Subject-specific semantic colors are explicitly permitted when they communicate meaning.
- [ ] Root owns every prompt fragment used by root generation; no dev generation prompt is imported.
- [ ] Prompt-focused tests cover all substantive roles, optional overview, neighboring boundaries, and semantic-color guidance.
- [ ] A focused benchmark run shows no regression in narrative separation or automated safety diagnostics.
- [ ] Dev generation code and characterization tests remain unchanged.
- [ ] Typecheck, changed-file lint, and relevant tests pass.

## Blocked by

- [Issue 0004](./0004-build-quality-evaluation-workflow.md)
- [Issue 0005](./0005-select-duration-appropriate-root-scenes.md)
- [Issue 0006](./0006-allocate-useful-root-composition-windows.md)

