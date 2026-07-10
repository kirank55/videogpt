import type {
  PrimitiveRelationship,
  Scene,
  VideoBrief,
  VisualPrimitive,
} from "@/lib/agent/schemas/brief";

export type PrimitiveSceneDiagnostic = {
  sceneIndex: number;
  heading: string;
  family: string;
  hardFailures: string[];
  retryReasons: string[];
  score: number;
  promptSpecificPrimitiveCount: number;
  relationshipCount: number;
};

export type PrimitiveDiagnostics = {
  score: number;
  /** True only for structural failures that make the brief unsafe to expand. */
  shouldRetry: boolean;
  hardFailures: string[];
  /** Soft quality issues that are reported in diagnostics but do not force a second model call. */
  retryReasons: string[];
  scenes: PrimitiveSceneDiagnostic[];
};

export type PrimitiveDiagnosticsOptions = {
  userPrompt?: string;
};

const GENERIC_TERMS = new Set([
  "process",
  "system",
  "component",
  "step",
  "input",
  "output",
  "layer",
  "item",
  "node",
  "element",
  "thing",
  "part",
  "object",
  "stage",
]);

const REAL_WORLD_PROCESS_TERMS = [
  "assemble",
  "assembled",
  "build",
  "building",
  "built",
  "construct",
  "constructed",
  "construction",
  "courtroom process",
  "factory",
  "logistics",
  "manufacture",
  "manufactured",
  "manufacturing",
  "shipping",
  "skyscraper",
  "skyscrapper",
  "supply chain",
];

const CHRONOLOGICAL_STAGE_TERMS = [
  "after",
  "before",
  "cladding",
  "core",
  "excavate",
  "excavation",
  "facade",
  "first",
  "foundation",
  "frame",
  "grand opening",
  "groundbreaking",
  "next",
  "opening",
  "phase",
  "stage",
  "step",
  "then",
  "topping out",
  "year",
];

function words(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function normalized(value: string): string {
  return words(value).join(" ");
}

function isGenericPrimitive(primitive: VisualPrimitive): boolean {
  const tokens = words(`${primitive.type} ${primitive.label}`);
  if (tokens.length === 0) return true;
  return tokens.every((token) => GENERIC_TERMS.has(token));
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
  ].filter(Boolean).join(" "));
}

function relationshipText(relationship: PrimitiveRelationship): string {
  return normalized([
    relationship.relation,
    relationship.visualMetaphor,
    relationship.motion,
  ].filter(Boolean).join(" "));
}

function hasTextMatch(needle: string, haystacks: string[]): boolean {
  const query = normalized(needle);
  if (!query) return true;
  return haystacks.some((haystack) => haystack.includes(query) || query.includes(haystack));
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(normalized(term)));
}

function isRealWorldProcessPrompt(userPrompt: string | undefined): boolean {
  const prompt = normalized(userPrompt ?? "");
  if (!prompt) return false;
  return includesAny(prompt, REAL_WORLD_PROCESS_TERMS);
}

function briefText(brief: VideoBrief): string {
  return normalized([
    brief.title,
    brief.subtitle,
    ...brief.scenes.flatMap((scene) => [
      scene.heading,
      scene.blockStyle,
      scene.diagramIntent.family,
      scene.diagramIntent.subject,
      scene.diagramScript.summary,
      scene.diagramScript.visualStory,
      ...(scene.diagramScript.beats ?? []),
      ...scene.blocks.flatMap((block) => [block.heading, block.description]),
      ...(scene.visualPrimitives ?? []).flatMap((primitive) => [
        primitive.type,
        primitive.label,
        primitive.description,
        primitive.role,
        primitive.motion,
      ]),
      ...(scene.primitiveRelationships ?? []).flatMap((relationship) => [
        relationship.relation,
        relationship.visualMetaphor,
        relationship.motion,
      ]),
    ]),
  ].filter(Boolean).join(" "));
}

function hasChronologicalProcessPlan(brief: VideoBrief): boolean {
  const text = briefText(brief);
  const hasTimelineFamily = brief.scenes.some((scene) => scene.diagramIntent.family === "timeline");
  const hasTimelineBlockStyle = brief.scenes.some((scene) =>
    scene.blockStyle === "timeline" || scene.blockStyle === "numbered",
  );
  const hasExplicitTimeOrStageLabel = /\b(month|year|week|day|phase|step)\s+[0-9]+\b/.test(text);
  const stageCueCount = CHRONOLOGICAL_STAGE_TERMS.filter((term) =>
    text.includes(normalized(term)),
  ).length;

  return hasTimelineFamily ||
    hasExplicitTimeOrStageLabel ||
    (hasTimelineBlockStyle && stageCueCount >= 3);
}

function processContinuityRetryReasons(
  brief: VideoBrief,
  options: PrimitiveDiagnosticsOptions,
): string[] {
  if (!isRealWorldProcessPrompt(options.userPrompt)) return [];
  if (hasChronologicalProcessPlan(brief)) return [];

  const prompt = normalized(options.userPrompt ?? "");
  const constructionTopic = includesAny(prompt, [
    "build",
    "built",
    "construct",
    "construction",
    "skyscraper",
    "skyscrapper",
  ]);
  const timelineKind = constructionTopic
    ? "chronological construction timeline"
    : "chronological process timeline";

  return [
    `${timelineKind} missing; use stage/time labels and make every middle scene show what is added next`,
  ];
}

