// ── Single-Column Layout ──────────────────────────────────────────────────────
//
// Builds the TimelineEvent[] for a single-column (content blocks + optional
// visual diagram) VideoBrief.  Consumes the resolved palette, style, and
// timing; emits every event for acts 1, 2, and 5.
//
// Interface: buildSingleColumn(brief, timing, palette, style, duration)

import type { TimelineEvent, AnimatedValue } from "@/lib/ui/renderer";
import type { VideoBrief } from "@/lib/agent/schemas/brief";
import type { PaletteSpec } from "@/lib/others/catalog/palettes";
import type { StyleSpec } from "@/lib/others/catalog/styles";
import type { ActTiming } from "@/lib/others/catalog/timings";
import {
  W,
  H,
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
  easing: import("@/lib/ui/renderer").EasingName,
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

// ── Geometric line clipping and alignment helper functions ───────────────────

function getRectIntersection(
  x1: number, y1: number,
  x2: number, y2: number,
  rx: number, ry: number,
  rw: number, rh: number
): { tMin: number; tMax: number } | null {
  const xMin = rx;
  const xMax = rx + rw;
  const yMin = ry;
  const yMax = ry + rh;

  let tMin = 0;
  let tMax = 1;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0) {
    if (x1 < xMin || x1 > xMax) return null;
  } else {
    const t1 = (xMin - x1) / dx;
    const t2 = (xMax - x1) / dx;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }

  if (dy === 0) {
    if (y1 < yMin || y1 > yMax) return null;
  } else {
    const t1 = (yMin - y1) / dy;
    const t2 = (yMax - y1) / dy;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }

  if (tMin < tMax) {
    return { tMin, tMax };
  }
  return null;
}

function getCircleIntersection(
  x1: number, y1: number,
  x2: number, y2: number,
  cx: number, cy: number,
  r: number
): { tMin: number; tMax: number } | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;

  if (a < 1e-6) {
    if (c <= 0) return { tMin: 0, tMax: 1 };
    return null;
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return null;
  }

  const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
  const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

  const tMin = Math.max(0, Math.min(t1, t2));
  const tMax = Math.min(1, Math.max(t1, t2));

  if (tMin < tMax) {
    return { tMin, tMax };
  }
  return null;
}

