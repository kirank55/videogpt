import { describe, expect, it } from "vitest";
import {
  ConclusionPartContentSchema,
  MainDiagramPartContentSchema,
  PhaseOnePartContentSchema,
  TitlePartContentSchema,
} from "@/lib/agent/videoParts/schemas";
import { resolveVideoPartTheme } from "@/lib/agent/videoParts/theme";
import { buildVideoPartSystemPrompt } from "@/lib/agent/videoParts/prompts";
import { buildStandaloneVideoPartProject } from "@/lib/agent/videoParts/project";
import { VideoProjectSchema } from "@/lib/others/schemas/timeline";
import { generateVideoPart } from "@/lib/agent/videoParts/pipeline";
import {
  POST as postGenerateVideoPart,
  handleGenerateVideoPartRequest,
} from "@/app/api/dev/generate-part/route";

const prompt = "Explain how sunlight becomes electricity in a solar panel";
const theme = resolveVideoPartTheme(prompt);

const phaseOneContent = {
  heading: "Phase 1: Capture sunlight",
  diagramLayout: "pipeline" as const,
  blocks: [
    { heading: "Sunlight", description: "Photons arrive at the panel." },
    { heading: "Solar cells", description: "Semiconductor cells absorb their energy." },
  ],
  graph: {
    nodes: [
      { id: "sun", label: "Sunlight" },
      { id: "cell", label: "Solar cell" },
    ],
    edges: [{ from: "sun", to: "cell", animated: true }],
  },
};

const mainDiagramContent = {
  diagramFamily: "graph-flow" as const,
  heading: "Electric current begins to flow",
  diagramLayout: "pipeline" as const,
  blocks: [
    { heading: "Electron release", description: "Absorbed light frees charge carriers." },
    { heading: "Usable current", description: "The circuit guides the moving charge." },
  ],
  graph: {
    nodes: [
      { id: "cell", label: "Solar cell" },
      { id: "current", label: "Current" },
      { id: "circuit", label: "Circuit" },
    ],
    edges: [
      { from: "cell", to: "current", animated: true },
      { from: "current", to: "circuit", animated: true },
    ],
  },
};

const artifacts = [
  { part: "title" as const, content: { title: "Solar Power", subtitle: "From light to electricity" } },
  { part: "phase-1" as const, content: phaseOneContent },
  { part: "main-diagram" as const, content: mainDiagramContent },
  { part: "conclusion" as const, content: { closingLine: "Sunlight becomes useful electrical power." } },
];

