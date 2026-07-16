import { NextRequest, NextResponse } from "next/server";
import { generateComposedVideo } from "@/lib/agent/videoParts/composedVideo";
import { GenerateRequestSchema } from "@/lib/agent/schemas/api";
import { resolveDuration } from "@/lib/others/schemas/duration";

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
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
    console.error(`[api/generate] request ${requestId} failed:`, error);
    const message = "The model could not complete this video. Please try again.";
    return NextResponse.json({ error: message, summary: message, requestId }, { status: 502 });
  }
}
