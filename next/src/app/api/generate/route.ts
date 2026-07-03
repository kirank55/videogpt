import { NextRequest, NextResponse } from "next/server";
import { GenerateRequestSchema } from "@/lib/agent/schemas/api";
import { runGeneratePipeline } from "@/lib/agent/ai/pipeline";
import { resolveDuration } from "@/lib/agent/schemas/brief";

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
  const duration = resolveDuration(rawDuration, 15);

  console.log(`[api/generate] prompt="${prompt}" duration=${duration}s`);
  const t0 = Date.now();

  const { project, brief, projectName, summary: llmSummary, diagnostics } = await runGeneratePipeline(prompt, duration);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const { llmError } = diagnostics;

  if (llmError) {
    console.warn(`[api/generate] LLM error (${elapsed}s): ${llmError}`);
  } else {
    console.log(
      `[api/generate] done (${elapsed}s) layout=${brief.layout} ` +
      `palette=${brief.palette}/${brief.style} ` +
      `events=${project.events.length}`,
    );
  }

  const summary =
    llmError
      ? `⚠️ AI generation failed: ${llmError.slice(0, 120)}`
      : llmSummary || `Here's a ${duration}s animation for: "${prompt}". Modify it or ask for changes.`;

  if (llmError) {
    return NextResponse.json({
      error: llmError,
      summary,
    }, { status: 502 });
  }

  return NextResponse.json({
    project,
    brief,
    projectName,
    summary,
  });
}
// Force Next.js API route compilation refresh after prompt updates
