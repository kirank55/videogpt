# Isolate the dev generation stack

Status: Accepted

The dev generation stack is a deliberately independent visual-quality reference implementation. Root and dev generation must independently own their model transport behavior, prompts, budgets, model-output schemas, validation and normalization logic, pipelines, and API handlers; copying proven behavior into root is acceptable. They may share only environment configuration, platform primitives, the final `VideoProject` contract, renderer and player, and generic UI. Lint or test enforcement must reject cross-imports between the two generation namespaces. This accepts intentional code duplication and possible behavioral drift so root experiments cannot silently change the dev reference output.
