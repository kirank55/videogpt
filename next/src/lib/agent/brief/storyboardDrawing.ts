import type {
  DrawingRole,
  Scene,
  StoryboardOperation,
  StoryboardStage,
  VisualPrimitive,
} from "@/lib/agent/schemas/brief";
import type { PaletteSpec } from "@/lib/others/catalog/palettes";
import type { StyleSpec } from "@/lib/others/catalog/styles";
import type { AnimatedValue, ShapeEvent, ShapeFill, TimelineEvent } from "@/lib/ui/renderer";
import { transitionValue, withAlpha } from "./briefHelpers";

export type StoryboardDrawingRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StoryboardDrawingSlice = {
  start: number;
  end: number;
  duration: number;
};

export type StoryboardDrawingDiagnostics = {
  sceneHeading: string;
  used: boolean;
  reason?: string;
  stageCount: number;
  shapeCount: number;
  fallbackReason?: string;
  boundsCoverage?: number;
  layoutFamily?: string;
  labelCollisionCount?: number;
};

export type StoryboardDrawingResult = {
  events: TimelineEvent[];
  diagnostics: StoryboardDrawingDiagnostics;
};

type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };
type GeometryDetail =
  | "beam-array"
  | "construction-crane"
  | "cutaway-container"
  | "cycle-glyph"
  | "layer-depth"
  | "panel-grid"
  | "slab-stack"
  | "window-grid"
  | "comparison-panel";
type GlyphKind = "sun" | "cloud" | "rain" | "water" | "signal" | "plain";

type PrimitiveGeometryBase = {
  primitive: VisualPrimitive;
  role: DrawingRole;
  center: Point;
  detail?: GeometryDetail;
  glyph?: GlyphKind;
};

type PrimitiveGeometry =
  | (PrimitiveGeometryBase & {
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
    })
  | (PrimitiveGeometryBase & {
      kind: "circle";
      x: number;
      y: number;
      radius: number;
    })
  | (PrimitiveGeometryBase & {
      kind: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    });

type PrimitiveTiming = {
  stageIndex: number;
  operation: StoryboardOperation;
};

const DRAWING_BOTTOM_LABEL_SPACE = 92;

function fallback(
  scene: Scene,
  stageCount: number,
  fallbackReason: string,
): StoryboardDrawingResult {
  return {
    events: [],
    diagnostics: {
      sceneHeading: scene.heading,
      used: false,
      stageCount,
      shapeCount: 0,
      fallbackReason,
    },
  };
}

function normalized(value: string | undefined): string {
  return (value ?? "").toLowerCase();
}

function inferDrawingRole(primitive: VisualPrimitive): DrawingRole {
  if (primitive.drawingRole) return primitive.drawingRole;
  const text = normalized([
    primitive.type,
    primitive.label,
    primitive.description,
    primitive.renderAs,
    primitive.shapeHint,
    primitive.materialHint,
    primitive.role,
    primitive.placementHint,
  ].filter(Boolean).join(" "));

  if (/\b(range|ring|circle|radius|coverage|zone|orbit|wave)\b/.test(text)) return "ring";
  if (/\b(pin|receiver|marker|point|satellite|sensor|tree|person)\b/.test(text)) return "pin";
  if (/\b(flow|signal|water|current|path|route|arrow|cable)\b/.test(text)) return "flow";
  if (/\b(soil|bedrock|layer|strata|sand|clay|horizon)\b/.test(text)) return "layer";
  if (/\b(wall|panel|window|cladding|curtain|facade|tile)\b/.test(text)) return "panel";
  if (/\b(beam|column|pier|pile|rebar|core|support|foundation|mat|slab)\b/.test(text)) return "support";
  if (/\b(container|pit|vessel|tank|box|shell|enclosure|boundary)\b/.test(text)) return "container";
  if (/\b(background|ground|sky|base|plaza)\b/.test(text)) return "background";
  if (/\b(label|caption|annotation)\b/.test(text)) return "label";
  return "mass";
}

function drawingBounds(region: StoryboardDrawingRegion) {
  return {
    x: region.x + 42,
    y: region.y + 30,
    width: Math.max(160, region.width - 84),
    height: Math.max(160, region.height - DRAWING_BOTTOM_LABEL_SPACE - 44),
  };
}

