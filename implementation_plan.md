# Edit Mode — Interactive Element Dragging

Add an **Edit Mode** button next to the existing Advanced Mode button in the player card header. When active, canvas playback pauses and a draggable overlay is shown so users can reposition elements visually without re-prompting.

---

## Overview

The core idea: when Edit Mode is on, pause playback and render a **transparent overlay** on top of the canvas with absolutely-positioned draggable handles corresponding to each visible `TimelineEvent`. Dragging a handle mutates the event's `x`/`y` (or `cx`/`cy` for icons/circles/badges) coordinates and live-rerenders the canvas frame.

No new dependencies needed — pure pointer-event drag logic.

---

## Proposed Changes

### Component Layer

---

#### [MODIFY] [PlayerCard.tsx](file:///c:/Users/kiran/code/p/videogpt/next/src/components/player/PlayerCard.tsx)

- Add an **Edit Mode** toggle button next to "Advanced Mode" in the header `div`.
- Pass `isEditMode` and `onToggleEditMode` as props down to `PlayerCardFrame`.
- When edit mode turns on, call `scrubTo(currentTime)` to freeze playback.

---

#### [NEW] [EditModeOverlay.tsx](file:///c:/Users/kiran/code/p/videogpt/next/src/components/canvas/EditModeOverlay.tsx)

A new React component that renders on top of the `<PlayerCanvas>`. It:

1. **Computes visible events** at `currentTime` using `visibleEvents(project, time)` (already exported from the renderer).
2. For each visible event that has a position (`x`/`y`, `cx`/`cy`), renders a **draggable handle** — a translucent pill/chip showing the event ID/type.
3. On `pointerdown` → `pointermove` → `pointerup`, calculates the delta in canvas-pixel space and calls an `onEventMove(id, dx, dy)` callback.
4. Renders a **"Editing"** banner at the top of the overlay so it's clear the mode is active.

Key technical details:
- The overlay is `position: absolute; inset: 0` over the canvas wrapper, with `pointer-events: none` on the canvas itself when edit mode is on.
- Scale factor: canvas logical size (e.g. 1280×720) vs rendered CSS size — computed via `canvas.getBoundingClientRect()` to correctly map pointer pixels → canvas pixels.
- Events with `type === "background"` or `type === "particle"` are not draggable (no single position).
- Selected handle gets a highlight ring.

---

#### [MODIFY] [PlayerCanvas.tsx](file:///c:/Users/kiran/code/p/videogpt/next/src/components/canvas/PlayerCanvas.tsx)

- Accept an optional `isEditMode?: boolean` prop.
- When `isEditMode` is true, wrap the canvas in a `relative` container and render `<EditModeOverlay>` as a sibling.
- Pass a `canvasRef` up so `EditModeOverlay` can read `getBoundingClientRect()` for scale mapping.

---

#### [MODIFY] [PlayerProvider.tsx](file:///c:/Users/kiran/code/p/videogpt/next/src/components/player/PlayerProvider.tsx)

- Add `isEditMode: boolean`, `toggleEditMode: () => void`, and `updateEventPosition: (id: string, dx: number, dy: number) => void` to the context.
- `isEditMode` state lives here; toggling it pauses playback.
- `updateEventPosition` mutates a local copy of the project's events and exposes a `project` that includes those edits. This keeps the edits local to the session (not persisted to the store — edits are ephemeral visual adjustments within the player).

> [!NOTE]
> Edits are **in-memory only** for now — they reset if the project is regenerated. A future improvement would be a "Save Layout" action that pushes the modified positions back into the Zustand store/brief.

---

### Dragging Logic (inside EditModeOverlay)

```
pointerdown on handle → capture pointerId → record startX, startY (in canvas px)
pointermove → compute dx/dy in canvas px using scale factor → call onEventMove
pointerup → release capture → finalize
```

Scale factor computed once on drag start:
```ts
const rect = canvasEl.getBoundingClientRect();
const scaleX = project.width / rect.width;
const scaleY = project.height / rect.height;
```

---

### Event Position Mapping

| `shapeType` / `type` | Fields moved |
|---|---|
| `text` | `x`, `y` |
| `shape/rect` | `x`, `y` |
| `shape/circle` | `x`, `y` |
| `shape/triangle` | `x`, `y` |
| `shape/line` | `x1`, `y1`, `x2`, `y2` (translate both endpoints) |
| `shape/icon` | `cx`, `cy` |
| `shape/badge` | `cx`, `cy` |
| `shape/progress` | `x`, `y` |
| `particle` | `origin.x`, `origin.y` |
| `background` | not draggable |

---

### UI Design

- **Edit Mode button**: same style as Advanced Mode button — `rounded-lg border border-border px-2.5 py-1 text-xs font-semibold`. When active, use `bg-amber-500/10 border-amber-500/40 text-amber-400` to visually distinguish.
- **Draggable handles**: small chips `(type: id)` in `bg-primary/20 border border-primary/60 text-primary text-[10px]` centered over the element's logical position. On hover, scale up and show a grab cursor.
- **Editing banner**: a subtle `absolute top-2 left-1/2 -translate-x-1/2` pill saying `✏️ Edit Mode — drag elements to reposition` in `bg-amber-500/15 text-amber-300 text-[11px]`.
- Playback controls remain visible but play button is disabled in edit mode.

---

## Files Changed

| File | Change |
|---|---|
| `src/components/player/PlayerCard.tsx` | Add Edit Mode button, pass props |
| `src/components/player/PlayerProvider.tsx` | Add edit mode state + `updateEventPosition` |
| `src/components/canvas/PlayerCanvas.tsx` | Accept `isEditMode`, expose `canvasRef`, render overlay |
| `src/components/canvas/EditModeOverlay.tsx` | **[NEW]** Draggable handles overlay |
| `src/components/canvas/index.ts` | Export `EditModeOverlay` |

---

## Verification Plan

### Manual Verification
1. Generate a video → confirm Edit Mode button appears next to Advanced Mode
2. Click Edit Mode → playback pauses, amber styling activates, editing banner shows
3. Drag a text element → canvas rerenders live with new position
4. Drag an icon/badge → `cx`/`cy` update correctly
5. Exit Edit Mode → playback resumes from same position
6. Regenerating a project resets any dragged positions (expected behavior)
