# Retry unusable substantive scenes

Status: Accepted

Direct-timeline generation continues to normalize recoverable defects without another model request, but an unusable substantive scene receives one targeted retry before deterministic fallback. Malformed, truncated, or effectively empty output qualifies; ordinary visual-quality diagnostics do not. This accepts occasional additional latency and model cost because a generic fallback inside an otherwise authored multi-scene video causes a disproportionate loss of scene visual quality.

## Supersedes

This supersedes ADR 0013 only where it prohibited another model request for unusable direct-timeline output.
