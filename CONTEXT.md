# VideoGPT domain language

VideoGPT turns one natural-language prompt into a fixed-duration, Canvas-rendered animated explanation. Root generation plans a duration-aware sequence of content scenes, authors those scenes independently, and composes their validated timeline events into one project.

## Core terms

**VideoProject**: The complete renderer input: a 1920×1080 canvas, duration, metadata, and a flat `TimelineEvent[]` using absolute seconds.

**TimelineEvent**: A renderer-safe background, text, shape, or particle event with a unique ID, visible interval, layer, geometry, and optional animation. It is the only visual authorship vocabulary accepted from models.

**Direct timeline**: Model-authored `TimelineEvent[]` with coordinates and timing already chosen. Normalization preserves valid authorship while repairing unsupported event shapes, unsafe timing, and off-canvas geometry into renderer-safe events.

**Bookends**: One model-authored content object containing the title, optional subtitle, and closing line. Its visual events are rendered deterministically so the model does not spend tokens choosing bookend coordinates.

**Overview scene**: An optional compact introductory timeline that presents a useful high-level visual model. It is omitted when it would displace a more valuable substantive scene.
_Avoid_: Mandatory summary, introduction scene

**Substantive scene**: A content scene whose role is to explain a mechanism, demonstrate a concrete example, or make a meaningful comparison. In a constrained video it takes precedence over an overview scene.
_Avoid_: Detail scene, main scene

**Scene visual quality**: The visual richness and subject specificity of one generated scene, expressed through meaningful objects, composition, and animation. It does not mean playback resolution, encoding fidelity, or the video's overall narrative structure.
_Avoid_: Quality

**Scene quality evaluation**: A repeatable side-by-side benchmark that compares root substantive scenes with the isolated dev reference across varied subject types. It assesses subject specificity, meaningful geometry, motion, readability, and avoidance of generic compositions.
_Avoid_: Demo prompt, quality check

**Scene share**: The planner's relative preference for how content time should be divided among planned scenes. It yields to minimum useful scene durations and may not force a scene into a fragmentary window.
_Avoid_: Fixed duration, guaranteed percentage

**Composition window**: One contiguous local interval assigned before scene generation. Intro, the selected content scenes, and conclusion receive exact local durations; content event times and absolute keyframes are shifted into the final project without rescaling.

**Normalization profile**: Direct-timeline recovery configured for a scene role and composition window. Overview scenes stay compact; substantive scenes receive a visual-authorship budget floor. Both guarantee renderer-safe events and add missing background, label, or shape fallbacks.

**Recoverable diagnostic**: A visual-quality finding such as overlap, static output, unsupported decoration, or imprecise placement. It may reduce output quality but does not discard a renderer-safe video.

**Targeted repair**: One low-temperature retry for invalid bookend copy or an unusable substantive timeline. Recoverable timeline defects are normalized without a retry; an unusable substantive result falls back deterministically only after its repair fails.

**Palette context**: One deterministic set of background, text, and primary-accent anchors supplied to independently authored scenes for visual coherence. Scenes may add a small number of subject-specific semantic colors when color communicates meaning.
_Avoid_: Fixed palette, exclusive palette

**Persisted session**: Client state containing messages and already-rendered projects. Hydration drops obsolete authored payload fields while retaining valid projects.

## Generation invariants

- Root generation plans at least one content scene, then authors the selected scenes independently.
- Content-scene ceilings are one, two, three, and four for 5, 10, 15, and 20 second videos respectively; the planner may choose fewer.
- The selected 5, 10, 15, or 20 second duration is preserved exactly.
- Intro, content-scene, and conclusion windows are contiguous and cover the project with no blank gaps.
- Planner scene shares yield to minimum useful scene durations.
- Every final event ID is prefixed by its composition section or planned scene ID.
- An unrecoverable provider failure discards all generated sections. Recoverable direct-timeline output is normalized; an unusable substantive scene receives one targeted repair before deterministic fallback.
- Follow-up modification is not part of the generation model. Users start a new project instead.
