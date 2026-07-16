# Broad primitive grammar before domain families

Status: Superseded by ADR 0012

We decided to build a broad Primitive Grammar before implementing topic-specific diagram families. The AI should author the subject-specific objects, relationships, labels, placement hints, and motion cues from the user's prompt as Visual Primitives; Diagram Families then arrange and constrain those primitives. This was chosen over first building GPS and skyscraper-specific renderers because those would fix the two observed examples while leaving the generator biased toward whatever topics had bespoke modules.
