import type {
  AnimatedValue,
  EasingName,
  IconName,
  TimelineEvent,
  VideoProject,
} from "@/lib/ui/renderer";
import type {
  BlockStyle,
  EntryAnimation,
  Scene,
  SupportedDuration,
  TransitionPreset,
  VideoBrief,
} from "@/lib/agent/schemas/brief";
import { PALETTES, DEFAULT_PALETTE, type PaletteSpec } from "@/lib/others/catalog/palettes";
import { STYLES, DEFAULT_STYLE, type StyleSpec } from "@/lib/others/catalog/styles";
import {
  layoutScene,
  type SceneLayoutDiagnostics,
  type SceneLayoutEdge,
  type SceneLayoutNode,
  type SceneLayoutPlan,
} from "./sceneLayout";
import {
  W,
  H,
  ce,
  gb,
  withAlpha,
  mulberry32,
  seededHash,
  closingOpacity,
  resolveColors,
  scaleParticles,
  resolveIconForLabel,
  transitionValue,
  estimateTextLines,
  resolveTitleFontSize,
  resolveEntryAnimation,
} from "./briefHelpers";

export type SceneSlice = {
  start: number;
  end: number;
  duration: number;
};

export type BriefExpansionDiagnostics = {
  layout: SceneLayoutDiagnostics[];
};

export type BriefExpansionResult = {
  project: VideoProject;
  diagnostics: BriefExpansionDiagnostics;
};

const ENTRY_ANIMATIONS: EntryAnimation[] = [
  "slide-up",
  "slide-down",
  "slide-left",
  "slide-right",
  "fade-only",
  "scale-up",
  "bounce-in",
];

const BLOCK_STYLES: BlockStyle[] = ["cards", "stacked", "timeline", "numbered"];
const TRANSITIONS: TransitionPreset[] = ["fade", "slide-left", "slide-right", "zoom-in", "zoom-out"];
const TITLE_SIZES: NonNullable<VideoBrief["titleSize"]>[] = [
  "large",
  "large",
  "hero",
  "medium",
  "large",
];
const CLOSING_STYLES: NonNullable<VideoBrief["closingStyle"]>[] = [
  "fade-up",
  "fade-up",
  "fade-center",
  "fade-up",
];

export function splitDurationAcrossScenes(
  duration: number,
  sceneWeights: Array<number | undefined>,
): SceneSlice[] {
  const count = Math.max(1, sceneWeights.length);
  const minSlice = Math.min(0.5, duration / count);
  const weights = sceneWeights.map((weight) => (weight && weight > 0 ? weight : 1));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const raw = weights.map((weight) => (weight / total) * duration);
  const clamped = raw.map((slice) => Math.max(minSlice, slice));
  const scale = duration / clamped.reduce((sum, slice) => sum + slice, 0);
  const lengths = clamped.map((slice) => slice * scale);

  let cursor = 0;
  return lengths.map((slice, index) => {
    const start = parseFloat(cursor.toFixed(3));
    cursor += slice;
    const end = index === lengths.length - 1
      ? duration
      : parseFloat(cursor.toFixed(3));
    return {
      start,
      end,
      duration: parseFloat((end - start).toFixed(3)),
    };
  });
}

function bookendTiming(
  duration: number,
  sceneCount: number,
  hasClosing: boolean,
): {
  introDuration: number;
  closingDuration: number;
  contentStart: number;
  contentEnd: number;
} {
  const baseBookend = duration <= 5 ? 0.85 : duration <= 10 ? 1.05 : duration <= 15 ? 1.35 : 1.5;
  const gap = duration <= 5 ? 0.08 : 0.18;
  const closingDuration = hasClosing ? baseBookend : 0;
  const gapTotal = gap + (hasClosing ? gap : 0);
  const minContent = Math.min(duration * 0.7, Math.max(sceneCount * 1.15, 0.8));
  const reserved = baseBookend + closingDuration + gapTotal;
  const scale = duration - reserved < minContent
    ? Math.max(0.35, (duration - minContent) / Math.max(reserved, 0.001))
    : 1;
  const introDuration = parseFloat((baseBookend * scale).toFixed(3));
  const scaledClosing = parseFloat((closingDuration * scale).toFixed(3));
  const scaledGap = parseFloat((gap * scale).toFixed(3));
  const contentStart = parseFloat((introDuration + scaledGap).toFixed(3));
  const contentEnd = parseFloat((duration - scaledClosing - (hasClosing ? scaledGap : 0)).toFixed(3));
  const safeContentEnd = Math.min(duration, Math.max(contentStart + 0.5, contentEnd));

  return {
    introDuration,
    closingDuration: scaledClosing,
    contentStart,
    contentEnd: safeContentEnd,
  };
}

