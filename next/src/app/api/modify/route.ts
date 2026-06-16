import { NextRequest, NextResponse } from "next/server";
import { ModifyRequestSchema } from "@/lib/schemas/api";
import { buildProjectFromBrief } from "@/lib/brief/buildProjectFromBrief";
import { validateBrief } from "@/lib/brief/validateBrief";
import type { SupportedDuration } from "@/lib/schemas/brief";
import { SUPPORTED_DURATIONS } from "@/lib/schemas/brief";
import { validateProject } from "@/lib/renderer";

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

  // Phase 6A: re-validate the stored brief (or fall back to defaults), then
  // re-apply the modify instruction as a title update.
  // Phase 6B replaces this with runModifyPipeline(currentBrief, instruction, duration).
  const existingBrief = rawBrief ?? {};
  const updatedBrief = validateBrief({
    ...(typeof existingBrief === "object" && existingBrief !== null ? existingBrief : {}),
    // Reflect the modify prompt in the title as a minimal stub mutation
    title: prompt.slice(0, 60) || "Modified Project",
  });

  // Use stored duration if present, otherwise 15s
  const rawDur =
    typeof existingBrief === "object" &&
    existingBrief !== null &&
    "duration" in existingBrief
      ? (existingBrief as Record<string, unknown>).duration
      : 15;
  const duration: SupportedDuration =
    typeof rawDur === "number" && VALID_DURATIONS.has(rawDur)
      ? (rawDur as SupportedDuration)
      : 15;

  const project = buildProjectFromBrief(updatedBrief, duration);

  const diagnostics = validateProject(project);
  const errorCount   = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter((d) => d.severity === "warning").length;

  const summary =
    `Updated: "${prompt}". Canvas has been refreshed.` +
    (errorCount > 0 ? ` (${errorCount} issue(s) — see diagnostics)` : "");

  return NextResponse.json({
    project,
    brief: updatedBrief,
    summary,
    diagnostics: {
      phase: "6a-stub",
      issues: diagnostics,
      errorCount,
      warningCount,
    },
  });
}