function distribute(index: number, count: number, min: number, max: number): number {
  if (count <= 1) return (min + max) / 2;
  return min + ((max - min) * index) / (count - 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function primitiveText(primitive: VisualPrimitive): string {
  return normalized([
    primitive.type,
    primitive.label,
    primitive.description,
    primitive.renderAs,
    primitive.shapeHint,
    primitive.materialHint,
    primitive.role,
    primitive.placementHint,
  ].filter(Boolean).join(" "));
}

function primitiveMatches(primitive: VisualPrimitive, pattern: RegExp): boolean {
  return pattern.test(primitiveText(primitive));
}

function panelDetailFor(primitive: VisualPrimitive): GeometryDetail {
  if (primitiveMatches(primitive, /\b(deck|floor|slab|plate|platform|terrace)\b/)) return "slab-stack";
  if (primitiveMatches(primitive, /\b(window|glass|curtain|cladding|facade|fa[cç]ade|wall|skin)\b/)) {
    return "window-grid";
  }
  return "panel-grid";
}

function isReceiverPrimitive(primitive: VisualPrimitive): boolean {
  return /\b(receiver|phone|user|target|location|fix|device)\b/.test(primitiveText(primitive));
}

function glyphForPrimitive(primitive: VisualPrimitive): GlyphKind {
  const text = primitiveText(primitive);
  if (/\b(sun|solar|heat|evaporat)\b/.test(text)) return "sun";
  if (/\b(cloud|condens|vapor)\b/.test(text)) return "cloud";
  if (/\b(rain|precip|storm|fall)\b/.test(text)) return "rain";
  if (/\b(water|ocean|river|lake|collect|pool)\b/.test(text)) return "water";
  if (/\b(signal|satellite|gps|radio|wave)\b/.test(text)) return "signal";
  return "plain";
}

function relationshipText(scene: Scene, fromId: string, toId: string): string {
  return (scene.primitiveRelationships ?? [])
    .filter((relationship) =>
      (relationship.from.includes(fromId) && relationship.to.includes(toId))
      || (relationship.from.includes(toId) && relationship.to.includes(fromId))
    )
    .map((relationship) => normalized([
      relationship.relation,
      relationship.visualMetaphor,
      relationship.motion,
    ].filter(Boolean).join(" ")))
    .join(" ");
}

function related(scene: Scene, fromId: string, toId: string, pattern?: RegExp): boolean {
  const text = relationshipText(scene, fromId, toId);
  return text.length > 0 && (!pattern || pattern.test(text));
}

function layoutFieldRange(
  scene: Scene,
  primitives: VisualPrimitive[],
  region: StoryboardDrawingRegion,
): Map<string, PrimitiveGeometry> {
  const bounds = drawingBounds(region);
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const pins = primitives.filter((primitive) => inferDrawingRole(primitive) === "pin");
  const receivers = pins.filter(isReceiverPrimitive);
  const emitters = pins.filter((primitive) => !isReceiverPrimitive(primitive));
  const effectiveEmitters = emitters.length > 0 ? emitters : pins;
  const receiverPoint = {
    x: center.x,
    y: center.y + bounds.height * 0.22,
  };
  const emitterPoints = new Map<string, Point>();

  effectiveEmitters.forEach((primitive, index) => {
    const angle = effectiveEmitters.length <= 1
      ? -Math.PI / 2
      : distribute(index, effectiveEmitters.length, -Math.PI * 0.82, -Math.PI * 0.18);
    const radius = Math.min(bounds.width, bounds.height) * 0.36;
    emitterPoints.set(primitive.id, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius * 0.82,
    });
  });

  const geometries = new Map<string, PrimitiveGeometry>();
  let ringIndex = 0;
  let fallbackPinIndex = 0;

  primitives.forEach((primitive, index) => {
    const role = inferDrawingRole(primitive);
    if (role === "ring") {
      const relatedEmitter = effectiveEmitters.find((emitter) =>
        related(scene, emitter.id, primitive.id, /\b(range|broadcast|emit|measure|distance|signal)\b/)
      );
      const emitter = relatedEmitter ?? effectiveEmitters[ringIndex % Math.max(1, effectiveEmitters.length)];
      const ringCenter = emitter ? emitterPoints.get(emitter.id) ?? center : center;
      const receiverDistance = Math.hypot(ringCenter.x - receiverPoint.x, ringCenter.y - receiverPoint.y);
      const radius = clamp(
        receiverDistance * (1 + ringIndex * 0.06),
        Math.min(bounds.width, bounds.height) * 0.18,
        Math.min(bounds.width, bounds.height) * 0.5,
      );
      ringIndex += 1;
      geometries.set(primitive.id, {
        kind: "circle",
        primitive,
        role,
        x: ringCenter.x,
        y: ringCenter.y,
        radius,
        center: ringCenter,
      });
      return;
    }

    if (role === "pin") {
      const emitterPoint = emitterPoints.get(primitive.id);
      const point = receivers.includes(primitive)
        ? receiverPoint
        : emitterPoint ?? {
            x: distribute(fallbackPinIndex++, Math.max(1, pins.length), bounds.x + 120, bounds.x + bounds.width - 120),
            y: bounds.y + bounds.height * 0.38,
          };
      geometries.set(primitive.id, {
        kind: "circle",
        primitive,
        role,
        x: point.x,
        y: point.y,
        radius: receivers.includes(primitive) ? 20 : 17,
        center: point,
        detail: "cycle-glyph",
        glyph: glyphForPrimitive(primitive),
      });
      return;
    }

    const x = distribute(index, primitives.length, bounds.x + 80, bounds.x + bounds.width - 180);
    const y = bounds.y + bounds.height - 84;
    geometries.set(primitive.id, rectGeometry(primitive, role, x, y, 160, 72));
  });

  return geometries;
}

function layoutCycle(
  primitives: VisualPrimitive[],
  region: StoryboardDrawingRegion,
): Map<string, PrimitiveGeometry> {
  const bounds = drawingBounds(region);
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const radius = Math.min(bounds.width, bounds.height) * 0.42;
  const geometries = new Map<string, PrimitiveGeometry>();

  primitives.forEach((primitive, index) => {
    const role = inferDrawingRole(primitive);
    const angle = (Math.PI * 2 * index) / Math.max(1, primitives.length) - Math.PI / 2;
    const point = {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
    geometries.set(primitive.id, {
      kind: "circle",
      primitive,
      role: role === "flow" || role === "path" ? "pin" : role,
      x: point.x,
      y: point.y,
      radius: role === "ring" ? 46 : 34,
      center: point,
      detail: "cycle-glyph",
      glyph: glyphForPrimitive(primitive),
    });
  });

  return geometries;
}

function rectGeometry(
  primitive: VisualPrimitive,
  role: DrawingRole,
  x: number,
  y: number,
  width: number,
  height: number,
  detail?: GeometryDetail,
): PrimitiveGeometry {
  return {
    kind: "rect",
    primitive,
    role,
    x,
    y,
    width,
    height,
    center: { x: x + width / 2, y: y + height / 2 },
    detail,
  };
}

function layoutCutaway(
  primitives: VisualPrimitive[],
  region: StoryboardDrawingRegion,
): Map<string, PrimitiveGeometry> {
  const bounds = drawingBounds(region);
  const geometries = new Map<string, PrimitiveGeometry>();
  const layers = primitives.filter((primitive) => inferDrawingRole(primitive) === "layer");
  let layerIndex = 0;
  let supportIndex = 0;

  primitives.forEach((primitive, index) => {
    const role = inferDrawingRole(primitive);
    if (role === "layer" || role === "background") {
      const layerCount = Math.max(1, layers.length);
      const h = Math.min(78, bounds.height / (layerCount + 2));
      const y = bounds.y + bounds.height - h * (layerIndex + 1);
      layerIndex += 1;
      geometries.set(primitive.id, rectGeometry(primitive, role, bounds.x + 50, y, bounds.width - 100, h, "layer-depth"));
      return;
    }

    if (role === "support" || role === "flow" || role === "path") {
      const x = bounds.x + bounds.width * (0.42 + supportIndex * 0.12);
      supportIndex += 1;
      geometries.set(primitive.id, {
        kind: "line",
        primitive,
        role,
        x1: x,
        y1: bounds.y + bounds.height - 40,
        x2: x,
        y2: bounds.y + 70,
        center: { x, y: bounds.y + bounds.height / 2 },
      });
      return;
    }

    if (role === "container") {
      geometries.set(primitive.id, rectGeometry(
        primitive,
        role,
        bounds.x + 84,
        bounds.y + 45,
        bounds.width - 168,
        bounds.height - 88,
        "cutaway-container",
      ));
      return;
    }

    const w = role === "panel" ? 170 : 220;
    const h = role === "panel" ? 78 : 150;
    const x = distribute(index, primitives.length, bounds.x + 80, bounds.x + bounds.width - w - 80);
    const y = bounds.y + bounds.height * 0.28;
    geometries.set(primitive.id, rectGeometry(
      primitive,
      role,
      x,
      y,
      w,
      h,
      role === "panel" ? panelDetailFor(primitive) : undefined,
    ));
  });

  return geometries;
}

function layoutComparison(
  primitives: VisualPrimitive[],
  region: StoryboardDrawingRegion,
): Map<string, PrimitiveGeometry> {
  const bounds = drawingBounds(region);
  const geometries = new Map<string, PrimitiveGeometry>();
  const half = bounds.width / 2;
  const panelWidth = Math.min(360, half - 150);
  const panelHeight = Math.min(bounds.height * 0.72, 320);

  primitives.forEach((primitive, index) => {
    const role = inferDrawingRole(primitive);
    const column = index < Math.ceil(primitives.length / 2) ? 0 : 1;
    const localIndex = column === 0 ? index : index - Math.ceil(primitives.length / 2);
    const columnCount = column === 0 ? Math.ceil(primitives.length / 2) : Math.floor(primitives.length / 2);
    const isMainPanel = role === "panel" || role === "container";
    const w = isMainPanel ? panelWidth : 180;
    const h = isMainPanel ? panelHeight : 96;
    const x = bounds.x + column * half + half / 2 - w / 2;
    const y = role === "panel" || role === "container"
      ? bounds.y + bounds.height / 2 - h / 2
      : distribute(localIndex, Math.max(1, columnCount), bounds.y + 76, bounds.y + bounds.height - h - 72);
    geometries.set(primitive.id, rectGeometry(
      primitive,
      role,
      x,
      y,
      w,
      h,
      isMainPanel ? "comparison-panel" : undefined,
    ));
  });

  return geometries;
}

function layoutBuildUp(
  primitives: VisualPrimitive[],
  region: StoryboardDrawingRegion,
): Map<string, PrimitiveGeometry> {
  const bounds = drawingBounds(region);
  const geometries = new Map<string, PrimitiveGeometry>();
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const layers = primitives.filter((primitive) => {
    const role = inferDrawingRole(primitive);
    return role === "layer" || role === "background";
  });
  const layerHeight = layers.length > 0 ? Math.min(54, bounds.height * 0.1) : 0;
  const layerTotal = layers.length * layerHeight;
  const towerWidth = Math.min(460, Math.max(260, bounds.width * 0.34));
  const towerHeight = Math.min(bounds.height - layerTotal - 34, Math.max(310, bounds.height * 0.74));
  const towerBaseY = bounds.y + bounds.height - layerTotal - 18;
  const towerX = center.x - towerWidth / 2;
  const towerY = towerBaseY - towerHeight;
  let layerIndex = 0;
  let supportIndex = 0;
  const verticalSupports = primitives.filter((primitive) => {
    const role = inferDrawingRole(primitive);
    return (role === "support" || role === "path" || role === "flow")
      && !primitiveMatches(primitive, /\b(beam|girder|truss|joist|brace|deck|slab|floor)\b/);
  });
  const frameHeight = towerHeight * 0.72;
  const frameY = towerBaseY - frameHeight - towerHeight * 0.04;

  primitives.forEach((primitive, index) => {
    const role = inferDrawingRole(primitive);
    if (role === "layer" || role === "background") {
      const h = layerHeight || 52;
      const layerWidth = towerWidth * (1.45 - Math.min(layerIndex, 2) * 0.12);
      const y = towerBaseY + h * layerIndex;
      layerIndex += 1;
      geometries.set(primitive.id, rectGeometry(
        primitive,
        role,
        center.x - layerWidth / 2,
        y,
        layerWidth,
        h,
        "layer-depth",
      ));
      return;
    }

    if (role === "support" || role === "path" || role === "flow") {
      if (primitiveMatches(primitive, /\b(beam|girder|truss|joist|brace)\b/)) {
        geometries.set(primitive.id, rectGeometry(
          primitive,
          role,
          towerX - towerWidth * 0.22,
          frameY,
          towerWidth * 1.44,
          frameHeight,
          "beam-array",
        ));
        return;
      }

      if (primitiveMatches(primitive, /\b(deck|slab|floor|plate|platform)\b/)) {
        geometries.set(primitive.id, rectGeometry(
          primitive,
          role,
          towerX - towerWidth * 0.12,
          frameY + frameHeight * 0.08,
          towerWidth * 1.24,
          frameHeight * 0.78,
          "slab-stack",
        ));
        return;
      }

      const supportCount = Math.max(1, verticalSupports.length);
      const x = primitiveMatches(primitive, /\b(core|shaft|spine|mast|trunk|column)\b/)
        ? center.x
        : distribute(supportIndex, supportCount, towerX + towerWidth * 0.35, towerX + towerWidth * 0.65);
      supportIndex += 1;
      geometries.set(primitive.id, {
        kind: "line",
        primitive,
        role,
        x1: x,
        y1: towerBaseY,
        x2: x,
        y2: towerY + 26,
        center: { x, y: towerY + towerHeight / 2 },
      });
      return;
    }

    if (role === "panel") {
      const detail = panelDetailFor(primitive);
      const width = detail === "slab-stack" ? towerWidth * 1.24 : towerWidth * 0.74;
      const height = detail === "slab-stack" ? frameHeight * 0.76 : towerHeight * 0.64;
      geometries.set(primitive.id, rectGeometry(
        primitive,
        role,
        center.x - width / 2,
        detail === "slab-stack" ? frameY + frameHeight * 0.1 : towerY + towerHeight * 0.18,
        width,
        height,
        detail,
      ));
      return;
    }

    if (primitiveMatches(primitive, /\b(crane|derrick|hoist|boom|hook)\b/)) {
      const craneWidth = Math.min(420, bounds.width * 0.28);
      const craneHeight = Math.min(230, bounds.height * 0.42);
      geometries.set(primitive.id, rectGeometry(
        primitive,
        role,
        center.x + towerWidth * 0.24,
        Math.max(bounds.y + 28, towerY - craneHeight * 0.2),
        craneWidth,
        craneHeight,
        "construction-crane",
      ));
      return;
    }

    if (role === "pin" || role === "ring") {
      const x = distribute(index, primitives.length, bounds.x + 90, bounds.x + bounds.width - 90);
      const y = bounds.y + bounds.height * 0.36;
      geometries.set(primitive.id, {
        kind: "circle",
        primitive,
        role,
        x,
        y,
        radius: role === "ring" ? 46 : 20,
        center: { x, y },
      });
      return;
    }

    const width = role === "mass" || role === "container" ? towerWidth : 190;
    const height = role === "mass" || role === "container" ? towerHeight : 110;
    const x = role === "mass" || role === "container"
      ? towerX
      : distribute(index, primitives.length, bounds.x + 90, bounds.x + bounds.width - width - 90);
    const y = role === "mass" || role === "container"
      ? towerY
      : bounds.y + bounds.height * 0.36;
    geometries.set(primitive.id, rectGeometry(
      primitive,
      role,
      x,
      y,
      width,
      height,
      role === "container" ? "cutaway-container" : undefined,
    ));
  });

  return geometries;
}

function layoutPrimitiveGeometry(
  scene: Scene,
  primitives: VisualPrimitive[],
  region: StoryboardDrawingRegion,
): Map<string, PrimitiveGeometry> {
  switch (scene.diagramIntent.family) {
    case "field-range":
      return layoutFieldRange(scene, primitives, region);
    case "cycle":
      return layoutCycle(primitives, region);
    case "comparison":
      return layoutComparison(primitives, region);
    case "spatial-cutaway":
      return layoutCutaway(primitives, region);
    case "build-up":
    case "timeline":
    default:
      return layoutBuildUp(primitives, region);
  }
}

function geometryBounds(geometry: PrimitiveGeometry): Rect {
  if (geometry.kind === "rect") {
    return {
      x: geometry.x,
      y: geometry.y,
      width: geometry.width,
      height: geometry.height,
    };
  }
  if (geometry.kind === "circle") {
    return {
      x: geometry.x - geometry.radius,
      y: geometry.y - geometry.radius,
      width: geometry.radius * 2,
      height: geometry.radius * 2,
    };
  }
  const x = Math.min(geometry.x1, geometry.x2);
  const y = Math.min(geometry.y1, geometry.y2);
  return {
    x,
    y,
    width: Math.abs(geometry.x2 - geometry.x1),
    height: Math.abs(geometry.y2 - geometry.y1),
  };
}

function unionBounds(geometries: Iterable<PrimitiveGeometry>): Rect | undefined {
  const bounds = [...geometries].map(geometryBounds);
  if (bounds.length === 0) return undefined;
  const minX = Math.min(...bounds.map((rect) => rect.x));
  const minY = Math.min(...bounds.map((rect) => rect.y));
  const maxX = Math.max(...bounds.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...bounds.map((rect) => rect.y + rect.height));
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function transformPoint(point: Point, source: Rect, target: Rect, scale: number): Point {
  const sourceCenter = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
  const targetCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  return {
    x: targetCenter.x + (point.x - sourceCenter.x) * scale,
    y: targetCenter.y + (point.y - sourceCenter.y) * scale,
  };
}

function transformGeometry(geometry: PrimitiveGeometry, source: Rect, target: Rect, scale: number): PrimitiveGeometry {
  if (geometry.kind === "rect") {
    const point = transformPoint({ x: geometry.x, y: geometry.y }, source, target, scale);
    const width = geometry.width * scale;
    const height = geometry.height * scale;
    return {
      ...geometry,
      x: point.x,
      y: point.y,
      width,
      height,
      center: { x: point.x + width / 2, y: point.y + height / 2 },
    };
  }
  if (geometry.kind === "circle") {
    const point = transformPoint({ x: geometry.x, y: geometry.y }, source, target, scale);
    return {
      ...geometry,
      x: point.x,
      y: point.y,
      radius: geometry.radius * scale,
      center: point,
    };
  }
  const start = transformPoint({ x: geometry.x1, y: geometry.y1 }, source, target, scale);
  const end = transformPoint({ x: geometry.x2, y: geometry.y2 }, source, target, scale);
  return {
    ...geometry,
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    center: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
  };
}

function fitGeometries(
  geometries: Map<string, PrimitiveGeometry>,
  region: StoryboardDrawingRegion,
): { geometries: Map<string, PrimitiveGeometry>; boundsCoverage: number } {
  const bounds = unionBounds(geometries.values());
  const target = drawingBounds(region);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    return { geometries, boundsCoverage: 0 };
  }

  const desiredWidth = target.width * 0.76;
  const desiredHeight = target.height * 0.76;
  const scale = Math.min(
    desiredWidth / Math.max(1, bounds.width),
    desiredHeight / Math.max(1, bounds.height),
    2.2,
  );
  const fittedTarget = {
    x: target.x + (target.width - bounds.width * scale) / 2,
    y: target.y + (target.height - bounds.height * scale) / 2,
    width: bounds.width * scale,
    height: bounds.height * scale,
  };
  const fitted = new Map<string, PrimitiveGeometry>();
  geometries.forEach((geometry, id) => {
    fitted.set(id, transformGeometry(geometry, bounds, fittedTarget, scale));
  });

  const fittedBounds = unionBounds(fitted.values());
  const coverage = fittedBounds
    ? (fittedBounds.width * fittedBounds.height) / Math.max(1, target.width * target.height)
    : 0;
  return {
    geometries: fitted,
    boundsCoverage: parseFloat(coverage.toFixed(3)),
  };
}

function firstStageTiming(stages: StoryboardStage[], primitiveId: string): PrimitiveTiming {
  const index = stages.findIndex((stage) => stage.primitiveIds.includes(primitiveId));
  if (index < 0) return { stageIndex: 0, operation: "reveal" };
  return {
    stageIndex: index,
    operation: stages[index].operation,
  };
}

function stageStart(slice: StoryboardDrawingSlice, index: number, stageCount: number): number {
  const start = slice.start + Math.max(0.16, slice.duration * 0.14);
  const available = Math.max(0.2, slice.end - start - 0.18);
  return start + (available * index) / Math.max(1, stageCount);
}

function revealOpacity(start: number, end: number, easing: StyleSpec["easing"]): AnimatedValue {
  return transitionValue(0, 1, start, end, easing, 0.35);
}

function motionFor(
  operation: StoryboardOperation,
  start: number,
  end: number,
  style: StyleSpec,
): Pick<TimelineEvent, "opacity" | "scale" | "scaleY" | "translateY" | "drawProgress"> {
  const base = {
    opacity: revealOpacity(start, end, style.easing),
  };

  if (operation === "grow") {
    return {
      ...base,
      scaleY: transitionValue(0.08, 1, start, end, style.easing, 0.6),
    };
  }
  if (operation === "move") {
    return {
      ...base,
      translateY: transitionValue(34, 0, start, end, style.easing, 0.5),
    };
  }
  if (operation === "trace" || operation === "connect") {
    return {
      ...base,
      drawProgress: transitionValue(0, 1, start, end, style.easing, 0.7),
    };
  }
  if (operation === "pulse") {
    return {
      ...base,
      scale: transitionValue(0.82, 1.12, start, end, "easeInOut", 0.55),
    };
  }
  return base;
}

function primitiveStroke(role: DrawingRole, palette: PaletteSpec): string {
  if (role === "flow" || role === "path" || role === "ring" || role === "pin") return palette.accent2;
  if (role === "background" || role === "layer") return withAlpha(palette.muted, 0.78);
  return palette.accent1;
}

function primitiveFill(
  role: DrawingRole,
  operation: StoryboardOperation,
  palette: PaletteSpec,
): string {
  if (operation === "fill") return withAlpha(primitiveStroke(role, palette), 0.18);
  if (role === "pin") return withAlpha(palette.accent2, 0.28);
  if (role === "background" || role === "layer") return withAlpha(palette.surface, 0.32);
  return "transparent";
}

function safeStart(start: number, end: number, offset = 0): number {
  return Math.min(start + offset, end - 0.05);
}

function detailLine(
  id: string,
  start: number,
  end: number,
  palette: PaletteSpec,
  style: StyleSpec,
  points: { x1: number; y1: number; x2: number; y2: number },
  options: {
    stroke?: string;
    layer?: number;
    lineWidth?: number;
    lineDash?: number[];
    arrowEnd?: boolean;
    arrowSize?: number;
  } = {},
): ShapeEvent {
  return {
    id,
    type: "shape",
    shapeType: "line",
    start,
    end,
    layer: options.layer ?? 4,
    ...points,
    stroke: options.stroke ?? withAlpha(palette.accent1, 0.86),
    lineWidth: options.lineWidth ?? Math.max(1.4, style.strokeWeight),
    lineDash: options.lineDash,
    arrowEnd: options.arrowEnd,
    arrowSize: options.arrowSize,
    drawProgress: transitionValue(0, 1, start, end, style.easing, 0.55),
    opacity: revealOpacity(start, end, style.easing),
  };
}

function rectBaseEvent(
  geometry: Extract<PrimitiveGeometry, { kind: "rect" }>,
  start: number,
  end: number,
  operation: StoryboardOperation,
  palette: PaletteSpec,
  style: StyleSpec,
  idPrefix: string,
  options: {
    fill?: ShapeFill;
    stroke?: string;
    strokeWidth?: number;
    layer?: number;
  } = {},
): ShapeEvent {
  const stroke = options.stroke ?? primitiveStroke(geometry.role, palette);
  return {
    id: `${idPrefix}-${geometry.primitive.id}`,
    type: "shape",
    shapeType: "rect",
    start,
    end,
    layer: options.layer ?? 3,
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    radius: Math.min(style.radius, 10),
    fill: options.fill ?? primitiveFill(geometry.role, operation, palette),
    stroke,
    strokeWidth: options.strokeWidth ?? Math.max(1.5, style.strokeWeight),
    ...motionFor(operation, start, end, style),
  };
}

function rectTraceEvents(
  geometry: Extract<PrimitiveGeometry, { kind: "rect" }>,
  start: number,
  end: number,
  palette: PaletteSpec,
  style: StyleSpec,
  idPrefix: string,
): ShapeEvent[] {
  const stroke = withAlpha(primitiveStroke(geometry.role, palette), 0.92);
  const x = geometry.x;
  const y = geometry.y;
  const w = geometry.width;
  const h = geometry.height;
  const segments = [
    { x1: x, y1: y, x2: x + w, y2: y },
    { x1: x + w, y1: y, x2: x + w, y2: y + h },
    { x1: x + w, y1: y + h, x2: x, y2: y + h },
    { x1: x, y1: y + h, x2: x, y2: y },
  ];
  return segments.map((points, index) => {
    const segmentStart = safeStart(start, end, index * 0.06);
    return detailLine(
      `${idPrefix}-${geometry.primitive.id}-trace-${index}`,
      segmentStart,
      end,
      palette,
      style,
      points,
      { stroke, layer: 5, lineWidth: Math.max(1.6, style.strokeWeight * 1.05) },
    );
  });
}

function fillSweepEvents(
  geometry: Extract<PrimitiveGeometry, { kind: "rect" }>,
  start: number,
  end: number,
  operation: StoryboardOperation,
  palette: PaletteSpec,
  style: StyleSpec,
  idPrefix: string,
): ShapeEvent[] {
  if (operation !== "fill") return [];
  const sweepStart = safeStart(start, end, 0.08);
  return [{
    id: `${idPrefix}-${geometry.primitive.id}-fill-sweep`,
    type: "shape",
    shapeType: "rect",
    start: sweepStart,
    end,
    layer: 4,
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    radius: Math.min(style.radius, 8),
    fill: withAlpha(primitiveStroke(geometry.role, palette), 0.18),
    stroke: withAlpha(primitiveStroke(geometry.role, palette), 0.38),
    strokeWidth: 1,
    scaleX: transitionValue(0.05, 1, sweepStart, end, style.easing, 0.55),
    opacity: revealOpacity(sweepStart, end, style.easing),
  }];
}

function layeredRectDetailEvents(
  geometry: Extract<PrimitiveGeometry, { kind: "rect" }>,
  start: number,
  end: number,
  operation: StoryboardOperation,
  palette: PaletteSpec,
  style: StyleSpec,
  idPrefix: string,
): ShapeEvent[] {
  const stroke = primitiveStroke(geometry.role, palette);
  const events: ShapeEvent[] = [
    rectBaseEvent(
      geometry,
      start,
      end,
      operation,
      palette,
      style,
      idPrefix,
      {
        fill: withAlpha(palette.surface, geometry.role === "background" ? 0.22 : 0.32),
        stroke: withAlpha(stroke, 0.78),
      },
    ),
  ];
  const hatchCount = clamp(Math.floor(geometry.width / 110), 4, 9);
  for (let index = 0; index < hatchCount; index++) {
    const x = geometry.x + distribute(index, hatchCount, 18, geometry.width - 18);
    const lineStart = safeStart(start, end, index * 0.025);
    events.push(detailLine(
      `${idPrefix}-${geometry.primitive.id}-hatch-${index}`,
      lineStart,
      end,
      palette,
      style,
      {
        x1: x - 22,
        y1: geometry.y + geometry.height * 0.78,
        x2: x + 22,
        y2: geometry.y + geometry.height * 0.28,
      },
      {
        stroke: withAlpha(stroke, 0.38),
        layer: 4,
        lineWidth: Math.max(1, style.strokeWeight * 0.62),
      },
    ));
  }
  return events;
}

function beamArrayEvents(
  geometry: Extract<PrimitiveGeometry, { kind: "rect" }>,
  start: number,
  end: number,
  operation: StoryboardOperation,
  palette: PaletteSpec,
  style: StyleSpec,
  idPrefix: string,
): ShapeEvent[] {
  const stroke = primitiveStroke(geometry.role, palette);
  const beamCount = clamp(Math.floor(geometry.height / 56), 3, 8);
  const events: ShapeEvent[] = rectTraceEvents(geometry, start, end, palette, style, idPrefix).map((event) => ({
    ...event,
    stroke: withAlpha(stroke, 0.28),
    lineWidth: Math.max(1, style.strokeWeight * 0.65),
    lineDash: style.lineDash,
    layer: 2,
  }));
  const centerX = geometry.x + geometry.width / 2;

  for (let index = 0; index < beamCount; index++) {
    const y = distribute(index, beamCount, geometry.y + 16, geometry.y + geometry.height - 16);
    const beamStart = safeStart(start, end, index * 0.055);
    const leftFirst = index % 2 === 0;
    events.push(detailLine(
      `${idPrefix}-${geometry.primitive.id}-beam-${index}-a`,
      beamStart,
      end,
      palette,
      style,
      {
        x1: centerX,
        y1: y,
        x2: leftFirst ? geometry.x : geometry.x + geometry.width,
        y2: y,
      },
      {
        stroke,
        layer: 4,
        lineWidth: Math.max(2.4, style.strokeWeight * 1.35),
      },
    ));
    events.push(detailLine(
      `${idPrefix}-${geometry.primitive.id}-beam-${index}-b`,
      safeStart(beamStart, end, 0.045),
      end,
      palette,
      style,
      {
        x1: centerX,
        y1: y,
        x2: leftFirst ? geometry.x + geometry.width : geometry.x,
        y2: y,
      },
      {
        stroke,
        layer: 4,
        lineWidth: Math.max(2.4, style.strokeWeight * 1.35),
      },
    ));
  }

  if (operation === "fill") {
    events.push(...fillSweepEvents(geometry, start, end, operation, palette, style, idPrefix));
  }
  return events;
}

function slabStackEvents(
  geometry: Extract<PrimitiveGeometry, { kind: "rect" }>,
  start: number,
  end: number,
  operation: StoryboardOperation,
  palette: PaletteSpec,
  style: StyleSpec,
  idPrefix: string,
): ShapeEvent[] {
  const stroke = primitiveStroke(geometry.role, palette);
  const slabCount = clamp(Math.floor(geometry.height / 64), 3, 7);
  const slabHeight = Math.min(18, geometry.height / (slabCount * 2.8));
  const events: ShapeEvent[] = [];

  for (let index = 0; index < slabCount; index++) {
    const y = distribute(index, slabCount, geometry.y + 14, geometry.y + geometry.height - slabHeight - 14);
    const slabStart = safeStart(start, end, index * 0.06);
    events.push({
      id: `${idPrefix}-${geometry.primitive.id}-slab-${index}`,
      type: "shape",
      shapeType: "rect",
      start: slabStart,
      end,
      layer: 4,
      x: geometry.x,
      y,
      width: geometry.width,
      height: slabHeight,
      radius: 3,
      fill: withAlpha(stroke, operation === "fill" ? 0.18 : 0.08),
      stroke: withAlpha(stroke, 0.82),
      strokeWidth: Math.max(1.1, style.strokeWeight * 0.72),
      scaleX: operation === "grow" || operation === "fill"
        ? transitionValue(0.08, 1, slabStart, end, style.easing, 0.55)
        : undefined,
      opacity: revealOpacity(slabStart, end, style.easing),
    });
  }

  events.push(...rectTraceEvents(geometry, start, end, palette, style, idPrefix).map((event) => ({
    ...event,
    stroke: withAlpha(stroke, 0.28),
    lineWidth: Math.max(1, style.strokeWeight * 0.62),
    layer: 2,
  })));
  events.push(...fillSweepEvents(geometry, start, end, operation, palette, style, idPrefix));
  return events;
}

function panelGridEvents(
  geometry: Extract<PrimitiveGeometry, { kind: "rect" }>,
  start: number,
  end: number,
  operation: StoryboardOperation,
  palette: PaletteSpec,
  style: StyleSpec,
  idPrefix: string,
  dense: boolean,
): ShapeEvent[] {
  const stroke = primitiveStroke(geometry.role, palette);
  const events: ShapeEvent[] = [
    rectBaseEvent(
      geometry,
      start,
      end,
      operation,
      palette,
      style,
      idPrefix,
      {
        fill: operation === "fill" ? withAlpha(stroke, 0.12) : "transparent",
        stroke: withAlpha(stroke, 0.78),
      },
    ),
  ];
  const cols = clamp(Math.floor(geometry.width / (dense ? 54 : 90)), dense ? 3 : 2, dense ? 8 : 5);
  const rows = clamp(Math.floor(geometry.height / (dense ? 54 : 82)), dense ? 3 : 2, dense ? 9 : 6);
  const gapX = geometry.width / (cols + 1);
  const gapY = geometry.height / (rows + 1);
  const paneWidth = Math.min(dense ? 34 : 52, gapX * 0.52);
  const paneHeight = Math.min(dense ? 30 : 42, gapY * 0.46);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const paneStart = safeStart(start, end, (row * cols + col) * (dense ? 0.018 : 0.028));
      events.push({
        id: `${idPrefix}-${geometry.primitive.id}-pane-${row}-${col}`,
        type: "shape",
        shapeType: "rect",
        start: paneStart,
        end,
        layer: 4,
        x: geometry.x + gapX * (col + 1) - paneWidth / 2,
        y: geometry.y + gapY * (row + 1) - paneHeight / 2,
        width: paneWidth,
        height: paneHeight,
        radius: 2,
        fill: withAlpha(stroke, operation === "fill" ? 0.2 : dense ? 0.08 : 0.06),
        stroke: withAlpha(stroke, dense ? 0.82 : 0.62),
        strokeWidth: 1,
        ...motionFor(operation === "grow" ? "reveal" : operation, paneStart, end, style),
      });
    }
  }

  events.push(...fillSweepEvents(geometry, start, end, operation, palette, style, idPrefix));
  return operation === "trace"
    ? [...events, ...rectTraceEvents(geometry, start, end, palette, style, idPrefix)]
    : events;
}

