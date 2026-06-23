// ── Brief Helpers ─────────────────────────────────────────────────────────────
//
// Shared utilities for the Brief Expander.  Every value here is a pure function
// or a constant — no layout-specific logic lives here.
//
// Used by:
//   twoColumnLayout.ts
//   singleColumnLayout.ts
//   buildProjectFromBrief.ts

import type {
  TimelineEvent,
  EasingName,
  AnimatedValue,
  IconName,
} from "@/lib/renderer";
import type { VideoBrief } from "@/lib/schemas/brief";
import type { PaletteSpec } from "@/lib/catalog/palettes";
import type { StyleSpec } from "@/lib/catalog/styles";
import type { ActTiming } from "@/lib/catalog/timings";

// ── Canvas constants ──────────────────────────────────────────────────────────

export const W = 1920;
export const H = 1080;

// ── Seeded randomness ─────────────────────────────────────────────────────────

/** Deterministic FNV-1a hash of a string → integer. */
export function seededHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

/** Pick one element from an array using a seed (deterministic). */
export function seededChoice<T>(arr: T[], seed: number): T {
  return arr[(seed >>> 0) % arr.length];
}

/** Mulberry32 PRNG — returns a stateful () => float 0–1. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0xffffffff;
  };
}

// ── Icon assignment ───────────────────────────────────────────────────────────

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

const ALL_ICONS: IconName[] = [
  "browser", "server", "database", "cloud", "lock", "globe",
  "gear", "code", "api", "mobile", "router", "shield", "cpu", "cache", "app",
];

/** Pick the best icon for a row label. Falls back to seeded random. */
export function pickIconForLabel(label: string, seed: number): IconName {
  const lower = label.toLowerCase();
  for (const [keywords, icon] of ICON_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return icon;
  }
  return seededChoice(ALL_ICONS, seededHash(label) ^ seed);
}

// ── Layout variants ───────────────────────────────────────────────────────────

export type TwoColVariant = "standard" | "diagonal" | "asymmetric";
const TWO_COL_VARIANTS: TwoColVariant[] = ["standard", "diagonal", "asymmetric"];

export function pickVariant(title: string): TwoColVariant {
  return seededChoice(TWO_COL_VARIANTS, seededHash(title));
}

// ── AnimatedValue helpers ─────────────────────────────────────────────────────

