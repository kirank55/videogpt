import { describe, expect, it } from "vitest";
import {
  ConclusionPartContentSchema,
  GraphSummaryPartContentSchema,
  MainDiagramPartContentSchema,
  PrimitiveSummaryPartContentSchema,
  SummaryPartContentSchema,
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

const summaryContent = {
  diagramFamily: "graph-flow" as const,
  heading: "Summary: Capturing sunlight",
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

const damSummaryContent = {
  diagramFamily: "build-up" as const,
  heading: "Dam Construction Overview",
  blocks: [
    { heading: "Prepare the site", description: "Survey and excavate down to stable bedrock." },
    { heading: "Build and seal", description: "Raise the dam body around a watertight core." },
  ],
  visualPrimitives: [
    { id: "bedrock", type: "terrain-layer", label: "Bedrock", drawingRole: "layer" as const },
    { id: "excavation", type: "foundation-cut", label: "Excavation", drawingRole: "container" as const },
    { id: "foundation", type: "concrete-foundation", label: "Foundation", drawingRole: "support" as const },
    { id: "dam-body", type: "concrete-dam", label: "Dam body", drawingRole: "mass" as const },
    { id: "seal-core", type: "watertight-core", label: "Sealing core", drawingRole: "support" as const },
    { id: "reservoir", type: "retained-water", label: "Reservoir", drawingRole: "flow" as const },
  ],
  primitiveRelationships: [
    { from: ["excavation"], to: ["bedrock"], relation: "exposes", motion: "excavate downward" },
    { from: ["bedrock"], to: ["foundation"], relation: "supports", motion: "place the foundation" },
    { from: ["foundation"], to: ["dam-body"], relation: "anchors", motion: "grow upward" },
    { from: ["seal-core"], to: ["dam-body"], relation: "seals", motion: "fill the center" },
    { from: ["dam-body"], to: ["reservoir"], relation: "retains", motion: "fill with water" },
  ],
  storyboard: {
    style: "line-drawing" as const,
    stages: [
      { label: "Excavate to stable bedrock", operation: "move" as const, primitiveIds: ["bedrock", "excavation"] },
      { label: "Lay the foundation", operation: "grow" as const, primitiveIds: ["foundation"] },
      { label: "Raise and seal the dam", operation: "grow" as const, primitiveIds: ["dam-body", "seal-core"] },
      { label: "Fill the reservoir", operation: "fill" as const, primitiveIds: ["reservoir"] },
    ],
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
  { part: "summary" as const, content: summaryContent },
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
    expect(() => SummaryPartContentSchema.parse({
      heading: "Summary: Capturing sunlight",
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
    expect(() => GraphSummaryPartContentSchema.parse({
      ...summaryContent,
      graph: {
        nodes: [
          { id: "duplicate", label: "First" },
          { id: "duplicate", label: "Second" },
        ],
        edges: [],
      },
    })).toThrow();
  });

  it("keeps graph and primitive summary contracts mutually exclusive", () => {
    expect(GraphSummaryPartContentSchema.parse(summaryContent)).toEqual(summaryContent);
    expect(PrimitiveSummaryPartContentSchema.parse(damSummaryContent)).toEqual(damSummaryContent);
    expect(SummaryPartContentSchema.parse(damSummaryContent)).toEqual(damSummaryContent);
    expect(() => SummaryPartContentSchema.parse({
      ...summaryContent,
      visualPrimitives: damSummaryContent.visualPrimitives,
    })).toThrow();
    expect(() => SummaryPartContentSchema.parse({
      ...damSummaryContent,
      diagramLayout: "stack",
      graph: summaryContent.graph,
    })).toThrow();
  });

  it("keeps summary authorship compact while leaving main diagrams detailed", () => {
    expect(() => GraphSummaryPartContentSchema.parse({
      ...summaryContent,
      blocks: [
        ...summaryContent.blocks,
        { heading: "Third", description: "Allowed final summary block." },
        { heading: "Fourth", description: "Too detailed for a summary." },
      ],
    })).toThrow();
    expect(() => PrimitiveSummaryPartContentSchema.parse({
      ...damSummaryContent,
      storyboard: {
        ...damSummaryContent.storyboard,
        stages: [
          ...damSummaryContent.storyboard.stages,
          { label: "Extra detail", operation: "pulse", primitiveIds: ["dam-body"] },
        ],
      },
    })).toThrow();
    expect(() => MainDiagramPartContentSchema.parse(mainDiagramContent)).not.toThrow();
  });

  it("rejects summary storyboards whose relationships or stages reference missing primitives", () => {
    expect(() => PrimitiveSummaryPartContentSchema.parse({
      ...damSummaryContent,
      primitiveRelationships: [
        ...damSummaryContent.primitiveRelationships,
        { from: ["missing"], to: ["dam-body"], relation: "supports" },
      ],
    })).toThrow();
    expect(() => PrimitiveSummaryPartContentSchema.parse({
      ...damSummaryContent,
      visualPrimitives: [
        ...damSummaryContent.visualPrimitives,
        { id: "foundation", type: "duplicate", label: "Duplicate foundation" },
      ],
    })).toThrow();
    expect(() => PrimitiveSummaryPartContentSchema.parse({
      ...damSummaryContent,
      storyboard: {
        ...damSummaryContent.storyboard,
        stages: [{ label: "Draw unknown", operation: "reveal", primitiveIds: ["missing"] }],
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
      buildVideoPartSystemPrompt("summary", 5),
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

  it("asks for topic-shaped summary motion instead of generic construction graphs", () => {
    const summaryPrompt = buildVideoPartSystemPrompt("summary", 10);

    expect(summaryPrompt).toContain("A dam construction summary");
    expect(summaryPrompt).toContain("build-up or spatial-cutaway");
    expect(summaryPrompt).toContain("Software request routing");
    expect(summaryPrompt).toContain("Do not use connected boxes merely because steps are chronological");
    expect(summaryPrompt).toContain("simple, clean, and precise visual overview");
    expect(summaryPrompt).toContain("The Main Diagram will explain the detailed mechanism");
    expect(summaryPrompt).toContain("only 2-4 storyboard stages");
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
      part: "summary" as const,
      content: summaryContent,
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
    [...artifacts, { part: "summary" as const, content: damSummaryContent }].forEach((artifact) => {
      const project = buildStandaloneVideoPartProject(artifact, duration, theme);
      expect(project.duration).toBe(duration);
      expect(project.events.every((event) => event.start >= 0 && event.end <= duration)).toBe(true);
      expect(() => VideoProjectSchema.parse(project)).not.toThrow();
    });
  });

  it("retains compact graph rendering when graph flow fits the summary", () => {
    const project = buildStandaloneVideoPartProject(
      { part: "summary", content: summaryContent },
      10,
      theme,
    );
    const ids = project.events.map((event) => event.id);

    expect(ids.some((id) => id.startsWith("scene-0-block-"))).toBe(true);
    expect(ids).toContain("scene-0-node-sun");
    expect(ids).toContain("scene-0-edge-0");
    expect(ids).toContain("scene-0-packet-0");
    expect(ids.some((id) => id.startsWith("scene-0-storyboard-"))).toBe(false);
  });

  it("renders a dam summary as a compact storyboard without graph packets", () => {
    const project = buildStandaloneVideoPartProject(
      { part: "summary", content: damSummaryContent },
      10,
      theme,
    );
    const ids = project.events.map((event) => event.id);

    expect(ids.some((id) => id.startsWith("scene-0-block-"))).toBe(true);
    expect(ids.some((id) => id.startsWith("scene-0-storyboard-"))).toBe(true);
    expect(ids.some((id) => id.startsWith("scene-0-storyboard-stage-caption-"))).toBe(true);
    expect(ids.some((id) => id.startsWith("scene-0-storyboard-primitive-foundation"))).toBe(true);
    expect(ids.some((id) => id.startsWith("scene-0-storyboard-primitive-seal-core"))).toBe(true);
    expect(ids.some((id) => id.startsWith("scene-0-storyboard-primitive-reservoir"))).toBe(true);
    expect(ids.some((id) => id.startsWith("scene-0-node-"))).toBe(false);
    expect(ids.some((id) => id.startsWith("scene-0-edge-"))).toBe(false);
    expect(ids.some((id) => id.startsWith("scene-0-packet-"))).toBe(false);
    const captionStarts = project.events
      .filter((event) => event.id.startsWith("scene-0-storyboard-stage-caption-"))
      .map((event) => event.start);
    expect(captionStarts).toHaveLength(4);
    captionStarts.slice(1).forEach((start, index) => {
      expect(start).toBeGreaterThan(captionStarts[index]);
    });
    expect(() => VideoProjectSchema.parse(project)).not.toThrow();
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

  it("repairs truncated provider JSON instead of failing before schema validation", async () => {
    const truncatedContent = `{
      "diagramFamily": "spatial-cutaway",
      "heading": "Dam Construction Overview",
      "blocks": [{ "heading": "Site Preparation", "description": "Excavate terrain"`;
    const parseError = Object.assign(
      new Error(`OpenRouter content is not valid JSON: ${truncatedContent}`),
      {
        name: "OpenRouterJsonParseError",
        content: truncatedContent,
        finishReason: "length",
      },
    );
    const userPrompts: string[] = [];
    const modelOptions: Array<{
      maxTokens?: number;
      temperature?: number;
      reasoning?: { enabled: boolean };
    } | undefined> = [];
    let calls = 0;

    const result = await generateVideoPart(
      { part: "summary", prompt: "How are dams built?", duration: 10 },
      {
        callModel: async (_systemPrompt, userPrompt, options) => {
          userPrompts.push(userPrompt);
          modelOptions.push(options);
          calls += 1;
          if (calls === 1) throw parseError;
          return damSummaryContent;
        },
      },
    );

    expect(calls).toBe(2);
    expect(userPrompts[1]).toContain("PREVIOUS TRUNCATED OR MALFORMED OUTPUT");
    expect(userPrompts[1]).toContain(truncatedContent);
    expect(modelOptions[0]).toMatchObject({
      maxTokens: 4096,
      temperature: 0.65,
      reasoning: { enabled: false },
    });
    expect(modelOptions[1]).toMatchObject({
      maxTokens: 4096,
      temperature: 0.2,
      reasoning: { enabled: false },
    });
    expect(result.part).toBe("summary");
    expect(result.content).toEqual(damSummaryContent);
  });

  it("retries when the provider exhausts its budget before emitting JSON content", async () => {
    const lengthError = Object.assign(
      new Error("OpenRouter returned empty content (finish_reason=length)."),
      {
        name: "OpenRouterLengthError",
        finishReason: "length",
      },
    );
    const userPrompts: string[] = [];
    let calls = 0;

    const result = await generateVideoPart(
      { part: "summary", prompt: "How are dams built?", duration: 10 },
      {
        callModel: async (_systemPrompt, userPrompt) => {
          userPrompts.push(userPrompt);
          calls += 1;
          if (calls === 1) throw lengthError;
          return damSummaryContent;
        },
      },
    );

    expect(calls).toBe(2);
    expect(userPrompts[1]).toContain("finish_reason=length");
    expect(result.part).toBe("summary");
  });

  it("does not retry provider failures unrelated to JSON parsing", async () => {
    let calls = 0;

    await expect(generateVideoPart(
      { part: "summary", prompt: "How are dams built?", duration: 10 },
      {
        callModel: async () => {
          calls += 1;
          throw new Error("OpenRouter HTTP 503 Service Unavailable");
        },
      },
    )).rejects.toThrow("OpenRouter HTTP 503 Service Unavailable");
    expect(calls).toBe(1);
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
