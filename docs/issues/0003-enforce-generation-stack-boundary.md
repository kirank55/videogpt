# Enforce the generation-stack boundary

## What to build

Turn the root/dev isolation decision into a mechanically enforced architectural boundary. Verification must reject direct imports, type-only imports, and indirect convenience re-exports that couple the two generation namespaces, while allowing the explicitly approved rendering and platform surfaces.

The completed slice should make an accidental future cross-import fail during normal local verification.

## Acceptance criteria

- [ ] Lint or a deterministic architecture test rejects imports from root generation into dev generation.
- [ ] The same enforcement rejects imports from dev generation into root generation.
- [ ] Re-exporting generation-owned modules through an intermediate shared module does not bypass the boundary.
- [ ] The allowlist is limited to environment configuration, platform primitives, the final `VideoProject` contract, renderer/player, and generic UI.
- [ ] The rule covers both runtime and type-only imports.
- [ ] Enforcement runs through an existing routine verification command and does not require the model-quality benchmark.
- [ ] A focused test proves a representative forbidden dependency is detected.
- [ ] Typecheck, changed-file lint, and relevant tests pass.

## Blocked by

- [Issue 0002](./0002-separate-root-and-dev-generation-stacks.md)

