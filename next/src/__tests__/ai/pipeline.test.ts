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

const CURRENT_BRIEF: VideoBrief = {
  title: "Existing",
  palette: "midnight",
  style: "modern",
  scenes: [
    {
      heading: "Existing Scene",
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
    expect(result.diagnostics.layout).toHaveLength(1);
    expect(result.brief.title).toBe("Test Title");
    expect(result.project.events.length).toBeGreaterThan(0);
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
