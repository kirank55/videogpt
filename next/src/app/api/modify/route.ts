import { NextRequest, NextResponse } from "next/server";
import { ModifyRequestSchema } from "@/lib/schemas/api";
import { createSeedProject } from "@/lib/alpha/createSeedProject";

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
      { status: 422 }
    );
  }

  const { prompt } = parsed.data;

  // Phase 5 stub — derives a new project name from the modify instruction.
  // Phase 6B will replace this with runModifyPipeline(currentBrief, instruction, duration).
  const modifiedName = prompt.slice(0, 40) || "Modified Project";
  const project = createSeedProject(modifiedName, 5);

  const summary = `Updated: "${prompt}". The canvas has been refreshed.`;

  const diagnostics = {
    phase: "stub",
    message: "Stub response — real modify pipeline wired in Phase 6B",
  };

  return NextResponse.json({ project, summary, diagnostics });
}
