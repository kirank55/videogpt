# VideoGPT domain language

VideoGPT turns one natural-language prompt into a fixed-duration, Canvas-rendered animated explanation. New generation uses three independent model requests and composes their validated timeline events into one project.

## Core terms

**VideoProject**: The complete renderer input: a 1920×1080 canvas, duration, metadata, and a flat `TimelineEvent[]` using absolute seconds.

**TimelineEvent**: A renderer-safe background, text, shape, or particle event with a unique ID, visible interval, layer, geometry, and optional animation. It is the only visual authorship vocabulary accepted from models.

**Direct timeline**: Model-authored `TimelineEvent[]` with coordinates and timing already chosen. Normalization preserves valid authorship while repairing unsupported event shapes, unsafe timing, and off-canvas geometry into renderer-safe events.

**Bookends**: One model-authored content object containing the title, optional subtitle, and closing line. Its visual events are rendered deterministically so the model does not spend tokens choosing bookend coordinates.

**Direct summary**: A compact introductory timeline. It presents the high-level structure with few labels and shapes; it does not explain the underlying mechanism.

**Main diagram**: A deeper direct timeline that explains one mechanism, causal relationship, interaction, cutaway, state transition, or spatial model. It should not repeat the summary composition.

**Composition window**: One contiguous local interval assigned before generation. The windows are intro, summary, main, and conclusion. Summary and main models receive their exact local durations; their event times and absolute keyframes are shifted into the final project without rescaling.

**Normalization profile**: Shared direct-timeline recovery configured for a role. Summary retains at most 40 events and at least two shapes; main retains at most 80 events and at least three shapes. Both guarantee renderer-safe events and add missing background, label, or shape fallbacks.

**Recoverable diagnostic**: A visual-quality finding such as overlap, static output, unsupported decoration, or imprecise placement. It may reduce output quality but does not discard a renderer-safe video.

**Targeted repair**: The single low-temperature retry allowed when a model response cannot be parsed as JSON. Valid JSON with imperfect timeline authorship is normalized without another model call.

**Palette context**: One deterministic palette selected from the prompt and supplied to all three requests, keeping independently authored sections visually coherent.

**Persisted session**: Client state containing messages and already-rendered projects. Hydration drops obsolete authored payload fields while retaining valid projects.

## Generation invariants

- Root generation performs exactly three concurrent model requests.
- The selected 5, 10, 15, or 20 second duration is preserved exactly.
- The four windows are contiguous and cover the project with no blank gaps.
- Every final event ID is prefixed `intro-`, `summary-`, `main-`, or `conclusion-`.
- An unrecoverable provider or JSON failure discards all generated sections; recoverable timeline findings render with normalization and fallbacks.
- Follow-up modification is not part of the generation model. Users start a new project instead.