export function hydrateBrief(brief: VideoBrief): VideoBrief {
  const h = seededHash(brief.title);
  const rng = mulberry32(h);
  let previousEntry: EntryAnimation | undefined;

  const scenes = brief.scenes.map((scene, index) => {
    let entryAnimation = scene.entryAnimation
      ?? ENTRY_ANIMATIONS[Math.floor(rng() * ENTRY_ANIMATIONS.length)];
    if (entryAnimation === previousEntry) {
      const currentIndex = ENTRY_ANIMATIONS.indexOf(entryAnimation);
      entryAnimation = ENTRY_ANIMATIONS[(currentIndex + 1) % ENTRY_ANIMATIONS.length];
    }
    previousEntry = entryAnimation;

    return {
      ...scene,
      entryAnimation,
      blockStyle: scene.blockStyle ?? BLOCK_STYLES[(h + index) % BLOCK_STYLES.length],
      transition: scene.transition ?? TRANSITIONS[(h + index) % TRANSITIONS.length],
      emphasizeIndex: scene.emphasizeIndex ?? 0,
    };
  });

  return {
    ...brief,
    titleSize: brief.titleSize ?? TITLE_SIZES[h % TITLE_SIZES.length],
    particleIntensity: brief.particleIntensity ?? (1 + (h % 3) * 0.5),
    closingStyle: brief.closingStyle ?? CLOSING_STYLES[h % CLOSING_STYLES.length],
    scenes,
  };
}

function revealOpacity(
  start: number,
  end: number,
  easing: EasingName,
  revealDuration = 0.45,
  exitDuration = 0.35,
): AnimatedValue {
  const enterEnd = Math.min(start + revealDuration, end);
  const exitStart = Math.max(enterEnd, end - exitDuration);
  if (end - start <= revealDuration + 0.1) {
    return { from: 0, to: 1, easing };
  }
  return {
    keyframes: [
      { time: start, value: 0, easing },
      { time: enterEnd, value: 1, easing },
      { time: exitStart, value: 1, easing },
      { time: end, value: 0, easing: "easeIn" },
    ],
  };
}

function transitionTransform(
  preset: TransitionPreset,
  start: number,
  end: number,
  easing: EasingName,
): Pick<TimelineEvent, "translateX" | "translateY" | "scale"> {
  const enterEnd = Math.min(start + 0.4, end);
  const exitStart = Math.max(enterEnd, end - 0.4);

  if (preset === "slide-left") {
    return {
      translateX: {
        keyframes: [
          { time: start, value: 80, easing },
          { time: enterEnd, value: 0, easing },
          { time: exitStart, value: 0, easing },
          { time: end, value: -80, easing: "easeIn" },
        ],
      },
    };
  }

  if (preset === "slide-right") {
    return {
      translateX: {
        keyframes: [
          { time: start, value: -80, easing },
          { time: enterEnd, value: 0, easing },
          { time: exitStart, value: 0, easing },
          { time: end, value: 80, easing: "easeIn" },
        ],
      },
    };
  }

  if (preset === "zoom-in") {
    return {
      scale: {
        keyframes: [
          { time: start, value: 0.94, easing },
          { time: enterEnd, value: 1, easing },
          { time: exitStart, value: 1, easing },
          { time: end, value: 1.04, easing: "easeIn" },
        ],
      },
    };
  }

  if (preset === "zoom-out") {
    return {
      scale: {
        keyframes: [
          { time: start, value: 1.06, easing },
          { time: enterEnd, value: 1, easing },
          { time: exitStart, value: 1, easing },
          { time: end, value: 0.96, easing: "easeIn" },
        ],
      },
    };
  }

  return {};
}

