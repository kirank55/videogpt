import type {
  BriefGraph,
  BriefGraphEdge,
  BriefGraphNode,
  DiagramFamily,
  DrawingRole,
  PrimitiveRelationship,
  Scene,
  StoryboardOperation,
  StoryboardStage,
  VideoBrief,
  VisualPrimitive,
} from "@/lib/agent/schemas/brief";

export type NarrativeCompositionDiagnostics = {
  used: boolean;
  reason?: string;
  originalSceneCount: number;
  finalSceneCount: number;
  bypassReason?: string;
  setupSceneHeading?: string;
  mainSceneHeading?: string;
  mergedSceneCount?: number;
};

export type NarrativeCompositionResult = {
  brief: VideoBrief;
  diagnostics: NarrativeCompositionDiagnostics;
};

type IdMap = Map<string, string>;

const SETUP_TERMS = /\b(setup|context|intro|phase\s*1|step\s*1|start|initial|foundation|base|ground|source|input|components|actors|materials|site|problem)\b/i;
const EXPLICIT_MULTIPART_TERMS = /\b(?:make|create|generate|produce|write|show|as|into|in)\s+(?:a\s+)?(?:3|4|5|6|7|8|three|four|five|six|seven|eight)[-\s]*(?:part|parts|scene|scenes|chapter|chapters|section|sections|phase|phases)\b/i;

function normalized(value: string | undefined): string {
  return (value ?? "").toLowerCase();
}

function sceneText(scene: Scene): string {
  return [
    scene.heading,
    scene.diagramIntent.family,
    scene.diagramIntent.subject,
    scene.diagramIntent.perspective,
    scene.diagramScript.summary,
    scene.diagramScript.visualStory,
    ...(scene.diagramScript.beats ?? []),
    ...(scene.diagramIntent.signatureVisuals ?? []),
    ...scene.blocks.flatMap((block) => [block.heading, block.description]),
    ...(scene.visualPrimitives ?? []).flatMap((primitive) => [
      primitive.type,
      primitive.label,
      primitive.description,
      primitive.role,
      primitive.shapeHint,
      primitive.materialHint,
    ]),
  ].filter(Boolean).join(" ");
}

function bypassReason(userPrompt: string | undefined): string | undefined {
  if (!userPrompt) return undefined;
  if (EXPLICIT_MULTIPART_TERMS.test(userPrompt)) {
    return "user explicitly requested a multi-part video";
  }
  if (/\b(each|every)\s+(phase|step|chapter|section)\b/i.test(userPrompt)) {
    return "user explicitly requested separate sections";
  }
  return undefined;
}

