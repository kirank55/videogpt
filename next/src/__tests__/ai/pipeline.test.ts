import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the OpenRouter seam so the pipeline is tested through its own interface
// without touching the network. The pipeline's contract is: callOpenRouter(Stream)
// → parseLLMResponse → hydrateBrief → buildProjectFromBrief, with
// LLM failures captured as diagnostics.llmError (fallback brief for generate,
// unchanged current brief for modify).
const callOpenRouterMock       = vi.fn<(s: string, u: string) => Promise<unknown>>();
const callOpenRouterStreamMock = vi.fn<(s: string, u: string) => Promise<unknown>>();

vi.mock("@/lib/agent/ai/openrouter", () => ({
  callOpenRouter:       (s: string, u: string) => callOpenRouterMock(s, u),
  callOpenRouterStream: (s: string, u: string) => callOpenRouterStreamMock(s, u),
}));

import { runGeneratePipeline, runModifyPipeline, type PipelineEvent } from "@/lib/agent/ai/pipeline";
import type { VideoBrief, SupportedDuration } from "@/lib/agent/schemas/brief";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DURATION: SupportedDuration = 15;

const RAW_BRIEF = {
  title: "Test Title",
  palette: "midnight",
  style: "modern",
  scenes: [
    {
      heading: "Scene A",
      diagramScript: {
        summary: "Show two graph-flow nodes connected by a request.",
        beats: ["A", "C"],
        visualStory: "A flows to C as a simple system graph.",
        mustShow: ["A", "C"],
      },
      diagramIntent: {
        family: "graph-flow",
        subject: "Test graph flow",
        signatureVisuals: ["A", "C"],
        motionCues: ["A to C"],
      },
      diagramLayout: "pipeline",
      blocks: [
        { heading: "A", description: "B" },
        { heading: "C", description: "D" },
      ],
      graph: {
        nodes: [
          { id: "a", label: "A" },
          { id: "c", label: "C" },
        ],
        edges: [{ from: "a", to: "c", animated: true }],
      },
      entryAnimation: "slide-up",
      blockStyle: "cards",
      transition: "fade",
    },
  ],
};

function rawGraphScene(heading: string, index: number) {
  return {
    heading,
    diagramScript: {
      summary: `Show ${heading}.`,
      beats: [`${heading} starts`, `${heading} ends`],
      visualStory: `${heading} is one step in the explanation.`,
      mustShow: [`${heading} starts`, `${heading} ends`],
    },
    diagramIntent: {
      family: "graph-flow",
      subject: heading,
      signatureVisuals: [`${heading} starts`, `${heading} ends`],
      motionCues: ["flow"],
    },
    diagramLayout: "pipeline",
    blocks: [
      { heading: `${heading} starts`, description: "Start." },
      { heading: `${heading} ends`, description: "End." },
    ],
    graph: {
      nodes: [
        { id: `${index}-a`, label: `${heading} A` },
        { id: `${index}-b`, label: `${heading} B` },
      ],
      edges: [{ from: `${index}-a`, to: `${index}-b`, animated: true }],
    },
    entryAnimation: "slide-up",
    blockStyle: "cards",
    transition: "fade",
  };
}

const MULTI_SCENE_BRIEF = {
  title: "Multi Scene Explainer",
  palette: "midnight",
  style: "modern",
  closingLine: "That is the flow.",
  scenes: [
    rawGraphScene("Setup Components", 0),
    rawGraphScene("Request Path", 1),
    rawGraphScene("Database Work", 2),
    rawGraphScene("Response Path", 3),
  ],
};

