import { NextRequest } from "next/server";
import { GenerateRequestSchema } from "@/lib/agent/schemas/api";
import { generateComposedVideo } from "@/lib/agent/videoParts/composedVideo";
import { resolveDuration } from "@/lib/others/schemas/duration";

function sseEvent(type: string, data: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(sseEvent("error", { message: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(sseEvent("error", { message: "Invalid request" }), {
      status: 422,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const duration = resolveDuration(parsed.data.duration);
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (type: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseEvent(type, data)));
      };
      try {
        const result = await generateComposedVideo(
          { prompt: parsed.data.prompt, duration },
          {
            callModel: (await import("@/lib/agent/ai/openrouter")).callOpenRouter,
            onPhase: (phase) => send("phase", { phase }),
          },
        );
        send("done", {
          project: result.project,
          projectName: result.projectName,
          summary: result.summary,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[api/generate/stream] composed generation failed:", message);
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
