import { NextRequest } from "next/server";
import { GenerateRequestSchema } from "@/lib/agent/schemas/api";
import { generateComposedVideo } from "@/lib/agent/videoParts/composedVideo";
import { resolveDuration } from "@/lib/others/schemas/duration";
import type { GenerationPart } from "@/types/generate";

function sseEvent(type: string, data: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

type ServerProgress = {
  characterCount: number;
  sentCharacterCount: number;
  completionTokens: number;
  lastSentAt: number;
};

function publicErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Generation was cancelled before it completed.";
  }
  return "The model could not complete this video. Please try again.";
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
  const requestId = crypto.randomUUID();
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      const send = (type: string, data: Record<string, unknown>) => {
        if (!closed) controller.enqueue(encoder.encode(sseEvent(type, data)));
      };
      const progress = Object.fromEntries(
        (["bookends", "summary", "main-diagram"] as GenerationPart[]).map((part) => [part, {
          characterCount: 0,
          sentCharacterCount: 0,
          completionTokens: 0,
          lastSentAt: 0,
        }]),
      ) as Record<GenerationPart, ServerProgress>;

      const sendProgress = (part: GenerationPart, force = false) => {
        const current = progress[part];
        const now = Date.now();
        if (!force
          && current.characterCount - current.sentCharacterCount < 128
          && now - current.lastSentAt < 250) return;
        current.sentCharacterCount = current.characterCount;
        current.lastSentAt = now;
        send("model-progress", {
          part,
          characterCount: current.characterCount,
          estimatedTokens: Math.ceil(current.characterCount / 4),
          ...(current.completionTokens > 0 ? { completionTokens: current.completionTokens } : {}),
        });
      };

      const heartbeat = setInterval(() => send("heartbeat", { requestId }), 15_000);
      send("started", { requestId });
      try {
        const result = await generateComposedVideo(
          { prompt: parsed.data.prompt, duration },
          {
            callModel: (await import("@/lib/agent/ai/openrouter")).callOpenRouter,
            signal: req.signal,
            onPhase: (phase) => send("phase", { phase }),
            onModelProgress: (part, chunk) => {
              progress[part].characterCount += chunk.characterCount;
              sendProgress(part);
            },
            onModelUsage: (part, usage) => {
              progress[part].completionTokens += usage.completion_tokens;
              sendProgress(part, true);
            },
            onModelComplete: (part) => {
              sendProgress(part, true);
              send("model-complete", {
                part,
                ...(progress[part].completionTokens > 0
                  ? { completionTokens: progress[part].completionTokens }
                  : {}),
              });
            },
          },
        );
        send("done", {
          project: result.project,
          projectName: result.projectName,
          summary: result.summary,
        });
      } catch (error) {
        console.error(`[api/generate/stream] request ${requestId} failed:`, error);
        send("error", { message: publicErrorMessage(error), requestId });
      } finally {
        clearInterval(heartbeat);
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Request-Id": requestId,
    },
  });
}
