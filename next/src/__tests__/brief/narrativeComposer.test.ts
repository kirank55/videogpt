import { describe, expect, it } from "vitest";
import { composeNarrativeBrief } from "@/lib/agent/brief/narrativeComposer";
import { validateBrief } from "@/lib/agent/brief/validateBrief";
import type { DiagramFamily, VideoBrief } from "@/lib/agent/schemas/brief";

function primitiveScene(heading: string, family: DiagramFamily, index: number) {
  const id = heading.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const role = family === "comparison"
    ? "panel"
    : family === "field-range"
      ? "pin"
      : family === "cycle"
        ? "pin"
        : family === "spatial-cutaway"
          ? "layer"
          : "mass";
  return {
    heading,
    diagramScript: {
      summary: `Explain ${heading}.`,
      beats: [`${heading} starts`, `${heading} changes`],
      visualStory: `${heading} appears as part of one continuous explanation.`,
      mustShow: [`${heading} A`, `${heading} B`],
    },
    diagramIntent: {
      family,
      subject: `${heading} subject`,
      signatureVisuals: [`${heading} A`, `${heading} B`],
      motionCues: ["draw in stages"],
    },
    diagramLayout: "stack",
    blocks: [
      { heading: `${heading} A`, description: "First detail." },
      { heading: `${heading} B`, description: "Second detail." },
    ],
    visualPrimitives: [
      { id: `${id}-a`, type: `${heading} A`, label: `${heading} A`, drawingRole: role },
      { id: `${id}-b`, type: `${heading} B`, label: `${heading} B`, drawingRole: role },
    ],
    primitiveRelationships: [
      { from: [`${id}-a`], to: [`${id}-b`], relation: "leads to" },
    ],
    storyboard: {
      style: "line-drawing",
      stages: [
        { label: heading, operation: index === 0 ? "reveal" : "grow", primitiveIds: [`${id}-a`, `${id}-b`] },
      ],
    },
    entryAnimation: "slide-up",
    blockStyle: "cards",
    transition: "fade",
  };
}

function graphScene(heading: string, index: number) {
  return {
    heading,
    diagramScript: {
      summary: `Show ${heading} as a graph.`,
      beats: [`${heading} source`, `${heading} target`],
      visualStory: `${heading} moves through a system.`,
      mustShow: [`${heading} source`, `${heading} target`],
    },
    diagramIntent: {
      family: "graph-flow",
      subject: `${heading} system`,
      signatureVisuals: [`${heading} source`, `${heading} target`],
      motionCues: ["packet moves"],
    },
    diagramLayout: index === 0 ? "client-server" : "pipeline",
    blocks: [
      { heading: `${heading} source`, description: "Source." },
      { heading: `${heading} target`, description: "Target." },
    ],
    graph: {
      nodes: [
        { id: `${index}-source`, label: `${heading} source` },
        { id: `${index}-target`, label: `${heading} target` },
      ],
      edges: [{ from: `${index}-source`, to: `${index}-target`, animated: true }],
    },
    entryAnimation: "slide-up",
    blockStyle: "cards",
    transition: "fade",
  };
}

function briefWithScenes(scenes: Array<Record<string, unknown>>): VideoBrief {
  return validateBrief({
    title: "Narrative Test",
    subtitle: "One coherent explanation",
    closingLine: "That is the idea.",
    palette: "slate",
    style: "modern",
    scenes,
  });
}