function subtractIntervals(
  intervals: [number, number][],
  toSubtract: { tMin: number; tMax: number }[]
): [number, number][] {
  let result = intervals;

  for (const sub of toSubtract) {
    const nextResult: [number, number][] = [];
    for (const [start, end] of result) {
      if (sub.tMax <= start || sub.tMin >= end) {
        nextResult.push([start, end]);
      } else {
        if (sub.tMin > start) {
          nextResult.push([start, sub.tMin]);
        }
        if (sub.tMax < end) {
          nextResult.push([sub.tMax, end]);
        }
      }
    }
    result = nextResult;
  }

  return result;
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
  let titleX = startX;
  let titleY = 270;
  let subtitleY = 270;
  let tMaxW = hasVisuals ? 750 : 1600;
  let sMaxW = hasVisuals ? 750 : 1200;

  if (isCentered) {
    titleX = W / 2;
    tMaxW = 1400;
    sMaxW = 1200;
    const titleLines = estimateTextLines(brief.title, titleFS, tMaxW);
    const titleHeight = titleLines * titleLH;
    const subtitleHeight = brief.subtitle ? 40 : 0;
    const spacing = brief.subtitle ? 24 : 0;
    const totalHeight = titleHeight + spacing + subtitleHeight;
    titleY = H / 2 - totalHeight / 2;
    subtitleY = titleY + titleHeight + spacing;
  } else {
    const titleLines = estimateTextLines(brief.title, titleFS, tMaxW);
    subtitleY = 270 + titleLines * titleLH + 24;
  }

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
    x: titleX, y: titleY, maxWidth: tMaxW,
    color: p.text, fontSize: titleFS, fontWeight: 800, lineHeight: titleLH,
    shadow: glow > 0 ? { color: p.glow, blur: glow * 2 } : undefined,
    opacity: titleOpacity,
    translateY: titleTranslateY,
    ...(isCentered && { align: "center" as CanvasTextAlign }),
  });

  if (brief.subtitle) {
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
      x: titleX, y: subtitleY, maxWidth: sMaxW,
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
    // For numbered style the big "01" watermark (fontSize 60, bold) overflows its
    // 60px slot by ~15-20px, so the icon must sit clear of startX — not at
    // startX+25 where it collides with the number.
    // For cards style the icon must be inset from the card's left edge (cardX),
    // otherwise its 44px body pokes out of the box while the heading has padding.
    const iconLeft     = blockStyle === "numbered"
      ? startX + 60
      : blockStyle === "timeline"
        ? startX - 30
        : blockStyle === "cards"
          ? cardX + 42   // 20px left padding (icon radius 22) to match the card's 20px top inset
          : startX - 40;

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

    // Clone visualElements to allow auto-connecting aligned shapes
    const elements = [...visualElements];

    // Auto-connect shapes in the same block that are horizontally/vertically aligned with a small gap
    const shapes = elements.filter(el => el.type === "rect" || el.type === "circle");
    for (let i = 0; i < shapes.length; i++) {
      for (let j = i + 1; j < shapes.length; j++) {
        const s1 = shapes[i];
        const s2 = shapes[j];
        if (s1.blockIndex !== s2.blockIndex) continue;

        const s1W = s1.type === "rect" ? (s1.width ?? 100) : (s1.radius ?? 50) * 2;
        const s1H = s1.type === "rect" ? (s1.height ?? 100) : (s1.radius ?? 50) * 2;
        const s2W = s2.type === "rect" ? (s2.width ?? 100) : (s2.radius ?? 50) * 2;
        const s2H = s2.type === "rect" ? (s2.height ?? 100) : (s2.radius ?? 50) * 2;

        const s1CX = s1.type === "rect" ? (s1.x ?? 0) + s1W / 2 : (s1.x ?? 0);
        const s1CY = s1.type === "rect" ? (s1.y ?? 0) + s1H / 2 : (s1.y ?? 0);
        const s2CX = s2.type === "rect" ? (s2.x ?? 0) + s2W / 2 : (s2.x ?? 0);
        const s2CY = s2.type === "rect" ? (s2.y ?? 0) + s2H / 2 : (s2.y ?? 0);

        const isHAligned = Math.abs(s1CX - s2CX) < 10;
        const isVAligned = Math.abs(s1CY - s2CY) < 10;

        if (isHAligned) {
          const topShape = s1CY < s2CY ? s1 : s2;
          const botShape = s1CY < s2CY ? s2 : s1;

          const topShapeBottom = topShape.type === "rect"
            ? (topShape.y ?? 0) + (topShape.height ?? 100)
            : (topShape.y ?? 0) + (topShape.radius ?? 50);
          const botShapeTop = botShape.type === "rect"
            ? (botShape.y ?? 0)
            : (botShape.y ?? 0) - (botShape.radius ?? 50);

          const gap = botShapeTop - topShapeBottom;
          if (gap > 0 && gap < 80) {
            const hasExistingLine = elements.some(el => {
              if (el.type !== "line") return false;
              const lx1 = el.x1 ?? 0;
              const ly1 = el.y1 ?? 0;
              const lx2 = el.x2 ?? 0;
              const ly2 = el.y2 ?? 0;
              const isLVert = Math.abs(lx1 - lx2) < 10;
              const isNearX = Math.abs((lx1 + lx2)/2 - s1CX) < 15;
              if (!isLVert || !isNearX) return false;
              const minLY = Math.min(ly1, ly2);
              const maxLY = Math.max(ly1, ly2);
              return minLY <= topShapeBottom + 5 && maxLY >= botShapeTop - 5;
            });

            if (!hasExistingLine) {
              elements.push({
                type: "line",
                blockIndex: s1.blockIndex,
                x1: s1CX,
                y1: topShapeBottom,
                x2: s1CX,
                y2: botShapeTop,
                color: s2.color ?? s1.color ?? "accent1",
                entry: "draw",
              });
            }
          }
        } else if (isVAligned) {
          const leftShape = s1CX < s2CX ? s1 : s2;
          const rightShape = s1CX < s2CX ? s2 : s1;

          const leftShapeRight = leftShape.type === "rect"
            ? (leftShape.x ?? 0) + (leftShape.width ?? 100)
            : (leftShape.x ?? 0) + (leftShape.radius ?? 50);
          const rightShapeLeft = rightShape.type === "rect"
            ? (rightShape.x ?? 0)
            : (rightShape.x ?? 0) - (rightShape.radius ?? 50);

          const gap = rightShapeLeft - leftShapeRight;
          if (gap > 0 && gap < 80) {
            const hasExistingLine = elements.some(el => {
              if (el.type !== "line") return false;
              const lx1 = el.x1 ?? 0;
              const ly1 = el.y1 ?? 0;
              const lx2 = el.x2 ?? 0;
              const ly2 = el.y2 ?? 0;
              const isLHoriz = Math.abs(ly1 - ly2) < 10;
              const isNearY = Math.abs((ly1 + ly2)/2 - s1CY) < 15;
              if (!isLHoriz || !isNearY) return false;
              const minLX = Math.min(lx1, lx2);
              const maxLX = Math.max(lx1, lx2);
              return minLX <= leftShapeRight + 5 && maxLX >= rightShapeLeft - 5;
            });

            if (!hasExistingLine) {
              elements.push({
                type: "line",
                blockIndex: s1.blockIndex,
                x1: leftShapeRight,
                y1: s1CY,
                x2: rightShapeLeft,
                y2: s1CY,
                color: s2.color ?? s1.color ?? "accent1",
                entry: "draw",
              });
            }
          }
        }
      }
    }

    // Build list of shapes to clip against in absolute coordinates
    const clipShapes = elements
      .filter((el) => el.type === "rect" || el.type === "circle")
      .map((el) => {
        const isSolid = el.fillType !== "outline" && el.fillType !== "dashed";
        const hasLabel = el.label !== undefined && el.label.trim() !== "";
        const shouldClip = isSolid || hasLabel;

        return {
          type: el.type,
          shouldClip,
          x: boxX + (el.x ?? 0),
          y: boxY + (el.y ?? 0),
          width: el.width ?? 100,
          height: el.height ?? 100,
          radius: el.radius ?? 50,
        };
      })
      .filter((s) => s.shouldClip);

    elements.forEach((element, idx) => {
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

        // Clip the line against shapes
        let activeIntervals: [number, number][] = [[0, 1]];
        const toSubtract: { tMin: number; tMax: number }[] = [];

        for (const clipShape of clipShapes) {
          let inter: { tMin: number; tMax: number } | null = null;
          if (clipShape.type === "rect") {
            inter = getRectIntersection(lineX1, lineY1, lineX2, lineY2, clipShape.x, clipShape.y, clipShape.width, clipShape.height);
          } else if (clipShape.type === "circle") {
            inter = getCircleIntersection(lineX1, lineY1, lineX2, lineY2, clipShape.x, clipShape.y, clipShape.radius);
          }
          if (inter) {
            toSubtract.push(inter);
          }
        }

        activeIntervals = subtractIntervals(activeIntervals, toSubtract);

        activeIntervals.forEach(([tStart, tEnd], segIdx) => {
          const segX1 = lineX1 + tStart * (lineX2 - lineX1);
          const segY1 = lineY1 + tStart * (lineY2 - lineY1);
          const segX2 = lineX1 + tEnd * (lineX2 - lineX1);
          const segY2 = lineY1 + tEnd * (lineY2 - lineY1);

          ev.push({
            id: activeIntervals.length === 1 ? `vis-shape-${idx}` : `vis-shape-${idx}-seg-${segIdx}`,
            type: "shape", shapeType: "line",
            start: blkStart, end: blkEnd, layer: 1.8,
            x1: segX1, y1: segY1, x2: segX2, y2: segY2,
            stroke: baseColor,
            lineWidth: element.width ?? s.strokeWeight ?? 3,
            lineDash: element.fillType === "dashed" ? [6, 6] : undefined,
            startPadding: element.startPadding,
            endPadding: element.endPadding,
            ...entryAnims,
          });
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
          : (element.type === "line" ||
             ((element.type === "circle" || element.type === "rect") &&
              (element.fillType === "outline" || element.fillType === "dashed")));
        const backdrop = hasBackdrop
          ? { fill: p.surface, stroke: withAlpha(p.text, 0.15), strokeWidth: 1, paddingX: 14, paddingY: 6, radius: 6 }
          : undefined;

        const isFilled    = element.type !== "line" && (element.fillType ?? "solid") === "solid";
        const labelColor  = hasBackdrop
          ? p.text
          : isFilled
            ? (element.color === "surface" ? p.text : p.surface)
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
    const isClosingCentered = closingStyle === "fade-center" || isCentered;
    const closingX = isClosingCentered ? W / 2 : 160;
    const closingY = isClosingCentered ? H / 2 : 900;
    ev.push({
      id: "closing-line", type: "text",
      start: cs, end: dur, layer: 5,
      text: brief.closingLine ?? "Built for the web.",
      x: closingX, y: closingY, maxWidth: 1600,
      color: p.text, fontSize: 48, fontWeight: 700,
      shadow: glow > 0 ? { color: p.glow, blur: Math.round(glow * 1.5) } : undefined,
      opacity: closingOpacity(cs, dur),
      ...(isClosingCentered && { align: "center" as CanvasTextAlign }),
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
