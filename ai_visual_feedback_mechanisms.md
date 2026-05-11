# Why the AI Can't See Problems in VideoProject JSON

## Root Cause Analysis

There are **three compounding blindness problems**:

### 1. Coordinate blindness
The AI writes pixel coordinates (e.g. `x: 1200, y: 266`) against a 1920×1080 canvas without any feedback confirming where those pixels actually land. All spatial reasoning is pure mental arithmetic with no verification step. A single off-by-100px error cascades — a label misaligned from its rect, a packet that travels outside the stack bounds, etc.

### 2. Screenshot resolution problem
The `/demo` page renders `PlayerCard` thumbnails. The actual canvas is 1920×1080 but the player card is ~350px wide in the browser. That's a **~5.5× downscale**. A 20px element becomes 3.6px — invisible. A misaligned 60px label becomes an indistinguishable smear. I cannot meaningfully read spatial relationships from these thumbnails.

### 3. No derived-value feedback
The JSON contains *raw values*, not *derived spatial relationships*. I can't see from the JSON that:
- A text label at `x: 1200` is 100px to the left of the rect it should be inside (which starts at `x: 1300`)
- Two events on the same layer have overlapping lifetimes and will fight for space
- A `translateX: {from: -340, to: 340}` causes the element to start 340px left of its anchor, potentially off-canvas

---

## The 4 Mechanisms

### Mechanism 1: JSON Layout Analyzer (lowest cost, highest ROI)
**What it does:** A Node.js script that reads a `VideoProject` JSON and computes *derived spatial facts*, then prints a diagnostic report.

**Output for each event:**
```
[browser-rect] rect @ x:100–620, y:210–350, layer:2, t:1.6–9.5
  ✓ within canvas bounds
  translateY animation: enters from y:250, settles at y:210

[browser-label] text @ x:140, y:266, fontSize:28, maxWidth:440, layer:4, t:1.7–9.5
  ✓ within parent rect [browser-rect] horizontal bounds (100–620)
  ✓ label y:266 within rect y-range (210–350) — vertically centered: YES (offset: +7px)
  
[step-validate] text @ x:1120, y:266, layer:4, t:4.5–5.8
  ✗ x:1120 is OUTSIDE server stack bounds (1300–1820) — 180px to the left
  ✗ overlaps center gap zone

[req-packet] circle @ x:960, y:340, r:20, layer:3, t:3.5–5.0
  translateX: starts at x:620, ends at x:1300
  ✓ travel path stays within canvas
  ✓ start point aligns with client stack right edge (620)
  ✓ end point aligns with server stack left edge (1300)
```

**What it catches:**
- Labels outside their parent rects
- Elements that animate off-canvas
- Packet travel paths that don't align with stack edges
- Text that overflows its `maxWidth` at the given font size
- Layer conflicts (two opaque events at same layer/time)
- Events with no visible duration (end - start < 0.1s)

**Build plan:**
```
next/src/scripts/analyzeProject.ts
  - reads bigDemoProject (or any VideoProject)
  - computes bounding box for each event (including animated extremes)
  - checks: canvas containment, label-rect alignment, path endpoints
  - outputs structured diagnostic report to stdout
```

Run with: `npx ts-node src/scripts/analyzeProject.ts`

---

### Mechanism 2: Full-Resolution Frame Exporter (medium cost, highest visual fidelity)
**What it does:** A Puppeteer/Playwright script that navigates to a special `/debug/frame?t=3.5` route, renders the canvas at 1920×1080, and saves it as a full-res PNG.

**Why this matters:** At full resolution, I can actually read text, see alignment, and measure spatial relationships. At thumbnail scale I cannot.

**Build plan:**

1. Add a `/debug/frame` page that renders a single `PlayerCard` at 100% scale (`width: 1920, height: 1080`) — no shrinking:
```tsx
// app/debug/frame/page.tsx
// ?t=3.5&project=bigDemoProject
// Renders the canvas at native 1920×1080
```