function entryMotion(
  scene: Scene,
  start: number,
  end: number,
  easing: EasingName,
): Pick<TimelineEvent, "translateX" | "translateY" | "scale"> {
  const transition = transitionTransform(scene.transition, start, end, easing);
  if (Object.keys(transition).length > 0) return transition;
  return resolveEntryAnimation(scene.entryAnimation, easing, start, end, 0.45);
}

function baseMotion(
  scene: Scene,
  start: number,
  end: number,
  easing: EasingName,
): Pick<TimelineEvent, "opacity" | "translateX" | "translateY" | "scale"> {
  return {
    opacity: scene.transition === "none"
      ? transitionValue(0, 1, start, end, easing, 0.35)
      : revealOpacity(start, end, easing),
    ...entryMotion(scene, start, end, easing),
  };
}

function colorFromToken(value: string | undefined, palette: PaletteSpec, fallback: string): string {
  switch (value) {
    case "accent1":
      return palette.accent1;
    case "accent2":
      return palette.accent2;
    case "muted":
      return palette.muted;
    case "text":
      return palette.text;
    case "surface":
      return palette.surface;
    default:
      return value ?? fallback;
  }
}

function headingEvent(
  brief: VideoBrief,
  palette: PaletteSpec,
  style: StyleSpec,
  titleDuration: number,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const titleFS = resolveTitleFontSize(brief.titleSize);
  const titleLH = Math.round(titleFS * 1.12);
  const align = brief.titleAlign ?? "left";
  const maxWidth = align === "center" ? 1380 : 1260;
  const subtitleMaxWidth = align === "center" ? 1100 : 900;
  const subtitleFS = 30;
  const subtitleLH = 36;
  const titleLines = estimateTextLines(brief.title, titleFS, maxWidth);
  const subtitleLines = brief.subtitle ? estimateTextLines(brief.subtitle, subtitleFS, subtitleMaxWidth) : 0;
  const titleBlockHeight = titleLines * titleLH + (brief.subtitle ? 16 + subtitleLines * subtitleLH : 0);
  const x = align === "center" ? W / 2 : 140;
  const y = align === "center" ? Math.round(H / 2 - titleBlockHeight / 2) : 78;
  const titleEnd = Math.max(0.8, titleDuration);
  const glow = gb(style);

  events.push({
    id: "title",
    type: "text",
    start: 0,
    end: titleEnd,
    layer: 8,
    text: brief.title,
    x,
    y,
    maxWidth,
    color: palette.text,
    fontSize: titleFS,
    fontWeight: 800,
    lineHeight: titleLH,
    align: align === "center" ? "center" : undefined,
    shadow: glow > 0 ? { color: palette.glow, blur: glow * 2 } : undefined,
    opacity: revealOpacity(0, titleEnd, style.easing, 0.45, 0.45),
    translateY: {
      keyframes: [
        { time: 0, value: 28, easing: style.easing },
        { time: Math.min(0.45, titleEnd), value: 0, easing: style.easing },
        { time: Math.max(0.45, titleEnd - 0.45), value: 0, easing: style.easing },
        { time: titleEnd, value: -24, easing: "easeIn" },
      ],
    },
  });

  if (brief.subtitle) {
    events.push({
      id: "subtitle",
      type: "text",
      start: Math.min(0.2, titleEnd - 0.1),
      end: titleEnd,
      layer: 8,
      text: brief.subtitle,
      x,
      y: y + titleLines * titleLH + 16,
      maxWidth: subtitleMaxWidth,
      color: palette.muted,
      fontSize: subtitleFS,
      fontWeight: 500,
      lineHeight: subtitleLH,
      align: align === "center" ? "center" : undefined,
      opacity: revealOpacity(Math.min(0.2, titleEnd - 0.1), titleEnd, style.easing, 0.45, 0.45),
      translateY: {
        keyframes: [
          { time: Math.min(0.2, titleEnd - 0.1), value: 20, easing: style.easing },
          { time: Math.min(0.65, titleEnd), value: 0, easing: style.easing },
          { time: Math.max(0.65, titleEnd - 0.45), value: 0, easing: style.easing },
          { time: titleEnd, value: -20, easing: "easeIn" },
        ],
      },
    });
  }

  return events;
}

