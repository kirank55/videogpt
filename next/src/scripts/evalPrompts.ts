#!/usr/bin/env tsx
// ── Eval Harness — Phase 6B ───────────────────────────────────────────────────
//
// Runs 10–15 test prompts through the real LLM pipeline.
// For each prompt it:
//   1. Calls runGeneratePipeline (live OpenRouter call)
//   2. Validates the expanded VideoProject with validateProject()
//   3. Reports pass/fail per prompt in a matrix
//
// Usage:
//   npm run eval            — run all prompts sequentially
//   npm run eval -- --fast  — skip sleep between requests (may hit rate limits)
//
// Pass criteria:
//   - No "error"-severity issues from validateProject()
//   - Brief layout matches expected type (two-column / single-column)
//   - llmError is undefined (LLM actually responded)
//
// Exit code 0 if ≥80% pass; exit code 1 otherwise.

// Environment variables are loaded by tsx --env-file flags in package.json scripts.
// OPENROUTER_API_KEY must be set in .env.local (and/or .env in project root).

import { runGeneratePipeline } from "@/lib/ai/pipeline";
import type { SupportedDuration } from "@/lib/schemas/brief";

// ── Test cases ────────────────────────────────────────────────────────────────

interface TestCase {
  prompt:            string;
  duration:          SupportedDuration;
  expectedLayout:    "two-column" | "single-column" | "any";
  description:       string;
}

const TEST_CASES: TestCase[] = [
  // ── Two-column (client/server / compare) ──────────────────────────────────
  {
    prompt: "a 15-second video about client-server architecture",
    duration: 15,
    expectedLayout: "two-column",
    description: "client-server keyword → two-column",
  },
  {
    prompt: "explain how HTTP request and response works",
    duration: 10,
    expectedLayout: "two-column",
    description: "request/response keywords → two-column",
  },
  {
    prompt: "compare frontend and backend responsibilities",
    duration: 15,
    expectedLayout: "two-column",
    description: "frontend/backend keywords → two-column",
  },
  {
    prompt: "how does a REST API call work between client and server",
    duration: 20,
    expectedLayout: "two-column",
    description: "api + client/server → two-column with flow",
  },
  {
    prompt: "SQL vs NoSQL database architecture",
    duration: 15,
    expectedLayout: "two-column",
    description: "vs keyword → two-column",
  },
  {
    prompt: "before and after microservice migration",
    duration: 10,
    expectedLayout: "two-column",
    description: "before/after → two-column",
  },

  // ── Single-column (explainer / how-to) ────────────────────────────────────
  {
    prompt: "explain the water cycle",
    duration: 15,
    expectedLayout: "single-column",
    description: "nature explainer → single-column",
  },
  {
    prompt: "how photosynthesis works",
    duration: 10,
    expectedLayout: "single-column",
    description: "biology explainer → single-column",
  },
  {
    prompt: "the history of the internet in 20 seconds",
    duration: 20,
    expectedLayout: "single-column",
    description: "history topic → single-column",
  },
  {
    prompt: "how to improve code quality with TDD",
    duration: 15,
    expectedLayout: "single-column",
    description: "how-to steps → single-column",
  },
  {
    prompt: "what is machine learning",
    duration: 10,
    expectedLayout: "single-column",
    description: "ML explainer (no architecture keywords) → single-column",
  },
  {
    prompt: "benefits of using TypeScript over JavaScript",
    duration: 15,
    expectedLayout: "any",   // could go either way — either is fine
    description: "ambiguous: may be single or two-column",
  },

  // ── Edge cases / stress tests ──────────────────────────────────────────────
  {
    prompt: "kubernetes pod scheduling and resource management",
    duration: 20,
    expectedLayout: "any",
    description: "infra topic — AI decides layout",
  },
  {
    prompt: "a 5-second intro about video generation with AI",
    duration: 5,
    expectedLayout: "any",
    description: "short 5s video — timing table stress test",
  },
  {
    prompt: "event-driven architecture with producer and consumer services",
    duration: 15,
    expectedLayout: "two-column",
    description: "producer/consumer keywords → two-column",
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────

const isFast = process.argv.includes("--fast");
const DELAY_MS = isFast ? 0 : 1200; // gentle rate-limit buffer

async function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

interface ResultRow {
  idx:     number;
  prompt:  string;
  pass:    boolean;
  layout:  string;
  errors:  number;
  warnings: number;
  llmError?: string;
  note:    string;
}

async function runEval() {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(" VideoGPT Phase 6B — Eval Harness");
  console.log(`  ${TEST_CASES.length} prompts  |  model: ${process.env.OPENROUTER_MODEL ?? "default"}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  const results: ResultRow[] = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    process.stdout.write(`[${String(i + 1).padStart(2)}/${TEST_CASES.length}] ${tc.description} … `);

    let result: ResultRow;
    try {
      const { brief, diagnostics } = await runGeneratePipeline(tc.prompt, tc.duration);
      const layoutOk =
        tc.expectedLayout === "any" || brief.layout === tc.expectedLayout;
      const pass =
        diagnostics.errorCount === 0 && !diagnostics.llmError && layoutOk;

      result = {
        idx:      i + 1,
        prompt:   tc.prompt,
        pass,
        layout:   brief.layout,
        errors:   diagnostics.errorCount,
        warnings: diagnostics.warningCount,
        llmError: diagnostics.llmError,
        note: [
          !layoutOk
            ? `layout=${brief.layout} (expected ${tc.expectedLayout})`
            : "",
          diagnostics.llmError
            ? `LLM ERR: ${diagnostics.llmError.slice(0, 120)}`
            : "",
          diagnostics.errorCount > 0
            ? `${diagnostics.errorCount} err`
            : "",
        ]
          .filter(Boolean)
          .join(", ") || "ok",
      };
    } catch (err) {
      result = {
        idx:      i + 1,
        prompt:   tc.prompt,
        pass:     false,
        layout:   "?",
        errors:   -1,
        warnings: 0,
        llmError: err instanceof Error ? err.message : String(err),
        note:     "threw unexpectedly",
      };
    }

    results.push(result);
    console.log(result.pass ? "✅ PASS" : `❌ FAIL  (${result.note})`);

    if (i < TEST_CASES.length - 1 && DELAY_MS > 0) {
      await sleep(DELAY_MS);
    }
  }

  // ── Summary matrix ─────────────────────────────────────────────────────────

  const passed = results.filter((r) => r.pass).length;
  const total  = results.length;
  const rate   = Math.round((passed / total) * 100);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" RESULTS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(
    `${"#".padEnd(3)} ${"PASS".padEnd(5)} ${"LAYOUT".padEnd(14)} ${"ERR".padEnd(4)} ${"WARN".padEnd(5)} NOTE`,
  );
  console.log("─".repeat(70));
  for (const r of results) {
    console.log(
      `${String(r.idx).padEnd(3)} ${(r.pass ? "✅" : "❌").padEnd(5)} ${r.layout.padEnd(14)} ${String(r.errors).padEnd(4)} ${String(r.warnings).padEnd(5)} ${r.note}`,
    );
  }
  console.log("─".repeat(70));
  console.log(`\nPassed ${passed}/${total} (${rate}%)`);

  const threshold = 80;
  if (rate >= threshold) {
    console.log(`✅ Eval passed — ≥${threshold}% success rate\n`);
    process.exit(0);
  } else {
    console.log(`❌ Eval failed — below ${threshold}% threshold\n`);
    process.exit(1);
  }
}

runEval().catch((err) => {
  console.error("Eval harness crashed:", err);
  process.exit(1);
});
