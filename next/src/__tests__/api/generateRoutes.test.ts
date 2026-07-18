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
    chapters: [
      { name: "Introduction", time: 0 },
      { name: "At a glance", time: 1.05 },
      { name: "Conclusion", time: 8.95 },
    ],
  },
  projectName: "Solar Power",
  summary: "How solar cells turn sunlight into current.",
  plan: {
    title: "Solar Power",
    closingLine: "Done.",
    logline: "How solar cells turn sunlight into current.",
    scenes: [
      { id: "overview", role: "overview", name: "At a glance", goal: "Introduce.", share: 1 },
    ],
  },
  scenes: [],
};

const generateComposedVideo = vi.fn();

vi.mock("@/lib/agent/rootGeneration/composedVideo", () => ({
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
    expect(body).not.toHaveProperty("plan");
    expect(body).not.toHaveProperty("scenes");
  });

  it("streams the plan, generation phases, and the same public response shape", async () => {
    generateComposedVideo.mockImplementation(async (_request, dependencies) => {
      dependencies.onPhase?.("planning");
      dependencies.onPlan?.(generated.plan);
      dependencies.onPhase?.("generating-sections");
      dependencies.onModelProgress?.("overview", { characterCount: 400 });
      dependencies.onModelUsage?.("overview", {
        prompt_tokens: 20,
        completion_tokens: 96,
        total_tokens: 116,
      });
      dependencies.onModelComplete?.("overview");
      dependencies.onPhase?.("composing");
      return generated;
    });
    const { POST } = await import("@/app/api/generate/stream/route");
    const response = await POST(request("/api/generate/stream", { prompt: "Solar", duration: 10 }));
    const payload = await response.text();

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(payload).toContain('"type":"phase","phase":"planning"');
    expect(payload).toContain('"type":"plan","title":"Solar Power"');
    expect(payload).toContain('"id":"overview","name":"At a glance"');
    expect(payload).toContain('"type":"phase","phase":"generating-sections"');
    expect(payload).toContain('"type":"phase","phase":"composing"');
    expect(payload).toContain('"type":"model-progress","part":"overview"');
    expect(payload).toContain('"type":"model-complete","part":"overview"');
    expect(payload).toContain('"completionTokens":96');
    expect(payload).toContain('"promptTokens":20');
    expect(payload).toContain('"durationMs":');
    expect(payload).toContain('"ttftMs":');
    expect(payload).toContain('"tokensPerSecond":');
    expect(payload).toContain('"type":"done"');
    const doneLine = payload.split("\n").find((line) => line.includes('"type":"done"'));
    const done = JSON.parse(doneLine!.replace(/^data: /, ""));
    expect(done).not.toHaveProperty("plan");
    expect(done).not.toHaveProperty("scenes");
    expect(done.project.chapters).toHaveLength(3);
  });

  it("rejects invalid root requests before generation", async () => {
    const { POST } = await import("@/app/api/generate/route");
    const response = await POST(request("/api/generate", { prompt: "", duration: 7 }));
    expect(response.status).toBe(422);
    expect(generateComposedVideo).not.toHaveBeenCalled();
  });
});
