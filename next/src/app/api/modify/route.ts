import { NextRequest, NextResponse } from "next/server";
import { ModifyRequestSchema } from "@/lib/agent/schemas/api";
import { runModifyPipeline } from "@/lib/agent/ai/pipeline";
import { validateBrief } from "@/lib/agent/brief/validateBrief";
import { resolveDuration } from "@/lib/agent/schemas/brief";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ModifyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { prompt, brief: rawBrief } = parsed.data;

  // Normalise the stored brief (or fallback to defaults if missing/corrupt)
  const currentBrief = validateBrief(
    typeof rawBrief === "object" && rawBrief !== null ? rawBrief : {},
  );

  // Recover duration from the stored brief object if the client sent it
  const rawDur =
    typeof rawBrief === "object" &&
      rawBrief !== null &&
      "duration" in rawBrief
      ? (rawBrief as Record<string, unknown>).duration
      : 15;
  const duration = resolveDuration(rawDur, 15);

  console.log(
    `[api/modify] instruction="${prompt}" ` +
    `currentBrief.layout=${currentBrief.layout} duration=${duration}s`,
  );
  const t0 = Date.now();

  const { project, brief, diagnostics } = await runModifyPipeline(
    currentBrief,
    prompt,
    duration,
  );

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const { errorCount, llmError } = diagnostics;

  if (llmError) {
    console.warn(`[api/modify] LLM error (${elapsed}s): ${llmError}`);
  } else {
    console.log(
      `[api/modify] done (${elapsed}s) layout=${brief.layout} ` +
      `palette=${brief.palette}/${brief.style} ` +
      `events=${project.events.length} errors=${errorCount}`,
    );
  }

  const summary =
    llmError
      ? `⚠️ AI modification failed: ${llmError.slice(0, 120)}`
      : `Updated: "${prompt}". Canvas has been refreshed.` +
      (errorCount > 0 ? ` (${errorCount} issue(s) — see diagnostics)` : "");

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
      warningCount: diagnostics.warningCount,
    },
  });
}
