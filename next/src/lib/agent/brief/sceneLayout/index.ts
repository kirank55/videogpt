import type {
  BlockStyle,
  BriefBlock,
  BriefGraph,
  BriefGraphNode,
  DiagramLayout,
  Scene,
} from "@/lib/agent/schemas/brief";
import {
  layoutGraph,
  type CanvasBox,
  type LaidOutEdge,
  type LaidOutNode,
  type Rect,
} from "@/lib/agent/brief/graphLayout";

export { SCENE_CONTENT_BUDGETS } from "./constants";

export type LayoutRegionName =
  | "safeMargins"
  | "headingBand"
  | "diagramRegion"
  | "blockRegion";

export type LayoutDiagnosticSeverity = "info" | "warn";

export type LayoutDiagnostic = {
  severity: LayoutDiagnosticSeverity;
  code: string;
  message: string;
  sceneHeading?: string;
  strategy?: DiagramLayout;
  variant?: string;
};

export type LayoutRegion = Rect & {
  name: LayoutRegionName;
};

export type TextFitDecision = {
  originalText: string;
  text: string;
  fontSize: number;
  lineHeight: number;
  lineCount: number;
  maxLines: number;
  omitted: boolean;
};

export type SceneLayoutNode = LaidOutNode & {
  labelFit: TextFitDecision;
  labelX: number;
  labelY: number;
  labelMaxWidth: number;
};

export type SceneLayoutEdge = LaidOutEdge & {
  originalLabel?: string;
  originalPacketLabel?: string;
  labelOmitted?: boolean;
  packetLabelOmitted?: boolean;
};

export type SceneLayoutBlock = Rect & {
  index: number;
  block: BriefBlock;
  iconX: number;
  iconY: number;
  textX: number;
  headingY: number;
  descY: number;
  maxWidth: number;
  headingFit: TextFitDecision;
  descriptionFit: TextFitDecision;
};

export type LayoutAttempt = {
  strategy: DiagramLayout;
  variant: string;
  score: number;
  collisions: number;
  safeMarginViolations: number;
  omittedLabels: number;
};

export type SceneLayoutDiagnostics = {
  sceneHeading: string;
  requestedStrategy: DiagramLayout;
  chosenStrategy: DiagramLayout;
  chosenVariant: string;
  fallbackApplied: boolean;
  attempts: LayoutAttempt[];
  messages: LayoutDiagnostic[];
};

export type SceneLayoutPlan = {
  requestedStrategy: DiagramLayout;
  strategy: DiagramLayout;
  variant: string;
  regions: Record<LayoutRegionName, LayoutRegion>;
  nodes: SceneLayoutNode[];
  edges: SceneLayoutEdge[];
  blocks: SceneLayoutBlock[];
  diagnostics: SceneLayoutDiagnostics;
};

type LayoutVariant = {
  name: string;
  edgeLabels: boolean;
  packetLabels: boolean;
};

type Occupancy = Rect & {
  id: string;
  kind: "heading" | "node" | "block" | "edgeLabel" | "packetPath";
};

type CandidatePlan = Omit<SceneLayoutPlan, "diagnostics"> & {
  attempt: LayoutAttempt;
  messages: LayoutDiagnostic[];
};

const SAFE_MARGIN = 88;
const HEADING_BAND: Rect = { x: 120, y: 132, width: 1680, height: 110 };

const VARIANTS: LayoutVariant[] = [
  { name: "roomy-labels-on", edgeLabels: true, packetLabels: true },
  { name: "roomy-edge-labels-off", edgeLabels: false, packetLabels: true },
  { name: "roomy-labels-off", edgeLabels: false, packetLabels: false },
];

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

function estimateLines(text: string, fontSize: number, maxWidth: number): number {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;

  const charWidth = fontSize * 0.58;
  let lines = 1;
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length * charWidth <= maxWidth || !current) {
      current = candidate;
    } else {
      lines += 1;
      current = word;
    }
  }
  return lines;
}