export function transitionValue(
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

export function closingOpacity(closingStart: number, duration: number): AnimatedValue {
  if (duration - closingStart < 2.0) {
    return { from: 0, to: 1, easing: "easeOut" as EasingName };
  }
  return {
    keyframes: [
      { time: closingStart,       value: 0, easing: "easeOut"   as EasingName },
      { time: closingStart + 0.8, value: 1, easing: "easeOut"   as EasingName },
      { time: duration - 0.8,     value: 1, easing: "easeInOut" as EasingName },
      { time: duration,           value: 0, easing: "easeIn"    as EasingName },
    ],
  };
}

export function processingScale(a4s: number, a4e: number): AnimatedValue {
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

// ── Entry animation resolver ──────────────────────────────────────────────────

export type EntryTransform = {
  translateX?: AnimatedValue;
  translateY?: AnimatedValue;
  scale?: AnimatedValue;
};

export function resolveEntryAnimation(
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

const MIN_ACT_S = 0.5;

export function resolveActTimings(
  base: ActTiming,
  duration: number,
  weights: number[] | undefined,
): ActTiming {
  if (!weights || weights.length !== 5) return base;

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const minTotal = MIN_ACT_S * 5;
  if (totalWeight <= 0 || duration <= minTotal) return base;

  const rawDurs = weights.map((w) => (w / totalWeight) * duration);
  const clamped = rawDurs.map((d) => Math.max(d, MIN_ACT_S));

  const clampedTotal = clamped.reduce((a, b) => a + b, 0);
  const scale = duration / clampedTotal;
  const durs = clamped.map((d) => d * scale);

  const starts: number[] = [];
  let cursor = 0;
  for (let i = 0; i < 5; i++) {
    starts.push(parseFloat(cursor.toFixed(3)));
    cursor += durs[i];
  }

  const baseDur2 = base.act2.end - base.act2.start;
  const baseDur4 = base.act4.end - base.act4.start;
  const stagger     = baseDur2 > 0 ? (base.act2.stagger     / baseDur2) * durs[1] : base.act2.stagger;
  const stepStagger = baseDur4 > 0 ? (base.act4.stepStagger / baseDur4) * durs[3] : base.act4.stepStagger;

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

export function resolveColors(
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

export function resolveTitleFontSize(size: VideoBrief["titleSize"]): number {
  switch (size) {
    case "small":  return 56;
    case "medium": return 72;
    case "hero":   return 108;
    case "large":
    default:       return 88;
  }
}

// ── Particle intensity scaler ─────────────────────────────────────────────────

export function scaleParticles(base: number, intensity: number | undefined): number {
  if (intensity === undefined) return base;
  return Math.round(base * intensity);
}

// ── Two-column geometry ───────────────────────────────────────────────────────

export interface ColumnGeometry {
  CL: number;        // left column x
  SW_L: number;      // left column width
  SL: number;        // right column x
  SW_R: number;      // right column width
  GAP_L: number;
  GAP_R: number;
  GAP_CX: number;
  rightOffsetY: number; // vertical shift for the diagonal variant
}

export function getColumnGeometry(variant: TwoColVariant): ColumnGeometry {
  switch (variant) {
    case "diagonal":
      return { CL: 100, SW_L: 500, SL: 1320, SW_R: 500, GAP_L: 600, GAP_R: 1320, GAP_CX: 960, rightOffsetY: 60 };
    case "asymmetric":
      return { CL: 60,  SW_L: 380, SL: 1280, SW_R: 580, GAP_L: 440, GAP_R: 1280, GAP_CX: 860, rightOffsetY: 0  };
    default: // standard
      return { CL: 100, SW_L: 500, SL: 1320, SW_R: 500, GAP_L: 600, GAP_R: 1320, GAP_CX: 960, rightOffsetY: 0  };
  }
}

// ── Row geometry ──────────────────────────────────────────────────────────────

export const PAD        = 44;
export const HEADER_Y   = 240;
export const ROW_START_Y = 270;
export const ROW_GAP    = 20;
export const AVAIL_H    = 450;

export function rowH(count: number): number {
  return Math.max(80, Math.min(140, AVAIL_H / count));
}

export function rowTop(i: number, rh: number, offsetY = 0): number {
  return ROW_START_Y + i * (rh + ROW_GAP) + offsetY;
}

export function labelY(ry: number, rh: number, fontSize: number): number {
  return ry + (rh - fontSize) / 2;
}

export function labelFontSize(rh: number): number {
  if (rh >= 120) return 32;
  if (rh >= 95)  return 26;
  return 22;
}

export function estimateTextLines(text: string, fontSize: number, maxWidth: number): number {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";
  const charWidth = fontSize * 0.70;

  for (const word of words) {
    if (!word) continue;
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length * charWidth <= maxWidth || !currentLine) {
      currentLine = candidate;
      continue;
    }
    lines.push(currentLine);
    currentLine = word;
  }
  if (currentLine) lines.push(currentLine);
  return Math.max(1, lines.length);
}

// ── Animation shorthands ──────────────────────────────────────────────────────

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp-end: prevent an event start/end from reaching exactly `dur`. */
export function ce(t: number, dur: number): number {
  return Math.min(t, dur - 0.05);
}

/** Glow blur radius from a style spec. */
export function gb(style: StyleSpec): number {
  return Math.round(25 * style.glowIntensity);
}

/** Apply alpha to an rgb() colour string. */
export function withAlpha(color: string, alpha: number): string {
  const m = color.match(/^rgb\(\s*([^/)]+?)\s*(?:\/[^)]+)?\)/);
  if (m) return `rgb(${m[1].trim()} / ${alpha})`;
  return color;
}

// ── Pipeline injection helpers ────────────────────────────────────────────────

/** Corner bracket L-shapes in top-left and bottom-right of a rect. */
export function injectCornerBrackets(
  ev: TimelineEvent[],
  id: string,
  x: number, y: number, w: number, h: number,
  color: string, lineWidth: number,
  start: number, end: number, ease: EasingName,
) {
  const arm = 24;
  ev.push({ id: `${id}-tl-h`, type: "shape", shapeType: "line", start, end, layer: 3, x1: x, y1: y, x2: x + arm, y2: y, stroke: color, lineWidth, opacity: { from: 0, to: 1, easing: ease } });
  ev.push({ id: `${id}-tl-v`, type: "shape", shapeType: "line", start, end, layer: 3, x1: x, y1: y, x2: x, y2: y + arm, stroke: color, lineWidth, opacity: { from: 0, to: 1, easing: ease } });
  ev.push({ id: `${id}-br-h`, type: "shape", shapeType: "line", start, end, layer: 3, x1: x + w - arm, y1: y + h, x2: x + w, y2: y + h, stroke: color, lineWidth, opacity: { from: 0, to: 1, easing: ease } });
  ev.push({ id: `${id}-br-v`, type: "shape", shapeType: "line", start, end, layer: 3, x1: x + w, y1: y + h - arm, x2: x + w, y2: y + h, stroke: color, lineWidth, opacity: { from: 0, to: 1, easing: ease } });
}

/** Scanning line that sweeps top → bottom over a column during Act 2. */
export function injectScanLine(
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
export function injectPulseRings(
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
export function injectFloatingLabels(
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
export function injectStepProgressBar(
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