function cutawayContainerEvents(
  geometry: Extract<PrimitiveGeometry, { kind: "rect" }>,
  start: number,
  end: number,
  operation: StoryboardOperation,
  palette: PaletteSpec,
  style: StyleSpec,
  idPrefix: string,
): ShapeEvent[] {
  const stroke = primitiveStroke(geometry.role, palette);
  const inset = Math.min(28, Math.min(geometry.width, geometry.height) * 0.08);
  const innerStart = safeStart(start, end, 0.1);
  const events: ShapeEvent[] = [
    rectBaseEvent(
      geometry,
      start,
      end,
      operation,
      palette,
      style,
      idPrefix,
      {
        fill: withAlpha(palette.surface, 0.16),
        stroke: withAlpha(stroke, 0.86),
      },
    ),
    {
      id: `${idPrefix}-${geometry.primitive.id}-inner`,
      type: "shape",
      shapeType: "rect",
      start: innerStart,
      end,
      layer: 3,
      x: geometry.x + inset,
      y: geometry.y + inset,
      width: Math.max(4, geometry.width - inset * 2),
      height: Math.max(4, geometry.height - inset * 2),
      radius: Math.min(style.radius, 8),
      fill: "transparent",
      stroke: withAlpha(stroke, 0.42),
      strokeWidth: Math.max(1, style.strokeWeight * 0.7),
      opacity: revealOpacity(innerStart, end, style.easing),
    },
    ...fillSweepEvents(geometry, start, end, operation, palette, style, idPrefix),
  ];
  if (operation === "trace") {
    events.push(...rectTraceEvents(geometry, start, end, palette, style, idPrefix));
  }
  return events;
}

