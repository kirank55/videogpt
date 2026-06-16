import type {
  TimelineEvent,
  VideoProject,
  EasingName,
  AnimatedValue,
} from "@/lib/renderer";
import type { VideoBrief, SupportedDuration } from "@/lib/schemas/brief";
import { PALETTES, DEFAULT_PALETTE } from "@/lib/catalog/palettes";
import type { PaletteSpec } from "@/lib/catalog/palettes";
import { STYLES, DEFAULT_STYLE } from "@/lib/catalog/styles";
import type { StyleSpec } from "@/lib/catalog/styles";
import { TIMINGS } from "@/lib/catalog/timings";
import type { ActTiming } from "@/lib/catalog/timings";

// ── Canvas constants ─────────────────────────────────────────────────────────

const W = 1920;
const H = 1080;

// Two-column layout grid
const CL      = 100;   // left stack x-origin
const SW      = 500;   // stack width
const SL      = 1320;  // right stack x-origin  (= W - CL - SW)
const GAP_L   = 600;   // right edge of left stack (= CL + SW)
const GAP_R   = 1320;  // left edge of right stack (= SL)
const GAP_CX  = 960;   // horizontal centre of the gap
const PAD     = 44;    // inner label padding
const HEADER_Y = 240;  // column header text Y
const ROW_START_Y = 270; // topmost row top-edge
const ROW_GAP = 20;    // gap between adjacent rows
const AVAIL_H = 450;   // row-height budget (270 → 720)

// ── Row geometry ─────────────────────────────────────────────────────────────

/** Shared row height for a stack of `count` rows. */
function rowH(count: number): number {
  return Math.max(80, Math.min(140, AVAIL_H / count));
}

/** Top-edge Y of row `i`. */
function rowTop(i: number, rh: number): number {
  return ROW_START_Y + i * (rh + ROW_GAP);
}

/** Vertically-centred label Y inside a row. */
function labelY(ry: number, rh: number, fontSize: number): number {
  return ry + (rh - fontSize) / 2;
}

/** Font size that fits comfortably inside a row of height `rh`. */
function labelFontSize(rh: number): number {
  if (rh >= 120) return 32;
  if (rh >= 95)  return 26;
  return 22;
}

// ── Animation helpers ─────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp an event end-time to be safely within the project duration. */
function ce(t: number, dur: number): number {
  return Math.min(t, dur - 0.05);
}

/** Shadow blur in pixels from a style's glow intensity. */
function gb(style: StyleSpec): number {
  return Math.round(25 * style.glowIntensity);
}

/**
 * Rewrite an opaque `rgb(R G B)` string to a new opacity.
 * Falls back gracefully if the input is not rgb().
 */
function withAlpha(color: string, alpha: number): string {
  const m = color.match(/^rgb\(\s*([^/)]+?)\s*(?:\/[^)]+)?\)/);
  if (m) return `rgb(${m[1].trim()} / ${alpha})`;
  return color; // hex or other — returned as-is
}

/**
 * Opacity AnimatedValue for closing elements.
 * Uses keyframes for durations ≥ 2s; simple from/to otherwise.
 */
function closingOpacity(closingStart: number, duration: number): AnimatedValue {
  if (duration - closingStart < 2.0) {
    return { from: 0, to: 1, easing: "easeOut" as EasingName };
  }
  return {
    keyframes: [
      { time: closingStart,         value: 0,   easing: "easeOut"   as EasingName },
      { time: closingStart + 0.8,   value: 1,   easing: "easeOut"   as EasingName },
      { time: duration - 0.8,       value: 1,   easing: "easeInOut" as EasingName },
      { time: duration,             value: 0,   easing: "easeIn"    as EasingName },
    ],
  };
}

/**
 * Five-keyframe breathing scale for the processing-glow rect.
 */
