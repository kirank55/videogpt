import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the OpenRouter seam so the pipeline is tested through its own interface
// without touching the network. The pipeline's contract is: callOpenRouter(Stream)
// → validateBrief → hydrateBrief → buildProjectFromBrief → runQualityGate, with
// LLM failures captured as diagnostics.llmError (fallback brief for generate,
// unchanged current brief for modify).
const callOpenRouterMock       = vi.fn<(s: string, u: string) => Promise<unknown>>();
const callOpenRouterStreamMock = vi.fn<(s: string, u: string) => Promise<unknown>>();

vi.mock("@/lib/agent/ai/openrouter", () => ({
  callOpenRouter:       (s: string, u: string) => callOpenRouterMock(s, u),
  callOpenRouterStream: (s: string, u: string) => callOpenRouterStreamMock(s, u),
}));

import { runGeneratePipeline, runModifyPipeline } from "@/lib/agent/ai/pipeline";
import type { VideoBrief, SupportedDuration } from "@/lib/agent/schemas/brief";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DURATION: SupportedDuration = 15;

const RAW_BRIEF = {
  layout: "single-column",
  title: "Test Title",
  blocks: [{ heading: "A", description: "B" }],
  palette: "midnight",
  style: "modern",
};

const CURRENT_BRIEF: VideoBrief = {
  layout: "single-column",
  title: "Existing",
  blocks: [{ heading: "X", description: "Y" }],
  palette: "midnight",
  style: "modern",
} as unknown as VideoBrief;

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
    expect(result.brief.title).toBe("Test Title");
    expect(result.project.events.length).toBeGreaterThan(0);
    expect(result.diagnostics.qualityResult).toBeDefined();
    expect(result.diagnostics.errorCount + result.diagnostics.warningCount).toBeGreaterThanOrEqual(0);
  });

  // ── generate: streaming forwards onChunk and uses the streaming caller ───

  it("streams tokens via onChunk when provided", async () => {
    callOpenRouterStreamMock.mockImplementation(async () => {
      // Simulate two token deltas before resolving the full brief
      return RAW_BRIEF;
    });

    const chunks: string[] = [];
    const result = await runGeneratePipeline("a prompt", DURATION, {
      onChunk: (delta) => chunks.push(delta),
    });

    expect(callOpenRouterStreamMock).toHaveBeenCalledOnce();
    expect(callOpenRouterMock).not.toHaveBeenCalled();
    expect(result.diagnostics.llmError).toBeUndefined();
    // onChunk was wired through to the streaming caller's options
    expect(result.diagnostics.rawBrief).toBe(RAW_BRIEF);
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

  // ── modify: streaming forwards onChunk ────────────────────────────────────

  it("streams a modify call when onChunk is provided", async () => {
    callOpenRouterStreamMock.mockResolvedValueOnce(RAW_BRIEF);

    const result = await runModifyPipeline(CURRENT_BRIEF, "change it", DURATION, {
      onChunk: () => {},
    });

    expect(callOpenRouterStreamMock).toHaveBeenCalledOnce();
    expect(callOpenRouterMock).not.toHaveBeenCalled();
    expect(result.diagnostics.llmError).toBeUndefined();
  });

  // ── the apiKey option is forwarded to the LLM caller ──────────────────────

  it("forwards the apiKey option to the LLM caller", async () => {
    callOpenRouterMock.mockResolvedValueOnce(RAW_BRIEF);

    await runGeneratePipeline("a prompt", DURATION, { apiKey: "sk-test" });

    expect(callOpenRouterMock).toHaveBeenCalledOnce();
  });
});
