import { NextRequest, NextResponse } from "next/server";
import { ModifyRequestSchema }      from "@/lib/schemas/api";
import { runModifyPipeline }        from "@/lib/ai/pipeline";
import { validateBrief }            from "@/lib/brief/validateBrief";
import type { SupportedDuration }   from "@/lib/schemas/brief";
import { SUPPORTED_DURATIONS }      from "@/lib/schemas/brief";

const VALID_DURATIONS = new Set<number>(SUPPORTED_DURATIONS);

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

  const duration: SupportedDuration =
    typeof rawDur === "number" && VALID_DURATIONS.has(rawDur)
      ? (rawDur as SupportedDuration)
      : 15;

  const { project, brief, diagnostics } = await runModifyPipeline(
    currentBrief,
    prompt,
    duration,
  );

  const { errorCount, llmError } = diagnostics;

  const summary =
    llmError
      ? `⚠️ AI modification failed — brief unchanged. (${llmError.slice(0, 120)})`
      : `Updated: "${prompt}". Canvas has been refreshed.` +
        (errorCount > 0 ? ` (${errorCount} issue(s) — see diagnostics)` : "");

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
