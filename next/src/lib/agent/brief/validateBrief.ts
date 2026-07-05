import { z } from "zod";
import type {
  BriefBlock,
  BriefGraph,
  BriefGraphEdge,
  BriefGraphNode,
  DiagramFamily,
  DiagramLayout,
  DiagramScript,
  PrimitiveRelationship,
  Scene,
  VisualPrimitive,
  VideoBrief,
} from "@/lib/agent/schemas/brief";
import {
  BlockStyleSchema,
  ClosingStyleSchema,
  DiagramFamilySchema,
  DiagramPerspectiveSchema,
  DiagramLayoutSchema,
  DrawingRoleSchema,
  EntryAnimationSchema,
  ICON_NAMES,
  LayoutRoleSchema,
  PrimitiveTimingRoleSchema,
  StoryboardOperationSchema,
  TRANSITION_PRESETS,
  TitleSizeSchema,
  TransitionPresetSchema,
} from "@/lib/agent/schemas/brief";
import { EasingNameSchema } from "@/lib/others/schemas/timeline";
import { DEFAULT_PALETTE, PALETTES } from "@/lib/others/catalog/palettes";
import { DEFAULT_STYLE, STYLES } from "@/lib/others/catalog/styles";
import { SCENE_CONTENT_BUDGETS } from "@/lib/agent/brief/sceneLayout/constants";

const VALID_PALETTES = new Set(Object.keys(PALETTES));
const VALID_STYLES = new Set(Object.keys(STYLES));

const IconNameSchema = z.enum(ICON_NAMES).catch("gear");
const EasingSchema = EasingNameSchema.catch("easeInOut");
const LenientLayoutRoleSchema = LayoutRoleSchema.optional().catch(undefined);
const LenientDrawingRoleSchema = DrawingRoleSchema.optional().catch(undefined);

const LenientBlockSchema = z.object({
  heading: z.string().min(1).catch("Key Point"),
  description: z.string().min(1).catch("An important detail."),
  icon: IconNameSchema.optional().catch(undefined),
}).catch({ heading: "Key Point", description: "An important detail." });

const LenientDiagramScriptSchema = z.object({
  summary: z.string().min(1).catch("Diagram summary"),
  beats: z.array(z.string().min(1)).transform((a) => a.slice(0, 6)).optional().catch(undefined),
  visualStory: z.string().min(1).catch("Show the main mechanism visually."),
  mustShow: z.array(z.string().min(1)).transform((a) => a.slice(0, 8)).optional().catch(undefined),
  mustAvoid: z.array(z.string().min(1)).transform((a) => a.slice(0, 8)).optional().catch(undefined),
}).optional().catch(undefined);

const LenientDiagramIntentSchema = z.object({
  family: DiagramFamilySchema.optional().catch(undefined),
  subject: z.string().min(1).optional().catch(undefined),
  perspective: DiagramPerspectiveSchema.optional().catch(undefined),
  signatureVisuals: z.array(z.string().min(1)).transform((a) => a.slice(0, 8)).optional().catch(undefined),
  motionCues: z.array(z.string().min(1)).transform((a) => a.slice(0, 8)).optional().catch(undefined),
  avoid: z.array(z.string().min(1)).transform((a) => a.slice(0, 8)).optional().catch(undefined),
}).optional().catch(undefined);

const LenientNodeSchema = z.object({
  id: z.string().min(1).catch("node"),
  label: z.string().min(1).catch("Node"),
  icon: IconNameSchema.optional().catch(undefined),
  kind: z.string().optional().catch(undefined),
  layoutRole: LenientLayoutRoleSchema,
  color: z.string().optional().catch(undefined),
}).catch({ id: "node", label: "Node" });

const LenientEdgeSchema = z.object({
  from: z.string().min(1).catch(""),
  to: z.string().min(1).catch(""),
  label: z.string().optional().catch(undefined),
  animated: z.boolean().optional().catch(undefined),
  packetLabel: z.string().optional().catch(undefined),
  packetColor: z.string().optional().catch(undefined),
}).catch({ from: "", to: "" });

