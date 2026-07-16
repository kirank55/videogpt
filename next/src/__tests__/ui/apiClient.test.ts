import { afterEach, describe, expect, it, vi } from "vitest";
import { callApiStream } from "@/lib/ui/apiClient";

describe("streaming generation client", () => {
  afterEach(() => vi.unstubAllGlobals());

  function callbacks(onError = vi.fn()) {
    return {
      onStarted: vi.fn(),
      onProgress: vi.fn(),
      onPartComplete: vi.fn(),
      onPhase: vi.fn(),
      onDone: vi.fn(),
      onError,
    };
  }

  it("does not issue an automatic regular-request retry after a stream failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("failed", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);
    const onError = vi.fn();

    await callApiStream("/api/generate", { prompt: "Solar", duration: 10 }, callbacks(onError));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.stringContaining("502"));
  });

  it("reports a stream that ends without a terminal event", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      'data: {"type":"phase","phase":"generating-sections"}\n\n',
      { status: 200 },
    )));
    const handlers = callbacks();

    await callApiStream("/api/generate", { prompt: "Solar", duration: 10 }, handlers);

    expect(handlers.onPhase).toHaveBeenCalledWith("generating-sections");
    expect(handlers.onError).toHaveBeenCalledWith(expect.stringContaining("ended before a result"));
  });

  it("dispatches model progress and exactly one terminal result", async () => {
    const payload = [
      'data: {"type":"started","requestId":"request-1"}',
      'data: {"type":"model-progress","part":"summary","characterCount":400,"estimatedTokens":100}',
      'data: {"type":"model-complete","part":"summary","completionTokens":96}',
      'data: {"type":"done","summary":"Done"}',
      'data: {"type":"error","message":"late"}',
      "",
    ].join("\n\n");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(payload, { status: 200 })));
    const handlers = callbacks();

    await callApiStream("/api/generate", { prompt: "Solar", duration: 10 }, handlers);

    expect(handlers.onStarted).toHaveBeenCalledWith("request-1");
    expect(handlers.onProgress).toHaveBeenCalledWith(expect.objectContaining({ part: "summary", estimatedTokens: 100 }));
    expect(handlers.onPartComplete).toHaveBeenCalledWith("summary", 96);
    expect(handlers.onDone).toHaveBeenCalledOnce();
    expect(handlers.onError).not.toHaveBeenCalled();
  });
});
