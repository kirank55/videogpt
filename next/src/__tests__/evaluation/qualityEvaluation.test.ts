import { describe, expect, it } from "vitest";
import { loadEvaluationCases } from "@/lib/evaluation/cases";
import {
  classifyProjectDiagnostics,
  generationFailureDiagnostic,
  rendererFailureDiagnostic,
  type EvaluationDiagnostic,
} from "@/lib/evaluation/diagnostics";
import {
  createArtifactMetadata,
  type CapturedModelCall,
} from "@/lib/evaluation/metadata";
import {
  summarizeEvaluation,
  type HumanScore,
} from "@/lib/evaluation/scoring";
import type { VideoProject } from "@/lib/ui/renderer";

function project(events: VideoProject["events"]): VideoProject {
  return {
    id: "project-1",
    name: "Evaluation project",
    width: 1920,
    height: 1080,
    duration: 10,
    events,
  };
}

describe("scene quality evaluation", () => {
  it("loads two fixed cases at every supported duration with all subject categories", () => {
    const cases = loadEvaluationCases();

    expect(cases).toHaveLength(8);
    expect(
      Object.fromEntries(
        [5, 10, 15, 20].map((duration) => [
          duration,
          cases.filter((entry) => entry.duration === duration).length,
        ]),
      ),
    ).toEqual({ 5: 2, 10: 2, 15: 2, 20: 2 });
    expect(new Set(cases.map((entry) => entry.category))).toEqual(
      new Set(["software-topology", "physical-mechanism", "process", "comparison"]),
    );
    expect(
      Object.fromEntries(
        [...new Set(cases.map((entry) => entry.category))].map((category) => [
          category,
          cases.filter((entry) => entry.category === category).length,
        ]),
      ),
    ).toEqual({
      "software-topology": 2,
      "physical-mechanism": 2,
      process: 2,
      comparison: 2,
    });
    expect(new Set(cases.map((entry) => entry.id)).size).toBe(8);
  });

  it("classifies deterministic fallback, motion, readability, overlap, and generic layout", () => {
    const diagnostics = classifyProjectDiagnostics(project([
      {
        id: "background-fallback",
        type: "background",
        start: 0,
        end: 10,
        layer: 0,
        background: { kind: "solid", color: "#000" },
      },
      ...[0, 1, 2].map((index) => ({
        id: `card-${index}`,
        type: "shape" as const,
        shapeType: "rect" as const,
        start: 0,
        end: 10,
        layer: 2,
        x: 200 + index * 360,
        y: 300,
        width: 320,
        height: 220,
        fill: "#334155",
      })),
      {
        id: "tiny-label",
        type: "text",
        start: 0,
        end: 10,
        layer: 8,
        text: "A label that overlaps the cards",
        x: 220,
        y: 320,
        maxWidth: 760,
        color: "#fff",
        fontSize: 16,
      },
    ]));

    const codes = new Set(diagnostics.map((diagnostic) => diagnostic.code));
    expect(codes).toEqual(new Set<EvaluationDiagnostic["code"]>([
      "deterministic-fallback",
      "excessive-overlap",
      "missing-motion",
      "unreadable-text",
      "generic-layout",
    ]));
    expect(classifyProjectDiagnostics({})).toEqual([
      expect.objectContaining({ code: "renderer-schema-failure", severity: 5 }),
    ]);
    expect(generationFailureDiagnostic(new Error("provider failed"))).toEqual(
      expect.objectContaining({ code: "generation-failure", severity: 5 }),
    );
    expect(rendererFailureDiagnostic(new Error("capture failed"))).toEqual(
      expect.objectContaining({ code: "renderer-failure", severity: 5 }),
    );
  });

  it("does not mistake constant animation fields for visible motion", () => {
    const diagnostics = classifyProjectDiagnostics(project([
      {
        id: "background",
        type: "background",
        start: 0,
        end: 10,
        layer: 0,
        background: { kind: "solid", color: "#000" },
      },
      {
        id: "static-shape",
        type: "shape",
        shapeType: "circle",
        start: 0,
        end: 10,
        layer: 2,
        x: 960,
        y: 540,
        radius: 100,
        fill: "#fff",
        opacity: { from: 1, to: 1, easing: "linear" },
      },
    ]));

    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: "missing-motion" }),
    );
  });

  it("records reproducible artifact metadata including raw calls and failures", () => {
    const calls: CapturedModelCall[] = [{
      sequence: 1,
      model: "provider/model",
      options: { maxTokens: 4096, temperature: 0.5, reasoning: { enabled: false } },
      systemPrompt: "system",
      userPrompt: "explain the mechanism",
      startedAt: "2026-07-18T10:00:00.000Z",
      finishedAt: "2026-07-18T10:00:01.000Z",
      rawOutput: { events: [] },
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    }];

    const metadata = createArtifactMetadata({
      evaluationId: "eval-1",
      caseDefinition: {
        id: "dam-load-path",
        prompt: "Show how an arch dam transfers water pressure into bedrock.",
        duration: 10,
        category: "physical-mechanism",
      },
      generationPath: "root",
      repetition: 2,
      startedAt: "2026-07-18T10:00:00.000Z",
      finishedAt: "2026-07-18T10:00:02.000Z",
      modelCalls: calls,
      normalizedProject: project([]),
      diagnostics: [],
      rawFailure: new Error("renderer unavailable"),
    });

    expect(metadata).toMatchObject({
      evaluationId: "eval-1",
      prompt: "Show how an arch dam transfers water pressure into bedrock.",
      duration: 10,
      generationPath: "root",
      repetition: 2,
      modelIdentity: ["provider/model"],
      modelCalls: calls,
      normalizedProject: { id: "project-1" },
      rawFailure: { name: "Error", message: "renderer unavailable" },
    });
    expect(metadata.artifactId).toBe("dam-load-path-root-2");
  });

  it("identifies the median scored run and worst failure for each case and path", () => {
    const scores: HumanScore[] = [
      { artifactId: "case-root-1", subjectSpecificity: 5, meaningfulGeometry: 5, animation: 4, readability: 5 },
      { artifactId: "case-root-2", subjectSpecificity: 3, meaningfulGeometry: 4, animation: 3, readability: 4 },
      { artifactId: "case-root-3", subjectSpecificity: 1, meaningfulGeometry: 2, animation: 1, readability: 2 },
    ];
    const runs = [
      { artifactId: "case-root-1", caseId: "case", generationPath: "root" as const, failureSeverity: 0 },
      { artifactId: "case-root-2", caseId: "case", generationPath: "root" as const, failureSeverity: 1 },
      { artifactId: "case-root-3", caseId: "case", generationPath: "root" as const, failureSeverity: 4 },
    ];

    expect(summarizeEvaluation(runs, scores)).toEqual([{
      caseId: "case",
      generationPath: "root",
      medianArtifactId: "case-root-2",
      worstArtifactId: "case-root-3",
      scoredRuns: 3,
    }]);
  });
});