const CURRENT_BRIEF: VideoBrief = {
  title: "Existing",
  palette: "midnight",
  style: "modern",
  scenes: [
    {
      heading: "Existing Scene",
      diagramScript: {
        summary: "Show the existing graph-flow scene.",
        beats: ["X", "Z"],
        visualStory: "X connects to Z in a simple stack.",
        mustShow: ["X", "Z"],
      },
      diagramIntent: {
        family: "graph-flow",
        subject: "Existing graph flow",
        signatureVisuals: ["X", "Z"],
        motionCues: ["X to Z"],
      },
      diagramLayout: "stack",
      blocks: [
        { heading: "X", description: "Y" },
        { heading: "Z", description: "W" },
      ],
      graph: {
        nodes: [
          { id: "x", label: "X" },
          { id: "z", label: "Z" },
        ],
        edges: [{ from: "x", to: "z" }],
      },
      entryAnimation: "slide-up",
      blockStyle: "cards",
      transition: "fade",
    },
  ],
};

const GENERIC_PRIMITIVE_BRIEF = {
  title: "Generic Primitive",
  palette: "midnight",
  style: "modern",
  scenes: [
    {
      heading: "Generic Scene",
      diagramScript: {
        summary: "Show a GPS mechanism.",
        beats: ["Process", "System"],
        visualStory: "Generic process.",
        mustShow: ["satellite", "receiver", "range circle"],
      },
      diagramIntent: {
        family: "field-range",
        subject: "GPS",
        signatureVisuals: ["satellite", "receiver", "range circle"],
        motionCues: [],
      },
      diagramLayout: "hub-spoke",
      blocks: [
        { heading: "Process", description: "Generic." },
        { heading: "System", description: "Generic." },
      ],
      visualPrimitives: [
        { id: "process", type: "process", label: "Process" },
      ],
      primitiveRelationships: [],
      entryAnimation: "slide-up",
      blockStyle: "cards",
      transition: "fade",
    },
  ],
};

const BROKEN_PRIMITIVE_BRIEF = {
  title: "Broken Primitive",
  palette: "midnight",
  style: "modern",
  scenes: [
    {
      heading: "Broken Scene",
      diagramScript: {
        summary: "Show a GPS mechanism with a broken primitive reference.",
        beats: ["Satellite", "Missing receiver"],
        visualStory: "A satellite points to a receiver primitive that was not authored.",
        mustShow: ["satellite", "receiver"],
      },
      diagramIntent: {
        family: "field-range",
        subject: "GPS",
        signatureVisuals: ["satellite", "receiver"],
        motionCues: [],
      },
      diagramLayout: "hub-spoke",
      blocks: [
        { heading: "Satellite", description: "Broadcasts timing." },
        { heading: "Receiver", description: "Should resolve location." },
      ],
      visualPrimitives: [
        { id: "satelliteA", type: "satellite", label: "Satellite A" },
      ],
      primitiveRelationships: [
        { from: ["satelliteA"], to: ["receiver"], relation: "signals travel to" },
      ],
      entryAnimation: "slide-up",
      blockStyle: "cards",
      transition: "fade",
    },
  ],
};

const SPECIFIC_PRIMITIVE_BRIEF = {
  title: "Specific Primitive",
  palette: "midnight",
  style: "modern",
  scenes: [
    {
      heading: "GPS Trilateration",
      diagramScript: {
        summary: "Show satellites locating a receiver.",
        beats: ["Satellites broadcast", "Ranges expand", "Receiver resolves"],
        visualStory: "Three range circles intersect at a receiver pin.",
        mustShow: ["satellite", "range circle", "receiver"],
      },
      diagramIntent: {
        family: "field-range",
        subject: "GPS trilateration",
        perspective: "top-down",
        signatureVisuals: ["satellite", "range circle", "receiver"],
        motionCues: ["pulse outward", "intersect"],
      },
      diagramLayout: "hub-spoke",
      blocks: [
        { heading: "Broadcast", description: "Satellites send timing signals." },
        { heading: "Intersect", description: "Ranges meet at the receiver." },
      ],
      visualPrimitives: [
        { id: "satelliteA", type: "satellite", label: "Satellite A", renderAs: "device" },
        { id: "rangeA", type: "range circle", label: "Range Circle", renderAs: "zone", shapeHint: "ring" },
        { id: "receiver", type: "receiver pin", label: "Receiver", renderAs: "device", shapeHint: "pin" },
      ],
      primitiveRelationships: [
        { from: ["satelliteA"], to: ["rangeA"], relation: "signal expands into", visualMetaphor: "pulsing ring" },
        { from: ["rangeA"], to: ["receiver"], relation: "intersects at", visualMetaphor: "ring crosses receiver" },
      ],
      entryAnimation: "slide-up",
      blockStyle: "cards",
      transition: "fade",
    },
  ],
};

