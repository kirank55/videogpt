// ── Two-Column Layout ─────────────────────────────────────────────────────────
//
// Builds the TimelineEvent[] for a two-column (left stack vs right stack)
// VideoBrief.  Consumes the resolved palette, style, and timing; emits every
// event for acts 1–5.
//
// Interface: buildTwoColumn(brief, timing, palette, style, duration)

import type { TimelineEvent, EasingName } from "@/lib/renderer";
import type { VideoBrief } from "@/lib/schemas/brief";
import type { PaletteSpec } from "@/lib/catalog/palettes";
import type { StyleSpec } from "@/lib/catalog/styles";
import type { ActTiming } from "@/lib/catalog/timings";
import {
  W,
  seededHash,
  mulberry32,
  pickIconForLabel,
  pickVariant,
  transitionValue,
  closingOpacity,
  processingScale,
  resolveEntryAnimation,
  resolveTitleFontSize,
  scaleParticles,
  getColumnGeometry,
  PAD,
  HEADER_Y,
  ROW_START_Y,
  ROW_GAP,
  rowH,
  rowTop,
  labelY,
  labelFontSize,
  estimateTextLines,
  lerp,
  ce,
  gb,
  withAlpha,
  injectCornerBrackets,
  injectScanLine,
  injectPulseRings,
  injectFloatingLabels,
  injectStepProgressBar,
} from "./briefHelpers";

