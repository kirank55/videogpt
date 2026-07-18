# Separate root and dev generation stacks

## What to build

Establish independently owned root and dev generation stacks while preserving their current behavior. Dev must own its model transport behavior, prompts, budgets, model-output schemas, validation and normalization, project construction, pipeline, and API handling. Root must own separate equivalents for its planner, scene generation, composition, and recovery behavior.

Duplication is intentional. The stacks may converge on the final renderer-facing `VideoProject` contract, but neither generation path may depend on the other.

## Acceptance criteria

- [ ] Dev generation owns its model caller, option types, streaming/JSON handling, and provider-error classification.
- [ ] Dev generation owns its prompts, budgets, model-output schemas, normalization, project construction, pipeline, and API request handling.
- [ ] Root generation owns separate transport behavior and separate generation modules for the same concerns.
- [ ] Neither stack imports generation code or generation-owned types from the other.
- [ ] Shared dependencies are limited to environment configuration, platform primitives, the final `VideoProject` contract, renderer/player, and generic UI.
- [ ] Dev characterization tests from issue 0001 remain unchanged and pass.
- [ ] Existing root route and composition tests pass without intentional behavior changes.
- [ ] Both root and dev pages remain usable end to end.
- [ ] Typecheck, changed-file lint, and relevant tests pass.

## Blocked by

- [Issue 0001](./0001-characterize-and-freeze-dev-generation.md)

