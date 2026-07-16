import { afterEach, describe, expect, it, vi } from "vitest";
import { callApiStream } from "@/lib/ui/apiClient";

describe("streaming generation client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("does not issue an automatic regular-request retry after a stream failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("failed", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);
    const onError = vi.fn();

    await callApiStream("/api/generate", { prompt: "Solar", duration: 10 }, {
      onChunk: vi.fn(),
      onPhase: vi.fn(),
      onDone: vi.fn(),
      onError,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.stringContaining("502"));
  });
});
