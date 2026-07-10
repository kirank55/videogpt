#!/usr/bin/env tsx

import { runGeneratePipeline } from "@/lib/agent/ai/pipeline";
import type { DiagramFamily, SupportedDuration } from "@/lib/agent/schemas/brief";

type ExpectedMode = "primitive-first" | "graph-flow";

type TestCase = {
  prompt: string;
  duration: SupportedDuration;
  expectedMode: ExpectedMode;
  expectedFamilies?: DiagramFamily[];
  description: string;
};

const TEST_CASES: TestCase[] = [
  {
    prompt: "a 15-second video explaining GPS signal trilateration",
    duration: 15,
    expectedMode: "primitive-first",
    expectedFamilies: ["field-range"],
    description: "GPS signal/trilateration",
  },
  {
    prompt: "a 15-second video explaining skyscraper construction from groundbreaking to grand opening",
    duration: 15,
    expectedMode: "primitive-first",
    expectedFamilies: ["spatial-cutaway", "build-up", "timeline"],
    description: "skyscraper construction",
  },
  {
    prompt: "explain the water cycle as a 15-second animated diagram",
    duration: 15,
    expectedMode: "primitive-first",
    expectedFamilies: ["cycle"],
    description: "water cycle",
  },
  {
    prompt: "explain human heart blood flow in a 15-second medical animation",
    duration: 15,
    expectedMode: "primitive-first",
    expectedFamilies: ["cycle", "spatial-cutaway"],
    description: "human heart blood flow",
  },
  {
    prompt: "explain supply chain logistics from factory to customer",
    duration: 15,
    expectedMode: "primitive-first",
    expectedFamilies: ["timeline", "cycle", "comparison"],
    description: "supply chain logistics",
  },
  {
    prompt: "explain a courtroom process from opening statements to verdict",
    duration: 15,
    expectedMode: "primitive-first",
    expectedFamilies: ["timeline", "comparison"],
    description: "courtroom process",
  },
  {
    prompt: "explain database replication between primary and read replicas",
    duration: 15,
    expectedMode: "graph-flow",
    expectedFamilies: ["graph-flow"],
    description: "database replication",
  },
  {
    prompt: "explain OAuth login with browser, identity provider, and application server",
    duration: 15,
    expectedMode: "graph-flow",
    expectedFamilies: ["graph-flow"],
    description: "OAuth login",
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
  score: number;
  sceneSummary: string;
  llmError?: string;
  elapsedMs: number;
  totalTokens?: number;
  note: string;
};

function familiesMatch(actual: DiagramFamily[], expected: DiagramFamily[] | undefined): boolean {
  if (!expected || expected.length === 0) return true;
  return actual.some((family) => expected.includes(family));
}

function modeMatches(actual: DiagramFamily[], expectedMode: ExpectedMode): boolean {
  const hasGraphFlow = actual.includes("graph-flow");
  return expectedMode === "graph-flow"
    ? hasGraphFlow
    : actual.some((family) => family !== "graph-flow");
}

async function runEval() {
  console.log("\nVideoGPT Primitive Diagram Eval Harness");
  console.log(`${TEST_CASES.length} prompts | model: ${process.env.DEFAULT_MODEL ?? "default"}\n`);

  const results: ResultRow[] = [];

  for (let i = 0; i < TEST_CASES.length; i += 1) {
    const tc = TEST_CASES[i];
    process.stdout.write(`[${String(i + 1).padStart(2)}/${TEST_CASES.length}] ${tc.description} ... `);

    const startedAt = Date.now();
    try {
      const { brief, diagnostics } = await runGeneratePipeline(tc.prompt, tc.duration);
      const elapsedMs = Date.now() - startedAt;
      const families = brief.scenes.map((scene) => scene.diagramIntent.family);
      const sceneSummary = `${brief.scenes.length} scenes: ${families.join(", ")}`;
      const primitive = diagnostics.primitive;
      const hardFailures = primitive?.hardFailures ?? [];
      const score = primitive?.score ?? 0;
      const modeOk = modeMatches(families, tc.expectedMode);
      const familyOk = familiesMatch(families, tc.expectedFamilies);
      const pass = !diagnostics.llmError && hardFailures.length === 0 && modeOk && familyOk;

      const note = [
        !modeOk ? `expected ${tc.expectedMode}` : "",
        !familyOk ? `missing one of ${tc.expectedFamilies?.join("/")}` : "",
        hardFailures.length > 0 ? `hard failures: ${hardFailures.slice(0, 2).join("; ")}` : "",
        diagnostics.primitiveRetried ? "retried" : "",
        diagnostics.llmError ? `LLM error: ${diagnostics.llmError.slice(0, 120)}` : "",
      ].filter(Boolean).join(", ") || "ok";

      results.push({
        idx: i + 1,
        pass,
        score,
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
        score: 0,
        sceneSummary: "?",
        llmError: error instanceof Error ? error.message : String(error),
        elapsedMs: Date.now() - startedAt,
        note: "threw unexpectedly",
      });
    }

    const current = results[results.length - 1];
    console.log(current.pass ? `PASS (${current.score})` : `FAIL (${current.note})`);
    if (i < TEST_CASES.length - 1 && delayMs > 0) await sleep(delayMs);
  }

  const passed = results.filter((result) => result.pass).length;
  const averageScore = Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length);
  const rate = Math.round((passed / results.length) * 100);

  console.log("\nRESULTS");
  console.log(`${"#".padEnd(3)} ${"PASS".padEnd(5)} ${"SCORE".padEnd(7)} ${"TOK".padEnd(8)} ${"MS".padEnd(7)} ${"SCENES".padEnd(46)} NOTE`);
  console.log("-".repeat(110));
  for (const result of results) {
    console.log(
      `${String(result.idx).padEnd(3)} ${(result.pass ? "yes" : "no").padEnd(5)} ` +
      `${String(result.score).padEnd(7)} ${String(result.totalTokens ?? "-").padEnd(8)} ${String(result.elapsedMs).padEnd(7)} ` +
      `${result.sceneSummary.slice(0, 44).padEnd(46)} ${result.note}`,
    );
  }

  console.log(`\nPassed ${passed}/${results.length} (${rate}%) | average score ${averageScore}/100`);
  process.exit(rate >= 80 && averageScore >= 70 ? 0 : 1);
}

runEval().catch((error) => {
  console.error("Eval harness crashed:", error);
  process.exit(1);
});