const LenientGraphSchema = z.object({
  nodes: z.array(LenientNodeSchema).transform((a) => a.slice(0, 8)).optional().catch(undefined),
  edges: z.array(LenientEdgeSchema).transform((a) => a.slice(0, 12)).optional().catch(undefined),
}).catch({});

const LenientVisualPrimitiveSchema = z.object({
  id: z.string().min(1).catch("primitive"),
  type: z.string().min(1).catch("primitive"),
  label: z.string().min(1).catch("Primitive"),
  description: z.string().optional().catch(undefined),
  renderAs: z.string().optional().catch(undefined),
  shapeHint: z.string().optional().catch(undefined),
  materialHint: z.string().optional().catch(undefined),
  role: z.string().optional().catch(undefined),
  placementHint: z.string().optional().catch(undefined),
  motion: z.string().optional().catch(undefined),
  styleHint: z.string().optional().catch(undefined),
  dependsOn: z.array(z.string().min(1)).transform((a) => a.slice(0, 8)).optional().catch(undefined),
  drawingRole: LenientDrawingRoleSchema,
}).catch({ id: "primitive", type: "primitive", label: "Primitive" });

const LenientPrimitiveRelationshipSchema = z.object({
  from: z.array(z.string().min(1)).transform((a) => a.slice(0, 8)).catch([]),
  to: z.array(z.string().min(1)).transform((a) => a.slice(0, 8)).catch([]),
  relation: z.string().min(1).catch("relates to"),
  visualMetaphor: z.string().optional().catch(undefined),
  motion: z.string().optional().catch(undefined),
  timingRole: PrimitiveTimingRoleSchema.optional().catch(undefined),
}).catch({ from: [], to: [], relation: "relates to" });

const LenientStoryboardStageSchema = z.object({
  label: z.string().min(1).catch("Stage"),
  operation: StoryboardOperationSchema.catch("reveal"),
  primitiveIds: z.array(z.string().min(1)).transform((a) => a.slice(0, 8)).catch([]),
}).catch({ label: "Stage", operation: "reveal" as const, primitiveIds: [] });

const LenientStoryboardSchema = z.object({
  style: z.literal("line-drawing").catch("line-drawing"),
  continuityKey: z.string().optional().catch(undefined),
  stages: z.array(LenientStoryboardStageSchema).transform((a) => a.slice(0, 8)).catch([]),
}).optional().catch(undefined);

const LenientSceneSchema = z.object({
  heading: z.string().min(1).catch("Scene"),
  diagramScript: LenientDiagramScriptSchema,
  diagramIntent: LenientDiagramIntentSchema,
  diagramLayout: DiagramLayoutSchema.catch("stack"),
  blocks: z.array(LenientBlockSchema).transform((a) => a.slice(0, 5)).optional().catch(undefined),
  graph: LenientGraphSchema.optional().catch(undefined),
  visualPrimitives: z.array(LenientVisualPrimitiveSchema).transform((a) => a.slice(0, 12)).optional().catch(undefined),
  primitiveRelationships: z.array(LenientPrimitiveRelationshipSchema).transform((a) => a.slice(0, 12)).optional().catch(undefined),
  storyboard: LenientStoryboardSchema,
  entryAnimation: EntryAnimationSchema.optional().catch(undefined),
  blockStyle: BlockStyleSchema.optional().catch(undefined),
  emphasizeIndex: z.number().int().min(-1).max(4).optional().catch(undefined),
  transition: TransitionPresetSchema.optional().catch(undefined),
  actEasings: z.object({
    heading: EasingSchema.optional().catch(undefined),
    content: EasingSchema.optional().catch(undefined),
    flow: EasingSchema.optional().catch(undefined),
  }).optional().catch(undefined),
  colorOverrides: z.object({
    accent1: z.string().optional().catch(undefined),
    accent2: z.string().optional().catch(undefined),
    surface: z.string().optional().catch(undefined),
  }).optional().catch(undefined),
  sceneWeight: z.number().positive().optional().catch(undefined),
}).catch({ heading: "Scene", diagramLayout: "stack" });