function constructionCraneEvents(
  geometry: Extract<PrimitiveGeometry, { kind: "rect" }>,
  start: number,
  end: number,
  operation: StoryboardOperation,
  palette: PaletteSpec,
  style: StyleSpec,
  idPrefix: string,
): ShapeEvent[] {
  const stroke = primitiveStroke(geometry.role, palette);
  const mastX = geometry.x + geometry.width * 0.22;
  const mastTop = geometry.y + geometry.height * 0.16;
  const mastBottom = geometry.y + geometry.height * 0.92;
  const boomY = mastTop;
  const hookX = geometry.x + geometry.width * 0.76;
  const boomStart = safeStart(start, end, 0.08);
  const hookStart = safeStart(start, end, 0.22);
  return [
    detailLine(
      `${idPrefix}-${geometry.primitive.id}-mast`,
      start,
      end,
      palette,
      style,
      { x1: mastX, y1: mastBottom, x2: mastX, y2: mastTop },
      { stroke, layer: 5, lineWidth: Math.max(2, style.strokeWeight * 1.2) },
    ),
    detailLine(
      `${idPrefix}-${geometry.primitive.id}-boom`,
      boomStart,
      end,
      palette,
      style,
      { x1: mastX, y1: boomY, x2: geometry.x + geometry.width * 0.92, y2: boomY },
      { stroke, layer: 5, lineWidth: Math.max(2, style.strokeWeight * 1.2) },
    ),
    detailLine(
      `${idPrefix}-${geometry.primitive.id}-counterboom`,
      safeStart(start, end, 0.14),
      end,
      palette,
      style,
      { x1: mastX, y1: boomY, x2: geometry.x + geometry.width * 0.04, y2: boomY + geometry.height * 0.08 },
      { stroke: withAlpha(stroke, 0.76), layer: 5, lineWidth: Math.max(1.6, style.strokeWeight) },
    ),
    detailLine(
      `${idPrefix}-${geometry.primitive.id}-hook-line`,
      hookStart,
      end,
      palette,
      style,
      { x1: hookX, y1: boomY, x2: hookX, y2: geometry.y + geometry.height * 0.54 },
      { stroke: withAlpha(stroke, 0.72), layer: 5, lineWidth: Math.max(1.2, style.strokeWeight * 0.75) },
    ),
    {
      id: `${idPrefix}-${geometry.primitive.id}-hook`,
      type: "shape",
      shapeType: "circle",
      start: safeStart(hookStart, end, 0.12),
      end,
      layer: 5,
      x: hookX,
      y: geometry.y + geometry.height * 0.58,
      radius: 8,
      fill: withAlpha(stroke, 0.22),
      stroke,
      strokeWidth: Math.max(1.2, style.strokeWeight * 0.8),
      ...motionFor(operation === "move" ? "move" : "reveal", safeStart(hookStart, end, 0.12), end, style),
    },
  ];
}

