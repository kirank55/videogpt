import type { EasingName } from "@/lib/renderer";

// ── Named Style catalog ──────────────────────────────────────────────────────
//
// Style controls shape personality and animation character — independent of palette.
// The AI picks a name; the Brief Expander resolves it to exact values.
//
// Fields:
//   radius          — corner radius for all rects (px)
//   easing          — default AnimatedValue easing for all events
//   strokeWeight    — base lineWidth for borders and connectors
//   glowIntensity   — multiplier for shadow blur (blur = round(25 × intensity))
//   particleDensity — ambient particle count (0 = no ambient particles)
//   lineDash        — dash pattern for connectors; undefined = solid lines

export type StyleSpec = {
  radius: number;
  easing: EasingName;
  strokeWeight: number;
  glowIntensity: number;
  particleDensity: number;
  lineDash?: number[];
};

export const STYLES: Record<string, StyleSpec> = {
  /** Smooth, rounded, softly glowing — the default workhorse. */
  modern: {
    radius: 12,
    easing: "easeOut",
    strokeWeight: 1.5,
    glowIntensity: 1.0,
    particleDensity: 40,
  },

  /** Sharp-cornered, high-contrast, no glow — raw data-center aesthetic. */
  brutalist: {
    radius: 0,
    easing: "linear",
    strokeWeight: 2.5,
    glowIntensity: 0,
    particleDensity: 0,
  },

  /** Slightly rough, dashed connectors, hand-drawn feel. */
  sketch: {
    radius: 4,
    easing: "easeInOut",
    strokeWeight: 1.0,
    glowIntensity: 0.3,
    particleDensity: 15,
    lineDash: [6, 5],
  },

  /** Heavy bloom, rounded, dense particle field — cyberpunk / synthwave. */
  "neon-glow": {
    radius: 16,
    easing: "easeOut",
    strokeWeight: 1.0,
    glowIntensity: 2.5,
    particleDensity: 60,
  },

  /** Ultra-thin strokes, barely-there glow, no particles — clean whitespace. */
  minimal: {
    radius: 8,
    easing: "easeInOut",
    strokeWeight: 0.75,
    glowIntensity: 0.1,
    particleDensity: 0,
  },
};

export const DEFAULT_STYLE = "modern";