function fitText(
  text: string,
  fontSize: number,
  lineHeight: number,
  maxWidth: number,
  maxLines: number,
): TextFitDecision {
  const clean = text.trim();
  if (!clean) {
    return {
      originalText: text,
      text: "",
      fontSize,
      lineHeight,
      lineCount: 1,
      maxLines,
      omitted: true,
    };
  }

  if (estimateLines(clean, fontSize, maxWidth) <= maxLines) {
    return {
      originalText: text,
      text: clean,
      fontSize,
      lineHeight,
      lineCount: estimateLines(clean, fontSize, maxWidth),
      maxLines,
      omitted: false,
    };
  }

  const words = clean.split(/\s+/);
  let fitted = "";
  for (const word of words) {
    const candidate = fitted ? `${fitted} ${word}` : word;
    const withEllipsis = `${candidate}...`;
    if (estimateLines(withEllipsis, fontSize, maxWidth) > maxLines) break;
    fitted = candidate;
  }

  const textWithEllipsis = fitted ? `${fitted}...` : `${clean.slice(0, Math.max(3, Math.floor(maxWidth / (fontSize * 0.58)) - 3))}...`;
  return {
    originalText: text,
    text: textWithEllipsis,
    fontSize,
    lineHeight,
    lineCount: Math.min(maxLines, estimateLines(textWithEllipsis, fontSize, maxWidth)),
    maxLines,
    omitted: true,
  };
}

function nodeLabelFit(node: LaidOutNode): SceneLayoutNode {
  const labelMaxWidth = node.width - 90;
  const baseFontSize = node.label.length > 18 ? 18 : 22;
  const firstFit = fitText(node.label, baseFontSize, baseFontSize + 4, labelMaxWidth, 2);
  const labelFit = firstFit.omitted
    ? fitText(node.label, 16, 20, labelMaxWidth, 2)
    : firstFit;
  return {
    ...node,
    labelFit,
    labelX: node.x + 72,
    labelY: node.cy,
    labelMaxWidth,
  };
}

function blockTextGeometry(box: Rect, style: BlockStyle, blockCount: number): {
  iconX: number;
  iconY: number;
  textX: number;
  headingY: number;
  maxWidth: number;
  headingFontSize: number;
  headingLineHeight: number;
  descFontSize: number;
  descLineHeight: number;
} {
  if (box.height < 90) {
    return {
      iconX: box.x + 30,
      iconY: box.y + 34,
      textX: box.x + 70,
      headingY: box.y + 10,
      maxWidth: box.width - 88,
      headingFontSize: 20,
      headingLineHeight: 24,
      descFontSize: 16,
      descLineHeight: 20,
    };
  }

  const compact = blockCount > 3 || box.height < 100;
  if (style === "numbered") {
    return {
      iconX: box.x + 132,
      iconY: box.y + 42,
      textX: box.x + 178,
      headingY: box.y + 12,
      maxWidth: box.width - 190,
      headingFontSize: compact ? 22 : 26,
      headingLineHeight: compact ? 27 : 32,
      descFontSize: compact ? 17 : 20,
      descLineHeight: compact ? 23 : 27,
    };
  }
  return {
    iconX: box.x + 34,
    iconY: box.y + 36,
    textX: box.x + 76,
    headingY: box.y + 16,
    maxWidth: box.width - 96,
    headingFontSize: compact ? 22 : 27,
    headingLineHeight: compact ? 27 : 33,
    descFontSize: compact ? 17 : 20,
    descLineHeight: compact ? 23 : 27,
  };
}

function layoutBlocks(blocks: BriefBlock[], blockBoxes: Rect[], style: BlockStyle): SceneLayoutBlock[] {
  return blocks.flatMap((block, index) => {
    const box = blockBoxes[index];
    if (!box) return [];

    const geom = blockTextGeometry(box, style, blocks.length);
    const headingFit = fitText(
      block.heading,
      geom.headingFontSize,
      geom.headingLineHeight,
      geom.maxWidth,
      2,
    );
    const descY = geom.headingY + headingFit.lineCount * geom.headingLineHeight + 8;
    const availableDescHeight = Math.max(0, box.y + box.height - 12 - descY);
    const descMaxLines = Math.max(0, Math.min(2, Math.floor(availableDescHeight / geom.descLineHeight)));
    const descriptionFit = descMaxLines > 0
      ? fitText(block.description, geom.descFontSize, geom.descLineHeight, geom.maxWidth, descMaxLines)
      : {
          originalText: block.description,
          text: "",
          fontSize: geom.descFontSize,
          lineHeight: geom.descLineHeight,
          lineCount: 0,
          maxLines: 0,
          omitted: true,
        };

    return [{
      ...box,
      index,
      block,
      iconX: geom.iconX,
      iconY: geom.iconY,
      textX: geom.textX,
      headingY: geom.headingY,
      descY,
      maxWidth: geom.maxWidth,
      headingFit,
      descriptionFit,
    }];
  });
}

