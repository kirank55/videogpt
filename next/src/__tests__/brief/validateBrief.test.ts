import { describe, expect, it } from "vitest";
import { validateBrief } from "@/lib/agent/brief/validateBrief";

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

  it("wraps legacy single-column blocks into one scene", () => {
    const result = validateBrief({
      layout: "single-column",
      title: "The Water Cycle",
      blocks: [
        { heading: "Evaporation", description: "Water rises." },
        { heading: "Condensation", description: "Clouds form." },
        { heading: "Precipitation", description: "Rain falls." },
      ],
      palette: "midnight",
      style: "modern",
    });

    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0].heading).toBe("The Water Cycle");
    expect(result.scenes[0].blocks).toHaveLength(3);
    expect(result.scenes[0].diagramLayout).toBe("stack");
  });

  it("wraps legacy two-column flow into a client-server scene", () => {
    const result = validateBrief({
      layout: "two-column",
      title: "API Call",
      leftHeader: "Client",
      rightHeader: "Server",
      leftRows: ["Browser"],
      rightRows: ["API"],
      flow: true,
      requestLabel: "GET /api",
      responseLabel: "200 OK",
      palette: "midnight",
      style: "modern",
    });

    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0].diagramLayout).toBe("client-server");
    expect(result.scenes[0].graph.edges).toEqual([
      expect.objectContaining({ label: "GET /api", animated: true }),
      expect.objectContaining({ label: "200 OK", animated: true }),
    ]);
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
});
