import type {
  TimelineEvent,
  VideoProject,
  EasingName,
  AnimatedValue,
  IconName,
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

// ── Seeded randomness ────────────────────────────────────────────────────────

/** Deterministic hash of a string → integer. Same string always → same value. */
function seededHash(str: string): number {
  let h = 2166136261; // FNV-1a seed
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

/** Pick one element from an array using a seed (deterministic). */
function seededChoice<T>(arr: T[], seed: number): T {
  return arr[(seed >>> 0) % arr.length];
}

/** Mulberry32 PRNG — pure function returning next float 0–1 given state. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0xffffffff;
  };
}

// ── Icon assignment ──────────────────────────────────────────────────────────

const ICON_KEYWORDS: [string[], IconName][] = [
  [["browser", "chrome", "firefox", "client", "ui", "frontend", "web", "app"], "browser"],
  [["server", "nginx", "apache", "backend", "host"], "server"],
  [["database", "db", "sql", "mongo", "postgres", "mysql", "sqlite", "redis"], "database"],
  [["cloud", "aws", "azure", "gcp", "s3", "bucket", "cdn"], "cloud"],
  [["auth", "jwt", "oauth", "session", "cookie", "tls", "ssl", "https", "lock", "secure"], "lock"],
  [["dns", "internet", "network", "global", "world", "geo"], "globe"],
  [["api", "rest", "graphql", "grpc", "endpoint", "route"], "api"],
  [["mobile", "ios", "android", "phone", "app"], "mobile"],
  [["router", "gateway", "proxy", "nginx", "load balancer", "lb"], "router"],
  [["firewall", "waf", "shield", "protection", "ddos"], "shield"],
  [["cpu", "compute", "process", "thread", "core"], "cpu"],
  [["cache", "redis", "memcache", "ttl"], "cache"],
  [["config", "setting", "env", "gear", "deploy", "ci", "cd"], "gear"],
  [["code", "src", "source", "function", "lambda", "script"], "code"],
  [["serialize", "json", "dto", "model", "orm", "application", "logic"], "app"],
];

/** Pick the best icon for a row label. Falls back to seeded random. */
function pickIconForLabel(label: string, seed: number): IconName {
  const lower = label.toLowerCase();
  for (const [keywords, icon] of ICON_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return icon;
  }
  // Seeded fallback so different labels get different icons consistently
  const allIcons: IconName[] = [
    "browser", "server", "database", "cloud", "lock", "globe",
    "gear", "code", "api", "mobile", "router", "shield", "cpu", "cache", "app",
  ];
  return seededChoice(allIcons, seededHash(label) ^ seed);
}

// ── Layout variants ──────────────────────────────────────────────────────────

type TwoColVariant = "standard" | "diagonal" | "asymmetric";

const TWO_COL_VARIANTS: TwoColVariant[] = ["standard", "diagonal", "asymmetric"];

function pickVariant(title: string): TwoColVariant {
  return seededChoice(TWO_COL_VARIANTS, seededHash(title));
}

function transitionValue(
  from: number,
  to: number,
  start: number,
  end: number,
  easing: EasingName,
  transitionDuration = 0.5,
): AnimatedValue {
  const transEnd = Math.min(start + transitionDuration, end);
  if (transEnd <= start) {
    return { from: to, to, easing };
  }
  return {
    keyframes: [
      { time: start,    value: from, easing },
      { time: transEnd, value: to,   easing },
    ],
  };
}

// ── Entry animation resolver ─────────────────────────────────────────────────

type EntryTransform = {
  translateX?: AnimatedValue;
  translateY?: AnimatedValue;
  scale?: AnimatedValue;
};

function resolveEntryAnimation(
  anim: VideoBrief["entryAnimation"],
  ease: EasingName,
  start: number,
  end: number,
  transitionDuration = 0.5,
): EntryTransform {
  switch (anim) {
    case "slide-down":
      return { translateY: transitionValue(-40, 0, start, end, ease, transitionDuration) };
    case "slide-left":
      return { translateX: transitionValue(60, 0, start, end, ease, transitionDuration) };
    case "slide-right":
      return { translateX: transitionValue(-60, 0, start, end, ease, transitionDuration) };
    case "fade-only":
      return {};
    case "scale-up":
      return { scale: transitionValue(0.5, 1, start, end, ease, transitionDuration) };
    case "bounce-in":
      return { scale: transitionValue(0.5, 1, start, end, "bounce", transitionDuration) };
    case "slide-up":
    default:
      return { translateY: transitionValue(40, 0, start, end, ease, transitionDuration) };
  }
}

// ── Act timing resolver ───────────────────────────────────────────────────────
//
// Normalizes AI-provided actWeights [w1,w2,w3,w4,w5] into an ActTiming that
// fits the total duration.  Each act gets at least MIN_ACT_S seconds.

const MIN_ACT_S = 0.5;

function resolveActTimings(
  base: ActTiming,
  duration: number,
  weights: number[] | undefined,
): ActTiming {
  if (!weights || weights.length !== 5) return base;

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const minTotal = MIN_ACT_S * 5;
  if (totalWeight <= 0 || duration <= minTotal) return base;

  // Allocate durations, each at least MIN_ACT_S
  const rawDurs = weights.map((w) => (w / totalWeight) * duration);
  const clamped = rawDurs.map((d) => Math.max(d, MIN_ACT_S));

  // Re-scale so they sum to duration
  const clampedTotal = clamped.reduce((a, b) => a + b, 0);
  const scale = duration / clampedTotal;
  const durs = clamped.map((d) => d * scale);

  // Build act boundaries
  const starts: number[] = [];
  let cursor = 0;
  for (let i = 0; i < 5; i++) {
    starts.push(parseFloat(cursor.toFixed(3)));
    cursor += durs[i];
  }

  // Preserve stagger / stepStagger proportions from the base catalog
  const baseDur2 = base.act2.end - base.act2.start;
  const baseDur4 = base.act4.end - base.act4.start;
  const stagger     = baseDur2 > 0 ? (base.act2.stagger     / baseDur2) * durs[1] : base.act2.stagger;
  const stepStagger = baseDur4 > 0 ? (base.act4.stepStagger / baseDur4) * durs[3] : base.act4.stepStagger;

  // closingStart proportional within act5
  const act5Dur    = durs[4];
  const act5Start  = starts[4];
  const baseAct5Dur = base.act5.end - base.act5.start;
  const closingRatio = baseAct5Dur > 0
    ? (base.act5.closingStart - base.act5.start) / baseAct5Dur
    : 0.5;
  const closingStart = parseFloat((act5Start + closingRatio * act5Dur).toFixed(3));

  return {
    act1: { start: starts[0], end: parseFloat((starts[0] + durs[0]).toFixed(3)) },
    act2: { start: starts[1], end: parseFloat((starts[1] + durs[1]).toFixed(3)), stagger },
    act3: { start: starts[2], end: parseFloat((starts[2] + durs[2]).toFixed(3)) },
    act4: { start: starts[3], end: parseFloat((starts[3] + durs[3]).toFixed(3)), stepStagger },
    act5: { start: starts[4], end: duration, closingStart },
  };
}

// ── Color override resolver ───────────────────────────────────────────────────

function resolveColors(
  base: PaletteSpec,
  overrides: VideoBrief["colorOverrides"],
): PaletteSpec {
  if (!overrides) return base;
  return {
    ...base,
    ...(overrides.accent1 && {
      accent1: overrides.accent1,
      accent1Glow: overrides.accent1,
      glow: overrides.accent1,
    }),
    ...(overrides.accent2 && {
      accent2: overrides.accent2,
      accent2Glow: overrides.accent2,
    }),
    ...(overrides.surface && { surface: overrides.surface }),
  };
}

// ── Title size resolver ───────────────────────────────────────────────────────

function resolveTitleFontSize(size: VideoBrief["titleSize"]): number {
  switch (size) {
    case "small":  return 56;
    case "medium": return 72;
    case "hero":   return 108;
    case "large":
    default:       return 88;
  }
}

// ── Particle intensity scaler ─────────────────────────────────────────────────

function scaleParticles(base: number, intensity: number | undefined): number {
  if (intensity === undefined) return base;
  return Math.round(base * intensity);
}

/** Spatial constants for each variant. */
interface ColumnGeometry {
  CL: number;   // left column x
  SW_L: number; // left column width
  SL: number;   // right column x
  SW_R: number; // right column width
  GAP_L: number;
  GAP_R: number;
  GAP_CX: number;
  rightOffsetY: number; // vertical offset for right column (diagonal variant)
}

function getColumnGeometry(variant: TwoColVariant): ColumnGeometry {
  switch (variant) {
    case "diagonal":
      return {
        CL: 100, SW_L: 500, SL: 1320, SW_R: 500,
        GAP_L: 600, GAP_R: 1320, GAP_CX: 960,
        rightOffsetY: 60,
      };
    case "asymmetric":
      // Client side narrower (380), server side wider (620)
      return {
        CL: 60, SW_L: 380, SL: 1280, SW_R: 580,
        GAP_L: 440, GAP_R: 1280, GAP_CX: 860,
        rightOffsetY: 0,
      };
    default: // standard
      return {
        CL: 100, SW_L: 500, SL: 1320, SW_R: 500,
        GAP_L: 600, GAP_R: 1320, GAP_CX: 960,
        rightOffsetY: 0,
      };
  }
}

// ── Row geometry ─────────────────────────────────────────────────────────────

const PAD       = 44;
const HEADER_Y  = 240;
const ROW_START_Y = 270;
const ROW_GAP   = 20;
const AVAIL_H   = 450;

function rowH(count: number): number {
  return Math.max(80, Math.min(140, AVAIL_H / count));
}

function rowTop(i: number, rh: number, offsetY = 0): number {
  return ROW_START_Y + i * (rh + ROW_GAP) + offsetY;
}

function labelY(ry: number, rh: number, fontSize: number): number {
  return ry + (rh - fontSize) / 2;
}

function labelFontSize(rh: number): number {
  if (rh >= 120) return 32;
  if (rh >= 95)  return 26;
  return 22;
}

function estimateTextLines(text: string, fontSize: number, maxWidth: number): number {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";
  
  // Approximate character width as 0.70 of fontSize.
  const charWidth = fontSize * 0.70;

  for (const word of words) {
    if (!word) continue;
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const estimatedWidth = candidate.length * charWidth;

    if (estimatedWidth <= maxWidth || !currentLine) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return Math.max(1, lines.length);
}

// ── Animation helpers ─────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function ce(t: number, dur: number): number {
  return Math.min(t, dur - 0.05);
}

function gb(style: StyleSpec): number {
  return Math.round(25 * style.glowIntensity);
}

function withAlpha(color: string, alpha: number): string {
  const m = color.match(/^rgb\(\s*([^/)]+?)\s*(?:\/[^)]+)?\)/);
  if (m) return `rgb(${m[1].trim()} / ${alpha})`;
  return color;
}

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

