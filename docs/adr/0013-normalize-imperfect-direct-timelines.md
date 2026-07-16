# Normalize imperfect direct timelines

Status: Accepted

Direct-timeline generation treats the runtime renderer schema as the hard safety seam and visual-quality rules as recoverable diagnostics. Valid model JSON is normalized event by event: supported authorship is preserved, common aliases and imprecise geometry are repaired, and malformed or missing essentials receive deterministic renderer-safe fallbacks. This replaces all-or-nothing semantic validation because a partially imperfect video is more useful than discarding three expensive model results; only unrecoverable provider or JSON failures abort generation.

## Supersedes

This supersedes ADR 0012's decision that any unresolved section validation finding aborts the complete generation.
