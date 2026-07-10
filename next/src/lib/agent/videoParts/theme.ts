import type { VideoBrief } from "@/lib/agent/schemas/brief";
import { seededHash } from "@/lib/agent/brief/briefHelpers";

export type VideoPartTheme = Pick<
  VideoBrief,
  | "palette"
  | "style"
  | "particleIntensity"
  | "decorations"
  | "titleSize"
  | "titleAlign"
  | "closingStyle"
>;

const COMPATIBLE_THEMES = [
  { palette: "midnight", style: "modern" },
  { palette: "neon", style: "neon-glow" },
  { palette: "aurora", style: "modern" },
  { palette: "ember", style: "brutalist" },
  { palette: "forest", style: "modern" },
  { palette: "slate", style: "minimal" },
  { palette: "paper", style: "sketch" },
  { palette: "ice", style: "minimal" },
] as const;

export function normalizeVideoPartPrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ").toLowerCase();
}

export function resolveVideoPartTheme(prompt: string): VideoPartTheme {
  const seed = seededHash(normalizeVideoPartPrompt(prompt));
  const selected = COMPATIBLE_THEMES[seed % COMPATIBLE_THEMES.length];

  return {
    palette: selected.palette,
    style: selected.style,
    particleIntensity: selected.style === "minimal" || selected.style === "brutalist" ? 0 : 1,
    decorations: {
      cornerBrackets: seed % 2 === 0,
      scanLines: selected.style === "neon-glow",
      pulseRings: selected.style === "modern" || selected.style === "neon-glow",
      gapDivider: false,
      decoBaseline: false,
    },
    titleSize: seed % 3 === 0 ? "hero" : "large",
    titleAlign: seed % 2 === 0 ? "center" : "left",
    closingStyle: seed % 2 === 0 ? "fade-center" : "fade-up",
  };
}