function unknownRelationshipRefs(
  relationships: PrimitiveRelationship[],
  primitiveIds: Set<string>,
): string[] {
  const failures: string[] = [];
  relationships.forEach((relationship, index) => {
    const refs = [...relationship.from, ...relationship.to];
    const unknown = refs.filter((ref) => !primitiveIds.has(ref));
    if (unknown.length > 0) {
      failures.push(`relationship ${index + 1} references unknown primitive id(s): ${unknown.join(", ")}`);
    }
  });
  return failures;
}

function scoreScene(scene: Scene, sceneIndex: number): PrimitiveSceneDiagnostic {
  const family = scene.diagramIntent.family;
  const primitives = scene.visualPrimitives ?? [];
  const relationships = scene.primitiveRelationships ?? [];
  const hardFailures: string[] = [];
  const retryReasons: string[] = [];

  if (family === "graph-flow") {
    if (!scene.graph || scene.graph.nodes.length === 0) {
      hardFailures.push("graph-flow scene lacks a valid graph");
    }
    const score = hardFailures.length > 0 ? 0 : 92;
    return {
      sceneIndex,
      heading: scene.heading,
      family,
      hardFailures,
      retryReasons,
      score,
      promptSpecificPrimitiveCount: 0,
      relationshipCount: 0,
    };
  }

  if (primitives.length === 0) {
    hardFailures.push("primitive-first scene lacks visualPrimitives");
  }
  if (!scene.storyboard || scene.storyboard.stages.length === 0) {
    retryReasons.push("primitive-first scene lacks storyboard drawing stages");
  }

  const primitiveIds = new Set(primitives.map((primitive) => primitive.id));
  hardFailures.push(...unknownRelationshipRefs(relationships, primitiveIds));

  const promptSpecificPrimitives = primitives.filter((primitive) => !isGenericPrimitive(primitive));
  const genericPrimitiveCount = primitives.length - promptSpecificPrimitives.length;
  const primitiveHaystacks = primitives.map(primitiveText);
  const relationshipHaystacks = relationships.map(relationshipText);
  const allHaystacks = [...primitiveHaystacks, ...relationshipHaystacks].filter(Boolean);
  const missingMustShow = scene.diagramScript.mustShow.filter((visual) =>
    !hasTextMatch(visual, allHaystacks),
  );

  if (promptSpecificPrimitives.length < 3) {
    retryReasons.push(`needs at least 3 prompt-specific primitives; found ${promptSpecificPrimitives.length}`);
  }
  if (relationships.length < 2) {
    retryReasons.push(`needs at least 2 primitiveRelationships; found ${relationships.length}`);
  }
  if (genericPrimitiveCount > 0 && genericPrimitiveCount >= promptSpecificPrimitives.length) {
    retryReasons.push("primitive labels are mostly generic planning terms");
  }
  if (missingMustShow.length > 0) {
    retryReasons.push(`diagramScript.mustShow item(s) missing from primitives/relationships: ${missingMustShow.join(", ")}`);
  }

  let score = 100;
  score -= Math.max(0, 3 - promptSpecificPrimitives.length) * 18;
  score -= Math.max(0, 2 - relationships.length) * 16;
  score -= genericPrimitiveCount * 8;
  score -= missingMustShow.length * 10;
  score -= hardFailures.length * 35;
  score = Math.max(0, Math.min(100, score));

  return {
    sceneIndex,
    heading: scene.heading,
    family,
    hardFailures,
    retryReasons,
    score,
    promptSpecificPrimitiveCount: promptSpecificPrimitives.length,
    relationshipCount: relationships.length,
  };
}

export function analyzePrimitiveBrief(
  brief: VideoBrief,
  options: PrimitiveDiagnosticsOptions = {},
): PrimitiveDiagnostics {
  const scenes = brief.scenes.map((scene, index) => scoreScene(scene, index));
  const hardFailures = scenes.flatMap((scene) =>
    scene.hardFailures.map((failure) => `Scene ${scene.sceneIndex + 1} (${scene.heading}): ${failure}`),
  );
  const sceneRetryReasons = scenes.flatMap((scene) =>
    scene.retryReasons.map((reason) => `Scene ${scene.sceneIndex + 1} (${scene.heading}): ${reason}`),
  );
  const processRetryReasons = processContinuityRetryReasons(brief, options);
  const retryReasons = [...sceneRetryReasons, ...processRetryReasons];
  const baseScore = scenes.length > 0
    ? Math.round(scenes.reduce((sum, scene) => sum + scene.score, 0) / scenes.length)
    : 0;
  const score = Math.max(0, baseScore - processRetryReasons.length * 18);

  return {
    score,
    shouldRetry: hardFailures.length > 0,
    hardFailures,
    retryReasons,
    scenes,
  };
}

export function formatPrimitiveDiagnosticsForRetry(diagnostics: PrimitiveDiagnostics): string {
  return [
    `Visual specificity score: ${diagnostics.score}/100.`,
    ...diagnostics.hardFailures.map((failure) => `Hard failure: ${failure}`),
    ...diagnostics.retryReasons.map((reason) => `Retry reason: ${reason}`),
    "Revise the JSON brief only. Keep the same user request, but make non-graph scenes primitive-first with specific visualPrimitives, primitiveRelationships, drawingRole values, and storyboard stages.",
  ].join("\n");
}
