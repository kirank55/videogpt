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
  const ease = s.easing;
  const end  = dur - 0.1;

  const leftRows  = brief.leftRows  ?? ["Layer 1", "Layer 2"];
  const rightRows = brief.rightRows ?? ["Layer 1", "Layer 2"];
  const flow = brief.flow ?? false;
  const flowStyle = brief.flowStyle ?? "arc";
  const annotations = brief.annotations ?? [];

  const lCount = leftRows.length;
  const rCount = rightRows.length;
  const lRH = rowH(lCount);
  const rRH = rowH(rCount);
  const lFS = labelFontSize(lRH);
  const rFS = labelFontSize(rRH);

  // Seeded randomness from title
  const titleSeed = seededHash(brief.title);
  const rng = mulberry32(titleSeed);

  // Layout variant
  const variant = pickVariant(brief.title);
  const geo = getColumnGeometry(variant);
  const {
    CL, SW_L, SL, SW_R,
    GAP_L, GAP_R, GAP_CX, rightOffsetY,
  } = geo;

  // Y of the packet arc midpoint (centre of top row on each side)
  const reqY = rowTop(0, rRH, rightOffsetY) + rRH / 2;

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

  // Deco baseline
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
    x: CL, y: HEADER_Y - 10, maxWidth: SW_L,
    color: p.text, fontSize: 16, fontWeight: 900,
    opacity: { from: 0, to: 1, easing: ease },
  });
  ev.push({
    id: "left-header-line", type: "shape", shapeType: "line",
    start: act2.start + 0.1, end: end, layer: 1,
    x1: CL, y1: HEADER_Y + 14, x2: CL + SW_L, y2: HEADER_Y + 14,
    stroke: p.text, lineWidth: s.strokeWeight,
    opacity: { from: 0, to: 1, easing: ease },
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

    // Row rect
    ev.push({
      id: `left-rect-${i}`, type: "shape", shapeType: "rect",
      start: rStart, end, layer: 2,
      x: CL, y: ry, width: SW_L, height: lRH,
      radius: s.radius,
      fill: p.surface,
      stroke: i === 0 ? p.text : p.muted,
      strokeWidth: i === 0 ? s.strokeWeight * 1.5 : s.strokeWeight,
      opacity: { from: 0, to: 1, easing: ease },
      translateY: { from: 40, to: 0, easing: ease },
    });

    // Icon (left of text)
    const iconName = pickIconForLabel(label, titleSeed + i);
    const iconX = CL + PAD + iconSz / 2;
    const iconCY = ry + lRH / 2;
    ev.push({
      id: `left-icon-${i}`, type: "shape", shapeType: "icon",
      start: lStart, end, layer: 4,
      iconName,
      cx: iconX, cy: iconCY, size: iconSz,
      color: i === 0 ? p.accent1 : withAlpha(p.muted, 0.7),
      shadow: glow > 0 && i === 0 ? { color: p.accent1Glow, blur: Math.round(glow * 0.6) } : undefined,
      opacity: { from: 0, to: 1, easing: ease },
      scale: { from: 0.5, to: 1, easing: "bounce" },
    });

    // Label (offset right to make room for icon)
    const textX = CL + PAD + iconSz + 12;
    ev.push({
      id: `left-label-${i}`, type: "text",
      start: lStart, end, layer: 4,
      text: label,
      x: textX, y: ly, maxWidth: SW_L - (textX - CL) - PAD,
      color: i === 0 ? p.text : p.muted,
      fontSize: lFS, fontWeight: i === 0 ? 900 : 700,
      opacity: { from: 0, to: 1, easing: ease },
    });

    // Connector between rows
    if (i < lCount - 1) {
      ev.push({
        id: `left-conn-${i}`, type: "shape", shapeType: "line",
        start: ce(act2.start + 0.6 + delay, dur), end, layer: 1,
        x1: CL + SW_L / 2, y1: ry + lRH,
        x2: CL + SW_L / 2, y2: rowTop(i + 1, lRH),
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
    const ry = rowTop(j, rRH, rightOffsetY);
    const ly = labelY(ry, rRH, rFS);
    const rStart = ce(act2.start + 0.3 + delay, dur);
    const lStart = ce(act2.start + 0.5 + delay, dur);

    ev.push({
      id: `right-rect-${j}`, type: "shape", shapeType: "rect",
      start: rStart, end, layer: 2,
      x: SL, y: ry, width: SW_R, height: rRH,
      radius: s.radius,
      fill: p.surface,
      stroke: j === 0 ? p.text : p.muted,
      strokeWidth: j === 0 ? s.strokeWeight * 1.5 : s.strokeWeight,
      opacity: { from: 0, to: 1, easing: ease },
      translateY: { from: 40, to: 0, easing: ease },
    });

    // Icon
    const iconName = pickIconForLabel(label, titleSeed + 100 + j);
    const iconSzR = Math.min(rRH * 0.55, 48);
    const iconX = SL + PAD + iconSzR / 2;
    const iconCY = ry + rRH / 2;
    ev.push({
      id: `right-icon-${j}`, type: "shape", shapeType: "icon",
      start: lStart, end, layer: 4,
      iconName,
      cx: iconX, cy: iconCY, size: iconSzR,
      color: j === 0 ? p.accent2 : withAlpha(p.muted, 0.7),
      shadow: glow > 0 && j === 0 ? { color: p.accent2Glow, blur: Math.round(glow * 0.6) } : undefined,
      opacity: { from: 0, to: 1, easing: ease },
      scale: { from: 0.5, to: 1, easing: "bounce" },
    });

    // Label
    const textXR = SL + PAD + iconSzR + 12;
    ev.push({
      id: `right-label-${j}`, type: "text",
      start: lStart, end, layer: 4,
      text: label,
      x: textXR, y: ly, maxWidth: SW_R - (textXR - SL) - PAD,
      color: j === 0 ? p.text : p.muted,
      fontSize: rFS, fontWeight: j === 0 ? 900 : 700,
      opacity: { from: 0, to: 1, easing: ease },
    });

    if (j < rCount - 1) {
      ev.push({
        id: `right-conn-${j}`, type: "shape", shapeType: "line",
        start: ce(act2.start + 0.7 + delay, dur), end, layer: 1,
        x1: SL + SW_R / 2, y1: ry + rRH,
        x2: SL + SW_R / 2, y2: rowTop(j + 1, rRH, rightOffsetY),
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
    start: gapDivStart, end, layer: 1,
    x1: GAP_CX, y1: ROW_START_Y - 30,
    x2: GAP_CX, y2: stackBottom + 30,
    stroke: p.muted, lineWidth: s.strokeWeight * 0.5,
    lineDash: [8, 6],
    opacity: { from: 0, to: flow ? 0.3 : 0.5, easing: ease },
  });

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
        points: [{ x: GAP_L, y: reqY }, { x: GAP_R, y: reqY + rightOffsetY }],
        easing: "easeInOut",
      };
    } else if (flowStyle === "zigzag") {
      const midX = GAP_CX;
      const zigY = reqY + 60;
      reqPath = {
        points: [
          { x: GAP_L,  y: reqY },
          { x: midX - 80, y: zigY },
          { x: midX + 80, y: reqY - 40 },
          { x: GAP_R,  y: reqY + rightOffsetY },
        ],
        easing: "linear",
      };
    } else {
      // arc (default)
      reqPath = {
        points: [
          { x: GAP_L,  y: reqY },
          { x: GAP_CX, y: ROW_START_Y - 40 },
          { x: GAP_R,  y: reqY + rightOffsetY },
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

    // Pulse rings at departure
    injectPulseRings(ev, "req", GAP_L, reqY, p.accent1Glow, Math.round(glow * 0.7), pktStart, pktEnd - pktStart);

    // Data trail particles along the packet path
    if (pktEnd > pktStart) {
      ev.push({
        id: "req-trail", type: "particle",
        start: pktStart, end: ce(pktEnd - 0.1, dur), layer: 2,
        count: 18, seed: 555 + Math.round(rng() * 100),
        origin: { x: GAP_CX, y: reqY },
        spread: { x: 120, y: 30 }, drift: { x: 40, y: -10 },
        particleRadius: { min: 1.5, max: 3.5 },
        color: p.accent1Glow,
        particleOpacity: { min: 0.2, max: 0.65 },
        opacity: { from: 0, to: 1, easing: ease },
      });

      ev.push({
        id: "req-burst", type: "particle",
        start: pktStart, end: ce(pktEnd - 0.2, dur), layer: 3,
        count: 25, seed: 101,
        origin: { x: GAP_L, y: reqY },
        spread: { x: 40, y: 35 }, drift: { x: 50, y: -20 },
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
        SL, sRY, SW_R - iconSzR - PAD, rRH,
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
        count: 20, seed: 202,
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
          points: [{ x: GAP_R, y: reqY + rightOffsetY }, { x: GAP_L, y: reqY }],
          easing: "easeInOut",
        };
      } else if (flowStyle === "zigzag") {
        const midX = GAP_CX;
        const zigY = reqY + 60;
        resPath = {
          points: [
            { x: GAP_R,  y: reqY + rightOffsetY },
            { x: midX + 80, y: zigY },
            { x: midX - 80, y: reqY - 40 },
            { x: GAP_L,  y: reqY },
          ],
          easing: "linear",
        };
      } else {
        resPath = {
          points: [
            { x: GAP_R,  y: reqY + rightOffsetY },
            { x: GAP_CX, y: ROW_START_Y - 40 },
            { x: GAP_L,  y: reqY },
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

      // Pulse rings on response arrival
      injectPulseRings(ev, "res", GAP_L, reqY, p.accent2Glow, Math.round(glow * 0.7), resPktEnd, 0.8);
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

  // Suppress unused rng warning (used earlier for trail seed)
  void rng;

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

  const blockStartY = 430;
  const maxSpacing  = 200;
  const spacing     = n <= 1 ? maxSpacing : Math.min(maxSpacing, 500 / (n - 1));

  const titleSeed = seededHash(brief.title);

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

  // ── ACT 2+: Content blocks ────────────────────────────────────────────────

  blocks.forEach((block, i) => {
    const blkStart = ce(act2.start + i * (act2.stagger + 0.3), dur);
    const blkEnd   = ce(cs - 0.3, dur);
    if (blkStart >= blkEnd) return;

    const by = blockStartY + i * spacing;

    // Icon left of heading
    const iconName = pickIconForLabel(block.heading, titleSeed + i * 7);
    ev.push({
      id: `block-icon-${i}`, type: "shape", shapeType: "icon",
      start: blkStart, end: blkEnd, layer: 4,
      iconName,
      cx: 120, cy: by + 22, size: 44,
      color: p.accent1,
      shadow: glow > 0 ? { color: p.glow, blur: Math.round(glow * 0.4) } : undefined,
      opacity: { from: 0, to: 1, easing: ease },
      scale: { from: 0.4, to: 1, easing: "bounce" },
    });

    ev.push({
      id: `block-heading-${i}`, type: "text",
      start: blkStart, end: blkEnd, layer: 4,
      text: block.heading,
      x: 165, y: by, maxWidth: 1600,
      color: p.text, fontSize: 44, fontWeight: 700,
      shadow: glow > 0 ? { color: p.glow, blur: Math.round(glow * 0.3) } : undefined,
      opacity: { from: 0, to: 1, easing: ease },
      translateY: { from: 24, to: 0, easing: ease },
    });
    ev.push({
      id: `block-desc-${i}`, type: "text",
      start: ce(blkStart + 0.2, dur), end: blkEnd, layer: 4,
      text: block.description,
      x: 165, y: by + 60, maxWidth: 1400,
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
 *
 * Icons and layout sub-variants are selected deterministically by seeded
 * hash of the brief title — same title always produces the same visuals,
 * different titles produce different layouts and icon assignments.
 */
export function buildProjectFromBrief(
  brief: VideoBrief,
  duration: SupportedDuration,
): VideoProject {
  const timing  = TIMINGS[duration];
  const palette = PALETTES[brief.palette] ?? PALETTES[DEFAULT_PALETTE];
  const style   = STYLES[brief.style]   ?? STYLES[DEFAULT_STYLE];

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
