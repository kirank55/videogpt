import { NextRequest, NextResponse } from "next/server";
import { generateVideoPart } from "@/lib/agent/videoParts/pipeline";
import {
  GenerateVideoPartRequestSchema,
  type GenerateVideoPartRequest,
  type GeneratedVideoPart,
} from "@/lib/agent/videoParts/schemas";

type VideoPartGenerator = (request: GenerateVideoPartRequest) => Promise<GeneratedVideoPart>;

export async function handleGenerateVideoPartRequest(
  req: NextRequest,
  generator: VideoPartGenerator = generateVideoPart,
) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = GenerateVideoPartRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const result = await generator(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[api/dev/generate-part] ${parsed.data.part} failed:`, message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  return handleGenerateVideoPartRequest(req);
}
