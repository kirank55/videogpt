# No legacy brief compatibility for the primitive system

The primitive diagram system does not preserve compatibility with legacy graph-only briefs. Fresh generation must satisfy the new `diagramScript`, `diagramIntent`, `visualPrimitives`, and `primitiveRelationships` contract for non-graph scenes, and old briefs may be rejected or discarded instead of migrated. This was chosen because compatibility layers would keep the generator biased toward the generic graph/card model that the primitive system is replacing.