function regionsFor(strategy: DiagramLayout, canvas: CanvasBox): Record<LayoutRegionName, LayoutRegion> {
  const safeMargins = {
    name: "safeMargins" as const,
    x: SAFE_MARGIN,
    y: SAFE_MARGIN,
    width: canvas.width - SAFE_MARGIN * 2,
    height: canvas.height - SAFE_MARGIN * 2,
  };

  if (strategy === "stack") {
    return {
      safeMargins,
      headingBand: { name: "headingBand", ...HEADING_BAND },
      diagramRegion: { name: "diagramRegion", x: 790, y: 265, width: 990, height: 560 },
      blockRegion: { name: "blockRegion", x: 120, y: 265, width: 650, height: 560 },
    };
  }

  if (strategy === "client-server") {
    return {
      safeMargins,
      headingBand: { name: "headingBand", ...HEADING_BAND },
      diagramRegion: { name: "diagramRegion", x: 120, y: 260, width: 1680, height: 430 },
      blockRegion: { name: "blockRegion", x: 120, y: 720, width: 1680, height: 230 },
    };
  }

  if (strategy === "hub-spoke") {
    return {
      safeMargins,
      headingBand: { name: "headingBand", ...HEADING_BAND },
      diagramRegion: { name: "diagramRegion", x: 220, y: 285, width: 1480, height: 470 },
      blockRegion: { name: "blockRegion", x: 120, y: 770, width: 1680, height: 190 },
    };
  }

  return {
    safeMargins,
    headingBand: { name: "headingBand", ...HEADING_BAND },
    diagramRegion: { name: "diagramRegion", x: 120, y: 285, width: 1680, height: 230 },
    blockRegion: { name: "blockRegion", x: 120, y: 560, width: 1680, height: 180 },
  };
}

function textRect(
  id: string,
  x: number,
  y: number,
  fit: TextFitDecision,
  maxWidth: number,
  kind: Occupancy["kind"],
): Occupancy {
  return {
    id,
    kind,
    x,
    y,
    width: maxWidth,
    height: Math.max(1, fit.lineCount) * fit.lineHeight,
  };
}

function packetEnvelope(edge: SceneLayoutEdge): Rect {
  const xs = edge.path.map((point) => point.x);
  const ys = edge.path.map((point) => point.y);
  const pad = edge.packetLabel ? 54 : 22;
  return {
    x: Math.min(...xs) - pad,
    y: Math.min(...ys) - pad,
    width: Math.max(...xs) - Math.min(...xs) + pad * 2,
    height: Math.max(...ys) - Math.min(...ys) + pad * 2,
  };
}

function occupancyFor(plan: Omit<SceneLayoutPlan, "diagnostics">): Occupancy[] {
  const items: Occupancy[] = [
    { id: "heading-band", kind: "heading", ...plan.regions.headingBand },
  ];

  plan.nodes.forEach((node) => {
    items.push({ id: `node:${node.id}`, kind: "node", x: node.x, y: node.y, width: node.width, height: node.height });
  });

  plan.blocks.forEach((block) => {
    items.push({ id: `block:${block.index}`, kind: "block", x: block.x, y: block.y, width: block.width, height: block.height });
    items.push(textRect(
      `block-heading:${block.index}`,
      block.textX,
      block.headingY,
      block.headingFit,
      block.maxWidth,
      "block",
    ));
    if (block.descriptionFit.text) {
      items.push(textRect(
        `block-desc:${block.index}`,
        block.textX,
        block.descY,
        block.descriptionFit,
        block.maxWidth,
        "block",
      ));
    }
  });

  plan.edges.forEach((edge, index) => {
    if (edge.label) {
      items.push({
        id: `edge-label:${index}`,
        kind: "edgeLabel",
        x: edge.labelX - 130,
        y: edge.labelY - 18,
        width: 260,
        height: 36,
      });
    }
    if (edge.animated) {
      items.push({ id: `packet-path:${index}`, kind: "packetPath", ...packetEnvelope(edge) });
    }
  });

  return items;
}

function isAllowedOverlap(a: Occupancy, b: Occupancy): boolean {
  if (a.kind === "heading" && b.kind === "heading") return true;
  if (a.kind === "block" && b.kind === "block") {
    const aIndex = a.id.split(":")[1];
    const bIndex = b.id.split(":")[1];
    return aIndex === bIndex;
  }
  if ((a.kind === "packetPath" && b.kind === "node") || (a.kind === "node" && b.kind === "packetPath")) {
    return true;
  }
  return false;
}

function safeMarginViolations(items: Occupancy[], safe: Rect): number {
  return items.filter((item) =>
    item.x < safe.x ||
    item.y < safe.y ||
    item.x + item.width > safe.x + safe.width ||
    item.y + item.height > safe.y + safe.height
  ).length;
}

function collisionCount(items: Occupancy[]): number {
  let count = 0;
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (isAllowedOverlap(items[i], items[j])) continue;
      if (rectsOverlap(items[i], items[j])) count += 1;
    }
  }
  return count;
}

