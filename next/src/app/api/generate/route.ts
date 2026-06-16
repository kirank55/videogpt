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

  const { project, brief, diagnostics } = await runGeneratePipeline(prompt, duration);

  const { errorCount, warningCount, llmError } = diagnostics;

  const summary =
    llmError
      ? `⚠️ AI generation failed — showing fallback layout. (${llmError.slice(0, 120)})`
      : `Here's a ${duration}s animation for: "${prompt}". ` +
        (errorCount === 0
          ? "Canvas looks clean — modify it or ask for changes."
          : `${errorCount} issue(s) detected — see diagnostics.`);

  return NextResponse.json({
    project,
    brief,
    summary,
    diagnostics: {
      ...diagnostics,
      errorCount,
      warningCount,
    },
  });
}