function pushIfValid(events: TimelineEvent[], event: TimelineEvent) {
  if (event.end > event.start) events.push(event);
}

function addBlockEvents(
  events: TimelineEvent[],
  scene: Scene,
  plan: SceneLayoutPlan,
  palette: PaletteSpec,
  style: StyleSpec,
  slice: SceneSlice,
  contentStart: number,
  indexSeed: number,
) {
  const ease = scene.actEasings?.content ?? style.easing;
  const glow = gb(style);
  const stagger = Math.min(0.28, slice.duration / Math.max(scene.blocks.length * 8, 12));
  const blockStyle = scene.blockStyle;

  if (blockStyle === "timeline") {
    plan.blocks.slice(0, -1).forEach((box, index) => {
      const next = plan.blocks[index + 1];
      if (!next) return;
      const start = ce(contentStart + index * stagger + 0.2, slice.end);
      pushIfValid(events, {
        id: `scene-${indexSeed}-block-line-${index}`,
        type: "shape",
        shapeType: "line",
        start,
        end: slice.end,
        layer: 2,
        x1: box.x + 34,
        y1: box.y + 44,
        x2: next.x + 34,
        y2: next.y + 34,
        stroke: withAlpha(palette.accent1, 0.4),
        lineWidth: Math.max(1.5, style.strokeWeight * 0.75),
        lineDash: style.lineDash ?? [6, 6],
        ...baseMotion(scene, start, slice.end, ease),
      });
    });
  }

  plan.blocks.forEach((box, index) => {
    const block = box.block;
    const start = ce(contentStart + index * stagger, slice.end);
    const textStart = ce(start + 0.08, slice.end);
    const isEmphasized = scene.emphasizeIndex === index;
    const accent = isEmphasized ? palette.accent2 : palette.accent1;

    if (blockStyle === "cards") {
      pushIfValid(events, {
        id: `scene-${indexSeed}-block-card-${index}`,
        type: "shape",
        shapeType: "rect",
        start,
        end: slice.end,
        layer: 2,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        radius: style.radius,
        fill: palette.surface,
        stroke: isEmphasized ? palette.text : withAlpha(palette.muted, 0.65),
        strokeWidth: isEmphasized ? style.strokeWeight * 1.4 : style.strokeWeight,
        shadow: glow > 0 && isEmphasized ? { color: palette.accent2Glow, blur: Math.round(glow * 0.5) } : undefined,
        ...baseMotion(scene, start, slice.end, ease),
      });
    }

    if (blockStyle === "timeline") {
      pushIfValid(events, {
        id: `scene-${indexSeed}-block-dot-${index}`,
        type: "shape",
        shapeType: "circle",
        start,
        end: slice.end,
        layer: 4,
        x: box.x + 34,
        y: box.y + 34,
        radius: isEmphasized ? 12 : 8,
        fill: accent,
        shadow: glow > 0 ? { color: accent, blur: Math.round(glow * 0.35) } : undefined,
        ...baseMotion(scene, start, slice.end, ease),
      });
    }

    if (blockStyle === "numbered") {
      pushIfValid(events, {
        id: `scene-${indexSeed}-block-num-${index}`,
        type: "text",
        start,
        end: slice.end,
        layer: 3,
        text: String(index + 1).padStart(2, "0"),
        x: box.x,
        y: box.y + 4,
        maxWidth: 94,
        color: withAlpha(accent, 0.45),
        fontSize: 62,
        fontWeight: 900,
        ...baseMotion(scene, start, slice.end, ease),
      });
    }

    const iconName = resolveIconForLabel(block.heading, block.icon, seededHash(block.heading) ^ indexSeed);
    pushIfValid(events, {
      id: `scene-${indexSeed}-block-icon-${index}`,
      type: "shape",
      shapeType: "icon",
      start,
      end: slice.end,
      layer: 5,
      iconName,
      cx: box.iconX,
      cy: box.iconY,
      size: isEmphasized ? 42 : 34,
      color: accent,
      shadow: glow > 0 ? { color: accent, blur: Math.round(glow * 0.35) } : undefined,
      ...baseMotion(scene, start, slice.end, ease),
    });

    pushIfValid(events, {
      id: `scene-${indexSeed}-block-heading-${index}`,
      type: "text",
      start: textStart,
      end: slice.end,
      layer: 5,
      text: box.headingFit.text,
      x: box.textX,
      y: box.headingY,
      maxWidth: box.maxWidth,
      color: palette.text,
      fontSize: box.headingFit.fontSize,
      fontWeight: isEmphasized ? 900 : 750,
      lineHeight: box.headingFit.lineHeight,
      shadow: glow > 0 && isEmphasized ? { color: palette.glow, blur: Math.round(glow * 0.3) } : undefined,
      ...baseMotion(scene, textStart, slice.end, ease),
    });

    if (box.descriptionFit.text) {
      pushIfValid(events, {
        id: `scene-${indexSeed}-block-desc-${index}`,
        type: "text",
        start: ce(textStart + 0.1, slice.end),
        end: slice.end,
        layer: 5,
        text: box.descriptionFit.text,
        x: box.textX,
        y: box.descY,
        maxWidth: box.maxWidth,
        color: palette.muted,
        fontSize: box.descriptionFit.fontSize,
        fontWeight: 450,
        lineHeight: box.descriptionFit.lineHeight,
        ...baseMotion(scene, ce(textStart + 0.1, slice.end), slice.end, ease),
      });
    }
  });
}

