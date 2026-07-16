const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenRouterOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  reasoning?: { enabled: boolean };
  onUsage?: (usage: Usage) => void;
}

/** A successful provider response whose assistant content was not valid JSON. */
export class OpenRouterJsonParseError extends Error {
  readonly content: string;
  readonly finishReason?: string;

  constructor(content: string, finishReason?: string) {
    super(
      `OpenRouter content is not valid JSON` +
      `${finishReason ? ` (finish_reason=${finishReason})` : ""}: ${content.slice(0, 300)}`,
    );
    this.name = "OpenRouterJsonParseError";
    this.content = content;
    this.finishReason = finishReason;
  }
}

/** The model consumed its output budget before emitting assistant content. */
export class OpenRouterLengthError extends Error {
  readonly finishReason = "length";

  constructor() {
    super("OpenRouter returned empty content (finish_reason=length).");
    this.name = "OpenRouterLengthError";
  }
}

/** Sends exactly one structured-output request to the configured model. */
export async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string | Array<unknown>,
  options: OpenRouterOptions = {},
): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to .env.local as OPENROUTER_API_KEY=sk-or-...",
    );
  }

  const model = options.model ?? process.env.DEFAULT_MODEL;
  if (!model) {
    throw new Error("DEFAULT_MODEL is not set. Add one OpenRouter model id to .env.local.");
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: options.maxTokens ?? 8192,
    temperature: options.temperature ?? 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (options.reasoning) body.reasoning = options.reasoning;

  console.log(`[ai/openrouter] Requesting model: ${model}`);
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://videogpt.live",
      "X-Title": "VideoGPT",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(
      `OpenRouter HTTP ${response.status} ${response.statusText}: ${text.slice(0, 400)}`,
    );
  }

  const data = await response.json() as {
    choices?: Array<{
      finish_reason?: string;
      message?: { content?: string | null; parsed?: unknown };
    }>;
    error?: { message?: string };
    usage?: Usage;
  };
  if (data.error?.message) throw new Error(`OpenRouter API error: ${data.error.message}`);
  if (data.usage) options.onUsage?.(data.usage);

  const choice = data.choices?.[0];
  if (!choice) throw new Error("OpenRouter returned no choices");
  if (choice.message?.parsed !== undefined) return choice.message.parsed;

  const raw = choice.message?.content;
  if (!raw) {
    if (choice.finish_reason === "length") throw new OpenRouterLengthError();
    throw new Error(
      `OpenRouter returned empty content (finish_reason=${choice.finish_reason ?? "unknown"}).`,
    );
  }

  const cleaned = raw.trim().replace(/^```(?:json)?\s*\n?|\n?```\s*$/g, "").trim();
  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    throw new OpenRouterJsonParseError(cleaned, choice.finish_reason);
  }
}