function makeVariantGraph(graph: BriefGraph, variant: LayoutVariant): BriefGraph {
  return {
    nodes: graph.nodes,
    edges: graph.edges.map((edge) => ({
      ...edge,
      label: variant.edgeLabels ? edge.label : undefined,
      packetLabel: variant.packetLabels ? edge.packetLabel : undefined,
    })),
  };
}

function omittedLabelCount(graph: BriefGraph, variant: LayoutVariant): number {
  return graph.edges.reduce((sum, edge) => {
    const edgeLabel = edge.label && !variant.edgeLabels ? 1 : 0;
    const packetLabel = edge.packetLabel && !variant.packetLabels ? 1 : 0;
    return sum + edgeLabel + packetLabel;
  }, 0);
}

function annotateEdges(
  originalGraph: BriefGraph,
  edges: LaidOutEdge[],
  variant: LayoutVariant,
): SceneLayoutEdge[] {
  return edges.map((edge) => {
    const original = originalGraph.edges.find((candidate) =>
      candidate.from === edge.from &&
      candidate.to === edge.to &&
      candidate.label === (edge.label ?? candidate.label)
    );
    return {
      ...edge,
      originalLabel: original?.label,
      originalPacketLabel: original?.packetLabel,
      labelOmitted: Boolean(original?.label && !variant.edgeLabels),
      packetLabelOmitted: Boolean(original?.packetLabel && !variant.packetLabels),
    };
  });
}

function buildCandidate(
  scene: Scene,
  requestedStrategy: DiagramLayout,
  strategy: DiagramLayout,
  variant: LayoutVariant,
  canvas: CanvasBox,
  fallbackApplied: boolean,
): CandidatePlan {
  const graph = makeVariantGraph(graphForStrategy(scene.graph, requestedStrategy, strategy), variant);
  const raw = layoutGraph(graph, scene.blocks, strategy, canvas);
  const regions = regionsFor(strategy, canvas);
  const nodes = raw.nodes.map(nodeLabelFit);
  const edges = annotateEdges(scene.graph, raw.edges, variant);
  const blocks = layoutBlocks(scene.blocks, raw.blockBoxes, scene.blockStyle);
  const basePlan = {
    requestedStrategy,
    strategy,
    variant: variant.name,
    regions,
    nodes,
    edges,
    blocks,
  };
  const occupancy = occupancyFor(basePlan);
  const collisions = collisionCount(occupancy);
  const safeViolations = safeMarginViolations(occupancy, regions.safeMargins);
  const omittedLabels = omittedLabelCount(scene.graph, variant);
  const omittedText = [
    ...nodes.map((node) => node.labelFit),
    ...blocks.flatMap((block) => [block.headingFit, block.descriptionFit]),
  ].filter((fit) => fit.omitted).length;
  const rolePenalty = semanticRolePenalty(scene.graph, strategy);
  const score = collisions * 1000 +
    safeViolations * 500 +
    rolePenalty * 300 +
    omittedLabels * 35 +
    omittedText * 12 +
    (fallbackApplied ? 25 : 0);

  return {
    ...basePlan,
    attempt: {
      strategy,
      variant: variant.name,
      score,
      collisions,
      safeMarginViolations: safeViolations,
      omittedLabels,
    },
    messages: [
      ...(omittedLabels > 0 ? [{
        severity: "info" as const,
        code: "labels-omitted",
        message: `${omittedLabels} edge or packet label(s) omitted for fit.`,
        sceneHeading: scene.heading,
        strategy,
        variant: variant.name,
      }] : []),
      ...(omittedText > 0 ? [{
        severity: "info" as const,
        code: "text-fit",
        message: `${omittedText} text field(s) shortened to fit the layout.`,
        sceneHeading: scene.heading,
        strategy,
        variant: variant.name,
      }] : []),
    ],
  };
}

function hasClientServerPlacementRoles(graph: BriefGraph): boolean {
  const roles = graph.nodes.map((node) => node.layoutRole);
  return roles.some((role) => role === "client" || role === "source") &&
    roles.some((role) => role === "server" || role === "sink");
}

function semanticRolePenalty(graph: BriefGraph, strategy: DiagramLayout): number {
  if (strategy === "client-server" && !hasClientServerPlacementRoles(graph)) return 1;
  if (strategy === "hub-spoke" && !graph.nodes.some((node) => node.layoutRole === "hub")) return 1;
  return 0;
}

