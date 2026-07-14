import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callOpenRouter } from "@/lib/agent/ai/openrouter";

describe("OpenRouter structured-output failures", () => {
  const originalApiKey = process.env.OPENROUTER_API_KEY;
  const originalModel = process.env.DEFAULT_MODEL;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.DEFAULT_MODEL = "deepseek/deepseek-v4-flash";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalApiKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalApiKey;
    if (originalModel === undefined) delete process.env.DEFAULT_MODEL;
    else process.env.DEFAULT_MODEL = originalModel;
  });

  it("disables reasoning for strict part JSON requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ finish_reason: "stop", message: { content: "{\"title\":\"Dam\"}" } }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await callOpenRouter("system", "user", {
      maxTokens: 4096,
      reasoning: { enabled: false },
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(body.reasoning).toEqual({ enabled: false });
  });

  it("classifies empty length-limited content as retryable output exhaustion", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ finish_reason: "length", message: { content: null, reasoning: "long reasoning" } }],
    }), { status: 200 })));

    await expect(callOpenRouter("system", "user", {
      maxTokens: 4096,
      reasoning: { enabled: false },
    })).rejects.toMatchObject({
      name: "OpenRouterLengthError",
      finishReason: "length",
    });
  });
});
