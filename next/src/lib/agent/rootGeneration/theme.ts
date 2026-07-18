import { seededHash } from "@/lib/others/timeline/utils";

export type VideoPartTheme = {
  palette: string;
  titleSize: "large" | "hero";
  titleAlign: "left" | "center";
};

const VIDEO_PART_PALETTES = [
  "midnight",
  "neon",
  "aurora",
  "ember",
  "forest",
  "slate",
  "paper",
  "ice",
] as const;

export function normalizeVideoPartPrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ").toLowerCase();
}

export function resolveVideoPartTheme(prompt: string): VideoPartTheme {
  const seed = seededHash(normalizeVideoPartPrompt(prompt));
  const palette = VIDEO_PART_PALETTES[seed % VIDEO_PART_PALETTES.length];

  return {
    palette,
    titleSize: seed % 3 === 0 ? "hero" : "large",
    titleAlign: seed % 2 === 0 ? "center" : "left",
  };
}