function processingScale(a4s: number, a4e: number): AnimatedValue {
  const d = a4e - a4s;
  return {
    keyframes: [
      { time: a4s,           value: 0.97, easing: "easeOut"   as EasingName },
      { time: a4s + d * 0.27, value: 1.03, easing: "easeInOut" as EasingName },
      { time: a4s + d * 0.57, value: 0.99, easing: "easeInOut" as EasingName },
      { time: a4s + d * 0.83, value: 1.02, easing: "easeInOut" as EasingName },
      { time: a4e,            value: 1.0,  easing: "easeOut"   as EasingName },
    ],
  };
}

// ── Two-Column layout ─────────────────────────────────────────────────────────

function buildTwoColumn(
  brief: VideoBrief,
  t: ActTiming,
  p: PaletteSpec,
  s: StyleSpec,
  dur: number,
): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  const { act1, act2, act3, act4, act5 } = t;
  const glow = gb(s);
  const ease = s.easing;
  const end  = dur - 0.1; // persistent end for stack elements

  const leftRows  = brief.leftRows  ?? ["Layer 1", "Layer 2"];
  const rightRows = brief.rightRows ?? ["Layer 1", "Layer 2"];
  const flow = brief.flow ?? false;

  const lCount = leftRows.length;
  const rCount = rightRows.length;
  const lRH = rowH(lCount);
  const rRH = rowH(rCount);
  const lFS = labelFontSize(lRH);
  const rFS = labelFontSize(rRH);

  // Y of the packet arc mid-point (centre of top row on each side)
  const reqY = rowTop(0, rRH) + rRH / 2;

  // Bottom edge of each stack
  const lBottom = rowTop(lCount - 1, lRH) + lRH;
  const rBottom = rowTop(rCount - 1, rRH) + rRH;
  const stackBottom = Math.max(lBottom, rBottom);

  // Derived Y values for outro elements
  const decoY    = stackBottom + 20;
  const outroY   = stackBottom + 40;
  const closingY = stackBottom + 60;
  const burstY   = stackBottom + 90;

  // ── ACT 1: Title card ────────────────────────────────────────────────────

  ev.push({
    id: "title", type: "text",
    start: act1.start, end: act1.end, layer: 5,
    text: brief.title,
    x: GAP_CX - 400, y: 380, maxWidth: 850,
    color: p.text, fontSize: 88, fontWeight: 800, lineHeight: 100,
    shadow: glow > 0 ? { color: p.glow, blur: glow * 2 } : undefined,
    opacity: { from: 0, to: 1, easing: ease },
    translateY: { from: 30, to: 0, easing: ease },
  });

  if (brief.subtitle) {
    ev.push({
      id: "subtitle", type: "text",
      start: ce(act1.start + lerp(0, act1.end - act1.start, 0.4), dur),
      end: act1.end, layer: 5,
      text: brief.subtitle,
      x: GAP_CX - 370, y: 498, maxWidth: 800,
      color: p.muted, fontSize: 28, fontWeight: 400,
      opacity: { from: 0, to: 1, easing: ease },
    });
  }

  // Deco baseline (spans whole video)
  ev.push({
    id: "deco-line", type: "shape", shapeType: "line",
    start: act1.start + 0.3, end: ce(act5.end, dur), layer: 1,
    x1: 100, y1: decoY, x2: W - 100, y2: decoY,
    stroke: p.accent1Glow, lineWidth: s.strokeWeight,
    lineDash: [14, 10], arrowStart: true, arrowEnd: true, arrowSize: 10,
    opacity: { from: 0, to: 0.7, easing: ease },
  });

  // ── ACT 2: Stacks appear ─────────────────────────────────────────────────

  // Left column header + underline
  ev.push({
    id: "left-header", type: "text",
    start: act2.start, end: end, layer: 5,
    text: brief.leftHeader ?? "LEFT",
    x: CL, y: HEADER_Y - 10, maxWidth: 200,
    color: p.text, fontSize: 16, fontWeight: 900,
    opacity: { from: 0, to: 1, easing: ease },
  });
  ev.push({
    id: "left-header-line", type: "shape", shapeType: "line",
    start: act2.start + 0.1, end: end, layer: 1,
    x1: CL, y1: HEADER_Y + 14, x2: CL + SW, y2: HEADER_Y + 14,
    stroke: p.text, lineWidth: s.strokeWeight,
    opacity: { from: 0, to: 1, easing: ease },
  });

  // Right column header + underline
  ev.push({
    id: "right-header", type: "text",
    start: act2.start + 0.1, end: end, layer: 5,
    text: brief.rightHeader ?? "RIGHT",
    x: SL, y: HEADER_Y - 10, maxWidth: 200,
    color: p.text, fontSize: 16, fontWeight: 900,
    opacity: { from: 0, to: 1, easing: ease },
  });
  ev.push({
    id: "right-header-line", type: "shape", shapeType: "line",
    start: act2.start + 0.2, end: end, layer: 1,
    x1: SL, y1: HEADER_Y + 14, x2: SL + SW, y2: HEADER_Y + 14,
    stroke: p.text, lineWidth: s.strokeWeight,
    opacity: { from: 0, to: 1, easing: ease },
  });

  // Left rows
  leftRows.forEach((label, i) => {
    const delay = i * act2.stagger;
    const ry = rowTop(i, lRH);
    const ly = labelY(ry, lRH, lFS);
    const rStart = ce(act2.start + 0.2 + delay, dur);
    const lStart = ce(act2.start + 0.4 + delay, dur);

    ev.push({
      id: `left-rect-${i}`, type: "shape", shapeType: "rect",
      start: rStart, end: end, layer: 2,
      x: CL, y: ry, width: SW, height: lRH,
      radius: s.radius,
      fill: p.surface,
      stroke: i === 0 ? p.text : p.muted,
      strokeWidth: i === 0 ? s.strokeWeight * 1.5 : s.strokeWeight,
      opacity: { from: 0, to: 1, easing: ease },
      translateY: { from: 40, to: 0, easing: ease },
    });
    ev.push({
      id: `left-label-${i}`, type: "text",
      start: lStart, end: end, layer: 4,
      text: label,
      x: CL + PAD, y: ly, maxWidth: SW - PAD * 2,
      color: i === 0 ? p.text : p.muted,
      fontSize: lFS, fontWeight: i === 0 ? 900 : 700,
      opacity: { from: 0, to: 1, easing: ease },
    });
    if (i < lCount - 1) {
      ev.push({
        id: `left-conn-${i}`, type: "shape", shapeType: "line",
        start: ce(act2.start + 0.6 + delay, dur), end: end, layer: 1,
        x1: CL + SW / 2, y1: ry + lRH,
        x2: CL + SW / 2, y2: rowTop(i + 1, lRH),
        stroke: p.muted, lineWidth: s.strokeWeight * 0.75,
        lineDash: s.lineDash ?? [6, 5],
        arrowEnd: true, arrowSize: 7,
        opacity: { from: 0, to: 1, easing: ease },
      });
    }
  });

  // Right rows
  rightRows.forEach((label, j) => {
    const delay = j * act2.stagger;
    const ry = rowTop(j, rRH);
    const ly = labelY(ry, rRH, rFS);
    const rStart = ce(act2.start + 0.3 + delay, dur);
    const lStart = ce(act2.start + 0.5 + delay, dur);

    ev.push({
      id: `right-rect-${j}`, type: "shape", shapeType: "rect",
      start: rStart, end: end, layer: 2,
      x: SL, y: ry, width: SW, height: rRH,
      radius: s.radius,
      fill: p.surface,
      stroke: j === 0 ? p.text : p.muted,
      strokeWidth: j === 0 ? s.strokeWeight * 1.5 : s.strokeWeight,
      opacity: { from: 0, to: 1, easing: ease },
      translateY: { from: 40, to: 0, easing: ease },
    });
    ev.push({
      id: `right-label-${j}`, type: "text",
      start: lStart, end: end, layer: 4,
      text: label,
      x: SL + PAD, y: ly, maxWidth: SW - PAD * 2,
      color: j === 0 ? p.text : p.muted,
      fontSize: rFS, fontWeight: j === 0 ? 900 : 700,
      opacity: { from: 0, to: 1, easing: ease },
    });
    if (j < rCount - 1) {
      ev.push({
        id: `right-conn-${j}`, type: "shape", shapeType: "line",
        start: ce(act2.start + 0.7 + delay, dur), end: end, layer: 1,
        x1: SL + SW / 2, y1: ry + rRH,
        x2: SL + SW / 2, y2: rowTop(j + 1, rRH),
        stroke: p.muted, lineWidth: s.strokeWeight * 0.75,
        lineDash: s.lineDash ?? [6, 5],
        arrowEnd: true, arrowSize: 7,
        opacity: { from: 0, to: 1, easing: ease },
      });
    }
  });

  // Gap centre divider
  const gapDivStart = ce(
    act2.start + act2.stagger * Math.max(lCount, rCount) + 0.5,
    dur,
  );
  ev.push({
    id: "gap-divider", type: "shape", shapeType: "line",
    start: gapDivStart, end: end, layer: 1,
    x1: GAP_CX, y1: ROW_START_Y - 30,
    x2: GAP_CX, y2: stackBottom + 30,
    stroke: p.muted, lineWidth: s.strokeWeight * 0.5,
    lineDash: [8, 6],
    opacity: { from: 0, to: flow ? 0.3 : 0.5, easing: ease },
  });

  // ── ACT 3 + 4: Flow (two-column, flow=true) ───────────────────────────────

  if (flow) {
    // --- Request label ---
    ev.push({
      id: "req-label", type: "text",
      start: act3.start, end: act4.start, layer: 5,
      text: brief.requestLabel ?? "REQUEST",
      x: GAP_CX - 150, y: ROW_START_Y - 60, maxWidth: 400,
      color: p.accent1, fontSize: 30, fontWeight: 700,
      shadow: glow > 0 ? { color: p.accent1Glow, blur: glow } : undefined,
      opacity: { from: 0, to: 1, easing: ease },
      translateY: { from: -15, to: 0, easing: ease },
    });

    // --- Request packet (arcs left→right) ---
    const pktStart = ce(act3.start + (act3.end - act3.start) * 0.25, dur);
    const pktEnd   = ce(act4.start, dur);
    ev.push({
      id: "req-packet", type: "shape", shapeType: "circle",
      start: pktStart, end: pktEnd, layer: 3,
      x: GAP_CX, y: reqY, radius: 22,
      fill: p.accent1Glow,
      shadow: glow > 0 ? { color: p.accent1Glow, blur: glow } : undefined,
      path: {
        points: [
          { x: GAP_L,  y: reqY },
          { x: GAP_CX, y: ROW_START_Y - 40 },
          { x: GAP_R,  y: reqY },
        ],
        easing: "easeInOut",
      },
      opacity: { from: 0, to: 1, easing: ease },
      scale: { from: 0.5, to: 1.2, easing: "easeInOut" },
    });

    // Request launch burst
    if (pktEnd > pktStart) {
      ev.push({
        id: "req-burst", type: "particle",
        start: pktStart, end: ce(pktEnd - 0.2, dur), layer: 3,
        count: 25, seed: 101,
        origin: { x: GAP_L, y: reqY },
        spread: { x: 40, y: 35 },
        drift: { x: 50, y: -20 },
        particleRadius: { min: 2, max: 5 },
        color: p.accent1Glow,
        particleOpacity: { min: 0.4, max: 0.85 },
        opacity: { from: 0, to: 1, easing: ease },
      });
    }

    // Request body text
    if (brief.requestBody) {
      const rbStart = ce(act3.start + (act3.end - act3.start) * 0.5, dur);
      if (rbStart < act4.start) {
        ev.push({
          id: "req-body", type: "text",
          start: rbStart, end: act4.start, layer: 4,
          text: brief.requestBody,
          x: GAP_CX - 140, y: rowTop(Math.min(1, rCount - 1), rRH) + 15,
          maxWidth: 420,
          color: p.muted, fontSize: 24, fontWeight: 500,
          opacity: { from: 0, to: 1, easing: "easeInOut" },
        });
      }
    }

    // --- Processing glow rect ---
    const glowTotalH = rRH * rCount + ROW_GAP * (rCount - 1);
    ev.push({
      id: "processing-glow", type: "shape", shapeType: "rect",
      start: act4.start, end: act4.end, layer: 1,
      x: SL - 8, y: ROW_START_Y - 8,
      width: SW + 16, height: glowTotalH + 16,
      radius: s.radius,
      fill: withAlpha(p.accent2, 0.08),
      shadow: glow > 0 ? { color: p.accent2Glow, blur: Math.max(20, glow) } : undefined,
      opacity: { from: 0, to: 1, easing: "easeIn" },
      scale: processingScale(act4.start, act4.end),
    });

    // Processing steps (up to 3, one per right-stack row)
    const steps = brief.processingSteps ?? [];
    const a4dur  = act4.end - act4.start;
    const maxSt  = Math.min(
      steps.length,
      rCount,
      Math.max(1, Math.floor((a4dur - 0.3) / act4.stepStagger)),
    );

    for (let k = 0; k < maxSt; k++) {
      const stStart  = ce(act4.start + 0.3 + k * act4.stepStagger, dur);
      const stEnd    = ce(act4.end - 0.2, dur);
      if (stStart >= stEnd) continue;

      const sRY = rowTop(k, rRH);
      const sLY = labelY(sRY, rRH, 20);
      const arrowX = SL + SW - 220;
      const textX  = SL + SW - 188;

      ev.push({
        id: `step-arrow-${k}`, type: "text",
        start: Math.max(act4.start, stStart - 0.3), end: stEnd, layer: 5,
        text: "→",
        x: arrowX, y: sLY, maxWidth: 30,
        color: p.accent2, fontSize: 22, fontWeight: 600,
        shadow: glow > 0 ? { color: p.accent2Glow, blur: Math.round(glow * 0.5) } : undefined,
        opacity: { from: 0, to: 1, easing: ease },
        translateX: { from: -24, to: 0, easing: ease },
      });
      ev.push({
        id: `step-text-${k}`, type: "text",
        start: stStart, end: stEnd, layer: 5,
        text: steps[k],
        x: textX, y: sLY, maxWidth: 185,
        color: p.accent2, fontSize: 20, fontWeight: 900,
        shadow: glow > 0 ? { color: p.accent2Glow, blur: Math.round(glow * 0.5) } : undefined,
        opacity: { from: 0, to: 1, easing: ease },
      });
    }

    // DB burst (bottom-right stack area)
    const dbStart = ce(act4.start + a4dur * 0.5, dur);
    if (dbStart < act4.end) {
      ev.push({
        id: "db-burst", type: "particle",
        start: dbStart, end: act4.end, layer: 3,
        count: 20, seed: 202,
        origin: { x: SL + SW / 2, y: rowTop(rCount - 1, rRH) + rRH / 2 },
        spread: { x: 70, y: 40 }, drift: { x: 5, y: -15 },
        particleRadius: { min: 2, max: 5 },
        color: p.accent2Glow,
        particleOpacity: { min: 0.3, max: 0.8 },
        opacity: { from: 0, to: 1, easing: ease },
      });
    }

    // --- Response label ---
    const resLabelStart = ce(act5.start - 0.3, dur);
    const resLabelEnd   = ce(act5.start + (act5.end - act5.start) * 0.3, dur);
    if (resLabelStart < resLabelEnd) {
      ev.push({
        id: "res-label", type: "text",
        start: resLabelStart, end: resLabelEnd, layer: 5,
        text: brief.responseLabel ?? "RESPONSE",
        x: GAP_CX - 110, y: rowTop(rCount - 1, rRH) + 15, maxWidth: 400,
        color: p.accent2, fontSize: 30, fontWeight: 700,
        shadow: glow > 0 ? { color: p.accent2Glow, blur: glow } : undefined,
        opacity: { from: 0, to: 1, easing: ease },
        translateY: { from: 15, to: 0, easing: ease },
      });
    }

    // --- Response packet (arcs right→left) ---
    const resPktStart = ce(act5.start - 0.1, dur);
    const resPktEnd   = ce(
      act5.start + Math.min(1.5, (act5.end - act5.start) * 0.3),
      dur,
    );
    if (resPktStart < resPktEnd) {
      ev.push({
        id: "res-packet", type: "shape", shapeType: "circle",
        start: resPktStart, end: resPktEnd, layer: 3,
        x: GAP_CX, y: reqY, radius: 22,
        fill: p.accent2Glow,
        shadow: glow > 0 ? { color: p.accent2Glow, blur: glow } : undefined,
        path: {
          points: [
            { x: GAP_R,  y: reqY },
            { x: GAP_CX, y: ROW_START_Y - 40 },
            { x: GAP_L,  y: reqY },
          ],
          easing: "easeInOut",
        },
        opacity: { from: 0, to: 1, easing: ease },
        scale: { from: 0.5, to: 1.2, easing: "easeInOut" },
      });
    }

    // --- Roundtrip overlay (only if enough time before closing) ---
    const rtStart = Math.max(act5.start + 0.3, act5.closingStart - 2.5);
    const rtEnd   = act5.closingStart - 0.1;
    if (rtEnd - rtStart >= 0.5) {
      const overH = stackBottom - HEADER_Y + 50;
      ev.push({
        id: "roundtrip-overlay", type: "shape", shapeType: "rect",
        start: rtStart, end: act5.closingStart, layer: 3,
        x: 70, y: HEADER_Y - 10, width: W - 140, height: overH,
        radius: s.radius,
        fill: { kind: "gradient", from: "rgb(0 0 0 / 0.5)", to: "rgb(0 0 0 / 0.2)", angle: 90 },
        stroke: p.muted, strokeWidth: s.strokeWeight * 0.5,
        opacity: { from: 0, to: 0.9, easing: "easeInOut" },
      });

      const rtRowY = (k: number) => rowTop(Math.min(k, rCount - 1), rRH) + rRH / 2;
      ev.push({
        id: "rt-req-label", type: "text",
        start: ce(rtStart + 0.3, dur), end: act5.closingStart, layer: 5,
        text: `→  ${brief.requestLabel ?? "Request"}`,
        x: GAP_CX - 70, y: rtRowY(0) + 10, maxWidth: 300,
        color: p.accent1, fontSize: 26, fontWeight: 600,
        shadow: glow > 0 ? { color: p.accent1Glow, blur: Math.round(glow * 0.4) } : undefined,
        opacity: { from: 0, to: 1, easing: ease },
        translateY: { from: -10, to: 0, easing: ease },
      });
      ev.push({
        id: "rt-res-label", type: "text",
        start: ce(rtStart + 0.6, dur), end: act5.closingStart, layer: 5,
        text: `←  ${brief.responseLabel ?? "Response"}`,
        x: GAP_CX - 70, y: rtRowY(1) + 10, maxWidth: 300,
        color: p.accent2, fontSize: 26, fontWeight: 600,
        shadow: glow > 0 ? { color: p.accent2Glow, blur: Math.round(glow * 0.4) } : undefined,
        opacity: { from: 0, to: 1, easing: ease },
        translateY: { from: 10, to: 0, easing: ease },
      });
    }
  }

  // ── ACT 5: Outro (always) ────────────────────────────────────────────────

  const cs = act5.closingStart;

  ev.push({
    id: "outro-separator", type: "shape", shapeType: "line",
    start: cs, end: dur, layer: 4,
    x1: 100, y1: outroY, x2: W - 100, y2: outroY,
    stroke: p.accent1, lineWidth: s.strokeWeight * 1.2,
    opacity: closingOpacity(cs, dur),
  });

  ev.push({
    id: "closing-line", type: "text",
    start: cs, end: dur, layer: 5,
    text: brief.closingLine ?? "Built for the web.",
    x: 240, y: closingY, maxWidth: 1440,
    color: p.text, fontSize: 48, fontWeight: 700,
    shadow: glow > 0 ? { color: p.glow, blur: Math.round(glow * 1.5) } : undefined,
    opacity: closingOpacity(cs, dur),
    translateY: { from: 20, to: 0, easing: ease },
  });

  if (s.particleDensity > 0) {
    ev.push({
      id: "celebration-burst", type: "particle",
      start: ce(cs + 0.2, dur), end: dur, layer: 3,
      count: Math.round(s.particleDensity * 0.85), seed: 303,
      origin: { x: W / 2, y: burstY },
      spread: { x: 450, y: 100 }, drift: { x: 3, y: -15 },
      particleRadius: { min: 2.5, max: 6 },
      color: p.accent1Glow,
      particleOpacity: { min: 0.3, max: 0.7 },
      opacity: { from: 0, to: 1, easing: ease },
    });
  }

  return ev;
}

