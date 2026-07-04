#!/usr/bin/env tsx

import { runGeneratePipeline } from "@/lib/agent/ai/pipeline";
import type { DiagramLayout, SupportedDuration } from "@/lib/agent/schemas/brief";

type TestCase = {
  prompt: string;
  duration: SupportedDuration;
  expectedDiagramLayout: DiagramLayout | "any";
  description: string;
};

const TEST_CASES: TestCase[] = [
  {
    prompt: "a 15-second video about client-server architecture",
    duration: 15,
    expectedDiagramLayout: "client-server",
    description: "client/server topic",
  },
  {
    prompt: "explain how HTTP request and response works",
    duration: 10,
    expectedDiagramLayout: "client-server",
    description: "request/response flow",
  },
  {
    prompt: "explain the water cycle",
    duration: 15,
    expectedDiagramLayout: "pipeline",
    description: "natural process",
  },
  {
    prompt: "how photosynthesis works",
    duration: 10,
    expectedDiagramLayout: "pipeline",
    description: "biology process",
  },
  {
    prompt: "kubernetes pod scheduling and resource management",
    duration: 20,
    expectedDiagramLayout: "any",
    description: "infra multi-scene topic",
  },
  {
    prompt: "event-driven architecture with producer and consumer services",
    duration: 15,
    expectedDiagramLayout: "client-server",
    description: "producer/consumer services",
  },
];

const isFast = process.argv.includes("--fast");
const delayMs = isFast ? 0 : 1200;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

type ResultRow = {
  idx: number;
  pass: boolean;
  sceneSummary: string;
  llmError?: string;
  elapsedMs: number;
  totalTokens?: number;
  note: string;
};

function suggestedSceneCount(duration: SupportedDuration): number {
  return Math.max(1, Math.round(duration / 5));
}

async function runEval() {
  console.log("\nVideoGPT Eval Harness");
  console.log(`${TEST_CASES.length} prompts | model: ${process.env.DEFAULT_MODEL ?? "default"}\n`);

  const results: ResultRow[] = [];

  for (let i = 0; i < TEST_CASES.length; i += 1) {
    const tc = TEST_CASES[i];
    process.stdout.write(`[${String(i + 1).padStart(2)}/${TEST_CASES.length}] ${tc.description} ... `);

    const startedAt = Date.now();
    try {
      const { brief, diagnostics } = await runGeneratePipeline(tc.prompt, tc.duration);
      const elapsedMs = Date.now() - startedAt;
      const layouts = brief.scenes.map((scene) => scene.diagramLayout);
      const sceneSummary = `${brief.scenes.length} scenes: ${layouts.join(", ")}`;
      const expectedCount = suggestedSceneCount(tc.duration);
      const layoutOk =
        tc.expectedDiagramLayout === "any" ||
        layouts.includes(tc.expectedDiagramLayout);
      const countOk = Math.abs(brief.scenes.length - expectedCount) <= 1;
      const pass = !diagnostics.llmError && layoutOk && countOk;

      const note = [
        !layoutOk ? `missing ${tc.expectedDiagramLayout}` : "",
        !countOk ? `scene count ${brief.scenes.length}, expected about ${expectedCount}` : "",
        diagnostics.llmError ? `LLM error: ${diagnostics.llmError.slice(0, 120)}` : "",
      ].filter(Boolean).join(", ") || "ok";

      results.push({
        idx: i + 1,
        pass,
        sceneSummary,
        llmError: diagnostics.llmError,
        elapsedMs,
        totalTokens: diagnostics.usage?.total_tokens,
        note,
      });
    } catch (error) {
      results.push({
        idx: i + 1,
        pass: false,
        sceneSummary: "?",
        llmError: error instanceof Error ? error.message : String(error),
        elapsedMs: Date.now() - startedAt,
        note: "threw unexpectedly",
      });
    }

    const current = results[results.length - 1];
    console.log(current.pass ? "PASS" : `FAIL (${current.note})`);
    if (i < TEST_CASES.length - 1 && delayMs > 0) await sleep(delayMs);
  }

  const passed = results.filter((result) => result.pass).length;
  const rate = Math.round((passed / results.length) * 100);

  console.log("\nRESULTS");
  console.log(`${"#".padEnd(3)} ${"PASS".padEnd(5)} ${"TOK".padEnd(8)} ${"MS".padEnd(7)} ${"SCENES".padEnd(42)} NOTE`);
  console.log("-".repeat(90));
  for (const result of results) {
    console.log(
      `${String(result.idx).padEnd(3)} ${(result.pass ? "yes" : "no").padEnd(5)} ` +
      `${String(result.totalTokens ?? "-").padEnd(8)} ${String(result.elapsedMs).padEnd(7)} ` +
      `${result.sceneSummary.slice(0, 40).padEnd(42)} ${result.note}`,
    );
  }

  console.log(`\nPassed ${passed}/${results.length} (${rate}%)`);
  process.exit(rate >= 80 ? 0 : 1);
}

runEval().catch((error) => {
  console.error("Eval harness crashed:", error);
  process.exit(1);
});