describe("video part contracts", () => {
  it("uses one visual theme for equivalent prompts", () => {
    const expected = resolveVideoPartTheme("How does a solar panel work?");

    expect(resolveVideoPartTheme("  HOW   does a SOLAR panel work?  ")).toEqual(expected);
  });

  it("accepts only the authored fields needed by simple parts", () => {
    expect(TitlePartContentSchema.parse({ title: "Solar Power", subtitle: "From light to electricity" })).toEqual({
      title: "Solar Power",
      subtitle: "From light to electricity",
    });
    expect(ConclusionPartContentSchema.parse({ closingLine: "Clean energy starts with sunlight." })).toEqual({
      closingLine: "Clean energy starts with sunlight.",
    });
    expect(() => TitlePartContentSchema.parse({
      title: "Solar Power",
      scenes: [],
    })).toThrow();
    expect(() => TitlePartContentSchema.parse({
      projectName: "Solar Power",
      summary: "A full response envelope",
      brief: { title: "Solar Power", scenes: [] },
    })).toThrow();
  });

  it("rejects setup graphs whose edges reference missing nodes", () => {
    expect(() => PhaseOnePartContentSchema.parse({
      heading: "Phase 1: Capture sunlight",
      diagramLayout: "pipeline",
      blocks: [
        { heading: "Sunlight", description: "Photons reach the panel." },
        { heading: "Solar cells", description: "Cells absorb the incoming energy." },
      ],
      graph: {
        nodes: [{ id: "sun", label: "Sunlight" }],
        edges: [{ from: "sun", to: "missing" }],
      },
    })).toThrow();
  });

  it("rejects main storyboard stages that reference missing primitives", () => {
    expect(() => MainDiagramPartContentSchema.parse({
      diagramFamily: "build-up",
      heading: "Charge moves through the circuit",
      diagramScript: {
        summary: "Show charge moving.",
        beats: ["Release", "Flow"],
        visualStory: "Electrons travel through a wire.",
        mustShow: ["Electron", "Wire", "Lamp"],
      },
      diagramIntent: {
        subject: "Electric current",
        signatureVisuals: ["Electron", "Wire", "Lamp"],
        motionCues: ["Trace the current"],
      },
      visualPrimitives: [
        { id: "electron", type: "electron", label: "Electron" },
        { id: "wire", type: "wire", label: "Wire" },
        { id: "lamp", type: "lamp", label: "Lamp" },
      ],
      primitiveRelationships: [
        { from: ["electron"], to: ["wire"], relation: "enters" },
        { from: ["wire"], to: ["lamp"], relation: "powers" },
      ],
      storyboard: {
        style: "line-drawing",
        stages: [{ label: "Trace", operation: "trace", primitiveIds: ["missing"] }],
      },
    })).toThrow();
  });

  it("asks the model for only the selected part contract", () => {
    const prompts = [
      buildVideoPartSystemPrompt("title", 5),
      buildVideoPartSystemPrompt("phase-1", 5),
      buildVideoPartSystemPrompt("main-diagram", 10),
      buildVideoPartSystemPrompt("conclusion", 10),
    ];

    expect(prompts[0]).toContain('"required":["title"]');
    expect(prompts[3]).toContain('"required":["closingLine"]');
    prompts.forEach((partPrompt) => {
      expect(partPrompt).not.toContain('"projectName"');
      expect(partPrompt).not.toContain('"brief"');
      expect(partPrompt).not.toContain('"scenes"');
    });
    [prompts[0], prompts[1], prompts[3]].forEach((partPrompt) => {
      expect(partPrompt).not.toContain('"summary"');
    });
  });

  it("keeps graph and primitive main-diagram contracts mutually exclusive", () => {
    expect(() => MainDiagramPartContentSchema.parse({
      ...mainDiagramContent,
      visualPrimitives: [
        { id: "a", type: "cell", label: "A" },
        { id: "b", type: "wire", label: "B" },
        { id: "c", type: "lamp", label: "C" },
      ],
    })).toThrow();
  });

  it.each([
    {
      part: "title" as const,
      content: { title: "Solar Power", subtitle: "From light to electricity" },
      requiredId: "title",
      forbiddenPrefixes: ["scene-", "closing-line"],
    },
    {
      part: "phase-1" as const,
      content: phaseOneContent,
      requiredId: "scene-0-heading",
      forbiddenPrefixes: ["title", "scene-1-", "closing-line"],
    },
    {
      part: "main-diagram" as const,
      content: mainDiagramContent,
      requiredId: "scene-1-heading",
      forbiddenPrefixes: ["title", "scene-0-", "closing-line"],
    },
    {
      part: "conclusion" as const,
      content: { closingLine: "Sunlight becomes useful electrical power." },
      requiredId: "closing-line",
      forbiddenPrefixes: ["title", "scene-"],
    },
  ])("renders an isolated $part project", ({ part, content, requiredId, forbiddenPrefixes }) => {
    const project = buildStandaloneVideoPartProject({ part, content } as never, 10, theme);
    const ids = project.events.map((event) => event.id);

    expect(ids).toContain(requiredId);
    forbiddenPrefixes.forEach((prefix) => {
      expect(ids.some((id) => id.startsWith(prefix))).toBe(false);
    });
    expect(project.events.every((event) => event.start >= 0 && event.end <= 10)).toBe(true);
    expect(() => VideoProjectSchema.parse(project)).not.toThrow();
  });

  it.each([5, 10, 15, 20] as const)("keeps every standalone part inside a %ss duration", (duration) => {
    artifacts.forEach((artifact) => {
      const project = buildStandaloneVideoPartProject(artifact, duration, theme);
      expect(project.duration).toBe(duration);
      expect(project.events.every((event) => event.start >= 0 && event.end <= duration)).toBe(true);
      expect(() => VideoProjectSchema.parse(project)).not.toThrow();
    });
  });

  it("creates deterministic project ids and renders configured decorations", () => {
    const decoratedTheme = {
      ...theme,
      decorations: { cornerBrackets: true, scanLines: true, pulseRings: true },
    };
    const first = buildStandaloneVideoPartProject(artifacts[0], 5, decoratedTheme);
    const second = buildStandaloneVideoPartProject(artifacts[0], 5, decoratedTheme);

    expect(second.id).toBe(first.id);
    expect(first.events.some((event) => event.id.startsWith("decoration-corner-"))).toBe(true);
    expect(first.events.some((event) => event.id.startsWith("decoration-scan-line-"))).toBe(true);
    expect(first.events.some((event) => event.id.startsWith("decoration-pulse-ring-"))).toBe(true);
  });

  it("repairs invalid model JSON once before returning a generated part", async () => {
    const responses: unknown[] = [
      { title: "", scenes: [] },
      { title: "Solar Power", subtitle: "From light to electricity" },
    ];
    let calls = 0;

    const result = await generateVideoPart(
      { part: "title", prompt, duration: 5 },
      {
        callModel: async () => {
          const response = responses[calls];
          calls += 1;
          return response;
        },
      },
    );

    expect(calls).toBe(2);
    expect(result.part).toBe("title");
    expect(result.content).toEqual({ title: "Solar Power", subtitle: "From light to electricity" });
    expect(result.project.events.some((event) => event.id === "title")).toBe(true);
  });

  it("fails after the single repair attempt is also invalid", async () => {
    await expect(generateVideoPart(
      { part: "conclusion", prompt, duration: 5 },
      { callModel: async () => ({ title: "Wrong contract" }) },
    )).rejects.toThrow("could not be validated");
  });

  it("rejects malformed and invalid part requests at the HTTP seam", async () => {
    const malformed = await postGenerateVideoPart(new Request("http://localhost/api/dev/generate-part", {
      method: "POST",
      body: "not-json",
    }) as never);
    expect(malformed.status).toBe(400);

    const invalid = await postGenerateVideoPart(new Request("http://localhost/api/dev/generate-part", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ part: "full-video", prompt, duration: 5 }),
    }) as never);
    expect(invalid.status).toBe(422);
  });

  it("returns 502 when generation fails at the HTTP seam", async () => {
    const request = new Request("http://localhost/api/dev/generate-part", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ part: "title", prompt, duration: 5 }),
    });
    const response = await handleGenerateVideoPartRequest(
      request as never,
      async () => { throw new Error("Provider unavailable"); },
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Provider unavailable" });
  });
});
