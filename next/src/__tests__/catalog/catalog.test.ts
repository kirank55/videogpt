import { describe, it, expect } from "vitest";
import { PALETTES, DEFAULT_PALETTE } from "@/lib/others/catalog/palettes";
import { STYLES, DEFAULT_STYLE } from "@/lib/others/catalog/styles";
import { TIMINGS } from "@/lib/others/catalog/timings";
import { SUPPORTED_DURATIONS } from "@/lib/agent/schemas/brief";
import type { PaletteSpec } from "@/lib/others/catalog/palettes";
import type { StyleSpec } from "@/lib/others/catalog/styles";

// ── Required fields for each catalog entry ─────────────────────────────────

const PALETTE_FIELDS: (keyof PaletteSpec)[] = [
  "bgFrom",
  "bgTo",
  "bgAngle",
  "surface",
  "accent1",
  "accent1Glow",
  "accent2",
  "accent2Glow",
  "text",
  "muted",
  "glow",
];

const PALETTE_COLOR_FIELDS: (keyof PaletteSpec)[] = [
  "bgFrom",
  "bgTo",
  "surface",
  "accent1",
  "accent1Glow",
  "accent2",
  "accent2Glow",
  "text",
  "muted",
  "glow",
];

const STYLE_FIELDS: (keyof StyleSpec)[] = [
  "radius",
  "easing",
  "strokeWeight",
  "glowIntensity",
  "particleDensity",
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Catalog", () => {
  // ── Palettes ────────────────────────────────────────────────────────────

  const paletteEntries = Object.entries(PALETTES);

  it("has at least 6 named palettes", () => {
    expect(paletteEntries.length).toBeGreaterThanOrEqual(6);
  });

  it("default palette 'midnight' exists", () => {
    expect(PALETTES[DEFAULT_PALETTE]).toBeDefined();
  });

  it.each(paletteEntries)(
    "palette '%s' has all required color fields",
    (_name, spec) => {
      for (const field of PALETTE_FIELDS) {
        expect(
          spec[field],
          `palette field '${field}' must be defined`,
        ).toBeDefined();
      }
      for (const field of PALETTE_COLOR_FIELDS) {
        expect(
          typeof spec[field],
          `palette color field '${field}' must be a string`,
        ).toBe("string");
      }
    },
  );

  it.each(paletteEntries)(
    "palette '%s' bgAngle is a valid degree value",
    (_name, spec) => {
      expect(spec.bgAngle).toBeGreaterThanOrEqual(0);
      expect(spec.bgAngle).toBeLessThanOrEqual(360);
    },
  );

  it.each(paletteEntries)(
    "palette '%s' color strings are non-empty",
    (_name, spec) => {
      for (const field of PALETTE_COLOR_FIELDS) {
        expect(
          (spec[field] as string).trim().length,
          `palette color field '${field}' must not be empty`,
        ).toBeGreaterThan(0);
      }
    },
  );

  // ── Styles ──────────────────────────────────────────────────────────────

  const styleEntries = Object.entries(STYLES);

  it("has at least 4 named styles", () => {
    expect(styleEntries.length).toBeGreaterThanOrEqual(4);
  });

  it("default style 'modern' exists", () => {
    expect(STYLES[DEFAULT_STYLE]).toBeDefined();
  });

  it.each(styleEntries)(
    "style '%s' has all required fields",
    (_name, spec) => {
      for (const field of STYLE_FIELDS) {
        expect(
          spec[field],
          `style field '${field}' must be defined`,
        ).toBeDefined();
      }
    },
  );

  it.each(styleEntries)(
    "style '%s' has valid numeric fields",
    (_name, spec) => {
      expect(spec.radius).toBeGreaterThanOrEqual(0);
      expect(spec.strokeWeight).toBeGreaterThan(0);
      expect(spec.glowIntensity).toBeGreaterThanOrEqual(0);
      expect(spec.particleDensity).toBeGreaterThanOrEqual(0);
    },
  );

  it.each(styleEntries)(
    "style '%s' easing is a valid EasingName",
    (_name, spec) => {
      const validEasings = [
        "linear",
        "easeIn",
        "easeOut",
        "easeInOut",
        "bounce",
      ];
      expect(validEasings).toContain(spec.easing);
    },
  );

  // ── Timings ─────────────────────────────────────────────────────────────

  it("every supported duration has an act timing table", () => {
    for (const dur of SUPPORTED_DURATIONS) {
      expect(
        TIMINGS[dur],
        `timing table for ${dur}s must exist`,
      ).toBeDefined();
    }
  });

  it.each(Object.entries(TIMINGS))(
    "timing table for %ss has all 5 acts",
    (_dur, table) => {
      expect(table.act1).toBeDefined();
      expect(table.act2).toBeDefined();
      expect(table.act3).toBeDefined();
      expect(table.act4).toBeDefined();
      expect(table.act5).toBeDefined();
    },
  );

  it.each(Object.entries(TIMINGS))(
    "timing table for %ss has contiguous acts",
    (_dur, table) => {
      // Each act end == next act start
      expect(table.act1.end).toBeCloseTo(table.act2.start, 5);
      expect(table.act2.end).toBeCloseTo(table.act3.start, 5);
      expect(table.act3.end).toBeCloseTo(table.act4.start, 5);
      expect(table.act4.end).toBeCloseTo(table.act5.start, 5);
    },
  );

  it.each(SUPPORTED_DURATIONS)(
    "timing table for %ds: act5.end matches the duration",
    (dur) => {
      expect(TIMINGS[dur].act5.end).toBeCloseTo(dur, 1);
    },
  );

  it.each(Object.entries(TIMINGS))(
    "timing table for %ss: all stagger values are positive",
    (_dur, table) => {
      expect(table.act2.stagger).toBeGreaterThan(0);
      expect(table.act4.stepStagger).toBeGreaterThan(0);
    },
  );
});