function addNodeEvents(
  events: TimelineEvent[],
  scene: Scene,
  node: SceneLayoutNode,
  palette: PaletteSpec,
  style: StyleSpec,
  slice: SceneSlice,
  start: number,
  sceneIndex: number,
  nodeIndex: number,
) {
  const ease = scene.actEasings?.content ?? style.easing;
  const glow = gb(style);
  const isEmphasized = scene.emphasizeIndex === nodeIndex;
  const accent = colorFromToken(node.color, palette, isEmphasized ? palette.accent2 : palette.accent1);
  const iconName: IconName = resolveIconForLabel(node.label, node.icon, seededHash(node.label) ^ sceneIndex);

  pushIfValid(events, {
    id: `scene-${sceneIndex}-node-${node.id}`,
    type: "shape",
    shapeType: "rect",
    start,
    end: slice.end,
    layer: 3,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    radius: style.radius,
    fill: palette.surface,
    stroke: accent,
    strokeWidth: isEmphasized ? style.strokeWeight * 1.5 : style.strokeWeight,
    shadow: glow > 0 && isEmphasized ? { color: accent, blur: Math.round(glow * 0.5) } : undefined,
    ...baseMotion(scene, start, slice.end, ease),
  });

  pushIfValid(events, {
    id: `scene-${sceneIndex}-node-icon-${node.id}`,
    type: "shape",
    shapeType: "icon",
    start: ce(start + 0.08, slice.end),
    end: slice.end,
    layer: 5,
    iconName,
    cx: node.x + 38,
    cy: node.cy,
    size: 38,
    color: accent,
    ...baseMotion(scene, ce(start + 0.08, slice.end), slice.end, ease),
  });

  pushIfValid(events, {
    id: `scene-${sceneIndex}-node-label-${node.id}`,
    type: "text",
    start: ce(start + 0.12, slice.end),
    end: slice.end,
    layer: 5,
    text: node.labelFit.text,
    x: node.labelX,
    y: node.labelY,
    maxWidth: node.labelMaxWidth,
    color: palette.text,
    fontSize: node.labelFit.fontSize,
    fontWeight: isEmphasized ? 900 : 750,
    lineHeight: node.labelFit.lineHeight,
    verticalAlign: "middle",
    ...baseMotion(scene, ce(start + 0.12, slice.end), slice.end, ease),
  });
}

