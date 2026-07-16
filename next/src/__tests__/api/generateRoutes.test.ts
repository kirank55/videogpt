import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const generated = {
  project: {
    id: "composed-test",
    name: "Solar Power",
    width: 1920,
    height: 1080,
    duration: 10,
    events: [],
  },
  projectName: "Solar Power",
  summary: "Solar power at a glance",
  parts: {
    bookends: { title: "Solar Power", closingLine: "Done." },
    summary: {},
    mainDiagram: {},
  },
};

const generateComposedVideo = vi.fn();

vi.mock("@/lib/agent/videoParts/composedVideo", () => ({
  generateComposedVideo,
}));

function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("root generation routes", () => {
  beforeEach(() => {
    generateComposedVideo.mockReset();
  });

  it("returns only the public composed response shape", async () => {
    generateComposedVideo.mockResolvedValue(generated);
    const { POST } = await import("@/app/api/generate/route");
    const response = await POST(request("/api/generate", { prompt: "Solar", duration: 10 }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      project: generated.project,
      projectName: generated.projectName,
      summary: generated.summary,
    });
    expect(body).not.toHaveProperty("parts");
  });

  it("streams generation phases and the same public response shape", async () => {
    generateComposedVideo.mockImplementation(async (_request, dependencies) => {
      dependencies.onPhase?.("generating-sections");
      dependencies.onModelProgress?.("summary", { characterCount: 400 });
      dependencies.onModelUsage?.("summary", {
        prompt_tokens: 20,
        completion_tokens: 96,
        total_tokens: 116,
      });
      dependencies.onModelComplete?.("summary");
      dependencies.onPhase?.("composing");
      return generated;
    });
    const { POST } = await import("@/app/api/generate/stream/route");
    const response = await POST(request("/api/generate/stream", { prompt: "Solar", duration: 10 }));
    const payload = await response.text();

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(payload).toContain('"type":"phase","phase":"generating-sections"');
    expect(payload).toContain('"type":"phase","phase":"composing"');
    expect(payload).toContain('"type":"model-progress","part":"summary"');
    expect(payload).toContain('"type":"model-complete","part":"summary"');
    expect(payload).toContain('"completionTokens":96');
    expect(payload).toContain('"type":"done"');
    expect(payload).not.toContain('"parts"');
  });

  it("rejects invalid root requests before generation", async () => {
    const { POST } = await import("@/app/api/generate/route");
    const response = await POST(request("/api/generate", { prompt: "", duration: 7 }));
    expect(response.status).toBe(422);
    expect(generateComposedVideo).not.toHaveBeenCalled();
  });
});
