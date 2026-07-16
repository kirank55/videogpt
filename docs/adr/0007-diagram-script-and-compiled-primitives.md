# Diagram script and compiled primitives

Status: Superseded by ADR 0012

The AI authors both a `diagramScript` and a compiled primitive plan. `diagramScript` is the readable creative intent for a scene's visual story and choreography; `visualPrimitives` and `primitiveRelationships` are the inspectable plan that the expander can validate, arrange, and render. This was chosen over asking only for primitives because a compiled-only brief can look structurally valid while losing the prompt's visual idea, and over asking only for script because the renderer needs deterministic, testable objects.
