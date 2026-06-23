// ── Single-Column Layout ──────────────────────────────────────────────────────
//
// Builds the TimelineEvent[] for a single-column (content blocks + optional
// visual diagram) VideoBrief.  Consumes the resolved palette, style, and
// timing; emits every event for acts 1, 2, and 5.
//
// Interface: buildSingleColumn(brief, timing, palette, style, duration)

import type { TimelineEvent, AnimatedValue } from "@/lib/renderer";
import type { VideoBrief } from "@/lib/schemas/brief";
import type { PaletteSpec } from "@/lib/catalog/palettes";
import type { StyleSpec } from "@/lib/catalog/styles";
import type { ActTiming } from "@/lib/catalog/timings";
import {
  W,
  seededHash,
  pickIconForLabel,
  transitionValue,
  closingOpacity,
  resolveEntryAnimation,
  resolveTitleFontSize,
  scaleParticles,
  estimateTextLines,
  lerp,
  ce,
  gb,
  withAlpha,
} from "./briefHelpers";

// ── Shape entry animation resolver (single-column specific) ───────────────────
//
// The two-column layout uses resolveEntryAnimation (from briefHelpers) for
// text events.  Single-column also needs shape-specific entry variants (grow-y,
// grow-x, draw) that don't appear in the two-column path, so they live here.

function resolveShapeEntry(
  entry: string | undefined,
  easing: import("@/lib/renderer").EasingName,
  start: number,
  end: number,
  transitionDuration = 0.5,
) {
  if (entry === "slide-up")   return { opacity: transitionValue(0, 1, start, end, easing, transitionDuration), translateY: transitionValue(40,  0, start, end, easing, transitionDuration) };
  if (entry === "slide-down") return { opacity: transitionValue(0, 1, start, end, easing, transitionDuration), translateY: transitionValue(-40, 0, start, end, easing, transitionDuration) };
  if (entry === "scale-up")   return { opacity: transitionValue(0, 1, start, end, easing, transitionDuration), scale:      transitionValue(0.5, 1, start, end, easing, transitionDuration) };
  if (entry === "grow-y")     return { opacity: transitionValue(0, 1, start, end, easing, transitionDuration), scaleY:     transitionValue(0,   1, start, end, easing, transitionDuration) };
  if (entry === "grow-x")     return { opacity: transitionValue(0, 1, start, end, easing, transitionDuration), scaleX:     transitionValue(0,   1, start, end, easing, transitionDuration) };
  if (entry === "draw")       return { opacity: transitionValue(0, 1, start, end, easing, transitionDuration), drawProgress: transitionValue(0, 1, start, end, easing, transitionDuration) };
  return { opacity: transitionValue(0, 1, start, end, easing, transitionDuration) };
}

// ── Main builder ──────────────────────────────────────────────────────────────

