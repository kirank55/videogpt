import { NextRequest } from "next/server";
import { ModifyRequestSchema } from "@/lib/agent/schemas/api";
import { runModifyPipeline } from "@/lib/agent/ai/pipeline";
import { validateBrief } from "@/lib/agent/brief/validateBrief";
import { resolveDuration } from "@/lib/agent/schemas/brief";

function sseEvent(type: string, data: unknown): string {
  return `data: ${JSON.stringify({ type, ...(typeof data === "object" && data !== null ? data : { payload: data }) })}\n\n`;
}

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

  const parsed = ModifyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      sseEvent("error", { message: "Invalid request" }),
      { status: 422, headers: { "Content-Type": "text/event-stream" } },
    );
  }

  const { prompt, brief: rawBrief } = parsed.data;

  const currentBrief = validateBrief(
    typeof rawBrief === "object" && rawBrief !== null ? rawBrief : {},
  );

  const rawDur =
    typeof rawBrief === "object" &&
      rawBrief !== null &&
      "duration" in rawBrief
      ? (rawBrief as Record<string, unknown>).duration
      : 15;
  const duration = resolveDuration(rawDur, 15);

  const authHeader = req.headers.get("authorization");
  const customApiKey = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined;

  console.log(`[api/modify/stream] instruction="${prompt}" duration=${duration}s`);
  const t0 = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();

      function send(type: string, data: unknown) {
        try {
          if (controller.desiredSize !== null) {
            controller.enqueue(enc.encode(sseEvent(type, data)));
          }
        } catch (e) {
          console.warn("[api/modify/stream] send failed (controller closed):", e);
        }
      }

      let tokenCount = 0;

      // The intake (LLM call → validate → hydrate → build → quality) lives in the
      // pipeline module; this route only owns the SSE framing + token progress.
      // On failure the pipeline re-expands the current brief unchanged, so the
      // error event still carries a renderable project.
      const { project, brief, diagnostics } = await runModifyPipeline(
        currentBrief,
        prompt,
        duration,
        {
          apiKey: customApiKey,
          onChunk: (_delta, accumulated) => {
            tokenCount = Math.round(accumulated.length / 4);
            send("chunk", { tokenCount, charCount: accumulated.length });
          },
        },
      );

      const { errorCount, warningCount, llmError, rawBrief: rawResult } = diagnostics;

      if (llmError) {
        console.error("[api/modify/stream] error:", llmError);
        send("error", { message: llmError, project, brief });
      } else {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`[api/modify/stream] done (${elapsed}s) events=${project.events.length} errors=${errorCount}`);

        const summary =
          `Updated: "${prompt}". Canvas has been refreshed.` +
          (errorCount > 0 ? ` (${errorCount} issue(s) — see diagnostics)` : "");

        send("done", {
          project,
          brief,
          summary,
          diagnostics: { qualityResult: diagnostics.qualityResult, errorCount, warningCount, rawBrief: rawResult },
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