const LenientBriefSchema = z.preprocess(
  (v) => (v !== null && typeof v === "object" && !Array.isArray(v) ? v : {}),
  z.object({
    title: z.string().min(1).catch("Untitled"),
    subtitle: z.string().optional().catch(undefined),
    closingLine: z.string().optional().catch(undefined),
    palette: z.string().min(1).catch(DEFAULT_PALETTE),
    style: z.string().min(1).catch(DEFAULT_STYLE),
    particleIntensity: z.number().min(0).max(3).optional().catch(undefined),
    titleSize: TitleSizeSchema.optional().catch(undefined),
    titleAlign: z.enum(["left", "center"]).optional().catch(undefined),
    closingStyle: ClosingStyleSchema.optional().catch(undefined),
    decorations: z.object({
      cornerBrackets: z.boolean().optional().catch(undefined),
      scanLines: z.boolean().optional().catch(undefined),
      pulseRings: z.boolean().optional().catch(undefined),
      gapDivider: z.boolean().optional().catch(undefined),
      decoBaseline: z.boolean().optional().catch(undefined),
    }).optional().catch(undefined),

    scenes: z.array(LenientSceneSchema).transform((a) => a.slice(0, 8)).optional().catch(undefined),
  }),
);

type LenientBrief = z.infer<typeof LenientBriefSchema>;
type LenientScene = z.infer<typeof LenientSceneSchema>;

const DEFAULT_BLOCKS: BriefBlock[] = [
  { heading: "Key Point", description: "An important insight to share." },
  { heading: "Key Detail", description: "Another crucial piece of the puzzle." },
];

function normalisePalette(raw: string): string {
  return VALID_PALETTES.has(raw) ? raw : DEFAULT_PALETTE;
}

function normaliseStyle(raw: string): string {
  return VALID_STYLES.has(raw) ? raw : DEFAULT_STYLE;
}

