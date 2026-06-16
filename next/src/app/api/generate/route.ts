import { NextRequest, NextResponse } from "next/server";
import { GenerateRequestSchema } from "@/lib/schemas/api";
import { createSeedProject } from "@/lib/alpha/createSeedProject";

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
      { status: 422 }
    );
  }

  const { prompt, duration } = parsed.data;

  // Phase 5 stub — returns createSeedProject until Phase 6A wires in buildProjectFromBrief
  const projectName = prompt.slice(0, 40) || "Untitled Project";
  const project = createSeedProject(projectName, duration);

  const summary = `Here's a ${duration}s animation for: "${prompt}". Modify it or ask for changes.`;

  const diagnostics = {
    phase: "stub",
    message: "Stub response — real AI pipeline wired in Phase 6B",
  };

  return NextResponse.json({ project, summary, diagnostics });
}