export function buildSingleColumn(
  brief: VideoBrief,
  t: ActTiming,
  p: PaletteSpec,
  s: StyleSpec,
  dur: number,
): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  const { act1, act2, act5 } = t;
  const glow = gb(s);
  const easeDefault = s.easing;
  const easings = {
    title:   brief.actEasings?.title   ?? easeDefault,
    stacks:  brief.actEasings?.stacks  ?? easeDefault,
    closing: brief.actEasings?.closing ?? easeDefault,
  };
  const ease = easeDefault;
  const cs   = act5.closingStart;
  const blockStyle   = brief.blockStyle   ?? "stacked";
  const closingStyle = brief.closingStyle ?? "fade-up";

  const blocks = brief.blocks ?? [
    { heading: "Key Point",  description: "An important insight." },
    { heading: "Key Detail", description: "Another crucial detail." },
  ];
  const n = blocks.length;

  const visualElements = brief.visualElements ?? [];
  const hasVisuals = visualElements.length > 0;

  const startX = 160;
  const blockMaxWidth = hasVisuals ? 750 : W - 320;

  // Dynamically adjust block text styling to prevent vertical overlaps
  let headFS = 44;
  let descFS = 28;
  let descLH = 42;
  let descYOffset = 60;
  let blockStartY = 430;
  let blockMaxHeight = 440;

  if (n > 3) {
    headFS = 30;
    descFS = 20;
    descLH = 28;
    descYOffset = 42;
    blockStartY = 390;
    blockMaxHeight = 460;
  }

  const maxSpacing = 200;
  const spacing    = n <= 1 ? maxSpacing : Math.min(maxSpacing, blockMaxHeight / (n - 1));

  const titleSeed  = seededHash(brief.title);
  const titleFS    = resolveTitleFontSize(brief.titleSize);
  const titleLH    = Math.round(titleFS * 1.15);
  const isCentered = brief.titleAlign === "center";
  const titleMaxW  = hasVisuals ? 750 : 1600;
  const subtitleMaxW = hasVisuals ? 750 : 1200;
  const titleX     = isCentered
    ? (hasVisuals ? startX + titleMaxW / 2 : W / 2)
    : startX;

  // ── ACT 1: Title ─────────────────────────────────────────────────────────

  const titleEnd = ce(act2.start + Math.min(0.5, (act2.end - act2.start) * 0.2), dur);
  const titleOpacity: AnimatedValue = {
    keyframes: [
      { time: act1.start, value: 0, easing: easings.title },
      { time: Math.min(act1.start + 0.5, act2.start), value: 1, easing: easings.title },
      ...(act2.start > act1.start + 0.5 ? [{ time: act2.start, value: 1, easing: easings.title }] : []),
      { time: titleEnd, value: 0, easing: easings.title },
    ],
  };
  const titleTranslateY: AnimatedValue = {
    keyframes: [
      { time: act1.start, value: 30, easing: easings.title },
      { time: Math.min(act1.start + 0.5, act2.start), value: 0, easing: easings.title },
      ...(act2.start > act1.start + 0.5 ? [{ time: act2.start, value: 0, easing: easings.title }] : []),
      { time: titleEnd, value: -30, easing: easings.title },
    ],
  };

  ev.push({
    id: "title", type: "text",
    start: act1.start, end: titleEnd, layer: 5,
    text: brief.title,
    x: titleX, y: 270, maxWidth: titleMaxW,
    color: p.text, fontSize: titleFS, fontWeight: 800, lineHeight: titleLH,
    shadow: glow > 0 ? { color: p.glow, blur: glow * 2 } : undefined,
    opacity: titleOpacity,
    translateY: titleTranslateY,
    ...(isCentered && { align: "center" as CanvasTextAlign }),
  });

  if (brief.subtitle) {
    const titleLines   = estimateTextLines(brief.title, titleFS, titleMaxW);
    const subtitleY    = 270 + titleLines * titleLH + 24;
    const subStart     = ce(act1.start + lerp(0, act1.end - act1.start, 0.4), dur);
    const subOpacity: AnimatedValue = {
      keyframes: [
        { time: subStart, value: 0, easing: easings.title },
        { time: Math.min(subStart + 0.5, act2.start), value: 1, easing: easings.title },
        ...(act2.start > subStart + 0.5 ? [{ time: act2.start, value: 1, easing: easings.title }] : []),
        { time: titleEnd, value: 0, easing: easings.title },
      ],
    };
    const subTranslateY: AnimatedValue = {
      keyframes: [
        { time: subStart, value: 20, easing: easings.title },
        { time: Math.min(subStart + 0.5, act2.start), value: 0, easing: easings.title },
        ...(act2.start > subStart + 0.5 ? [{ time: act2.start, value: 0, easing: easings.title }] : []),
        { time: titleEnd, value: -30, easing: easings.title },
      ],
    };

    ev.push({
      id: "subtitle", type: "text",
      start: subStart, end: titleEnd, layer: 5,
      text: brief.subtitle,
      x: titleX, y: subtitleY, maxWidth: subtitleMaxW,
      color: p.muted, fontSize: 32, fontWeight: 400,
      opacity: subOpacity,
      translateY: subTranslateY,
      ...(isCentered && { align: "center" as CanvasTextAlign }),
    });
  }

  // ── ACT 2+: Content blocks ────────────────────────────────────────────────

  blocks.forEach((block, i) => {
    const blkStart = ce(act2.start + i * (act2.stagger + 0.3), dur);
    const blkEnd   = ce(cs - 0.3, dur);
    if (blkStart >= blkEnd) return;

    const entryBlk  = resolveEntryAnimation(brief.entryAnimation, easings.stacks, blkStart, blkEnd, 0.5);
    const entryDesc = resolveEntryAnimation(brief.entryAnimation, easings.stacks, ce(blkStart + 0.2, dur), blkEnd, 0.5);

    const by = blockStartY + i * spacing;

    const timelineDotX = startX - 70;
    const cardX        = startX - 60;
    const cardW        = hasVisuals ? blockMaxWidth + 80 : W - 200;
    const numX         = startX - 60;
    const iconLeft     = blockStyle === "numbered" ? startX + 25 : blockStyle === "timeline" ? startX - 30 : startX - 40;

    if (blockStyle === "timeline") {
      ev.push({
        id: `timeline-dot-${i}`, type: "shape", shapeType: "circle",
        start: blkStart, end: blkEnd, layer: 3,
        x: timelineDotX, y: by + 22, radius: 8,
        fill: p.accent1,
        shadow: glow > 0 ? { color: p.accent1Glow, blur: Math.round(glow * 0.5) } : undefined,
        opacity: transitionValue(0, 1, blkStart, blkEnd, ease, 0.5),
        scale:   transitionValue(0, 1, blkStart, blkEnd, "bounce", 0.5),
      });
      if (i < n - 1) {
        ev.push({
          id: `timeline-line-${i}`, type: "shape", shapeType: "line",
          start: ce(blkStart + 0.3, dur), end: blkEnd, layer: 2,
          x1: timelineDotX, y1: by + 30, x2: timelineDotX, y2: by + spacing,
          stroke: withAlpha(p.accent1, 0.35), lineWidth: s.strokeWeight,
          lineDash: s.lineDash ?? [4, 4],
          opacity: transitionValue(0, 1, ce(blkStart + 0.3, dur), blkEnd, ease, 0.5),
        });
      }
    }

    if (blockStyle === "cards") {
      ev.push({
        id: `card-bg-${i}`, type: "shape", shapeType: "rect",
        start: blkStart, end: blkEnd, layer: 1,
        x: cardX, y: by - 20, width: cardW, height: spacing > 0 ? spacing - 10 : 170,
        radius: s.radius,
        fill: p.surface,
        stroke: p.muted, strokeWidth: s.strokeWeight * 0.8,
        opacity: transitionValue(0, 1, blkStart, blkEnd, ease, 0.5),
        ...entryBlk,
      });
    }

    if (blockStyle === "numbered") {
      ev.push({
        id: `block-num-${i}`, type: "text",
        start: blkStart, end: blkEnd, layer: 4,
        text: String(i + 1).padStart(2, "0"),
        x: numX, y: by, maxWidth: 60,
        color: withAlpha(p.accent1, 0.5), fontSize: 60, fontWeight: 900,
        opacity: transitionValue(0, 1, blkStart, blkEnd, ease, 0.5),
      });
    }

    const iconName  = brief.blockIcons?.[i] ?? block.icon ?? pickIconForLabel(block.heading, titleSeed + i * 7);
    ev.push({
      id: `block-icon-${i}`, type: "shape", shapeType: "icon",
      start: blkStart, end: blkEnd, layer: 4,
      iconName, cx: iconLeft, cy: by + 22, size: 44,
      color: p.accent1,
      shadow: glow > 0 ? { color: p.glow, blur: Math.round(glow * 0.4) } : undefined,
      opacity: transitionValue(0, 1, blkStart, blkEnd, ease, 0.5),
      scale:   transitionValue(0.4, 1, blkStart, blkEnd, "bounce", 0.5),
    });

    const textLeft      = iconLeft + 48;
    const headingMaxW   = blockMaxWidth - (textLeft - startX);
    ev.push({
      id: `block-heading-${i}`, type: "text",
      start: blkStart, end: blkEnd, layer: 4,
      text: block.heading,
      x: textLeft, y: by, maxWidth: headingMaxW,
      color: p.text, fontSize: headFS, fontWeight: 700,
      shadow: glow > 0 ? { color: p.glow, blur: Math.round(glow * 0.3) } : undefined,
      opacity: transitionValue(0, 1, blkStart, blkEnd, easings.stacks, 0.5),
      ...entryBlk,
    });
    ev.push({
      id: `block-desc-${i}`, type: "text",
      start: ce(blkStart + 0.2, dur), end: blkEnd, layer: 4,
      text: block.description,
      x: textLeft, y: by + descYOffset, maxWidth: headingMaxW - 20,
      color: p.muted, fontSize: descFS, fontWeight: 400, lineHeight: descLH,
      opacity: transitionValue(0, 1, ce(blkStart + 0.2, dur), blkEnd, easings.stacks, 0.5),
      ...entryDesc,
    });
  });

  // ── ACT 2+: Visual elements (diagram on the right half) ───────────────────

  if (hasVisuals) {
    const boxX = 1060;
    const boxY = 320;

    visualElements.forEach((element, idx) => {
      const blockIndex = element.blockIndex ?? 0;
      const blkStart = ce(act2.start + Math.min(n - 1, Math.max(0, blockIndex)) * (act2.stagger + 0.3), dur);
      const blkEnd   = ce(cs - 0.3, dur);
      if (blkStart >= blkEnd) return;

      const elementEase = easings.stacks;
      const entryAnims  = resolveShapeEntry(element.entry, elementEase, blkStart, blkEnd);

      let baseColor = p.accent1;
      if (element.color === "accent2") baseColor = p.accent2;
      else if (element.color === "muted")   baseColor = p.muted;
      else if (element.color === "text")    baseColor = p.text;
      else if (element.color === "surface") baseColor = p.surface;

      const shapeX = boxX + (element.x ?? 0);
      const shapeY = boxY + (element.y ?? 0);

      if (element.type === "rect") {
        const isOutline  = element.fillType === "outline" || element.fillType === "dashed";
        const fill       = isOutline ? withAlpha(baseColor, 0) : baseColor;
        const stroke     = isOutline ? baseColor : undefined;
        const strokeWidth = stroke ? s.strokeWeight * 0.8 : undefined;
        ev.push({
          id: `vis-shape-${idx}`, type: "shape", shapeType: "rect",
          start: blkStart, end: blkEnd, layer: 2,
          x: shapeX, y: shapeY,
          width: element.width ?? 100, height: element.height ?? 100,
          radius: element.radius ?? s.radius ?? 0,
          fill, stroke, strokeWidth,
          shadow: glow > 0 ? { color: p.glow, blur: Math.round(glow * 0.4) } : undefined,
          ...entryAnims,
        });
      } else if (element.type === "circle") {
        const isOutline  = element.fillType === "outline" || element.fillType === "dashed";
        const fill       = isOutline ? withAlpha(baseColor, 0) : baseColor;
        const stroke     = isOutline ? baseColor : undefined;
        const strokeWidth = stroke ? s.strokeWeight * 0.8 : undefined;
        ev.push({
          id: `vis-shape-${idx}`, type: "shape", shapeType: "circle",
          start: blkStart, end: blkEnd, layer: 2,
          x: shapeX, y: shapeY,
          radius: element.radius ?? 50,
          fill, stroke, strokeWidth,
          shadow: glow > 0 ? { color: p.glow, blur: Math.round(glow * 0.4) } : undefined,
          ...entryAnims,
        });
      } else if (element.type === "line") {
        const lineX1 = boxX + (element.x1 ?? 0);
        const lineY1 = boxY + (element.y1 ?? 0);
        const lineX2 = boxX + (element.x2 ?? 0);
        const lineY2 = boxY + (element.y2 ?? 0);
        ev.push({
          id: `vis-shape-${idx}`, type: "shape", shapeType: "line",
          start: blkStart, end: blkEnd, layer: 2,
          x1: lineX1, y1: lineY1, x2: lineX2, y2: lineY2,
          stroke: baseColor,
          lineWidth: element.width ?? s.strokeWeight ?? 3,
          lineDash: element.fillType === "dashed" ? [6, 6] : undefined,
          startPadding: element.startPadding,
          endPadding: element.endPadding,
          ...entryAnims,
        });
      } else if (element.type === "icon") {
        ev.push({
          id: `vis-shape-${idx}`, type: "shape", shapeType: "icon",
          start: blkStart, end: blkEnd, layer: 3,
          iconName: element.iconName ?? "gear",
          cx: shapeX, cy: shapeY,
          size: element.width ?? element.radius ?? 48,
          color: baseColor,
          shadow: glow > 0 ? { color: p.glow, blur: Math.round(glow * 0.4) } : undefined,
          ...entryAnims,
        });
      }

      if (element.label) {
        let labelCX = shapeX;
        let labelCY = shapeY;
        if (element.type === "rect") {
          labelCX = shapeX + (element.width ?? 100) / 2;
          labelCY = shapeY + (element.height ?? 100) / 2;
        } else if (element.type === "circle") {
          if (element.fillType === "outline" || element.fillType === "dashed") {
            labelCY = shapeY - (element.radius ?? 50);
          }
        } else if (element.type === "line") {
          const lineX1 = boxX + (element.x1 ?? 0);
          const lineY1 = boxY + (element.y1 ?? 0);
          const lineX2 = boxX + (element.x2 ?? 0);
          const lineY2 = boxY + (element.y2 ?? 0);
          labelCX = (lineX1 + lineX2) / 2;
          labelCY = (lineY1 + lineY2) / 2;
        }

        const subStart     = ce(blkStart + 0.1, dur);
        const hasBackdrop  = element.labelBackdrop !== undefined
          ? element.labelBackdrop
          : (element.type === "line" || (element.type === "circle" && (element.fillType === "outline" || element.fillType === "dashed")));
        const backdrop = hasBackdrop
          ? { fill: p.surface, stroke: withAlpha(p.text, 0.15), strokeWidth: 1, paddingX: 14, paddingY: 6, radius: 6 }
          : undefined;

        const isFilled    = element.type !== "line" && (element.fillType ?? "solid") === "solid";
        const labelColor  = hasBackdrop
          ? p.text
          : isFilled
            ? (element.color === "surface" || element.color === "muted" ? p.text : p.surface)
            : p.text;

        let fontSize = 22;
        if (element.type === "rect") {
          const rectW = element.width ?? 100;
          const charWidthFactor = 0.58;
          const estimatedTextWidth = element.label.length * 22 * charWidthFactor;
          if (estimatedTextWidth > rectW - 20) {
            fontSize = Math.max(14, Math.floor((rectW - 20) / (element.label.length * charWidthFactor)));
          }
        } else if (element.type === "circle" && !hasBackdrop) {
          const circleW = (element.radius ?? 50) * 1.5;
          const charWidthFactor = 0.58;
          const estimatedTextWidth = element.label.length * 22 * charWidthFactor;
          if (estimatedTextWidth > circleW) {
            fontSize = Math.max(14, Math.floor(circleW / (element.label.length * charWidthFactor)));
          }
        }

        ev.push({
          id: `vis-label-${idx}`, type: "text",
          start: subStart, end: blkEnd, layer: 4,
          text: element.label,
          x: labelCX, y: labelCY, maxWidth: element.width ?? 200,
          color: labelColor, fontSize, fontWeight: 700, align: "center",
          verticalAlign: "middle",
          backdrop,
          opacity: transitionValue(0, 1, subStart, blkEnd, elementEase, 0.5),
          ...(element.entry === "slide-up"   && { translateY: transitionValue(20,  0, subStart, blkEnd, elementEase, 0.5) }),
          ...(element.entry === "slide-down" && { translateY: transitionValue(-20, 0, subStart, blkEnd, elementEase, 0.5) }),
        });
      }
    });
  }

  // ── ACT 5: Outro ─────────────────────────────────────────────────────────

  if (closingStyle !== "none") {
    const closingX = closingStyle === "fade-center" ? W / 2 : 160;
    ev.push({
      id: "closing-line", type: "text",
      start: cs, end: dur, layer: 5,
      text: brief.closingLine ?? "Built for the web.",
      x: closingX, y: 900, maxWidth: 1600,
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
      count: scaleParticles(Math.round(s.particleDensity * 0.85), brief.particleIntensity), seed: 404,
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
