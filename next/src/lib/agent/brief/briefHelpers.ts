import type {
  AnimatedValue,
  EasingName,
  IconName,
} from "@/lib/ui/renderer";
import type {
  ColorOverrides,
  EntryAnimation,
  TitleSize,
} from "@/lib/agent/schemas/brief";
import type { PaletteSpec } from "@/lib/others/catalog/palettes";
import type { StyleSpec } from "@/lib/others/catalog/styles";

export const W = 1920;
export const H = 1080;

export function seededHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

export function seededChoice<T>(arr: T[], seed: number): T {
  return arr[(seed >>> 0) % arr.length];
}

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0xffffffff;
  };
}

const ICON_KEYWORDS: [string[], IconName][] = [
  [["browser", "chrome", "firefox", "client", "ui", "frontend", "web", "app"], "browser"],
  [["server", "nginx", "apache", "backend", "host"], "server"],
  [["database", "db", "sql", "mongo", "postgres", "mysql", "sqlite", "redis"], "database"],
  [["cloud", "aws", "azure", "gcp", "s3", "bucket", "cdn"], "cloud"],
  [["auth", "jwt", "oauth", "session", "cookie", "tls", "ssl", "https", "lock", "secure"], "lock"],
  [["dns", "internet", "network", "global", "world", "geo"], "globe"],
  [["api", "rest", "graphql", "grpc", "endpoint", "route"], "api"],
  [["mobile", "ios", "android", "phone"], "mobile"],
  [["router", "gateway", "proxy", "load balancer", "lb"], "router"],
  [["firewall", "waf", "shield", "protection", "ddos"], "shield"],
  [["cpu", "compute", "process", "thread", "core"], "cpu"],
  [["cache", "redis", "memcache", "ttl"], "cache"],
  [["config", "setting", "env", "gear", "deploy", "ci", "cd"], "gear"],
  [["code", "src", "source", "function", "lambda", "script"], "code"],
  [["serialize", "json", "dto", "model", "orm", "logic"], "app"],
];

const ALL_ICONS: IconName[] = [
  "browser",
  "server",
  "database",
  "cloud",
  "lock",
  "globe",
  "gear",
  "code",
  "api",
  "mobile",
  "router",
  "shield",
  "cpu",
  "cache",
  "app",
];

export function pickIconForLabel(label: string, seed: number): IconName {
  const lower = label.toLowerCase();
  for (const [keywords, icon] of ICON_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return icon;
  }
  return seededChoice(ALL_ICONS, seededHash(label) ^ seed);
}

export function transitionValue(
  from: number,
  to: number,
  start: number,
  end: number,
  easing: EasingName,
  transitionDuration = 0.5,
): AnimatedValue {
  const transEnd = Math.min(start + transitionDuration, end);
  if (transEnd <= start) return { from: to, to, easing };
  return {
    keyframes: [
      { time: start, value: from, easing },
      { time: transEnd, value: to, easing },
    ],
  };
}

export function closingOpacity(closingStart: number, duration: number): AnimatedValue {
  if (duration - closingStart < 2.0) {
    return { from: 0, to: 1, easing: "easeOut" };
  }
  return {
    keyframes: [
      { time: closingStart, value: 0, easing: "easeOut" },
      { time: closingStart + 0.8, value: 1, easing: "easeOut" },
      { time: duration - 0.8, value: 1, easing: "easeInOut" },
      { time: duration, value: 0, easing: "easeIn" },
    ],
  };
}

export type EntryTransform = {
  translateX?: AnimatedValue;
  translateY?: AnimatedValue;
  scale?: AnimatedValue;
};

export function resolveEntryAnimation(
  anim: EntryAnimation | undefined,
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

export function resolveColors(
  base: PaletteSpec,
  overrides: ColorOverrides | undefined,
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

export function resolveTitleFontSize(size: TitleSize | undefined): number {
  switch (size) {
    case "small":
      return 56;
    case "medium":
      return 72;
    case "hero":
      return 108;
    case "large":
    default:
      return 88;
  }
}

export function scaleParticles(base: number, intensity: number | undefined): number {
  if (intensity === undefined) return base;
  return Math.round(base * intensity);
}

export function estimateTextLines(text: string, fontSize: number, maxWidth: number): number {
  const words = text.split(/\s+/);
  const charWidth = fontSize * 0.58;
  let lines = 1;
  let current = "";

  for (const word of words) {
    if (!word) continue;
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length * charWidth <= maxWidth || !current) {
      current = candidate;
    } else {
      lines += 1;
      current = word;
    }
  }

  return Math.max(1, lines);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function ce(t: number, dur: number): number {
  return Math.min(t, dur - 0.05);
}

export function gb(style: StyleSpec): number {
  return Math.round(25 * style.glowIntensity);
}

export function withAlpha(color: string, alpha: number): string {
  const m = color.match(/^rgb\(\s*([^/)]+?)\s*(?:\/[^)]+)?\)/);
  if (m) return `rgb(${m[1].trim()} / ${alpha})`;
  return color;
}