function addEdgeEvents(
  events: TimelineEvent[],
  scene: Scene,
  edge: SceneLayoutEdge,
  palette: PaletteSpec,
  style: StyleSpec,
  slice: SceneSlice,
  start: number,
  holdStart: number,
  sceneIndex: number,
  edgeIndex: number,
) {
  const ease = scene.actEasings?.flow ?? style.easing;
  const glow = gb(style);
  const packetColor = colorFromToken(edge.packetColor, palette, palette.accent2Glow);

  pushIfValid(events, {
    id: `scene-${sceneIndex}-edge-${edgeIndex}`,
    type: "shape",
    shapeType: "line",
    start,
    end: slice.end,
    layer: 2,
    x1: edge.x1,
    y1: edge.y1,
    x2: edge.x2,
    y2: edge.y2,
    stroke: edge.animated ? palette.accent2 : withAlpha(palette.muted, 0.7),
    lineWidth: Math.max(2, style.strokeWeight),
    lineDash: edge.animated ? undefined : style.lineDash,
    arrowEnd: true,
    arrowSize: 10,
    drawProgress: transitionValue(0, 1, start, slice.end, ease, 0.55),
    ...baseMotion(scene, start, slice.end, ease),
  });

  if (edge.label) {
    const labelStart = ce(start + 0.2, slice.end);
    pushIfValid(events, {
      id: `scene-${sceneIndex}-edge-label-${edgeIndex}`,
      type: "text",
      start: labelStart,
      end: slice.end,
      layer: 5,
      text: edge.label,
      x: edge.labelX,
      y: edge.labelY,
      maxWidth: 260,
      color: palette.text,
      fontSize: 18,
      fontWeight: 750,
      align: "center",
      verticalAlign: "middle",
      backdrop: {
        fill: palette.surface,
        stroke: withAlpha(palette.text, 0.14),
        strokeWidth: 1,
        paddingX: 12,
        paddingY: 6,
        radius: 6,
      },
      ...baseMotion(scene, labelStart, slice.end, ease),
    });
  }

  if (edge.animated && slice.end - holdStart > 0.4) {
    const packetStart = ce(holdStart, slice.end);
    const packetEnd = ce(slice.end - 0.2, slice.end);
    pushIfValid(events, {
      id: `scene-${sceneIndex}-packet-${edgeIndex}`,
      type: "shape",
      shapeType: "circle",
      start: packetStart,
      end: packetEnd,
      layer: 4,
      x: edge.path[0].x,
      y: edge.path[0].y,
      radius: 16,
      fill: packetColor,
      shadow: glow > 0 ? { color: packetColor, blur: glow } : undefined,
      path: {
        points: edge.path,
        easing: "easeInOut",
      },
      opacity: revealOpacity(packetStart, packetEnd, ease, 0.2, 0.2),
      scale: { from: 0.75, to: 1.1, easing: "easeInOut" },
    });

    if (edge.packetLabel) {
      pushIfValid(events, {
        id: `scene-${sceneIndex}-packet-label-${edgeIndex}`,
        type: "shape",
        shapeType: "badge",
        start: packetStart,
        end: packetEnd,
        layer: 5,
        cx: edge.path[0].x,
        cy: edge.path[0].y - 34,
        text: edge.packetLabel,
        fontSize: 17,
        fill: withAlpha(packetColor, 0.18),
        textColor: palette.text,
        stroke: packetColor,
        strokeWidth: 1,
        path: {
          points: edge.path.map((point) => ({ x: point.x, y: point.y - 34 })),
          easing: "easeInOut",
        },
        opacity: revealOpacity(packetStart, packetEnd, ease, 0.2, 0.2),
      });
    }
  }
}

