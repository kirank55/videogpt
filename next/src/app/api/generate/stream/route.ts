import { NextRequest } from "next/server";
import { GenerateRequestSchema } from "@/lib/agent/schemas/api";
import { runGeneratePipeline } from "@/lib/agent/ai/pipeline";
import { resolveDuration } from "@/lib/agent/schemas/brief";

// ── SSE helpers ───────────────────────────────────────────────────────────────

function sseEvent(type: string, data: unknown): string {
  return `data: ${JSON.stringify({ type, ...( typeof data === "object" && data !== null ? data : { payload: data }) })}\n\n`;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      sseEvent("error", { message: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "text/event-stream" } },
    );
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      sseEvent("error", { message: "Invalid request" }),
      { status: 422, headers: { "Content-Type": "text/event-stream" } },
    );
  }

  const { prompt, duration: rawDuration } = parsed.data;
  const duration = resolveDuration(rawDuration, 15);

  console.log(`[api/generate/stream] prompt="${prompt}" duration=${duration}s`);
  const t0 = Date.now();

  // ── Build the SSE stream ──────────────────────────────────────────────────

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();

      function send(type: string, data: unknown) {
        try {
          if (controller.desiredSize !== null) {
            controller.enqueue(enc.encode(sseEvent(type, data)));
          }
        } catch (e) {
          console.warn("[api/generate/stream] send failed (controller closed):", e);
        }
      }

      let tokenCount = 0;

      // The intake (LLM call → validate → hydrate → build → quality) lives in the
      // pipeline module; this route only owns the SSE framing + token progress.
      const { project, brief, diagnostics } = await runGeneratePipeline(
        prompt,
        duration,
        {
          onChunk: (_delta, accumulated) => {
            tokenCount = Math.round(accumulated.length / 4); // rough token estimate
            send("chunk", { tokenCount, charCount: accumulated.length });
          },
        },
      );

      const { errorCount, warningCount, llmError, rawBrief } = diagnostics;

      if (llmError) {
        console.error("[api/generate/stream] error:", llmError);
        send("error", { message: llmError });
      } else {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(
          `[api/generate/stream] done (${elapsed}s) layout=${brief.layout} ` +
          `events=${project.events.length} errors=${errorCount} tokens~=${tokenCount}`,
        );

        const summary =
          errorCount === 0
            ? `Here's a ${duration}s animation for: "${prompt}". Canvas looks clean — modify it or ask for changes.`
            : `Here's a ${duration}s animation for: "${prompt}". ${errorCount} issue(s) detected — see diagnostics.`;

        send("done", {
          project,
          brief,
          summary,
          diagnostics: { qualityResult: diagnostics.qualityResult, errorCount, warningCount, rawBrief },
        });
      }

      try {
        if (controller.desiredSize !== null) {
          controller.close();
        }
      } catch {
        // Ignore close errors
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
