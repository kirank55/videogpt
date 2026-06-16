// ── OpenRouter Client ─────────────────────────────────────────────────────────
//
// Calls the OpenRouter chat-completion API with `response_format: json_schema`
// so the model is constrained to return a valid JSON object.
//
// The schema passed in must be a valid JSON Schema object describing the
// expected shape.  The response body is parsed and the `parsed` field
// (or the raw content parsed as JSON) is returned as `unknown`.
//
// Errors thrown here surface to the pipeline as uncaught exceptions, which
// the pipeline catches and returns as diagnostics.

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL      = "moonshotai/kimi-k2.5";

export interface OpenRouterOptions {
  /** OpenRouter model id.  Falls back to env var, then DEFAULT_MODEL. */
  model?: string;
  /** max_tokens for the completion (default 800 — brief is ~200 tokens). */
  maxTokens?: number;
  /** temperature (default 0.7). */
  temperature?: number;
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
  userPrompt: string,
  opts: OpenRouterOptions = {},
): Promise<unknown> {
  const apiKey =
    process.env.OPENROUTER_API_KEY ?? process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set.  " +
      "Add it to .env.local as OPENROUTER_API_KEY=sk-or-...",
    );
  }

  const model =
    opts.model ??
    process.env.OPENROUTER_MODEL ??
    DEFAULT_MODEL;

  const body = {
    model,
    // kimi-k2.5 is a reasoning model: it generates internal chain-of-thought
    // (reasoning_tokens) before the visible content.  Those tokens do NOT count
    // against max_tokens, but the model may still time-out or return empty
    // content if max_tokens is too small for the combined budget.  8192 gives
    // ample room for the ~200-token VideoBrief output.
    max_tokens: opts.maxTokens ?? 8192,
    temperature: opts.temperature ?? 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt   },
    ],
    // json_object is supported by virtually all OpenRouter models.
    // strict json_schema mode is rejected by many models (including kimi-k2.5).
    // validateBrief normalises whatever shape the model returns.
    response_format: { type: "json_object" },
  };

  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
      // Recommended by OpenRouter for attribution / rate-limit tiers
      "HTTP-Referer":  "https://videogpt.local",
      "X-Title":       "VideoGPT",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(
      `OpenRouter HTTP ${res.status} ${res.statusText}: ${text.slice(0, 400)}`,
    );
  }

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
  };

  if (data.error?.message) {
    throw new Error(`OpenRouter API error: ${data.error.message}`);
  }

  const choice = data.choices?.[0];
  if (!choice) {
    throw new Error("OpenRouter returned no choices");
  }

  // Some providers return `parsed` directly when using structured output.
  if (choice.message?.parsed !== undefined) {
    return choice.message.parsed;
  }

  const raw = choice.message?.content;

  // Some reasoning models (e.g. kimi-k2.5) return content="" when max_tokens
  // is exhausted by internal chain-of-thought.  Throw a clear error.
  if (!raw) {
    const reason = choice.finish_reason ?? "unknown";
    throw new Error(
      `OpenRouter returned empty content (finish_reason=${reason}). ` +
      `The model may need more max_tokens or a shorter system prompt.`,
    );
  }

  // Strip markdown fences that some models add despite being told not to
  const cleaned = raw.trim().replace(/^```(?:json)?\s*\n?|\n?```\s*$/g, "").trim();

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    throw new Error(
      `OpenRouter content is not valid JSON: ${cleaned.slice(0, 300)}`,
    );
  }
}
