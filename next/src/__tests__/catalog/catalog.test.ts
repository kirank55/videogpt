import { describe, it, expect } from "vitest";
import { PALETTES, DEFAULT_PALETTE } from "@/lib/others/catalog/palettes";
import type { PaletteSpec } from "@/lib/others/catalog/palettes";

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

describe("Catalog", () => {
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
});
