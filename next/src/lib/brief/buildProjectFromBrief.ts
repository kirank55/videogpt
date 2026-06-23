// ── Brief Expander — orchestrator ─────────────────────────────────────────────
//
// Expand a `VideoBrief` into a complete, renderable `VideoProject`.
//
// Design principle: the Brief Expander computes *where* (pixel coordinates)
// and *when* (absolute timestamps). All creative decisions — variant, icons,
// emphasis, entry animations, decorations, particle intensity, timing weights,
// closing style, per-act easings, color overrides — come from the AI via the
// VideoBrief schema. The expander never makes creative decisions autonomously.
//
// Module structure:
//   briefHelpers.ts      — pure shared utilities (seeded RNG, resolve*, inject*)
//   twoColumnLayout.ts   — builds events for the two-column layout
//   singleColumnLayout.ts — builds events for the single-column layout
//   buildProjectFromBrief.ts (this file) — hydration + catalog lookup + dispatch

import type { TimelineEvent, VideoProject } from "@/lib/renderer";
import type { VideoBrief, SupportedDuration } from "@/lib/schemas/brief";
import { PALETTES, DEFAULT_PALETTE } from "@/lib/catalog/palettes";
import { STYLES, DEFAULT_STYLE } from "@/lib/catalog/styles";
import { TIMINGS } from "@/lib/catalog/timings";
import {
  W, H,
  seededHash,
  mulberry32,
  resolveActTimings,
  resolveColors,
  scaleParticles,
} from "./briefHelpers";
import { buildTwoColumn } from "./twoColumnLayout";
import { buildSingleColumn } from "./singleColumnLayout";

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

  return {
    ...brief,
    entryAnimation: brief.entryAnimation
      ?? ENTRY_ANIMATIONS[Math.floor(rng() * ENTRY_ANIMATIONS.length)],
    variant: brief.variant
      ?? VARIANTS[Math.floor(rng() * VARIANTS.length)],
    emphasizeLeft: brief.emphasizeLeft !== undefined
      ? brief.emphasizeLeft
      : (Math.floor(rng() * 3) === 0 ? 1 : 0),
    emphasizeRight: brief.emphasizeRight !== undefined
      ? brief.emphasizeRight
      : (Math.floor(rng() * 3) === 0 ? 1 : 0),
    titleSize: brief.titleSize
      ?? TITLE_SIZES[h % TITLE_SIZES.length],
    particleIntensity: brief.particleIntensity !== undefined
      ? brief.particleIntensity
      : (1 + (h % 3) * 0.5),
    closingStyle: brief.closingStyle
      ?? CLOSING_STYLES[h % CLOSING_STYLES.length],
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function buildProjectFromBrief(
  rawBrief: VideoBrief,
  duration: SupportedDuration,
): VideoProject {
  const brief   = hydrateBrief(rawBrief);
  const timing  = resolveActTimings(TIMINGS[duration], duration, brief.actWeights);
  const palette = resolveColors(PALETTES[brief.palette] ?? PALETTES[DEFAULT_PALETTE], brief.colorOverrides);
  const style   = STYLES[brief.style] ?? STYLES[DEFAULT_STYLE];

  const background: TimelineEvent = {
    id: "bg", type: "background",
    start: 0, end: duration, layer: 0,
    background: {
      kind: "gradient",
      from:  palette.bgFrom,
      to:    palette.bgTo,
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
