# Freeform primitive types

Visual Primitive `type` is freeform rather than a closed enum. The user prompt should be able to name the subject-specific objects that belong in the diagram, while optional `renderAs`, `shapeHint`, and `materialHint` guide deterministic rendering. This was chosen over closed primitive types because a fixed enum would quickly become another generic bottleneck: it would keep GPS, skyscrapers, medicine, civic systems, and other domains squeezed into whatever categories happened to exist.