// ── Single-Column layout ──────────────────────────────────────────────────────

function buildSingleColumn(
  brief: VideoBrief,
  t: ActTiming,
  p: PaletteSpec,
  s: StyleSpec,
  dur: number,
): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  const { act1, act2, act5 } = t;
  const glow = gb(s);
  const ease = s.easing;
  const cs   = act5.closingStart;

  const blocks = brief.blocks ?? [
    { heading: "Key Point",  description: "An important insight." },
    { heading: "Key Detail", description: "Another crucial detail." },
  ];
  const n = blocks.length;

  // Block Y positions — evenly spaced between blockStartY and (closingY - 80)
  const blockStartY = 430;
  const maxSpacing  = 200;
  const spacing     = n <= 1 ? maxSpacing : Math.min(maxSpacing, 500 / (n - 1));

  // ── ACT 1: Title ─────────────────────────────────────────────────────────

  ev.push({
    id: "title", type: "text",
    start: act1.start,
    end: ce(act2.start + Math.min(0.5, (act2.end - act2.start) * 0.2), dur),
    layer: 5,
    text: brief.title,
    x: 160, y: 270, maxWidth: 1600,
    color: p.text, fontSize: 88, fontWeight: 800, lineHeight: 100,
    shadow: glow > 0 ? { color: p.glow, blur: glow * 2 } : undefined,
    opacity: { from: 0, to: 1, easing: ease },
    translateY: { from: 30, to: 0, easing: ease },
  });

  if (brief.subtitle) {
    ev.push({
      id: "subtitle", type: "text",
      start: ce(act1.start + lerp(0, act1.end - act1.start, 0.4), dur),
      end: act2.start, layer: 5,
      text: brief.subtitle,
      x: 160, y: 380, maxWidth: 1200,
      color: p.muted, fontSize: 32, fontWeight: 400,
      opacity: { from: 0, to: 1, easing: ease },
    });
  }

  // ── ACT 2 onwards: Content blocks ────────────────────────────────────────

  blocks.forEach((block, i) => {
    const blkStart = ce(act2.start + i * (act2.stagger + 0.3), dur);
    const blkEnd   = ce(cs - 0.3, dur);
    if (blkStart >= blkEnd) return;

    const by = blockStartY + i * spacing;

    ev.push({
      id: `block-heading-${i}`, type: "text",
      start: blkStart, end: blkEnd, layer: 4,
      text: block.heading,
      x: 160, y: by, maxWidth: 1600,
      color: p.text, fontSize: 44, fontWeight: 700,
      shadow: glow > 0 ? { color: p.glow, blur: Math.round(glow * 0.3) } : undefined,
      opacity: { from: 0, to: 1, easing: ease },
      translateY: { from: 24, to: 0, easing: ease },
    });
    ev.push({
      id: `block-desc-${i}`, type: "text",
      start: ce(blkStart + 0.2, dur), end: blkEnd, layer: 4,
      text: block.description,
      x: 160, y: by + 60, maxWidth: 1400,
      color: p.muted, fontSize: 28, fontWeight: 400, lineHeight: 42,
      opacity: { from: 0, to: 1, easing: ease },
      translateY: { from: 16, to: 0, easing: ease },
    });
  });

  // ── ACT 5: Outro ─────────────────────────────────────────────────────────

  ev.push({
    id: "closing-line", type: "text",
    start: cs, end: dur, layer: 5,
    text: brief.closingLine ?? "Built for the web.",
    x: 160, y: 900, maxWidth: 1600,
    color: p.text, fontSize: 48, fontWeight: 700,
    shadow: glow > 0 ? { color: p.glow, blur: Math.round(glow * 1.5) } : undefined,
    opacity: closingOpacity(cs, dur),
    translateY: { from: 20, to: 0, easing: ease },
  });

  if (s.particleDensity > 0) {
    ev.push({
      id: "celebration-burst", type: "particle",
      start: ce(cs + 0.2, dur), end: dur, layer: 3,
      count: Math.round(s.particleDensity * 0.85), seed: 404,
      origin: { x: W / 2, y: 950 },
      spread: { x: 500, y: 80 }, drift: { x: 3, y: -12 },
      particleRadius: { min: 2, max: 5 },
      color: p.accent1Glow,
      particleOpacity: { min: 0.3, max: 0.7 },
      opacity: { from: 0, to: 1, easing: ease },
    });
  }

  return ev;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Expand a `VideoBrief` into a complete, renderable `VideoProject`.
 *
 * All spatial coordinates, animation values, particle configs, and path
 * waypoints are computed here — never by the AI.
 */
