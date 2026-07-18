# Enforce the generation-stack boundary

## What to build

Turn the root/dev isolation decision into a mechanically enforced architectural boundary. Verification must reject direct imports, type-only imports, and indirect convenience re-exports that couple the two generation namespaces, while allowing the explicitly approved rendering and platform surfaces.

The completed slice should make an accidental future cross-import fail during normal local verification.

## Acceptance criteria

- [x] Lint or a deterministic architecture test rejects imports from root generation into dev generation.
- [x] The same enforcement rejects imports from dev generation into root generation.
- [x] Re-exporting generation-owned modules through an intermediate shared module does not bypass the boundary.
- [x] The allowlist is limited to environment configuration, platform primitives, the final `VideoProject` contract, renderer/player, and generic UI.
- [x] The rule covers both runtime and type-only imports.
- [x] Enforcement runs through an existing routine verification command and does not require the model-quality benchmark.
- [x] A focused test proves a representative forbidden dependency is detected.
- [x] Typecheck, changed-file lint, and relevant tests pass.

## Blocked by

- [Issue 0002](./0002-separate-root-and-dev-generation-stacks.md)
