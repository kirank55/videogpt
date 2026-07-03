// ── OpenRouter Client ─────────────────────────────────────────────────────────
//
// NOTE: This module deliberately does NOT import `@/lib/env` because it is also
// used by CLI scripts (eval, diag) that load env vars via `--env-file` flag.
// Those scripts bypass Next.js, so `@/` path aliases aren't always available.
// Instead, we read `process.env` directly and validate inline.
//
// Calls the OpenRouter chat-completion API with `response_format: json_object`
// so the model is constrained to return a valid JSON object.
//
// Two modes:
//   callOpenRouter        — waits for the full response (used by scripts/eval)
//   callOpenRouterStream  — SSE streaming; calls onChunk() per delta token
//
// Errors thrown here surface to the pipeline as uncaught exceptions, which
// the pipeline catches and returns as diagnostics.

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const FREE_MODELS = ["cohere/north-mini-code:free", "nvidia/nemotron-3-ultra-550b-a55b:free", "poolside/laguna-m.1:free"]

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenRouterOptions {
  /** OpenRouter model id.  Falls back to env var, then DEFAULT_MODEL. */
  model?: string;
  /** max_tokens for the completion (default 800 — brief is ~200 tokens). */
  maxTokens?: number;
  /** temperature (default 0.7). */
  temperature?: number;
  /** Fires with OpenRouter's token usage stats when the response includes them. */
  onUsage?: (usage: Usage) => void;
}

export interface StreamingOpenRouterOptions extends OpenRouterOptions {
  /**
   * Called for each token chunk as the model streams.
   * `delta` is the new text fragment; `accumulated` is everything so far.
   */
  onChunk?: (delta: string, accumulated: string) => void;
}

/**
 * Call OpenRouter and return the parsed JSON response as `unknown`.
 *
 * @param systemPrompt  Full system prompt (see prompts.ts)
 * @param userPrompt    The user's raw request string
 * @param opts          Optional model / generation parameters
 * @returns             The parsed JSON value (unknown — caller validates with validateBrief)
 * @throws              On HTTP errors, missing API key, or JSON parse failure
 */
export async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string | Array<unknown>,
  opts: OpenRouterOptions = {},
): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set.  " +
      "Add it to .env.local as OPENROUTER_API_KEY=sk-or-...",
    );
  }

  // Helper to run a single request against a model
  async function attemptRequest(modelName: string): Promise<unknown> {
    console.log(`[ai/openrouter] Requesting model: ${modelName}`);

    const body: Record<string, unknown> = {
      model: modelName,
      max_tokens: opts.maxTokens ?? 8192,
      temperature: opts.temperature ?? 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };
    body.response_format = { type: "json_object" };

    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://videogpt.local",
        "X-Title": "VideoGPT",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "(no body)");
      throw new Error(
        `OpenRouter HTTP ${res.status} ${res.statusText}: ${text.slice(0, 400)}`,
      );
    }

    console.log(`[ai/openrouter] Response received from ${modelName} (status ${res.status})`);

    const data = (await res.json()) as {
      choices?: Array<{
        finish_reason?: string;
        message?: {
          content?: string | null;
          parsed?: unknown;
          reasoning?: string | null;
        };
      }>;
      error?: { message?: string };
      usage?: Usage;
    };

    if (data.error?.message) {
      throw new Error(`OpenRouter API error: ${data.error.message}`);
    }

    if (data.usage) opts.onUsage?.(data.usage);

    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error("OpenRouter returned no choices");
    }

    if (choice.message?.parsed !== undefined) {
      return choice.message.parsed;
    }

    const raw = choice.message?.content;
    if (!raw) {
      const reason = choice.finish_reason ?? "unknown";
      throw new Error(
        `OpenRouter returned empty content (finish_reason=${reason}).`,
      );
    }

    const cleaned = raw.trim().replace(/^```(?:json)?\s*\n?|\n?```\s*$/g, "").trim();

    try {
      return JSON.parse(cleaned) as unknown;
    } catch {
      throw new Error(
        `OpenRouter content is not valid JSON: ${cleaned.slice(0, 300)}`,
      );
    }
  }

  const defaultModel = opts.model ?? process.env.DEFAULT_MODEL;

  if (defaultModel) {
    return await attemptRequest(defaultModel);
  }

  // Otherwise, loop through free models until valid JSON is generated
  console.log(`[ai/openrouter] No DEFAULT_MODEL in env. Looping through free models: ${FREE_MODELS.join(", ")}`);
  const errors: Error[] = [];
  for (const model of FREE_MODELS) {
    try {
      const result = await attemptRequest(model);
      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[ai/openrouter] Model ${model} failed: ${errMsg}`);
      errors.push(err instanceof Error ? err : new Error(errMsg));
    }
  }

  throw new Error(
    `All free models failed to generate valid JSON. Errors:\n` +
    errors.map((e, idx) => `[${FREE_MODELS[idx]}]: ${e.message}`).join("\n")
  );
}

// ── Streaming variant ─────────────────────────────────────────────────────────

/**
 * Like callOpenRouter but streams the response via SSE.
 * Calls opts.onChunk() for each token delta so the caller can show live progress.
 * Returns the fully accumulated + parsed JSON once the stream ends.
 * Falls back to callOpenRouter (non-streaming) if the model/network doesn't support it.
 */
export async function callOpenRouterStream(
  systemPrompt: string,
  userPrompt: string,
  opts: StreamingOpenRouterOptions = {},
): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. " +
      "Add it to .env.local as OPENROUTER_API_KEY=sk-or-...",
    );
  }

  const model =
    opts.model ??
    process.env.DEFAULT_MODEL ??
    FREE_MODELS[0];

  console.log(`[ai/openrouter] Streaming request to model: ${model}`);

  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens ?? 8192,
    temperature: opts.temperature ?? 0.7,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  body.response_format = { type: "json_object" };

  let res: Response;
  try {
    res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://videogpt.local",
        "X-Title": "VideoGPT",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // Network error — fall back to non-streaming
    console.warn("[ai/openrouter] Stream fetch failed, falling back:", err);
    return callOpenRouter(systemPrompt, userPrompt, opts);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    // Fall back for HTTP errors too
    console.warn(`[ai/openrouter] Stream HTTP ${res.status}, falling back: ${text.slice(0, 200)}`);
    return callOpenRouter(systemPrompt, userPrompt, opts);
  }

  if (!res.body) {
    console.warn("[ai/openrouter] No response body for stream, falling back");
    return callOpenRouter(systemPrompt, userPrompt, opts);
  }

  // Read SSE stream
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines
      const lines = buffer.split("\n");
      // Keep the last (possibly incomplete) line in buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6)) as {
            choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
            usage?: Usage;
          };
          if (json.usage) opts.onUsage?.(json.usage);
          const delta = json.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            accumulated += delta;
            opts.onChunk?.(delta, accumulated);
          }
        } catch {
          // Malformed SSE line — skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!accumulated.trim()) {
    throw new Error("OpenRouter stream returned empty content");
  }

  const cleaned = accumulated.trim().replace(/^```(?:json)?\s*\n?|\n?```\s*$/g, "").trim();

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    throw new Error(
      `OpenRouter stream content is not valid JSON: ${cleaned.slice(0, 300)}`,
    );
  }
}
