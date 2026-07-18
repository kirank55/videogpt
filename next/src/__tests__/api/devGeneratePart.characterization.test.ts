import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/dev/generate-part/route";
import type { VideoPartKind } from "@/lib/agent/videoParts/schemas";

type ModelRequestBody = {
  model: string;
  max_tokens: number;
  temperature: number;
  reasoning: { enabled: boolean };
  provider: { sort: string };
};

const originalApiKey = process.env.OPENROUTER_API_KEY;
const originalModel = process.env.DEFAULT_MODEL;

function request(part: VideoPartKind, prompt: string, duration: number) {
  return new NextRequest("http://localhost/api/dev/generate-part", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ part, prompt, duration }),
  });
}

function modelResponse(content: unknown) {
  return new Response(JSON.stringify({
    choices: [{
      finish_reason: "stop",
      message: {
        content: typeof content === "string" ? content : JSON.stringify(content),
      },
    }],
  }), { status: 200 });
}

function directTimeline(
  mode: "direct-summary-timeline" | "direct-timeline",
  duration: number,
) {
  return {
    mode,
    name: mode === "direct-summary-timeline" ? "Energy overview" : "Energy mechanism",
    visualIntent: "Show energy moving through authored visual stages.",
    events: [
      {
        id: "authored-background",
        type: "background",
        start: 0,
        end: duration,
        layer: 0,
        background: { kind: "solid", color: "#07111f" },
      },
      {
        id: "authored-heading",
        type: "text",
        start: 0,
        end: duration,
        layer: 8,
        text: "Energy flow",
        x: 160,
        y: 100,
        maxWidth: 1500,
        color: "#ffffff",
        fontSize: 40,
        fontWeight: 800,
      },
      {
        id: "authored-input",
        type: "shape",
        shapeType: "rect",
        start: 0.1,
        end: duration,
        layer: 2,
        x: 300,
        y: 350,
        width: 420,
        height: 260,
        fill: "#2563eb",
        opacity: { from: 0, to: 1, easing: "easeOut" },
      },
      {
        id: "authored-output",
        type: "shape",
        shapeType: "circle",
        start: 0.25,
        end: duration,
        layer: 2,
        x: 1280,
        y: 480,
        radius: 140,
        fill: "#f59e0b",
      },
      ...(mode === "direct-timeline"
        ? [{
            id: "authored-connection",
            type: "shape",
            shapeType: "line",
            start: 0.4,
            end: duration,
            layer: 4,
            x1: 740,
            y1: 480,
            x2: 1080,
            y2: 480,
            stroke: "#ffffff",
            lineWidth: 8,
            drawProgress: { from: 0, to: 1, easing: "easeInOut" },
          }]
        : []),
    ],
  };
}

function authoredResponse(part: VideoPartKind, duration: number) {
  switch (part) {
    case "title":
      return { title: "Solar Power", subtitle: "From light to electricity" };
    case "summary":
      return directTimeline("direct-summary-timeline", duration);
    case "main-diagram":
      return directTimeline("direct-timeline", duration);
    case "conclusion":
      return { closingLine: "Light becomes current." };
  }
}

function parseModelRequest(fetchMock: ReturnType<typeof vi.fn>, call = 0) {
  const init = fetchMock.mock.calls[call][1] as RequestInit;
  return JSON.parse(String(init.body)) as ModelRequestBody;
}

