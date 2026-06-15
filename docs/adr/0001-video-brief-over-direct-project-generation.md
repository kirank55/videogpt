# AI outputs a VideoBrief, not a VideoProject

The AI produces a small structured brief (~200 tokens) containing layout choice, labels, palette name, style name, and content text. A deterministic Brief Expander (`buildProjectFromBrief`) transforms this into a full VideoProject with exact coordinates, particles, path animations, and pipeline-injected effects.

We chose this over having the AI generate VideoProject JSON directly because:

1. **Open models (Kimi, Minimax via OpenRouter) are unreliable at spatial arithmetic.** A VideoProject requires 50+ events with precise coordinates, vertically-centered labels, aligned connectors, and path waypoints. LLMs consistently get these wrong — labels float above rects, connectors point at empty space, packets arc off-screen.

2. **30% of a good video is formulaic given the layout.** Ambient particles, request/response packet paths, burst particles, processing glow rects, connectors, and deco lines are identical for every Two-Column video. The AI has no creative decision to make here — it's pure coordinate math.

3. **Modification is clean.** When the user says "change the server labels," the AI modifies the brief (swap 3 strings), and the Brief Expander re-runs. No risk of the AI breaking pipeline-injected events it doesn't understand.

4. **Validation is trivial.** Every brief field is either an enum (palette name, style name, layout template) or a short string (label text). Deterministic fallback fills in defaults for any malformed field. No repair loop needed.

## Considered Options

- **AI outputs full VideoProject JSON** (reference codebase approach) — rejected because open models produce structurally broken output at this complexity level, and the normalizer can't recover spatial relationships.
- **AI outputs partial VideoProject + pipeline patches** — rejected as a half-measure: the AI still has to get coordinates right for the events it does produce, and the pipeline has to figure out which events to patch vs. leave alone.

## Consequences

- The brief schema caps what the AI can express. If a user asks for something the schema can't represent (e.g., a third column, a radial layout), the system can't deliver it until the schema is extended.
- Every new layout template, palette, or style must be hand-curated in code. The AI cannot invent novel visual treatments — it can only select from the catalog.
- The Brief Expander becomes the single most important module. All spatial, timing, and visual correctness lives there.
