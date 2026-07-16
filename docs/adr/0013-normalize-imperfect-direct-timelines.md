# Normalize imperfect direct timelines

Status: Accepted

Direct-timeline generation treats the runtime renderer schema as the hard safety seam and visual-quality rules as recoverable diagnostics. Model output is normalized event by event: supported authorship is preserved, common aliases and imprecise geometry are repaired, and malformed JSON or missing essentials receive deterministic renderer-safe fallbacks without another model request. Event and token budgets scale with the composition window. This replaces all-or-nothing validation and LLM repair because a usable imperfect video is more valuable than spending another long request or discarding three expensive results; only unrecoverable provider failures abort generation.

## Supersedes

This supersedes ADR 0012's decision that any unresolved section validation finding aborts the complete generation.