function addSceneEvents(
  events: TimelineEvent[],
  scene: Scene,
  slice: SceneSlice,
  basePalette: PaletteSpec,
  style: StyleSpec,
  sceneIndex: number,
  duration: number,
  diagnostics: SceneLayoutDiagnostics[],
) {
  const palette = resolveColors(basePalette, scene.colorOverrides);
  const glow = gb(style);
  const headingEnd = slice.start + Math.max(0.35, slice.duration * 0.18);
  const contentStart = slice.start + Math.max(0.22, slice.duration * 0.14);
  const holdStart = slice.start + slice.duration * 0.64;
  const headingStart = ce(slice.start + 0.08, duration);
  const headingEase = scene.actEasings?.heading ?? style.easing;
  const contentEase = scene.actEasings?.content ?? style.easing;
  const plan = layoutScene(scene, { width: W, height: H });
  diagnostics.push(plan.diagnostics);

  if (sceneIndex > 0 && scene.transition !== "none") {
    pushIfValid(events, {
      id: `scene-${sceneIndex}-transition-wash`,
      type: "shape",
      shapeType: "rect",
      start: Math.max(0, slice.start - 0.12),
      end: ce(slice.start + 0.36, duration),
      layer: 1,
      x: 0,
      y: 0,
      width: W,
      height: H,
      fill: withAlpha(palette.surface, 0.16),
      opacity: { from: 0, to: 0.45, easing: "easeInOut" },
    });
  }

  pushIfValid(events, {
    id: `scene-${sceneIndex}-heading`,
    type: "text",
    start: headingStart,
    end: slice.end,
    layer: 7,
    text: scene.heading,
    x: 140,
    y: 158,
    maxWidth: 1220,
    color: palette.text,
    fontSize: 42,
    fontWeight: 850,
    lineHeight: 50,
    shadow: glow > 0 ? { color: palette.glow, blur: Math.round(glow * 0.8) } : undefined,
    opacity: revealOpacity(headingStart, slice.end, headingEase, 0.4, 0.35),
    ...entryMotion(scene, headingStart, slice.end, headingEase),
  });

  if (slice.duration > 1.4) {
    pushIfValid(events, {
      id: `scene-${sceneIndex}-heading-line`,
      type: "shape",
      shapeType: "line",
      start: ce(headingEnd - 0.1, slice.end),
      end: slice.end,
      layer: 2,
      x1: 140,
      y1: 218,
      x2: W - 140,
      y2: 218,
      stroke: withAlpha(palette.accent1, 0.35),
      lineWidth: Math.max(1.5, style.strokeWeight),
      lineDash: style.lineDash,
      drawProgress: transitionValue(0, 1, ce(headingEnd - 0.1, slice.end), slice.end, contentEase, 0.5),
      opacity: revealOpacity(ce(headingEnd - 0.1, slice.end), slice.end, contentEase),
    });
  }

  addBlockEvents(events, scene, plan, palette, style, slice, contentStart, sceneIndex);

  const nodeStagger = Math.min(0.22, slice.duration / Math.max(plan.nodes.length * 10, 14));
  plan.nodes.forEach((node, index) => {
    addNodeEvents(
      events,
      scene,
      node,
      palette,
      style,
      slice,
      ce(contentStart + 0.15 + index * nodeStagger, slice.end),
      sceneIndex,
      index,
    );
  });

  const edgeStagger = Math.min(0.18, slice.duration / Math.max(plan.edges.length * 10, 12));
  plan.edges.forEach((edge, index) => {
    addEdgeEvents(
      events,
      scene,
      edge,
      palette,
      style,
      slice,
      ce(contentStart + 0.35 + index * edgeStagger, slice.end),
      holdStart,
      sceneIndex,
      index,
    );
  });
}

function addClosingEvents(
  events: TimelineEvent[],
  brief: VideoBrief,
  palette: PaletteSpec,
  style: StyleSpec,
  duration: number,
  closingDuration: number,
) {
  const closingStyle = brief.closingStyle ?? "fade-up";
  if (closingStyle === "none") return;

  const start = Math.max(0, duration - closingDuration);
  const centered = closingStyle === "fade-center" || brief.titleAlign === "center";
  const x = centered ? W / 2 : 160;
  const y = centered ? H / 2 : 900;
  const glow = gb(style);

  pushIfValid(events, {
    id: "closing-line",
    type: "text",
    start,
    end: duration,
    layer: 9,
    text: brief.closingLine ?? "Built for the web.",
    x,
    y,
    maxWidth: centered ? 1400 : 1500,
    color: palette.text,
    fontSize: 48,
    fontWeight: 800,
    align: centered ? "center" : undefined,
    shadow: glow > 0 ? { color: palette.glow, blur: Math.round(glow * 1.5) } : undefined,
    opacity: closingOpacity(start, duration),
    ...(closingStyle === "fade-up" && {
      translateY: { from: 22, to: 0, easing: style.easing },
    }),
  });

  const burstCount = scaleParticles(Math.round(style.particleDensity * 0.85), brief.particleIntensity);
  if (burstCount > 0) {
    pushIfValid(events, {
      id: "celebration-burst",
      type: "particle",
      start: ce(start + 0.2, duration),
      end: duration,
      layer: 3,
      count: burstCount,
      seed: 404,
      origin: { x: W / 2, y: centered ? H / 2 + 90 : 950 },
      spread: { x: 520, y: 90 },
      drift: { x: 3, y: -12 },
      particleRadius: { min: 2, max: 5 },
      color: palette.accent1Glow,
      particleOpacity: { min: 0.3, max: 0.7 },
      opacity: { from: 0, to: 1, easing: style.easing },
    });
  }
}