beforeEach(() => {
  callOpenRouterMock.mockReset();
  callOpenRouterStreamMock.mockReset();
});

describe("pipeline intake interface", () => {
  // ── generate: non-streaming success ──────────────────────────────────────

  it("runs the intake tail on a non-streaming generate call", async () => {
    callOpenRouterMock.mockResolvedValueOnce(RAW_BRIEF);

    const result = await runGeneratePipeline("a prompt", DURATION);

    expect(callOpenRouterMock).toHaveBeenCalledOnce();
    expect(callOpenRouterStreamMock).not.toHaveBeenCalled();
    expect(result.diagnostics.llmError).toBeUndefined();
    expect(result.diagnostics.rawBrief).toBe(RAW_BRIEF);
    expect(result.diagnostics.narrative).toMatchObject({
      used: true,
      originalSceneCount: 1,
      finalSceneCount: 2,
    });
    expect(result.diagnostics.layout).toHaveLength(2);
    expect(result.brief.scenes.map((scene) => scene.heading)).toEqual([
      "Phase 1: Scene A",
      "Main Diagram Animation",
    ]);
    expect(result.brief.title).toBe("Test Title");
    expect(result.project.events.length).toBeGreaterThan(0);
  });

  it("normalizes normal generated explainers to two content scenes before expansion", async () => {
    callOpenRouterMock.mockResolvedValueOnce(MULTI_SCENE_BRIEF);

    const result = await runGeneratePipeline("explain this software architecture", DURATION);

    expect(result.diagnostics.llmError).toBeUndefined();
    expect(result.diagnostics.narrative).toMatchObject({
      used: true,
      originalSceneCount: 4,
      finalSceneCount: 2,
    });
    expect(result.brief.scenes).toHaveLength(2);
    expect(result.diagnostics.layout).toHaveLength(2);
  });

  // ── generate: onEvent triggers streaming mode + phase events ─────────────

  it("emits phase events via onEvent and uses the streaming caller", async () => {
    callOpenRouterStreamMock.mockResolvedValueOnce(RAW_BRIEF);

    const events: PipelineEvent[] = [];
    const result = await runGeneratePipeline("a prompt", DURATION, {
      onEvent: (e) => events.push(e),
    });

    expect(callOpenRouterStreamMock).toHaveBeenCalledOnce();
    expect(callOpenRouterMock).not.toHaveBeenCalled();
    expect(result.diagnostics.llmError).toBeUndefined();
    expect(result.diagnostics.rawBrief).toBe(RAW_BRIEF);
    // Phase events were emitted in order
    const phases = events.map((e) => e.type);
    expect(phases).toContain("prompt-built");
    expect(phases).toContain("calling-openrouter");
    expect(phases).toContain("expanding");
  });

  // ── generate: LLM failure → fallback project + llmError ───────────────────

  it("returns a fallback project when the LLM call fails (generate)", async () => {
    callOpenRouterMock.mockRejectedValueOnce(new Error("boom"));

    const result = await runGeneratePipeline("a prompt", DURATION);

    expect(result.diagnostics.llmError).toBe("boom");
    expect(result.project.events.length).toBeGreaterThan(0);
    expect(result.brief.title).toBeTruthy();
  });

  it("does not retry when primitive diagnostics only find soft quality issues", async () => {
    callOpenRouterMock.mockResolvedValueOnce(GENERIC_PRIMITIVE_BRIEF);

    const result = await runGeneratePipeline("explain GPS", DURATION);

    expect(callOpenRouterMock).toHaveBeenCalledOnce();
    expect(result.diagnostics.primitiveRetried).toBe(false);
    expect(result.diagnostics.primitive?.retryReasons.join(" ")).toContain("prompt-specific primitives");
    expect(result.brief.title).toBe("Generic Primitive");
    expect(result.project.events.length).toBeGreaterThan(0);
  });

  it("retries once when primitive diagnostics find a hard structural failure", async () => {
    callOpenRouterMock
      .mockResolvedValueOnce(BROKEN_PRIMITIVE_BRIEF)
      .mockResolvedValueOnce(SPECIFIC_PRIMITIVE_BRIEF);

    const result = await runGeneratePipeline("explain GPS", DURATION);

    expect(callOpenRouterMock).toHaveBeenCalledTimes(2);
    expect(result.diagnostics.primitiveRetried).toBe(true);
    expect(result.diagnostics.primitive?.hardFailures).toHaveLength(0);
    expect(result.brief.title).toBe("Specific Primitive");
    expect(result.project.events.length).toBeGreaterThan(0);
  });

  // ── modify: success re-expands the returned brief ─────────────────────────

  it("runs the intake tail on a modify call", async () => {
    callOpenRouterMock.mockResolvedValueOnce(RAW_BRIEF);

    const result = await runModifyPipeline(CURRENT_BRIEF, "change it", DURATION);

    expect(callOpenRouterMock).toHaveBeenCalledOnce();
    expect(result.diagnostics.llmError).toBeUndefined();
    expect(result.brief.title).toBe("Test Title");
    expect(result.project.events.length).toBeGreaterThan(0);
  });

  // ── modify: LLM failure → re-expand the *current* brief unchanged ─────────

  it("re-expands the current brief unchanged when the LLM call fails (modify)", async () => {
    callOpenRouterMock.mockRejectedValueOnce(new Error("nope"));

    const result = await runModifyPipeline(CURRENT_BRIEF, "change it", DURATION);

    expect(result.diagnostics.llmError).toBe("nope");
    // The brief returned is the unchanged current brief, not a fallback
    expect(result.brief).toBe(CURRENT_BRIEF);
    expect(result.project.events.length).toBeGreaterThan(0);
  });

  // ── modify: onEvent triggers streaming mode ───────────────────────────────

  it("streams a modify call when onEvent is provided", async () => {
    callOpenRouterStreamMock.mockResolvedValueOnce(RAW_BRIEF);

    const result = await runModifyPipeline(CURRENT_BRIEF, "change it", DURATION, {
      onEvent: () => {},
    });

    expect(callOpenRouterStreamMock).toHaveBeenCalledOnce();
    expect(callOpenRouterMock).not.toHaveBeenCalled();
    expect(result.diagnostics.llmError).toBeUndefined();
  });

  // ── envelope: projectName + summary extracted from the LLM response ──────

  it("extracts projectName and summary from the LLM response envelope", async () => {
    const ENVELOPE = {
      projectName: "My Cool Video",
      summary: "A 15s explainer about testing.",
      brief: RAW_BRIEF,
    };
    callOpenRouterMock.mockResolvedValueOnce(ENVELOPE);

    const result = await runGeneratePipeline("a prompt", DURATION);

    expect(result.projectName).toBe("My Cool Video");
    expect(result.summary).toBe("A 15s explainer about testing.");
    expect(result.project.name).toBe("My Cool Video");
  });

  // ── envelope: bare brief (no wrapper) falls back gracefully ──────────────

  it("falls back to brief.title for projectName when the LLM returns a bare brief", async () => {
    callOpenRouterMock.mockResolvedValueOnce(RAW_BRIEF);

    const result = await runGeneratePipeline("a prompt", DURATION);

    expect(result.projectName).toBe("Test Title");
    expect(result.summary).toBe("");
  });
});