export function buildTwoColumn(
  brief: VideoBrief,
  t: ActTiming,
  p: PaletteSpec,
  s: StyleSpec,
  dur: number,
): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  const { act1, act2, act3, act4, act5 } = t;
  const glow = gb(s);

  const easeDefault = s.easing;
  const easings = {
    title:   brief.actEasings?.title   ?? easeDefault,
    stacks:  brief.actEasings?.stacks  ?? easeDefault,
    flow:    brief.actEasings?.flow    ?? easeDefault,
    closing: brief.actEasings?.closing ?? easeDefault,
  };
  const ease = easeDefault;
  const end  = dur - 0.1;

  const leftRows  = brief.leftRows  ?? ["Layer 1", "Layer 2"];
  const rightRows = brief.rightRows ?? ["Layer 1", "Layer 2"];
  const flow = brief.flow ?? false;
  const flowStyle = brief.flowStyle ?? "arc";
  const annotations = brief.annotations ?? [];
  const deco = brief.decorations ?? {};

  const emphL = brief.emphasizeLeft  ?? 0;
  const emphR = brief.emphasizeRight ?? 0;

  const lCount = leftRows.length;
  const rCount = rightRows.length;
  const lRH = rowH(lCount);
  const rRH = rowH(rCount);
  const lFS = labelFontSize(lRH);
  const rFS = labelFontSize(rRH);

  const titleSeed = seededHash(brief.title);
  const rng = mulberry32(titleSeed);

  const variant = (brief.variant ?? pickVariant(brief.title)) as "standard" | "diagonal" | "asymmetric";
  const geo = getColumnGeometry(variant);
  const { CL, SW_L, SL, SW_R, GAP_L, GAP_R, GAP_CX, rightOffsetY } = geo;

  const reqY_L = rowTop(0, lRH) + lRH / 2;
  const reqY_R = rowTop(0, rRH, rightOffsetY) + rRH / 2;
  const reqY = (reqY_L + reqY_R) / 2;

  const lBottom = rowTop(lCount - 1, lRH) + lRH;
  const rBottom = rowTop(rCount - 1, rRH, rightOffsetY) + rRH;
  const stackBottom = Math.max(lBottom, rBottom);

  const decoY    = stackBottom + 20;
  const outroY   = stackBottom + 40;
  const closingY = stackBottom + 60;
  const burstY   = stackBottom + 90;

  const iconSz = Math.min(lRH * 0.55, 48);

  // ── ACT 1: Title card ───────────────────────────────────────────────────

  const titleFS   = resolveTitleFontSize(brief.titleSize);
  const titleLH   = Math.round(titleFS * 1.15);
  const titleAlign = brief.titleAlign ?? "left";
  const titleX    = titleAlign === "center" ? W / 2 - 400 : GAP_CX - 400;
  const titleMaxW = 850;

  ev.push({
    id: "title", type: "text",
    start: act1.start, end: act1.end, layer: 5,
    text: brief.title,
    x: titleX, y: 380, maxWidth: titleMaxW,
    color: p.text, fontSize: titleFS, fontWeight: 800, lineHeight: titleLH,
    shadow: glow > 0 ? { color: p.glow, blur: glow * 2 } : undefined,
    opacity: { from: 0, to: 1, easing: easings.title },
    translateY: { from: 30, to: 0, easing: easings.title },
  });

  if (brief.subtitle) {
    const titleLines = estimateTextLines(brief.title, titleFS, titleMaxW);
    const subtitleY = 380 + titleLines * titleLH + 24;
    ev.push({
      id: "subtitle", type: "text",
      start: ce(act1.start + lerp(0, act1.end - act1.start, 0.4), dur),
      end: act1.end, layer: 5,
      text: brief.subtitle,
      x: GAP_CX - 370, y: subtitleY, maxWidth: 800,
      color: p.muted, fontSize: 28, fontWeight: 400,
      opacity: { from: 0, to: 1, easing: easings.title },
    });
  }

  if (deco.decoBaseline !== false) {
    ev.push({
      id: "deco-line", type: "shape", shapeType: "line",
      start: act1.start + 0.3, end: ce(act5.end, dur), layer: 1,
      x1: 100, y1: decoY, x2: W - 100, y2: decoY,
      stroke: p.accent1Glow, lineWidth: s.strokeWeight,
      lineDash: [14, 10], arrowStart: true, arrowEnd: true, arrowSize: 10,
      opacity: { from: 0, to: 0.7, easing: ease },
    });
  }

  // ── ACT 2: Stacks appear ────────────────────────────────────────────────

  ev.push({
    id: "left-header", type: "text",
    start: act2.start, end: end, layer: 5,
    text: brief.leftHeader ?? "LEFT",
    x: CL, y: HEADER_Y - 10, maxWidth: SW_L,
    color: p.text, fontSize: 16, fontWeight: 900,
    opacity: { from: 0, to: 1, easing: easings.stacks },
  });
  ev.push({
    id: "left-header-line", type: "shape", shapeType: "line",
    start: act2.start + 0.1, end: end, layer: 1,
    x1: CL, y1: HEADER_Y + 14, x2: CL + SW_L, y2: HEADER_Y + 14,
    stroke: p.text, lineWidth: s.strokeWeight,
    opacity: { from: 0, to: 1, easing: easings.stacks },
  });

  ev.push({
    id: "right-header", type: "text",
    start: act2.start + 0.1, end: end, layer: 5,
    text: brief.rightHeader ?? "RIGHT",
    x: SL, y: HEADER_Y + rightOffsetY - 10, maxWidth: SW_R,
    color: p.text, fontSize: 16, fontWeight: 900,
    opacity: { from: 0, to: 1, easing: ease },
  });
  ev.push({
    id: "right-header-line", type: "shape", shapeType: "line",
    start: act2.start + 0.2, end: end, layer: 1,
    x1: SL, y1: HEADER_Y + rightOffsetY + 14, x2: SL + SW_R, y2: HEADER_Y + rightOffsetY + 14,
    stroke: p.text, lineWidth: s.strokeWeight,
    opacity: { from: 0, to: 1, easing: ease },
  });

  const bracketStart = ce(act2.start + 0.6, dur);
  injectCornerBrackets(ev, "left-bracket",  CL, ROW_START_Y, SW_L, lBottom - ROW_START_Y,                   withAlpha(p.accent1, 0.5), s.strokeWeight, bracketStart, end, ease);
  injectCornerBrackets(ev, "right-bracket", SL, ROW_START_Y + rightOffsetY, SW_R, rBottom - ROW_START_Y - rightOffsetY, withAlpha(p.accent2, 0.5), s.strokeWeight, bracketStart, end, ease);

  injectScanLine(ev, "scan-left",  CL, SW_L, ROW_START_Y,               lBottom, withAlpha(p.accent1, 0.4), 1.5, act2.start + 0.2, act2.end, ease);
  injectScanLine(ev, "scan-right", SL, SW_R, ROW_START_Y + rightOffsetY, rBottom, withAlpha(p.accent2, 0.4), 1.5, act2.start + 0.4, act2.end, ease);

  // Left rows
  leftRows.forEach((label, i) => {
    const delay  = i * act2.stagger;
    const ry     = rowTop(i, lRH);
    const ly     = labelY(ry, lRH, lFS);
    const rStart = ce(act2.start + 0.2 + delay, dur);
    const lStart = ce(act2.start + 0.4 + delay, dur);
    const isEmph = emphL >= 0 && i === emphL;
    const entryL = resolveEntryAnimation(brief.entryAnimation, easings.stacks, rStart, end, 0.5);

    ev.push({
      id: `left-rect-${i}`, type: "shape", shapeType: "rect",
      start: rStart, end, layer: 2,
      x: CL, y: ry, width: SW_L, height: lRH,
      radius: s.radius,
      fill: p.surface,
      stroke: isEmph ? p.text : p.muted,
      strokeWidth: isEmph ? s.strokeWeight * 1.5 : s.strokeWeight,
      opacity: transitionValue(0, 1, rStart, end, easings.stacks, 0.5),
      ...entryL,
    });

    const iconName = brief.leftIcons?.[i] ?? pickIconForLabel(label, titleSeed + i);
    const iconX    = CL + PAD + iconSz / 2;
    const iconCY   = ry + lRH / 2;
    ev.push({
      id: `left-icon-${i}`, type: "shape", shapeType: "icon",
      start: lStart, end, layer: 4,
      iconName, cx: iconX, cy: iconCY, size: iconSz,
      color: isEmph ? p.accent1 : withAlpha(p.muted, 0.7),
      shadow: glow > 0 && isEmph ? { color: p.accent1Glow, blur: Math.round(glow * 0.6) } : undefined,
      opacity: transitionValue(0, 1, lStart, end, easings.stacks, 0.5),
      scale:   transitionValue(0.5, 1, lStart, end, "bounce", 0.5),
    });

    const textX = CL + PAD + iconSz + 12;
    ev.push({
      id: `left-label-${i}`, type: "text",
      start: lStart, end, layer: 4,
      text: label,
      x: textX, y: ly, maxWidth: SW_L - (textX - CL) - PAD,
      color: isEmph ? p.text : p.muted,
      fontSize: lFS, fontWeight: isEmph ? 900 : 700,
      opacity: transitionValue(0, 1, lStart, end, easings.stacks, 0.5),
    });

    if (i < lCount - 1) {
      const connStart = ce(act2.start + 0.6 + delay, dur);
      ev.push({
        id: `left-conn-${i}`, type: "shape", shapeType: "line",
        start: connStart, end, layer: 1,
        x1: CL + SW_L / 2, y1: ry + lRH,
        x2: CL + SW_L / 2, y2: rowTop(i + 1, lRH),
        stroke: p.muted, lineWidth: s.strokeWeight * 0.75,
        lineDash: s.lineDash ?? [6, 5],
        arrowEnd: true, arrowSize: 7,
        opacity: transitionValue(0, 1, connStart, end, ease, 0.5),
      });
    }
  });

  // Right rows
  rightRows.forEach((label, j) => {
    const delay  = j * act2.stagger;
    const ry     = rowTop(j, rRH, rightOffsetY);
    const ly     = labelY(ry, rRH, rFS);
    const rStart = ce(act2.start + 0.3 + delay, dur);
    const lStart = ce(act2.start + 0.5 + delay, dur);
    const isEmph = emphR >= 0 && j === emphR;
    const entryR = resolveEntryAnimation(brief.entryAnimation, easings.stacks, rStart, end, 0.5);

    ev.push({
      id: `right-rect-${j}`, type: "shape", shapeType: "rect",
      start: rStart, end, layer: 2,
      x: SL, y: ry, width: SW_R, height: rRH,
      radius: s.radius,
      fill: p.surface,
      stroke: isEmph ? p.text : p.muted,
      strokeWidth: isEmph ? s.strokeWeight * 1.5 : s.strokeWeight,
      opacity: transitionValue(0, 1, rStart, end, easings.stacks, 0.5),
      ...entryR,
    });

    const iconName = brief.rightIcons?.[j] ?? pickIconForLabel(label, titleSeed + 100 + j);
    const iconSzR  = Math.min(rRH * 0.55, 48);
    const iconX    = SL + PAD + iconSzR / 2;
    const iconCY   = ry + rRH / 2;
    ev.push({
      id: `right-icon-${j}`, type: "shape", shapeType: "icon",
      start: lStart, end, layer: 4,
      iconName, cx: iconX, cy: iconCY, size: iconSzR,
      color: isEmph ? p.accent2 : withAlpha(p.muted, 0.7),
      shadow: glow > 0 && isEmph ? { color: p.accent2Glow, blur: Math.round(glow * 0.6) } : undefined,
      opacity: transitionValue(0, 1, lStart, end, easings.stacks, 0.5),
      scale:   transitionValue(0.5, 1, lStart, end, "bounce", 0.5),
    });

    const textXR = SL + PAD + iconSzR + 12;
    ev.push({
      id: `right-label-${j}`, type: "text",
      start: lStart, end, layer: 4,
      text: label,
      x: textXR, y: ly, maxWidth: flow ? (SL + SW_R - 230) - textXR : SW_R - (textXR - SL) - PAD,
      color: isEmph ? p.text : p.muted,
      fontSize: rFS, fontWeight: isEmph ? 900 : 700,
      opacity: transitionValue(0, 1, lStart, end, easings.stacks, 0.5),
    });

    if (j < rCount - 1) {
      const connStart = ce(act2.start + 0.7 + delay, dur);
      ev.push({
        id: `right-conn-${j}`, type: "shape", shapeType: "line",
        start: connStart, end, layer: 1,
        x1: SL + SW_R / 2, y1: ry + rRH,
        x2: SL + SW_R / 2, y2: rowTop(j + 1, rRH, rightOffsetY),
        stroke: p.muted, lineWidth: s.strokeWeight * 0.75,
        lineDash: s.lineDash ?? [6, 5],
        arrowEnd: true, arrowSize: 7,
        opacity: { from: 0, to: 1, easing: ease },
      });
    }
  });

  const gapDivStart = ce(act2.start + act2.stagger * Math.max(lCount, rCount) + 0.5, dur);
  if (deco.gapDivider !== false) {
    ev.push({
      id: "gap-divider", type: "shape", shapeType: "line",
      start: gapDivStart, end, layer: 1,
      x1: GAP_CX, y1: ROW_START_Y - 30,
      x2: GAP_CX, y2: stackBottom + 30,
      stroke: p.muted, lineWidth: s.strokeWeight * 0.5,
      lineDash: [8, 6],
      opacity: { from: 0, to: flow ? 0.3 : 0.5, easing: ease },
    });
  }

  if (annotations.length > 0) {
    injectFloatingLabels(ev, annotations, GAP_CX, reqY, rRH, p.accent1, gapDivStart, end, ease);
  }

  // ── ACT 3 + 4: Flow ─────────────────────────────────────────────────────

  if (flow) {
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

    const pktStart = ce(act3.start + (act3.end - act3.start) * 0.25, dur);
    const pktEnd   = ce(act4.start, dur);

    let reqPath: { points: { x: number; y: number }[]; easing: EasingName };
    if (flowStyle === "straight") {
      reqPath = { points: [{ x: GAP_L, y: reqY_L }, { x: GAP_R, y: reqY_R }], easing: "easeInOut" };
    } else if (flowStyle === "zigzag") {
      const midX = GAP_CX;
      const zigY = reqY + 60;
      reqPath = { points: [{ x: GAP_L, y: reqY_L }, { x: midX - 80, y: zigY }, { x: midX + 80, y: reqY - 40 }, { x: GAP_R, y: reqY_R }], easing: "linear" };
    } else {
      reqPath = { points: [{ x: GAP_L, y: reqY_L }, { x: GAP_CX, y: Math.min(reqY_L, reqY_R) - 40 }, { x: GAP_R, y: reqY_R }], easing: "easeInOut" };
    }

    ev.push({
      id: "req-packet", type: "shape", shapeType: "circle",
      start: pktStart, end: pktEnd, layer: 3,
      x: GAP_CX, y: reqY, radius: 22,
      fill: p.accent1Glow,
      shadow: glow > 0 ? { color: p.accent1Glow, blur: glow } : undefined,
      path: reqPath,
      opacity: { from: 0, to: 1, easing: ease },
      scale: { from: 0.5, to: 1.2, easing: "easeInOut" },
    });

    if (deco.pulseRings !== false) {
      injectPulseRings(ev, "req", GAP_L, reqY_L, p.accent1Glow, Math.round(glow * 0.7), pktStart, pktEnd - pktStart);
    }

    if (pktEnd > pktStart) {
      ev.push({
        id: "req-trail", type: "particle",
        start: pktStart, end: ce(pktEnd - 0.1, dur), layer: 2,
        count: scaleParticles(18, brief.particleIntensity), seed: 555 + Math.round(rng() * 100),
        origin: { x: GAP_CX, y: reqY },
        spread: { x: 120, y: 30 }, drift: { x: 40, y: -10 },
        particleRadius: { min: 1.5, max: 3.5 },
        color: p.accent1Glow,
        particleOpacity: { min: 0.2, max: 0.65 },
        opacity: { from: 0, to: 1, easing: easings.flow },
      });
      ev.push({
        id: "req-burst", type: "particle",
        start: pktStart, end: ce(pktEnd - 0.2, dur), layer: 3,
        count: scaleParticles(25, brief.particleIntensity), seed: 101,
        origin: { x: GAP_L, y: reqY_L },
        spread: { x: 40, y: 35 }, drift: { x: 50, y: -20 },
        particleRadius: { min: 2, max: 5 },
        color: p.accent1Glow,
        particleOpacity: { min: 0.4, max: 0.85 },
        opacity: { from: 0, to: 1, easing: easings.flow },
      });
    }

    if (brief.requestBody) {
      const rbStart = ce(act3.start + (act3.end - act3.start) * 0.5, dur);
      if (rbStart < act4.start) {
        ev.push({
          id: "req-body", type: "text",
          start: rbStart, end: act4.start, layer: 4,
          text: brief.requestBody,
          x: GAP_CX - 140, y: rowTop(Math.min(1, rCount - 1), rRH, rightOffsetY) + 15,
          maxWidth: 420,
          color: p.muted, fontSize: 24, fontWeight: 500,
          opacity: { from: 0, to: 1, easing: "easeInOut" },
        });
      }
    }

    const glowTotalH = rRH * rCount + ROW_GAP * (rCount - 1);
    ev.push({
      id: "processing-glow", type: "shape", shapeType: "rect",
      start: act4.start, end: act4.end, layer: 1,
      x: SL - 8, y: ROW_START_Y + rightOffsetY - 8,
      width: SW_R + 16, height: glowTotalH + 16,
      radius: s.radius,
      fill: withAlpha(p.accent2, 0.08),
      shadow: glow > 0 ? { color: p.accent2Glow, blur: Math.max(20, glow) } : undefined,
      opacity: { from: 0, to: 1, easing: "easeIn" },
      scale: processingScale(act4.start, act4.end),
    });

    const steps  = brief.processingSteps ?? [];
    const a4dur  = act4.end - act4.start;
    const maxSt  = Math.min(steps.length, rCount, Math.max(1, Math.floor((a4dur - 0.3) / act4.stepStagger)));

    for (let k = 0; k < maxSt; k++) {
      const stStart = ce(act4.start + 0.3 + k * act4.stepStagger, dur);
      const stEnd   = ce(act4.end - 0.2, dur);
      if (stStart >= stEnd) continue;

      const sRY   = rowTop(k, rRH, rightOffsetY);
      const sLY   = labelY(sRY, rRH, 20);
      const arrowX = SL + SW_R - 220;
      const textX  = SL + SW_R - 188;

      ev.push({
        id: `step-highlight-${k}`, type: "shape", shapeType: "rect",
        start: Math.max(act4.start, stStart - 0.1), end: ce(stStart + 0.8, dur), layer: 2,
        x: SL, y: sRY, width: SW_R, height: rRH,
        radius: s.radius,
        fill: withAlpha(p.accent2, 0.18),
        opacity: { keyframes: [
          { time: stStart - 0.1, value: 0, easing: "easeOut" },
          { time: stStart + 0.3, value: 1, easing: "easeInOut" },
          { time: stStart + 0.8, value: 0, easing: "easeIn" },
        ]},
      });

      injectStepProgressBar(ev, `step-progress-${k}`, SL, sRY, SW_R, rRH, p.accent2, withAlpha(p.accent2, 0.15), stStart, stEnd, ease);

      ev.push({
        id: `step-arrow-${k}`, type: "text",
        start: Math.max(act4.start, stStart - 0.3), end: stEnd, layer: 5,
        text: "→", x: arrowX, y: sLY, maxWidth: 30,
        color: p.accent2, fontSize: 22, fontWeight: 600,
        shadow: glow > 0 ? { color: p.accent2Glow, blur: Math.round(glow * 0.5) } : undefined,
        opacity: { from: 0, to: 1, easing: ease },
        translateX: { from: -24, to: 0, easing: ease },
      });
      ev.push({
        id: `step-text-${k}`, type: "text",
        start: stStart, end: stEnd, layer: 5,
        text: steps[k], x: textX, y: sLY, maxWidth: 185,
        color: p.accent2, fontSize: 20, fontWeight: 900,
        shadow: glow > 0 ? { color: p.accent2Glow, blur: Math.round(glow * 0.5) } : undefined,
        opacity: { from: 0, to: 1, easing: ease },
      });
    }

    const dbStart = ce(act4.start + a4dur * 0.5, dur);
    if (dbStart < act4.end) {
      ev.push({
        id: "db-burst", type: "particle",
        start: dbStart, end: act4.end, layer: 3,
        count: scaleParticles(20, brief.particleIntensity), seed: 202,
        origin: { x: SL + SW_R / 2, y: rowTop(rCount - 1, rRH, rightOffsetY) + rRH / 2 },
        spread: { x: 70, y: 40 }, drift: { x: 5, y: -15 },
        particleRadius: { min: 2, max: 5 },
        color: p.accent2Glow,
        particleOpacity: { min: 0.3, max: 0.8 },
        opacity: { from: 0, to: 1, easing: ease },
      });
    }

    const resLabelStart = ce(act5.start - 0.3, dur);
    const resLabelEnd   = ce(act5.start + (act5.end - act5.start) * 0.3, dur);
    if (resLabelStart < resLabelEnd) {
      ev.push({
        id: "res-label-badge", type: "shape", shapeType: "badge",
        start: resLabelStart, end: resLabelEnd, layer: 5,
        cx: GAP_CX, cy: rowTop(rCount - 1, rRH, rightOffsetY) + rRH / 2 - 20,
        text: brief.responseLabel ?? "200 OK",
        fontSize: 28, paddingX: 22, paddingY: 10,
        fill: withAlpha(p.accent2, 0.15), textColor: p.accent2,
        stroke: p.accent2, strokeWidth: 1.5,
        shadow: glow > 0 ? { color: p.accent2Glow, blur: Math.round(glow * 0.8) } : undefined,
        opacity: { from: 0, to: 1, easing: ease },
        translateY: { from: 15, to: 0, easing: ease },
      });
    }

    const resPktStart = ce(act5.start - 0.1, dur);
    const resPktEnd   = ce(act5.start + Math.min(1.5, (act5.end - act5.start) * 0.3), dur);
    if (resPktStart < resPktEnd) {
      let resPath: { points: { x: number; y: number }[]; easing: EasingName };
      if (flowStyle === "straight") {
        resPath = { points: [{ x: GAP_R, y: reqY_R }, { x: GAP_L, y: reqY_L }], easing: "easeInOut" };
      } else if (flowStyle === "zigzag") {
        const midX = GAP_CX;
        const zigY = reqY + 60;
        resPath = { points: [{ x: GAP_R, y: reqY_R }, { x: midX + 80, y: zigY }, { x: midX - 80, y: reqY - 40 }, { x: GAP_L, y: reqY_L }], easing: "linear" };
      } else {
        resPath = { points: [{ x: GAP_R, y: reqY_R }, { x: GAP_CX, y: Math.min(reqY_L, reqY_R) - 40 }, { x: GAP_L, y: reqY_L }], easing: "easeInOut" };
      }

      ev.push({
        id: "res-packet", type: "shape", shapeType: "circle",
        start: resPktStart, end: resPktEnd, layer: 3,
        x: GAP_CX, y: reqY, radius: 22,
        fill: p.accent2Glow,
        shadow: glow > 0 ? { color: p.accent2Glow, blur: glow } : undefined,
        path: resPath,
        opacity: { from: 0, to: 1, easing: ease },
        scale: { from: 0.5, to: 1.2, easing: "easeInOut" },
      });

      if (deco.pulseRings !== false) {
        injectPulseRings(ev, "res", GAP_L, reqY_L, p.accent2Glow, Math.round(glow * 0.7), resPktEnd, 0.8);
      }
    }

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

      const rtRowY = (k: number) => rowTop(Math.min(k, rCount - 1), rRH, rightOffsetY) + rRH / 2;
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

  // ── ACT 5: Outro ────────────────────────────────────────────────────────

  const cs = act5.closingStart;
  const closingStyle = brief.closingStyle ?? "fade-up";

  if (closingStyle !== "none") {
    ev.push({
      id: "outro-separator", type: "shape", shapeType: "line",
      start: cs, end: dur, layer: 4,
      x1: 100, y1: outroY, x2: W - 100, y2: outroY,
      stroke: p.accent1, lineWidth: s.strokeWeight * 1.2,
      opacity: closingOpacity(cs, dur),
    });

    const closingX = closingStyle === "fade-center" ? W / 2 : 240;
    ev.push({
      id: "closing-line", type: "text",
      start: cs, end: dur, layer: 5,
      text: brief.closingLine ?? "Built for the web.",
      x: closingX, y: closingY, maxWidth: 1440,
      color: p.text, fontSize: 48, fontWeight: 700,
      shadow: glow > 0 ? { color: p.glow, blur: Math.round(glow * 1.5) } : undefined,
      opacity: closingOpacity(cs, dur),
      ...(closingStyle === "fade-center" && { align: "center" as CanvasTextAlign }),
      ...(closingStyle === "fade-up" && {
        translateY: { from: 20, to: 0, easing: easings.closing },
      }),
    });
  }

  if (scaleParticles(Math.round(s.particleDensity * 0.85), brief.particleIntensity) > 0) {
    ev.push({
      id: "celebration-burst", type: "particle",
      start: ce(cs + 0.2, dur), end: dur, layer: 3,
      count: scaleParticles(Math.round(s.particleDensity * 0.85), brief.particleIntensity), seed: 303,
      origin: { x: W / 2, y: burstY },
      spread: { x: 450, y: 100 }, drift: { x: 3, y: -15 },
      particleRadius: { min: 2.5, max: 6 },
      color: p.accent1Glow,
      particleOpacity: { min: 0.3, max: 0.7 },
      opacity: { from: 0, to: 1, easing: ease },
    });
  }

  // Suppress unused rng warning (used earlier for trail seed)
  void rng;

  return ev;
}
