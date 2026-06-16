import { NextRequest, NextResponse } from "next/server";
import { GenerateRequestSchema } from "@/lib/schemas/api";
import { buildProjectFromBrief } from "@/lib/brief/buildProjectFromBrief";
import { validateBrief } from "@/lib/brief/validateBrief";
import type { VideoBrief, SupportedDuration } from "@/lib/schemas/brief";
import { SUPPORTED_DURATIONS } from "@/lib/schemas/brief";
import { validateProject } from "@/lib/renderer";

// ── Phase 6A hardcoded brief ─────────────────────────────────────────────────
//
// This brief is replaced by a real LLM call in Phase 6B.
// It intentionally mirrors the hybridProject content so the output is
// immediately recognisable as a high-quality reference.

const DEMO_BRIEF: VideoBrief = {
  layout: "two-column",
  title: "Client–Server Architecture",
  subtitle: "How modern web apps communicate",
  closingLine: "Every request. Every response. Every connection.",
  leftHeader: "CLIENT",
  rightHeader: "SERVER",
  leftRows: ["Browser", "HTTP Layer", "Network"],
  rightRows: ["REST API", "Business Logic", "PostgreSQL"],
  flow: true,
  requestLabel: "POST /api/users",
  requestBody: "{ name, email, password }",
  responseLabel: "201 Created",
  processingSteps: ["Validate request", "Hash password", "INSERT INTO users"],
  palette: "midnight",
  style: "modern",
};

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

  // Clamp duration to a SupportedDuration
  const duration: SupportedDuration = VALID_DURATIONS.has(rawDuration)
    ? (rawDuration as SupportedDuration)
    : 15;

  // Phase 6A: expand hardcoded brief → Phase 6B replaces with LLM output
  const brief = validateBrief({ ...DEMO_BRIEF, title: prompt.slice(0, 60) || DEMO_BRIEF.title });
  const project = buildProjectFromBrief(brief, duration);

  const diagnostics = validateProject(project);
  const errorCount   = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter((d) => d.severity === "warning").length;

  const summary =
    `Here's a ${duration}s animation for: "${prompt}". ` +
    (errorCount === 0
      ? "Canvas looks clean — modify it or ask for changes."
      : `${errorCount} issue(s) detected — see diagnostics.`);

  return NextResponse.json({
    project,
    brief,
    summary,
    diagnostics: {
      phase: "6a-stub",
      issues: diagnostics,
      errorCount,
      warningCount,
    },
  });
}