describe("composeNarrativeBrief", () => {
  it("normalizes a five-scene explainer into setup and main animation scenes", () => {
    const brief = briefWithScenes([
      primitiveScene("Phase 1: Foundation Setup", "spatial-cutaway", 0),
      primitiveScene("Phase 2: Build", "build-up", 1),
      primitiveScene("Phase 3: Flow", "field-range", 2),
      primitiveScene("Phase 4: Cycle", "cycle", 3),
      primitiveScene("Phase 5: Result", "comparison", 4),
    ]);

    const result = composeNarrativeBrief(brief, { userPrompt: "explain how this works" });

    expect(result.diagnostics).toMatchObject({
      used: true,
      originalSceneCount: 5,
      finalSceneCount: 2,
      mergedSceneCount: 4,
    });
    expect(result.brief.scenes).toHaveLength(2);
    expect(result.brief.scenes[0].heading).toContain("Foundation Setup");
    expect(result.brief.scenes[1].heading).toBe("Main Drawing Animation");
    expect(result.brief.scenes[1].storyboard?.stages.length).toBeGreaterThanOrEqual(4);
  });

  it("enforces phase 1 plus main drawing animation even when the brief already has two scenes", () => {
    const brief = briefWithScenes([
      primitiveScene("The Challenge Of Height", "spatial-cutaway", 0),
      primitiveScene("Step By Step Construction", "build-up", 1),
    ]);

    const result = composeNarrativeBrief(brief, { userPrompt: "how skyscrapers are built" });

    expect(result.diagnostics).toMatchObject({
      used: true,
      originalSceneCount: 2,
      finalSceneCount: 2,
      mergedSceneCount: 1,
    });
    expect(result.brief.scenes.map((scene) => scene.heading)).toEqual([
      "Phase 1: The Challenge Of Height",
      "Main Drawing Animation",
    ]);
    expect(result.brief.scenes[0].storyboard).toBeUndefined();
    expect(result.brief.scenes[0].blockStyle).toBe("stacked");
    expect(result.brief.scenes[1].diagramIntent.family).toBe("build-up");
    expect(result.brief.scenes[1].storyboard?.style).toBe("line-drawing");
  });

  it("creates a main animation scene when the model returns only one content scene", () => {
    const brief = briefWithScenes([
      primitiveScene("Initial Components", "cycle", 0),
    ]);

    const result = composeNarrativeBrief(brief, { userPrompt: "explain the water cycle" });

    expect(result.brief.scenes).toHaveLength(2);
    expect(result.brief.scenes[0].heading).toBe("Phase 1: Initial Components");
    expect(result.brief.scenes[1].heading).toBe("Main Drawing Animation");
    expect(result.brief.scenes[1].diagramIntent.family).toBe("cycle");
  });

  it("keeps explicit multi-part requests uncompressed", () => {
    const brief = briefWithScenes([
      primitiveScene("One", "build-up", 0),
      primitiveScene("Two", "build-up", 1),
      primitiveScene("Three", "build-up", 2),
      primitiveScene("Four", "build-up", 3),
      primitiveScene("Five", "build-up", 4),
      primitiveScene("Six", "build-up", 5),
    ]);

    const result = composeNarrativeBrief(brief, { userPrompt: "make a 6-part video about this process" });

    expect(result.diagnostics.used).toBe(false);
    expect(result.diagnostics.bypassReason).toBe("user explicitly requested a multi-part video");
    expect(result.brief.scenes).toHaveLength(6);
  });

  it("does not duplicate setup prefixes when preserving the setup scene", () => {
    const brief = briefWithScenes([
      primitiveScene("Setup: Sun And Water", "cycle", 0),
      primitiveScene("Evaporation", "cycle", 1),
      primitiveScene("Condensation", "cycle", 2),
    ]);

    const result = composeNarrativeBrief(brief, { userPrompt: "explain the water cycle" });

    expect(result.brief.scenes[0].heading).toBe("Setup: Sun And Water");
  });


  it("merges graph-flow explainers into one setup scene and one main graph-flow scene", () => {
    const brief = briefWithScenes([
      graphScene("Actors", 0),
      graphScene("Request", 1),
      graphScene("Database", 2),
      graphScene("Response", 3),
    ]);

    const result = composeNarrativeBrief(brief, { userPrompt: "explain this software architecture" });

    expect(result.brief.scenes).toHaveLength(2);
    expect(result.brief.scenes[1].diagramIntent.family).toBe("graph-flow");
    expect(result.brief.scenes[1].graph.nodes.length).toBeGreaterThanOrEqual(4);
    expect(result.brief.scenes[1].storyboard).toBeUndefined();
  });

  it.each([
    ["how skyscrapers are built", "build-up"],
    ["how GPS works", "field-range"],
    ["how the water cycle works", "cycle"],
    ["compare renting and buying", "comparison"],
  ] as const)("uses the two-content-scene shape for %s", (_, family) => {
    const brief = briefWithScenes([
      primitiveScene("Setup Context", family, 0),
      primitiveScene("Middle Step A", family, 1),
      primitiveScene("Middle Step B", family, 2),
      primitiveScene("Final Result", family, 3),
    ]);

    const result = composeNarrativeBrief(brief, { userPrompt: "normal explainer" });

    expect(result.brief.scenes).toHaveLength(2);
    expect(result.brief.scenes[0].heading).toContain("Setup Context");
    expect(result.brief.scenes[1].diagramIntent.family).toBe(family);
  });
});