2. Add a Playwright script:
```ts
// scripts/exportFrame.ts
// Usage: npx ts-node scripts/exportFrame.ts --time 3.5 --out frame_3.5s.png
// Navigates to /debug/frame?t=3.5
// Takes a screenshot of the canvas element at full resolution
// Saves to /debug-frames/
```

3. Run a batch export for key diagnostic times:
```ts
const keyFrames = [0, 1, 2, 3, 3.5, 4, 5, 5.5, 6, 7, 8, 9, 9.9];
// Exports 13 full-res PNGs I can view and analyze precisely
```

**What I can then do:** View each full-res PNG with the `view_file` tool and report exact pixel-level problems: "The label 'Validate' is 47px to the left of the server rect boundary."

---

### Mechanism 3: Debug Overlay Mode in the Renderer (medium cost, permanent diagnostic tool)
**What it does:** Add an optional `debug: boolean` prop to `PlayerCard`/`renderProjectFrame`. When true, the renderer draws additional visual information on top of the frame:

```
┌─ browser-rect [L2] t:1.6–9.5 ──────────────┐
│  Browser                                     │
└──────────────────────────────────────────────┘
  ↑ bounding box outline in cyan
  ↑ ID label in top-left corner (tiny text)
  ↑ layer badge in top-right
```

**Additional overlays:**
- **Grid lines** at every 100px (faint gray) — gives coordinate reference
- **Canvas center crosshair** — instantly shows if titles are centered
- **Event bounding boxes** — colored by type: text=yellow, shape=cyan, background=none
- **Animated element trajectory** — dotted line showing the FROM→TO path of translateX/Y

**Build plan:**
```
lib/renderer/debug.ts
  - drawDebugOverlay(ctx, project, time)
  - draws grid, crosshair, bounding boxes, ID labels

PlayerCard.tsx
  - add debug?: boolean prop
  - pass to renderProjectFrame

/debug/frame page
  - always renders with debug=true
```

**What I can then do:** Take a screenshot of a debug frame and immediately see which events are misaligned, which labels are outside their rects, and where animated elements travel.

---

### Mechanism 4: JSON Spatial Diff (lowest cost, catches regressions)
**What it does:** Before and after editing `bigDemoProject.ts`, run a script that computes a human-readable diff of spatial facts — not the raw JSON diff, but the *derived layout* diff:

```
CHANGED: browser-label
  x: 250 → 140  (now correctly inside browser-rect [100–620])
  
CHANGED: step-validate  
  x: 1200 → 1120  (still outside server-rect [1300–1820] — PROBLEM PERSISTS)
  
NEW: client-connector-2
  line from (360, 350) to (360, 370) — connects http-rect bottom to network-rect top ✓
```

This catches the case where I *think* I fixed something but the new value still has the same class of problem.

---

## Recommended Build Order

| Priority | Mechanism | Build time | Diagnosis quality |
|----------|-----------|------------|------------------|
| **1** | JSON Layout Analyzer | ~2h | Catches 80% of coordinate bugs before any rendering |
| **2** | Full-Res Frame Exporter | ~3h | Lets the AI see exactly what is rendered |
| **3** | Debug Overlay Mode | ~4h | Permanent tool, useful beyond just demos |
| **4** | JSON Spatial Diff | ~1h | Good for regression checking after edits |

> [!IMPORTANT]
> **Mechanism 1 + 2 together** would give the tightest feedback loop: run the analyzer first (catches logical errors), then export full-res frames (catches visual/aesthetic problems). This combination would have caught the majority of issues in the current `bigDemoProject` before any human review was needed.

---

## What to build first?

The question is whether you want the tool to be:
- **Self-contained to scripts** (Mechanisms 1 and 4 — no browser/Playwright needed)
- **Browser-based** (Mechanisms 2 and 3 — richer but requires Playwright or a dedicated debug page)

Suggest starting with **Mechanism 1** (the analyzer script) since it has zero dependencies and can be run instantly to generate a report I can read and act on.
