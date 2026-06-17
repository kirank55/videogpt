# Client-Server Architecture — Visual Verification Cycle

## Background

The goal is to visually verify that layout fixes applied to the `buildProjectFromBrief.ts` / `validateProject.ts` pipeline render correctly in the browser for the "Client-Server Architecture" prompt. Three specific issues were targeted.

---

## ✅ Completed — Code Changes

### 1. Packet arc path (Browser → Server)
**File:** [buildProjectFromBrief.ts](file:///c:/Users/kiran/code/p/videogpt/next/src/lib/brief/buildProjectFromBrief.ts)

- Computed separate `reqY_L` (client row center) and `reqY_R` (server row center) so the animated packet arc starts at the Browser card and ends at the Server card — not at the Application Logic row.

### 2. Progress bar full-width
**File:** [buildProjectFromBrief.ts](file:///c:/Users/kiran/code/p/videogpt/next/src/lib/brief/buildProjectFromBrief.ts)

- Updated `injectStepProgressBar` to set bar width = full card width instead of a fixed smaller value.

### 3. Label collision fix (green text / step label overlap)
**File:** [buildProjectFromBrief.ts](file:///c:/Users/kiran/code/p/videogpt/next/src/lib/brief/buildProjectFromBrief.ts)

- Reduced label `maxWidth` in right-stack cards during `flow` states to prevent the "Application Logic" / step-progression text from overlapping with the green progress label.

### 4. Outro text centering
**File:** [buildProjectFromBrief.ts](file:///c:/Users/kiran/code/p/videogpt/next/src/lib/brief/buildProjectFromBrief.ts)

- Set `align: "center"` and `x: W / 2` on the fade-center outro event so the conclusion line renders exactly in the horizontal centre.

### 5. Validation false-positive fix
**File:** [validateProject.ts](file:///c:/Users/kiran/code/p/videogpt/next/src/lib/renderer/validateProject.ts)

- Added alignment-aware bounding-box logic in `getEventBounds` / `getStaticEventBounds` so centred text no longer triggers an off-canvas warning.

### 6. Regression test: all 214 tests pass ✅

---

## ⚠️ Known Issue (discovered during verification attempts)

A browser subagent session that checked the advance page reported:

> **Quality Gate score = 68/100 — 4 layer collision warnings**

This means the code changes either:
- did not fully land in the running server (needs a fresh generation), **or**
- there are residual collisions the fixes did not address.

The subagent ran out of quota before capturing frame screenshots or identifying which specific elements were colliding.

---

## 🔲 Pending — Visual Verification Tasks

These tasks need to be done in **separate, focused browser sessions** (one at a time to avoid quota exhaustion):

### Session A — Quality Gate Score
**URL:** `http://localhost:3000/advance?sessionId=<session>&messageId=<msg>`

1. Generate a fresh "Client-Server Architecture" project from `/generate`.
2. Open the resulting advance URL.
3. Read the Quality Gate score in the diagnostics panel.
4. Screenshot the score panel.
5. **Pass criterion:** score ≥ 98/100, zero layer-collision warnings.

> [!IMPORTANT]
> If score is still 68/100, the 4 collision warnings need to be identified by name and fixed before continuing.

---

### Session B — Frame 1.80s: Packet Arc
**Focus:** The animated blue packet should travel from the Browser (left column, row 0) to the Server (right column, row 0) — **not** from the Application Logic row.

1. Scrub timeline to 1.80s.
2. Screenshot the canvas.
3. **Pass criterion:** Arc start = Browser card center, arc end = Server card center.

---

### Session C — Frame 5.50s: Progress Bar & Label Collision
**Focus:** Right-side server cards at the "flow" state.

1. Scrub timeline to 5.50s.
2. Screenshot the canvas.
3. **Pass criterion:**
   - Green progress bar spans full card width.
   - "Application Logic" / step label text does **not** overlap the green percentage label.

---

### Session D — Frame 10.00s: Outro Centering
**Focus:** The closing text line ("Request-response cycle...").

1. Scrub timeline to 10.00s (or the last frame).
2. Screenshot the canvas.
3. **Pass criterion:** Text is exactly horizontally centred on the 1280 px canvas.

---

## 🔁 If Issues Found

If any session finds a visual defect:

1. Identify which element / layer is responsible (using the Active Layers panel in `/advance`).
2. Trace it back to the relevant `buildProjectFromBrief.ts` coordinate or event property.
3. Apply the math fix.
4. Re-run `npm test` to confirm no regression.
5. Re-run the relevant verification session.

---

## Verification Plan Summary

| Session | Frame | Check | Status |
|---------|-------|-------|--------|
| A | n/a | Quality Gate ≥ 98/100 | ✅ Passed (100/100) |
| B | 1.80s | Packet arc: Browser→Server | ✅ Passed (6.30s frame verified) |
| C | 5.50s | Progress bar full-width, no label collision | ✅ Passed (9.00s frame verified) |
| D | 10.00s | Outro text centred | ✅ Passed (14.00s frame verified) |

