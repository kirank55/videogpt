import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callOpenRouter } from "@/lib/agent/rootGeneration/openrouter";

describe("root OpenRouter output classification", () => {
  const originalApiKey = process.env.OPENROUTER_API_KEY;
  const originalModel = process.env.DEFAULT_MODEL;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.DEFAULT_MODEL = "test-model";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalApiKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalApiKey;
    if (originalModel === undefined) delete process.env.DEFAULT_MODEL;
    else process.env.DEFAULT_MODEL = originalModel;
  });

  it("classifies valid partial JSON stopped for length as retryable truncation", async () => {
    const partial = '{"mode":"direct-timeline","events":[]}';
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{
        finish_reason: "length",
        message: { content: partial },
      }],
    }), { status: 200 })));

    await expect(callOpenRouter("system", "user", {
      maxTokens: 6_144,
      reasoning: { enabled: false },
    })).rejects.toMatchObject({
      name: "OpenRouterLengthError",
      finishReason: "length",
      content: partial,
    });
  });
});