export function buildProjectFromBriefWithDiagnostics(
  rawBrief: VideoBrief,
  duration: SupportedDuration,
): BriefExpansionResult {
  const brief = hydrateBrief(rawBrief);
  const basePalette = PALETTES[brief.palette] ?? PALETTES[DEFAULT_PALETTE];
  const style = STYLES[brief.style] ?? STYLES[DEFAULT_STYLE];
  const events: TimelineEvent[] = [];
  const layoutDiagnostics: SceneLayoutDiagnostics[] = [];

  const background: TimelineEvent = {
    id: "bg",
    type: "background",
    start: 0,
    end: duration,
    layer: 0,
    background: {
      kind: "gradient",
      from: basePalette.bgFrom,
      to: basePalette.bgTo,
      angle: basePalette.bgAngle,
    },
  };
  events.push(background);

  const ambientCount = scaleParticles(style.particleDensity, brief.particleIntensity);
  if (ambientCount > 0) {
    events.push({
      id: "ambient-particles",
      type: "particle",
      start: Math.min(0.2, duration - 0.05),
      end: duration,
      layer: 1,
      count: ambientCount,
      seed: 42,
      origin: { x: W / 2, y: H / 2 },
      spread: { x: W / 2 - 80, y: H / 2 - 80 },
      drift: { x: 6, y: -2 },
      particleRadius: { min: 2, max: 6 },
      color: basePalette.glow,
      particleOpacity: { min: 0.2, max: 0.6 },
      opacity: { from: 0, to: 1, easing: style.easing },
    });
  }

  const hasClosing = (brief.closingStyle ?? "fade-up") !== "none";
  const timing = bookendTiming(duration, brief.scenes.length, hasClosing);
  const contentDuration = Math.max(0.5, timing.contentEnd - timing.contentStart);
  const slices = splitDurationAcrossScenes(
    contentDuration,
    brief.scenes.map((scene) => scene.sceneWeight),
  ).map((slice) => ({
    start: parseFloat((slice.start + timing.contentStart).toFixed(3)),
    end: parseFloat((slice.end + timing.contentStart).toFixed(3)),
    duration: slice.duration,
  }));
  const titleDuration = timing.introDuration;
  const closingDuration = timing.closingDuration;

  events.push(...headingEvent(brief, basePalette, style, titleDuration));

  brief.scenes.forEach((scene, index) => {
    const slice = slices[index];
    if (!slice) return;
    addSceneEvents(events, scene, slice, basePalette, style, index, duration, layoutDiagnostics);
  });

  if (brief.decorations?.decoBaseline !== false) {
    events.push({
      id: "global-baseline",
      type: "shape",
      shapeType: "line",
      start: Math.min(0.4, duration - 0.05),
      end: duration,
      layer: 1,
      x1: 110,
      y1: 964,
      x2: W - 110,
      y2: 964,
      stroke: withAlpha(basePalette.accent1Glow, 0.28),
      lineWidth: Math.max(1.5, style.strokeWeight),
      lineDash: style.lineDash ?? [14, 10],
      opacity: { from: 0, to: 0.7, easing: style.easing },
    });
  }

  addClosingEvents(events, brief, basePalette, style, duration, closingDuration);

  const project: VideoProject = {
    id: `brief-${Date.now()}`,
    name: brief.title,
    width: W,
    height: H,
    duration,
    events: events
      .filter((event) => event.end > event.start)
      .sort((a, b) => (a.start - b.start) || (a.layer - b.layer)),
  };

  return {
    project,
    diagnostics: {
      layout: layoutDiagnostics,
    },
  };
}

export function buildProjectFromBrief(
  rawBrief: VideoBrief,
  duration: SupportedDuration,
): VideoProject {
  return buildProjectFromBriefWithDiagnostics(rawBrief, duration).project;
}