function processingScale(a4s: number, a4e: number): AnimatedValue {
  const d = a4e - a4s;
  return {
    keyframes: [
      { time: a4s,            value: 0.97, easing: "easeOut"   as EasingName },
      { time: a4s + d * 0.27, value: 1.03, easing: "easeInOut" as EasingName },
      { time: a4s + d * 0.57, value: 0.99, easing: "easeInOut" as EasingName },
      { time: a4s + d * 0.83, value: 1.02, easing: "easeInOut" as EasingName },
      { time: a4e,            value: 1.0,  easing: "easeOut"   as EasingName },
    ],
  };
}

// ── Pipeline injection helpers ────────────────────────────────────────────────

/** Corner bracket L-shapes in top-left and bottom-right of a rect. */
function injectCornerBrackets(
  ev: TimelineEvent[],
  id: string,
  x: number, y: number, w: number, h: number,
  color: string, lineWidth: number,
  start: number, end: number, ease: EasingName,
) {
  const arm = 24;
  // Top-left: horizontal then vertical
  ev.push({
    id: `${id}-tl-h`, type: "shape", shapeType: "line",
    start, end, layer: 3,
    x1: x, y1: y, x2: x + arm, y2: y,
    stroke: color, lineWidth,
    opacity: { from: 0, to: 1, easing: ease },
  });
  ev.push({
    id: `${id}-tl-v`, type: "shape", shapeType: "line",
    start, end, layer: 3,
    x1: x, y1: y, x2: x, y2: y + arm,
    stroke: color, lineWidth,
    opacity: { from: 0, to: 1, easing: ease },
  });
  // Bottom-right
  ev.push({
    id: `${id}-br-h`, type: "shape", shapeType: "line",
    start, end, layer: 3,
    x1: x + w - arm, y1: y + h, x2: x + w, y2: y + h,
    stroke: color, lineWidth,
    opacity: { from: 0, to: 1, easing: ease },
  });
  ev.push({
    id: `${id}-br-v`, type: "shape", shapeType: "line",
    start, end, layer: 3,
    x1: x + w, y1: y + h - arm, x2: x + w, y2: y + h,
    stroke: color, lineWidth,
    opacity: { from: 0, to: 1, easing: ease },
  });
}

