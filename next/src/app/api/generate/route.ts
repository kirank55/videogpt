import { NextRequest, NextResponse } from "next/server";
import { GenerateRequestSchema } from "@/lib/schemas/api";
import { runGeneratePipeline }   from "@/lib/ai/pipeline";
import type { SupportedDuration } from "@/lib/schemas/brief";
import { SUPPORTED_DURATIONS }   from "@/lib/schemas/brief";

const VALID_DURATIONS = new Set<number>(SUPPORTED_DURATIONS);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { prompt, duration: rawDuration } = parsed.data;

  const duration: SupportedDuration = VALID_DURATIONS.has(rawDuration)
    ? (rawDuration as SupportedDuration)
    : 15;

  const authHeader = req.headers.get("authorization");
  const customApiKey = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined;

  console.log(`[api/generate] prompt="${prompt}" duration=${duration}s`);
  const t0 = Date.now();

  const { project, brief, diagnostics } = await runGeneratePipeline(prompt, duration, customApiKey);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const { errorCount, warningCount, llmError } = diagnostics;

  if (llmError) {
    console.warn(`[api/generate] LLM error (${elapsed}s): ${llmError}`);
  } else {
    console.log(
      `[api/generate] done (${elapsed}s) layout=${brief.layout} ` +
      `palette=${brief.palette}/${brief.style} ` +
      `events=${project.events.length} errors=${errorCount} warnings=${warningCount}`,
    );
  }

  const summary =
    llmError
      ? `⚠️ AI generation failed: ${llmError.slice(0, 120)}`
      : `Here's a ${duration}s animation for: "${prompt}". ` +
        (errorCount === 0
          ? "Canvas looks clean — modify it or ask for changes."
          : `${errorCount} issue(s) detected — see diagnostics.`);

  if (llmError) {
    return NextResponse.json({
      error: llmError,
      summary,
    }, { status: 502 });
  }

  return NextResponse.json({
    project,
    brief,
    summary,
    diagnostics: {
      ...diagnostics,
      errorCount,
      warningCount,
      qualityResult: diagnostics.qualityResult,
    },
  });
}
// Force Next.js API route compilation refresh after prompt updates
