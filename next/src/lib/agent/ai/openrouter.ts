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
  onChunk?: (chunk: { characterCount: number }) => void;
  signal?: AbortSignal;
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

function parseAssistantJson(raw: string, finishReason?: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*\n?|\n?```\s*$/g, "").trim();
  if (!cleaned) {
    if (finishReason === "length") throw new OpenRouterLengthError();
    throw new Error(
      `OpenRouter returned empty content (finish_reason=${finishReason ?? "unknown"}).`,
    );
  }
  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    throw new OpenRouterJsonParseError(cleaned, finishReason);
  }
}

async function readStreamingResponse(
  response: Response,
  options: OpenRouterOptions,
): Promise<unknown> {
  if (!response.body) throw new Error("OpenRouter returned an empty streaming response.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let finishReason: string | undefined;

  const consumeLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(":")) return;
    if (!trimmed.startsWith("data:")) return;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") return;

    const event = JSON.parse(payload) as {
      error?: { message?: string };
      choices?: Array<{
        delta?: { content?: string | null };
        finish_reason?: string | null;
      }>;
      usage?: Usage;
    };
    if (event.error) {
      throw new Error(event.error.message || "OpenRouter stream failed.");
    }
    if (event.usage) options.onUsage?.(event.usage);
    const choice = event.choices?.[0];
    if (choice?.finish_reason) finishReason = choice.finish_reason;
    const delta = choice?.delta?.content;
    if (delta) {
      content += delta;
      options.onChunk?.({ characterCount: delta.length });
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) consumeLine(line);
    }
    buffer += decoder.decode();
    if (buffer.trim()) consumeLine(buffer);
  } finally {
    reader.releaseLock();
  }

  return parseAssistantJson(content, finishReason);
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
    provider: { sort: "throughput" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (options.reasoning) body.reasoning = options.reasoning;
  if (options.onChunk) {
    body.stream = true;
    body.stream_options = { include_usage: true };
  }

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
    signal: options.signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(
      `OpenRouter HTTP ${response.status} ${response.statusText}: ${text.slice(0, 400)}`,
    );
  }

  if (options.onChunk) return readStreamingResponse(response, options);

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

  return parseAssistantJson(choice.message?.content ?? "", choice.finish_reason);
}
