# Primitive retry in the AI pipeline

The one retry for weak or generic primitive plans lives in the AI pipeline after schema validation and primitive diagnostics, before `buildProjectFromBrief`. Layout and renderer modules remain deterministic consumers of the accepted brief and never call the LLM or mutate the authored diagram plan. This was chosen because retrying inside layout would blur the boundary between creative generation and deterministic rendering, making failures harder to reproduce and test.
