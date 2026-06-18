import type { VideoBrief } from "@/lib/schemas/brief";
import { PALETTES, DEFAULT_PALETTE } from "@/lib/catalog/palettes";
import { STYLES, DEFAULT_STYLE } from "@/lib/catalog/styles";

// ── Type guards & extractors ─────────────────────────────────────────────────

const VALID_PALETTES = new Set(Object.keys(PALETTES));
const VALID_STYLES   = new Set(Object.keys(STYLES));

function isObject(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function str(x: unknown, fallback: string): string {
  return typeof x === "string" && x.trim().length > 0 ? x.trim() : fallback;
}

function optStr(x: unknown): string | undefined {
  if (typeof x === "string" && x.trim().length > 0) return x.trim();
  return undefined;
}

function bool(x: unknown, fallback: boolean): boolean {
  return typeof x === "boolean" ? x : fallback;
}

/**
 * Extract a string array from an unknown value.
 * - Non-arrays → empty result (caller applies min padding)
 * - Trims and filters empty strings
 * - Truncates to max
 */
function strArray(x: unknown, max: number): string[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, max);
}

/** Pad array to minLen by appending `${prefix} N` labels. */
function padArray(arr: string[], minLen: number, prefix: string): string[] {
  const out = [...arr];
  while (out.length < minLen) out.push(`${prefix} ${out.length + 1}`);
  return out;
}

function extractBlocks(
  x: unknown,
): Array<{ heading: string; description: string }> {
  const fallback = [
    { heading: "Key Point",  description: "An important insight to share." },
    { heading: "Key Detail", description: "Another crucial piece of the puzzle." },
  ];
  if (!Array.isArray(x)) return fallback;

  const raw = x
    .filter(isObject)
    .map((b) => ({
      heading:     str(b.heading,     "Key Point"),
      description: str(b.description, "An important detail."),
    }))
    .slice(0, 5);

  return raw.length >= 2 ? raw : fallback;
}

function extractVisualElements(x: unknown): any[] | undefined {
  if (!Array.isArray(x)) return undefined;
  return x
    .filter(isObject)
    .map((e) => {
      const type = str(e.type, "rect") as "rect" | "circle" | "line" | "icon";
      const blockIndex = typeof e.blockIndex === "number" ? Math.max(0, Math.min(4, Math.floor(e.blockIndex))) : undefined;
      const x = typeof e.x === "number" ? e.x : undefined;
      const y = typeof e.y === "number" ? e.y : undefined;
      const width = typeof e.width === "number" ? e.width : (typeof e.w === "number" ? e.w : undefined);
      const height = typeof e.height === "number" ? e.height : (typeof e.h === "number" ? e.h : undefined);
      const radius = typeof e.radius === "number" ? e.radius : (typeof e.r === "number" ? e.r : undefined);
      const x1 = typeof e.x1 === "number" ? e.x1 : undefined;
      const y1 = typeof e.y1 === "number" ? e.y1 : undefined;
      const x2 = typeof e.x2 === "number" ? e.x2 : undefined;
      const y2 = typeof e.y2 === "number" ? e.y2 : undefined;

      const color = (typeof e.color === "string" && ["accent1", "accent2", "muted", "text", "surface"].includes(e.color))
        ? (e.color as any)
        : undefined;
      const fillType = (typeof e.fillType === "string" && ["solid", "outline", "dashed"].includes(e.fillType))
        ? (e.fillType as any)
        : undefined;
      const entry = (typeof e.entry === "string" && ["fade", "slide-up", "slide-down", "scale-up", "grow-y", "grow-x"].includes(e.entry))
        ? (e.entry as any)
        : undefined;

      const iconName = optStr(e.iconName) as any;
      const label = optStr(e.label);

      return {
        type,
        blockIndex,
        x,
        y,
        width,
        height,
        radius,
        x1,
        y1,
        x2,
        y2,
        color,
        fillType,
        iconName,
        label,
        entry,
      };
    })
    .slice(0, 30);
}

// ── Main validator ───────────────────────────────────────────────────────────

/**
 * Deterministic fallback normalizer.
 * Accepts **any** unknown value and always returns a valid `VideoBrief`.
 * - Unknown palette → "midnight"
 * - Unknown style   → "modern"
 * - leftRows / rightRows < 2 → padded to 2; > 4 → truncated to 4
 * - blocks < 2 → filled to 2; > 5 → truncated to 5
 * - Missing title → "Untitled"
 * - Completely invalid input → minimal valid brief
 * Never throws. Never calls APIs.
 */
export function validateBrief(raw: unknown): VideoBrief {
  const src = isObject(raw) ? raw : {};

  const layout: "two-column" | "single-column" =
    src.layout === "two-column" ? "two-column" : "single-column";

  const paletteKey = str(src.palette, "");
  const palette = VALID_PALETTES.has(paletteKey) ? paletteKey : DEFAULT_PALETTE;

  const styleKey = str(src.style, "");
  const style = VALID_STYLES.has(styleKey) ? styleKey : DEFAULT_STYLE;

  const base = {
    layout,
    title:      str(src.title, "Untitled"),
    subtitle:   optStr(src.subtitle),
    closingLine: optStr(src.closingLine),
    palette,
    style,
  };

  if (layout === "two-column") {
    const leftRows  = padArray(strArray(src.leftRows,  4), 2, "Layer");
    const rightRows = padArray(strArray(src.rightRows, 4), 2, "Layer");
    const flow = bool(src.flow, false);

    return {
      ...base,
      leftHeader:  str(src.leftHeader,  "LEFT"),
      rightHeader: str(src.rightHeader, "RIGHT"),
      leftRows,
      rightRows,
      flow,
      requestLabel:     flow ? str(src.requestLabel, "REQUEST")   : undefined,
      requestBody:      flow ? optStr(src.requestBody)             : undefined,
      responseLabel:    flow ? str(src.responseLabel, "RESPONSE")  : undefined,
      processingSteps:  flow ? padArray(strArray(src.processingSteps, 3), 0, "Step") : undefined,
    };
  }

  // single-column
  return {
    ...base,
    blocks: extractBlocks(src.blocks),
    visualElements: extractVisualElements(src.visualElements),
  };
}
