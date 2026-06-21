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

const FREE_MODELS = ["cohere/north-mini-code:free", "nvidia/nemotron-3-ultra-550b-a55b:free", "poolside/laguna-m.1:free"]

export interface OpenRouterOptions {
  /** OpenRouter model id.  Falls back to env var, then DEFAULT_MODEL. */
  model?: string;
  /** max_tokens for the completion (default 800 — brief is ~200 tokens). */
  maxTokens?: number;
  /** temperature (default 0.7). */
  temperature?: number;
  /** Custom user API key (BYOK) */
  apiKey?: string;
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
  let requestApiKey = opts.apiKey;
  if (
    requestApiKey === "undefined" ||
    requestApiKey === "null" ||
    requestApiKey === "" ||
    (requestApiKey && requestApiKey.trim() === "")
  ) {
    requestApiKey = undefined;
  }

  const apiKey =
    requestApiKey ||
    process.env.OPENROUTER_API_KEY ||
    process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

  console.log("[ai/openrouter] ApiKey check:", {
    hasRequestKey: !!requestApiKey,
    requestKeyLen: requestApiKey?.length,
    hasEnvKey: !!process.env.OPENROUTER_API_KEY,
    envKeyLen: process.env.OPENROUTER_API_KEY?.length,
    finalKeyLen: apiKey?.length,
    finalKeyPrefix: apiKey ? `${apiKey.slice(0, 10)}...` : "none",
  });

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set.  " +
      "Add it to .env.local as OPENROUTER_API_KEY=sk-or-...",
    );
  }

  // Helper to run a single request against a model
  async function attemptRequest(modelName: string): Promise<unknown> {
    console.log(`[ai/openrouter] Requesting model: ${modelName}`);

    const body = {
      model: modelName,
      max_tokens: opts.maxTokens ?? 8192,
      temperature: opts.temperature ?? 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    };

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
    };

    if (data.error?.message) {
      throw new Error(`OpenRouter API error: ${data.error.message}`);
    }

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