export function buildProjectFromBrief(
  brief: VideoBrief,
  duration: SupportedDuration,
): VideoProject {
  const timing  = TIMINGS[duration];
  const palette = PALETTES[brief.palette] ?? PALETTES[DEFAULT_PALETTE];
  const style   = STYLES[brief.style]   ?? STYLES[DEFAULT_STYLE];

  // Background (shared by both layouts)
  const background: TimelineEvent = {
    id: "bg", type: "background",
    start: 0, end: duration, layer: 0,
    background: {
      kind: "gradient",
      from: palette.bgFrom,
      to:   palette.bgTo,
      angle: palette.bgAngle,
    },
  };

  // Ambient particles (skipped if particleDensity === 0)
  const ambient: TimelineEvent[] = style.particleDensity > 0
    ? [{
        id: "ambient-particles", type: "particle",
        start: 0.2, end: duration, layer: 1,
        count: style.particleDensity, seed: 42,
        origin: { x: W / 2, y: H / 2 },
        spread: { x: W / 2 - 80, y: H / 2 - 80 },
        drift:  { x: 6, y: -2 },
        particleRadius: { min: 2, max: 6 },
        color: palette.glow,
        particleOpacity: { min: 0.2, max: 0.6 },
        opacity: { from: 0, to: 1, easing: style.easing },
      } satisfies TimelineEvent]
    : [];

  const layoutEvents =
    brief.layout === "two-column"
      ? buildTwoColumn(brief, timing, palette, style, duration)
      : buildSingleColumn(brief, timing, palette, style, duration);

  return {
    id: `brief-${Date.now()}`,
    name: brief.title,
    width: W,
    height: H,
    duration,
    events: [background, ...ambient, ...layoutEvents],
  };
}