describe("dev generate-part API characterization", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.DEFAULT_MODEL = "test/dev-reference-model";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalApiKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalApiKey;
    if (originalModel === undefined) delete process.env.DEFAULT_MODEL;
    else process.env.DEFAULT_MODEL = originalModel;
  });

  it.each([
    { part: "title" as const, duration: 5, maxTokens: 384, temperature: 0.65 },
    { part: "summary" as const, duration: 10, maxTokens: 2_048, temperature: 0.65 },
    { part: "main-diagram" as const, duration: 15, maxTokens: 8_192, temperature: 0.5 },
    { part: "conclusion" as const, duration: 20, maxTokens: 256, temperature: 0.65 },
  ])(
    "returns a renderer-ready $part project and preserves its model options",
    async ({ part, duration, maxTokens, temperature }) => {
      const fetchMock = vi.fn().mockResolvedValue(modelResponse(authoredResponse(part, duration)));
      vi.stubGlobal("fetch", fetchMock);

      const response = await POST(request(part, "Explain how solar power works", duration));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.part).toBe(part);
      expect(body.project).toMatchObject({
        width: 1920,
        height: 1080,
        duration,
      });
      expect(new Set(body.project.events.map((event: { type: string }) => event.type)))
        .toEqual(new Set(["background", "text", "shape"]));
      expect(body.project.events).toEqual(expect.arrayContaining([
        expect.objectContaining({ start: expect.any(Number), end: expect.any(Number) }),
      ]));
      for (const event of body.project.events) {
        expect(event.start).toBeGreaterThanOrEqual(0);
        expect(event.end).toBeLessThanOrEqual(duration);
        expect(event.end).toBeGreaterThan(event.start);
      }

      if (part === "summary" || part === "main-diagram") {
        const authored = directTimeline(
          part === "summary" ? "direct-summary-timeline" : "direct-timeline",
          duration,
        );
        const authoredIds = authored.events.map((event) => event.id);
        expect(body.content.events.map((event: { id: string }) => event.id)).toEqual(authoredIds);
        expect(body.project.events.map((event: { id: string }) => event.id)).toEqual(authoredIds);
        const representativeEvents = [
          expect.objectContaining({
            id: "authored-heading",
            type: "text",
            text: "Energy flow",
            x: 160,
            y: 100,
            start: 0,
            end: duration,
          }),
          expect.objectContaining({
            id: "authored-input",
            type: "shape",
            shapeType: "rect",
            x: 300,
            y: 350,
            width: 420,
            height: 260,
            fill: "#2563eb",
            start: 0.1,
            end: duration,
            opacity: { from: 0, to: 1, easing: "easeOut" },
          }),
        ];
        expect(body.content.events).toEqual(expect.arrayContaining(representativeEvents));
        expect(body.project.events).toEqual(expect.arrayContaining(representativeEvents));
      } else {
        const expectedContent = authoredResponse(part, duration);
        expect(body.content).toEqual(expectedContent);
        const renderedCopy = body.project.events
          .filter((event: { type: string }) => event.type === "text")
          .map((event: { text: string }) => event.text);
        expect(renderedCopy).toEqual(
          part === "title"
            ? ["Solar Power", "From light to electricity"]
            : ["Light becomes current."],
        );
      }

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(parseModelRequest(fetchMock)).toMatchObject({
        model: "test/dev-reference-model",
        max_tokens: maxTokens,
        temperature,
        reasoning: { enabled: false },
        provider: { sort: "throughput" },
      });
    },
  );

  it.each([
    {
      part: "title" as const,
      invalid: { title: "" },
      repaired: { title: "Solar Power", subtitle: "From light to electricity" },
    },
    {
      part: "conclusion" as const,
      invalid: { closingLine: "" },
      repaired: { closingLine: "Light becomes current." },
    },
  ])("repairs invalid $part copy once through the same request", async ({ part, invalid, repaired }) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(modelResponse(invalid))
      .mockResolvedValueOnce(modelResponse(repaired));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request(part, "Explain how solar power works", 5));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.content).toEqual(repaired);
    expect(body.project.duration).toBe(5);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(parseModelRequest(fetchMock, 0).temperature).toBe(0.65);
    expect(parseModelRequest(fetchMock, 1).temperature).toBe(0.2);
  });

  it.each(["summary", "main-diagram"] as const)(
    "returns a local renderer-ready $part fallback after malformed model JSON",
    async (part) => {
      const fetchMock = vi.fn().mockResolvedValue(modelResponse("{ malformed"));
      vi.stubGlobal("fetch", fetchMock);

      const response = await POST(request(part, "Explain how solar power works", 10));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.part).toBe(part);
      expect(body.project).toMatchObject({
        width: 1920,
        height: 1080,
        duration: 10,
      });
      expect(body.project.events.length).toBeGreaterThanOrEqual(4);
      expect(body.project.events.some((event: { type: string }) => event.type === "background"))
        .toBe(true);
      expect(body.project.events.some((event: { type: string }) => event.type === "text"))
        .toBe(true);
      expect(body.project.events.some((event: { type: string }) => event.type === "shape"))
        .toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});