/** Scanning line that sweeps top → bottom over a column during Act 2. */
function injectScanLine(
  ev: TimelineEvent[],
  id: string,
  x: number, colW: number,
  topY: number, bottomY: number,
  color: string, lineWidth: number,
  start: number, end: number, ease: EasingName,
) {
  ev.push({
    id, type: "shape", shapeType: "line",
    start: ce(start, end + 0.3), end: ce(end, end + 0.3), layer: 4,
    x1: x, y1: topY, x2: x + colW, y2: topY,
    stroke: color, lineWidth,
    opacity: { from: 0.6, to: 0, easing: ease },
    translateY: { from: 0, to: bottomY - topY, easing: ease },
  });
}

/** 3 expanding pulse rings around a point, staggered. */
function injectPulseRings(
  ev: TimelineEvent[],
  id: string,
  cx: number, cy: number,
  color: string, glowBlur: number,
  start: number, dur: number,
) {
  for (let i = 0; i < 3; i++) {
    const rs = ce(start + i * (dur / 4), start + dur);
    const re = ce(rs + dur * 0.5, start + dur);
    if (rs >= re) continue;
    ev.push({
      id: `${id}-ring-${i}`, type: "shape", shapeType: "circle",
      start: rs, end: re, layer: 3,
      x: cx, y: cy, radius: 22 + i * 14,
      fill: "transparent",
      stroke: color, strokeWidth: 1.5,
      shadow: glowBlur > 0 ? { color, blur: glowBlur } : undefined,
      opacity: { from: 0.7, to: 0, easing: "easeOut" },
      scale: { from: 0.8, to: 2.4, easing: "easeOut" },
    });
  }
}

/** Floating protocol/annotation labels in the gap area. */
function injectFloatingLabels(
  ev: TimelineEvent[],
  annotations: string[],
  gapCX: number,
  reqY: number,
  rowH_: number,
  color: string,
  start: number, end: number, ease: EasingName,
) {
  annotations.slice(0, 3).forEach((text, i) => {
    const yOffset = -80 + i * (rowH_ * 0.6);
    const labelStart = ce(start + i * 0.4, end);
    const labelEnd   = ce(end - 0.3, end);
    if (labelStart >= labelEnd) return;
    ev.push({
      id: `gap-annotation-${i}`, type: "shape", shapeType: "badge",
      start: labelStart, end: labelEnd, layer: 4,
      cx: gapCX, cy: reqY + yOffset,
      text, fontSize: 18,
      fill: withAlpha(color, 0.12),
      textColor: color,
      stroke: color, strokeWidth: 0.8,
      opacity: { from: 0, to: 0.85, easing: ease },
      translateY: { from: -10, to: 0, easing: ease },
    });
  });
}

