# Plan — Prompt-Driven Visual Diagram Support in Single-Column Layouts

## Goal

Provide single-column layouts with dynamic, prompt-driven visual diagrams (e.g., skyscraper construction, growing trees, networking nodes) without hardcoding any specific visuals. The AI model will design these custom visual diagrams inline as part of the `VideoBrief` response.

---

## User Review Required

> [!IMPORTANT]
> The single-column visual layout divides the canvas into two halves:
> - **Left Half**: Content blocks (text, descriptions, and icons) shifted to `x=120`, width constrained to `750`.
> - **Right Half**: A dedicated visual container of size `700x600` positioned at `diagramX=1060`, `diagramY=320` where the AI-defined shapes are rendered.
> This layout format only triggers when the AI chooses to output the optional `visualElements` array in its brief. If `visualElements` is omitted, the layout falls back to the classic centered single-column layout for backwards compatibility.

---

## Proposed Changes

### Component 1: Schema Updates

#### [MODIFY] [brief.ts](file:///c:/Users/kiran/code/p/videogpt/next/src/lib/schemas/brief.ts)
- Define `VisualElementSchema` with support for:
  - `type`: `"rect" | "circle" | "line" | "icon"`
  - `blockIndex`: optional index (0 to 4) of the content block that triggers this element's entry.
  - Geometry (relative to the `700x600` container):
    - For `rect`: `x`, `y`, `width`, `height`, `radius`
    - For `circle`: `x`, `y`, `radius`
    - For `line`: `x1`, `y1`, `x2`, `y2`
    - For `icon`: `x` (center), `y` (center), `size`
  - Style properties:
    - `color`: `"accent1" | "accent2" | "muted" | "text" | "surface"`
    - `fillType`: `"solid" | "outline" | "dashed"`
    - `iconName`: string enum matching `ICON_NAMES`
    - `label`: optional overlay label text
  - Animation properties:
    - `entry`: `"fade" | "slide-up" | "slide-down" | "scale-up" | "grow-y" | "grow-x"`
- Append `visualElements: z.array(VisualElementSchema).optional()` to the main `VideoBriefSchema`.

---

### Component 2: AI Pipeline & Prompts

#### [MODIFY] [prompts.ts](file:///c:/Users/kiran/code/p/videogpt/next/src/lib/ai/prompts.ts)
- Update `VIDEO_BRIEF_JSON_SCHEMA` to include `visualElements` and its full sub-schema description.
- Modify the system prompt in `buildSystemPrompt` to instruct the AI:
  - When the user asks for a physical process, timeline, build process, or step-by-step tutorial (such as building a skyscraper, growing a tree, or compiling code), layout = `"single-column"` must be used.
  - To make the video visually engaging, the AI should design a matching set of `visualElements` inside the `700x600` container.
  - Provide an example of how to define `visualElements` (e.g. stacking rectangles for a skyscraper).

---

### Component 3: Brief Expander & Renderer

#### [MODIFY] [buildProjectFromBrief.ts](file:///c:/Users/kiran/code/p/videogpt/next/src/lib/brief/buildProjectFromBrief.ts)
- Update `buildSingleColumn` to check if `visualElements` is defined and has elements.
- If visual elements are present:
  - Shift content blocks layout to the left (e.g. `textLeft = 120`, `maxWidth = 750`).
  - Compute absolute canvas coordinates for each visual element within the `700x600` bounding box centered on the right half (`diagramX=1060`, `diagramY=320`).
  - Match element colors (`accent1`, `accent2`, `muted`, etc.) to the resolved palette object (`p.accent1`, `p.accent2`, etc.).
  - Translate the element definitions into `TimelineEvent` objects of type `"shape"` (or `"text"` for element labels).
  - Stagger element timeline timing (`start`, `end`) based on their associated `blockIndex`'s stagger times, so they animate in sync with the content blocks.
  - Implement corresponding animations for `entry` values (fade, translation, scale, or clipping paths/growth).

---

## Verification Plan

### Automated Tests
- Run `npm test` to ensure existing 214 tests pass and no regression occurs.
- Add a new test suite in `src/__tests__/brief/buildProjectFromBrief.test.ts` to verify that `visualElements` inside a single-column brief correctly generate the expected shapes and text events with proper coordinates.

### Manual Verification
- Start Next.js dev server.
- Open `http://localhost:3000/generate`.
- Submit prompt: `"how are skyscrapper built"`.
- Verify that the generation completes successfully (no OpenRouter or schema errors).
- Load Advanced Mode and scrub through frames to verify that:
  - A stack of building blocks (rectangles) is displayed on the right side.
  - Text cards are neatly aligned on the left side.
  - The shapes animate in sync as each phase (Foundation, Steel Frame, Concrete, Facade) enters.
