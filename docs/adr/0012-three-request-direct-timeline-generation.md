# Three-request direct-timeline generation

Status: Accepted

## Decision

Root generation uses three concurrent model requests: bookends, a compact direct summary timeline, and a deeper direct main timeline. A single deterministic palette and precomputed local durations are provided to every request. Bookends are converted to timeline events deterministically; summary and main author renderer-safe events directly.

Each response is validated for its role and receives at most one targeted repair containing its rejected JSON and findings. Any unresolved section failure aborts the whole generation. Valid events are prefixed and shifted into four contiguous windows without animation rescaling.

## Consequences

The model controls the actual visual composition of summary and main sections, while validation and rendering remain safe deterministic boundaries. Summary and main can serve distinct explanatory roles without both being expanded through the same pipeline layout. Generation costs exactly three initial model calls, with repairs only for rejected sections.

The semantic brief, scene/layout expansion, graph/storyboard compiler, modification flow, and compatibility envelopes are deleted. Existing persisted `VideoProject`s remain viewable, but obsolete authored payloads are discarded during hydration.

## Supersedes

ADRs 0001 through 0011 describe the removed brief and layout architecture and are superseded by this decision.