function hubFirst(nodes: BriefGraphNode[]): BriefGraphNode[] {
  const hubIndex = nodes.findIndex((node) => node.layoutRole === "hub");
  if (hubIndex <= 0) return nodes;
  return [nodes[hubIndex], ...nodes.slice(0, hubIndex), ...nodes.slice(hubIndex + 1)];
}

function graphForStrategy(graph: BriefGraph, requested: DiagramLayout, strategy: DiagramLayout): BriefGraph {
  if (requested === "hub-spoke" && strategy === "stack") {
    return { ...graph, nodes: hubFirst(graph.nodes) };
  }
  return graph;
}

function fallbackStrategy(scene: Scene, bestAttempt: LayoutAttempt | undefined): DiagramLayout | undefined {
  switch (scene.diagramLayout) {
    case "pipeline":
    case "hub-spoke":
      return "stack";
    case "client-server":
      if (!hasClientServerPlacementRoles(scene.graph) || (bestAttempt && bestAttempt.collisions > 0)) {
        return "stack";
      }
      return undefined;
    case "stack":
    default:
      return undefined;
  }
}

function chooseCandidate(candidates: CandidatePlan[]): CandidatePlan {
  return [...candidates].sort((a, b) => {
    if (a.attempt.collisions !== b.attempt.collisions) return a.attempt.collisions - b.attempt.collisions;
    if (a.attempt.safeMarginViolations !== b.attempt.safeMarginViolations) {
      return a.attempt.safeMarginViolations - b.attempt.safeMarginViolations;
    }
    return a.attempt.score - b.attempt.score;
  })[0];
}

function successful(candidate: CandidatePlan): boolean {
  return candidate.attempt.collisions === 0 && candidate.attempt.safeMarginViolations === 0;
}

export function layoutScene(scene: Scene, canvas: CanvasBox): SceneLayoutPlan {
  const safeCanvas = {
    width: Math.max(canvas.width, 800),
    height: Math.max(canvas.height, 900),
  };
  const attempts: LayoutAttempt[] = [];
  const messages: LayoutDiagnostic[] = [];

  const requestedCandidates = VARIANTS.map((variant) =>
    buildCandidate(scene, scene.diagramLayout, scene.diagramLayout, variant, safeCanvas, false),
  );
  attempts.push(...requestedCandidates.map((candidate) => candidate.attempt));
  requestedCandidates.forEach((candidate) => messages.push(...candidate.messages));

  const requestedWinner = chooseCandidate(requestedCandidates);
  if (successful(requestedWinner)) {
    return {
      ...requestedWinner,
      diagnostics: {
        sceneHeading: scene.heading,
        requestedStrategy: scene.diagramLayout,
        chosenStrategy: requestedWinner.strategy,
        chosenVariant: requestedWinner.variant,
        fallbackApplied: false,
        attempts,
        messages,
      },
    };
  }

  const fallback = fallbackStrategy(scene, requestedWinner.attempt);
  if (fallback) {
    const fallbackCandidates = VARIANTS.map((variant) =>
      buildCandidate(scene, scene.diagramLayout, fallback, variant, safeCanvas, true),
    );
    attempts.push(...fallbackCandidates.map((candidate) => candidate.attempt));
    fallbackCandidates.forEach((candidate) => messages.push(...candidate.messages));

    const fallbackWinner = chooseCandidate(fallbackCandidates);
    if (fallbackWinner.attempt.score <= requestedWinner.attempt.score || successful(fallbackWinner)) {
      messages.push({
        severity: "warn",
        code: "layout-fallback",
        message: `Fell back from ${scene.diagramLayout} to ${fallback}.`,
        sceneHeading: scene.heading,
        strategy: fallback,
        variant: fallbackWinner.variant,
      });
      return {
        ...fallbackWinner,
        diagnostics: {
          sceneHeading: scene.heading,
          requestedStrategy: scene.diagramLayout,
          chosenStrategy: fallbackWinner.strategy,
          chosenVariant: fallbackWinner.variant,
          fallbackApplied: true,
          attempts,
          messages,
        },
      };
    }
  }

  messages.push({
    severity: "warn",
    code: "layout-crowded",
    message: `No collision-free layout variant found; using ${requestedWinner.strategy}/${requestedWinner.variant}.`,
    sceneHeading: scene.heading,
    strategy: requestedWinner.strategy,
    variant: requestedWinner.variant,
  });

  return {
    ...requestedWinner,
    diagnostics: {
      sceneHeading: scene.heading,
      requestedStrategy: scene.diagramLayout,
      chosenStrategy: requestedWinner.strategy,
      chosenVariant: requestedWinner.variant,
      fallbackApplied: false,
      attempts,
      messages,
    },
  };
}
