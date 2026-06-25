import { NextRequest } from "next/server";
import { GenerateRequestSchema } from "@/lib/schemas/api";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { callOpenRouterStream } from "@/lib/ai/openrouter";
import { validateBrief } from "@/lib/brief/validateBrief";
import { buildProjectFromBrief, hydrateBrief } from "@/lib/brief/buildProjectFromBrief";
import { validateProject, runQualityGate } from "@/lib/renderer";
import type { SupportedDuration } from "@/lib/schemas/brief";
import { SUPPORTED_DURATIONS } from "@/lib/schemas/brief";

const VALID_DURATIONS = new Set<number>(SUPPORTED_DURATIONS);

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
  const duration: SupportedDuration = VALID_DURATIONS.has(rawDuration)
    ? (rawDuration as SupportedDuration)
    : 15;

  const authHeader = req.headers.get("authorization");
  const customApiKey = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined;

  const systemPrompt = buildSystemPrompt(duration);

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

      try {
        const rawBrief = await callOpenRouterStream(systemPrompt, prompt, {
          apiKey: customApiKey,
          onChunk: (_delta, accumulated) => {
            tokenCount = Math.round(accumulated.length / 4); // rough token estimate
            send("chunk", { tokenCount, charCount: accumulated.length });
          },
        });

        const brief   = hydrateBrief(validateBrief(rawBrief));
        const project = buildProjectFromBrief(brief, duration);

        const qualityResult = runQualityGate(project);
        const issues        = validateProject(project);
        const errorCount    = issues.filter((d) => d.severity === "error").length;
        const warningCount  = issues.filter((d) => d.severity === "warning").length;

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
          diagnostics: { qualityResult, errorCount, warningCount, rawBrief },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api/generate/stream] error:", message);
        send("error", { message });
      } finally {
        try {
          if (controller.desiredSize !== null) {
            controller.close();
          }
        } catch (e) {
          // Ignore close errors
        }
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