function chooseSetupIndex(scenes: Scene[]): number {
  let bestIndex = 0;
  let bestScore = Number.NEGATIVE_INFINITY;
  scenes.forEach((scene, index) => {
    const text = sceneText(scene);
    const score = (SETUP_TERMS.test(text) ? 8 : 0)
      + (scene.diagramIntent.family === "spatial-cutaway" ? 2 : 0)
      + (index === 0 ? 5 : 0)
      - index;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function setupHeading(heading: string): string {
  const clean = heading.replace(/^\d+\.\s*/, "").trim();
  if (/^(setup|context|phase\s*1|step\s*1)\b/i.test(clean)) return clean;
  return `Phase 1: ${clean}`;
}

function chooseMainFamily(scenes: Scene[]): DiagramFamily {
  const counts = new Map<DiagramFamily, number>();
  scenes.forEach((scene) => {
    counts.set(scene.diagramIntent.family, (counts.get(scene.diagramIntent.family) ?? 0) + 1);
  });
  if ((counts.get("graph-flow") ?? 0) >= Math.ceil(scenes.length / 2)) return "graph-flow";
  const priority: DiagramFamily[] = ["comparison", "cycle", "field-range", "build-up", "timeline", "spatial-cutaway"];
  return priority.find((family) => counts.has(family)) ?? scenes[0].diagramIntent.family;
}

function cleanId(value: string, fallback: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return cleaned || fallback;
}

function uniqueId(base: string, used: Set<string>): string {
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function deriveDrawingRole(text: string, family: DiagramFamily): DrawingRole {
  const lower = normalized(text);
  if (/\b(range|ring|radius|coverage|orbit|wave)\b/.test(lower)) return "ring";
  if (/\b(receiver|satellite|sensor|pin|marker|actor|user|client|server|database|service)\b/.test(lower)) return "pin";
  if (/\b(flow|signal|packet|water|path|route|arrow|request|response)\b/.test(lower)) return "flow";
  if (/\b(soil|bedrock|layer|base|mat|foundation|ground|slab)\b/.test(lower)) return "layer";
  if (/\b(window|cladding|facade|panel|before|after|screen|state)\b/.test(lower)) return "panel";
  if (/\b(core|beam|column|pier|pile|support|frame|rebar|wall)\b/.test(lower)) return "support";
  if (/\b(container|pit|shell|boundary|box)\b/.test(lower)) return "container";
  if (family === "field-range") return "pin";
  if (family === "comparison") return "panel";
  if (family === "cycle") return "pin";
  return "mass";
}

function operationForRole(role: DrawingRole, index: number, family: DiagramFamily): StoryboardOperation {
  if (index === 0) return "reveal";
  if (role === "ring" || role === "flow" || role === "path") return "trace";
  if (role === "panel") return "fill";
  if (role === "support" || role === "mass" || family === "build-up" || family === "timeline") return "grow";
  if (family === "comparison" && index > 0) return "connect";
  return "reveal";
}

function primitiveFromNode(
  node: BriefGraphNode,
  sceneIndex: number,
  nodeIndex: number,
  family: DiagramFamily,
  used: Set<string>,
): VisualPrimitive {
  const id = uniqueId(cleanId(`${sceneIndex}-${node.id}`, `node-${sceneIndex}-${nodeIndex}`), used);
  return {
    id,
    type: node.kind ?? node.icon ?? node.label,
    label: node.label,
    drawingRole: deriveDrawingRole([node.label, node.icon, node.kind, node.layoutRole].filter(Boolean).join(" "), family),
  };
}

function primitiveFromBlock(
  scene: Scene,
  sceneIndex: number,
  blockIndex: number,
  family: DiagramFamily,
  used: Set<string>,
): VisualPrimitive {
  const block = scene.blocks[blockIndex];
  const id = uniqueId(cleanId(`${sceneIndex}-${block.heading}`, `block-${sceneIndex}-${blockIndex}`), used);
  return {
    id,
    type: block.heading,
    label: block.heading,
    description: block.description,
    drawingRole: deriveDrawingRole([block.heading, block.description, block.icon].filter(Boolean).join(" "), family),
  };
}

function clonePrimitive(
  primitive: VisualPrimitive,
  sceneIndex: number,
  primitiveIndex: number,
  family: DiagramFamily,
  used: Set<string>,
): { primitive: VisualPrimitive; originalId: string } {
  const id = uniqueId(cleanId(`${sceneIndex}-${primitive.id}`, `primitive-${sceneIndex}-${primitiveIndex}`), used);
  return {
    primitive: {
      ...primitive,
      id,
      drawingRole: primitive.drawingRole ?? deriveDrawingRole(sceneTextForPrimitive(primitive), family),
    },
    originalId: primitive.id,
  };
}

function sceneTextForPrimitive(primitive: VisualPrimitive): string {
  return [
    primitive.type,
    primitive.label,
    primitive.description,
    primitive.renderAs,
    primitive.shapeHint,
    primitive.materialHint,
    primitive.role,
    primitive.placementHint,
  ].filter(Boolean).join(" ");
}

function gatherPrimitivesForScene(
  scene: Scene,
  sceneIndex: number,
  family: DiagramFamily,
  used: Set<string>,
): { primitives: VisualPrimitive[]; idMap: IdMap } {
  const primitives: VisualPrimitive[] = [];
  const idMap: IdMap = new Map();

  (scene.visualPrimitives ?? []).forEach((primitive, primitiveIndex) => {
    const cloned = clonePrimitive(primitive, sceneIndex, primitiveIndex, family, used);
    primitives.push(cloned.primitive);
    idMap.set(cloned.originalId, cloned.primitive.id);
  });

  if (primitives.length === 0 && scene.graph.nodes.length > 0) {
    scene.graph.nodes.forEach((node, nodeIndex) => {
      const primitive = primitiveFromNode(node, sceneIndex, nodeIndex, family, used);
      primitives.push(primitive);
      idMap.set(node.id, primitive.id);
    });
  }

  if (primitives.length === 0) {
    scene.blocks.slice(0, 4).forEach((_, blockIndex) => {
      primitives.push(primitiveFromBlock(scene, sceneIndex, blockIndex, family, used));
    });
  }

  return { primitives, idMap };
}

function remapRelationships(scene: Scene, idMap: IdMap): PrimitiveRelationship[] {
  const fromPrimitiveRelationships = (scene.primitiveRelationships ?? []).map((relationship) => ({
    ...relationship,
    from: relationship.from.map((id) => idMap.get(id)).filter((id): id is string => Boolean(id)),
    to: relationship.to.map((id) => idMap.get(id)).filter((id): id is string => Boolean(id)),
  })).filter((relationship) => relationship.from.length > 0 && relationship.to.length > 0);

  const fromGraphEdges = scene.graph.edges.map((edge): PrimitiveRelationship | undefined => {
    const from = idMap.get(edge.from);
    const to = idMap.get(edge.to);
    if (!from || !to) return undefined;
    return {
      from: [from],
      to: [to],
      relation: edge.label ?? "flows to",
      motion: edge.animated ? "animated" : undefined,
    };
  }).filter((relationship): relationship is PrimitiveRelationship => Boolean(relationship));

  return [...fromPrimitiveRelationships, ...fromGraphEdges];
}

function remapStoryboard(scene: Scene, idMap: IdMap): StoryboardStage[] {
  return (scene.storyboard?.stages ?? []).map((stage) => ({
    ...stage,
    primitiveIds: stage.primitiveIds.map((id) => idMap.get(id)).filter((id): id is string => Boolean(id)),
  })).filter((stage) => stage.primitiveIds.length > 0);
}

function graphFromPrimitives(
  primitives: VisualPrimitive[],
  relationships: PrimitiveRelationship[],
): BriefGraph {
  const nodes: BriefGraphNode[] = primitives.slice(0, 8).map((primitive) => ({
    id: primitive.id,
    label: primitive.label,
  }));
  const known = new Set(nodes.map((node) => node.id));
  const edges: BriefGraphEdge[] = [];
  relationships.forEach((relationship, index) => {
    const from = relationship.from.find((id) => known.has(id));
    const to = relationship.to.find((id) => known.has(id));
    if (!from || !to || from === to) return;
    edges.push({
      from,
      to,
      label: relationship.relation.slice(0, 22),
      animated: index < 4,
    });
  });
  return { nodes, edges };
}

function graphFromScenes(scenes: Scene[]): BriefGraph {
  const nodes: BriefGraphNode[] = [];
  const edges: BriefGraphEdge[] = [];
  const idMap = new Map<string, string>();
  const used = new Set<string>();

  scenes.forEach((scene, sceneIndex) => {
    scene.graph.nodes.forEach((node, nodeIndex) => {
      const id = uniqueId(cleanId(`${sceneIndex}-${node.id}`, `node-${sceneIndex}-${nodeIndex}`), used);
      idMap.set(`${sceneIndex}:${node.id}`, id);
      nodes.push({ ...node, id });
    });
    scene.graph.edges.forEach((edge) => {
      const from = idMap.get(`${sceneIndex}:${edge.from}`);
      const to = idMap.get(`${sceneIndex}:${edge.to}`);
      if (from && to) edges.push({ ...edge, from, to });
    });
  });

  return { nodes: nodes.slice(0, 8), edges: edges.slice(0, 10) };
}

function fallbackStages(
  scene: Scene,
  primitives: VisualPrimitive[],
  family: DiagramFamily,
): StoryboardStage[] {
  const label = scene.heading.replace(/^\d+\.\s*/, "").slice(0, 34);
  const ids = primitives.map((primitive) => primitive.id);
  if (ids.length === 0) return [];
  if (family === "comparison" || family === "cycle") {
    return [{ label, operation: family === "cycle" ? "trace" : "connect", primitiveIds: ids.slice(0, 6) }];
  }
  return [{
    label,
    operation: operationForRole(primitives[0].drawingRole ?? "mass", 0, family),
    primitiveIds: ids.slice(0, 6),
  }];
}

function buildMergedScene(mainScenes: Scene[], setupScene: Scene): Scene {
  const family = chooseMainFamily(mainScenes);
  if (family === "graph-flow") {
    const graph = graphFromScenes(mainScenes);
    return {
      ...mainScenes[0],
      heading: "Main Diagram Animation",
      diagramScript: {
        summary: mainScenes.map((scene) => scene.diagramScript.summary).join(" "),
        beats: mainScenes.flatMap((scene) => scene.diagramScript.beats).slice(0, 8),
        visualStory: mainScenes.map((scene) => scene.diagramScript.visualStory).join(" "),
        mustShow: mainScenes.flatMap((scene) => scene.diagramScript.mustShow).slice(0, 8),
      },
      diagramIntent: {
        ...mainScenes[0].diagramIntent,
        family: "graph-flow",
        subject: mainScenes[0].diagramIntent.subject,
        signatureVisuals: mainScenes.flatMap((scene) => scene.diagramIntent.signatureVisuals).slice(0, 8),
        motionCues: mainScenes.flatMap((scene) => scene.diagramIntent.motionCues).slice(0, 8),
      },
      diagramLayout: "pipeline",
      blocks: mainScenes.flatMap((scene) => scene.blocks).slice(0, 3),
      graph,
      visualPrimitives: undefined,
      primitiveRelationships: undefined,
      storyboard: undefined,
      blockStyle: "timeline",
      emphasizeIndex: -1,
      sceneWeight: Math.max(2, mainScenes.length),
    };
  }

  const used = new Set<string>();
  const primitives: VisualPrimitive[] = [];
  const relationships: PrimitiveRelationship[] = [];
  const stages: StoryboardStage[] = [];

  mainScenes.forEach((scene, sceneIndex) => {
    const gathered = gatherPrimitivesForScene(scene, sceneIndex, family, used);
    primitives.push(...gathered.primitives);
    relationships.push(...remapRelationships(scene, gathered.idMap));
    const remapped = remapStoryboard(scene, gathered.idMap);
    stages.push(...(remapped.length > 0 ? remapped : fallbackStages(scene, gathered.primitives, family)));
  });

  const cappedPrimitives = primitives.slice(0, 12);
  const known = new Set(cappedPrimitives.map((primitive) => primitive.id));
  const cappedRelationships = relationships
    .map((relationship) => ({
      ...relationship,
      from: relationship.from.filter((id) => known.has(id)),
      to: relationship.to.filter((id) => known.has(id)),
    }))
    .filter((relationship) => relationship.from.length > 0 && relationship.to.length > 0)
    .slice(0, 12);
  const cappedStages = stages
    .map((stage, index) => ({
      label: stage.label.slice(0, 34),
      operation: stage.operation ?? operationForRole(cappedPrimitives[index]?.drawingRole ?? "mass", index, family),
      primitiveIds: stage.primitiveIds.filter((id) => known.has(id)).slice(0, 8),
    }))
    .filter((stage) => stage.primitiveIds.length > 0)
    .slice(0, 8);

  const blocks = mainScenes.flatMap((scene) => scene.blocks).slice(0, 3);
  return {
    ...mainScenes[0],
    heading: "Main Drawing Animation",
    diagramScript: {
      summary: mainScenes.map((scene) => scene.diagramScript.summary).join(" "),
      beats: cappedStages.map((stage) => stage.label),
      visualStory: `One continuous drawing builds from ${setupScene.heading} through ${mainScenes.map((scene) => scene.heading).join(", ")}.`,
      mustShow: cappedPrimitives.map((primitive) => primitive.label).slice(0, 8),
    },
    diagramIntent: {
      ...mainScenes[0].diagramIntent,
      family,
      subject: mainScenes[0].diagramIntent.subject,
      signatureVisuals: cappedPrimitives.map((primitive) => primitive.label).slice(0, 8),
      motionCues: mainScenes.flatMap((scene) => scene.diagramIntent.motionCues).slice(0, 8),
    },
    diagramLayout: "stack",
    blocks: blocks.length >= 2 ? blocks : setupScene.blocks.slice(0, 2),
    graph: graphFromPrimitives(cappedPrimitives, cappedRelationships),
    visualPrimitives: cappedPrimitives,
    primitiveRelationships: cappedRelationships,
    storyboard: {
      style: "line-drawing",
      continuityKey: cleanId(mainScenes[0].diagramIntent.subject, "main-animation"),
      stages: cappedStages.length > 0
        ? cappedStages
        : [{
            label: "Build",
            operation: "reveal",
            primitiveIds: cappedPrimitives.map((primitive) => primitive.id).slice(0, 6),
          }],
    },
    blockStyle: "timeline",
    emphasizeIndex: -1,
    sceneWeight: Math.max(2, mainScenes.length),
  };
}

function composeStructuredScenes(scenes: Scene[]): {
  scenes: Scene[];
  setupScene: Scene;
  mainScene: Scene;
  mergedSceneCount: number;
} {
  const setupIndex = chooseSetupIndex(scenes);
  const setupScene = {
    ...scenes[setupIndex],
    heading: setupHeading(scenes[setupIndex].heading),
    storyboard: undefined,
    blockStyle: "stacked" as const,
    emphasizeIndex: -1,
    sceneWeight: 1,
  };
  const remainingScenes = scenes.filter((_, index) => index !== setupIndex);
  const mainScenes = remainingScenes.length > 0 ? remainingScenes : [scenes[setupIndex]];
  const mainScene = buildMergedScene(mainScenes, setupScene);

  return {
    scenes: [setupScene, mainScene],
    setupScene,
    mainScene,
    mergedSceneCount: mainScenes.length,
  };
}

export function composeNarrativeBrief(
  brief: VideoBrief,
  options: { userPrompt?: string } = {},
): NarrativeCompositionResult {
  const originalSceneCount = brief.scenes.length;
  const bypass = bypassReason(options.userPrompt);

  if (bypass) {
    return {
      brief,
      diagnostics: {
        used: false,
        originalSceneCount,
        finalSceneCount: originalSceneCount,
        bypassReason: bypass,
      },
    };
  }

  const structured = composeStructuredScenes(brief.scenes);

  return {
    brief: {
      ...brief,
      scenes: structured.scenes,
    },
    diagnostics: {
      used: true,
      reason: "enforced title, phase 1, main animation, conclusion structure",
      originalSceneCount,
      finalSceneCount: structured.scenes.length,
      setupSceneHeading: structured.setupScene.heading,
      mainSceneHeading: structured.mainScene.heading,
      mergedSceneCount: structured.mergedSceneCount,
    },
  };
}
