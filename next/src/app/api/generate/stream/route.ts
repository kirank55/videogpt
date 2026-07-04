import { NextRequest } from "next/server";
import { GenerateRequestSchema } from "@/lib/agent/schemas/api";
import { runGeneratePipeline, type PipelineEvent } from "@/lib/agent/ai/pipeline";
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
  const duration = resolveDuration(rawDuration);

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

      // The pipeline owns the full intake (prompt → LLM → expand). This route
      // only owns SSE framing: it maps pipeline phase events to SSE events.
      const onEvent = (event: PipelineEvent) => {
        switch (event.type) {
          case "prompt-built":
          case "calling-openrouter":
          case "expanding":
            send("phase", { phase: event.type });
            break;
          case "streaming":
            tokenCount = event.tokenCount;
            send("chunk", { tokenCount: event.tokenCount, charCount: event.charCount });
            break;
        }
      };

      const { project, brief, projectName, summary: llmSummary, diagnostics } = await runGeneratePipeline(
        prompt,
        duration,
        { onEvent },
      );

      const { llmError, rawBrief } = diagnostics;

      if (llmError) {
        console.error("[api/generate/stream] error:", llmError);
        send("error", { message: llmError });
      } else {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(
          `[api/generate/stream] done (${elapsed}s) scenes=${brief.scenes.length} ` +
          `events=${project.events.length} tokens~=${tokenCount}`,
        );

        const summary =
          llmSummary || `Here's a ${duration}s animation for: "${prompt}". Modify it or ask for changes.`;

        send("done", {
          project,
          brief,
          projectName,
          summary,
          rawBrief,
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