/** Progress bars inside processing step rows. */
function injectStepProgressBar(
  ev: TimelineEvent[],
  id: string,
  x: number, ry: number, w: number, rh: number,
  fillColor: string, trackColor: string,
  start: number, end: number, ease: EasingName,
) {
  ev.push({
    id, type: "shape", shapeType: "progress",
    start, end, layer: 3,
    x: x + 12, y: ry + rh - 10,
    width: w - 24, height: 5,
    radius: 3,
    trackColor, fillColor,
    opacity: { from: 0, to: 1, easing: ease },
  });
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

  // Per-act easing: brief can override each act independently
  const easeDefault = s.easing;
  const easings = {
    title:   brief.actEasings?.title   ?? easeDefault,
    stacks:  brief.actEasings?.stacks  ?? easeDefault,
    flow:    brief.actEasings?.flow    ?? easeDefault,
    closing: brief.actEasings?.closing ?? easeDefault,
  };
  const ease = easeDefault; // shorthand for structural elements
  const end  = dur - 0.1;

  const leftRows  = brief.leftRows  ?? ["Layer 1", "Layer 2"];
  const rightRows = brief.rightRows ?? ["Layer 1", "Layer 2"];
  const flow = brief.flow ?? false;
  const flowStyle = brief.flowStyle ?? "arc";
  const annotations = brief.annotations ?? [];
  const deco = brief.decorations ?? {};

  // Emphasis indices — which row gets bold border + accent color + glow
  const emphL = brief.emphasizeLeft  ?? 0;
  const emphR = brief.emphasizeRight ?? 0;

  const lCount = leftRows.length;
  const rCount = rightRows.length;
  const lRH = rowH(lCount);
  const rRH = rowH(rCount);
  const lFS = labelFontSize(lRH);
  const rFS = labelFontSize(rRH);

  // Seeded randomness from title
  const titleSeed = seededHash(brief.title);
  const rng = mulberry32(titleSeed);

  // Layout variant — AI-first, fallback to seeded hash
  const variant = (brief.variant ?? pickVariant(brief.title)) as "standard" | "diagonal" | "asymmetric";
  const geo = getColumnGeometry(variant);
  const {
    CL, SW_L, SL, SW_R,
    GAP_L, GAP_R, GAP_CX, rightOffsetY,
  } = geo;

  // Y of the packet arc midpoint (centre of top row on each side)
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

  // Icon size for row labels (scaled to rowH)
  const iconSz = Math.min(lRH * 0.55, 48);

  // ── ACT 1: Title card ────────────────────────────────────────────────────

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

  // Deco baseline (AI-toggleable)
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

  // ── ACT 2: Stacks appear ─────────────────────────────────────────────────

  // Left column header + underline
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

  // Right column header + underline
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

  // Corner brackets on the left stack (added at end of stack animation)
  const bracketStart = ce(act2.start + 0.6, dur);
  injectCornerBrackets(
    ev, "left-bracket",
    CL, ROW_START_Y, SW_L, lBottom - ROW_START_Y,
    withAlpha(p.accent1, 0.5), s.strokeWeight,
    bracketStart, end, ease,
  );
  injectCornerBrackets(
    ev, "right-bracket",
    SL, ROW_START_Y + rightOffsetY, SW_R, rBottom - ROW_START_Y - rightOffsetY,
    withAlpha(p.accent2, 0.5), s.strokeWeight,
    bracketStart, end, ease,
  );

  // Scan lines sweeping down each column
  injectScanLine(
    ev, "scan-left",
    CL, SW_L,
    ROW_START_Y, lBottom,
    withAlpha(p.accent1, 0.4), 1.5,
    act2.start + 0.2, act2.end,
    ease,
  );
  injectScanLine(
    ev, "scan-right",
    SL, SW_R,
    ROW_START_Y + rightOffsetY, rBottom,
    withAlpha(p.accent2, 0.4), 1.5,
    act2.start + 0.4, act2.end,
    ease,
  );

  // Left rows
  leftRows.forEach((label, i) => {
    const delay = i * act2.stagger;
    const ry = rowTop(i, lRH);
    const ly = labelY(ry, lRH, lFS);
    const rStart = ce(act2.start + 0.2 + delay, dur);
    const lStart = ce(act2.start + 0.4 + delay, dur);
    const isEmph = emphL >= 0 && i === emphL;

    const entryL = resolveEntryAnimation(brief.entryAnimation, easings.stacks, rStart, end, 0.5);

    // Row rect
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

    // Icon — AI-explicit or keyword-matched
    const iconName = brief.leftIcons?.[i] ?? pickIconForLabel(label, titleSeed + i);
    const iconX = CL + PAD + iconSz / 2;
    const iconCY = ry + lRH / 2;
    ev.push({
      id: `left-icon-${i}`, type: "shape", shapeType: "icon",
      start: lStart, end, layer: 4,
      iconName,
      cx: iconX, cy: iconCY, size: iconSz,
      color: isEmph ? p.accent1 : withAlpha(p.muted, 0.7),
      shadow: glow > 0 && isEmph ? { color: p.accent1Glow, blur: Math.round(glow * 0.6) } : undefined,
      opacity: transitionValue(0, 1, lStart, end, easings.stacks, 0.5),
      scale: transitionValue(0.5, 1, lStart, end, "bounce", 0.5),
    });

    // Label
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

    // Connector between rows
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
    const delay = j * act2.stagger;
    const ry = rowTop(j, rRH, rightOffsetY);
    const ly = labelY(ry, rRH, rFS);
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

    // Icon — AI-explicit or keyword-matched
    const iconName = brief.rightIcons?.[j] ?? pickIconForLabel(label, titleSeed + 100 + j);
    const iconSzR = Math.min(rRH * 0.55, 48);
    const iconX = SL + PAD + iconSzR / 2;
    const iconCY = ry + rRH / 2;
    ev.push({
      id: `right-icon-${j}`, type: "shape", shapeType: "icon",
      start: lStart, end, layer: 4,
      iconName,
      cx: iconX, cy: iconCY, size: iconSzR,
      color: isEmph ? p.accent2 : withAlpha(p.muted, 0.7),
      shadow: glow > 0 && isEmph ? { color: p.accent2Glow, blur: Math.round(glow * 0.6) } : undefined,
      opacity: transitionValue(0, 1, lStart, end, easings.stacks, 0.5),
      scale: transitionValue(0.5, 1, lStart, end, "bounce", 0.5),
    });

    // Label
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

  // Gap centre divider (AI-toggleable)
  const gapDivStart = ce(
    act2.start + act2.stagger * Math.max(lCount, rCount) + 0.5,
    dur,
  );
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

  // Floating annotation badges in gap
  if (annotations.length > 0) {
    injectFloatingLabels(
      ev, annotations, GAP_CX,
      reqY, rRH,
      p.accent1,
      gapDivStart, end, ease,
    );
  }

  // ── ACT 3 + 4: Flow ───────────────────────────────────────────────────────

  if (flow) {
    // Request label
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

    // Request packet path — respects flowStyle
    const pktStart = ce(act3.start + (act3.end - act3.start) * 0.25, dur);
    const pktEnd   = ce(act4.start, dur);

    let reqPath: { points: { x: number; y: number }[]; easing: EasingName };
    if (flowStyle === "straight") {
      reqPath = {
        points: [{ x: GAP_L, y: reqY_L }, { x: GAP_R, y: reqY_R }],
        easing: "easeInOut",
      };
    } else if (flowStyle === "zigzag") {
      const midX = GAP_CX;
      const zigY = reqY + 60;
      reqPath = {
        points: [
          { x: GAP_L,  y: reqY_L },
          { x: midX - 80, y: zigY },
          { x: midX + 80, y: reqY - 40 },
          { x: GAP_R,  y: reqY_R },
        ],
        easing: "linear",
      };
    } else {
      // arc (default)
      reqPath = {
        points: [
          { x: GAP_L,  y: reqY_L },
          { x: GAP_CX, y: Math.min(reqY_L, reqY_R) - 40 },
          { x: GAP_R,  y: reqY_R },
        ],
        easing: "easeInOut",
      };
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

    // Pulse rings at departure (AI-toggleable)
    if (deco.pulseRings !== false) {
      injectPulseRings(ev, "req", GAP_L, reqY_L, p.accent1Glow, Math.round(glow * 0.7), pktStart, pktEnd - pktStart);
    }

    // Data trail particles along the packet path
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

    // Request body text
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

    // Processing glow rect
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

    // Processing steps
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

      const sRY = rowTop(k, rRH, rightOffsetY);
      const sLY = labelY(sRY, rRH, 20);
      const iconSzR = Math.min(rRH * 0.55, 48);
      const arrowX = SL + SW_R - 220;
      const textX  = SL + SW_R - 188;

      // Row highlight pulse
      ev.push({
        id: `step-highlight-${k}`, type: "shape", shapeType: "rect",
        start: Math.max(act4.start, stStart - 0.1), end: ce(stStart + 0.8, dur),
        layer: 2,
        x: SL, y: sRY, width: SW_R, height: rRH,
        radius: s.radius,
        fill: withAlpha(p.accent2, 0.18),
        opacity: {
          keyframes: [
            { time: stStart - 0.1, value: 0, easing: "easeOut" },
            { time: stStart + 0.3, value: 1, easing: "easeInOut" },
            { time: stStart + 0.8, value: 0, easing: "easeIn" },
          ],
        },
      });

      // Progress bar in the row
      injectStepProgressBar(
        ev, `step-progress-${k}`,
        SL, sRY, SW_R, rRH,
        p.accent2, withAlpha(p.accent2, 0.15),
        stStart, stEnd, ease,
      );

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

    // DB burst
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

    // Response label badge
    const resLabelStart = ce(act5.start - 0.3, dur);
    const resLabelEnd   = ce(act5.start + (act5.end - act5.start) * 0.3, dur);
    if (resLabelStart < resLabelEnd) {
      ev.push({
        id: "res-label-badge", type: "shape", shapeType: "badge",
        start: resLabelStart, end: resLabelEnd, layer: 5,
        cx: GAP_CX, cy: rowTop(rCount - 1, rRH, rightOffsetY) + rRH / 2 - 20,
        text: brief.responseLabel ?? "200 OK",
        fontSize: 28, paddingX: 22, paddingY: 10,
        fill: withAlpha(p.accent2, 0.15),
        textColor: p.accent2,
        stroke: p.accent2, strokeWidth: 1.5,
        shadow: glow > 0 ? { color: p.accent2Glow, blur: Math.round(glow * 0.8) } : undefined,
        opacity: { from: 0, to: 1, easing: ease },
        translateY: { from: 15, to: 0, easing: ease },
      });
    }

    // Response packet path (mirror of request)
    const resPktStart = ce(act5.start - 0.1, dur);
    const resPktEnd   = ce(
      act5.start + Math.min(1.5, (act5.end - act5.start) * 0.3),
      dur,
    );
    if (resPktStart < resPktEnd) {
      let resPath: { points: { x: number; y: number }[]; easing: EasingName };
      if (flowStyle === "straight") {
        resPath = {
          points: [{ x: GAP_R, y: reqY_R }, { x: GAP_L, y: reqY_L }],
          easing: "easeInOut",
        };
      } else if (flowStyle === "zigzag") {
        const midX = GAP_CX;
        const zigY = reqY + 60;
        resPath = {
          points: [
            { x: GAP_R,  y: reqY_R },
            { x: midX + 80, y: zigY },
            { x: midX - 80, y: reqY - 40 },
            { x: GAP_L,  y: reqY_L },
          ],
          easing: "linear",
        };
      } else {
        resPath = {
          points: [
            { x: GAP_R,  y: reqY_R },
            { x: GAP_CX, y: Math.min(reqY_L, reqY_R) - 40 },
            { x: GAP_L,  y: reqY_L },
          ],
          easing: "easeInOut",
        };
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

      // Pulse rings on response arrival (AI-toggleable)
      if (deco.pulseRings !== false) {
        injectPulseRings(ev, "res", GAP_L, reqY_L, p.accent2Glow, Math.round(glow * 0.7), resPktEnd, 0.8);
      }
    }

    // Roundtrip overlay
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

// ── Single-Column layout ──────────────────────────────────────────────────────

function resolveShapeEntry(
  entry: string | undefined,
  easing: EasingName,
  start: number,
  end: number,
  transitionDuration = 0.5,
) {
  if (entry === "slide-up") {
    return {
      opacity: transitionValue(0, 1, start, end, easing, transitionDuration),
      translateY: transitionValue(40, 0, start, end, easing, transitionDuration),
    };
  }
  if (entry === "slide-down") {
    return {
      opacity: transitionValue(0, 1, start, end, easing, transitionDuration),
      translateY: transitionValue(-40, 0, start, end, easing, transitionDuration),
    };
  }
  if (entry === "scale-up") {
    return {
      opacity: transitionValue(0, 1, start, end, easing, transitionDuration),
      scale: transitionValue(0.5, 1, start, end, easing, transitionDuration),
    };
  }
  if (entry === "grow-y" || entry === "grow-x") {
    return {
      opacity: transitionValue(0, 1, start, end, easing, transitionDuration),
      scale: transitionValue(0, 1, start, end, easing, transitionDuration),
    };
  }
  return {
    opacity: transitionValue(0, 1, start, end, easing, transitionDuration),
  };
}

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
  const easeDefault = s.easing;
  const easings = {
    title:   brief.actEasings?.title   ?? easeDefault,
    stacks:  brief.actEasings?.stacks  ?? easeDefault,
    closing: brief.actEasings?.closing ?? easeDefault,
  };
  const ease = easeDefault;
  const cs   = act5.closingStart;
  const blockStyle = brief.blockStyle ?? "stacked";
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

  // Dynamically adjust block text styling and layouts to prevent vertical overlaps
  let headFS = 44;
  let descFS = 28;
  let descLH = 42;
  let descYOffset = 60;
  let blockStartY = 430;
  let blockMaxHeight = 440; // Avoid overrunning outro at 900 (430 + 440 = 870)

  if (n > 3) {
    headFS = 30;
    descFS = 20;
    descLH = 28;
    descYOffset = 42;
    blockStartY = 390; // Start slightly higher to gain space
    blockMaxHeight = 460; // 390 + 460 = 850 (comfortably fits before 900)
  }

  const maxSpacing  = 200;
  const spacing     = n <= 1 ? maxSpacing : Math.min(maxSpacing, blockMaxHeight / (n - 1));

  const titleSeed  = seededHash(brief.title);
  const titleFS    = resolveTitleFontSize(brief.titleSize);
  const titleLH    = Math.round(titleFS * 1.15);
  const titleX     = hasVisuals ? startX : (brief.titleAlign === "center" ? W / 2 - 720 : 160);
  const titleMaxW  = hasVisuals ? 750 : 1600;
  const subtitleMaxW = hasVisuals ? 750 : 1200;

  // ── ACT 1: Title ──────────────────────────────────────────────────────────────────

  const titleEnd = ce(act2.start + Math.min(0.5, (act2.end - act2.start) * 0.2), dur);
  ev.push({
    id: "title", type: "text",
    start: act1.start,
    end: titleEnd,
    layer: 5,
    text: brief.title,
    x: titleX, y: 270, maxWidth: titleMaxW,
    color: p.text, fontSize: titleFS, fontWeight: 800, lineHeight: titleLH,
    shadow: glow > 0 ? { color: p.glow, blur: glow * 2 } : undefined,
    opacity: transitionValue(0, 1, act1.start, titleEnd, easings.title, 0.5),
    translateY: transitionValue(30, 0, act1.start, titleEnd, easings.title, 0.5),
  });

  if (brief.subtitle) {
    const titleLines = estimateTextLines(brief.title, titleFS, titleMaxW);
    const subtitleY = 270 + titleLines * titleLH + 24;
    const subStart = ce(act1.start + lerp(0, act1.end - act1.start, 0.4), dur);
    ev.push({
      id: "subtitle", type: "text",
      start: subStart,
      end: act2.start, layer: 5,
      text: brief.subtitle,
      x: titleX, y: subtitleY, maxWidth: subtitleMaxW,
      color: p.muted, fontSize: 32, fontWeight: 400,
      opacity: transitionValue(0, 1, subStart, act2.start, easings.title, 0.5),
    });
  }

  // ── ACT 2+: Content blocks ────────────────────────────────────────────────────────

  blocks.forEach((block, i) => {
    const blkStart = ce(act2.start + i * (act2.stagger + 0.3), dur);
    const blkEnd   = ce(cs - 0.3, dur);
    if (blkStart >= blkEnd) return;

    const entryBlk = resolveEntryAnimation(brief.entryAnimation, easings.stacks, blkStart, blkEnd, 0.5);
    const entryDesc = resolveEntryAnimation(brief.entryAnimation, easings.stacks, ce(blkStart + 0.2, dur), blkEnd, 0.5);

    const by = blockStartY + i * spacing;

    const timelineDotX = startX - 70;
    const cardX = startX - 60;
    const cardW = hasVisuals ? blockMaxWidth + 80 : W - 200;
    const numX = startX - 60;
    const iconLeft = blockStyle === "numbered" ? startX + 25 : blockStyle === "timeline" ? startX - 30 : startX - 40;

    // Timeline dot (blockStyle = "timeline")
    if (blockStyle === "timeline") {
      ev.push({
        id: `timeline-dot-${i}`, type: "shape", shapeType: "circle",
        start: blkStart, end: blkEnd, layer: 3,
        x: timelineDotX, y: by + 22, radius: 8,
        fill: p.accent1,
        shadow: glow > 0 ? { color: p.accent1Glow, blur: Math.round(glow * 0.5) } : undefined,
        opacity: transitionValue(0, 1, blkStart, blkEnd, ease, 0.5),
        scale: transitionValue(0, 1, blkStart, blkEnd, "bounce", 0.5),
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

    // Card background (blockStyle = "cards")
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

    // Number prefix (blockStyle = "numbered")
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

    // Icon — AI-explicit or keyword-matched
    const iconName = brief.blockIcons?.[i] ?? block.icon ?? pickIconForLabel(block.heading, titleSeed + i * 7);
    ev.push({
      id: `block-icon-${i}`, type: "shape", shapeType: "icon",
      start: blkStart, end: blkEnd, layer: 4,
      iconName,
      cx: iconLeft, cy: by + 22, size: 44,
      color: p.accent1,
      shadow: glow > 0 ? { color: p.glow, blur: Math.round(glow * 0.4) } : undefined,
      opacity: transitionValue(0, 1, blkStart, blkEnd, ease, 0.5),
      scale: transitionValue(0.4, 1, blkStart, blkEnd, "bounce", 0.5),
    });

    const textLeft = iconLeft + 48;
    const headingMaxW = blockMaxWidth - (textLeft - startX);
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

  // ── ACT 2+: Visual elements (diagram on the right half) ───────────────────────────

  if (hasVisuals) {
    const boxX = 1060;
    const boxY = 320;

    visualElements.forEach((element, idx) => {
      const blockIndex = element.blockIndex ?? 0;
      const blkStart = ce(act2.start + Math.min(n - 1, Math.max(0, blockIndex)) * (act2.stagger + 0.3), dur);
      const blkEnd   = ce(cs - 0.3, dur);
      if (blkStart >= blkEnd) return;

      const elementEase = easings.stacks;
      const entryAnims = resolveShapeEntry(element.entry, elementEase, blkStart, blkEnd);

      let baseColor = p.accent1;
      if (element.color === "accent2") baseColor = p.accent2;
      else if (element.color === "muted") baseColor = p.muted;
      else if (element.color === "text") baseColor = p.text;
      else if (element.color === "surface") baseColor = p.surface;

      const shapeX = boxX + (element.x ?? 0);
      const shapeY = boxY + (element.y ?? 0);

      if (element.type === "rect") {
        const fill = (element.fillType === "outline" || element.fillType === "dashed")
          ? withAlpha(baseColor, 0)
          : baseColor;
        const stroke = (element.fillType === "outline" || element.fillType === "dashed")
          ? baseColor
          : undefined;
        const strokeWidth = stroke ? s.strokeWeight * 0.8 : undefined;

        ev.push({
          id: `vis-shape-${idx}`, type: "shape", shapeType: "rect",
          start: blkStart, end: blkEnd, layer: 2,
          x: shapeX, y: shapeY,
          width: element.width ?? 100, height: element.height ?? 100,
          radius: element.radius ?? s.radius ?? 0,
          fill,
          stroke,
          strokeWidth,
          shadow: glow > 0 ? { color: p.glow, blur: Math.round(glow * 0.4) } : undefined,
          ...entryAnims,
        });
      } else if (element.type === "circle") {
        const fill = (element.fillType === "outline" || element.fillType === "dashed")
          ? withAlpha(baseColor, 0)
          : baseColor;
        const stroke = (element.fillType === "outline" || element.fillType === "dashed")
          ? baseColor
          : undefined;
        const strokeWidth = stroke ? s.strokeWeight * 0.8 : undefined;

        ev.push({
          id: `vis-shape-${idx}`, type: "shape", shapeType: "circle",
          start: blkStart, end: blkEnd, layer: 2,
          x: shapeX, y: shapeY,
          radius: element.radius ?? 50,
          fill,
          stroke,
          strokeWidth,
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
          opacity: transitionValue(0, 1, blkStart, blkEnd, elementEase, 0.5),
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
        } else if (element.type === "line") {
          const lineX1 = boxX + (element.x1 ?? 0);
          const lineY1 = boxY + (element.y1 ?? 0);
          const lineX2 = boxX + (element.x2 ?? 0);
          const lineY2 = boxY + (element.y2 ?? 0);
          labelCX = (lineX1 + lineX2) / 2;
          labelCY = (lineY1 + lineY2) / 2;
        }

        const isFilled = element.type !== "line" && (element.fillType ?? "solid") === "solid";
        const labelColor = isFilled
          ? (element.color === "surface" || element.color === "muted" ? p.text : p.surface)
          : p.text;

        const subStart = ce(blkStart + 0.1, dur);
        ev.push({
          id: `vis-label-${idx}`, type: "text",
          start: subStart, end: blkEnd, layer: 4,
          text: element.label,
          x: labelCX, y: labelCY, maxWidth: element.width ?? 200,
          color: labelColor, fontSize: 22, fontWeight: 700, align: "center",
          opacity: transitionValue(0, 1, subStart, blkEnd, elementEase, 0.5),
          ...(element.entry === "slide-up" && { translateY: transitionValue(20, 0, subStart, blkEnd, elementEase, 0.5) }),
          ...(element.entry === "slide-down" && { translateY: transitionValue(-20, 0, subStart, blkEnd, elementEase, 0.5) }),
        });
      }
    });
  }

  // ── ACT 5: Outro ─────────────────────────────────────────────────────────────────

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

// ── Brief hydration ───────────────────────────────────────────────────────────
//
// When the AI omits mandatory creative fields, fill them in deterministically
// using the title hash so the same title always maps to the same defaults, but
// different titles get different looks.

const ENTRY_ANIMATIONS: NonNullable<VideoBrief["entryAnimation"]>[] = [
  "slide-up", "slide-down", "slide-left", "slide-right",
  "fade-only", "scale-up", "bounce-in",
];
const VARIANTS: NonNullable<VideoBrief["variant"]>[] = [
  "standard", "diagonal", "asymmetric",
];
const TITLE_SIZES: NonNullable<VideoBrief["titleSize"]>[] = [
  "large", "large", "hero", "medium", "large", "hero", "large",
];
const CLOSING_STYLES: NonNullable<VideoBrief["closingStyle"]>[] = [
  "fade-up", "fade-up", "fade-center", "fade-up", "fade-up", "fade-center", "fade-up",
];

export function hydrateBrief(brief: VideoBrief): VideoBrief {
  const h = seededHash(brief.title);
  const rng = mulberry32(h);

  // For each mandatory field: use AI value if present, otherwise pick deterministically
  return {
    ...brief,
    entryAnimation: brief.entryAnimation
      ?? ENTRY_ANIMATIONS[Math.floor(rng() * ENTRY_ANIMATIONS.length)],
    variant: brief.variant
      ?? VARIANTS[Math.floor(rng() * VARIANTS.length)],
    // emphasize: pick semantically (first row for left, last for right as default variety)
    emphasizeLeft: brief.emphasizeLeft !== undefined
      ? brief.emphasizeLeft
      : (Math.floor(rng() * 3) === 0 ? 1 : 0), // occasionally pick row 1
    emphasizeRight: brief.emphasizeRight !== undefined
      ? brief.emphasizeRight
      : (Math.floor(rng() * 3) === 0 ? 1 : 0),
    titleSize: brief.titleSize
      ?? TITLE_SIZES[h % TITLE_SIZES.length],
    particleIntensity: brief.particleIntensity !== undefined
      ? brief.particleIntensity
      : (1 + (h % 3) * 0.5), // 1.0, 1.5, or 2.0
    closingStyle: brief.closingStyle
      ?? CLOSING_STYLES[h % CLOSING_STYLES.length],
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Expand a `VideoBrief` into a complete, renderable `VideoProject`.
 *
 * Design principle: the Brief Expander computes *where* (pixel coordinates)
 * and *when* (absolute timestamps). All creative decisions — variant, icons,
 * emphasis, entry animations, decorations, particle intensity, timing weights,
 * closing style, per-act easings, color overrides — come from the AI via the
 * VideoBrief schema. The expander never makes creative decisions autonomously.
 */
export function buildProjectFromBrief(
  rawBrief: VideoBrief,
  duration: SupportedDuration,
): VideoProject {
  // Hydrate any mandatory creative fields the AI may have omitted
  const brief = hydrateBrief(rawBrief);

  const baseTiming = TIMINGS[duration];
  const timing     = resolveActTimings(baseTiming, duration, brief.actWeights);
  const basePalette = PALETTES[brief.palette] ?? PALETTES[DEFAULT_PALETTE];
  const palette    = resolveColors(basePalette, brief.colorOverrides);
  const style      = STYLES[brief.style] ?? STYLES[DEFAULT_STYLE];


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

  const ambientCount = scaleParticles(style.particleDensity, brief.particleIntensity);
  const ambient: TimelineEvent[] = ambientCount > 0
    ? [{
        id: "ambient-particles", type: "particle",
        start: 0.2, end: duration, layer: 1,
        count: ambientCount, seed: 42,
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