function rectEventsForPrimitive(
  geometry: Extract<PrimitiveGeometry, { kind: "rect" }>,
  start: number,
  end: number,
  operation: StoryboardOperation,
  palette: PaletteSpec,
  style: StyleSpec,
  idPrefix: string,
): ShapeEvent[] {
  const stroke = primitiveStroke(geometry.role, palette);
  const fill = primitiveFill(geometry.role, operation, palette);
  if (geometry.detail === "beam-array") {
    return beamArrayEvents(geometry, start, end, operation, palette, style, idPrefix);
  }
  if (geometry.detail === "construction-crane") {
    return constructionCraneEvents(geometry, start, end, operation, palette, style, idPrefix);
  }
  if (geometry.detail === "cutaway-container") {
    return cutawayContainerEvents(geometry, start, end, operation, palette, style, idPrefix);
  }
  if (geometry.detail === "layer-depth") {
    return layeredRectDetailEvents(geometry, start, end, operation, palette, style, idPrefix);
  }
  if (geometry.detail === "panel-grid") {
    return panelGridEvents(geometry, start, end, operation, palette, style, idPrefix, false);
  }
  if (geometry.detail === "slab-stack") {
    return slabStackEvents(geometry, start, end, operation, palette, style, idPrefix);
  }
  if (geometry.detail === "window-grid") {
    return panelGridEvents(geometry, start, end, operation, palette, style, idPrefix, true);
  }

  const events: ShapeEvent[] = [rectBaseEvent(geometry, start, end, operation, palette, style, idPrefix, { fill, stroke })];

  if (geometry.role === "panel" && geometry.detail !== "comparison-panel") {
    events.push({
      id: `${idPrefix}-${geometry.primitive.id}-pane`,
      type: "shape",
      shapeType: "rect",
      start: Math.min(start + 0.12, end - 0.05),
      end,
      layer: 4,
      x: geometry.x + geometry.width * 0.18,
      y: geometry.y + geometry.height * 0.18,
      width: geometry.width * 0.64,
      height: geometry.height * 0.64,
      radius: 2,
      fill: withAlpha(stroke, 0.12),
      stroke: withAlpha(stroke, 0.85),
      strokeWidth: 1,
      ...motionFor("reveal", Math.min(start + 0.12, end - 0.05), end, style),
    });
  }

  events.push(...fillSweepEvents(geometry, start, end, operation, palette, style, idPrefix));
  if (operation === "trace") {
    events.push(...rectTraceEvents(geometry, start, end, palette, style, idPrefix));
  }

  return events;
}

