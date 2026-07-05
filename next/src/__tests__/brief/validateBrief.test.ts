import { describe, expect, it } from "vitest";
import { validateBrief } from "@/lib/agent/brief/validateBrief";
import { analyzePrimitiveBrief } from "@/lib/agent/brief/primitiveDiagnostics";

function validSceneBrief(overrides: Record<string, unknown> = {}) {
  return {
    title: "Client-Server Architecture",
    subtitle: "How requests travel",
    palette: "midnight",
    style: "modern",
    scenes: [
      {
        heading: "Request Path",
        diagramLayout: "client-server",
        blocks: [
          { heading: "Client", description: "Sends a request.", icon: "browser" },
          { heading: "Server", description: "Processes and responds.", icon: "server" },
        ],
        graph: {
          nodes: [
            { id: "client", label: "Client", icon: "browser" },
            { id: "server", label: "Server", icon: "server" },
          ],
          edges: [
            { from: "client", to: "server", label: "GET", animated: true },
          ],
        },
        entryAnimation: "slide-up",
        blockStyle: "cards",
        transition: "fade",
      },
    ],
    ...overrides,
  };
}

describe("validateBrief", () => {
  it("passes a valid scene brief through", () => {
    const result = validateBrief(validSceneBrief());
    expect(result.title).toBe("Client-Server Architecture");
    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0].diagramLayout).toBe("client-server");
    expect(result.scenes[0].graph.edges[0].animated).toBe(true);
  });

  it("normalizes unknown palette and style", () => {
    const result = validateBrief(validSceneBrief({ palette: "missing", style: "wizard" }));
    expect(result.palette).toBe("midnight");
    expect(result.style).toBe("modern");
  });

  it("returns a valid default scene for garbage input", () => {
    const result = validateBrief(null);
    expect(result.title).toBe("Untitled");
    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0].blocks).toHaveLength(2);
    expect(result.scenes[0].graph.nodes.length).toBeGreaterThan(0);
  });

  it("ignores retired root-level layout fields and creates a graph scene fallback", () => {
    const result = validateBrief({
      layout: "retired-layout",
      title: "Retired Layout",
      blocks: [
        { heading: "Ignored Root Block", description: "This should not become a scene block." },
        { heading: "Ignored Root Detail", description: "Scenes are the only authored content unit." },
      ],
      palette: "midnight",
      style: "modern",
    });

    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0].heading).toBe("Retired Layout");
    expect(result.scenes[0].diagramLayout).toBe("stack");
    expect(result.scenes[0].graph.nodes.map((node) => node.label)).toEqual(["Key Point", "Key Detail"]);
    expect(result.scenes[0].blocks.map((block) => block.heading)).toEqual(["Key Point", "Key Detail"]);
  });

  it("pads and truncates scene blocks to the 2-5 range", () => {
    const oneBlock = validateBrief(validSceneBrief({
      scenes: [
        {
          heading: "Too Small",
          diagramLayout: "pipeline",
          blocks: [{ heading: "Only", description: "One." }],
          graph: { nodes: [], edges: [] },
        },
      ],
    }));
    expect(oneBlock.scenes[0].blocks).toHaveLength(2);

    const manyBlocks = validateBrief(validSceneBrief({
      scenes: [
        {
          heading: "Too Big",
          diagramLayout: "pipeline",
          blocks: Array.from({ length: 7 }, (_, index) => ({
            heading: `Block ${index}`,
            description: "Description",
          })),
          graph: { nodes: [], edges: [] },
        },
      ],
    }));
    expect(manyBlocks.scenes[0].blocks).toHaveLength(5);
  });

  it("deduplicates node ids and drops dangling edges", () => {
    const result = validateBrief(validSceneBrief({
      scenes: [
        {
          heading: "Graph Cleanup",
          diagramLayout: "pipeline",
          blocks: [
            { heading: "A", description: "First." },
            { heading: "B", description: "Second." },
          ],
          graph: {
            nodes: [
              { id: "same", label: "A" },
              { id: "same", label: "B" },
            ],
            edges: [
              { from: "same", to: "missing" },
              { from: "same", to: "same" },
            ],
          },
        },
      ],
    }));

    const ids = result.scenes[0].graph.nodes.map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.scenes[0].graph.edges).toEqual([]);
  });

  it("preserves valid layout roles and drops invalid ones", () => {
    const result = validateBrief(validSceneBrief({
      scenes: [
        {
          heading: "Roles",
          diagramLayout: "client-server",
          blocks: [
            { heading: "Client", description: "First." },
            { heading: "Server", description: "Second." },
          ],
          graph: {
            nodes: [
              { id: "client", label: "Client", layoutRole: "client" },
              { id: "server", label: "Server", layoutRole: "server" },
              { id: "bad", label: "Bad", layoutRole: "elsewhere" },
            ],
            edges: [{ from: "client", to: "server", animated: true }],
          },
        },
      ],
    }));

    expect(result.scenes[0].graph.nodes[0].layoutRole).toBe("client");
    expect(result.scenes[0].graph.nodes[1].layoutRole).toBe("server");
    expect(result.scenes[0].graph.nodes[2].layoutRole).toBeUndefined();
  });

  it("enforces layout-specific budgets without splitting scenes", () => {
    const result = validateBrief(validSceneBrief({
      scenes: [
        {
          heading: "Over Budget",
          diagramLayout: "client-server",
          blocks: Array.from({ length: 6 }, (_, index) => ({
            heading: `Block ${index + 1}`,
            description: "Description",
          })),
          graph: {
            nodes: Array.from({ length: 8 }, (_, index) => ({
              id: `n${index + 1}`,
              label: `Node ${index + 1}`,
            })),
            edges: [
              { from: "n1", to: "n2", animated: true },
              { from: "n2", to: "n3", animated: true },
              { from: "n3", to: "n4", animated: true },
              { from: "n7", to: "n8", animated: true },
              { from: "n4", to: "n7", animated: true },
            ],
          },
        },
      ],
    }));

    const scene = result.scenes[0];
    expect(result.scenes).toHaveLength(1);
    expect(scene.blocks).toHaveLength(4);
    expect(scene.graph.nodes).toHaveLength(6);
    expect(scene.graph.nodes.map((node) => node.id)).toEqual(["n1", "n2", "n3", "n4", "n7", "n8"]);
    expect(scene.graph.edges.filter((edge) => edge.animated)).toHaveLength(4);
  });

  it("normalizes a primitive-first scene and synthesizes a render graph fallback", () => {
    const result = validateBrief(validSceneBrief({
      scenes: [
        {
          heading: "GPS Trilateration",
          diagramScript: {
            summary: "Show satellites locating a receiver.",
            beats: ["Satellites broadcast", "Ranges expand", "Receiver resolves"],
            visualStory: "Three satellite range circles pulse outward and intersect at the receiver.",
            mustShow: ["satellites", "range circles", "receiver"],
          },
          diagramIntent: {
            family: "field-range",
            subject: "GPS trilateration",
            perspective: "top-down",
            signatureVisuals: ["satellites", "range circles", "receiver"],
            motionCues: ["pulse outward", "intersect"],
          },
          diagramLayout: "hub-spoke",
          blocks: [
            { heading: "Broadcast", description: "Satellites send timing signals." },
            { heading: "Intersect", description: "Ranges meet at the receiver." },
          ],
          visualPrimitives: [
            { id: "satA", type: "satellite", label: "Satellite A", renderAs: "device" },
            { id: "rangeA", type: "range circle", label: "Range Circle", renderAs: "zone", shapeHint: "ring" },
            { id: "receiver", type: "receiver pin", label: "Receiver", renderAs: "device", shapeHint: "pin" },
          ],
          primitiveRelationships: [
            { from: ["satA"], to: ["rangeA"], relation: "signal expands into", visualMetaphor: "pulsing ring" },
            { from: ["rangeA"], to: ["receiver"], relation: "intersects at", visualMetaphor: "ring crosses receiver" },
          ],
        },
      ],
    }));

    const scene = result.scenes[0];
    expect(scene.diagramIntent.family).toBe("field-range");
    expect(scene.visualPrimitives).toHaveLength(3);
    expect(scene.primitiveRelationships).toHaveLength(2);
    expect(scene.graph.nodes.map((node) => node.id)).toEqual(["satA", "rangeA", "receiver"]);
  });

  it("accepts storyboard stages and primitive drawing roles", () => {
    const result = validateBrief(validSceneBrief({
      scenes: [
        {
          heading: "Tower Drawing",
          diagramScript: {
            summary: "Draw a tower growing upward.",
            beats: ["Foundation", "Core", "Windows"],
            visualStory: "A clean line drawing grows from foundation to lit windows.",
            mustShow: ["foundation", "core", "windows"],
          },
          diagramIntent: {
            family: "build-up",
            subject: "tower drawing",
            signatureVisuals: ["foundation", "core", "windows"],
            motionCues: ["draw upward"],
          },
          diagramLayout: "stack",
          blocks: [
            { heading: "Foundation", description: "Base appears." },
            { heading: "Core", description: "Core rises." },
          ],
          visualPrimitives: [
            { id: "foundation", type: "foundation mat", label: "Foundation", drawingRole: "layer" },
            { id: "core", type: "concrete core", label: "Core", drawingRole: "support" },
            { id: "windows", type: "window panels", label: "Windows", drawingRole: "panel" },
          ],
          primitiveRelationships: [
            { from: ["foundation"], to: ["core"], relation: "supports" },
            { from: ["core"], to: ["windows"], relation: "frames" },
          ],
          storyboard: {
            style: "line-drawing",
            continuityKey: "tower",
            stages: [
              { label: "Foundation", operation: "reveal", primitiveIds: ["foundation"] },
              { label: "Core rises", operation: "grow", primitiveIds: ["core"] },
              { label: "Windows", operation: "fill", primitiveIds: ["windows"] },
            ],
          },
        },
      ],
    }));

    const scene = result.scenes[0];
    expect(scene.visualPrimitives?.map((primitive) => primitive.drawingRole)).toEqual(["layer", "support", "panel"]);
    expect(scene.storyboard?.style).toBe("line-drawing");
    expect(scene.storyboard?.continuityKey).toBe("tower");
    expect(scene.storyboard?.stages.map((stage) => stage.operation)).toEqual(["reveal", "grow", "fill"]);
  });

  it("drops storyboard stage refs that do not point at scene primitives", () => {
    const result = validateBrief(validSceneBrief({
      scenes: [
        {
          heading: "Filtered Storyboard",
          diagramScript: {
            summary: "Draw only valid primitive refs.",
            beats: ["Valid"],
            visualStory: "Invalid refs should not reach the compiler.",
            mustShow: ["valid"],
          },
          diagramIntent: {
            family: "build-up",
            subject: "filtered drawing",
            signatureVisuals: ["valid"],
            motionCues: [],
          },
          diagramLayout: "pipeline",
          blocks: [
            { heading: "Valid", description: "Valid primitive." },
            { heading: "Invalid", description: "Dropped reference." },
          ],
          visualPrimitives: [
            { id: "valid", type: "valid shape", label: "Valid Shape", drawingRole: "mass" },
          ],
          primitiveRelationships: [
            { from: ["valid"], to: ["missing"], relation: "points to" },
          ],
          storyboard: {
            style: "line-drawing",
            stages: [
              { label: "Mixed", operation: "reveal", primitiveIds: ["valid", "missing"] },
              { label: "Missing", operation: "grow", primitiveIds: ["missing"] },
            ],
          },
        },
      ],
    }));

    expect(result.scenes[0].storyboard?.stages).toEqual([
      { label: "Mixed", operation: "reveal", primitiveIds: ["valid"] },
    ]);
  });

  it("keeps dangling primitive relationships for diagnostics", () => {
    const result = validateBrief(validSceneBrief({
      scenes: [
        {
          heading: "Dangling Primitive",
          diagramScript: {
            summary: "Show a weak primitive plan.",
            beats: ["Thing"],
            visualStory: "A generic thing points to a missing thing.",
            mustShow: ["missing thing"],
          },
          diagramIntent: {
            family: "spatial-cutaway",
            subject: "Weak plan",
            signatureVisuals: ["missing thing"],
            motionCues: [],
          },
          diagramLayout: "stack",
          blocks: [
            { heading: "Thing", description: "Generic." },
            { heading: "Missing", description: "Missing." },
          ],
          visualPrimitives: [
            { id: "thing", type: "component", label: "Component" },
          ],
          primitiveRelationships: [
            { from: ["thing"], to: ["missing"], relation: "points to" },
          ],
        },
      ],
    }));

    const diagnostics = analyzePrimitiveBrief(result);
    expect(diagnostics.hardFailures[0]).toContain("unknown primitive id");
    expect(diagnostics.shouldRetry).toBe(true);
  });

  it("reports generic primitive labels without forcing a retry", () => {
    const result = validateBrief(validSceneBrief({
      scenes: [
        {
          heading: "Generic Plan",
          diagramScript: {
            summary: "Show a generic plan.",
            beats: ["Process", "System"],
            visualStory: "Generic components move through generic steps.",
            mustShow: ["specific pump"],
          },
          diagramIntent: {
            family: "build-up",
            subject: "Generic plan",
            signatureVisuals: ["specific pump"],
            motionCues: [],
          },
          diagramLayout: "pipeline",
          blocks: [
            { heading: "Process", description: "Generic." },
            { heading: "System", description: "Generic." },
          ],
          visualPrimitives: [
            { id: "process", type: "process", label: "Process" },
            { id: "system", type: "system", label: "System" },
          ],
          primitiveRelationships: [
            { from: ["process"], to: ["system"], relation: "connects to" },
          ],
        },
      ],
    }));

    const diagnostics = analyzePrimitiveBrief(result);
    expect(diagnostics.score).toBeGreaterThanOrEqual(0);
    expect(diagnostics.shouldRetry).toBe(false);
    expect(diagnostics.retryReasons.join(" ")).toContain("prompt-specific primitives");
    expect(diagnostics.retryReasons.join(" ")).toContain("mostly generic");
  });

  it("flags construction briefs that lack chronological drawing continuity", () => {
    const result = validateBrief({
      title: "How Skyscrapers Are Built",
      palette: "slate",
      style: "modern",
      scenes: [
        {
          heading: "Deep Foundations",
          diagramScript: {
            summary: "Show deep foundations transferring tower load to bedrock.",
            beats: ["Excavate soil", "Drill caissons", "Transfer load"],
            visualStory: "A soil cutaway shows caissons reaching bedrock below the tower.",
            mustShow: ["soil layers", "bedrock", "concrete pier"],
          },
          diagramIntent: {
            family: "spatial-cutaway",
            subject: "Skyscraper foundations",
            signatureVisuals: ["soil layers", "bedrock", "concrete pier"],
            motionCues: ["load arrow moves downward"],
          },
          diagramLayout: "stack",
          blocks: [
            { heading: "Excavation", description: "Crews dig through soft soil." },
            { heading: "Caissons", description: "Concrete piers reach stable rock." },
          ],
          visualPrimitives: [
            { id: "soil", type: "soil layers", label: "Soil Layers" },
            { id: "bedrock", type: "bedrock", label: "Bedrock" },
            { id: "pier", type: "concrete pier", label: "Concrete Pier" },
          ],
          primitiveRelationships: [
            { from: ["pier"], to: ["bedrock"], relation: "rests on" },
            { from: ["soil"], to: ["pier"], relation: "surrounds" },
          ],
        },
        {
          heading: "Steel Superstructure",
          diagramScript: {
            summary: "Show the steel frame and concrete core rising.",
            beats: ["Columns rise", "Beams connect", "Core stiffens"],
            visualStory: "A steel skeleton and central core grow upward together.",
            mustShow: ["steel columns", "floor beams", "concrete core"],
          },
          diagramIntent: {
            family: "build-up",
            subject: "Skyscraper superstructure",
            signatureVisuals: ["steel columns", "floor beams", "concrete core"],
            motionCues: ["columns rise", "beams slide into place"],
          },
          diagramLayout: "pipeline",
          blocks: [
            { heading: "Steel Columns", description: "Vertical steel supports carry the tower." },
            { heading: "Floor Beams", description: "Horizontal beams form each level." },
          ],
          visualPrimitives: [
            { id: "columns", type: "steel columns", label: "Steel Columns" },
            { id: "beams", type: "floor beams", label: "Floor Beams" },
            { id: "core", type: "concrete core", label: "Concrete Core" },
          ],
          primitiveRelationships: [
            { from: ["beams"], to: ["columns"], relation: "connect to" },
            { from: ["core"], to: ["columns"], relation: "braces" },
          ],
        },
      ],
    });

    const diagnostics = analyzePrimitiveBrief(result, {
      userPrompt: "how are skyscrapers built",
    });

    expect(diagnostics.shouldRetry).toBe(false);
    expect(diagnostics.retryReasons.join(" ")).toContain("chronological construction timeline");
  });
});