function slugId(value: string, fallback: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function normaliseBlocks(raw: LenientScene["blocks"], layout: DiagramLayout): BriefBlock[] {
  const budget = SCENE_CONTENT_BUDGETS[layout];
  const blocks = (raw ?? []).filter((block): block is BriefBlock =>
    block !== null && typeof block === "object" && Boolean(block.heading) && Boolean(block.description),
  );
  const count = Math.max(2, Math.min(budget.maxBlocks, blocks.length || 2));
  return [...blocks, ...DEFAULT_BLOCKS].slice(0, count);
}

function graphFromBlocks(blocks: BriefBlock[], layout: DiagramLayout): BriefGraph {
  const nodes = blocks.map((block, index) => ({
    id: slugId(block.heading, `node-${index + 1}`),
    label: block.heading,
    icon: block.icon,
  }));

  const edges =
    layout === "hub-spoke"
      ? nodes.slice(1).map((node) => ({ from: nodes[0].id, to: node.id, animated: true }))
      : nodes.slice(1).map((node, index) => ({
          from: nodes[index].id,
          to: node.id,
          animated: index === 0,
        }));

  return { nodes, edges };
}

function defaultDiagramFamily(layout: DiagramLayout): DiagramFamily {
  return layout === "client-server" || layout === "hub-spoke" || layout === "pipeline" || layout === "stack"
    ? "graph-flow"
    : "graph-flow";
}

function normaliseDiagramScript(
  raw: LenientScene["diagramScript"],
  heading: string,
  blocks: BriefBlock[],
): DiagramScript {
  return {
    summary: raw?.summary ?? heading,
    beats: raw?.beats && raw.beats.length > 0
      ? raw.beats
      : blocks.slice(0, 3).map((block) => block.heading),
    visualStory: raw?.visualStory ?? `Show ${heading} as a clear visual mechanism.`,
    mustShow: raw?.mustShow ?? blocks.slice(0, 3).map((block) => block.heading),
    mustAvoid: raw?.mustAvoid,
  };
}

function normaliseDiagramIntent(
  raw: LenientScene["diagramIntent"],
  heading: string,
  layout: DiagramLayout,
  script: DiagramScript,
): Scene["diagramIntent"] {
  const family = raw?.family ?? defaultDiagramFamily(layout);
  return {
    family,
    subject: raw?.subject ?? heading,
    perspective: raw?.perspective,
    signatureVisuals: raw?.signatureVisuals ?? script.mustShow,
    motionCues: raw?.motionCues ?? [],
    avoid: raw?.avoid,
  };
}

function normaliseVisualPrimitives(raw: LenientScene["visualPrimitives"]): VisualPrimitive[] {
  const primitives: VisualPrimitive[] = [];
  const used = new Set<string>();

  for (const item of raw ?? []) {
    const base = item.id.trim() || slugId(item.label || item.type, `primitive-${primitives.length + 1}`);
    let id = base;
    let suffix = 2;
    while (used.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(id);
    primitives.push({
      id,
      type: item.type,
      label: item.label,
      description: item.description,
      renderAs: item.renderAs,
      shapeHint: item.shapeHint,
      materialHint: item.materialHint,
      role: item.role,
      placementHint: item.placementHint,
      motion: item.motion,
      styleHint: item.styleHint,
      dependsOn: item.dependsOn,
      drawingRole: item.drawingRole,
    });
  }

  return primitives;
}

function normaliseStoryboard(
  raw: LenientScene["storyboard"],
  primitives: VisualPrimitive[],
): Scene["storyboard"] {
  if (!raw) return undefined;

  const primitiveIds = new Set(primitives.map((primitive) => primitive.id));
  const stages = raw.stages
    .map((stage) => ({
      label: stage.label,
      operation: stage.operation,
      primitiveIds: [...new Set(stage.primitiveIds)].filter((id) => primitiveIds.has(id)),
    }))
    .filter((stage) => stage.primitiveIds.length > 0);

  if (stages.length === 0) return undefined;

  return {
    style: "line-drawing",
    continuityKey: raw.continuityKey,
    stages,
  };
}

function normalisePrimitiveRelationships(
  raw: LenientScene["primitiveRelationships"],
): PrimitiveRelationship[] {
  return (raw ?? [])
    .filter((relationship) => relationship.from.length > 0 && relationship.to.length > 0)
    .map((relationship) => ({
      from: relationship.from,
      to: relationship.to,
      relation: relationship.relation,
      visualMetaphor: relationship.visualMetaphor,
      motion: relationship.motion,
      timingRole: relationship.timingRole,
    }));
}

function graphFromPrimitives(
  primitives: VisualPrimitive[],
  relationships: PrimitiveRelationship[],
  blocks: BriefBlock[],
  layout: DiagramLayout,
): BriefGraph {
  if (primitives.length === 0) return graphFromBlocks(blocks, layout);

  const nodes = primitives.slice(0, SCENE_CONTENT_BUDGETS[layout].maxNodes).map((primitive) => ({
    id: primitive.id,
    label: primitive.label,
    kind: primitive.type,
  }));
  const ids = new Set(nodes.map((node) => node.id));
  const edges = relationships.flatMap((relationship) =>
    relationship.from.flatMap((from) =>
      relationship.to.map((to) => ({
        from,
        to,
        label: relationship.relation,
        animated: Boolean(relationship.motion),
        packetLabel: relationship.motion,
      })),
    ),
  ).filter((edge) => ids.has(edge.from) && ids.has(edge.to) && edge.from !== edge.to);

  return {
    nodes,
    edges: trimEdgesToBudget(edges, layout),
  };
}

function trimNodesToBudget(
  nodes: BriefGraphNode[],
  edges: BriefGraphEdge[],
  layout: DiagramLayout,
): BriefGraphNode[] {
  const maxNodes = SCENE_CONTENT_BUDGETS[layout].maxNodes;
  if (nodes.length <= maxNodes) return nodes;

  const animatedRefs = new Set<string>();
  for (const edge of edges) {
    if (!edge.animated) continue;
    animatedRefs.add(edge.from);
    animatedRefs.add(edge.to);
  }

  const dropped = new Set<string>();
  for (let index = nodes.length - 1; index >= 0 && nodes.length - dropped.size > maxNodes; index -= 1) {
    const node = nodes[index];
    if (!animatedRefs.has(node.id)) dropped.add(node.id);
  }
  for (let index = nodes.length - 1; index >= 0 && nodes.length - dropped.size > maxNodes; index -= 1) {
    dropped.add(nodes[index].id);
  }

  return nodes.filter((node) => !dropped.has(node.id));
}

function trimEdgesToBudget(edges: BriefGraphEdge[], layout: DiagramLayout): BriefGraphEdge[] {
  const budget = SCENE_CONTENT_BUDGETS[layout];
  let remaining = edges;

  const animatedEdges = remaining.filter((edge) => edge.animated);
  if (animatedEdges.length > budget.maxAnimatedEdges) {
    let keptAnimated = 0;
    remaining = remaining.filter((edge) => {
      if (!edge.animated) return true;
      keptAnimated += 1;
      return keptAnimated <= budget.maxAnimatedEdges;
    });
  }

  if (remaining.length <= budget.maxEdges) return remaining;

  const drop = new Set<number>();
  for (let index = remaining.length - 1; index >= 0 && remaining.length - drop.size > budget.maxEdges; index -= 1) {
    if (!remaining[index].animated) drop.add(index);
  }
  for (let index = remaining.length - 1; index >= 0 && remaining.length - drop.size > budget.maxEdges; index -= 1) {
    drop.add(index);
  }

  return remaining.filter((_, index) => !drop.has(index));
}

function normaliseGraph(raw: LenientScene["graph"], blocks: BriefBlock[], layout: DiagramLayout): BriefGraph {
  const fallback = graphFromBlocks(blocks, layout);
  const rawNodes = raw?.nodes ?? [];
  const nodes: BriefGraphNode[] = [];
  const idMap = new Map<string, string>();
  const used = new Set<string>();

  for (const rawNode of rawNodes) {
    const original = rawNode.id || rawNode.label || `node-${nodes.length + 1}`;
    const base = slugId(original, `node-${nodes.length + 1}`);
    let id = base;
    let suffix = 2;
    while (used.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(id);
    if (!idMap.has(original)) idMap.set(original, id);
    idMap.set(rawNode.id, id);
    nodes.push({
      id,
      label: rawNode.label,
      icon: rawNode.icon,
      kind: rawNode.kind,
      layoutRole: rawNode.layoutRole,
      color: rawNode.color,
    });
  }

  if (nodes.length === 0) return fallback;

  const ids = new Set(nodes.map((node) => node.id));
  const edges: BriefGraphEdge[] = [];
  for (const edge of raw?.edges ?? []) {
    const from = idMap.get(edge.from) ?? edge.from;
    const to = idMap.get(edge.to) ?? edge.to;
    if (!ids.has(from) || !ids.has(to) || from === to) continue;
    edges.push({
      from,
      to,
      label: edge.label,
      animated: edge.animated,
      packetLabel: edge.packetLabel,
      packetColor: edge.packetColor,
    });
  }

  const budgetedNodes = trimNodesToBudget(nodes, edges, layout);
  const budgetedIds = new Set(budgetedNodes.map((node) => node.id));
  const budgetedEdges = trimEdgesToBudget(edges.filter(
    (edge) => budgetedIds.has(edge.from) && budgetedIds.has(edge.to),
  ), layout);

  return {
    nodes: budgetedNodes,
    edges: budgetedEdges.length > 0 ? budgetedEdges : graphFromBlocks(blocks, layout).edges.filter(
      (edge) => ids.has(edge.from) && ids.has(edge.to),
    ).filter((edge) => budgetedIds.has(edge.from) && budgetedIds.has(edge.to)),
  };
}

function defaultScene(parsed: LenientBrief): LenientScene {
  return {
    heading: parsed.subtitle ?? parsed.title,
    diagramScript: {
      summary: parsed.subtitle ?? parsed.title,
      beats: DEFAULT_BLOCKS.map((block) => block.heading),
      visualStory: "Show the fallback points as a simple graph-flow diagram.",
      mustShow: DEFAULT_BLOCKS.map((block) => block.heading),
    },
    diagramIntent: {
      family: "graph-flow",
      subject: parsed.subtitle ?? parsed.title,
      signatureVisuals: DEFAULT_BLOCKS.map((block) => block.heading),
      motionCues: ["step through the fallback points"],
    },
    diagramLayout: "stack",
    blocks: DEFAULT_BLOCKS,
    graph: graphFromBlocks(DEFAULT_BLOCKS, "stack"),
    entryAnimation: "slide-up",
    blockStyle: "cards",
    transition: "fade",
  };
}

function normaliseScene(raw: LenientScene, index: number, title: string): Scene {
  const layout = raw.diagramLayout ?? "stack";
  const heading = raw.heading || (index === 0 ? title : `Scene ${index + 1}`);
  const blocks = normaliseBlocks(raw.blocks, layout);
  const diagramScript = normaliseDiagramScript(raw.diagramScript, heading, blocks);
  const diagramIntent = normaliseDiagramIntent(raw.diagramIntent, heading, layout, diagramScript);
  const visualPrimitives = normaliseVisualPrimitives(raw.visualPrimitives);
  const primitiveRelationships = normalisePrimitiveRelationships(raw.primitiveRelationships);
  const storyboard = normaliseStoryboard(raw.storyboard, visualPrimitives);
  const transition = raw.transition ?? TRANSITION_PRESETS[(index + 1) % TRANSITION_PRESETS.length];
  const graphFallback = graphFromPrimitives(visualPrimitives, primitiveRelationships, blocks, layout);
  const graph = raw.graph
    ? normaliseGraph(raw.graph, blocks, layout)
    : graphFallback;

  return {
    heading,
    diagramScript,
    diagramIntent,
    diagramLayout: layout,
    blocks,
    graph,
    visualPrimitives,
    primitiveRelationships,
    storyboard,
    entryAnimation: raw.entryAnimation ?? "slide-up",
    blockStyle: raw.blockStyle ?? "cards",
    emphasizeIndex: raw.emphasizeIndex ?? 0,
    transition,
    actEasings: raw.actEasings,
    colorOverrides: raw.colorOverrides,
    sceneWeight: raw.sceneWeight,
  };
}

export function validateBrief(raw: unknown): VideoBrief {
  const parsed = LenientBriefSchema.parse(raw);
  const rawScenes =
    parsed.scenes && parsed.scenes.length > 0
      ? parsed.scenes
      : [defaultScene(parsed)];

  return {
    title: parsed.title,
    subtitle: parsed.subtitle,
    closingLine: parsed.closingLine,
    palette: normalisePalette(parsed.palette),
    style: normaliseStyle(parsed.style),
    particleIntensity: parsed.particleIntensity,
    decorations: parsed.decorations,
    titleSize: parsed.titleSize,
    titleAlign: parsed.titleAlign,
    closingStyle: parsed.closingStyle,
    scenes: rawScenes.map((scene, index) => normaliseScene(scene, index, parsed.title)),
  };
}
