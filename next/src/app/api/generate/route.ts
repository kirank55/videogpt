import { NextRequest, NextResponse } from "next/server";
import { generateComposedVideo } from "@/lib/agent/videoParts/composedVideo";
import { GenerateRequestSchema } from "@/lib/agent/schemas/api";
import { resolveDuration } from "@/lib/others/schemas/duration";

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

  const duration = resolveDuration(parsed.data.duration);
  try {
    const result = await generateComposedVideo({
      prompt: parsed.data.prompt,
      duration,
    });
    return NextResponse.json({
      project: result.project,
      projectName: result.projectName,
      summary: result.summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api/generate] composed generation failed:", message);
    return NextResponse.json({ error: message, summary: message }, { status: 502 });
  }
}
