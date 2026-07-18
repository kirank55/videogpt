import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callOpenRouter } from "@/lib/agent/videoParts/openrouter";

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
    expect(body.provider).toEqual({ sort: "throughput" });
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

  it("requires one configured model instead of trying provider fallbacks", async () => {
    delete process.env.DEFAULT_MODEL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(callOpenRouter("system", "user")).rejects.toThrow("DEFAULT_MODEL");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("streams structured output chunks and parses the accumulated JSON", async () => {
    const stream = [
      'data: {"choices":[{"delta":{"content":"{\\"title\\":"},"finish_reason":null}]}',
      ': OPENROUTER PROCESSING',
      'data: {"choices":[{"delta":{"content":"\\"Dam\\"}"},"finish_reason":"stop"}]}',
      'data: {"choices":[],"usage":{"prompt_tokens":20,"completion_tokens":4,"total_tokens":24}}',
      "data: [DONE]",
      "",
    ].join("\n\n");
    const fetchMock = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const onChunk = vi.fn();
    const onUsage = vi.fn();

    await expect(callOpenRouter("system", "user", { onChunk, onUsage })).resolves.toEqual({ title: "Dam" });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({ stream: true });
    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onUsage).toHaveBeenCalledWith(expect.objectContaining({ completion_tokens: 4 }));
  });

  it("surfaces provider errors embedded in a successful HTTP stream", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      'data: {"error":{"message":"provider disconnected"},"choices":[{"delta":{},"finish_reason":"error"}]}\n\n',
      { status: 200 },
    )));

    await expect(callOpenRouter("system", "user", { onChunk: vi.fn() }))
      .rejects.toThrow("provider disconnected");
  });
});
