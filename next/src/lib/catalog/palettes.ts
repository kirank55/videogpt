// ── Named Palette catalog ────────────────────────────────────────────────────
//
// Each palette is a complete color set.  The AI picks a name; the Brief Expander
// resolves it to exact values.  Add new palettes here — no code changes needed.
//
// Fields:
//   bgFrom / bgTo / bgAngle — background gradient
//   surface      — fill for stack rects (semi-opaque or solid)
//   accent1      — request / primary accent (opaque rgb string)
//   accent1Glow  — accent1 at ~70% opacity (for shadows / particles)
//   accent2      — response / secondary accent (opaque rgb string)
//   accent2Glow  — accent2 at ~70% opacity
//   text         — primary label / heading color
//   muted        — secondary text, connectors
//   glow         — title shadow color (semi-transparent)

export type PaletteSpec = {
  bgFrom: string;
  bgTo: string;
  bgAngle: number;
  surface: string;
  accent1: string;
  accent1Glow: string;
  accent2: string;
  accent2Glow: string;
  text: string;
  muted: string;
  glow: string;
};

export const PALETTES: Record<string, PaletteSpec> = {
  // ── Dark palettes ──────────────────────────────────────────────────────────

  midnight: {
    bgFrom: "#010a15",
    bgTo: "#061020",
    bgAngle: 150,
    surface: "rgb(8 15 30)",
    accent1: "rgb(96 165 250)",
    accent1Glow: "rgb(96 165 250 / 0.7)",
    accent2: "rgb(52 211 153)",
    accent2Glow: "rgb(52 211 153 / 0.7)",
    text: "#f8fafc",
    muted: "rgb(148 163 184 / 0.85)",
    glow: "rgb(96 165 250 / 0.65)",
  },

  neon: {
    bgFrom: "#080010",
    bgTo: "#100018",
    bgAngle: 120,
    surface: "rgb(15 5 25)",
    accent1: "rgb(0 240 220)",
    accent1Glow: "rgb(0 240 220 / 0.75)",
    accent2: "rgb(240 0 200)",
    accent2Glow: "rgb(240 0 200 / 0.7)",
    text: "#f0f0ff",
    muted: "rgb(180 160 210 / 0.85)",
    glow: "rgb(0 240 220 / 0.7)",
  },

  aurora: {
    bgFrom: "#050d1a",
    bgTo: "#0d1a2e",
    bgAngle: 135,
    surface: "rgb(10 18 35)",
    accent1: "rgb(140 100 255)",
    accent1Glow: "rgb(140 100 255 / 0.65)",
    accent2: "rgb(0 215 175)",
    accent2Glow: "rgb(0 215 175 / 0.65)",
    text: "#e8f4ff",
    muted: "rgb(160 190 220 / 0.8)",
    glow: "rgb(140 100 255 / 0.6)",
  },

  ember: {
    bgFrom: "#0c0400",
    bgTo: "#180900",
    bgAngle: 160,
    surface: "rgb(20 8 0)",
    accent1: "rgb(255 165 0)",
    accent1Glow: "rgb(255 165 0 / 0.6)",
    accent2: "rgb(255 80 20)",
    accent2Glow: "rgb(255 80 20 / 0.6)",
    text: "#fff8f0",
    muted: "rgb(200 165 110 / 0.8)",
    glow: "rgb(255 165 0 / 0.55)",
  },

  forest: {
    bgFrom: "#010c06",
    bgTo: "#051408",
    bgAngle: 145,
    surface: "rgb(5 15 8)",
    accent1: "rgb(80 220 100)",
    accent1Glow: "rgb(80 220 100 / 0.6)",
    accent2: "rgb(20 185 125)",
    accent2Glow: "rgb(20 185 125 / 0.6)",
    text: "#f0f8f2",
    muted: "rgb(140 190 155 / 0.8)",
    glow: "rgb(80 220 100 / 0.55)",
  },

  slate: {
    bgFrom: "#18202e",
    bgTo: "#202840",
    bgAngle: 165,
    surface: "rgb(28 35 52)",
    accent1: "rgb(130 155 205)",
    accent1Glow: "rgb(130 155 205 / 0.5)",
    accent2: "rgb(175 195 230)",
    accent2Glow: "rgb(175 195 230 / 0.5)",
    text: "#dde4f4",
    muted: "rgb(130 150 185 / 0.75)",
    glow: "rgb(130 155 205 / 0.45)",
  },

  // ── Light palettes ─────────────────────────────────────────────────────────

  paper: {
    bgFrom: "#f5f0e8",
    bgTo: "#ede8dc",
    bgAngle: 180,
    surface: "rgb(225 215 200)",
    accent1: "rgb(180 55 15)",
    accent1Glow: "rgb(180 55 15 / 0.35)",
    accent2: "rgb(35 115 75)",
    accent2Glow: "rgb(35 115 75 / 0.35)",
    text: "#1a1008",
    muted: "rgb(80 70 55 / 0.75)",
    glow: "rgb(180 55 15 / 0.3)",
  },

  ice: {
    bgFrom: "#dce8f4",
    bgTo: "#c8dced",
    bgAngle: 200,
    surface: "rgb(195 215 235)",
    accent1: "rgb(10 90 200)",
    accent1Glow: "rgb(10 90 200 / 0.4)",
    accent2: "rgb(0 150 220)",
    accent2Glow: "rgb(0 150 220 / 0.4)",
    text: "#04102a",
    muted: "rgb(60 100 150 / 0.75)",
    glow: "rgb(10 90 200 / 0.35)",
  },
};

export const DEFAULT_PALETTE = "midnight";