function glyphEventsForPrimitive(
  geometry: Extract<PrimitiveGeometry, { kind: "circle" }>,
  start: number,
  end: number,
  palette: PaletteSpec,
  style: StyleSpec,
  idPrefix: string,
): ShapeEvent[] {
  if (geometry.detail !== "cycle-glyph" || geometry.glyph === "plain") return [];
  const stroke = withAlpha(primitiveStroke(geometry.role, palette), 0.9);
  const r = geometry.radius;
  const common = {
    start: Math.min(start + 0.08, end - 0.05),
    end,
    layer: 5,
    stroke,
    opacity: revealOpacity(Math.min(start + 0.08, end - 0.05), end, style.easing),
  };

  if (geometry.glyph === "sun") {
    const events: ShapeEvent[] = [];
    for (let index = 0; index < 8; index++) {
      const angle = (Math.PI * 2 * index) / 8;
      events.push({
        id: `${idPrefix}-${geometry.primitive.id}-ray-${index}`,
        type: "shape",
        shapeType: "line",
        ...common,
        x1: geometry.x + Math.cos(angle) * r * 0.48,
        y1: geometry.y + Math.sin(angle) * r * 0.48,
        x2: geometry.x + Math.cos(angle) * r * 0.82,
        y2: geometry.y + Math.sin(angle) * r * 0.82,
        lineWidth: Math.max(1.4, style.strokeWeight),
        drawProgress: transitionValue(0, 1, common.start, end, style.easing, 0.45),
      });
    }
    return events;
  }

  if (geometry.glyph === "cloud") {
    return [-0.24, 0.16].map((offset, index) => ({
      id: `${idPrefix}-${geometry.primitive.id}-cloud-${index}`,
      type: "shape",
      shapeType: "circle",
      ...common,
      x: geometry.x + r * offset,
      y: geometry.y - r * 0.08,
      radius: r * (index === 0 ? 0.34 : 0.42),
      fill: withAlpha(palette.surface, 0.24),
      strokeWidth: Math.max(1.2, style.strokeWeight * 0.85),
    }));
  }

  if (geometry.glyph === "rain") {
    return [-0.28, 0, 0.28].map((offset, index) => ({
      id: `${idPrefix}-${geometry.primitive.id}-rain-${index}`,
      type: "shape",
      shapeType: "line",
      ...common,
      x1: geometry.x + r * offset - r * 0.1,
      y1: geometry.y - r * 0.28,
      x2: geometry.x + r * offset + r * 0.12,
      y2: geometry.y + r * 0.34,
      lineWidth: Math.max(1.5, style.strokeWeight),
      drawProgress: transitionValue(0, 1, common.start, end, style.easing, 0.45),
    }));
  }

  if (geometry.glyph === "water") {
    return [-0.18, 0.08, 0.34].map((offset, index) => ({
      id: `${idPrefix}-${geometry.primitive.id}-water-${index}`,
      type: "shape",
      shapeType: "line",
      ...common,
      x1: geometry.x - r * 0.46,
      y1: geometry.y + r * offset,
      x2: geometry.x + r * 0.46,
      y2: geometry.y + r * offset,
      lineWidth: Math.max(1.4, style.strokeWeight),
      drawProgress: transitionValue(0, 1, common.start, end, style.easing, 0.45),
    }));
  }

  if (geometry.glyph === "signal") {
    return [0.48, 0.72].map((scale, index) => ({
      id: `${idPrefix}-${geometry.primitive.id}-signal-${index}`,
      type: "shape",
      shapeType: "circle",
      ...common,
      x: geometry.x,
      y: geometry.y,
      radius: r * scale,
      fill: "transparent",
      strokeWidth: Math.max(1.1, style.strokeWeight * 0.75),
      drawProgress: transitionValue(0, 1, common.start, end, style.easing, 0.5),
    }));
  }

  return [];
}

function circleEventsForPrimitive(
  geometry: Extract<PrimitiveGeometry, { kind: "circle" }>,
  start: number,
  end: number,
  operation: StoryboardOperation,
  palette: PaletteSpec,
  style: StyleSpec,
  idPrefix: string,
): ShapeEvent[] {
  const stroke = primitiveStroke(geometry.role, palette);
  const fill = geometry.role === "ring" ? "transparent" : primitiveFill(geometry.role, operation, palette);
  const body: ShapeEvent = {
    id: `${idPrefix}-${geometry.primitive.id}`,
    type: "shape",
    shapeType: "circle",
    start,
    end,
    layer: geometry.role === "ring" ? 2 : 4,
    x: geometry.x,
    y: geometry.y,
    radius: geometry.radius,
    fill,
    stroke,
    strokeWidth: Math.max(1.6, style.strokeWeight),
    ...motionFor(operation === "reveal" && geometry.role === "ring" ? "trace" : operation, start, end, style),
  };
  return [
    body,
    ...glyphEventsForPrimitive(geometry, start, end, palette, style, idPrefix),
  ];
}

function lineEventForPrimitive(
  geometry: Extract<PrimitiveGeometry, { kind: "line" }>,
  start: number,
  end: number,
  operation: StoryboardOperation,
  palette: PaletteSpec,
  style: StyleSpec,
  idPrefix: string,
): ShapeEvent {
  return {
    id: `${idPrefix}-${geometry.primitive.id}`,
    type: "shape",
    shapeType: "line",
    start,
    end,
    layer: 3,
    x1: geometry.x1,
    y1: geometry.y1,
    x2: geometry.x2,
    y2: geometry.y2,
    stroke: primitiveStroke(geometry.role, palette),
    lineWidth: Math.max(2, style.strokeWeight * 1.4),
    lineDash: geometry.role === "flow" || geometry.role === "path" ? style.lineDash : undefined,
    arrowEnd: geometry.role === "flow" || geometry.role === "path",
    drawProgress: transitionValue(0, 1, start, end, style.easing, 0.65),
    opacity: revealOpacity(start, end, style.easing),
  };
}

function primitiveEvents(
  geometry: PrimitiveGeometry,
  timing: PrimitiveTiming,
  stages: StoryboardStage[],
  slice: StoryboardDrawingSlice,
  palette: PaletteSpec,
  style: StyleSpec,
  sceneIndex: number,
): ShapeEvent[] {
  const start = stageStart(slice, timing.stageIndex, stages.length);
  const idPrefix = `scene-${sceneIndex}-storyboard-primitive`;
  return geometry.kind === "rect"
    ? rectEventsForPrimitive(geometry, start, slice.end, timing.operation, palette, style, idPrefix)
    : geometry.kind === "circle"
      ? circleEventsForPrimitive(geometry, start, slice.end, timing.operation, palette, style, idPrefix)
      : [lineEventForPrimitive(geometry, start, slice.end, timing.operation, palette, style, idPrefix)];
}

function labelRect(cx: number, cy: number, text: string): Rect {
  const width = Math.min(260, Math.max(66, text.length * 8 + 28));
  const height = 30;
  return { x: cx - width / 2, y: cy - height / 2, width, height };
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

function containsRect(bounds: Rect, rect: Rect): boolean {
  return rect.x >= bounds.x
    && rect.y >= bounds.y
    && rect.x + rect.width <= bounds.x + bounds.width
    && rect.y + rect.height <= bounds.y + bounds.height;
}

function shouldLabelPrimitive(scene: Scene, geometry: PrimitiveGeometry): boolean {
  if (geometry.role === "label") return true;
  if (geometry.detail === "window-grid") return false;
  if (geometry.role === "panel" && scene.diagramIntent.family !== "comparison") return false;
  if (geometry.role === "ring" && scene.diagramIntent.family === "field-range") return false;
  return ["mass", "container", "layer", "support", "pin", "panel"].includes(geometry.role);
}

function labelCandidateRects(geometry: PrimitiveGeometry, text: string): Rect[] {
  const bounds = geometryBounds(geometry);
  const gap = 26;
  const top = labelRect(geometry.center.x, bounds.y - gap, text);
  const right = labelRect(bounds.x + bounds.width + gap + labelRect(0, 0, text).width / 2, geometry.center.y, text);
  const bottom = labelRect(geometry.center.x, bounds.y + bounds.height + gap, text);
  const left = labelRect(bounds.x - gap - labelRect(0, 0, text).width / 2, geometry.center.y, text);
  return [top, right, bottom, left];
}

function primitiveLabelEvents(
  scene: Scene,
  geometries: Map<string, PrimitiveGeometry>,
  stages: StoryboardStage[],
  slice: StoryboardDrawingSlice,
  region: StoryboardDrawingRegion,
  palette: PaletteSpec,
  style: StyleSpec,
  sceneIndex: number,
): { events: ShapeEvent[]; labelCollisionCount: number } {
  const idPrefix = `scene-${sceneIndex}-storyboard-primitive`;
  const accepted: Rect[] = [];
  const events: ShapeEvent[] = [];
  let labelCollisionCount = 0;
  const bounds = drawingBounds(region);

  [...geometries.values()].forEach((geometry) => {
    if (!shouldLabelPrimitive(scene, geometry)) return;
    const text = geometry.primitive.label.slice(0, 26);
    const placement = labelCandidateRects(geometry, text).find((candidate) =>
      containsRect(bounds, candidate) && accepted.every((existing) => !intersects(existing, candidate))
    );
    if (!placement) {
      labelCollisionCount += 1;
      return;
    }
    accepted.push(placement);
    const timing = firstStageTiming(stages, geometry.primitive.id);
    const start = Math.min(stageStart(slice, timing.stageIndex, stages.length) + 0.08, slice.end - 0.05);
    events.push({
      id: `${idPrefix}-${geometry.primitive.id}-label`,
      type: "shape",
      shapeType: "badge",
      start,
      end: slice.end,
      layer: 6,
      cx: placement.x + placement.width / 2,
      cy: placement.y + placement.height / 2,
      text,
      fontSize: 14,
      paddingX: 11,
      paddingY: 5,
      fill: withAlpha(palette.surface, 0.86),
      textColor: palette.text,
      stroke: withAlpha(primitiveStroke(geometry.role, palette), 0.55),
      strokeWidth: 1,
      opacity: revealOpacity(start, slice.end, style.easing),
    });
  });

  return { events, labelCollisionCount };
}

function connectorEventsForStage(
  scene: Scene,
  stage: StoryboardStage,
  stageIndex: number,
  stageCount: number,
  geometries: Map<string, PrimitiveGeometry>,
  slice: StoryboardDrawingSlice,
  palette: PaletteSpec,
  style: StyleSpec,
  sceneIndex: number,
): ShapeEvent[] {
  if (stage.operation !== "connect" && stage.operation !== "trace") return [];
  const refs = stage.primitiveIds
    .map((id) => geometries.get(id))
    .filter((geometry): geometry is PrimitiveGeometry => Boolean(geometry));
  if (refs.length < 2) return [];

  const start = stageStart(slice, stageIndex, stageCount);
  const events: ShapeEvent[] = [];
  const pathRefs = scene.diagramIntent.family === "cycle" && stage.operation === "trace" && refs.length > 2
    ? [...refs, refs[0]]
    : refs;
  pathRefs.slice(0, -1).forEach((from, index) => {
    const to = pathRefs[index + 1];
    events.push({
      id: `scene-${sceneIndex}-storyboard-connector-${stageIndex}-${index}`,
      type: "shape",
      shapeType: "line",
      start,
      end: slice.end,
      layer: 2,
      x1: from.center.x,
      y1: from.center.y,
      x2: to.center.x,
      y2: to.center.y,
      stroke: stage.operation === "trace" ? palette.accent2 : withAlpha(palette.accent1, 0.9),
      lineWidth: Math.max(scene.diagramIntent.family === "cycle" ? 2.8 : 2, style.strokeWeight * 1.2),
      lineDash: stage.operation === "trace" ? undefined : style.lineDash,
      arrowEnd: true,
      arrowSize: scene.diagramIntent.family === "cycle" ? 12 : 9,
      drawProgress: transitionValue(0, 1, start, slice.end, style.easing, 0.65),
      opacity: revealOpacity(start, slice.end, style.easing),
    });
  });

  return events;
}

function familyGuideEvents(
  scene: Scene,
  stages: StoryboardStage[],
  geometries: Map<string, PrimitiveGeometry>,
  slice: StoryboardDrawingSlice,
  palette: PaletteSpec,
  style: StyleSpec,
  sceneIndex: number,
): ShapeEvent[] {
  const guideStage = Math.max(0, stages.findIndex((stage) => stage.operation === "trace" || stage.operation === "connect"));
  const start = safeStart(stageStart(slice, guideStage, stages.length), slice.end, 0.04);

  if (scene.diagramIntent.family === "cycle") {
    const bounds = unionBounds(geometries.values());
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return [];
    return [{
      id: `scene-${sceneIndex}-storyboard-cycle-guide`,
      type: "shape",
      shapeType: "circle",
      start,
      end: slice.end,
      layer: 1,
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
      radius: Math.max(36, Math.min(bounds.width, bounds.height) * 0.54),
      fill: "transparent",
      stroke: withAlpha(palette.accent2, 0.28),
      strokeWidth: Math.max(1.3, style.strokeWeight * 0.72),
      drawProgress: transitionValue(0, 1, start, slice.end, style.easing, 0.75),
      opacity: revealOpacity(start, slice.end, style.easing),
    }];
  }

  if (scene.diagramIntent.family === "field-range") {
    const pins = [...geometries.values()].filter((geometry) =>
      geometry.kind === "circle" && geometry.role === "pin"
    );
    const receiver = pins.find((geometry) => isReceiverPrimitive(geometry.primitive));
    if (!receiver) return [];
    return pins
      .filter((geometry) => geometry !== receiver)
      .map((geometry, index) => detailLine(
        `scene-${sceneIndex}-storyboard-field-link-${index}`,
        safeStart(start, slice.end, index * 0.045),
        slice.end,
        palette,
        style,
        {
          x1: geometry.center.x,
          y1: geometry.center.y,
          x2: receiver.center.x,
          y2: receiver.center.y,
        },
        {
          stroke: withAlpha(palette.accent2, 0.48),
          layer: 2,
          lineWidth: Math.max(1.4, style.strokeWeight * 0.75),
          lineDash: style.lineDash,
          arrowEnd: true,
          arrowSize: 8,
        },
      ));
  }

  return [];
}

function comparisonConnectorEvents(
  stages: StoryboardStage[],
  geometries: Map<string, PrimitiveGeometry>,
  slice: StoryboardDrawingSlice,
  palette: PaletteSpec,
  style: StyleSpec,
  sceneIndex: number,
): ShapeEvent[] {
  const panels = [...geometries.values()].filter((geometry) =>
    geometry.kind === "rect" && geometry.detail === "comparison-panel"
  );
  if (panels.length < 2) return [];
  const hasConnectorStage = stages.some((stage) => stage.operation === "connect" || stage.operation === "trace");
  if (hasConnectorStage) return [];
  const left = [...panels].sort((a, b) => a.center.x - b.center.x)[0];
  const right = [...panels].sort((a, b) => a.center.x - b.center.x)[1];
  const start = stageStart(slice, Math.max(0, stages.length - 1), Math.max(1, stages.length));
  return [{
    id: `scene-${sceneIndex}-storyboard-comparison-arrow`,
    type: "shape",
    shapeType: "line",
    start,
    end: slice.end,
    layer: 2,
    x1: left.center.x,
    y1: left.center.y,
    x2: right.center.x,
    y2: right.center.y,
    stroke: withAlpha(palette.accent1, 0.9),
    lineWidth: Math.max(2.4, style.strokeWeight * 1.35),
    arrowEnd: true,
    arrowSize: 12,
    drawProgress: transitionValue(0, 1, start, slice.end, style.easing, 0.65),
    opacity: revealOpacity(start, slice.end, style.easing),
  }];
}

function pulseEventsForStage(
  stage: StoryboardStage,
  stageIndex: number,
  stageCount: number,
  geometries: Map<string, PrimitiveGeometry>,
  slice: StoryboardDrawingSlice,
  palette: PaletteSpec,
  style: StyleSpec,
  sceneIndex: number,
): ShapeEvent[] {
  if (stage.operation !== "pulse") return [];
  const start = stageStart(slice, stageIndex, stageCount);
  const end = Math.min(slice.end, start + Math.max(0.55, slice.duration * 0.22));

  return stage.primitiveIds.flatMap((id, index) => {
    const geometry = geometries.get(id);
    if (!geometry) return [];
    const radius = geometry.kind === "circle"
      ? geometry.radius * 1.28
      : geometry.kind === "rect"
        ? Math.min(geometry.width, geometry.height) * 0.28
        : 34;
    const event: ShapeEvent = {
      id: `scene-${sceneIndex}-storyboard-pulse-${stageIndex}-${index}`,
      type: "shape",
      shapeType: "circle",
      start,
      end,
      layer: 5,
      x: geometry.center.x,
      y: geometry.center.y,
      radius,
      fill: "transparent",
      stroke: palette.accent2,
      strokeWidth: Math.max(1.5, style.strokeWeight),
      scale: transitionValue(0.6, 1.7, start, end, "easeOut", end - start),
      opacity: {
        keyframes: [
          { time: start, value: 0, easing: "easeOut" },
          { time: start + (end - start) * 0.2, value: 0.75, easing: "easeOut" },
          { time: end, value: 0, easing: "easeIn" },
        ],
      },
    };
    return [event];
  });
}

function stageTickEvents(
  stages: StoryboardStage[],
  slice: StoryboardDrawingSlice,
  region: StoryboardDrawingRegion,
  palette: PaletteSpec,
  style: StyleSpec,
  sceneIndex: number,
): ShapeEvent[] {
  const progressStart = region.x + 92;
  const progressWidth = region.width - 184;
  const y = region.y + region.height - 74;
  const start = stageStart(slice, 0, stages.length);
  return stages.map((_, index) => {
    const x = distribute(index, stages.length, progressStart, progressStart + progressWidth);
    return {
      id: `scene-${sceneIndex}-storyboard-stage-tick-${index}`,
      type: "shape",
      shapeType: "line",
      start,
      end: slice.end,
      layer: 3,
      x1: x,
      y1: y - 9,
      x2: x,
      y2: y + 9,
      stroke: withAlpha(palette.accent2, 0.62),
      lineWidth: Math.max(1.5, style.strokeWeight),
      opacity: revealOpacity(start, slice.end, style.easing),
    };
  });
}

function stageCaptionEvents(
  stages: StoryboardStage[],
  slice: StoryboardDrawingSlice,
  region: StoryboardDrawingRegion,
  palette: PaletteSpec,
  style: StyleSpec,
  sceneIndex: number,
): ShapeEvent[] {
  const y = region.y + region.height - 36;
  return stages.map((stage, index) => {
    const start = stageStart(slice, index, stages.length);
    const nextStart = index < stages.length - 1 ? stageStart(slice, index + 1, stages.length) : slice.end;
    const end = index < stages.length - 1 ? Math.min(slice.end, nextStart + 0.16) : slice.end;
    const holdEnd = Math.max(start + 0.24, end - 0.14);
    return {
      id: `scene-${sceneIndex}-storyboard-stage-caption-${index}`,
      type: "shape",
      shapeType: "badge",
      start,
      end,
      layer: 6,
      cx: region.x + region.width / 2,
      cy: y,
      text: stage.label.slice(0, 34),
      fontSize: 18,
      paddingX: 16,
      paddingY: 7,
      fill: withAlpha(palette.surface, 0.9),
      textColor: palette.text,
      stroke: withAlpha(palette.accent1, 0.65),
      strokeWidth: 1,
      opacity: {
        keyframes: [
          { time: start, value: 0, easing: style.easing },
          { time: Math.min(start + 0.24, end), value: 1, easing: style.easing },
          { time: holdEnd, value: 1, easing: style.easing },
          { time: end, value: index < stages.length - 1 ? 0 : 1, easing: "easeIn" },
        ],
      },
    };
  });
}

function progressEvent(
  stages: StoryboardStage[],
  slice: StoryboardDrawingSlice,
  region: StoryboardDrawingRegion,
  palette: PaletteSpec,
  style: StyleSpec,
  sceneIndex: number,
): ShapeEvent {
  const start = stageStart(slice, 0, stages.length);
  return {
    id: `scene-${sceneIndex}-storyboard-progress`,
    type: "shape",
    shapeType: "progress",
    start,
    end: slice.end,
    layer: 2,
    x: region.x + 92,
    y: region.y + region.height - 74,
    width: region.width - 184,
    height: 5,
    radius: 3,
    trackColor: withAlpha(palette.muted, 0.25),
    fillColor: withAlpha(palette.accent2, 0.8),
    opacity: revealOpacity(start, slice.end, style.easing),
  };
}

export function compileStoryboardScene(
  scene: Scene,
  slice: StoryboardDrawingSlice,
  region: StoryboardDrawingRegion,
  palette: PaletteSpec,
  style: StyleSpec,
  sceneIndex: number,
): StoryboardDrawingResult {
  const stageCount = scene.storyboard?.stages.length ?? 0;
  if (scene.diagramIntent.family === "graph-flow") {
    return fallback(scene, stageCount, "graph-flow scenes use the graph renderer");
  }
  if (!scene.storyboard || scene.storyboard.stages.length === 0) {
    return fallback(scene, stageCount, "scene has no storyboard stages");
  }
  const primitives = scene.visualPrimitives ?? [];
  if (primitives.length === 0) {
    return fallback(scene, stageCount, "scene has no visual primitives");
  }

  const rawGeometries = layoutPrimitiveGeometry(scene, primitives, region);
  const { geometries, boundsCoverage } = fitGeometries(rawGeometries, region);
  const events: ShapeEvent[] = [
    progressEvent(scene.storyboard.stages, slice, region, palette, style, sceneIndex),
    ...stageTickEvents(scene.storyboard.stages, slice, region, palette, style, sceneIndex),
  ];

  primitives.forEach((primitive) => {
    const geometry = geometries.get(primitive.id);
    if (!geometry) return;
    events.push(...primitiveEvents(
      geometry,
      firstStageTiming(scene.storyboard!.stages, primitive.id),
      scene.storyboard!.stages,
      slice,
      palette,
      style,
      sceneIndex,
    ));
  });
  events.push(...familyGuideEvents(scene, scene.storyboard.stages, geometries, slice, palette, style, sceneIndex));

  scene.storyboard.stages.forEach((stage, index) => {
    events.push(...connectorEventsForStage(scene, stage, index, stageCount, geometries, slice, palette, style, sceneIndex));
    events.push(...pulseEventsForStage(stage, index, stageCount, geometries, slice, palette, style, sceneIndex));
  });
  if (scene.diagramIntent.family === "comparison") {
    events.push(...comparisonConnectorEvents(scene.storyboard.stages, geometries, slice, palette, style, sceneIndex));
  }
  const labels = primitiveLabelEvents(
    scene,
    geometries,
    scene.storyboard.stages,
    slice,
    region,
    palette,
    style,
    sceneIndex,
  );
  events.push(...labels.events);
  events.push(...stageCaptionEvents(scene.storyboard.stages, slice, region, palette, style, sceneIndex));

  const validEvents = events.filter((event) => event.end > event.start);
  if (validEvents.length === 0) {
    return fallback(scene, stageCount, "storyboard compiled no visible shape events");
  }

  return {
    events: validEvents,
    diagnostics: {
      sceneHeading: scene.heading,
      used: true,
      reason: "compiled storyboard to shape events",
      stageCount,
      shapeCount: validEvents.length,
      boundsCoverage,
      layoutFamily: scene.diagramIntent.family,
      labelCollisionCount: labels.labelCollisionCount,
    },
  };
}
